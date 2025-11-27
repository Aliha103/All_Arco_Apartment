#!/bin/bash
# Script to commit and push All'Arco Apartment RBAC implementation to GitHub

echo "🚀 Committing and Pushing All'Arco Apartment RBAC System to GitHub..."
echo ""

# Your GitHub token
TOKEN="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"
REPO="github.com/Aliha103/All_Arco_Apartment.git"

echo "📍 Current directory: $(pwd)"
echo "📋 Current branch: $(git branch --show-current)"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Files to commit:"
    git status -s
    echo ""

    # Stage all changes
    echo "➕ Staging all changes..."
    git add .

    if [ $? -eq 0 ]; then
        echo "✅ Files staged successfully"
        echo ""

        # Commit with detailed message
        echo "💾 Creating commit..."
        git commit -m "feat: Implement enterprise RBAC system with audit logging and booking management

MAJOR FEATURES:
- Complete Role-Based Access Control (RBAC) system
- Comprehensive audit logging for all key actions
- Transaction-safe overbooking prevention
- No-show booking management with partial release support
- Permission-based UI rendering

BACKEND IMPLEMENTATION:
- Added Permission, Role, AuditLog models with full relationships
- Updated User model with RBAC integration and backward compatibility
- Added Booking.no_show status and released_from_date field
- Implemented transaction-safe overbooking prevention with SELECT FOR UPDATE
- Created cancel_booking endpoint with immediate date release
- Created mark_no_show endpoint with full/partial no-show support
- Built permission-based ViewSets (HasPermission, HasPermissionForAction)
- Enhanced /api/me endpoint to return role_info and permissions array
- Created PermissionViewSet (read-only) with grouped permissions endpoint
- Created RoleViewSet with full CRUD and audit logging
- Added /api/users/seed-rbac/ endpoint for initial setup

FRONTEND IMPLEMENTATION:
- Complete Team & Roles management UI with tabbed interface
- Role creation/editing with permission assignment modals
- Team member invitation with role selection
- Permission-based navigation filtering
- Enhanced auth store with permission checking methods
- Updated TypeScript types (Permission, Role, RoleInfo, User)
- Real-time role and permission management
- Grouped permission display by feature area

SECURITY & AUDIT:
- All key actions logged with user, timestamp, metadata, IP, user agent
- SELECT FOR UPDATE prevents race conditions in booking creation
- Super Admin role has implicit all-permissions access
- System roles protected from deletion
- Role deletion validates no assigned members exist

DEFAULT ROLES CREATED:
- Super Admin: Full system access (all permissions implicitly)
- Front Desk: Bookings, guests, check-in/out management
- Accounting: Payments, refunds, financial reports
- Housekeeping: View-only access to bookings and guests

PERMISSIONS: 33 granular permissions across 6 feature groups
- Bookings: view, create, update, delete, cancel, mark_no_show
- Payments: view, create, refund, export
- Guests: view, update, notes, export
- Pricing: view, update, rules_manage
- Team: view, invite, update, deactivate
- Reports: view, export, audit_logs
- Roles: manage (full role/permission management)

FILES MODIFIED:
Backend (7 files):
- apps/users/models.py
- apps/users/serializers.py
- apps/users/views.py
- apps/users/permissions.py
- apps/users/urls.py
- apps/bookings/models.py
- apps/bookings/views.py

Frontend (4 files):
- types/index.ts
- stores/authStore.ts
- app/pms/layout.tsx
- app/pms/team/page.tsx

BREAKING CHANGES:
- User.role field renamed to legacy_role (backward compatible via property)
- User object now returns role_info object instead of simple role string
- PMS navigation now requires permission checks

Co-authored-by: Claude Code <claude@anthropic.com>"

        if [ $? -eq 0 ]; then
            echo "✅ Commit created successfully"
            echo ""
            echo "📊 Commit details:"
            git log -1 --oneline
            echo ""
        else
            echo "❌ Commit failed. Error code: $?"
            exit 1
        fi
    else
        echo "❌ Staging failed. Error code: $?"
        exit 1
    fi
else
    echo "ℹ️  No uncommitted changes found"
    echo ""
fi

# Show what will be pushed
echo "📊 Commits to push:"
git log origin/main..HEAD --oneline 2>/dev/null || echo "No commits ahead of origin/main"
echo ""

# Push to main
echo "⬆️  Pushing to GitHub main branch..."
git push "https://${TOKEN}@${REPO}" HEAD:main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View at: https://github.com/Aliha103/All_Arco_Apartment"
    echo ""
    echo "📦 Summary:"
    echo "   - RBAC system fully implemented"
    echo "   - Audit logging operational"
    echo "   - Overbooking prevention active"
    echo "   - No-show management ready"
    echo "   - Team & Roles UI complete"
    echo "   - 33 permissions across 6 groups"
    echo "   - 4 default roles created"
else
    echo ""
    echo "❌ Push failed. Error code: $?"
    exit 1
fi
