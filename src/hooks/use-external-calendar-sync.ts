import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalCalendarProvider, ExternalCalendarSyncConfig, SyncStatus } from '@/types/calendar';

interface SyncResult {
  success: boolean;
  importedEvents: number;
  updatedEvents: number;
  skippedEvents: number;
  errorEvents: number;
  errors: string[];
  duration: number;
}

interface ConnectionTestResult {
  success: boolean;
  provider: ExternalCalendarProvider;
  connected: boolean;
  message?: string;
  error?: string;
}

interface SyncProgress {
  totalEvents: number;
  processedEvents: number;
  skippedEvents: number;
  errorEvents: number;
  currentOperation: string;
  isComplete: boolean;
}

const EXTERNAL_CALENDAR_QUERY_KEY = 'externalCalendars';

export function useExternalCalendarSync() {
  const queryClient = useQueryClient();
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgress>>({});

  // Get external calendar configurations
  const {
    data: syncConfigs = [],
    isLoading: isLoadingConfigs,
    error: configsError,
    refetch: refetchConfigs
  } = useQuery({
    queryKey: [EXTERNAL_CALENDAR_QUERY_KEY],
    queryFn: async (): Promise<ExternalCalendarSyncConfig[]> => {
      const response = await fetch('/api/calendar/external');
      if (!response.ok) {
        throw new Error('Failed to fetch external calendar configurations');
      }
      const data = await response.json();
      return data.data || [];
    }
  });

  // Test connection to external calendar
  const testConnectionMutation = useMutation({
    mutationFn: async ({ provider, accessToken }: {
      provider: ExternalCalendarProvider;
      accessToken: string;
    }): Promise<ConnectionTestResult> => {
      const response = await fetch('/api/calendar/external/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, accessToken }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed');
      }

      return data;
    }
  });

  // Connect external calendar
  const connectMutation = useMutation({
    mutationFn: async ({
      provider,
      accessToken,
      refreshToken,
      syncDirection = 'bidirectional',
      conflictResolution = 'local_wins'
    }: {
      provider: ExternalCalendarProvider;
      accessToken: string;
      refreshToken?: string;
      syncDirection?: 'import' | 'export' | 'bidirectional';
      conflictResolution?: 'local_wins' | 'remote_wins' | 'manual';
    }): Promise<ExternalCalendarSyncConfig[]> => {
      const response = await fetch('/api/calendar/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          accessToken,
          refreshToken,
          syncDirection,
          conflictResolution
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect external calendar');
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_CALENDAR_QUERY_KEY] });
    }
  });

  // Update sync configuration
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      id,
      syncDirection,
      syncInterval,
      settings
    }: {
      id: string;
      syncDirection?: 'import' | 'export' | 'bidirectional';
      syncInterval?: number;
      settings?: any;
    }): Promise<ExternalCalendarSyncConfig> => {
      const response = await fetch('/api/calendar/external', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          syncDirection,
          syncInterval,
          settings
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update sync configuration');
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_CALENDAR_QUERY_KEY] });
    }
  });

  // Disconnect external calendar
  const disconnectMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/calendar/external?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect external calendar');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_CALENDAR_QUERY_KEY] });
    }
  });

  // Trigger manual sync
  const syncMutation = useMutation({
    mutationFn: async ({
      syncConfigId,
      direction = 'import'
    }: {
      syncConfigId: string;
      direction?: 'import' | 'export';
    }): Promise<SyncResult> => {
      const response = await fetch('/api/calendar/external/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncConfigId,
          direction
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      return data.data;
    },
    onSuccess: () => {
      // Invalidate calendar events to show updated data
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_CALENDAR_QUERY_KEY] });
    }
  });

  // Get sync status
  const getSyncStatus = useCallback(async (syncConfigId: string) => {
    const response = await fetch(`/api/calendar/external/sync?id=${syncConfigId}`);
    if (!response.ok) {
      throw new Error('Failed to get sync status');
    }
    const data = await response.json();
    return data.data;
  }, []);

  // Test connection wrapper
  const testConnection = useCallback(
    async (provider: ExternalCalendarProvider, accessToken: string) => {
      return testConnectionMutation.mutateAsync({ provider, accessToken });
    },
    [testConnectionMutation]
  );

  // Connect external calendar wrapper
  const connectExternalCalendar = useCallback(
    async (options: {
      provider: ExternalCalendarProvider;
      accessToken: string;
      refreshToken?: string;
      syncDirection?: 'import' | 'export' | 'bidirectional';
      conflictResolution?: 'local_wins' | 'remote_wins' | 'manual';
    }) => {
      return connectMutation.mutateAsync(options);
    },
    [connectMutation]
  );

  // Update configuration wrapper
  const updateSyncConfig = useCallback(
    async (options: {
      id: string;
      syncDirection?: 'import' | 'export' | 'bidirectional';
      syncInterval?: number;
      settings?: any;
    }) => {
      return updateConfigMutation.mutateAsync(options);
    },
    [updateConfigMutation]
  );

  // Disconnect external calendar wrapper
  const disconnectExternalCalendar = useCallback(
    async (id: string) => {
      return disconnectMutation.mutateAsync(id);
    },
    [disconnectMutation]
  );

  // Trigger sync wrapper
  const triggerSync = useCallback(
    async (syncConfigId: string, direction: 'import' | 'export' = 'import') => {
      return syncMutation.mutateAsync({ syncConfigId, direction });
    },
    [syncMutation]
  );

  // Get connected calendars by provider
  const getConfigsByProvider = useCallback(
    (provider: ExternalCalendarProvider) => {
      return syncConfigs.filter(config => config.provider === provider);
    },
    [syncConfigs]
  );

  // Check if provider is connected
  const isProviderConnected = useCallback(
    (provider: ExternalCalendarProvider) => {
      return syncConfigs.some(config =>
        config.provider === provider &&
        ['connected', 'syncing'].includes(config.sync_status as string)
      );
    },
    [syncConfigs]
  );

  // Get sync statistics
  const getSyncStats = useCallback(() => {
    const stats = {
      totalConfigs: syncConfigs.length,
      connectedConfigs: syncConfigs.filter(c => c.sync_status === 'connected').length,
      errorConfigs: syncConfigs.filter(c => c.sync_status === 'error').length,
      syncingConfigs: syncConfigs.filter(c => c.sync_status === 'syncing').length,
      providers: [...new Set(syncConfigs.map(c => c.provider))]
    };
    return stats;
  }, [syncConfigs]);

  return {
    // Data
    syncConfigs,
    syncProgress,

    // Loading states
    isLoadingConfigs,
    isTestingConnection: testConnectionMutation.isPending,
    isConnecting: connectMutation.isPending,
    isUpdating: updateConfigMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,

    // Errors
    configsError,
    testConnectionError: testConnectionMutation.error,
    connectError: connectMutation.error,
    updateError: updateConfigMutation.error,
    disconnectError: disconnectMutation.error,
    syncError: syncMutation.error,

    // Actions
    testConnection,
    connectExternalCalendar,
    updateSyncConfig,
    disconnectExternalCalendar,
    triggerSync,
    getSyncStatus,
    refetchConfigs,

    // Utilities
    getConfigsByProvider,
    isProviderConnected,
    getSyncStats,

    // Reset functions
    resetTestConnection: testConnectionMutation.reset,
    resetConnect: connectMutation.reset,
    resetUpdate: updateConfigMutation.reset,
    resetDisconnect: disconnectMutation.reset,
    resetSync: syncMutation.reset,
  };
}