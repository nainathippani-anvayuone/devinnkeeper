import { motion } from 'framer-motion';
import { Loader2, Mail, RotateCcw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { forgotPassword, loading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address (e.g. username@domain.com).');
      return;
    }
    try {
      void forgotPassword(email.trim());
    } catch (e) {
      // Ignore background dispatch errors
    }
    toast.success('Proceeding to reset password page...');
    setLocation(`/reset-password?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(184,149,114,0.12),_transparent_35%),linear-gradient(135deg,_#fdfcf7_0%,_#f5efe5_45%,_#eef6f8_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full rounded-[32px] border border-amber-100/80 bg-white/85 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B6748]/10 text-[#8B6748]">
              <RotateCcw className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-900">Forgot your password?</h2>
            <p className="mt-2 text-sm text-slate-600">Enter your email and we will guide you through a secure reset.</p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              If the email exists, reset instructions were sent. You can also continue to the login screen.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@innkeeper.com" />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-2xl bg-[#2f6c85] text-white hover:bg-[#255a6d]" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Remembered it? <Link href="/login" className="font-semibold text-[#2f6c85]">Back to login</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
