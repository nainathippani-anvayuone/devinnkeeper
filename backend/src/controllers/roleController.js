import { prisma } from '../utils/db.js';
import { recordAuditLog, ALL_PERMISSIONS } from '../services/rbacService.js';

export async function getRoles(req, res) {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { id: 'asc' },
    });

    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      userCount: r._count.users,
      permissions: r.permissions.map(rp => rp.permission.name),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve roles' });
  }
}

export async function getPermissions(req, res) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve permissions' });
  }
}

export async function updateRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // array of permission names

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array of strings' });
    }

    const role = await prisma.role.findUnique({ where: { id: parseInt(id) } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Admins cannot have their role stripped of essential management
    if (role.name === 'ADMIN' && (!permissions.includes('roles.manage') || !permissions.includes('users.manage'))) {
      return res.status(400).json({ success: false, message: 'Cannot remove administrative permissions from ADMIN role' });
    }

    // Fetch matching permission IDs
    const matchingPerms = await prisma.permission.findMany({
      where: { name: { in: permissions } },
    });

    // Replace RolePermission entries
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: matchingPerms.map(p => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      }),
    ]);

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'EDIT',
      module: 'roles',
      details: `Updated permissions for role ${role.name} (${permissions.length} permissions assigned)`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Permissions for role ${role.name} updated successfully`,
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to update role permissions' });
  }
}

export async function assignUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role: newRoleName } = req.body;

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Security requirement: Prevent user from modifying their own role
    if (req.user && req.user.id === user.id) {
      return res.status(400).json({
        success: false,
        message: 'Security policy violation: Users cannot modify their own role',
      });
    }

    const cleanRoleName = String(newRoleName).trim().toUpperCase();
    const roleRecord = await prisma.role.findUnique({ where: { name: cleanRoleName } });
    if (!roleRecord) {
      return res.status(400).json({ success: false, message: `Invalid role: ${newRoleName}` });
    }

    // Update user role and UserRole mapping
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { role: cleanRoleName.toLowerCase() },
      }),
      prisma.userRole.deleteMany({ where: { userId: user.id } }),
      prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roleRecord.id,
        },
      }),
    ]);

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'EDIT',
      module: 'users',
      details: `Assigned role ${cleanRoleName} to user ${user.email} (ID: ${user.id})`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `User ${user.email} role changed to ${cleanRoleName}`,
      data: { id: user.id, email: user.email, role: cleanRoleName.toLowerCase() },
    });
  } catch (error) {
    console.error('Error assigning user role:', error);
    res.status(500).json({ success: false, message: 'Failed to assign role to user' });
  }
}
