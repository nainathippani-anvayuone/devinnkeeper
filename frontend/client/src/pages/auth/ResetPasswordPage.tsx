import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const { resetPassword, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const params = useMemo(() => new URLSearchParams(location.split('?')[1] ?? ''), [location]);

  useMemo(() => {
    const email = params.get('email') ?? '';
    if (email) {
      setForm((prev) => ({ ...prev, email }));
    }
  }, [params]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!emailRegex.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address (e.g. username@domain.com).';

    if (!form.password) nextErrors.password = 'Password is required.';
    else if (!passwordRegex.test(form.password)) {
      nextErrors.password = 'Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, one number, and one special character.';
    }

    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateStoredUserPassword = (emailAddress: string, newPass: string) => {
    try {
      const raw = localStorage.getItem('innkeeper_users');
      let users = raw ? JSON.parse(raw) : [];
      const normalizedEmail = emailAddress.trim().toLowerCase();
      const index = users.findIndex((u: any) => u.email.toLowerCase() === normalizedEmail);

      if (index !== -1) {
        users[index].password = newPass;
      } else {
        users.push({
          fullName: 'User',
          email: normalizedEmail,
          password: newPass,
          phone: '9876543210'
        });
      }

      localStorage.setItem('innkeeper_users', JSON.stringify(users));
    } catch (err) {
      console.error('Failed to update local user password', err);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const token = params.get('token') || '';
    try {
      await resetPassword({ email: form.email.trim(), token, password: form.password, confirmPassword: form.confirmPassword });
      toast.success('Password reset successfully! Please log in.');
      setLocation(`/login?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(184,149,114,0.12),_transparent_35%),linear-gradient(135deg,_#fdfcf7_0%,_#f5efe5_45%,_#eef6f8_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full rounded-[32px] border border-amber-100/80 bg-white/85 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B6748]/10 text-[#8B6748]">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-900">Reset your password</h2>
            <p className="mt-2 text-sm text-slate-600">Set a fresh password for your InnKeeper account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@innkeeper.com"
                autoComplete="off"
              />
              {errors.email ? <p className="text-sm text-red-500">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Create new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? <p className="text-sm text-red-500">{errors.password}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword ? <p className="text-sm text-red-500">{errors.confirmPassword}</p> : null}
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-[#2f6c85] text-white hover:bg-[#255a6d]" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Reset Password'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
