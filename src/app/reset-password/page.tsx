'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token.trim()) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', color: '#991b1b', marginBottom: '8px' }}>Invalid password reset link</h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          This link is invalid or incomplete. Please request a new password reset link.
        </p>
        <Link href="/forgot-password" style={{ color: '#2f6c85', fontWeight: 'bold', textDecoration: 'none' }}>
          Request a new link &rarr;
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'This password reset link is invalid or has expired.');
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'This password reset link is invalid or has expired. Please request a new password reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '16px', background: '#ecfdf5', borderRadius: '12px', color: '#065f46' }}>
        <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Success</h3>
        <p style={{ margin: 0, fontSize: '14px' }}>Your password has been reset successfully. Redirecting to login...</p>
        <div style={{ marginTop: '16px' }}>
          <Link href="/login" style={{ color: '#2f6c85', fontSize: '13px' }}>Click here to login now</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>New Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#2f6c85', color: '#fff', fontSize: '15px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Resetting Password...' : 'Reset Password'}
      </button>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/login" style={{ color: '#2f6c85', fontSize: '14px', textDecoration: 'none' }}>
          &larr; Back to Login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 35%), linear-gradient(135deg, #fdfcf7 0%, #f5efe5 45%, #eef6f8 100%)', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(255,255,255,0.9)', borderRadius: '24px', padding: '36px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', textAlign: 'center' }}>Reset Password</h1>
        <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', margin: '0 0 24px 0' }}>
          Choose a new password for your InnKeeper account.
        </p>
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
