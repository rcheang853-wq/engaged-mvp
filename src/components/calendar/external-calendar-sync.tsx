'use client';

import React, { useState } from 'react';
import { useExternalCalendarSync } from '@/hooks/use-external-calendar-sync';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalCalendarProvider } from '@/types/calendar';

interface ExternalCalendarSyncProps {
  className?: string;
}

export function ExternalCalendarSync({ className = '' }: ExternalCalendarSyncProps) {
  const {
    syncConfigs,
    isLoadingConfigs,
    isConnecting,
    isSyncing,
    isTestingConnection,
    isDisconnecting,
    connectExternalCalendar,
    triggerSync,
    disconnectExternalCalendar,
    testConnection,
    getSyncStats,
    isProviderConnected
  } = useExternalCalendarSync();

  const [selectedProvider, setSelectedProvider] = useState<ExternalCalendarProvider | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const stats = getSyncStats();

  const providers = [
    {
      id: 'google' as ExternalCalendarProvider,
      name: 'Google Calendar',
      icon: '🗓️',
      color: 'bg-blue-500',
      description: 'Sync with your Google Calendar events'
    },
    {
      id: 'outlook' as ExternalCalendarProvider,
      name: 'Outlook Calendar',
      icon: '📅',
      color: 'bg-blue-600',
      description: 'Sync with your Microsoft Outlook calendar'
    }
  ];

  const handleConnect = async () => {
    if (!selectedProvider || !accessToken.trim()) return;

    try {
      // First test the connection
      const testResult = await testConnection(selectedProvider, accessToken);
      if (!testResult.success) {
        return;
      }

      // Connect if test successful
      await connectExternalCalendar({
        provider: selectedProvider,
        accessToken: accessToken.trim(),
        syncDirection: 'bidirectional',
        conflictResolution: 'local_wins'
      });

      // Reset form
      setAccessToken('');
      setSelectedProvider(null);
      setShowSetup(false);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleSync = async (configId: string, direction: 'import' | 'export' = 'import') => {
    try {
      await triggerSync(configId, direction);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleDisconnect = async (configId: string) => {
    try {
      await disconnectExternalCalendar(configId);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'syncing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoadingConfigs) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading external calendars...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">External Calendars</h2>
            <p className="text-sm text-gray-500">
              Sync with Google Calendar, Outlook, and other services
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowSetup(!showSetup)}
          className="flex items-center space-x-2"
          disabled={isConnecting || isTestingConnection}
        >
          <Plus className="w-4 h-4" />
          <span>Connect Calendar</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Calendars</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalConfigs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Connected</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.connectedConfigs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Syncing</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.syncingConfigs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Errors</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.errorConfigs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Form */}
      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white rounded-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect External Calendar</h3>

            {/* Provider Selection */}
            <div className="space-y-4 mb-6">
              <label className="text-sm font-medium text-gray-700">Choose Provider</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    disabled={isProviderConnected(provider.id)}
                    className={`relative p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedProvider === provider.id
                        ? 'border-blue-500 bg-blue-50'
                        : isProviderConnected(provider.id)
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                        {provider.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{provider.name}</h4>
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      </div>
                      {isProviderConnected(provider.id) && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Access Token Input */}
            {selectedProvider && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={`Enter your ${providers.find(p => p.id === selectedProvider)?.name} access token`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can get this from your {providers.find(p => p.id === selectedProvider)?.name} API settings
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleConnect}
                    disabled={!accessToken.trim() || isConnecting || isTestingConnection}
                    className="flex items-center space-x-2"
                  >
                    {isConnecting || isTestingConnection ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4" />
                    )}
                    <span>
                      {isTestingConnection ? 'Testing...' : isConnecting ? 'Connecting...' : 'Connect'}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetup(false);
                      setAccessToken('');
                      setSelectedProvider(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected Calendars List */}
      <div className="space-y-4">
        {syncConfigs.length === 0 ? (
          <div className="text-center py-12">
            <CloudOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No External Calendars</h3>
            <p className="text-gray-500 mb-4">
              Connect your Google Calendar, Outlook, or other calendar services to sync events.
            </p>
            <Button onClick={() => setShowSetup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        ) : (
          syncConfigs.map((config) => (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    providers.find(p => p.id === config.provider)?.color || 'bg-gray-500'
                  }`}>
                    <span className="text-white text-lg">
                      {providers.find(p => p.id === config.provider)?.icon || '📅'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{config.calendar_name}</h3>
                      <div className={`px-2 py-1 rounded-full border text-xs font-medium ${
                        getStatusColor(config.sync_status as string)
                      }`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(config.sync_status as string)}
                          <span className="capitalize">{config.sync_status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="capitalize">{config.provider}</span>
                      <span>•</span>
                      <span className="capitalize">{config.sync_direction}</span>
                      {config.last_sync_at && (
                        <>
                          <span>•</span>
                          <span>Last sync: {new Date(config.last_sync_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>

                    {config.last_error && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {config.last_error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(config.id, 'import')}
                    disabled={isSyncing || config.sync_status === 'syncing'}
                    className="flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Import</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(config.id, 'export')}
                    disabled={isSyncing || config.sync_status === 'syncing'}
                    className="flex items-center space-x-1"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Export</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(config.id)}
                    disabled={isDisconnecting}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}