import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/utils/db.js';

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
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, data: json };
}

async function run() {
  console.log('=== VERIFYING CANCELLATION REQUEST & APPROVAL WORKFLOW ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message} ${details ? JSON.stringify(details) : ''}`);
      failed++;
    }
  }

  try {
    // Setup test room and reservations
    let guest = await prisma.guest.findFirst();
    if (!guest) {
      guest = await prisma.guest.create({
        data: { firstName: 'Test', lastName: 'Guest', email: 'test@example.com' }
      });
    }

    let room = await prisma.room.findFirst({ where: { status: 'vacant' } });
    if (!room) {
      room = await prisma.room.create({
        data: { room_number: '999', type: 'standard', base_price: 2000, status: 'vacant', availability: true }
      });
    }

    // Create a test reservation for Manager cancellation test
    const resv1 = await prisma.reservation.create({
      data: {
        guestId: guest.id,
        roomId: room.id,
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000),
        status: 'confirmed',
        totalCharges: 2000,
        paidAmount: 0,
        source: 'Direct'
      }
    });

    // 1. Manager attempts to cancel reservation
    console.log('\n--- 1. Manager cancellation request ---');
    const mgrCancelRes = await req(`/reservations/${resv1.id}/cancel`, managerToken, 'POST', { reason: 'Guest requested refund' });
    assert(mgrCancelRes.status === 200, 'Manager call to /reservations/:id/cancel returns 200');
    assert(mgrCancelRes.data?.requiresApproval === true, 'Response specifies requiresApproval: true');
    assert(mgrCancelRes.data?.message?.includes('Admin'), 'Response message notes request submitted to Admin');

    const dbResv1 = await prisma.reservation.findUnique({ where: { id: resv1.id } });
    assert(dbResv1.status === 'cancellation_requested', 'Reservation status updated to cancellation_requested in DB (not directly cancelled)');

    const approvalReq1 = await prisma.approvalRequest.findFirst({
      where: { referenceId: String(resv1.id), type: 'cancellation', status: 'pending' }
    });
    assert(Boolean(approvalReq1), 'Pending ApprovalRequest created in DB');

    // 2. Manager attempts direct update to 'cancelled' via PUT /reservations/:id
    console.log('\n--- 2. Direct PUT update bypass attempt ---');
    const mgrPutCancel = await req(`/reservations/${resv1.id}`, managerToken, 'PUT', { status: 'cancelled' });
    assert(mgrPutCancel.status === 403, 'Manager blocked from directly updating status to cancelled via PUT (403)');

    const recepPutCancel = await req(`/reservations/${resv1.id}`, receptionistToken, 'PUT', { status: 'cancelled' });
    assert(recepPutCancel.status === 403, 'Receptionist blocked from directly updating status to cancelled via PUT (403)');

    // 3. Manager and Receptionist cannot review (approve/reject) cancellation requests
    console.log('\n--- 3. Manager/Receptionist reviewing cancellation approval ---');
    const mgrReview = await req(`/approvals/${approvalReq1.id}/review`, managerToken, 'PUT', { status: 'approved' });
    assert(mgrReview.status === 403, 'Manager blocked from approving cancellation request (403 Forbidden)');

    const recepReview = await req(`/approvals/${approvalReq1.id}/review`, receptionistToken, 'PUT', { status: 'approved' });
    assert(recepReview.status === 403, 'Receptionist blocked from approving cancellation request (403 Forbidden)');

    // 4. Admin rejects cancellation request
    console.log('\n--- 4. Admin rejects cancellation request ---');
    const adminReject = await req(`/approvals/${approvalReq1.id}/review`, adminToken, 'PUT', { status: 'rejected' });
    assert(adminReject.status === 200, 'Admin can reject cancellation request (200 OK)');

    const dbResv1AfterReject = await prisma.reservation.findUnique({ where: { id: resv1.id } });
    assert(dbResv1AfterReject.status === 'confirmed', 'Reservation status restored to confirmed after rejection');

    // 5. Receptionist submits cancellation request, Admin approves it
    console.log('\n--- 5. Receptionist request & Admin approval ---');
    const recepCancelRes = await req(`/reservations/${resv1.id}/cancel`, receptionistToken, 'POST', { reason: 'No show' });
    assert(recepCancelRes.data?.requiresApproval === true, 'Receptionist cancellation requires approval');

    const approvalReq2 = await prisma.approvalRequest.findFirst({
      where: { referenceId: String(resv1.id), type: 'cancellation', status: 'pending' }
    });
    assert(Boolean(approvalReq2), 'New pending ApprovalRequest created');

    const adminApprove = await req(`/approvals/${approvalReq2.id}/review`, adminToken, 'PUT', { status: 'approved' });
    assert(adminApprove.status === 200, 'Admin can approve cancellation request (200 OK)');

    const dbResv1AfterApprove = await prisma.reservation.findUnique({ where: { id: resv1.id } });
    assert(dbResv1AfterApprove.status === 'cancelled', 'Reservation status updated to cancelled after Admin approval');

    const dbRoomAfterApprove = await prisma.room.findUnique({ where: { id: room.id } });
    assert(dbRoomAfterApprove.availability === true, 'Assigned room availability freed up to true');

    // 6. Admin direct cancellation
    console.log('\n--- 6. Admin direct cancellation ---');
    const resv2 = await prisma.reservation.create({
      data: {
        guestId: guest.id,
        roomId: room.id,
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000),
        status: 'confirmed',
        totalCharges: 2500,
        paidAmount: 0,
        source: 'Direct'
      }
    });

    const adminDirectCancel = await req(`/reservations/${resv2.id}/cancel`, adminToken, 'POST', { reason: 'Admin cancel' });
    assert(adminDirectCancel.status === 200, 'Admin can cancel directly (200 OK)');
    assert(adminDirectCancel.data?.requiresApproval !== true, 'Admin direct cancel does NOT require approval');

    const dbResv2 = await prisma.reservation.findUnique({ where: { id: resv2.id } });
    assert(dbResv2.status === 'cancelled', 'Reservation directly cancelled by Admin');

    // Clean up test records
    await prisma.reservation.deleteMany({ where: { id: { in: [resv1.id, resv2.id] } } });
    await prisma.approvalRequest.deleteMany({ where: { referenceId: { in: [String(resv1.id), String(resv2.id)] } } });

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
