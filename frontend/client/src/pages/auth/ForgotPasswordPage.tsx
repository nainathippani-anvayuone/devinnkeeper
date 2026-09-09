import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = () => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return false;
    }
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address (e.g. username@domain.com).');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setErrorMessage(null);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Unable to process your request right now. Please try again.';
      setErrorMessage(msg);
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
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Forgot Password?</h1>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Enter your registered email address and we will send you a password reset link.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success-box"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-800 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-900 text-sm">Check your email</h3>
                    <p className="mt-1 text-sm text-emerald-700 leading-relaxed">
                      If an account exists for this email, a password reset link has been sent. Please check your email.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-emerald-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                  >
                    Resend or use another email
                  </button>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2f6c85] hover:text-[#24596d]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form key="reset-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@innkeeper.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="pl-10 rounded-2xl border-stone-200 bg-white h-11"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errorMessage ? (
                    <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-[#2f6c85] text-white hover:bg-[#255a6d] h-11 font-semibold transition-all shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
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
