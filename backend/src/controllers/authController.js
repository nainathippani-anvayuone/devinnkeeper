import { prisma } from '../utils/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailNotifier.js';
import { getUserPermissions, recordAuditLog, normalizeRoleName } from '../services/rbacService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'innkeeper-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

const COOKIE_NAME = 'innkeeper_session';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  secure: process.env.NODE_ENV === 'production',
};

const resetTokens = new Map();

export function normalizeRole(role) {
  return normalizeRoleName(role).toLowerCase();
}

async function normalizeUser(user) {
  if (!user) return null;
  const permissions = await getUserPermissions(user);

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    permissions,
    createdAt: user.created_at ?? user.createdAt,
    updatedAt: user.updated_at ?? user.updatedAt,
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: normalizeRole(user.role) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function signup(req, res) {
  try {
    const { name, phone, password, confirmPassword, role } = req.body;
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const assignedRole = normalizeRole(role || 'receptionist');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashed,
        role: assignedRole,
      },
    });

    // Link user role
    const roleRecord = await prisma.role.findUnique({ where: { name: normalizeRoleName(assignedRole) } });
    if (roleRecord) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: roleRecord.id },
      }).catch(() => {});
    }

    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

    const normalized = await normalizeUser(user);
    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: normalized,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during signup.' });
  }
}

export async function login(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

    const normalized = await normalizeUser(user);

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: 'LOGIN',
      module: 'auth',
      details: `User logged in with role ${normalized.role}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: normalized,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: err?.message || 'Internal server error during login.',
    });
  }
}

export async function me(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token && req.cookies?.[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: Number(payload.id) } });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const normalized = await normalizeUser(user);
    return res.status(200).json({
      user: normalized,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  return res.status(200).json({ message: 'Logged out successfully.' });
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address. Please register an account first.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    resetTokens.set(resetToken, { userId: user.id, email: user.email, expiresAt: Date.now() + 3600_000 });

    const emailResult = await sendPasswordResetEmail({ toEmail: user.email, resetToken });

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send password reset email. Please try again later.' });
    }

    return res.status(200).json({
      message: `Password reset link sent to ${user.email}! Please check your inbox.`,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, token, password, confirmPassword } = req.body;
    if (!password) return res.status(400).json({ error: 'New password is required.' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    let userIdToUpdate = null;

    if (token && resetTokens.has(token)) {
      const record = resetTokens.get(token);
      if (record && record.expiresAt >= Date.now()) {
        userIdToUpdate = record.userId;
        resetTokens.delete(token);
      } else {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }
    } else if (email) {
      const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!user) {
        return res.status(404).json({ error: 'No account found with this email address.' });
      }
      userIdToUpdate = user.id;
    } else {
      return res.status(400).json({ error: 'Invalid reset request. Missing token or email.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: userIdToUpdate }, data: { password: hashed } });

    return res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// ─── Staff / User Management (Admin & Manager) ──────────────

export async function listStaff(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { id: 'asc' },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: normalizeRole(u.role),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return res.json(sanitized);
  } catch (err) {
    console.error('listStaff error:', err);
    return res.status(500).json({ error: 'Failed to retrieve staff list.' });
  }
}

export async function createStaff(req, res) {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A staff member with this email already exists.' });
    }

    const assignedRole = normalizeRole(role || 'receptionist');

    // Security check: only ADMIN can create ADMIN accounts
    const callerRole = normalizeRoleName(req.user?.role);
    if (normalizeRoleName(assignedRole) === 'ADMIN' && callerRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    const hashed = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone || null,
        password: hashed,
        role: assignedRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      },
    });

    // Link user role
    const roleRecord = await prisma.role.findUnique({ where: { name: normalizeRoleName(assignedRole) } });
    if (roleRecord) {
      await prisma.userRole.create({
        data: { userId: newUser.id, roleId: roleRecord.id },
      }).catch(() => {});
    }

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'users',
      details: `Created new user ${newUser.email} with role ${assignedRole}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      ...newUser,
      role: normalizeRole(newUser.role),
    });
  } catch (err) {
    console.error('createStaff error:', err);
    return res.status(500).json({ error: 'Failed to create staff member.' });
  }
}

export async function updateStaff(req, res) {
  try {
    const staffId = Number(req.params.id);
    const { name, email, phone, role, password } = req.body;

    // Security requirement: Never allow users to modify their own role
    if (role && req.user && Number(req.user.id) === staffId) {
      return res.status(400).json({
        success: false,
        message: 'Security policy violation: Users cannot modify their own role',
      });
    }

    const callerRole = normalizeRoleName(req.user?.role);
    if (role) {
      // Only ADMIN can change roles or assign ADMIN role
      if (callerRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
        });
      }
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = String(name).trim();
    if (email) dataToUpdate.email = String(email).trim().toLowerCase();
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (role) dataToUpdate.role = normalizeRole(role);
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (role) {
      const roleRecord = await prisma.role.findUnique({ where: { name: normalizeRoleName(role) } });
      if (roleRecord) {
        await prisma.userRole.deleteMany({ where: { userId: staffId } });
        await prisma.userRole.create({ data: { userId: staffId, roleId: roleRecord.id } });
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'EDIT',
      module: 'users',
      details: `Updated user profile/role for ${updated.email} (ID: ${updated.id})`,
      ipAddress: req.ip,
    });

    return res.json({
      ...updated,
      role: normalizeRole(updated.role),
    });
  } catch (err) {
    console.error('updateStaff error:', err);
    return res.status(500).json({ error: 'Failed to update staff member.' });
  }
}

export async function deleteStaff(req, res) {
  try {
    const staffId = Number(req.params.id);
    if (req.user && Number(req.user.id) === staffId) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: staffId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    await prisma.user.delete({ where: { id: staffId } });

    await recordAuditLog({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      action: 'DELETE',
      module: 'users',
      details: `Deleted user ${targetUser.email} (ID: ${staffId})`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Staff member deleted.' });
  } catch (err) {
    console.error('deleteStaff error:', err);
    return res.status(500).json({ error: 'Failed to delete staff member.' });
  }
}
