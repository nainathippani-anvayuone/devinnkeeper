'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Something went wrong.');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 35%), linear-gradient(135deg, #fdfcf7 0%, #f5efe5 45%, #eef6f8 100%)', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(255,255,255,0.9)', borderRadius: '24px', padding: '36px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', textAlign: 'center' }}>Forgot Password?</h1>
        <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', margin: '0 0 24px 0' }}>
          Enter your registered email address and we will send you a password reset link.
        </p>

        {submitted ? (
          <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '14px', lineHeight: '1.5' }}>
            If an account exists for this email, a password reset link has been sent. Please check your email.
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#2f6c85', fontWeight: '600', textDecoration: 'none' }}>
                &larr; Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@innkeeper.com"
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#2f6c85', color: '#fff', fontSize: '15px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#2f6c85', fontSize: '14px', textDecoration: 'none' }}>
                &larr; Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
