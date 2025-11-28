'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, ChevronLeft, CheckCircle, AlertCircle, KeyRound
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Smooth easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);

  // Get email from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Focus code input on mount
  useEffect(() => {
    if (email) {
      codeRef.current?.focus();
    }
  }, [email]);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!code.trim()) {
      setError('Reset code is required');
      return false;
    }
    if (code.length !== 6) {
      setError('Reset code must be 6 digits');
      return false;
    }
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await api.auth.passwordResetConfirm({
        email: email.toLowerCase().trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <SiteNav />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="w-full max-w-md py-8"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/allarco-logo.png"
              alt="All'Arco Apartment"
              width={150}
              height={55}
              className="object-contain"
            />
          </div>

          {!success ? (
            <>
              {/* Form Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#C4A572]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-[#C4A572]" />
                </div>
                <h2 className="text-3xl font-light text-white mb-2">
                  Create New Password
                </h2>
                <p className="text-gray-500">
                  Enter your reset code and create a new password
                </p>
              </div>

              {/* Reset Password Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Reset Code Field */}
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-400 mb-2">
                    6-Digit Reset Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      ref={codeRef}
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoComplete="one-time-code"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">
                    Check your email for the 6-digit code
                  </p>
                </div>

                {/* New Password Field */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Back Links */}
                <div className="flex items-center justify-between pt-2 text-sm">
                  <Link
                    href="/auth/forgot-password"
                    className="text-gray-500 hover:text-[#C4A572] transition-colors"
                  >
                    Request new code
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-[#C4A572] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mb-6">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-light text-white mb-3">
                  Password Reset Successfully
                </h2>
                <p className="text-gray-400 leading-relaxed">
                  Your password has been changed. You can now log in with your new password.
                </p>
              </div>

              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 w-full py-4 bg-[#C4A572] text-white rounded-xl font-semibold hover:bg-[#B39562] transition-colors shadow-lg shadow-[#C4A572]/20"
              >
                Continue to Login
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
