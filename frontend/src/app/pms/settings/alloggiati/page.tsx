'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Info,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Types
interface AlloggiatiAccount {
  id: string;
  username: string | null;
  has_credentials: boolean;
  has_wskey: boolean;
  is_connected: boolean;
  last_test_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export default function AlloggiatiPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [wskey, setWskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showWskey, setShowWskey] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Fetch account status
  const { data: account, isLoading } = useQuery({
    queryKey: ['alloggiati-account'],
    queryFn: async () => {
      const response = await api.alloggiati.getAccount();
      return response.data as AlloggiatiAccount;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Save credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: (data: { username: string; password: string; wskey: string }) =>
      api.alloggiati.saveCredentials(data),
    onMutate: () => {
      setIsConfiguring(true);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['alloggiati-account'] });
      if (response.data.test_result) {
        toast.success('Connected successfully! ' + response.data.test_result);
      } else {
        toast.success('Credentials saved successfully!');
      }
      setIsConfiguring(false);
      // Clear sensitive fields
      setPassword('');
      setWskey('');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to save credentials';
      toast.error(errorMessage);
      setIsConfiguring(false);
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => api.alloggiati.testConnection(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['alloggiati-account'] });
      toast.success(response.data.message || 'Connection test successful!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Connection test failed';
      toast.error(errorMessage);
    },
  });

  const handleSaveCredentials = () => {
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    if (!wskey.trim()) {
      toast.error('Please enter your WSKEY');
      return;
    }

    const data = { username: username.trim(), wskey: wskey.trim(), password: password.trim() };

    saveCredentialsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const getConnectionBadge = () => {
    if (account?.is_connected) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    }
    if (account?.has_credentials) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Not Tested
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300">
        <XCircle className="w-3 h-3 mr-1" />
        Not Configured
      </Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Alloggiati Web Integration</h1>
            </div>
            <p className="text-sm text-gray-700">
              Italian State Police guest reporting with secure, automated WSKEY authentication.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                <Zap className="w-3 h-3 mr-1" />
                Auto-refresh every 30s
              </Badge>
              <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                <Lock className="w-3 h-3 mr-1" />
                Encrypted credentials
              </Badge>
            </div>
          </div>
          {getConnectionBadge()}
        </div>
      </motion.div>

      {/* Information Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">About Alloggiati Web</p>
                <p className="mb-2">
                  Required by Italian law for accommodation facilities to report guest information to State Police.
                  This integration uses WSKEY authentication for automatic guest reporting.
                </p>
                <a
                  href="https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/SupManuali.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium"
                >
                  View Official Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Configure Credentials
            </CardTitle>
            <CardDescription>
              Enter your Alloggiati Web credentials to enable automatic guest reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-5 max-w-2xl">
              {/* How to get WSKEY */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-2">How to get your WSKEY:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Login to <a href="https://alloggiatiweb.poliziadistato.it" target="_blank" rel="noopener noreferrer" className="font-medium underline">Alloggiati Web Portal</a></li>
                      <li>Click your username in the top right</li>
                      <li>Select <strong>"Chiave Web Service"</strong></li>
                      <li>Click <strong>"Genera Nuovo Codice"</strong> to generate WSKEY</li>
                      <li>Copy the generated WSKEY and paste it below</li>
                    </ol>
                    <p className="mt-2 text-xs text-amber-800">
                      <strong>Note:</strong> You can only generate a new WSKEY once per day. If you change your password, you must generate a new WSKEY.
                    </p>
                  </div>
                </div>
              </div>

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-900 font-medium flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-600" />
                  Username
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your Alloggiati Web username"
                  className="text-gray-900"
                  disabled={isConfiguring}
                />
                <p className="text-xs text-gray-500">The username you use to login to Alloggiati Web portal</p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-900 font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-600" />
                  Password
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Alloggiati Web password"
                    className="text-gray-900 pr-10"
                    disabled={isConfiguring}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Required for authentication. Encrypted at rest and only used for WSKEY regeneration/testing.</p>
              </div>

              {/* WSKEY Field */}
              <div className="space-y-2">
                <Label htmlFor="wskey" className="text-gray-900 font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  WSKEY (Web Service Key)
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="wskey"
                    type={showWskey ? 'text' : 'password'}
                    value={wskey}
                    onChange={(e) => setWskey(e.target.value)}
                    placeholder="Paste your WSKEY from Alloggiati Web portal"
                    className="text-gray-900 pr-10 font-mono"
                    disabled={isConfiguring}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWskey(!showWskey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showWskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Generate from: Account → Chiave Web Service → Genera Nuovo Codice
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isConfiguring || !username.trim() || !password.trim() || !wskey.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isConfiguring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving & Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save & Test Connection
                    </>
                  )}
                </Button>

                {account?.has_credentials && (
                  <Button
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                    variant="outline"
                    size="lg"
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Security Note */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong className="text-gray-900">Security:</strong> Your credentials are securely stored and encrypted.
                  They are only used for Alloggiati Web Service authentication.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Card */}
      {account && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current configuration and connection details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Username */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                  <div className="text-sm font-medium text-gray-600">Username</div>
                  <div className="sm:col-span-2">
                    {account.username ? (
                      <span className="text-gray-900 font-medium">{account.username}</span>
                    ) : (
                      <span className="text-gray-500">Not configured</span>
                    )}
                  </div>
                </div>

                {/* WSKEY Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                  <div className="text-sm font-medium text-gray-600">WSKEY Status</div>
                  <div className="sm:col-span-2">
                    {account.has_wskey ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Configured
                        </Badge>
                        <span className="text-xs text-gray-500">WSKEY is set</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Not Set
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                  <div className="text-sm font-medium text-gray-600">Connection</div>
                  <div className="sm:col-span-2">
                    {account.is_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                        {account.last_test_at && (
                          <span className="text-xs text-gray-500">
                            Last tested: {new Date(account.last_test_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disconnected
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last Error */}
                {account.last_error && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
                    <div className="text-sm font-medium text-gray-600">Last Error</div>
                    <div className="sm:col-span-2">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{account.last_error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
