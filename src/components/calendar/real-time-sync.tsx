'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeSyncProps {
  userId: string;
  isEnabled?: boolean;
  onSyncUpdate?: (eventData: any) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

type SyncStatus = 'connected' | 'disconnected' | 'syncing' | 'error' | 'idle';

interface SyncEvent {
  id: string;
  type: 'created' | 'updated' | 'deleted';
  eventId: string;
  eventTitle: string;
  timestamp: Date;
  source: 'local' | 'external';
}

export const RealTimeSync: React.FC<RealTimeSyncProps> = ({
  userId,
  isEnabled = true,
  onSyncUpdate,
  onStatusChange
}) => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [showEvents, setShowEvents] = useState(false);

  // WebSocket connection for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);

  const updateStatus = useCallback((newStatus: SyncStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const addSyncEvent = useCallback((event: Omit<SyncEvent, 'id' | 'timestamp'>) => {
    const syncEvent: SyncEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      ...event
    };

    setSyncEvents(prev => [syncEvent, ...prev.slice(0, 9)]); // Keep last 10 events
    onSyncUpdate?.(syncEvent);
  }, [onSyncUpdate]);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!isEnabled || ws?.readyState === WebSocket.OPEN) return;

    try {
      // In production, this would be a secure WebSocket URL
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://${window.location.host}/api/calendar/ws`
        : `ws://localhost:${window.location.port || 3000}/api/calendar/ws`;

      const newWs = new WebSocket(`${wsUrl}?userId=${userId}`);

      newWs.onopen = () => {
        console.log('WebSocket connected');
        updateStatus('connected');
        setConnectionAttempts(0);
        setLastSync(new Date());
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newWs.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus('disconnected');
        setWs(null);

        // Attempt to reconnect with exponential backoff
        if (isEnabled && connectionAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            initializeWebSocket();
          }, delay);
        }
      };

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('error');
      };

      setWs(newWs);
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      updateStatus('error');
    }
  }, [userId, isEnabled, ws, connectionAttempts, updateStatus]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'calendar_event_created':
        addSyncEvent({
          type: 'created',
          eventId: data.event.id,
          eventTitle: data.event.title,
          source: data.source || 'external'
        });
        break;

      case 'calendar_event_updated':
        addSyncEvent({
          type: 'updated',
          eventId: data.event.id,
          eventTitle: data.event.title,
          source: data.source || 'external'
        });
        break;

      case 'calendar_event_deleted':
        addSyncEvent({
          type: 'deleted',
          eventId: data.eventId,
          eventTitle: data.eventTitle || 'Unknown Event',
          source: data.source || 'external'
        });
        break;

      case 'sync_status':
        updateStatus(data.status);
        if (data.lastSync) {
          setLastSync(new Date(data.lastSync));
        }
        break;

      case 'error':
        console.error('Calendar sync error:', data.message);
        updateStatus('error');
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, [addSyncEvent, updateStatus]);

  // Manual sync trigger
  const triggerManualSync = async () => {
    updateStatus('syncing');

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const result = await response.json();
        setLastSync(new Date());

        if (result.changes) {
          result.changes.forEach((change: any) => {
            addSyncEvent({
              type: change.type,
              eventId: change.eventId,
              eventTitle: change.eventTitle,
              source: 'external'
            });
          });
        }

        updateStatus('connected');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      updateStatus('error');
    }
  };

  // Periodic sync fallback (when WebSocket is not available)
  useEffect(() => {
    if (!isEnabled || status === 'connected') return;

    const interval = setInterval(() => {
      if (status !== 'syncing') {
        triggerManualSync();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isEnabled, status]);

  // Initialize WebSocket on mount
  useEffect(() => {
    if (isEnabled) {
      initializeWebSocket();
    }

    return () => {
      ws?.close();
    };
  }, [isEnabled, initializeWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Real-time sync active';
      case 'disconnected':
        return 'Offline - changes will sync when reconnected';
      case 'syncing':
        return 'Syncing changes...';
      case 'error':
        return 'Sync error - please check connection';
      default:
        return 'Ready to sync';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Sync Status */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        getStatusColor()
      )}>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="text-sm font-medium">{getStatusText()}</div>
            {lastSync && (
              <div className="text-xs opacity-75">
                Last sync: {lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncEvents.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
              className="text-xs"
            >
              {syncEvents.length} change{syncEvents.length > 1 ? 's' : ''}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={triggerManualSync}
            disabled={status === 'syncing'}
            className="flex items-center gap-1"
          >
            <RefreshCw className={cn('w-3 h-3', status === 'syncing' && 'animate-spin')} />
            {status === 'syncing' ? 'Syncing' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Recent Sync Events */}
      {showEvents && syncEvents.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <div className="text-sm font-medium text-gray-900 mb-3">Recent Changes</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {syncEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    event.type === 'created' && 'bg-green-500',
                    event.type === 'updated' && 'bg-blue-500',
                    event.type === 'deleted' && 'bg-red-500'
                  )} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {event.eventTitle}
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.type === 'created' && 'Created'}
                      {event.type === 'updated' && 'Updated'}
                      {event.type === 'deleted' && 'Deleted'}
                      {' '} • {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs">
                  {event.source === 'local' ? 'Local' : 'External'}
                </Badge>
              </div>
            ))}
          </div>

          {syncEvents.length > 10 && (
            <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t">
              Showing 10 most recent changes
            </div>
          )}
        </div>
      )}

      {/* Connection Issues Helper */}
      {status === 'error' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm font-medium text-yellow-800 mb-1">
            Connection Issues
          </div>
          <div className="text-xs text-yellow-700 mb-2">
            Real-time sync is currently unavailable. Your changes will be saved locally and synced when connection is restored.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={initializeWebSocket}
            className="text-xs"
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
};

export default RealTimeSync;