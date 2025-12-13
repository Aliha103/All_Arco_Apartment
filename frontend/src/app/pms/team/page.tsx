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
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

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
    mutationFn: (data: any) => api.users.roles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
      setRoleFormData({ name: '', description: '' });
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create role');
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.users.roles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
      setSelectedRole(null);
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

  const assignPermissions = useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: string; permissionCodes: string[] }) =>
      api.users.roles.assignPermissions(roleId, permissionCodes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsPermissionModalOpen(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      toast.success('Permissions updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update permissions');
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
              <Button onClick={() => setIsRoleModalOpen(true)}>
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
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role);
                            setSelectedPermissions(role.permission_codes || []);
                            setIsPermissionModalOpen(true);
                          }}
                          disabled={role.is_super_admin}
                        >
                          {role.is_super_admin
                            ? 'All Permissions'
                            : `${role.permission_codes?.length || 0} permissions`}
                        </Button>
                      </TableCell>
                      <TableCell>{role.member_count || 0}</TableCell>
                      <TableCell>
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
                              setIsRoleModalOpen(true);
                            }}
                            disabled={role.is_system}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete role "${role.name}"? This cannot be undone.`)) {
                                deleteRole.mutate(role.id!);
                              }
                            }}
                            disabled={role.is_system || (role.member_count || 0) > 0}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedRole) {
                updateRole.mutate({ id: selectedRole.id!, data: roleFormData });
              } else {
                createRole.mutate(roleFormData);
              }
            }}
            className="space-y-4"
          >
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setSelectedRole(null);
                  setRoleFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {selectedRole ? 'Save Changes' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Modal */}
      <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Permissions: {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0 ? (
              Object.entries(permissions).map(([group, perms]: [string, any]) => (
                <div key={group} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 capitalize">
                    {group.replace('_', ' ')}
                  </h3>
                  <div className="space-y-2">
                    {Array.isArray(perms) && perms.map((perm: any) => (
                    <div key={perm.code} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={perm.code}
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
                        className="w-4 h-4"
                      />
                      <Label htmlFor={perm.code} className="cursor-pointer flex-1">
                        <span className="font-mono text-sm">{perm.code}</span>
                        <span className="text-xs text-gray-600 ml-2">
                          - {perm.description}
                        </span>
                      </Label>
                    </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-gray-600">No permissions available. Please seed RBAC data first.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPermissionModalOpen(false);
                setSelectedRole(null);
                setSelectedPermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRole) {
                  assignPermissions.mutate({
                    roleId: selectedRole.id!,
                    permissionCodes: selectedPermissions,
                  });
                }
              }}
              disabled={assignPermissions.isPending}
            >
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
