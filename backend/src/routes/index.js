import express from 'express';

// Middleware
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authenticateTokenOrCheckInAccess } from '../utils/checkinAccess.js';
import { requireRole } from '../middleware/rbac.js';

// Auth
import {
  signup,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';

// Module2 distribution
import {
  healthCheck,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateAvailability,
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking,
  listChannels,
  syncChannel,
  connectChannel,
  disconnectChannel,
  reconnectChannel,
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  recalculatePricing,
  listPricingHistory,
  listSyncLogs,
  listStatistics,
  listOccupancyHistory
} from '../controllers/distributionController.js';

// New feature controllers
import {
  listRoomsNew,
  getRoomNew,
  createRoomNew,
  updateRoomNew,
  deleteRoomNew,
  startCleaning,
  markRoomClean,
  markRoomDirty,
  markRoomInspected
} from '../controllers/roomsController.js';
import { listGuests, createGuest, updateGuest, deleteGuest } from '../controllers/guestController.js';
import { listReservations, createReservation, updateReservation, deleteReservation } from '../controllers/reservationController.js';
import { listPayments, getPayment, createPayment, updatePayment, deletePayment } from '../controllers/paymentController.js';
import { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';
import { listCashLedger, createCashLedger, updateCashLedger, deleteCashLedger } from '../controllers/cashLedgerController.js';
import { listShiftAudits, createShiftAudit, updateShiftAudit, deleteShiftAudit } from '../controllers/shiftAuditController.js';
import { listHousekeeping, createHousekeeping, updateHousekeeping } from '../controllers/housekeepingController.js';
import { listMaintenance, createMaintenance, updateMaintenance } from '../controllers/maintenanceController.js';
import {
  listNotifications,
  createNotification,
  markRead,
  clearNotifications
} from '../controllers/notificationController.js';
import { getAnalytics } from '../controllers/analyticsController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { getWeather } from '../controllers/weatherController.js';
import { getRoomAvailability } from '../controllers/roomAvailabilityController.js';
import {
  createBookingWithPayment,
  getGuestCheckInAccess,
  verifyGuestId,
  processCheckInPayment,
  processManualCheckInPayment,
  generateDigitalLockKey,
  unlockDoor,
  completeGuestCheckIn
} from '../controllers/checkinController.js';
import { createPaymentOrder, verifyPayment } from '../controllers/razorpayController.js';

const router = express.Router();

// ─── Health & Public ───────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/weather', getWeather);

// ─── Auth ──────────────────────────────────────────────────
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/me', me);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// ─── Check-In & Digital Lock Key Generation (Protected / Verified) ─
router.post('/checkin/book-with-payment', authenticateToken, createBookingWithPayment);
router.get('/checkin/access', getGuestCheckInAccess);
router.post('/checkin/verify-id', authenticateTokenOrCheckInAccess, verifyGuestId);
router.post('/checkin/process-payment', authenticateTokenOrCheckInAccess, processCheckInPayment);
router.post('/checkin/manual-payment', authenticateToken, processManualCheckInPayment);
router.post('/checkin/payment/order', authenticateTokenOrCheckInAccess, createPaymentOrder);
router.post('/checkin/payment/verify', authenticateTokenOrCheckInAccess, verifyPayment);
router.post('/checkin/generate-lock-key', authenticateTokenOrCheckInAccess, generateDigitalLockKey);
router.post('/checkin/unlock-door', authenticateTokenOrCheckInAccess, unlockDoor);
router.post('/checkin/complete', authenticateTokenOrCheckInAccess, completeGuestCheckIn);

// ─── Rooms ─────────────────────────────────────────────────
router.get('/rooms', authenticateToken, listRoomsNew);
router.get('/rooms/:id', authenticateToken, getRoomNew);
router.post('/rooms', authenticateToken, requireRole('admin', 'manager'), createRoomNew);
router.put('/rooms/:id', authenticateToken, requireRole('admin', 'manager'), updateRoomNew);
router.delete('/rooms/:id', authenticateToken, requireRole('admin', 'manager'), deleteRoomNew);

router.put('/rooms/:id/start', authenticateToken, startCleaning);
router.put('/rooms/:id/clean', authenticateToken, markRoomClean);
router.put('/rooms/:id/dirty', authenticateToken, markRoomDirty);
router.put('/rooms/:id/inspect', authenticateToken, markRoomInspected);

// ─── Guests ────────────────────────────────────────────────
router.get('/guests', authenticateToken, listGuests);
router.post('/guests', authenticateToken, createGuest);
router.put('/guests/:id', authenticateToken, updateGuest);
router.delete('/guests/:id', authenticateToken, requireRole('admin', 'manager'), deleteGuest);

// ─── Reservations ──────────────────────────────────────────
router.get('/reservations', authenticateToken, listReservations);
router.post('/reservations', authenticateToken, createReservation);
router.put('/reservations/:id', authenticateToken, updateReservation);
router.delete('/reservations/:id', authenticateToken, requireRole('admin', 'manager'), deleteReservation);

// ─── Payments ──────────────────────────────────────────────
router.get('/payments', authenticateToken, listPayments);
router.get('/payments/:id', authenticateToken, getPayment);
router.post('/payments', authenticateToken, createPayment);
router.put('/payments/:id', authenticateToken, updatePayment);
router.delete('/payments/:id', authenticateToken, requireRole('admin', 'manager'), deletePayment);

// ─── Vehicles ──────────────────────────────────────────────
router.get('/vehicles', authenticateToken, listVehicles);
router.get('/vehicles/:id', authenticateToken, getVehicle);
router.post('/vehicles', authenticateToken, createVehicle);
router.put('/vehicles/:id', authenticateToken, updateVehicle);
router.delete('/vehicles/:id', authenticateToken, requireRole('admin', 'manager'), deleteVehicle);

// ─── Cash Ledger ───────────────────────────────────────────
router.get('/cash-ledger', authenticateToken, listCashLedger);
router.post('/cash-ledger', authenticateToken, createCashLedger);
router.put('/cash-ledger/:id', authenticateToken, updateCashLedger);
router.delete('/cash-ledger/:id', authenticateToken, requireRole('admin', 'manager'), deleteCashLedger);

// ─── Shift Audits ──────────────────────────────────────────
router.get('/shift-audits', authenticateToken, listShiftAudits);
router.post('/shift-audits', authenticateToken, createShiftAudit);
router.put('/shift-audits/:id', authenticateToken, updateShiftAudit);
router.delete('/shift-audits/:id', authenticateToken, requireRole('admin', 'manager'), deleteShiftAudit);

// ─── Housekeeping ──────────────────────────────────────────
router.get('/housekeeping', authenticateToken, listHousekeeping);
router.post('/housekeeping', authenticateToken, createHousekeeping);
router.put('/housekeeping/:id', authenticateToken, updateHousekeeping);

// ─── Maintenance ───────────────────────────────────────────
router.get('/maintenance', authenticateToken, listMaintenance);
router.post('/maintenance', authenticateToken, createMaintenance);
router.put('/maintenance/:id', authenticateToken, updateMaintenance);

// ─── Notifications ─────────────────────────────────────────
router.get('/notifications', authenticateToken, listNotifications);
router.post('/notifications', authenticateToken, createNotification);
router.post('/notifications/mark-read', authenticateToken, markRead);
router.put('/notifications', authenticateToken, markRead);
router.delete('/notifications', authenticateToken, clearNotifications);

// ─── Analytics / Dashboard ────────────────────────────────
router.get('/analytics', authenticateToken, getAnalytics);
router.get('/dashboard', authenticateToken, getDashboard);
router.get('/room-availability', authenticateToken, getRoomAvailability);

// ─── Module2 distribution ─────────────────────────────────
router.get('/module2/health', healthCheck);
router.get('/module2/rooms', authenticateToken, listRooms);
router.post('/module2/rooms', authenticateToken, requireRole('admin', 'manager'), createRoom);
router.put('/module2/rooms/:id', authenticateToken, requireRole('admin', 'manager'), updateRoom);
router.delete('/module2/rooms/:id', authenticateToken, requireRole('admin', 'manager'), deleteRoom);
router.patch('/module2/rooms/:id/availability', authenticateToken, updateAvailability);
router.get('/module2/bookings', authenticateToken, listBookings);
router.post('/module2/bookings', authenticateToken, createBooking);
router.put('/module2/bookings/:id', authenticateToken, updateBooking);
router.post('/module2/bookings/:id/cancel', authenticateToken, cancelBooking);
router.delete('/module2/bookings/:id', authenticateToken, requireRole('admin', 'manager'), deleteBooking);
router.get('/module2/channels', authenticateToken, listChannels);
router.post('/module2/channels/:id/sync', authenticateToken, syncChannel);
router.post('/module2/channels/:id/connect', authenticateToken, connectChannel);
router.post('/module2/channels/:id/disconnect', authenticateToken, disconnectChannel);
router.post('/module2/channels/:id/reconnect', authenticateToken, reconnectChannel);
router.get('/module2/pricing-rules', authenticateToken, listPricingRules);
router.post('/module2/pricing-rules', authenticateToken, requireRole('admin', 'manager'), createPricingRule);
router.put('/module2/pricing-rules/:id', authenticateToken, requireRole('admin', 'manager'), updatePricingRule);
router.delete('/module2/pricing-rules/:id', authenticateToken, requireRole('admin', 'manager'), deletePricingRule);
router.patch('/module2/pricing-rules/:id/toggle', authenticateToken, togglePricingRule);
router.post('/module2/pricing/recalculate', authenticateToken, recalculatePricing);
router.post('/module2/pricing-engine/recalculate', authenticateToken, recalculatePricing);
router.get('/module2/pricing-history', authenticateToken, listPricingHistory);
router.get('/module2/sync-logs', authenticateToken, listSyncLogs);
router.get('/module2/statistics', authenticateToken, listStatistics);
router.get('/module2/occupancy-history', authenticateToken, listOccupancyHistory);

export default router;