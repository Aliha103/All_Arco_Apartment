/**
 * Authentication state management with Zustand
 * Includes RBAC permission checking
 */

import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: string[];

  // Setters
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;

  // Permission checking methods
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  hasAllPermissions: (permissionCodes: string[]) => boolean;
  isSuperAdmin: () => boolean;
  isTeamMember: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  permissions: [],

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isLoading: false,
    permissions: user?.permissions || []
  }),

  setLoading: (loading) => set({ isLoading: loading }),

  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  logout: () => set({
    user: null,
    isAuthenticated: false,
    permissions: []
  }),

  // Permission checking methods
  hasPermission: (permissionCode: string) => {
    const { user, permissions } = get();
    if (!user) return false;

    // Super admins have all permissions implicitly
    if (user.is_super_admin) return true;

    return permissions.includes(permissionCode);
  },

  hasAnyPermission: (permissionCodes: string[]) => {
    const { user, permissions } = get();
    if (!user) return false;

    // Super admins have all permissions implicitly
    if (user.is_super_admin) return true;

    return permissionCodes.some(code => permissions.includes(code));
  },

  hasAllPermissions: (permissionCodes: string[]) => {
    const { user, permissions } = get();
    if (!user) return false;

    // Super admins have all permissions implicitly
    if (user.is_super_admin) return true;

    return permissionCodes.every(code => permissions.includes(code));
  },

  isSuperAdmin: () => {
    const { user } = get();
    return user?.is_super_admin || false;
  },

  isTeamMember: () => {
    const { user } = get();
    return user?.is_team_member || false;
  },
}));
