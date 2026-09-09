import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'Reset token is required.' })
      .trim()
      .min(1, { message: 'Reset token is required.' }),
    password: z
      .string({ required_error: 'New password is required.' })
      .min(8, { message: 'Password must be at least 8 characters long.' })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
          message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        }
      ),
    confirmPassword: z.string({ required_error: 'Please confirm your password.' }),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid input.';
      return NextResponse.json({ success: false, error: errorMsg, message: errorMsg }, { status: 400 });
    }

    const { token, password } = parseResult.data;

    // Hash token with SHA-256 for lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    const now = new Date();
    if (!resetRecord || !resetRecord.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'This password reset link is invalid or has expired.',
          message: 'This password reset link is invalid or has expired.',
        },
        { status: 400 }
      );
    }

    if (resetRecord.used || new Date(resetRecord.expiresAt) < now) {
      return NextResponse.json(
        {
          success: false,
          error: 'This password reset link is invalid or has expired. Please request a new one.',
          message: 'This password reset link is invalid or has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Hash password with same bcrypt algorithm
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password in PostgreSQL
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    // Invalidate any other tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetRecord.userId,
        id: { not: resetRecord.id },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successfully.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Reset password API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during password reset.',
      },
      { status: 500 }
    );
  }
}
