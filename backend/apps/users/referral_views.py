# ============================================================================
# Referral/Invitation API Views
# ============================================================================

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Sum
from .models import User, ReferralCredit
from .serializers import UserSerializer


class ReferralStatsViewSet(viewsets.ViewSet):
    """
    API endpoints for managing referrals and credits.
    Guests can see:
    - Their own reference code
    - List of people they invited
    - Referral credits earned (€5 per night per booking)

    Team members/admins can see:
    - All users' invitations (for analytics)
    - Referral credit tracking
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user's referral stats.

        Returns:
        - reference_code: User's unique code to share
        - invited_count: Number of people they've invited
        - referral_credits_earned: Total €€ earned from referrals
        - referred_by_name: Who invited them (if applicable)
        """
        user = request.user
        return Response({
            'reference_code': user.reference_code,
            'invited_count': user.get_invited_count(),
            'referral_credits_earned': float(user.get_referral_credits_earned()),
            'referred_by': {
                'id': str(user.referred_by.id),
                'name': user.referred_by.get_full_name(),
                'email': user.referred_by.email
            } if user.referred_by else None,
        })

    @action(detail=False, methods=['get'])
    def invited_guests(self, request):
        """
        Get list of people this user has invited.
        Shows their invited guests and the status of their bookings.
        """
        user = request.user

        # Get all guests invited by this user
        invited_guests = user.invited_guests.filter(is_active=True).prefetch_related(
            'referral_earnings'
        ).order_by('-created_at')

        guests_data = []
        for guest in invited_guests:
            # Get their referral credits (from their bookings)
            credits = guest.referral_earnings.all()
            total_earned_from_guest = sum(
                float(c.amount) for c in credits if c.status == 'earned'
            )

            guests_data.append({
                'id': str(guest.id),
                'name': guest.get_full_name(),
                'email': guest.email,
                'invited_date': guest.created_at.isoformat(),
                'bookings_count': guest.referral_earnings.count(),
                'total_earned': total_earned_from_guest,
                'pending_credits': sum(
                    float(c.amount) for c in credits if c.status == 'pending'
                ),
            })

        return Response({
            'invited_guests': guests_data,
            'total_invited': len(guests_data),
            'total_earned': float(user.get_referral_credits_earned()),
        })

    @action(detail=False, methods=['get'])
    def credits(self, request):
        """
        Get detailed list of referral credits for this user.
        Shows all credits earned from invited guests' bookings.
        """
        user = request.user

        # Get all referral credits where this user is the referrer
        credits = ReferralCredit.objects.filter(
            referrer=user
        ).select_related('referred_user', 'booking').order_by('-created_at')

        credits_data = []
        for credit in credits:
            credits_data.append({
                'id': str(credit.id),
                'referred_user_name': credit.referred_user.get_full_name(),
                'referred_user_email': credit.referred_user.email,
                'amount': float(credit.amount),
                'nights': credit.nights,
                'status': credit.status,
                'created_at': credit.created_at.isoformat(),
                'earned_at': credit.earned_at.isoformat() if credit.earned_at else None,
                'booking_id': str(credit.booking.id) if credit.booking else None,
            })

        return Response({
            'credits': credits_data,
            'total_earned': float(user.get_referral_credits_earned()),
            'total_pending': sum(
                float(c.amount) for c in credits if c.status == 'pending'
            ),
        })


# ============================================================================
# Team/Admin Endpoints - View all invitations
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_stats(request):
    """
    Team/Admin endpoint to view all referral data.
    Only accessible to team members and admins.
    """
    if not request.user.is_team_member():
        return Response(
            {'error': 'Only team members can view referral stats'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get users with referral stats
    users = User.objects.filter(
        is_active=True
    ).annotate(
        invited_count=Count('invited_guests', filter=Q(invited_guests__is_active=True)),
        credits_earned=Sum(
            'referral_credits__amount',
            filter=Q(referral_credits__status='earned')
        )
    ).order_by('-credits_earned')

    data = []
    for user in users:
        if user.invited_count > 0 or user.credits_earned:
            data.append({
                'id': str(user.id),
                'name': user.get_full_name(),
                'email': user.email,
                'reference_code': user.reference_code,
                'invited_count': user.invited_count,
                'credits_earned': float(user.credits_earned or 0),
            })

    return Response({
        'referral_stats': data,
        'total_users_with_referrals': len(data),
    })
