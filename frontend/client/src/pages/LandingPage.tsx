import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Bed,
  Sparkles,
  ConciergeBell,
  CalendarCheck,
  KeyRound,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/PageTransition";
import { cardHover, buttonHover } from "@/lib/animations";
import introBg from "@/assets/intro_bg.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleLoginClick = () => {
    setLocation("/login");
  };

  return (
    <PageTransition className="relative min-h-screen w-full bg-[#EEE7DD] text-[#3F352D] font-sans overflow-x-hidden selection:bg-[#8B6748] selection:text-white">
      {/* 1. User-Provided Background Image with Cover, Center, No-Repeat */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${introBg})` }}
        />

        {/* 2. Soft & Subtle Overlay for Optimal Readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#F3EDE4]/40 via-[#EEE7DD]/50 to-[#E8DED2]/60 backdrop-blur-[0.5px]"
        />
      </div>

      {/* Header Navigation Bar (Top-Right Buttons Removed as Requested) */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B89572]/40 bg-[#8B6748] text-[#F8F4EE] shadow-md shadow-[#8B6748]/20">
            <ConciergeBell className="h-6 w-6 text-[#E8DED2]" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-[#3F352D] font-serif">
              Motel Innkeeper
            </span>
            <span className="block text-[10px] uppercase tracking-[0.28em] text-[#8B6748] font-bold">
              Comfort • Stay • Relax
            </span>
          </div>
        </motion.div>

        {/* Top-Right Area Intentionally Kept Clean & Button-Free as Requested */}
        <div className="hidden sm:block text-xs font-semibold uppercase tracking-widest text-[#6F6258]/70">
          Property Management System
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl flex-col items-center justify-center px-6 py-10 text-center sm:px-8">
        {/* Entrance Sequence: Logo -> Title -> Description -> Buttons */}
        <div className="flex max-w-4xl flex-col items-center">

          {/* Logo with Smooth Fade & Scale Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#B89572]/40 bg-[#F8F4EE] p-4 shadow-xl shadow-[#3F352D]/05 backdrop-blur-md"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#E8DED2] via-[#FAF7F2] to-transparent blur-xs" />
            <Bed className="relative h-10 w-10 text-[#8B6748]" />
          </motion.div>

          {/* Application Name Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#B89572]/30 bg-[#FAF7F2] px-5 py-1.5 shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-[#8B6748]" />
            <span className="text-xs font-bold tracking-wider uppercase text-[#8B6748]">
              Motel Innkeeper Property Management System
            </span>
          </motion.div>

          {/* Main Welcome Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55 }}
            className="mb-6 font-serif text-4xl font-extrabold tracking-tight text-[#3F352D] sm:text-6xl lg:text-7xl leading-tight"
          >
            Welcome to Motel Innkeeper
          </motion.h1>

          {/* Short Description */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.7 }}
            className="mb-10 max-w-2xl text-lg sm:text-xl font-medium leading-relaxed text-[#6F6258]"
          >
            Manage your motel efficiently and provide a better experience for every guest.
          </motion.p>

          {/* Main Central Action Buttons ONLY */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.85 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
          >
            {/* 1. Login Button (For Existing Users -> Opens /login) */}
            <motion.div
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              className="w-full sm:w-auto"
            >
              <Button
                onClick={handleLoginClick}
                className="w-full sm:w-auto rounded-full bg-[#8B6748] px-9 py-6 text-base font-bold text-[#F8F4EE] shadow-xl shadow-[#8B6748]/25 hover:bg-[#755539] transition-all cursor-pointer"
              >
                <UserCheck className="mr-2.5 h-5 w-5 text-[#E8DED2]" />
                Login
              </Button>
            </motion.div>

          </motion.div>
        </div>

        {/* Warm Hospitality Feature Highlights Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 1.0 }}
          className="mt-16 grid w-full grid-cols-1 gap-5 text-left sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Card 1 */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="group rounded-3xl border border-[#E8DED2] bg-[#F8F4EE] p-6 shadow-[0_15px_40px_rgba(63,53,45,0.05)] transition-all hover:border-[#8B6748]/40 hover:bg-[#FAF7F2]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B89572]/30 bg-[#E8DED2] text-[#8B6748]">
              <ConciergeBell className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#3F352D] font-serif">Front Desk Control</h3>
            <p className="text-sm text-[#6F6258] leading-relaxed font-normal">
              Express check-ins, guest verification, and real-time room status tracking.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="group rounded-3xl border border-[#E8DED2] bg-[#F8F4EE] p-6 shadow-[0_15px_40px_rgba(63,53,45,0.05)] transition-all hover:border-[#8B6748]/40 hover:bg-[#FAF7F2]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B89572]/30 bg-[#E8DED2] text-[#8B6748]">
              <Bed className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#3F352D] font-serif">Housekeeping</h3>
            <p className="text-sm text-[#6F6258] leading-relaxed font-normal">
              Manage room cleaning, maintenance requests, and turn-down schedules instantly.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="group rounded-3xl border border-[#E8DED2] bg-[#F8F4EE] p-6 shadow-[0_15px_40px_rgba(63,53,45,0.05)] transition-all hover:border-[#8B6748]/40 hover:bg-[#FAF7F2]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B89572]/30 bg-[#E8DED2] text-[#8B6748]">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#3F352D] font-serif">Tape Chart & Ledger</h3>
            <p className="text-sm text-[#6F6258] leading-relaxed font-normal">
              Visual reservation calendar, shift audits, and cash drawer management.
            </p>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="group rounded-3xl border border-[#E8DED2] bg-[#F8F4EE] p-6 shadow-[0_15px_40px_rgba(63,53,45,0.05)] transition-all hover:border-[#8B6748]/40 hover:bg-[#FAF7F2]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B89572]/30 bg-[#E8DED2] text-[#8B6748]">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#3F352D] font-serif">Digital Access</h3>
            <p className="text-sm text-[#6F6258] leading-relaxed font-normal">
              Smart room keys, automated guest SMS notifications, and secure access.
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Warm Footer */}
      <footer className="relative z-10 border-t border-[#E8DED2] bg-[#F8F4EE]/80 px-6 py-4 text-center text-xs text-[#6F6258] backdrop-blur-md">
        © {new Date().getFullYear()} Motel Innkeeper. All rights reserved. Premium Hospitality Operations.
      </footer>
    </PageTransition>
  );
}
