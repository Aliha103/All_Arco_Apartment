'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

export default function TeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Admin-only access check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/pms');
    }
  }, [user, authLoading, router]);

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await api.users.team.list();
      return response.data.results || response.data;
    },
    enabled: user?.role === 'admin',
  });

  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'team',
  });

  const [editFormData, setEditFormData] = useState({
    role: '',
    is_active: true,
  });

  const inviteTeamMember = useMutation({
    mutationFn: (data: any) => api.users.team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsInviteModalOpen(false);
      setInviteFormData({ email: '', first_name: '', last_name: '', role: 'team' });
      alert('Team member invited successfully. Invitation email sent.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to invite team member');
    },
  });

  const updateTeamMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.users.team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsEditModalOpen(false);
      setSelectedMember(null);
      alert('Team member updated successfully');
    },
  });

  const deleteTeamMember = useMutation({
    mutationFn: (id: string) => api.users.team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      alert('Team member removed successfully');
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteTeamMember.mutate(inviteFormData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      updateTeamMember.mutate({ id: selectedMember.id, data: editFormData });
    }
  };

  const handleEdit = (member: any) => {
    setSelectedMember(member);
    setEditFormData({
      role: member.role,
      is_active: member.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleDeactivate = (member: any) => {
    if (confirm(`Are you sure you want to ${member.is_active ? 'deactivate' : 'activate'} ${member.first_name} ${member.last_name}?`)) {
      updateTeamMember.mutate({
        id: member.id,
        data: { is_active: !member.is_active },
      });
    }
  };

  const handleDelete = (member: any) => {
    if (confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name} from the team? This action cannot be undone.`)) {
      deleteTeamMember.mutate(member.id);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'team':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-gray-600">Manage team members and access permissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members ({teamMembers?.length || 0})</CardTitle>
            <Button onClick={() => setIsInviteModalOpen(true)}>
              Invite Team Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers && teamMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'success' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.last_login ? formatDate(member.last_login) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(member)}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(member)}
                          disabled={member.id === user.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No team members yet</p>
          )}
        </CardContent>
      </Card>

      {/* Invite Team Member Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                type="text"
                value={inviteFormData.first_name}
                onChange={(e) => setInviteFormData({ ...inviteFormData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                type="text"
                value={inviteFormData.last_name}
                onChange={(e) => setInviteFormData({ ...inviteFormData, last_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={inviteFormData.role}
                onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                required
              >
                <option value="team">Team Member</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Team Member:</strong> Can manage bookings, payments, and guests.
                <br />
                <strong>Admin:</strong> Full access including team management and pricing.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteTeamMember.isPending}>
                {inviteTeamMember.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                required
              >
                <option value="team">Team Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTeamMember.isPending}>
                {updateTeamMember.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
