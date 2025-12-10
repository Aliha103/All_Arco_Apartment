'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PricingRuleModal from '@/components/pms/PricingRuleModal';
import { PricingRule } from '@/types';
import { toast } from 'sonner';
import { Loader2, Wand2, PiggyBank, Sparkles, CalendarDays, Shield, PlusCircle } from 'lucide-react';

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);

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
    pet_cleaning_fee: '',
    extra_guest_fee: '',
    tourist_tax_per_person_per_night: '',
  });

  const updateSettings = useMutation({
    mutationFn: (data: any) => api.pricing.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setIsEditingSettings(false);
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleEdit = () => {
    if (settings) {
      setFormData({
        default_nightly_rate: settings.default_nightly_rate ?? '',
        cleaning_fee: settings.cleaning_fee ?? '',
        pet_cleaning_fee: settings.pet_cleaning_fee ?? '',
        extra_guest_fee: settings.extra_guest_fee ?? settings.extra_guest_fee_per_person ?? '',
        tourist_tax_per_person_per_night: settings.tourist_tax_per_person_per_night ?? '',
      });
      setIsEditingSettings(true);
    }
  };

  // Delete rule mutation
  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => api.pricing.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Pricing rule deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete pricing rule');
    },
  });

  const handleCreateRule = () => {
    setSelectedRule(null);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleDeleteRule = (rule: PricingRule) => {
    if (confirm(`Delete pricing rule "${rule.name}"? This action cannot be undone.`)) {
      deleteRule.mutate(rule.id);
    }
  };

  const handleRuleModalClose = () => {
    setIsRuleModalOpen(false);
    setSelectedRule(null);
  };

  const stats = useMemo(() => {
    if (!settings) return null;
    return [
      { label: 'Nightly base', value: formatCurrency(settings.default_nightly_rate), icon: Wand2 },
      { label: 'Cleaning', value: formatCurrency(settings.cleaning_fee), icon: Shield },
      { label: 'Pet cleaning', value: formatCurrency(settings.pet_cleaning_fee || 0), icon: Sparkles },
      { label: 'Tourist tax', value: formatCurrency(settings.tourist_tax_per_person_per_night), icon: PiggyBank },
    ];
  }, [settings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0b1223] to-[#0f172a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-200">
            <Sparkles className="w-4 h-4" />
            Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Pricing Management</h1>
          <p className="text-slate-300 max-w-3xl">
            Control base rates, fees, and seasonal rules in one place. Changes take effect immediately across booking and check-in flows.
          </p>
        </div>

        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="bg-white/5 border-white/10 backdrop-blur">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-300">{s.label}</p>
                      <p className="text-xl font-semibold text-white mt-1">{s.value}</p>
                    </div>
                    <div className="p-2 rounded-full bg-amber-500/20 text-amber-200">
                      <Icon className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Base Settings */}
        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-amber-200 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Base Pricing Settings
              </p>
              <CardTitle className="text-2xl text-white">Core fees & taxes</CardTitle>
              <p className="text-slate-300 text-sm">Update nightly, cleaning, pet cleaning, extras, and tourist tax.</p>
            </div>
            {!isEditingSettings && (
              <Button variant="secondary" onClick={handleEdit} className="bg-amber-500 text-black hover:bg-amber-400">
                Edit settings
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!isEditingSettings ? (
              <div className="grid md:grid-cols-2 gap-6 text-white">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 mb-1">Default Nightly Rate</p>
                  <p className="text-2xl font-semibold">{settings ? formatCurrency(settings.default_nightly_rate) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 mb-1">Cleaning Fee</p>
                  <p className="text-2xl font-semibold">{settings ? formatCurrency(settings.cleaning_fee) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 mb-1">Pet Cleaning Fee</p>
                  <p className="text-2xl font-semibold">{settings ? formatCurrency(settings.pet_cleaning_fee || 0) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 mb-1">Extra Guest Fee (per person)</p>
                  <p className="text-2xl font-semibold">{settings ? formatCurrency(settings.extra_guest_fee ?? settings.extra_guest_fee_per_person ?? 0) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 mb-1">Tourist Tax (per person/night)</p>
                  <p className="text-2xl font-semibold">{settings ? formatCurrency(settings.tourist_tax_per_person_per_night) : '—'}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Default Nightly Rate (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.default_nightly_rate}
                      onChange={(e) => setFormData({ ...formData, default_nightly_rate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Cleaning Fee (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cleaning_fee}
                      onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Pet Cleaning Fee (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pet_cleaning_fee}
                      onChange={(e) => setFormData({ ...formData, pet_cleaning_fee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Extra Guest Fee (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.extra_guest_fee}
                      onChange={(e) => setFormData({ ...formData, extra_guest_fee: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Tourist Tax (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tourist_tax_per_person_per_night}
                      onChange={(e) =>
                        setFormData({ ...formData, tourist_tax_per_person_per_night: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={updateSettings.isPending} className="bg-amber-500 text-black hover:bg-amber-400">
                    {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {updateSettings.isPending ? 'Saving...' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditingSettings(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Seasonal Rules */}
        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-200" />
              <div>
                <p className="text-sm text-amber-200">Seasonal Pricing Rules</p>
                <CardTitle className="text-xl text-white">Rate overrides by season</CardTitle>
              </div>
            </div>
            <Button onClick={handleCreateRule} className="bg-white text-black hover:bg-slate-100 flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Add new rule
            </Button>
          </CardHeader>
          <CardContent>
            {rules && rules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-200">Name</TableHead>
                    <TableHead className="text-slate-200">Start Date</TableHead>
                    <TableHead className="text-slate-200">End Date</TableHead>
                    <TableHead className="text-slate-200">Nightly Rate</TableHead>
                    <TableHead className="text-slate-200">Status</TableHead>
                    <TableHead className="text-slate-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule: PricingRule) => (
                    <TableRow key={rule.id} className="border-white/5">
                      <TableCell className="font-medium text-white">{rule.name}</TableCell>
                      <TableCell className="text-slate-200">{formatDate(rule.start_date)}</TableCell>
                      <TableCell className="text-slate-200">{formatDate(rule.end_date)}</TableCell>
                      <TableCell className="font-semibold text-white">
                        {formatCurrency(rule.nightly_rate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={rule.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-800'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRule(rule)}
                            disabled={deleteRule.isPending}
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
              <div className="text-center py-10 text-slate-300">
                <p className="mb-3 text-lg">No seasonal rules defined</p>
                <p className="text-sm text-slate-400">Create your first rule to override the base rate during high/low seasons.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Rule Modal */}
        <PricingRuleModal
          isOpen={isRuleModalOpen}
          onClose={handleRuleModalClose}
          rule={selectedRule}
        />
      </div>
    </div>

      {/* Pricing Rule Modal */}
      <PricingRuleModal
        isOpen={isRuleModalOpen}
        onClose={handleRuleModalClose}
        rule={selectedRule}
      />
    </div>
  );
}
