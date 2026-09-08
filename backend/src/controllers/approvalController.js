import { prisma } from '../utils/db.js';
import { recordAuditLog } from '../services/rbacService.js';
import { broadcastRoomUpdate } from '../utils/realtime.js';

export async function listApprovalRequests(req, res) {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;

    const requests = await prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve approval requests' });
  }
}

export async function createApprovalRequest(req, res) {
  try {
    const { type, referenceId, reason } = req.body;
    if (!type || !referenceId) {
      return res.status(400).json({ success: false, message: 'Type and referenceId are required' });
    }

    const request = await prisma.approvalRequest.create({
      data: {
        type,
        referenceId: String(referenceId),
        requestedBy: req.user?.name || req.user?.email || 'Receptionist',
        requestedById: req.user?.id || null,
        reason: reason || 'Operation requires manager approval',
        status: 'pending',
      },
    });

    // If reservation cancellation request, mark reservation as cancellation_requested
    if (type === 'cancellation') {
      const resId = parseInt(referenceId);
      if (!isNaN(resId)) {
        await prisma.reservation.update({
          where: { id: resId },
          data: { status: 'cancellation_requested' },
        }).catch(() => {});
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'APPROVE',
      module: 'approvals',
      details: `Submitted approval request for ${type} (Ref: ${referenceId})`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Cancellation requires Manager approval.',
      data: request,
    });
  } catch (error) {
    console.error('Error creating approval request:', error);
    res.status(500).json({ success: false, message: 'Failed to create approval request' });
  }
}

export async function reviewApprovalRequest(req, res) {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const existing = await prisma.approvalRequest.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Approval request not found' });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: req.user?.name || req.user?.email || 'Authorized Manager',
        reviewedAt: new Date(),
      },
    });

    // Handle cascading status updates based on request type
    if (existing.type === 'cancellation') {
      const resId = parseInt(existing.referenceId);
      if (!isNaN(resId)) {
        if (status === 'approved') {
          const resv = await prisma.reservation.update({
            where: { id: resId },
            data: { status: 'cancelled' },
            include: { room: true },
          });

          // Free up room if assigned
          if (resv.roomId) {
            await prisma.room.update({
              where: { id: resv.roomId },
              data: { status: 'clean', availability: true, last_updated: new Date() },
            });
            broadcastRoomUpdate({ roomId: resv.roomId, status: 'clean', availability: true, action: 'cancelled' });
          }
        } else {
          // If rejected, revert status back to confirmed
          await prisma.reservation.update({
            where: { id: resId },
            data: { status: 'confirmed' },
          });
        }
      }
    } else if (existing.type === 'expense') {
      const expId = parseInt(existing.referenceId);
      if (!isNaN(expId)) {
        await prisma.expense.update({
          where: { id: expId },
          data: {
            status,
            approvedBy: req.user?.name || req.user?.email || 'Authorized Manager',
          },
        }).catch(() => {});
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'APPROVE',
      module: 'approvals',
      details: `${status.toUpperCase()} approval request #${id} (${existing.type} Ref: ${existing.referenceId})`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Request successfully ${status}`,
      data: updated,
    });
  } catch (error) {
    console.error('Error reviewing approval request:', error);
    res.status(500).json({ success: false, message: 'Failed to process approval request' });
  }
}
