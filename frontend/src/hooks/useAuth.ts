/**
 * Authentication hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { User, LoginCredentials, RegisterData } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, setLoading, logout: storeLogout } = useAuthStore();

  // Fetch current user
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.auth.me();
      return response.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (error) {
      setUser(null);
    }
  }, [data, error, setUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.auth.login(credentials);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data.user || data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push(data.user?.role === 'guest' ? '/dashboard' : '/pms');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.auth.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data.user || data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/dashboard');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.auth.logout();
    },
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      router.push('/');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
