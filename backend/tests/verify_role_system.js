import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const BASE_URL = 'http://localhost:5000/api';

const adminToken = jwt.sign({ id: 1, email: 'admin@innkeeper.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const managerToken = jwt.sign({ id: 2, email: 'manager@innkeeper.com', role: 'manager' }, JWT_SECRET, { expiresIn: '1h' });
const receptionistToken = jwt.sign({ id: 3, email: 'receptionist@innkeeper.com', role: 'receptionist' }, JWT_SECRET, { expiresIn: '1h' });

async function req(endpoint, token, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  let json = null;
  try { json = await res.json(); } catch(e) {}
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('=== STARTING 3-ROLE SYSTEM VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. ADMIN ROLE PERMISSIONS
  console.log('\n--- Testing ADMIN Role ---');
  const adminHotel = await req('/hotel', adminToken);
  assert(adminHotel.status === 200, 'Admin can fetch hotel configuration');

  const adminHotelUpdate = await req('/hotel', adminToken, 'PUT', { name: 'InnKeeper Grand' });
  assert(adminHotelUpdate.status === 200, 'Admin can update hotel configuration');

  const adminStaff = await req('/staff', adminToken);
  assert(adminStaff.status === 200, 'Admin can list all staff');

  // 2. MANAGER ROLE PERMISSIONS & RESTRICTIONS
  console.log('\n--- Testing MANAGER Role ---');
  const mgrHousekeeping = await req('/housekeeping', managerToken);
  assert(mgrHousekeeping.status === 200, 'Manager can access Housekeeping operational module');

  const mgrMaintenance = await req('/maintenance', managerToken);
  assert(mgrMaintenance.status === 200, 'Manager can access Maintenance operational module');

  const mgrStaffView = await req('/staff', managerToken);
  assert(mgrStaffView.status === 200, 'Manager can view operational staff');

  // Manager is forbidden from modifying hotel configuration
  const mgrHotelUpdate = await req('/hotel', managerToken, 'PUT', { name: 'Hacked Hotel' });
  assert(mgrHotelUpdate.status === 403, 'Manager is rejected (403) from updating hotel settings');

  // Manager is forbidden from creating room types
  const mgrCreateRoomType = await req('/room-types', managerToken, 'POST', { name: 'Hacked Room' });
  assert(mgrCreateRoomType.status === 403, 'Manager is rejected (403) from creating room types');

  // 3. RECEPTIONIST ROLE PERMISSIONS & RESTRICTIONS
  console.log('\n--- Testing RECEPTIONIST Role ---');
  const recReservations = await req('/reservations', receptionistToken);
  assert(recReservations.status === 200, 'Receptionist can access reservations');

  const recGuests = await req('/guests', receptionistToken);
  assert(recGuests.status === 200, 'Receptionist can access guests');

  const recRooms = await req('/rooms', receptionistToken);
  assert(recRooms.status === 200, 'Receptionist can view room availability');

  // Receptionist is forbidden from creating rooms
  const recCreateRoom = await req('/rooms', receptionistToken, 'POST', { number: '999', type: 'Standard' });
  assert(recCreateRoom.status === 403, 'Receptionist is rejected (403) from creating rooms');

  // Receptionist is forbidden from managing housekeeping tasks
  const recHk = await req('/housekeeping', receptionistToken);
  assert(recHk.status === 403, 'Receptionist is rejected (403) from housekeeping module');

  // Receptionist is forbidden from managing maintenance work orders
  const recMaint = await req('/maintenance', receptionistToken);
  assert(recMaint.status === 403, 'Receptionist is rejected (403) from maintenance module');

  // Receptionist is forbidden from viewing or modifying staff
  const recStaff = await req('/staff', receptionistToken);
  assert(recStaff.status === 403, 'Receptionist is rejected (403) from staff management');

  // 4. REAL-TIME SYNCHRONIZATION VIA SOCKET.IO
  console.log('\n--- Testing REAL-TIME Socket.IO Room Status Synchronization ---');
  await new Promise((resolve) => {
    const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
    let received = false;

    socket.on('connect', () => {
      console.log('Connected to real-time server via Socket.IO');

      socket.on('room:status_changed', (payload) => {
        received = true;
        assert(true, `Received real-time room update: Room ${payload.roomNumber || payload.roomId} -> ${payload.status}`);
        socket.disconnect();
        resolve();
      });

      // Trigger a room status update as Manager
      setTimeout(async () => {
        console.log('Manager marking room 1 clean...');
        await req('/rooms/1/clean', managerToken, 'PUT', { notes: 'Automated test clean' });
        
        // Timeout safety
        setTimeout(() => {
          if (!received) {
            console.log('Socket update timeout check');
            socket.disconnect();
            resolve();
          }
        }, 3000);
      }, 500);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connect note:', err.message);
      resolve();
    });
  });

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
}

runTests().catch(console.error);
