/**
 * Hook to generate user-specific professional URLs
 * Returns unique URLs for each user based on their UserId
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { generateUserId } from '@/lib/userId';

export function useUserUrls() {
  const { user } = useAuth();

  const urls = useMemo(() => {
    if (!user) {
      return {
        profile: '/auth/login',
        messages: '/auth/login',
        dashboard: '/auth/login',
        userId: '',
      };
    }

    const userId = generateUserId(user);
    const isTeam = user.is_super_admin || user.is_team_member;

    return {
      profile: `/u/${userId}/profile`,
      messages: `/u/${userId}/messages`,
      dashboard: isTeam ? `/u/${userId}/dashboard` : `/u/${userId}/bookings`,
      userId,
    };
  }, [user]);

  return urls;
}
