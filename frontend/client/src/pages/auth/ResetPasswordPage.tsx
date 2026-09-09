import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const { resetPassword, loading } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from either window.location.search or wouter location
  const token = useMemo(() => {
    const searchString = window.location.search || (location.includes('?') ? location.split('?')[1] : '');
    const params = new URLSearchParams(searchString);
    return params.get('token') || '';
  }, [location]);

  const isTokenMissing = !token.trim();

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password) {
      nextErrors.password = 'New password is required.';
    } else if (!passwordRegex.test(password)) {
      nextErrors.password =
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&).';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm password is required.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);

    if (isTokenMissing) {
      setServerError('Invalid password reset link.');
      return;
    }

    if (!validate()) return;

    try {
      await resetPassword({
        token: token.trim(),
        password,
        confirmPassword,
      });

      setIsSuccess(true);

      // Redirect user to login page after a short delay so they can see the success message
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'This password reset link is invalid or has expired. Please request a new password reset link.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.12),_transparent_35%),linear-gradient(135deg,_#fdfcf7_0%,_#f5efe5_45%,_#eef6f8_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full rounded-[32px] border border-amber-100/80 bg-white/85 p-6 sm:p-10 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f4f2] text-[#2f6c85] shadow-inner">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create a new password for your InnKeeper account.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-emerald-950">Success</h3>
                <p className="mt-2 text-sm text-emerald-800 font-medium">
                  Your password has been reset successfully.
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  Redirecting to login page...
                </p>
                <div className="mt-5">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2f6c85] hover:text-[#24596d]"
                  >
                    Click here if not redirected automatically &rarr;
                  </Link>
                </div>
              </motion.div>
            ) : isTokenMissing ? (
              <motion.div
                key="missing-token-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-rose-200 bg-rose-50/90 p-6 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-rose-950">Invalid Link</h3>
                <p className="mt-2 text-sm text-rose-700">Invalid password reset link.</p>
                <div className="mt-5">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#2f6c85] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#255a6d] shadow-sm"
                  >
                    Request a new password reset link
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form key="reset-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
                {serverError ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-sm text-rose-800"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{serverError}</p>
                        <p className="mt-1 text-xs text-rose-700">
                          <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
                            Request a new password reset link
                          </Link>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      className="pl-10 pr-10 rounded-2xl border-stone-200 bg-white h-11"
                      placeholder="Create new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-red-500 mt-1 leading-normal">{errors.password}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Must be at least 8 characters, with uppercase, lowercase, number, and special character.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      className="pl-10 pr-10 rounded-2xl border-stone-200 bg-white h-11"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword ? (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-[#2f6c85] text-white hover:bg-[#255a6d] h-11 font-semibold transition-all shadow-md hover:shadow-lg mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2f6c85] hover:text-[#24596d]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
