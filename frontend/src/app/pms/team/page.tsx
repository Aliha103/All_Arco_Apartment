'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Role, Permission } from '@/types';
import { toast } from 'sonner';

export default function TeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'team' | 'roles'>('team');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);

  // Permission check - requires roles.manage or team.view
  useEffect(() => {
    if (!authLoading && (!user || !hasPermission('team.view'))) {
      router.push('/pms');
    }
  }, [user, authLoading, hasPermission, router]);

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await api.users.team.list();
      return response.data.results || response.data;
    },
    enabled: hasPermission('team.view'),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.users.roles.list();
      const data = response.data;
      // Ensure we always return an array
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: hasPermission('roles.manage'),
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.users.permissions.byGroup();
      return response.data;
    },
    enabled: hasPermission('roles.manage'),
  });

  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    assigned_role_id: '',
  });

  const [editFormData, setEditFormData] = useState({
    assigned_role_id: '',
    is_active: true,
  });

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const inviteTeamMember = useMutation({
    mutationFn: (data: any) => api.users.team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsInviteModalOpen(false);
      setInviteFormData({ email: '', first_name: '', last_name: '', assigned_role_id: '' });
      toast.success('Team member invited successfully. Invitation email sent.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to invite team member');
    },
  });

  const updateTeamMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.users.team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsEditModalOpen(false);
      setSelectedMember(null);
      toast.success('Team member updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update team member');
    },
  });

  const deleteTeamMember = useMutation({
    mutationFn: (id: string) => api.users.team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove team member');
    },
  });

  // Role management mutations
  const createRole = useMutation({
    mutationFn: async (data: any) => {
      // First create the role
      const response = await api.users.roles.create(data);
      return response.data;
    },
    onSuccess: async (roleData) => {
      // Then assign permissions if any selected
      if (selectedPermissions.length > 0) {
        try {
          await api.users.roles.assignPermissions(roleData.id, selectedPermissions);
        } catch (error) {
          console.error('Failed to assign permissions:', error);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
      setRoleFormData({ name: '', description: '' });
      setSelectedPermissions([]);
      setIsEditingRole(false);
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create role');
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, data, permissions }: { id: string; data: any; permissions: string[] }) => {
      // First update the role
      await api.users.roles.update(id, data);
      // Then update permissions
      await api.users.roles.assignPermissions(id, permissions);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      setRoleFormData({ name: '', description: '' });
      setSelectedPermissions([]);
      setIsEditingRole(false);
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    },
  });

  const deleteRole = useMutation({
    mutationFn: (id: string) => api.users.roles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete role');
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
      assigned_role_id: member.assigned_role_id || '',
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

  if (!user || !hasPermission('team.view')) {
    return null;
  }

  const canManageRoles = hasPermission('roles.manage');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team & Roles</h1>
        <p className="text-gray-600">Manage team members, roles, and permissions</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('team')}
          >
            Team Members ({teamMembers?.length || 0})
          </button>
          {canManageRoles && (
            <button
              className={`px-4 py-2 font-medium border-b-2 ${
                activeTab === 'roles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('roles')}
            >
              Roles ({roles?.length || 0})
            </button>
          )}
        </div>
      </div>

      {/* Team Members Tab */}
      {activeTab === 'team' && (

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
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && canManageRoles && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Roles ({roles?.length || 0})</CardTitle>
              <Button
                onClick={() => {
                  setSelectedRole(null);
                  setRoleFormData({ name: '', description: '' });
                  setSelectedPermissions([]);
                  setIsEditingRole(false);
                  setIsRoleModalOpen(true);
                }}
              >
                Create Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {roles && roles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: Role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {role.name}
                        {role.is_system && (
                          <Badge variant="secondary" className="ml-2">System</Badge>
                        )}
                        {role.is_super_admin && (
                          <Badge variant="destructive" className="ml-2">Super Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {role.is_super_admin ? (
                          <Badge variant="destructive">All Permissions</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {role.permission_codes && role.permission_codes.length > 0 ? (
                              <>
                                {role.permission_codes.slice(0, 3).map((code) => (
                                  <Badge key={code} variant="outline" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                                {role.permission_codes.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{role.permission_codes.length - 3} more
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">No permissions</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{role.member_count || 0}</TableCell>
                      <TableCell>
                        {!role.is_super_admin ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role);
                                setRoleFormData({
                                  name: role.name,
                                  description: role.description || '',
                                });
                                setSelectedPermissions(role.permission_codes || []);
                                setIsEditingRole(true);
                                setIsRoleModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Check if user has permission to delete
                                const isSuperAdmin = user?.is_super_admin || (user as any)?.role_info?.is_super_admin;

                                // If not super admin and role is system, block
                                if (!isSuperAdmin && role.is_system) {
                                  toast.error(`Cannot delete system role "${role.name}" - only Super Admin can delete system roles`);
                                  return;
                                }

                                // Check member count
                                if ((role.member_count || 0) > 0) {
                                  toast.error(`Cannot delete role "${role.name}" - it has ${role.member_count} assigned member(s). Please reassign them first.`);
                                  return;
                                }

                                // Confirm deletion
                                const warningMsg = role.is_system
                                  ? `Delete SYSTEM role "${role.name}"? This is a protected system role. This action cannot be undone.`
                                  : `Delete role "${role.name}"? This cannot be undone.`;

                                if (confirm(warningMsg)) {
                                  deleteRole.mutate(role.id!);
                                }
                              }}
                              disabled={(role.member_count || 0) > 0}
                              className={role.is_system && !(user?.is_super_admin || (user as any)?.role_info?.is_super_admin) ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Protected</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-600">No custom roles yet</p>
            )}
          </CardContent>
        </Card>
      )}

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
                value={inviteFormData.assigned_role_id}
                onChange={(e) => setInviteFormData({ ...inviteFormData, assigned_role_id: e.target.value })}
                required
              >
                <option value="">Select a role...</option>
                {roles?.map((role: Role) => (
                  <option key={role.id} value={role.id || ''}>
                    {role.name}
                    {role.is_super_admin && ' (Full Access)'}
                  </option>
                ))}
              </select>
              {inviteFormData.assigned_role_id && (
                <p className="text-xs text-gray-600 mt-1">
                  {roles?.find((r: Role) => r.id === inviteFormData.assigned_role_id)?.description}
                </p>
              )}
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
                value={editFormData.assigned_role_id}
                onChange={(e) => setEditFormData({ ...editFormData, assigned_role_id: e.target.value })}
                required
              >
                <option value="">Select a role...</option>
                {roles?.map((role: Role) => (
                  <option key={role.id} value={role.id || ''}>
                    {role.name}
                  </option>
                ))}
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

      {/* Role Create/Edit Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedRole) {
                updateRole.mutate({
                  id: selectedRole.id!,
                  data: roleFormData,
                  permissions: selectedPermissions
                });
              } else {
                createRole.mutate(roleFormData);
              }
            }}
            className="space-y-6"
          >
            {/* Role Details */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-lg">Role Details</h3>
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  type="text"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  placeholder="e.g., Front Desk, Accounting"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            {/* Permissions Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Permissions</h3>
                <div className="text-sm text-gray-600">
                  {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
                </div>
              </div>

              {permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(permissions).map(([group, perms]: [string, any]) => (
                    <div key={group} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold capitalize text-sm">
                          {group.replace(/_/g, ' ')}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => {
                            const groupPerms = Array.isArray(perms) ? perms.map((p: any) => p.code) : [];
                            const allSelected = groupPerms.every((code: string) =>
                              selectedPermissions.includes(code)
                            );
                            if (allSelected) {
                              // Deselect all in group
                              setSelectedPermissions(
                                selectedPermissions.filter((c) => !groupPerms.includes(c))
                              );
                            } else {
                              // Select all in group
                              setSelectedPermissions([
                                ...selectedPermissions.filter((c) => !groupPerms.includes(c)),
                                ...groupPerms,
                              ]);
                            }
                          }}
                        >
                          {Array.isArray(perms) &&
                           perms.every((p: any) => selectedPermissions.includes(p.code))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {Array.isArray(perms) && perms.map((perm: any) => (
                          <div key={perm.code} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id={`${group}-${perm.code}`}
                              checked={selectedPermissions.includes(perm.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, perm.code]);
                                } else {
                                  setSelectedPermissions(
                                    selectedPermissions.filter((c) => c !== perm.code)
                                  );
                                }
                              }}
                              className="mt-1 w-4 h-4"
                            />
                            <Label
                              htmlFor={`${group}-${perm.code}`}
                              className="cursor-pointer flex-1 font-normal"
                            >
                              <div className="font-mono text-xs text-blue-600">{perm.code}</div>
                              <div className="text-xs text-gray-600">{perm.description}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-600 border rounded-lg">
                  No permissions available. Please seed RBAC data first.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setSelectedRole(null);
                  setRoleFormData({ name: '', description: '' });
                  setSelectedPermissions([]);
                  setIsEditingRole(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {createRole.isPending || updateRole.isPending ? 'Saving...' : (selectedRole ? 'Save Changes' : 'Create Role')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
