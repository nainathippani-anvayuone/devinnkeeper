import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Hotel ────────────────────────────────────────────────
  const hotel = await prisma.hotel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      hotel_name: 'InnKeeper Grand Motel',
      address: '123 Highway Road',
      city: 'Hyderabad',
      country: 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  // ─── Room Types ───────────────────────────────────────────
  const roomTypes = await Promise.all([
    prisma.roomType.upsert({ where: { name: 'Standard' }, update: {}, create: { name: 'Standard', base_price: 1500, capacity: 2, description: 'Comfortable room with basic amenities, AC, TV, WiFi' } }),
    prisma.roomType.upsert({ where: { name: 'Deluxe' }, update: {}, create: { name: 'Deluxe', base_price: 2500, capacity: 2, description: 'Spacious room with premium amenities, AC, Smart TV, Mini-bar, WiFi' } }),
    prisma.roomType.upsert({ where: { name: 'Suite' }, update: {}, create: { name: 'Suite', base_price: 5000, capacity: 3, description: 'Luxurious suite with living area, Jacuzzi, panoramic view, Butler service' } }),
    prisma.roomType.upsert({ where: { name: 'Family' }, update: {}, create: { name: 'Family', base_price: 3500, capacity: 4, description: 'Large family room with two beds, kitchenette, AC, TV, WiFi' } }),
    prisma.roomType.upsert({ where: { name: 'Premium' }, update: {}, create: { name: 'Premium', base_price: 4000, capacity: 2, description: 'Executive room with work desk, premium bedding, lounge access' } }),
  ]);

  // ─── Rooms (150 rooms across 15 floors, numbered 1 to 150) ──
  const statuses = ['vacant', 'occupied', 'dirty', 'maintenance', 'reserved'];
  const roomData = [];
  for (let i = 1; i <= 150; i++) {
    const roomNum = `${i}`;
    const floor = Math.floor((i - 1) / 10) + 1;
    const typeIdx = (i - 1) % roomTypes.length;
    const statusIdx = i % statuses.length;
    const rt = roomTypes[typeIdx];
    roomData.push({
      room_number: roomNum,
      room_type_id: rt.id,
      floor,
      status: statuses[statusIdx],
      current_price: rt.base_price,
      availability: statuses[statusIdx] === 'vacant',
      hotel_id: hotel.id,
    });
  }

  // Delete existing rooms if any to avoid conflicts
  for (const r of roomData) {
    await prisma.room.upsert({
      where: { room_number: r.room_number },
      update: { status: r.status, current_price: r.current_price, availability: r.availability },
      create: r,
    });
  }

  const rooms = await prisma.room.findMany({ orderBy: { room_number: 'asc' } });
  console.log(`✅ ${rooms.length} rooms seeded`);

  // ─── Channels ─────────────────────────────────────────────
  const channels = [
    { channel_name: 'Booking.com', api_status: 'active', connected: true, sync_speed: 'fast' },
    { channel_name: 'Expedia', api_status: 'active', connected: true, sync_speed: 'medium' },
    { channel_name: 'Airbnb', api_status: 'active', connected: true, sync_speed: 'fast' },
    { channel_name: 'MakeMyTrip', api_status: 'active', connected: true, sync_speed: 'medium' },
    { channel_name: 'Direct', api_status: 'active', connected: true, sync_speed: 'instant' },
  ];
  for (const ch of channels) {
    await prisma.channel.upsert({ where: { channel_name: ch.channel_name }, update: {}, create: ch });
  }
  console.log(`✅ Channels seeded`);

  // ─── Users ────────────────────────────────────────────────
  const password = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@innkeeper.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@innkeeper.com', phone: '9000000001', password, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'manager@innkeeper.com' },
    update: {},
    create: { name: 'Front Desk Manager', email: 'manager@innkeeper.com', phone: '9000000002', password: await bcrypt.hash('manager123', 12), role: 'manager' },
  });
  await prisma.user.upsert({
    where: { email: 'staff@innkeeper.com' },
    update: {},
    create: { name: 'Reception Staff', email: 'staff@innkeeper.com', phone: '9000000003', password: await bcrypt.hash('staff123', 12), role: 'receptionist' },
  });
  console.log(`✅ Users seeded — login: admin@innkeeper.com / admin123`);

  // ─── Guests ───────────────────────────────────────────────
  const guestData = [
    { firstName: 'Arjun', lastName: 'Sharma', email: 'arjun.sharma@email.com', phone: '9876543201', idType: 'Aadhar', idNumber: 'XXXX-1234', loyaltyPoints: 150 },
    { firstName: 'Priya', lastName: 'Mehta', email: 'priya.mehta@email.com', phone: '9876543202', idType: 'Passport', idNumber: 'M1234567', loyaltyPoints: 320 },
    { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@email.com', phone: '9876543203', idType: 'PAN', idNumber: 'ABCDE1234F', loyaltyPoints: 80 },
    { firstName: 'Sneha', lastName: 'Reddy', email: 'sneha.reddy@email.com', phone: '9876543204', idType: 'Aadhar', idNumber: 'XXXX-5678', loyaltyPoints: 500 },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@email.com', phone: '9876543205', idType: 'Driving License', idNumber: 'DL1234567890', loyaltyPoints: 200 },
    { firstName: 'Anjali', lastName: 'Kumar', email: 'anjali.kumar@email.com', phone: '9876543206', idType: 'Passport', idNumber: 'K9876543', loyaltyPoints: 0 },
    { firstName: 'Suresh', lastName: 'Patel', email: 'suresh.patel@email.com', phone: '9876543207', idType: 'Aadhar', idNumber: 'XXXX-9012', loyaltyPoints: 100 },
    { firstName: 'Deepa', lastName: 'Nair', email: 'deepa.nair@email.com', phone: '9876543208', idType: 'PAN', idNumber: 'FGHIJ5678K', loyaltyPoints: 250 },
    { firstName: 'Kiran', lastName: 'Rao', email: 'kiran.rao@email.com', phone: '9876543209', idType: 'Driving License', idNumber: 'DL0987654321', loyaltyPoints: 50 },
    { firstName: 'Meera', lastName: 'Joshi', email: 'meera.joshi@email.com', phone: '9876543210', idType: 'Aadhar', idNumber: 'XXXX-3456', loyaltyPoints: 175 },
  ];

  const guests = [];
  for (const g of guestData) {
    const guest = await prisma.guest.upsert({
      where: { id: guests.length + 1 },
      update: {},
      create: g,
    }).catch(() => prisma.guest.create({ data: g }));
    guests.push(guest);
  }
  console.log(`✅ ${guests.length} guests seeded`);

  // ─── Reservations ─────────────────────────────────────────
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const reservationData = [
    { guestIdx: 0, roomIdx: 1, daysAgo: 0, nights: 3, status: 'checked_in', charges: 7500, paid: 7500, source: 'Direct' },
    { guestIdx: 1, roomIdx: 3, daysAgo: -1, nights: 2, status: 'confirmed', charges: 5000, paid: 2500, source: 'Booking.com' },
    { guestIdx: 2, roomIdx: 7, daysAgo: -2, nights: 5, status: 'confirmed', charges: 25000, paid: 12500, source: 'Expedia' },
    { guestIdx: 3, roomIdx: 11, daysAgo: 1, nights: 1, status: 'checked_out', charges: 3500, paid: 3500, source: 'MakeMyTrip' },
    { guestIdx: 4, roomIdx: 15, daysAgo: 0, nights: 4, status: 'checked_in', charges: 16000, paid: 8000, source: 'Direct' },
    { guestIdx: 5, roomIdx: 19, daysAgo: -3, nights: 7, status: 'confirmed', charges: 10500, paid: 5250, source: 'Airbnb' },
    { guestIdx: 6, roomIdx: 2, daysAgo: 2, nights: 1, status: 'checked_out', charges: 1500, paid: 1500, source: 'Direct' },
    { guestIdx: 7, roomIdx: 5, daysAgo: 0, nights: 2, status: 'checked_in', charges: 5000, paid: 5000, source: 'Booking.com' },
    { guestIdx: 8, roomIdx: 9, daysAgo: -1, nights: 3, status: 'confirmed', charges: 4500, paid: 2250, source: 'Expedia' },
    { guestIdx: 9, roomIdx: 13, daysAgo: 3, nights: 2, status: 'cancelled', charges: 3000, paid: 0, source: 'Direct' },
  ];

  const reservations = [];
  for (const r of reservationData) {
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + r.daysAgo);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + r.nights);

    const res = await prisma.reservation.create({
      data: {
        guestId: guests[r.guestIdx]?.id,
        roomId: rooms[r.roomIdx]?.id,
        checkIn,
        checkOut,
        status: r.status,
        totalCharges: r.charges,
        paidAmount: r.paid,
        source: r.source,
        notes: r.status === 'confirmed' ? 'Early check-in requested' : null,
      },
    });
    reservations.push(res);
  }
  console.log(`✅ ${reservations.length} reservations seeded`);

  // ─── Payments ─────────────────────────────────────────────
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer'];
  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    const rd = reservationData[i];
    if (rd.paid > 0) {
      await prisma.payment.create({
        data: {
          reservationId: r.id,
          amount: rd.paid,
          method: paymentMethods[i % paymentMethods.length],
          paymentStatus: rd.status === 'cancelled' ? 'Refunded' : 'Paid',
          notes: `Check-in payment collected for reservation #${r.id}`,
        },
      });
    }
  }
  console.log(`✅ Payments seeded`);

  // ─── Vehicles ─────────────────────────────────────────────
  const vehicleData = [
    { make: 'Maruti', model: 'Swift', licensePlate: 'TS09AB1234', state: 'Telangana', parkingSlot: 'A1' },
    { make: 'Hyundai', model: 'Creta', licensePlate: 'TS10CD5678', state: 'Telangana', parkingSlot: 'A2' },
    { make: 'Honda', model: 'City', licensePlate: 'AP28EF9012', state: 'Andhra Pradesh', parkingSlot: 'B1' },
    { make: 'Toyota', model: 'Fortuner', licensePlate: 'KA01GH3456', state: 'Karnataka', parkingSlot: 'B3' },
    { make: 'Tata', model: 'Nexon', licensePlate: 'MH12IJ7890', state: 'Maharashtra', parkingSlot: null },
  ];
  for (const v of vehicleData) {
    await prisma.vehicle.create({ data: v });
  }
  console.log(`✅ Vehicles seeded`);

  // ─── Cash Ledger ──────────────────────────────────────────
  await prisma.cashLedger.create({ data: { employeeName: 'Priya Mehta', openingCash: 5000, closingCash: 0, status: 'open', notes: 'Morning shift' } });
  await prisma.cashLedger.create({ data: { employeeName: 'Rahul Verma', openingCash: 3000, closingCash: 7500, status: 'closed', notes: 'Night shift completed' } });
  console.log(`✅ Cash ledger seeded`);

  // ─── Shift Audits ─────────────────────────────────────────
  await prisma.shiftAudit.create({ data: { employeeName: 'Admin User', openingCash: 5000, closingCash: 12500, status: 'closed', notes: 'Morning audit complete' } });
  await prisma.shiftAudit.create({ data: { employeeName: 'Priya Mehta', openingCash: 12500, closingCash: 0, status: 'open', notes: 'Afternoon shift' } });
  console.log(`✅ Shift audits seeded`);

  // ─── Housekeeping ─────────────────────────────────────────
  const hkStatuses = ['pending', 'in-progress', 'clean', 'inspected'];
  const hkRooms = rooms.slice(0, 15);
  for (let i = 0; i < hkRooms.length; i++) {
    await prisma.housekeeping.create({
      data: {
        roomId: hkRooms[i].id,
        status: hkStatuses[i % hkStatuses.length],
        assignedTo: ['Lakshmi', 'Sunita', 'Kavya', 'Renu'][i % 4],
        notes: i % 3 === 0 ? 'Guest requests extra towels' : null,
      },
    });
  }
  console.log(`✅ Housekeeping seeded`);

  // ─── Maintenance ──────────────────────────────────────────
  const maintenanceData = [
    { roomId: rooms[4]?.id, issue: 'AC not cooling properly', priority: 'high', status: 'open' },
    { roomId: rooms[8]?.id, issue: 'Bathroom tap leaking', priority: 'normal', status: 'in-progress' },
    { roomId: rooms[12]?.id, issue: 'TV remote not working', priority: 'low', status: 'resolved' },
    { roomId: rooms[16]?.id, issue: 'Door lock malfunction', priority: 'urgent', status: 'open' },
    { roomId: rooms[20]?.id, issue: 'WiFi connectivity issue', priority: 'high', status: 'in-progress' },
  ];
  for (const m of maintenanceData) {
    await prisma.maintenance.create({ data: m });
  }
  console.log(`✅ Maintenance seeded`);

  // ─── Notifications ────────────────────────────────────────
  const notifData = [
    { type: 'arrival', title: 'New Arrival Today', message: 'Arjun Sharma checking in to Room 101', priority: 'NORMAL' },
    { type: 'payment', title: 'Payment Received', message: '₹7,500 received for Reservation #1', priority: 'HIGH' },
    { type: 'maintenance', title: 'Maintenance Alert', message: 'Door lock malfunction reported in Room 116 – urgent', priority: 'URGENT' },
    { type: 'housekeeping', title: 'Room Ready', message: 'Room 103 has been cleaned and inspected', priority: 'LOW', readAt: new Date() },
    { type: 'system', title: 'Daily Report Available', message: 'August 5th occupancy report is ready for download', priority: 'LOW', readAt: new Date() },
  ];
  for (const n of notifData) {
    await prisma.appNotification.create({ data: n });
  }
  console.log(`✅ Notifications seeded`);

  // ─── Statistics ───────────────────────────────────────────
  const todayStr = today.toISOString().split('T')[0];
  await prisma.statistics.upsert({
    where: { id: 1 },
    update: {},
    create: {
      date: todayStr,
      total_rooms: rooms.length,
      occupied_rooms: rooms.filter(r => !r.availability).length,
      available_rooms: rooms.filter(r => r.availability).length,
      connected_channels: 5,
      active_bookings: 8,
      average_occupancy: 62.5,
      average_sync_time: 1.2,
      pricing_rules_enabled: 3,
    },
  });

  // ─── Occupancy History (7 days) ───────────────────────────
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const occ = 55 + Math.floor(Math.random() * 35);
    await prisma.occupancyHistory.create({
      data: {
        date: dateStr,
        room_type: 'all',
        occupancy_percentage: occ,
        total_rooms: rooms.length,
        occupied_rooms: Math.floor(rooms.length * occ / 100),
      },
    }).catch(() => {});
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('─────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  📧 admin@innkeeper.com    🔑 admin123');
  console.log('  📧 manager@innkeeper.com  🔑 manager123');
  console.log('  📧 staff@innkeeper.com    🔑 staff123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
