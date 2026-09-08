/**
 * notificationController.js
 * Role-aware notification API endpoints.
 */

import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  createNotification,
  formatNotification,
} from '../utils/notificationService.js';

/**
 * GET /api/notifications
 * Returns notifications visible to the current user based on their role.
 * Query params: page, limit, unread (boolean), type
 */
export async function listNotifications(req, res) {
  try {
    const { id: userId, role } = req.user;
    const { page = 1, limit = 20, unread, type } = req.query;

    const result = await getNotificationsForUser(userId, role, {
      page: Number(page),
      limit: Number(limit),
      unreadOnly: unread === 'true',
      type: type || null,
    });

    res.json(result);
  } catch (err) {
    console.error('[notificationController] listNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for the current user.
 */
export async function getUnreadNotificationCount(req, res) {
  try {
    const { id: userId, role } = req.user;
    const count = await getUnreadCount(userId, role);
    res.json({ count });
  } catch (err) {
    console.error('[notificationController] getUnreadCount error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/**
 * POST /api/notifications
 * Manually create a notification (admin/manager only for manual creation).
 */
export async function createNotificationEndpoint(req, res) {
  try {
    const { type, title, message, priority, targetRoles, roomId, guestId, reservationId, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = await createNotification({
      type: type || 'system',
      title,
      message,
      priority,
      targetRoles,
      roomId,
      guestId,
      reservationId,
      metadata,
    });

    if (!notification) {
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    res.status(201).json(formatNotification(notification));
  } catch (err) {
    console.error('[notificationController] createNotification error:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markOneRead(req, res) {
  try {
    const { id: userId, role } = req.user;
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const updated = await markNotificationRead(notificationId, userId, role);

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found or not authorized' });
    }

    res.json({ success: true, notification: formatNotification(updated) });
  } catch (err) {
    console.error('[notificationController] markOneRead error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all visible notifications as read for the current user.
 */
export async function markAllRead(req, res) {
  try {
    const { id: userId, role } = req.user;
    const result = await markAllNotificationsRead(userId, role);
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error('[notificationController] markAllRead error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a single notification (with authorization check).
 */
export async function deleteOneNotification(req, res) {
  try {
    const { id: userId, role } = req.user;
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const deleted = await deleteNotification(notificationId, userId, role);

    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found or not authorized' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notificationController] deleteOneNotification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/**
 * POST /api/notifications/mark-read   (legacy compat)
 * DELETE /api/notifications           (legacy compat - clears all visible to user)
 */
export async function markRead(req, res) {
  const { id: userId, role } = req.user;
  const { id, ids } = req.body || {};

  if (id !== undefined && id !== null) {
    const updated = await markNotificationRead(Number(id), userId, role);
    return res.json({ success: !!updated });
  }
  if (ids && Array.isArray(ids) && ids.length > 0) {
    for (const nid of ids) {
      await markNotificationRead(Number(nid), userId, role);
    }
    return res.json({ success: true });
  }
  // Mark all
  const result = await markAllNotificationsRead(userId, role);
  return res.json({ success: true, count: result.count });
}

export async function clearNotifications(req, res) {
  try {
    const { id: userId, role } = req.user;
    const result = await markAllNotificationsRead(userId, role);
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error('[notificationController] clearNotifications error:', err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
}

// Keep backward-compatible export name
export { createNotificationEndpoint as createNotification };
