'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Key,
  Server,
  Info,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface AlloggiatiAccount {
  id: string;
  username: string | null;
  token: string | null;
  token_expires_at: string | null;
  last_fetched_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AlloggiatiPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch account status
  const { data: account, isLoading, error } = useQuery({
    queryKey: ['alloggiati-account'],
    queryFn: async () => {
      const response = await api.alloggiati.getAccount();
      return response.data as AlloggiatiAccount;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Refresh token mutation
  const refreshTokenMutation = useMutation({
    mutationFn: () => api.alloggiati.refreshToken(),
    onMutate: () => {
      setIsRefreshing(true);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['alloggiati-account'] });
      toast.success('Token refreshed successfully');
      setIsRefreshing(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to refresh token';
      toast.error(errorMessage);
      setIsRefreshing(false);
    },
  });

  const handleRefreshToken = () => {
    refreshTokenMutation.mutate();
  };

  // Calculate token status
  const tokenIsValid = account?.token && account?.token_expires_at
    ? new Date(account.token_expires_at) > new Date()
    : false;

  const hasCredentials = Boolean(account?.username);
  const hasToken = Boolean(account?.token);
  const hasError = Boolean(account?.last_error);

  // Status badge
  const getStatusBadge = () => {
    if (hasError) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    }
    if (tokenIsValid) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
    if (hasToken) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Not Configured
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              Alloggiati Web Integration
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Italian Police (Polizia di Stato) guest reporting system
            </p>
          </div>
          {hasCredentials && (
            <Button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Token
                </>
              )}
            </Button>
          )}
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
                <p>
                  The Alloggiati Web system is required by Italian law for all accommodation facilities to report guest information to the State Police.
                  This integration allows you to automatically send guest data from your bookings to the police system.
                </p>
                <a
                  href="https://alloggiatiweb.poliziadistato.it"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-blue-700 hover:text-blue-900 font-medium"
                >
                  Visit Alloggiati Web Portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                {getStatusBadge()}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Connection Status</h3>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? 'Loading...' : tokenIsValid ? 'Connected' : 'Disconnected'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credentials Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Key className="w-6 h-6 text-purple-600" />
                </div>
                {hasCredentials ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Credentials</h3>
              <p className="text-2xl font-bold text-gray-900">
                {hasCredentials ? 'Set' : 'Not Set'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Token Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${tokenIsValid ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Clock className={`w-6 h-6 ${tokenIsValid ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                {hasToken ? (
                  tokenIsValid ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300">Valid</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Expired</Badge>
                  )
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 border-gray-300">None</Badge>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Session Token</h3>
              <p className="text-2xl font-bold text-gray-900">
                {hasToken ? (tokenIsValid ? 'Valid' : 'Expired') : 'None'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Account Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Current configuration and token status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-gray-600">Loading account information...</div>
            ) : error ? (
              <div className="py-8 text-center text-red-600">
                <XCircle className="w-12 h-12 mx-auto mb-4" />
                <p>Failed to load account information</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Username */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                  <div className="text-sm font-medium text-gray-600">Username</div>
                  <div className="sm:col-span-2">
                    {account?.username ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">{account.username}</span>
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Configured
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Not configured</span>
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          From Environment
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Token */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                  <div className="text-sm font-medium text-gray-600">Session Token</div>
                  <div className="sm:col-span-2">
                    {account?.token ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-900">
                          {account.token.substring(0, 20)}...
                        </code>
                        {tokenIsValid ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">No token available</span>
                    )}
                  </div>
                </div>

                {/* Token Expiry */}
                {account?.token_expires_at && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                    <div className="text-sm font-medium text-gray-600">Token Expires</div>
                    <div className="sm:col-span-2">
                      <span className={`text-gray-900 ${!tokenIsValid ? 'text-red-600 font-medium' : ''}`}>
                        {formatDate(account.token_expires_at)}
                      </span>
                      {!tokenIsValid && (
                        <span className="ml-2 text-xs text-red-600">(Expired)</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Fetched */}
                {account?.last_fetched_at && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b">
                    <div className="text-sm font-medium text-gray-600">Last Fetched</div>
                    <div className="sm:col-span-2 text-gray-900">
                      {formatDate(account.last_fetched_at)}
                    </div>
                  </div>
                )}

                {/* Last Error */}
                {account?.last_error && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
                    <div className="text-sm font-medium text-gray-600">Last Error</div>
                    <div className="sm:col-span-2">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-mono">{account.last_error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Setup Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>How to configure Alloggiati Web credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    1
                  </span>
                  Register on Alloggiati Web
                </h4>
                <p className="text-sm text-gray-600 ml-8">
                  Visit the official{' '}
                  <a
                    href="https://alloggiatiweb.poliziadistato.it"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Alloggiati Web portal
                  </a>{' '}
                  and register your accommodation facility. You will receive login credentials after approval.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    2
                  </span>
                  Configure Environment Variables
                </h4>
                <p className="text-sm text-gray-600 ml-8 mb-2">
                  Add your credentials to the backend environment variables:
                </p>
                <div className="ml-8 bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-100 overflow-x-auto">
                  <div>ALLOGGIATI_USERNAME=your_username</div>
                  <div>ALLOGGIATI_PASSWORD=your_password</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    3
                  </span>
                  Test Connection
                </h4>
                <p className="text-sm text-gray-600 ml-8 mb-2">
                  After setting the environment variables, click the "Refresh Token" button above to test the connection.
                  If successful, the system will fetch a session token and display it here.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    4
                  </span>
                  Automatic Reporting
                </h4>
                <p className="text-sm text-gray-600 ml-8">
                  Once configured, guest check-ins will automatically be reported to the Alloggiati Web system.
                  You can monitor the status and any errors on this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* API Endpoint Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="font-medium text-gray-600">SOAP Endpoint:</span>
                <span className="sm:col-span-2 text-gray-900 font-mono text-xs">
                  https://alloggiatiweb.poliziadistato.it/service/service.asmx
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="font-medium text-gray-600">Token Method:</span>
                <span className="sm:col-span-2 text-gray-900">GetToken (SOAP 1.1)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="font-medium text-gray-600">Auth Method:</span>
                <span className="sm:col-span-2 text-gray-900">Username/Password → Session Token</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
