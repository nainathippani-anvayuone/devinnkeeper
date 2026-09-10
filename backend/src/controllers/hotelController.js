import { prisma } from '../utils/db.js';

export async function getHotelProfile(req, res) {
  try {
    let hotel = await prisma.hotel.findFirst({
      include: {
        rooms: {
          include: { room_type: true },
        },
      },
    });

    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          hotel_name: 'InnKeeper Grand Resort & Suites',
          address: '100 Ocean Drive',
          city: 'Miami Beach',
          country: 'USA',
          timezone: 'America/New_York',
          currency: 'USD',
        },
        include: { rooms: { include: { room_type: true } } },
      });
    }

    const rooms = hotel.rooms || [];
    const floorMap = new Map();
    rooms.forEach((r) => {
      const fl = Number(r.floor) || 1;
      if (!floorMap.has(fl)) floorMap.set(fl, []);
      floorMap.get(fl).push(r);
    });

    const floors = Array.from(floorMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([floorNumber, rList]) => ({
        floorNumber,
        totalRooms: rList.length,
        vacant: rList.filter((r) => String(r.status).toLowerCase() === 'vacant').length,
        occupied: rList.filter((r) => String(r.status).toLowerCase() === 'occupied').length,
        dirty: rList.filter((r) => String(r.status).toLowerCase() === 'dirty').length,
        maintenance: rList.filter((r) => String(r.status).toLowerCase() === 'maintenance').length,
      }));

    return res.json({
      hotel: {
        id: hotel.id,
        name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        timezone: hotel.timezone,
        currency: hotel.currency,
        createdAt: hotel.created_at,
      },
      stats: {
        totalRooms: rooms.length,
        floorsCount: floors.length,
      },
      floors,
    });
  } catch (err) {
    console.error('getHotelProfile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve hotel configuration.' });
  }
}

export async function updateHotelProfile(req, res) {
  try {
    const { name, address, city, country, timezone, currency } = req.body;

    let hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          hotel_name: name || 'InnKeeper Grand Resort & Suites',
          address: address || '100 Ocean Drive',
          city: city || 'Miami Beach',
          country: country || 'USA',
          timezone: timezone || 'America/New_York',
          currency: currency || 'USD',
        },
      });
    } else {
      hotel = await prisma.hotel.update({
        where: { id: hotel.id },
        data: {
          ...(name && { hotel_name: name }),
          ...(address && { address }),
          ...(city && { city }),
          ...(country && { country }),
          ...(timezone && { timezone }),
          ...(currency && { currency }),
        },
      });
    }

    return res.json({
      success: true,
      hotel: {
        id: hotel.id,
        name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        timezone: hotel.timezone,
        currency: hotel.currency,
      },
    });
  } catch (err) {
    console.error('updateHotelProfile error:', err);
    return res.status(500).json({ error: 'Failed to update hotel configuration.' });
  }
}

// ─── Room Types Management (Admin) ─────────────────────────

export async function listRoomTypes(req, res) {
  try {
    const types = await prisma.roomType.findMany({
      include: {
        _count: { select: { rooms: true } },
      },
      orderBy: { id: 'asc' },
    });

    const mapped = types.map((t) => ({
      id: t.id,
      name: t.name,
      basePrice: t.base_price,
      capacity: t.capacity,
      description: t.description,
      roomsCount: t._count.rooms,
      createdAt: t.created_at,
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('listRoomTypes error:', err);
    return res.status(500).json({ error: 'Failed to retrieve room types.' });
  }
}

export async function createRoomType(req, res) {
  try {
    const { name, basePrice, capacity, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Room type name is required.' });

    const existing = await prisma.roomType.findFirst({
      where: { name: { equals: String(name).trim(), mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(409).json({ error: `Room type '${name}' already exists.` });
    }

    const created = await prisma.roomType.create({
      data: {
        name: String(name).trim(),
        base_price: Number(basePrice || 100),
        capacity: Number(capacity || 2),
        description: description || '',
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('createRoomType error:', err);
    return res.status(500).json({ error: 'Failed to create room type.' });
  }
}

export async function updateRoomType(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, basePrice, capacity, description } = req.body;

    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(basePrice !== undefined && { base_price: Number(basePrice) }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(description !== undefined && { description }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('updateRoomType error:', err);
    return res.status(500).json({ error: 'Failed to update room type.' });
  }
}

export async function deleteRoomType(req, res) {
  try {
    const id = Number(req.params.id);
    const inUse = await prisma.room.count({ where: { room_type_id: id } });
    if (inUse > 0) {
      return res.status(400).json({
        error: `Cannot delete room type: ${inUse} rooms are currently assigned to this type. Reassign rooms first.`,
      });
    }

    await prisma.roomType.delete({ where: { id } });
    return res.json({ success: true, message: 'Room type deleted.' });
  } catch (err) {
    console.error('deleteRoomType error:', err);
    return res.status(500).json({ error: 'Failed to delete room type.' });
  }
}
