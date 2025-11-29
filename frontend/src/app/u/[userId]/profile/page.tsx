'use client';

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Lock,
  Bell,
  Globe as GlobeIcon,
  Check,
  AlertCircle,
  ChevronLeft,
  Cake
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import { useRouter, useParams } from 'next/navigation';
import { generateUserId, verifyUserId } from '@/lib/userId';

// Quantum-optimized easing
const smoothEase = [0.16, 1, 0.3, 1] as const;

// Zod validation schema
const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(50),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Memoized components for quantum performance
const InfoField = memo(({ icon: Icon, label, value }: any) => (
  <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#C4A572]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">{label}</p>
      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{value}</p>
    </div>
  </div>
));
InfoField.displayName = 'InfoField';

export default function ProfileSettingsPage() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security: Verify userId in URL matches logged-in user
  const urlUserId = params.userId as string;
  const isAuthorized = useMemo(() => {
    return verifyUserId(urlUserId, user);
  }, [urlUserId, user]);

  // React Hook Form with Zod validation
  const { register, handleSubmit, formState: { errors, dirtyFields, isSubmitted }, reset, setFocus } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onSubmit', // Only validate on submit, prevents errors while typing
    reValidateMode: 'onChange', // Re-validate on change after first submit attempt
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      country: '',
    },
  });

  // Generate userId for display
  const userId = useMemo(() => generateUserId(user), [user]);

  // Memoized user display data
  const userStats = useMemo(() => ({
    fullName: `${user?.first_name} ${user?.last_name}`,
    initials: `${user?.first_name?.[0]}${user?.last_name?.[0]}`,
    roleLabel: user?.is_super_admin || user?.is_team_member
      ? (user?.role_info?.name || 'Team Member')
      : 'Guest',
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A',
    roleColor: user?.is_super_admin ? 'bg-purple-600' : user?.is_team_member ? 'bg-blue-600' : 'bg-[#C4A572]',
  }), [user]);

  // Optimized mutation with cache update
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await api.auth.me(); // TODO: Replace with actual update endpoint
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Optimized callbacks
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSaveSuccess(false);
    // Focus first input after state update
    setTimeout(() => setFocus('first_name'), 100);
  }, [setFocus]);

  const handleCancel = useCallback(() => {
    reset();
    setIsEditing(false);
    setSaveSuccess(false);
  }, [reset]);

  const onSubmit = useCallback((data: ProfileFormData) => {
    updateProfile.mutate(data);
  }, [updateProfile]);

  // Sync form with user data when it loads/changes (but NOT while editing)
  useEffect(() => {
    if (user && !isEditing) {
      reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        country: user.country || '',
      });
    }
  }, [user, reset, isEditing]);

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      // Not authenticated - redirect to login
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // Authorization guard - redirect if userId doesn't match
  useEffect(() => {
    if (!isLoading && user && !isAuthorized) {
      // User authenticated but accessing wrong profile - redirect to their own profile
      const correctUserId = generateUserId(user);
      router.replace(`/u/${correctUserId}/profile`);
    }
  }, [isLoading, user, isAuthorized, router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel edit mode
      if (e.key === 'Escape' && isEditing) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleCancel]);

  // Loading state or not authenticated
  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <SiteNav />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
            <p className="text-sm text-gray-600">
              {isLoading ? 'Loading your profile...' : 'Verifying access...'}
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteNav />

      <main className="flex-1 pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button - Mobile Only */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => router.back()}
            className="md:hidden flex items-center gap-2 text-gray-600 hover:text-[#C4A572] mb-4 py-2 px-3 -ml-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Profile Settings</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your account information and preferences</p>
          </motion.div>

          {/* Success Message */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: smoothEase }}
                className="mb-4 sm:mb-6 bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3"
                role="alert"
                aria-live="polite"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm sm:text-base text-green-800 font-medium">Profile updated successfully!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: smoothEase, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Profile Header */}
                <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[#C4A572] to-[#B39562]">
                  <div className="absolute inset-0 bg-black/10" />
                </div>

                <div className="relative px-4 sm:px-6 pb-4 sm:pb-6">
                  {/* Avatar */}
                  <div className="relative -mt-12 sm:-mt-16 mb-3 sm:mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white p-1.5 sm:p-2 shadow-lg">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center">
                        <span className="text-white text-2xl sm:text-3xl font-bold">
                          {userStats.initials}
                        </span>
                      </div>
                    </div>
                    <button
                      className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all touch-manipulation focus:ring-2 focus:ring-[#C4A572] focus:outline-none"
                      aria-label="Change profile photo"
                    >
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="text-center mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">{userStats.fullName}</h2>
                    <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-white ${userStats.roleColor}`}>
                      {userStats.roleLabel}
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between py-2.5 sm:py-3 border-t border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-600">User ID</span>
                      <span className="text-xs sm:text-sm font-mono font-semibold text-gray-900">{userId}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 sm:py-3 border-t border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-600">Member Since</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{userStats.memberSince}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 sm:py-3 border-t border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-600">Status</span>
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-green-600">
                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Personal Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: smoothEase, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#C4A572]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h3>
                      <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Update your personal details</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEdit}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#C4A572] text-white rounded-lg hover:bg-[#B39562] transition-colors flex-shrink-0 touch-manipulation focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2 focus:outline-none"
                      aria-label="Edit profile information"
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="font-medium text-sm sm:text-base">Edit</span>
                    </motion.button>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  {!isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <InfoField icon={User} label="First Name" value={user.first_name} />
                      <InfoField icon={User} label="Last Name" value={user.last_name} />
                      <InfoField icon={Mail} label="Email Address" value={user.email} />
                      <InfoField icon={Phone} label="Phone Number" value={user.phone || 'Not provided'} />
                      <InfoField icon={Cake} label="Date of Birth" value={user.date_of_birth || 'Not provided'} />
                      <InfoField icon={GlobeIcon} label="Country" value={user.country || 'Not provided'} />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* First Name */}
                        <div>
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name
                          </label>
                          <input
                            {...register('first_name')}
                            type="text"
                            id="first_name"
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation ${
                              errors.first_name && isSubmitted ? 'border-red-300' : 'border-gray-200'
                            }`}
                            placeholder="Enter your first name"
                          />
                          {errors.first_name && isSubmitted && (
                            <p className="mt-1.5 text-xs sm:text-sm text-red-600 flex items-center gap-1" role="alert">
                              <AlertCircle className="w-3 h-3" />
                              {errors.first_name.message}
                            </p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            {...register('last_name')}
                            type="text"
                            id="last_name"
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation ${
                              errors.last_name && isSubmitted ? 'border-red-300' : 'border-gray-200'
                            }`}
                            placeholder="Enter your last name"
                          />
                          {errors.last_name && isSubmitted && (
                            <p className="mt-1.5 text-xs sm:text-sm text-red-600 flex items-center gap-1" role="alert">
                              <AlertCircle className="w-3 h-3" />
                              {errors.last_name.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          {...register('email')}
                          type="email"
                          id="email"
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation ${
                            errors.email && isSubmitted ? 'border-red-300' : 'border-gray-200'
                          }`}
                          placeholder="your.email@example.com"
                        />
                        {errors.email && isSubmitted && (
                          <p className="mt-1.5 text-xs sm:text-sm text-red-600 flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3 h-3" />
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number <span className="text-gray-500 text-xs sm:text-sm">(optional)</span>
                        </label>
                        <input
                          {...register('phone')}
                          type="tel"
                          id="phone"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation"
                          placeholder="Enter phone number (optional)"
                        />
                      </div>

                      {/* Date of Birth & Country */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Date of Birth */}
                        <div>
                          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                            Date of Birth <span className="text-gray-500 text-xs sm:text-sm">(optional)</span>
                          </label>
                          <input
                            {...register('date_of_birth')}
                            type="date"
                            id="date_of_birth"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation"
                          />
                        </div>

                        {/* Country */}
                        <div>
                          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                            Country <span className="text-gray-500 text-xs sm:text-sm">(optional)</span>
                          </label>
                          <input
                            {...register('country')}
                            type="text"
                            id="country"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all text-sm sm:text-base touch-manipulation"
                            placeholder="Enter your country"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 sm:pt-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={updateProfile.isPending}
                          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-[#C4A572] text-white rounded-xl hover:bg-[#B39562] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base min-h-[44px] touch-manipulation focus:ring-2 focus:ring-[#C4A572] focus:ring-offset-2 focus:outline-none"
                        >
                          {updateProfile.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handleCancel}
                          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base min-h-[44px] touch-manipulation focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:outline-none"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </motion.button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>

              {/* Security Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: smoothEase, delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Security</h3>
                      <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage your password and security settings</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base">Password</p>
                      <p className="text-xs sm:text-sm text-gray-600">Last changed 30 days ago</p>
                    </div>
                    <motion.a
                      href="/auth/forgot-password"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto text-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm min-h-[44px] flex items-center justify-center touch-manipulation focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:outline-none"
                    >
                      Change Password
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
