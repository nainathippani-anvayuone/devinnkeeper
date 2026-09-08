import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, DoorOpen, ArrowLeft } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import PageTransition from '@/components/PageTransition';
import { fadeUp, staggerContainer } from '@/lib/animations';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get('email');
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, []);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!emailRegex.test(email.trim())) nextErrors.email = 'Please enter a valid email address (e.g. username@domain.com).';
    if (!password.trim()) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      await login({ email, password, rememberMe });
      toast.success('Welcome back! Redirecting to your dashboard.');
      setLocation('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Invalid email address or password.');
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#EEE7DD] text-[#3F352D] p-4 sm:p-6 lg:p-8 flex flex-col justify-between selection:bg-[#8B6748] selection:text-white">
      {/* Top Bar Navigation */}
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8B6748] hover:text-[#6F6258] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Introduction Page
        </Link>
      </div>

      <div className="mx-auto flex my-auto w-full max-w-6xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full gap-6 overflow-hidden rounded-[32px] border border-[#E8DED2] bg-[#F8F4EE] p-4 shadow-[0_25px_80px_rgba(63,53,45,0.08)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] lg:p-8"
        >
          {/* Left Decorative Warm Panel */}
          <div className="hidden flex-col justify-between rounded-[24px] bg-gradient-to-br from-[#8B6748] via-[#9a7453] to-[#B89572] p-8 text-[#F8F4EE] lg:flex relative overflow-hidden">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-12 -translate-y-12 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md shadow-lg"
              >
                <DoorOpen className="h-7 w-7 text-[#F8F4EE]" />
              </motion.div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[#E8DED2]">Motel Innkeeper</p>
              <h1 className="text-3xl font-semibold leading-tight font-serif text-white">Premium hospitality operations, secured in one place.</h1>
            </div>
            <div className="relative z-10 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#FAF7F2]">
                <Sparkles className="h-4 w-4 text-[#E8DED2]" />
                Smarter Front Desk Operations
              </div>
              <p className="text-sm text-[#F8F4EE]/90 leading-relaxed">Sign in to manage rooms, check-ins, reservations, and guest communications seamlessly.</p>
            </div>
          </div>

          {/* Right Form Section */}
          <div className="flex items-center justify-center rounded-[24px] border border-[#E8DED2] bg-[#FAF7F2] p-6 shadow-inner sm:p-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md"
            >
              <motion.div variants={fadeUp} className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8DED2] text-[#8B6748] shadow-xs lg:mx-0">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-[#3F352D] font-serif">Welcome back</h2>
                <p className="mt-2 text-sm text-[#6F6258]">Sign in to continue managing your property with comfort and confidence.</p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Role Option */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="role" className="text-[#3F352D] font-semibold">Sign In Role</Label>
                  <Select
                    value={role}
                    onValueChange={(val) => {
                      setRole(val);
                      setErrors({});
                    }}
                  >
                    <SelectTrigger id="role" className="rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] transition-all text-[#3F352D]">
                      <SelectValue placeholder="Choose a Role (Admin, Manager, Staff)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F8F4EE] border border-[#E8DED2] shadow-xl rounded-2xl z-[9999]">
                      <SelectItem value="admin" className="cursor-pointer font-medium text-[#3F352D]">Admin</SelectItem>
                      <SelectItem value="manager" className="cursor-pointer font-medium text-[#3F352D]">Manager</SelectItem>
                      <SelectItem value="receptionist" className="cursor-pointer font-medium text-[#3F352D]">Receptionist / Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Email Field */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="email" className="text-[#3F352D] font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6258]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@innkeeper.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                      className="pl-10 rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] transition-all text-[#3F352D]"
                      autoComplete="off"
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    {errors.email ? (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium text-red-600">
                        {errors.email}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </motion.div>

                {/* Password Field */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="password" className="text-[#3F352D] font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6258]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                      className="pl-10 pr-10 rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] transition-all text-[#3F352D]"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F6258] hover:text-[#3F352D]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <AnimatePresence mode="wait">
                    {errors.password ? (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium text-red-600">
                        {errors.password}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={fadeUp} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-[#6F6258] cursor-pointer">
                    <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
                    <span>Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-[#8B6748] hover:underline">
                    Forgot Password?
                  </Link>
                </motion.div>

                <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" className="w-full rounded-2xl bg-[#8B6748] text-[#F8F4EE] hover:bg-[#755539] py-5 font-bold shadow-lg shadow-[#8B6748]/20 cursor-pointer" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </motion.div>
              </form>

              <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-[#6F6258]">
                New here? <Link href="/register" className="font-bold text-[#8B6748] hover:underline">Create an account</Link>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="py-2 text-center text-xs text-[#6F6258]">
        © Motel Innkeeper PMS. All rights reserved.
      </div>
    </PageTransition>
  );
}
