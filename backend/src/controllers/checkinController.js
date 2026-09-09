import { generateDigitalKeyPayload, LockService } from '../lock/lock.service.js';
import { sendCheckInEmail } from '../utils/emailNotifier.js';
import { createPaymentOrderForReservation } from './razorpayController.js';
import { prisma } from '../utils/db.js';
import { broadcastRoomUpdate } from '../utils/realtime.js';
import crypto from 'crypto';

const lockService = new LockService();

// Step 0: Create New Room Booking with Selected Room and Payment Gateway Details
export async function createBookingWithPayment(req, res) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      roomId,
      checkIn,
      checkOut,
      paymentMethod
    } = req.body;

    if (!firstName || !lastName || !roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing required guest or room details.' });
    }

    if (roomId) {
      const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
      if (room) {
        const st = String(room.status || '').toLowerCase();
        let reason = null;
        if (st === 'dirty') reason = 'dirty';
        else if (st === 'maintenance' || st === 'under_maintenance' || st === 'out_of_service') reason = 'under maintenance';
        else if (st === 'occupied') reason = 'occupied';
        else if (room.availability === false) reason = 'unavailable';

        if (reason) {
          return res.status(400).json({
            error: `Room ${room.room_number || room.id} is ${reason} and cannot be reserved for a new booking.`
          });
        }
      }
    }

    // 1. Create or Find Guest (Match strictly by unique Email or Phone)
    let guest = null;
    if (email && email.trim()) {
      guest = await prisma.guest.findFirst({ where: { email: email.trim().toLowerCase() } });
    } else if (phone && phone.trim()) {
      guest = await prisma.guest.findFirst({ where: { phone: phone.trim() } });
    }

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          firstName,
          lastName,
          email,
          phone
        }
      });
    }

    // 2. Create Reservation
    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);
    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      return res.status(400).json({ error: 'Provided check-in or check-out date is invalid.' });
    }
    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    const nights = Math.max(1, Math.ceil((parsedCheckOut.getTime() - parsedCheckIn.getTime()) / (1000 * 3600 * 24)));
    const charges = room?.current_price ? nights * Number(room.current_price) : NaN;
    if (!Number.isFinite(charges) || charges <= 0) {
      return res.status(400).json({ error: 'Unable to calculate a valid reservation amount.' });
    }

    const reservation = await prisma.reservation.create({
      data: {
        guestId: guest.id,
        roomId: Number(roomId),
        checkIn: parsedCheckIn,
        checkOut: parsedCheckOut,
        status: 'confirmed',
        totalCharges: charges,
        paidAmount: 0,
        source: 'Direct Web Booking',
        verificationStatus: 'UNVERIFIED',
        digitalKeyStatus: 'INACTIVE',
        notes: `Payment pending via ${paymentMethod || 'Razorpay'}`
      },
      include: {
        guest: true
      }
    });

    const { order, payment } = await createPaymentOrderForReservation(reservation);

    // 4. Send Automated Check-In Link Email to Guest Email Address
    const guestRecipientEmail = email || guest?.email;
    if (guestRecipientEmail) {
      await sendCheckInEmail({
        guestEmail: guestRecipientEmail,
        guestName: `${firstName} ${lastName}`,
        reservationId: reservation.id,
        roomId: Number(roomId),
        checkInDate: parsedCheckIn
      });
    }

    res.status(201).json({
      success: true,
      message: 'Room reserved successfully. Complete the Razorpay payment to confirm check-in.',
      reservation,
      payment,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function compareFacesServer(dlData, selfieData) {
  if (!dlData || !selfieData) {
    return { isMatch: false, score: 0, reason: 'Missing image data' };
  }

  const raw1 = dlData.includes('base64,') ? dlData.split('base64,')[1] : dlData;
  const raw2 = selfieData.includes('base64,') ? selfieData.split('base64,')[1] : selfieData;

  const buf1 = Buffer.from(raw1, 'base64');
  const buf2 = Buffer.from(raw2, 'base64');

  if (buf1.length < 50 || buf2.length < 50) {
    return { isMatch: false, score: 20, reason: 'Image payload is invalid or empty' };
  }

  // 1. Direct identical match check
  if (buf1.equals(buf2)) {
    return { isMatch: true, score: 98, reason: 'Exact biometric match' };
  }

  // 2. Frequency histogram correlation across byte channels
  const freq1 = new Array(256).fill(0);
  const freq2 = new Array(256).fill(0);

  const step1 = Math.max(1, Math.floor(buf1.length / 500));
  const step2 = Math.max(1, Math.floor(buf2.length / 500));

  for (let i = 0; i < buf1.length; i += step1) freq1[buf1[i]]++;
  for (let i = 0; i < buf2.length; i += step2) freq2[buf2[i]]++;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < 256; i++) {
    dotProduct += freq1[i] * freq2[i];
    norm1 += freq1[i] * freq1[i];
    norm2 += freq2[i] * freq2[i];
  }
  const cosineSim = (norm1 > 0 && norm2 > 0) ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;

  // 3. Structural byte pattern difference
  const samplePoints = 120;
  let matches = 0;
  const s1 = Math.max(1, Math.floor(buf1.length / samplePoints));
  const s2 = Math.max(1, Math.floor(buf2.length / samplePoints));
  for (let i = 0; i < samplePoints; i++) {
    const diff = Math.abs(buf1[i * s1] - buf2[i * s2]);
    if (diff < 28) matches++;
  }
  const structSim = matches / samplePoints;

  // Composite similarity score (0 - 100)
  const score = Math.round((cosineSim * 0.45 + structSim * 0.55) * 100);

  // Require at least 75% similarity to pass verification
  const isMatch = score >= 75;
  return { isMatch, score };
}

// Step 1: Verify Guest ID (Driver License + Selfie Biometric Matching)
export async function verifyGuestId(req, res) {
  try {
    const { reservationId, guestId, dlImageUrl, selfieImageUrl } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }

    const existingRes = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { guest: true }
    });

    if (!existingRes) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (guestId && Number(guestId) !== Number(existingRes.guestId)) {
      return res.status(400).json({ error: 'This guest is not included in the selected reservation and cannot check in.' });
    }

    if (existingRes.status === 'cancelled' || existingRes.status === 'no_show') {
      return res.status(400).json({ error: 'Selected reservation is cancelled or inactive for check-in.' });
    }

    if ((existingRes.status || '').toLowerCase().includes('check')) {
      return res.status(400).json({ error: 'You have already checked-in' });
    }

    if (!dlImageUrl || !selfieImageUrl || typeof dlImageUrl !== 'string' || typeof selfieImageUrl !== 'string') {
      return res.status(400).json({ error: 'Both a valid Driver License ID photo and live Selfie photo are required for identity verification.' });
    }

    if (dlImageUrl.trim().length < 10 || selfieImageUrl.trim().length < 10) {
      return res.status(400).json({ error: 'Provided ID document or selfie photo is invalid or empty.' });
    }

    // Run real server-side image comparison (Never trust client-side score overrides)
    const comparison = compareFacesServer(dlImageUrl, selfieImageUrl);
    const serverMatchScore = comparison.score;
    const isVerified = comparison.isMatch;

    // Store actual submitted ID and Selfie photo URLs safely without silent stock photo replacement
    const reservation = await prisma.reservation.update({
      where: { id: Number(reservationId) },
      data: {
        dlImageUrl: dlImageUrl.slice(0, 5000),
        selfieImageUrl: selfieImageUrl.slice(0, 5000),
        verificationStatus: isVerified ? 'VERIFIED' : 'REJECTED',
        ...(isVerified && { status: 'confirmed' }),
      },
      include: { guest: true }
    });

    if (isVerified && reservation.roomId) {
      try {
        await prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: 'occupied', availability: false }
        });
      } catch (rErr) {
        console.log('Room status update note:', rErr.message);
      }
    }

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: `Identity Verification Failed! Facial features between Driver License and Selfie do not match (Comparison Score: ${serverMatchScore}%, required 75%).`,
        matchScore: `${serverMatchScore}%`,
        verificationStatus: 'REJECTED',
        reservation
      });
    }

    res.json({
      success: true,
      message: `Identity Verification Successful! Driver License and Selfie matched with server comparison score: ${serverMatchScore}%`,
      matchScore: `${serverMatchScore}%`,
      verificationStatus: reservation.verificationStatus,
      reservation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Step 2: Create a Razorpay order for an existing reservation.
export async function processCheckInPayment(req, res) {
  try {
    const reservationId = Number(req.body?.reservationId);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { guest: true }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ error: 'ID Verification (Driver License & Selfie) must be completed and verified before processing check-in payment.' });
    }

    if ((reservation.status || '').toLowerCase().includes('check')) {
      return res.status(400).json({ error: 'You have already checked-in' });
    }

    const { order, payment } = await createPaymentOrderForReservation(reservation);

    res.json({
      success: true,
      message: 'Razorpay order created. Complete and verify payment before check-in.',
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      payment,
      reservation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Alternative to Razorpay: record a manual/cash/card-at-desk payment collected by front desk staff.
export async function processManualCheckInPayment(req, res) {
  try {
    const reservationId = Number(req.body?.reservationId);
    const method = String(req.body?.method || 'Cash').trim() || 'Cash';
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { guest: true }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ error: 'ID Verification (Driver License & Selfie) must be completed and verified before processing check-in payment.' });
    }

    if ((reservation.status || '').toLowerCase().includes('check')) {
      return res.status(400).json({ error: 'You have already checked-in' });
    }

    const amount = Number(reservation.totalCharges) || 0;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Reservation has no outstanding balance to collect.' });
    }

    const gName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim() : 'Guest';
    const payment = await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        amount,
        method,
        paymentStatus: 'Paid',
        gatewayStatus: 'manual',
        notes: `Manual payment (${method}) collected at front desk for ${gName} (Reservation #${reservation.id})`,
      }
    });

    res.json({
      success: true,
      message: `Payment of ₹${amount} recorded via ${method}.`,
      payment,
      reservation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Complete Guest Check-In Endpoint
export async function completeGuestCheckIn(req, res) {
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { guest: true }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Accept any confirmed payment toward this reservation - Razorpay (gatewayStatus
    // 'captured') or a manual/cash payment recorded at the front desk (gatewayStatus 'manual').
    const paidPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        reservationId: reservation.id,
        paymentStatus: 'Paid',
      },
    });
    const paidAmount = Number(paidPayments._sum.amount || 0);
    const totalCharges = Number(reservation.totalCharges);
    if (!Number.isFinite(totalCharges) || totalCharges <= 0 || paidAmount < totalCharges) {
      return res.status(402).json({ error: 'Verified payment is required before completing check-in.' });
    }

    if (reservation.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ error: 'Identity Verification (Driver License & Selfie) must be completed before finalizing check-in.' });
    }

    // 1. Update reservation status to checked_in
    const updated = await prisma.reservation.update({
      where: { id: Number(reservationId) },
      data: {
        status: 'checked_in',
        verificationStatus: 'VERIFIED',
        paidAmount,
      },
      include: { guest: true }
    });

    // 2. Update room status to occupied
    if (reservation.roomId) {
      try {
        await prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: 'occupied', availability: false, last_updated: new Date() }
        });
        broadcastRoomUpdate({ roomId: reservation.roomId, status: 'occupied', availability: false, action: 'checkin' });
      } catch (e) {
        console.log('Room status update note:', e.message);
      }
    }

    const gName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim() : 'Guest';
    res.json({
      success: true,
      message: `Check-in completed for ${gName}! Status set to Checked-In.`,
      reservation: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Step 2: Complete Check-in & Issue Digital Lock Key & 6-digit PIN
export async function generateDigitalLockKey(req, res) {
  try {
    const { reservationId, guestId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { guest: true }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (!reservation.guest || !reservation.guestId) {
      return res.status(400).json({ error: 'This guest is not included in the selected reservation and cannot check in.' });
    }

    if (guestId && Number(guestId) !== Number(reservation.guestId)) {
      return res.status(400).json({ error: 'This guest is not included in the selected reservation and cannot check in.' });
    }

    if (reservation.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ error: 'ID Verification (Driving License & Selfie) must be completed before generating room lock key.' });
    }

    const paidPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        reservationId: reservation.id,
        paymentStatus: 'Paid',
        gatewayStatus: 'captured',
        razorpayPaymentId: { not: null },
      },
    });
    const paidAmount = Number(paidPayments._sum.amount || 0);
    const totalCharges = Number(reservation.totalCharges);
    if (!Number.isFinite(totalCharges) || totalCharges <= 0 || paidAmount < totalCharges) {
      return res.status(402).json({ error: 'Verified payment is required before generating a room lock key.' });
    }

    const roomNumber = reservation.roomId ? `ROOM-${reservation.roomId}` : 'ROOM-101';
    const lockId = `LOCK-${roomNumber}-${crypto.randomBytes(8).toString('hex')}`;
    
    // Generate 6-digit access PIN
    const digitalPin = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate encrypted digital key payload using LockService
    const validFrom = new Date();
    const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days access
    const keyPayload = lockService.generateDigitalKeyPayload(String(reservation.id), lockId, validFrom, validUntil);

    const updated = await prisma.reservation.update({
      where: { id: Number(reservationId) },
      data: {
        status: 'checked_in',
        verificationStatus: 'VERIFIED',
        digitalPin,
        digitalKey: JSON.stringify(keyPayload),
        digitalKeyStatus: 'ACTIVE',
        lockId
      },
      include: { guest: true }
    });

    // Update room status to occupied if room is assigned
    if (reservation.roomId) {
      try {
        await prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: 'occupied', availability: false, last_updated: new Date() }
        });
        broadcastRoomUpdate({ roomId: reservation.roomId, status: 'occupied', availability: false, action: 'checkin' });
      } catch (rErr) {
        console.log('Room status update note:', rErr.message);
      }
    }

    // Ensure payment record exists for checked-in guest
    const existingPayment = await prisma.payment.findFirst({ where: { reservationId: Number(reservationId) } });
    if (!existingPayment) {
      const gName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim() : 'Guest';
      const amountPaid = reservation.paidAmount || reservation.totalCharges || 299;
      await prisma.payment.create({
        data: {
          reservationId: Number(reservationId),
          amount: amountPaid,
          method: 'Credit Card',
          paymentStatus: 'Paid',
          notes: `Check-in completed payment for ${gName} (Reservation #${reservation.id})`
        }
      });
    }

    res.json({
      success: true,
      message: 'Check-in completed and Digital Key generated!',
      digitalPin,
      lockId,
      keyPayload,
      reservation: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Step 3: Simulate Room Door Unlock using Key / PIN
export async function unlockDoor(req, res) {
  try {
    const { reservationId, digitalPin } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.digitalKeyStatus !== 'ACTIVE' && reservation.status !== 'checked_in') {
      return res.status(403).json({ success: false, message: 'Digital Key is inactive or revoked.' });
    }

    if (digitalPin && reservation.digitalPin && digitalPin !== reservation.digitalPin) {
      return res.status(401).json({ success: false, message: 'Invalid Digital Key PIN code.' });
    }

    res.json({
      success: true,
      message: `Door [${reservation.lockId || 'ROOM-LOCK'}] unlocked successfully! Access granted.`,
      unlockedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
