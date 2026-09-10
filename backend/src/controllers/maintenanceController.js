import { PrismaClient } from '@prisma/client';
import { createNotification, NotificationType, NotificationPriority } from '../utils/notificationService.js';
const prisma = new PrismaClient();

function paginate(data, page, limit) {
  const total = data.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return { items: data.slice(start, start + limit), total, page, limit, pages };
}

export async function listMaintenance(req, res) {
  try {
    const { page = 1, limit = 50, q = '' } = req.query;
    const items = await prisma.maintenance.findMany({ orderBy: { createdAt: 'desc' } });
    const filtered = q
      ? items.filter(i => `${i.issue} ${i.status} ${i.priority} ${i.notes || ''}`.toLowerCase().includes(q.toLowerCase()))
      : items;
    res.json(paginate(filtered, Number(page), Number(limit)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createMaintenance(req, res) {
  try {
    if (!req.body.issue || !String(req.body.issue).trim()) {
      return res.status(400).json({ error: 'Issue description is required' });
    }
    const item = await prisma.maintenance.create({ data: {
      roomId: req.body.roomId ? Number(req.body.roomId) : null,
      issue: String(req.body.issue).trim(),
      priority: req.body.priority || 'normal',
      status: req.body.status || 'open',
      notes: req.body.notes || null
    }});
    res.status(201).json(item);

    // Fire MAINTENANCE_CREATED notification
    try {
      const room = item.roomId ? await prisma.room.findUnique({ where: { id: item.roomId } }) : null;
      const roomLabel = room ? `Room ${room.room_number}` : (item.roomId ? `Room ${item.roomId}` : '');
      const priority = item.priority === 'urgent' || item.priority === 'high'
        ? NotificationPriority.HIGH
        : NotificationPriority.NORMAL;
      await createNotification({
        type: NotificationType.MAINTENANCE_CREATED,
        title: 'Maintenance Request Created',
        message: `Maintenance required${roomLabel ? ` for ${roomLabel}` : ''}: ${item.issue}${item.priority !== 'normal' ? ` (${item.priority} priority)` : ''}`,
        priority,
        roomId: item.roomId,
        metadata: { roomId: item.roomId, roomNumber: room?.room_number, issue: item.issue, maintenanceId: item.id },
      });
    } catch (notifErr) {
      console.error('[maintenanceController] MAINTENANCE_CREATED notification failed:', notifErr.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateMaintenance(req, res) {
  try {
    const item = await prisma.maintenance.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.issue && { issue: req.body.issue }),
        ...(req.body.priority && { priority: req.body.priority }),
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.notes !== undefined && { notes: req.body.notes })
      }
    });
    res.json(item);

    // Fire notification based on status change
    try {
      const room = item.roomId ? await prisma.room.findUnique({ where: { id: item.roomId } }) : null;
      const roomLabel = room ? `Room ${room.room_number}` : (item.roomId ? `Room ${item.roomId}` : '');
      const newStatus = (req.body.status || '').toLowerCase();

      if (newStatus === 'completed' || newStatus === 'done' || newStatus === 'resolved') {
        await createNotification({
          type: NotificationType.MAINTENANCE_COMPLETED,
          title: 'Maintenance Completed',
          message: `Maintenance completed${roomLabel ? ` for ${roomLabel}` : ''}: ${item.issue}`,
          priority: NotificationPriority.NORMAL,
          roomId: item.roomId,
          metadata: { roomId: item.roomId, roomNumber: room?.room_number, issue: item.issue, maintenanceId: item.id },
        });
      } else if (newStatus === 'in_progress' || newStatus === 'in-progress' || newStatus === 'assigned') {
        await createNotification({
          type: NotificationType.MAINTENANCE_ASSIGNED,
          title: 'Maintenance In Progress',
          message: `Maintenance in progress${roomLabel ? ` for ${roomLabel}` : ''}: ${item.issue}`,
          priority: NotificationPriority.NORMAL,
          roomId: item.roomId,
          metadata: { roomId: item.roomId, roomNumber: room?.room_number, issue: item.issue, maintenanceId: item.id },
        });
      }
    } catch (notifErr) {
      console.error('[maintenanceController] update notification failed:', notifErr.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
