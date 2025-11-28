'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, User as UserIcon, Phone,
  ChevronLeft, CheckCircle2, Shield, Clock, CreditCard, MapPin, Globe
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

// Smooth easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Benefits data
const benefits = [
  {
    icon: CheckCircle2,
    title: 'Instant Booking',
    description: 'Book your stay in seconds'
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Your data is always protected'
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'We\'re here to help anytime'
  },
  {
    icon: CreditCard,
    title: 'Best Price Guarantee',
    description: 'Book direct for best rates'
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated, isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep === 1) {
      handleNext();
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.auth.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        country: formData.country,
      });

      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / 2) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <SiteNav />

      {/* Main Content */}
      <main className="flex-1 flex pt-20">
        {/* Left Side - Benefits (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          {/* Background Image */}
          <Image
            src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2940&auto=format&fit=crop"
            alt="Venice"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col justify-center p-10 xl:p-14 w-full">
            {/* Top - Location */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-white/70 mb-12"
            >
              <MapPin className="w-4 h-4 text-[#C4A572]" />
              <span className="text-sm tracking-wider uppercase">Venice, Italy</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-12"
            >
              <h1 className="text-4xl xl:text-5xl font-light text-white mb-4 leading-tight">
                Join Our Community
                <span className="block text-[#C4A572] font-medium">Book Your Perfect Stay</span>
              </h1>
              <p className="text-white/60 max-w-md text-lg">
                Create an account to unlock exclusive benefits and streamline your booking experience
              </p>
            </motion.div>

            {/* Benefits List */}
            <div className="space-y-5">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-[#C4A572]/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-[#C4A572]/20">
                    <benefit.icon className="w-6 h-6 text-[#C4A572]" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-0.5">{benefit.title}</h3>
                    <p className="text-white/50 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#0a0a0a]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Image
                src="/allarco-logo.png"
                alt="All'Arco Apartment"
                width={150}
                height={55}
                className="object-contain"
              />
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">
                  Step {currentStep} of 2
                </span>
                <span className="text-sm text-gray-600">
                  {currentStep === 1 ? 'Personal Info' : 'Security'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '50%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-[#C4A572]"
                />
              </div>
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light text-white mb-2">
                {currentStep === 1 ? 'Create Account' : 'Secure Your Account'}
              </h2>
              <p className="text-gray-500">
                {currentStep === 1
                  ? 'Enter your details to get started'
                  : 'Create a strong password'
                }
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  /* Step 1: Personal Information */
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-400 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                            placeholder="John"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-400 mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          autoComplete="email"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Country Field */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-400 mb-2">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a1a] text-gray-400">Select your country</option>
                          <option value="Afghanistan" className="bg-[#1a1a1a]">Afghanistan</option>
                          <option value="Albania" className="bg-[#1a1a1a]">Albania</option>
                          <option value="Algeria" className="bg-[#1a1a1a]">Algeria</option>
                          <option value="Andorra" className="bg-[#1a1a1a]">Andorra</option>
                          <option value="Angola" className="bg-[#1a1a1a]">Angola</option>
                          <option value="Antigua and Barbuda" className="bg-[#1a1a1a]">Antigua and Barbuda</option>
                          <option value="Argentina" className="bg-[#1a1a1a]">Argentina</option>
                          <option value="Armenia" className="bg-[#1a1a1a]">Armenia</option>
                          <option value="Australia" className="bg-[#1a1a1a]">Australia</option>
                          <option value="Austria" className="bg-[#1a1a1a]">Austria</option>
                          <option value="Azerbaijan" className="bg-[#1a1a1a]">Azerbaijan</option>
                          <option value="Bahamas" className="bg-[#1a1a1a]">Bahamas</option>
                          <option value="Bahrain" className="bg-[#1a1a1a]">Bahrain</option>
                          <option value="Bangladesh" className="bg-[#1a1a1a]">Bangladesh</option>
                          <option value="Barbados" className="bg-[#1a1a1a]">Barbados</option>
                          <option value="Belarus" className="bg-[#1a1a1a]">Belarus</option>
                          <option value="Belgium" className="bg-[#1a1a1a]">Belgium</option>
                          <option value="Belize" className="bg-[#1a1a1a]">Belize</option>
                          <option value="Benin" className="bg-[#1a1a1a]">Benin</option>
                          <option value="Bhutan" className="bg-[#1a1a1a]">Bhutan</option>
                          <option value="Bolivia" className="bg-[#1a1a1a]">Bolivia</option>
                          <option value="Bosnia and Herzegovina" className="bg-[#1a1a1a]">Bosnia and Herzegovina</option>
                          <option value="Botswana" className="bg-[#1a1a1a]">Botswana</option>
                          <option value="Brazil" className="bg-[#1a1a1a]">Brazil</option>
                          <option value="Brunei" className="bg-[#1a1a1a]">Brunei</option>
                          <option value="Bulgaria" className="bg-[#1a1a1a]">Bulgaria</option>
                          <option value="Burkina Faso" className="bg-[#1a1a1a]">Burkina Faso</option>
                          <option value="Burundi" className="bg-[#1a1a1a]">Burundi</option>
                          <option value="Cambodia" className="bg-[#1a1a1a]">Cambodia</option>
                          <option value="Cameroon" className="bg-[#1a1a1a]">Cameroon</option>
                          <option value="Canada" className="bg-[#1a1a1a]">Canada</option>
                          <option value="Cape Verde" className="bg-[#1a1a1a]">Cape Verde</option>
                          <option value="Central African Republic" className="bg-[#1a1a1a]">Central African Republic</option>
                          <option value="Chad" className="bg-[#1a1a1a]">Chad</option>
                          <option value="Chile" className="bg-[#1a1a1a]">Chile</option>
                          <option value="China" className="bg-[#1a1a1a]">China</option>
                          <option value="Colombia" className="bg-[#1a1a1a]">Colombia</option>
                          <option value="Comoros" className="bg-[#1a1a1a]">Comoros</option>
                          <option value="Congo" className="bg-[#1a1a1a]">Congo</option>
                          <option value="Costa Rica" className="bg-[#1a1a1a]">Costa Rica</option>
                          <option value="Croatia" className="bg-[#1a1a1a]">Croatia</option>
                          <option value="Cuba" className="bg-[#1a1a1a]">Cuba</option>
                          <option value="Cyprus" className="bg-[#1a1a1a]">Cyprus</option>
                          <option value="Czech Republic" className="bg-[#1a1a1a]">Czech Republic</option>
                          <option value="Denmark" className="bg-[#1a1a1a]">Denmark</option>
                          <option value="Djibouti" className="bg-[#1a1a1a]">Djibouti</option>
                          <option value="Dominica" className="bg-[#1a1a1a]">Dominica</option>
                          <option value="Dominican Republic" className="bg-[#1a1a1a]">Dominican Republic</option>
                          <option value="Ecuador" className="bg-[#1a1a1a]">Ecuador</option>
                          <option value="Egypt" className="bg-[#1a1a1a]">Egypt</option>
                          <option value="El Salvador" className="bg-[#1a1a1a]">El Salvador</option>
                          <option value="Equatorial Guinea" className="bg-[#1a1a1a]">Equatorial Guinea</option>
                          <option value="Eritrea" className="bg-[#1a1a1a]">Eritrea</option>
                          <option value="Estonia" className="bg-[#1a1a1a]">Estonia</option>
                          <option value="Eswatini" className="bg-[#1a1a1a]">Eswatini</option>
                          <option value="Ethiopia" className="bg-[#1a1a1a]">Ethiopia</option>
                          <option value="Fiji" className="bg-[#1a1a1a]">Fiji</option>
                          <option value="Finland" className="bg-[#1a1a1a]">Finland</option>
                          <option value="France" className="bg-[#1a1a1a]">France</option>
                          <option value="Gabon" className="bg-[#1a1a1a]">Gabon</option>
                          <option value="Gambia" className="bg-[#1a1a1a]">Gambia</option>
                          <option value="Georgia" className="bg-[#1a1a1a]">Georgia</option>
                          <option value="Germany" className="bg-[#1a1a1a]">Germany</option>
                          <option value="Ghana" className="bg-[#1a1a1a]">Ghana</option>
                          <option value="Greece" className="bg-[#1a1a1a]">Greece</option>
                          <option value="Grenada" className="bg-[#1a1a1a]">Grenada</option>
                          <option value="Guatemala" className="bg-[#1a1a1a]">Guatemala</option>
                          <option value="Guinea" className="bg-[#1a1a1a]">Guinea</option>
                          <option value="Guinea-Bissau" className="bg-[#1a1a1a]">Guinea-Bissau</option>
                          <option value="Guyana" className="bg-[#1a1a1a]">Guyana</option>
                          <option value="Haiti" className="bg-[#1a1a1a]">Haiti</option>
                          <option value="Honduras" className="bg-[#1a1a1a]">Honduras</option>
                          <option value="Hungary" className="bg-[#1a1a1a]">Hungary</option>
                          <option value="Iceland" className="bg-[#1a1a1a]">Iceland</option>
                          <option value="India" className="bg-[#1a1a1a]">India</option>
                          <option value="Indonesia" className="bg-[#1a1a1a]">Indonesia</option>
                          <option value="Iran" className="bg-[#1a1a1a]">Iran</option>
                          <option value="Iraq" className="bg-[#1a1a1a]">Iraq</option>
                          <option value="Ireland" className="bg-[#1a1a1a]">Ireland</option>
                          <option value="Israel" className="bg-[#1a1a1a]">Israel</option>
                          <option value="Italy" className="bg-[#1a1a1a]">Italy</option>
                          <option value="Ivory Coast" className="bg-[#1a1a1a]">Ivory Coast</option>
                          <option value="Jamaica" className="bg-[#1a1a1a]">Jamaica</option>
                          <option value="Japan" className="bg-[#1a1a1a]">Japan</option>
                          <option value="Jordan" className="bg-[#1a1a1a]">Jordan</option>
                          <option value="Kazakhstan" className="bg-[#1a1a1a]">Kazakhstan</option>
                          <option value="Kenya" className="bg-[#1a1a1a]">Kenya</option>
                          <option value="Kiribati" className="bg-[#1a1a1a]">Kiribati</option>
                          <option value="Kosovo" className="bg-[#1a1a1a]">Kosovo</option>
                          <option value="Kuwait" className="bg-[#1a1a1a]">Kuwait</option>
                          <option value="Kyrgyzstan" className="bg-[#1a1a1a]">Kyrgyzstan</option>
                          <option value="Laos" className="bg-[#1a1a1a]">Laos</option>
                          <option value="Latvia" className="bg-[#1a1a1a]">Latvia</option>
                          <option value="Lebanon" className="bg-[#1a1a1a]">Lebanon</option>
                          <option value="Lesotho" className="bg-[#1a1a1a]">Lesotho</option>
                          <option value="Liberia" className="bg-[#1a1a1a]">Liberia</option>
                          <option value="Libya" className="bg-[#1a1a1a]">Libya</option>
                          <option value="Liechtenstein" className="bg-[#1a1a1a]">Liechtenstein</option>
                          <option value="Lithuania" className="bg-[#1a1a1a]">Lithuania</option>
                          <option value="Luxembourg" className="bg-[#1a1a1a]">Luxembourg</option>
                          <option value="Madagascar" className="bg-[#1a1a1a]">Madagascar</option>
                          <option value="Malawi" className="bg-[#1a1a1a]">Malawi</option>
                          <option value="Malaysia" className="bg-[#1a1a1a]">Malaysia</option>
                          <option value="Maldives" className="bg-[#1a1a1a]">Maldives</option>
                          <option value="Mali" className="bg-[#1a1a1a]">Mali</option>
                          <option value="Malta" className="bg-[#1a1a1a]">Malta</option>
                          <option value="Marshall Islands" className="bg-[#1a1a1a]">Marshall Islands</option>
                          <option value="Mauritania" className="bg-[#1a1a1a]">Mauritania</option>
                          <option value="Mauritius" className="bg-[#1a1a1a]">Mauritius</option>
                          <option value="Mexico" className="bg-[#1a1a1a]">Mexico</option>
                          <option value="Micronesia" className="bg-[#1a1a1a]">Micronesia</option>
                          <option value="Moldova" className="bg-[#1a1a1a]">Moldova</option>
                          <option value="Monaco" className="bg-[#1a1a1a]">Monaco</option>
                          <option value="Mongolia" className="bg-[#1a1a1a]">Mongolia</option>
                          <option value="Montenegro" className="bg-[#1a1a1a]">Montenegro</option>
                          <option value="Morocco" className="bg-[#1a1a1a]">Morocco</option>
                          <option value="Mozambique" className="bg-[#1a1a1a]">Mozambique</option>
                          <option value="Myanmar" className="bg-[#1a1a1a]">Myanmar</option>
                          <option value="Namibia" className="bg-[#1a1a1a]">Namibia</option>
                          <option value="Nauru" className="bg-[#1a1a1a]">Nauru</option>
                          <option value="Nepal" className="bg-[#1a1a1a]">Nepal</option>
                          <option value="Netherlands" className="bg-[#1a1a1a]">Netherlands</option>
                          <option value="New Zealand" className="bg-[#1a1a1a]">New Zealand</option>
                          <option value="Nicaragua" className="bg-[#1a1a1a]">Nicaragua</option>
                          <option value="Niger" className="bg-[#1a1a1a]">Niger</option>
                          <option value="Nigeria" className="bg-[#1a1a1a]">Nigeria</option>
                          <option value="North Korea" className="bg-[#1a1a1a]">North Korea</option>
                          <option value="North Macedonia" className="bg-[#1a1a1a]">North Macedonia</option>
                          <option value="Norway" className="bg-[#1a1a1a]">Norway</option>
                          <option value="Oman" className="bg-[#1a1a1a]">Oman</option>
                          <option value="Pakistan" className="bg-[#1a1a1a]">Pakistan</option>
                          <option value="Palau" className="bg-[#1a1a1a]">Palau</option>
                          <option value="Palestine" className="bg-[#1a1a1a]">Palestine</option>
                          <option value="Panama" className="bg-[#1a1a1a]">Panama</option>
                          <option value="Papua New Guinea" className="bg-[#1a1a1a]">Papua New Guinea</option>
                          <option value="Paraguay" className="bg-[#1a1a1a]">Paraguay</option>
                          <option value="Peru" className="bg-[#1a1a1a]">Peru</option>
                          <option value="Philippines" className="bg-[#1a1a1a]">Philippines</option>
                          <option value="Poland" className="bg-[#1a1a1a]">Poland</option>
                          <option value="Portugal" className="bg-[#1a1a1a]">Portugal</option>
                          <option value="Qatar" className="bg-[#1a1a1a]">Qatar</option>
                          <option value="Romania" className="bg-[#1a1a1a]">Romania</option>
                          <option value="Russia" className="bg-[#1a1a1a]">Russia</option>
                          <option value="Rwanda" className="bg-[#1a1a1a]">Rwanda</option>
                          <option value="Saint Kitts and Nevis" className="bg-[#1a1a1a]">Saint Kitts and Nevis</option>
                          <option value="Saint Lucia" className="bg-[#1a1a1a]">Saint Lucia</option>
                          <option value="Saint Vincent and the Grenadines" className="bg-[#1a1a1a]">Saint Vincent and the Grenadines</option>
                          <option value="Samoa" className="bg-[#1a1a1a]">Samoa</option>
                          <option value="San Marino" className="bg-[#1a1a1a]">San Marino</option>
                          <option value="Sao Tome and Principe" className="bg-[#1a1a1a]">Sao Tome and Principe</option>
                          <option value="Saudi Arabia" className="bg-[#1a1a1a]">Saudi Arabia</option>
                          <option value="Senegal" className="bg-[#1a1a1a]">Senegal</option>
                          <option value="Serbia" className="bg-[#1a1a1a]">Serbia</option>
                          <option value="Seychelles" className="bg-[#1a1a1a]">Seychelles</option>
                          <option value="Sierra Leone" className="bg-[#1a1a1a]">Sierra Leone</option>
                          <option value="Singapore" className="bg-[#1a1a1a]">Singapore</option>
                          <option value="Slovakia" className="bg-[#1a1a1a]">Slovakia</option>
                          <option value="Slovenia" className="bg-[#1a1a1a]">Slovenia</option>
                          <option value="Solomon Islands" className="bg-[#1a1a1a]">Solomon Islands</option>
                          <option value="Somalia" className="bg-[#1a1a1a]">Somalia</option>
                          <option value="South Africa" className="bg-[#1a1a1a]">South Africa</option>
                          <option value="South Korea" className="bg-[#1a1a1a]">South Korea</option>
                          <option value="South Sudan" className="bg-[#1a1a1a]">South Sudan</option>
                          <option value="Spain" className="bg-[#1a1a1a]">Spain</option>
                          <option value="Sri Lanka" className="bg-[#1a1a1a]">Sri Lanka</option>
                          <option value="Sudan" className="bg-[#1a1a1a]">Sudan</option>
                          <option value="Suriname" className="bg-[#1a1a1a]">Suriname</option>
                          <option value="Sweden" className="bg-[#1a1a1a]">Sweden</option>
                          <option value="Switzerland" className="bg-[#1a1a1a]">Switzerland</option>
                          <option value="Syria" className="bg-[#1a1a1a]">Syria</option>
                          <option value="Taiwan" className="bg-[#1a1a1a]">Taiwan</option>
                          <option value="Tajikistan" className="bg-[#1a1a1a]">Tajikistan</option>
                          <option value="Tanzania" className="bg-[#1a1a1a]">Tanzania</option>
                          <option value="Thailand" className="bg-[#1a1a1a]">Thailand</option>
                          <option value="Timor-Leste" className="bg-[#1a1a1a]">Timor-Leste</option>
                          <option value="Togo" className="bg-[#1a1a1a]">Togo</option>
                          <option value="Tonga" className="bg-[#1a1a1a]">Tonga</option>
                          <option value="Trinidad and Tobago" className="bg-[#1a1a1a]">Trinidad and Tobago</option>
                          <option value="Tunisia" className="bg-[#1a1a1a]">Tunisia</option>
                          <option value="Turkey" className="bg-[#1a1a1a]">Turkey</option>
                          <option value="Turkmenistan" className="bg-[#1a1a1a]">Turkmenistan</option>
                          <option value="Tuvalu" className="bg-[#1a1a1a]">Tuvalu</option>
                          <option value="Uganda" className="bg-[#1a1a1a]">Uganda</option>
                          <option value="Ukraine" className="bg-[#1a1a1a]">Ukraine</option>
                          <option value="United Arab Emirates" className="bg-[#1a1a1a]">United Arab Emirates</option>
                          <option value="United Kingdom" className="bg-[#1a1a1a]">United Kingdom</option>
                          <option value="United States" className="bg-[#1a1a1a]">United States</option>
                          <option value="Uruguay" className="bg-[#1a1a1a]">Uruguay</option>
                          <option value="Uzbekistan" className="bg-[#1a1a1a]">Uzbekistan</option>
                          <option value="Vanuatu" className="bg-[#1a1a1a]">Vanuatu</option>
                          <option value="Vatican City" className="bg-[#1a1a1a]">Vatican City</option>
                          <option value="Venezuela" className="bg-[#1a1a1a]">Venezuela</option>
                          <option value="Vietnam" className="bg-[#1a1a1a]">Vietnam</option>
                          <option value="Yemen" className="bg-[#1a1a1a]">Yemen</option>
                          <option value="Zambia" className="bg-[#1a1a1a]">Zambia</option>
                          <option value="Zimbabwe" className="bg-[#1a1a1a]">Zimbabwe</option>
                        </select>
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                        Phone Number <span className="text-gray-600">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#C4A572] focus:border-transparent outline-none transition-all"
                          placeholder="+39 123 456 7890"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Step 2: Security */
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
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
                        Must be at least 8 characters long
                      </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                {currentStep === 2 && (
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-4 border border-gray-800 rounded-xl font-medium text-gray-400 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </motion.button>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="flex-1 bg-[#C4A572] text-white py-4 rounded-xl font-semibold hover:bg-[#B39562] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C4A572]/20"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      {currentStep === 1 ? 'Continue' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#0a0a0a] text-gray-600">or</span>
                </div>
              </div>

              {/* Login Link */}
              <p className="text-center text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-[#C4A572] hover:text-[#D4B582] transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
