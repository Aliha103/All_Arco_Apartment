/**
 * Server-side authentication verification API route
 * This endpoint is called by middleware to verify user authentication
 * and prevent client-side bypass attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();

    // Get session cookie
    const sessionCookie = cookieStore.get('sessionid');
    const csrfCookie = cookieStore.get('csrftoken');

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, error: 'No session cookie' },
        { status: 401 }
      );
    }

    // Verify session with Django backend
    const response = await fetch(`${DJANGO_API_URL}/auth/me/`, {
      method: 'GET',
      headers: {
        'Cookie': `sessionid=${sessionCookie.value}${csrfCookie ? `; csrftoken=${csrfCookie.value}` : ''}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const userData = await response.json();

    // Check if user is team member or admin
    const isTeamMember = userData.is_team_member || userData.is_super_admin;

    return NextResponse.json({
      authenticated: true,
      isTeamMember,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        is_team_member: userData.is_team_member,
        is_super_admin: userData.is_super_admin,
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
