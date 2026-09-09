import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { sendPasswordResetEmail } from '@/lib/email';

const prisma = new PrismaClient();

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address.' }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = forgotPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid email address.';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const { email } = parseResult.data;

    // Search existing user
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate existing unused tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate cryptographically secure token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
          used: false,
        },
      });

      await sendPasswordResetEmail({
        to: user.email,
        token: rawToken,
      });
    }

    // Return generic success to avoid user enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error processing password reset request.',
      },
      { status: 500 }
    );
  }
}
