'use client';

import { useState, useMemo, useCallback, memo } from 'react';
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
  Globe,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Quantum-optimized easing
const smoothEase = [0.16, 1, 0.3, 1] as const;

// Zod validation schema
const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(50),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Memoized components for quantum performance
const StatCard = memo(({ icon: Icon, label, value, color }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: smoothEase }}
    className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </motion.div>
));
StatCard.displayName = 'StatCard';

const InfoField = memo(({ icon: Icon, label, value }: any) => (
  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
    <div className="w-10 h-10 rounded-lg bg-[#C4A572]/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-[#C4A572]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-base font-medium text-gray-900 truncate">{value}</p>
    </div>
  </div>
));
InfoField.displayName = 'InfoField';

export default function ProfileSettingsPage() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // React Hook Form with Zod validation
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: useMemo(() => ({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }), [user]),
  });

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
  }, []);

  const handleCancel = useCallback(() => {
    reset();
    setIsEditing(false);
    setSaveSuccess(false);
  }, [reset]);

  const onSubmit = useCallback((data: ProfileFormData) => {
    updateProfile.mutate(data);
  }, [updateProfile]);

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <SiteNav />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#C4A572]/30 border-t-[#C4A572]" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteNav />

      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and preferences</p>
          </motion.div>

          {/* Success Message */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: smoothEase }}
                className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
              >
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">Profile updated successfully!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: smoothEase, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Profile Header */}
                <div className="relative h-32 bg-gradient-to-br from-[#C4A572] to-[#B39562]">
                  <div className="absolute inset-0 bg-black/10" />
                </div>

                <div className="relative px-6 pb-6">
                  {/* Avatar */}
                  <div className="relative -mt-16 mb-4">
                    <div className="w-32 h-32 rounded-full bg-white p-2 shadow-lg">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#C4A572] to-[#B39562] flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                          {userStats.initials}
                        </span>
                      </div>
                    </div>
                    <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                      <Camera className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{userStats.fullName}</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${userStats.roleColor}`}>
                      {userStats.roleLabel}
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Account ID</span>
                      <span className="text-sm font-medium text-gray-900">#{user.id}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Member Since</span>
                      <span className="text-sm font-medium text-gray-900">{userStats.memberSince}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <span className="w-2 h-2 bg-green-600 rounded-full" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: smoothEase, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#C4A572]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#C4A572]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                      <p className="text-sm text-gray-600">Update your personal details</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-[#C4A572] text-white rounded-lg hover:bg-[#B39562] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="font-medium">Edit</span>
                    </motion.button>
                  )}
                </div>

                <div className="p-6">
                  {!isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoField icon={User} label="First Name" value={user.first_name} />
                      <InfoField icon={User} label="Last Name" value={user.last_name} />
                      <InfoField icon={Mail} label="Email Address" value={user.email} />
                      <InfoField icon={Phone} label="Phone Number" value={user.phone || 'Not provided'} />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all ${
                              errors.first_name ? 'border-red-300' : 'border-gray-200'
                            }`}
                            placeholder="John"
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
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
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all ${
                              errors.last_name ? 'border-red-300' : 'border-gray-200'
                            }`}
                            placeholder="Doe"
                          />
                          {errors.last_name && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
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
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all ${
                            errors.email ? 'border-red-300' : 'border-gray-200'
                          }`}
                          placeholder="john.doe@example.com"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number <span className="text-gray-500">(optional)</span>
                        </label>
                        <input
                          {...register('phone')}
                          type="tel"
                          id="phone"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={updateProfile.isPending}
                          className="flex items-center gap-2 px-6 py-3 bg-[#C4A572] text-white rounded-xl hover:bg-[#B39562] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                      <p className="text-sm text-gray-600">Manage your password and security settings</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Password</p>
                      <p className="text-sm text-gray-600">Last changed 30 days ago</p>
                    </div>
                    <motion.a
                      href="/auth/forgot-password"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
