import { prisma } from '../utils/db.js';

export const ALL_PERMISSIONS = [
  // Dashboard
  { name: 'dashboard.view', module: 'dashboard', action: 'VIEW', description: 'View dashboard metrics' },
  { name: 'dashboard.revenue_view', module: 'dashboard', action: 'VIEW', description: 'View financial and revenue metrics on dashboard' },

  // Reservations
  { name: 'reservations.view', module: 'reservations', action: 'VIEW', description: 'View reservations and booking details' },
  { name: 'reservations.create', module: 'reservations', action: 'CREATE', description: 'Create new reservations' },
  { name: 'reservations.edit', module: 'reservations', action: 'EDIT', description: 'Modify existing reservations' },
  { name: 'reservations.cancel', module: 'reservations', action: 'CANCEL', description: 'Directly cancel reservations' },
  { name: 'reservations.cancel_request', module: 'reservations', action: 'CANCEL', description: 'Request reservation cancellation requiring approval' },
  { name: 'reservations.delete', module: 'reservations', action: 'DELETE', description: 'Delete historical reservations' },
  { name: 'reservations.approve', module: 'reservations', action: 'APPROVE', description: 'Approve or reject reservation cancellation requests' },
  { name: 'reservations.assign_room', module: 'reservations', action: 'MANAGE', description: 'Assign rooms to reservations' },
  { name: 'reservations.extend_stay', module: 'reservations', action: 'MANAGE', description: 'Extend guest stay dates' },

  // Guests
  { name: 'guests.view', module: 'guests', action: 'VIEW', description: 'View guests list and profiles' },
  { name: 'guests.create', module: 'guests', action: 'CREATE', description: 'Register new guests' },
  { name: 'guests.edit', module: 'guests', action: 'EDIT', description: 'Update guest details' },
  { name: 'guests.delete', module: 'guests', action: 'DELETE', description: 'Delete guest profiles' },
  { name: 'guests.upload_docs', module: 'guests', action: 'CREATE', description: 'Upload guest ID and verification documents' },

  // Rooms
  { name: 'rooms.view', module: 'rooms', action: 'VIEW', description: 'View rooms and room availability' },
  { name: 'rooms.create', module: 'rooms', action: 'CREATE', description: 'Create new rooms' },
  { name: 'rooms.edit', module: 'rooms', action: 'EDIT', description: 'Edit room configuration' },
  { name: 'rooms.delete', module: 'rooms', action: 'DELETE', description: 'Delete rooms' },
  { name: 'rooms.manage', module: 'rooms', action: 'MANAGE', description: 'Change operational room status, block/unblock rooms' },

  // Room Types
  { name: 'room_types.view', module: 'room_types', action: 'VIEW', description: 'View room types' },
  { name: 'room_types.manage', module: 'room_types', action: 'MANAGE', description: 'Create, update, or delete room types' },

  // Checkin / Checkout
  { name: 'checkin.perform', module: 'checkin', action: 'CHECK_IN', description: 'Perform guest check-in' },
  { name: 'checkout.perform', module: 'checkout', action: 'CHECK_OUT', description: 'Perform guest check-out' },

  // Housekeeping
  { name: 'housekeeping.view', module: 'housekeeping', action: 'VIEW', description: 'View housekeeping tasks and room status' },
  { name: 'housekeeping.manage', module: 'housekeeping', action: 'MANAGE', description: 'Assign housekeeping tasks, inspect rooms, update status' },
  { name: 'housekeeping.staff_manage', module: 'housekeeping', action: 'MANAGE', description: 'Manage housekeeping staff assignments' },

  // Maintenance
  { name: 'maintenance.view', module: 'maintenance', action: 'VIEW', description: 'View maintenance issues' },
  { name: 'maintenance.manage', module: 'maintenance', action: 'MANAGE', description: 'Create, resolve, and manage maintenance work orders' },

  // Payments & Billing
  { name: 'payments.view', module: 'payments', action: 'VIEW', description: 'View payments and transactions' },
  { name: 'payments.create', module: 'payments', action: 'CREATE', description: 'Collect and record payments' },
  { name: 'payments.refund', module: 'payments', action: 'APPROVE', description: 'Issue refunds to guests' },
  { name: 'payments.discount_approve', module: 'payments', action: 'APPROVE', description: 'Approve discounts on guest folios' },
  { name: 'payments.delete', module: 'payments', action: 'DELETE', description: 'Delete or void financial transaction records' },

  // Invoices
  { name: 'invoices.view', module: 'invoices', action: 'VIEW', description: 'View invoices and folios' },
  { name: 'invoices.create', module: 'invoices', action: 'CREATE', description: 'Generate guest invoices' },
  { name: 'invoices.cancel', module: 'invoices', action: 'CANCEL', description: 'Void or cancel invoices' },

  // Expenses
  { name: 'expenses.view', module: 'expenses', action: 'VIEW', description: 'View hotel expenses' },
  { name: 'expenses.create', module: 'expenses', action: 'CREATE', description: 'Log new operational expenses' },
  { name: 'expenses.edit', module: 'expenses', action: 'EDIT', description: 'Edit expense records' },
  { name: 'expenses.delete', module: 'expenses', action: 'DELETE', description: 'Delete expense records' },
  { name: 'expenses.approve', module: 'expenses', action: 'APPROVE', description: 'Approve pending expense vouchers' },

  // Reports
  { name: 'reports.view', module: 'reports', action: 'VIEW', description: 'View operational reports (occupancy, arrivals/departures)' },
  { name: 'reports.financial', module: 'reports', action: 'VIEW', description: 'View financial, revenue, and expense analytics' },
  { name: 'reports.export', module: 'reports', action: 'EXPORT', description: 'Export reports to CSV/PDF' },

  // Staff Management
  { name: 'staff.view', module: 'staff', action: 'VIEW', description: 'View staff members and activity' },
  { name: 'staff.manage', module: 'staff', action: 'MANAGE', description: 'Manage staff and work schedules' },

  // User & Security Management (Admin only)
  { name: 'users.view', module: 'users', action: 'VIEW', description: 'View system user accounts' },
  { name: 'users.create', module: 'users', action: 'CREATE', description: 'Create user accounts' },
  { name: 'users.edit', module: 'users', action: 'EDIT', description: 'Modify user profiles' },
  { name: 'users.delete', module: 'users', action: 'DELETE', description: 'Delete user accounts' },
  { name: 'users.manage', module: 'users', action: 'MANAGE', description: 'Assign roles, reset access, activate/deactivate users' },

  // Roles & Permissions (Admin only)
  { name: 'roles.view', module: 'roles', action: 'VIEW', description: 'View roles and permission assignments' },
  { name: 'roles.manage', module: 'roles', action: 'MANAGE', description: 'Configure roles and grant/revoke permissions' },
  { name: 'permissions.view', module: 'permissions', action: 'VIEW', description: 'View system permission definitions' },
  { name: 'permissions.manage', module: 'permissions', action: 'MANAGE', description: 'Manage system permissions' },

  // Hotel Settings & Pricing
  { name: 'settings.view', module: 'settings', action: 'VIEW', description: 'View hotel configuration settings' },
  { name: 'settings.manage', module: 'settings', action: 'MANAGE', description: 'Update hotel metadata, taxes, policies, and settings' },
  { name: 'pricing.view', module: 'pricing', action: 'VIEW', description: 'View pricing rules and dynamic rates' },
  { name: 'pricing.manage', module: 'pricing', action: 'MANAGE', description: 'Create and adjust dynamic pricing rules' },

  // Audit Logs
  { name: 'audit_logs.view', module: 'audit_logs', action: 'VIEW', description: 'View system security and audit trail logs' },
];

export const ROLE_DEFAULT_PERMISSIONS = {
  ADMIN: ALL_PERMISSIONS.map(p => p.name),

  MANAGER: [
    'dashboard.view',
    'dashboard.revenue_view',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel_request',
    'reservations.assign_room',
    'reservations.extend_stay',
    'guests.view',
    'guests.create',
    'guests.edit',
    'guests.upload_docs',
    'rooms.view',
    'rooms.manage',
    'room_types.view',
    'checkin.perform',
    'checkout.perform',
    'housekeeping.view',
    'housekeeping.manage',
    'maintenance.view',
    'maintenance.manage',
    'payments.view',
    'payments.create',
    'payments.refund',
    'payments.discount_approve',
    'invoices.view',
    'invoices.create',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'expenses.approve',
    'reports.view',
    'reports.financial',
    'reports.export',
    'staff.view',
    'pricing.view',
    'audit_logs.view',
  ],

  RECEPTIONIST: [
    'dashboard.view',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel_request',
    'reservations.assign_room',
    'reservations.extend_stay',
    'guests.view',
    'guests.create',
    'guests.edit',
    'guests.upload_docs',
    'rooms.view',
    'room_types.view',
    'checkin.perform',
    'checkout.perform',
    'payments.view',
    'payments.create',
    'invoices.view',
    'invoices.create',
    'reports.view',
    'pricing.view',
  ],
};

export function normalizeRoleName(role) {
  if (!role) return 'RECEPTIONIST';
  const clean = String(role).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['ADMIN', 'ADMINISTRATOR', 'SUPERADMIN', 'OWNER'].includes(clean)) return 'ADMIN';
  if (['MANAGER', 'HOTEL_MANAGER', 'HOTELMANAGER', 'OPERATIONS_MANAGER', 'HOUSEKEEPING', 'MAINTENANCE'].includes(clean)) return 'MANAGER';
  return 'RECEPTIONIST';
}

/**
 * Initializes/seeds roles, permissions, and role-permissions in the database.
 */
export async function seedRbacData() {
  try {
    // 1. Seed Permissions
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
        create: {
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
      });
    }

    const allDbPermissions = await prisma.permission.findMany();
    const permMap = new Map(allDbPermissions.map(p => [p.name, p.id]));

    // 2. Seed Roles and RolePermissions
    for (const [roleName, permissions] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: { description: `${roleName} role with default operational permissions` },
        create: {
          name: roleName,
          description: `${roleName} role with default operational permissions`,
        },
      });

      // Sync role permissions
      const validPermIds = permissions.map(p => permMap.get(p)).filter(Boolean);
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: { notIn: validPermIds },
        },
      });

      for (const permId of validPermIds) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }

    // 3. Link existing users to UserRole table if missing
    const users = await prisma.user.findMany({
      include: { userRoles: true },
    });

    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));

    for (const user of users) {
      const canonicalRole = normalizeRoleName(user.role);
      const roleId = roleMap.get(canonicalRole);
      if (roleId && user.userRoles.length === 0) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
          },
        }).catch(() => {});
      }
    }

    console.log('RBAC Permissions, Roles, and Mappings successfully verified/seeded.');
  } catch (err) {
    console.error('Failed to seed RBAC data:', err);
  }
}

/**
 * Returns an array of permission strings granted to the given user.
 */
export async function getUserPermissions(user) {
  if (!user) return [];
  const normalizedRole = normalizeRoleName(user.role);

  // If Admin, grant all permissions
  if (normalizedRole === 'ADMIN') {
    return ALL_PERMISSIONS.map(p => p.name);
  }

  try {
    const roleRecord = await prisma.role.findUnique({
      where: { name: normalizedRole },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (roleRecord && roleRecord.permissions && roleRecord.permissions.length > 0) {
      return roleRecord.permissions.map(rp => rp.permission.name);
    }
  } catch (err) {
    console.warn(`Error reading permissions from DB for role ${normalizedRole}, falling back to defaults:`, err.message);
  }

  return ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [];
}

/**
 * Checks whether user has permission. Admins always have permission.
 */
export function hasPermission(userPermissions, requiredPermission) {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes('*') || userPermissions.includes('admin.all')) return true;
  return userPermissions.includes(requiredPermission);
}

/**
 * Audit log recording helper.
 */
export async function recordAuditLog({ userId, userEmail, userName, action, module, details, ipAddress }) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        userName: userName || null,
        action: String(action || 'UNKNOWN').toUpperCase(),
        module: String(module || 'system').toLowerCase(),
        details: typeof details === 'object' ? JSON.stringify(details) : (details || ''),
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to record audit log:', err.message);
    return null;
  }
}
