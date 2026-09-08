import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Mail, Phone, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import PageTransition from '@/components/PageTransition';
import { fadeUp, staggerContainer } from '@/lib/animations';

const roleOptions = ['Admin', 'Manager', 'Receptionist'];

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  digitsLength: number;
  regex: RegExp;
  placeholder: string;
  errorMessage: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    dialCode: '+91',
    digitsLength: 10,
    regex: /^[6-9][0-9]{9}$/,
    placeholder: '9876543210',
    errorMessage: 'Phone number must be a valid 10-digit number'
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    dialCode: '+1',
    digitsLength: 10,
    regex: /^[2-9][0-9]{9}$/,
    placeholder: '2025550143',
    errorMessage: 'Phone number must be a valid 10-digit number'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    dialCode: '+44',
    digitsLength: 10,
    regex: /^[0-9]{10}$/,
    placeholder: '7911123456',
    errorMessage: 'Phone number must be a valid 10-digit  number.'
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    dialCode: '+1',
    digitsLength: 10,
    regex: /^[2-9][0-9]{9}$/,
    placeholder: '4165550123',
    errorMessage: 'Phone number must be a valid 10-digit  number.'
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    dialCode: '+61',
    digitsLength: 9,
    regex: /^[0-9]{9}$/,
    placeholder: '412345678',
    errorMessage: 'Phone number must be a valid 9-digit number.'
  },
  {
    code: 'AE',
    name: 'UAE',
    flag: '🇦🇪',
    dialCode: '+971',
    digitsLength: 9,
    regex: /^[0-9]{9}$/,
    placeholder: '501234567',
    errorMessage: 'Phone number must be a valid 9-digit number.'
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    dialCode: '+65',
    digitsLength: 8,
    regex: /^[89][0-9]{7}$/,
    placeholder: '81234567',
    errorMessage: 'Phone number must be a valid 8-digit number'
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    dialCode: '+49',
    digitsLength: 11,
    regex: /^[0-9]{10,11}$/,
    placeholder: '15123456789',
    errorMessage: 'Phone number must be a valid 10 or 11-digit number.'
  }
];

export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const EMAIL_ERROR_MSG = "Please enter a valid email address (e.g. username@domain.com).";
export const PASSWORD_ERROR_MSG = "Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, one number, and one special character.";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { signup, logout, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'Receptionist' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string, currentForm = form, country = selectedCountry) => {
    let error = '';
    if (name === 'name') {
      if (!value.trim()) error = 'Full name is required.';
      else if (!/^[a-zA-Z\s]{2,}$/.test(value.trim())) error = 'Full name must contain only letters and spaces.';
    } else if (name === 'email') {
      if (!value.trim()) error = 'Email is required.';
      else if (!EMAIL_REGEX.test(value.trim())) error = EMAIL_ERROR_MSG;
    } else if (name === 'phone') {
      const trimmedPhone = value.trim();
      if (!trimmedPhone) {
        error = 'Phone number is required.';
      } else {
        const cleanDigits = trimmedPhone.startsWith(country.dialCode)
          ? trimmedPhone.slice(country.dialCode.length).trim().replace(/\D/g, '')
          : trimmedPhone.replace(/\D/g, '');

        if (!country.regex.test(cleanDigits)) {
          error = country.errorMessage;
        }
      }
    } else if (name === 'password') {
      if (!value) error = 'Password is required.';
      else if (!PASSWORD_REGEX.test(value)) {
        error = PASSWORD_ERROR_MSG;
      }
    } else if (name === 'confirmPassword') {
      if (!value) error = 'Please confirm your password.';
      else if (value !== currentForm.password) error = 'Passwords do not match.';
    }
    return error;
  };

  const validate = (country = selectedCountry) => {
    const nextErrors: Record<string, string> = {};
    const nameErr = validateField('name', form.name, form, country);
    if (nameErr) nextErrors.name = nameErr;

    const emailErr = validateField('email', form.email, form, country);
    if (emailErr) nextErrors.email = emailErr;

    const phoneErr = validateField('phone', form.phone, form, country);
    if (phoneErr) nextErrors.phone = phoneErr;

    const pwdErr = validateField('password', form.password, form, country);
    if (pwdErr) nextErrors.password = pwdErr;

    const confirmErr = validateField('confirmPassword', form.confirmPassword, form, country);
    if (confirmErr) nextErrors.confirmPassword = confirmErr;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);

    if (touched[field]) {
      const err = validateField(field, value, updatedForm);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }

    if (field === 'password' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', updatedForm.confirmPassword, updatedForm);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const newCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
    setSelectedCountry(newCountry);
    if (touched.phone) {
      const err = validateField('phone', form.phone, form, newCountry);
      setErrors((prev) => ({ ...prev, phone: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field as keyof typeof form]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });
    if (!validate()) return;
    try {
      const fullPhone = `${selectedCountry.dialCode} ${form.phone.trim()}`;
      await signup({ ...form, phone: fullPhone, role: form.role.toLowerCase() });
      if (logout) {
        await logout();
      }
      toast.success('Account created successfully! Please sign in with your credentials.');
      setLocation(`/login?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Signup failed.';
      toast.error(msg);
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
          className="grid w-full gap-6 overflow-hidden rounded-[32px] border border-[#E8DED2] bg-[#F8F4EE] p-4 shadow-[0_25px_80px_rgba(63,53,45,0.08)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr] lg:p-8"
        >
          {/* Left Decorative Section */}
          <div className="flex flex-col justify-between rounded-[24px] bg-gradient-to-br from-[#8B6748] via-[#9a7453] to-[#B89572] p-8 text-[#F8F4EE] relative overflow-hidden">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-12 -translate-y-12 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md shadow-lg"
              >
                <ShieldCheck className="h-7 w-7 text-[#F8F4EE]" />
              </motion.div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[#E8DED2]">Create Account</p>
              <h1 className="text-3xl font-semibold leading-tight font-serif text-white">Open secure access for your team in minutes.</h1>
            </div>
            <div className="relative z-10 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#FAF7F2]">
                <Sparkles className="h-4 w-4 text-[#E8DED2]" />
                Elegant Access Control
              </div>
              <p className="text-sm text-[#F8F4EE]/90 leading-relaxed">Set role-based permissions for admins, managers, and receptionists while keeping the front desk experience premium.</p>
            </div>
          </div>

          {/* Right Form Section */}
          <div className="rounded-[24px] border border-[#E8DED2] bg-[#FAF7F2] p-6 shadow-inner sm:p-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md mx-auto"
            >
              <motion.div variants={fadeUp} className="mb-6 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8DED2] text-[#8B6748] lg:mx-0">
                  <UserRound className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-[#3F352D] font-serif">Join Motel Innkeeper</h2>
                <p className="mt-2 text-sm text-[#6F6258]">Create a polished account for your hospitality team.</p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="name" className="text-[#3F352D] font-semibold">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Taylor Brooks"
                    className="rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] text-[#3F352D]"
                    autoComplete="off"
                  />
                  {errors.name ? <p className="text-xs font-medium text-red-600">{errors.name}</p> : null}
                </motion.div>

                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="email" className="text-[#3F352D] font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6258]" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className="pl-10 rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] text-[#3F352D]"
                      placeholder="you@innkeeper.com"
                      autoComplete="off"
                    />
                  </div>
                  {errors.email ? <p className="text-xs font-medium text-red-600">{errors.email}</p> : null}
                </motion.div>

                {/* Phone Number with Country Code Dropdown */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="phone" className="text-[#3F352D] font-semibold">Phone Number</Label>
                  <div className="flex rounded-2xl border border-[#E8DED2] overflow-hidden bg-[#F8F4EE] focus-within:ring-2 focus-within:ring-[#8B6748]/20 focus-within:border-[#8B6748]">
                    <select
                      value={selectedCountry.code}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="h-10 border-r border-[#E8DED2] bg-[#E8DED2]/50 px-2.5 py-2 text-xs font-semibold outline-none text-[#3F352D] cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.dialCode} ({c.name})
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <Input
                        id="phone"
                        type="tel"
                        maxLength={selectedCountry.digitsLength + 2}
                        value={form.phone}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.digitsLength);
                          handleChange('phone', raw);
                        }}
                        onBlur={() => handleBlur('phone')}
                        className="h-10 border-0 rounded-l-none pl-3 shadow-none focus-visible:ring-0 text-[#3F352D]"
                        placeholder={`e.g. ${selectedCountry.placeholder}`}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  {errors.phone ? <p className="text-xs font-medium text-red-600">{errors.phone}</p> : null}
                </motion.div>

                <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#3F352D] font-semibold">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="Create password"
                        className="rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] text-[#3F352D]"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F6258] hover:text-[#3F352D]">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password ? <p className="text-xs font-medium text-red-600">{errors.password}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[#3F352D] font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="Confirm password"
                        className="rounded-2xl border-[#E8DED2] bg-[#F8F4EE] focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] text-[#3F352D]"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F6258] hover:text-[#3F352D]">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword ? <p className="text-xs font-medium text-red-600">{errors.confirmPassword}</p> : null}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="space-y-2">
                  <Label htmlFor="role" className="text-[#3F352D] font-semibold">Role</Label>
                  <select id="role" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className="flex h-10 w-full rounded-2xl border border-[#E8DED2] bg-[#F8F4EE] px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-[#8B6748]/20 focus:border-[#8B6748] text-[#3F352D]">
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </motion.div>

                <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" className="w-full rounded-2xl bg-[#8B6748] text-[#F8F4EE] hover:bg-[#755539] py-5 font-bold shadow-lg shadow-[#8B6748]/20 cursor-pointer" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : <>Create Account <Check className="ml-2 h-4 w-4" /></>}
                  </Button>
                </motion.div>
              </form>

              <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-[#6F6258]">
                Already have an account? <Link href="/login" className="font-bold text-[#8B6748] hover:underline">Login</Link>
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
