'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: async () => {
      const response = await api.pricing.getSettings();
      return response.data;
    },
  });

  const { data: rules } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const response = await api.pricing.listRules();
      return response.data.results || response.data;
    },
  });

  const [formData, setFormData] = useState({
    default_nightly_rate: '',
    cleaning_fee: '',
    extra_guest_fee_per_person: '',
    tourist_tax_per_person_per_night: '',
  });

  const updateSettings = useMutation({
    mutationFn: (data: any) => api.pricing.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setIsEditingSettings(false);
      alert('Settings updated successfully');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleEdit = () => {
    if (settings) {
      setFormData({
        default_nightly_rate: settings.default_nightly_rate,
        cleaning_fee: settings.cleaning_fee,
        extra_guest_fee_per_person: settings.extra_guest_fee_per_person,
        tourist_tax_per_person_per_night: settings.tourist_tax_per_person_per_night,
      });
      setIsEditingSettings(true);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pricing Management</h1>
        <p className="text-gray-600">Configure rates and seasonal pricing</p>
      </div>

      {/* Base Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Base Pricing Settings</CardTitle>
            {!isEditingSettings && (
              <Button variant="outline" onClick={handleEdit}>
                Edit Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditingSettings ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Default Nightly Rate</p>
                <p className="text-2xl font-bold">
                  {settings ? formatCurrency(settings.default_nightly_rate) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Cleaning Fee</p>
                <p className="text-2xl font-bold">
                  {settings ? formatCurrency(settings.cleaning_fee) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Extra Guest Fee (per person)</p>
                <p className="text-2xl font-bold">
                  {settings ? formatCurrency(settings.extra_guest_fee_per_person) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tourist Tax (per person/night)</p>
                <p className="text-2xl font-bold">
                  {settings ? formatCurrency(settings.tourist_tax_per_person_per_night) : '-'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Nightly Rate (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_nightly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, default_nightly_rate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cleaning Fee (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cleaning_fee}
                    onChange={(e) =>
                      setFormData({ ...formData, cleaning_fee: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extra Guest Fee (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.extra_guest_fee_per_person}
                    onChange={(e) =>
                      setFormData({ ...formData, extra_guest_fee_per_person: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tourist Tax (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tourist_tax_per_person_per_night}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tourist_tax_per_person_per_night: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingSettings(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Seasonal Pricing Rules</CardTitle>
            <Button>Add New Rule</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Nightly Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{formatDate(rule.start_date)}</TableCell>
                    <TableCell>{formatDate(rule.end_date)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(rule.nightly_rate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No seasonal rules defined</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
