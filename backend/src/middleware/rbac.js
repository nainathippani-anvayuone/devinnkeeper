import { getUserPermissions, hasPermission, normalizeRoleName } from '../services/rbacService.js';

export function normalizeRole(role) {
  return normalizeRoleName(role).toLowerCase();
}

/**
 * Granular Permission Authorization Middleware.
 * Enforces ROLE -> MODULE -> ACTION permissions.
 * If unauthorized, returns HTTP 403:
 * {
 *   "success": false,
 *   "message": "You do not have permission to perform this action"
 * }
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    try {
      const permissions = await getUserPermissions(req.user);
      req.userPermissions = permissions;

      if (hasPermission(permissions, permission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    } catch (error) {
      console.error('Error in requirePermission middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Requires at least one of the listed permissions.
 */
export function requireAnyPermission(...permissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    try {
      const userPermissions = await getUserPermissions(req.user);
      req.userPermissions = userPermissions;

      const allowed = permissions.some(perm => hasPermission(userPermissions, perm));
      if (allowed) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    } catch (error) {
      console.error('Error in requireAnyPermission middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Backward compatibility role-based middleware
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

    if (userRole === 'admin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action',
    });
  };
}
