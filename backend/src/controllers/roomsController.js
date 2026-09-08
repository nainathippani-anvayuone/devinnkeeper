import { prisma } from '../utils/db.js';
import { broadcastRoomUpdate } from '../utils/realtime.js';
import { recordAuditLog } from '../services/rbacService.js';

function paginate(data, page, limit) {
  const total = data.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return { items: data.slice(start, start + limit), total, page, limit, pages };
}

export async function listRoomsNew(req, res) {
  try {
    const { page = 1, limit = 200, q = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const whereClause = q ? {
      OR: [
        { room_number: { contains: q, mode: 'insensitive' } },
        { room_type: { name: { contains: q, mode: 'insensitive' } } }
      ]
    } : {};

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where: whereClause }),
      prisma.room.findMany({
        where: whereClause,
        include: { room_type: true, channelInventory: true },
        orderBy: [{ floor: 'asc' }, { id: 'asc' }],
        skip,
        take
      })
    ]);

    const pages = Math.ceil(total / take);

    const normalized = rooms.map(r => {
      const typeLower = (r.room_type?.name || '').toLowerCase();
      let image = null;
      if (typeLower.includes('deluxe')) image = '/rooms/deluxe.png';
      else if (typeLower.includes('family')) image = '/rooms/family.png';
      else if (typeLower.includes('premium')) image = '/rooms/premium.png';
      else if (typeLower.includes('standard')) image = '/rooms/standard.png';
      else if (typeLower.includes('suite')) image = '/rooms/suite.png';

      return {
        id: r.id,
        number: r.room_number,
        name: `Room ${r.room_number}`,
        type: typeLower || 'standard',
        floor: r.floor,
        status: r.status?.toLowerCase() || 'vacant',
        rate: r.current_price,
        capacity: r.room_type?.capacity || (typeLower.includes('family') ? 4 : 2),
        amenities: r.room_type?.description || null,
        image,
        isAvailable: r.availability ? 1 : 0,
        createdAt: r.last_updated,
        updatedAt: r.last_updated,
      };
    });
    
    res.json({ items: normalized, total, page: Number(page), limit: take, pages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getRoomNew(req, res) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: Number(req.params.id) },
      include: { room_type: true }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const typeLower = (room.room_type?.name || '').toLowerCase();
    let image = null;
    if (typeLower.includes('deluxe')) image = '/rooms/deluxe.png';
    else if (typeLower.includes('family')) image = '/rooms/family.png';
    else if (typeLower.includes('premium')) image = '/rooms/premium.png';
    else if (typeLower.includes('standard')) image = '/rooms/standard.png';
    else if (typeLower.includes('suite')) image = '/rooms/suite.png';

    res.json({
      ...room,
      number: room.room_number,
      type: typeLower,
      image,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createRoomNew(req, res) {
  try {
    const { number, type, floor, status, rate, capacity } = req.body;
    if (!number || !String(number).trim()) {
      return res.status(400).json({ error: 'Room number is required.' });
    }

    const existing = await prisma.room.findUnique({ where: { room_number: String(number).trim() } });
    if (existing) {
      return res.status(409).json({ error: `Room ${number} already exists.` });
    }

    // Find or create room_type
    let roomType = await prisma.roomType.findFirst({ where: { name: { contains: type, mode: 'insensitive' } } });
    if (!roomType) {
      roomType = await prisma.roomType.create({ data: { name: type || 'Standard', base_price: rate || 100, capacity: capacity || 2, description: '' } });
    }
    const room = await prisma.room.create({
      data: { room_number: String(number).trim(), room_type_id: roomType.id, floor: floor || 1, status: status || 'Vacant', current_price: rate || roomType.base_price, availability: true }
    });
    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, floor: room.floor, status: room.status, availability: room.availability, action: 'created' });

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'rooms',
      details: `Created room #${room.room_number} (Floor ${room.floor}, Type: ${roomType.name}, Rate: ${room.current_price})`,
      ipAddress: req.ip,
    });

    res.status(201).json(room);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Room ${req.body?.number} already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function updateRoomNew(req, res) {
  try {
    const { status, rate, isAvailable, floor } = req.body;
    const roomId = Number(req.params.id);
    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(status && { status }),
        ...(rate !== undefined && { current_price: rate }),
        ...(isAvailable !== undefined && { availability: Boolean(isAvailable) }),
        ...(floor !== undefined && { floor }),
        last_updated: new Date()
      }
    });

    if (status) {
      const st = String(status).toLowerCase();
      if (st === 'dirty' || st === 'vacant' || st === 'clean' || st === 'maintenance' || st === 'under_maintenance' || st === 'out_of_service') {
        const activeRes = await prisma.reservation.findMany({
          where: {
            roomId: roomId,
            status: { in: ['checked_in', 'CHECKED_IN'] }
          }
        });
        for (const r of activeRes) {
          await prisma.reservation.update({
            where: { id: r.id },
            data: { status: 'checked_out', digitalKeyStatus: 'EXPIRED' }
          });
        }
      } else if (st === 'occupied') {
        const confirmedRes = await prisma.reservation.findMany({
          where: {
            roomId: roomId,
            status: { in: ['confirmed', 'CONFIRMED'] }
          }
        });
        for (const r of confirmedRes) {
          if (r.verificationStatus === 'VERIFIED') {
            await prisma.reservation.update({
              where: { id: r.id },
              data: { status: 'checked_in' }
            });
          }
        }
      }
    }

    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, floor: room.floor, status: room.status, availability: room.availability, currentPrice: room.current_price, action: 'updated' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteRoomNew(req, res) {
  try {
    const roomId = Number(req.params.id);
    const activeBookings = await prisma.reservation.findMany({
      where: {
        roomId,
        status: { in: ['confirmed', 'checked_in'] }
      }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({ error: `Cannot delete room #${roomId}: ${activeBookings.length} active reservation(s) exist. Please relocate or check out guests first.` });
    }

    const roomToDelete = await prisma.room.findUnique({ where: { id: roomId } });
    if (!roomToDelete) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await prisma.room.delete({ where: { id: roomId } });
    broadcastRoomUpdate({ roomId, action: 'deleted' });

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'DELETE',
      module: 'rooms',
      details: `Deleted room #${roomToDelete.room_number} (ID: ${roomId})`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// ─── Housekeeping Room Status Actions ─────────────────────

export async function startCleaning(req, res) {
  try {
    const roomId = Number(req.params.id);

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'CLEANING_IN_PROGRESS',
        last_updated: new Date(),
      },
    });

    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, status: room.status, action: 'cleaning_started' });
    res.json({
      success: true,
      data: {
        ...room,
        roomNumber: room.room_number,
      },
    });
  } catch (err) {
    console.error('Failed to start cleaning:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function markRoomClean(req, res) {
  try {
    const roomId = Number(req.params.id);
    const { notes } = req.body;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'CLEAN',
        last_updated: new Date(),
      },
    });

    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, status: room.status, action: 'cleaned' });
    res.json({
      success: true,
      data: {
        ...room,
        roomNumber: room.room_number,
        cleaningNotes: notes || null,
      },
    });
  } catch (err) {
    console.error('Failed to mark room clean:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function markRoomDirty(req, res) {
  try {
    const roomId = Number(req.params.id);

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'DIRTY',
        last_updated: new Date(),
      },
    });

    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, status: room.status, action: 'dirty' });
    res.json({
      success: true,
      data: {
        ...room,
        roomNumber: room.room_number,
      },
    });
  } catch (err) {
    console.error('Failed to mark room dirty:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function markRoomInspected(req, res) {
  try {
    const roomId = Number(req.params.id);

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'CLEAN',
        last_updated: new Date(),
      },
    });

    broadcastRoomUpdate({ roomId: room.id, roomNumber: room.room_number, status: room.status, action: 'inspected' });
    res.json({
      success: true,
      data: {
        ...room,
        roomNumber: room.room_number,
      },
    });
  } catch (err) {
    console.error('Failed to mark room inspected:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}