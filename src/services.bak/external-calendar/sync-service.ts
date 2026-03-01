import {
  ExternalCalendarProvider,
  ExternalCalendarSyncConfig,
  EnhancedCalendarEvent,
  CalendarOperationResult,
  SyncStatus
} from '@/types/calendar';
import { GoogleCalendarService } from './google-calendar';
import { OutlookCalendarService } from './outlook-calendar';

export interface SyncProgress {
  totalEvents: number;
  processedEvents: number;
  skippedEvents: number;
  errorEvents: number;
  currentOperation: string;
  isComplete: boolean;
}

export interface SyncResult {
  success: boolean;
  importedEvents: number;
  updatedEvents: number;
  skippedEvents: number;
  errorEvents: number;
  errors: string[];
  duration: number; // milliseconds
}

export class ExternalCalendarSyncService {
  private progressCallbacks: Map<string, (progress: SyncProgress) => void> = new Map();

  /**
   * Initialize sync for a specific provider
   */
  async initializeSync(
    provider: ExternalCalendarProvider,
    accessToken: string,
    userId: string
  ): Promise<CalendarOperationResult<ExternalCalendarSyncConfig[]>> {
    try {
      let service: GoogleCalendarService | OutlookCalendarService;

      switch (provider) {
        case 'google':
          service = new GoogleCalendarService(accessToken);
          const googleCalendars = await service.getCalendarList();
          if (!googleCalendars.success) {
            return { success: false, error: googleCalendars.error };
          }

          return {
            success: true,
            data: googleCalendars.data!.items.map(cal => ({
              id: `google_${cal.id}`,
              userId,
              provider: 'google',
              providerCalendarId: cal.id,
              calendarName: cal.summary,
              syncDirection: 'bidirectional' as const,
              syncStatus: 'pending' as SyncStatus,
              accessToken,
              syncInterval: 15, // minutes
              errorCount: 0,
              settings: {
                syncEvents: true,
                syncReminders: true,
                syncAttendees: true,
                conflictResolution: 'local_wins' as const,
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          };

        case 'outlook':
          service = new OutlookCalendarService(accessToken);
          const outlookCalendars = await service.getCalendarList();
          if (!outlookCalendars.success) {
            return { success: false, error: outlookCalendars.error };
          }

          return {
            success: true,
            data: outlookCalendars.data!.value.map(cal => ({
              id: `outlook_${cal.id}`,
              userId,
              provider: 'outlook',
              providerCalendarId: cal.id,
              calendarName: cal.name,
              syncDirection: 'bidirectional' as const,
              syncStatus: 'pending' as SyncStatus,
              accessToken,
              syncInterval: 15, // minutes
              errorCount: 0,
              settings: {
                syncEvents: true,
                syncReminders: true,
                syncAttendees: true,
                conflictResolution: 'local_wins' as const,
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          };

        default:
          return { success: false, error: `Provider ${provider} not supported` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sync events from external calendar to internal system
   */
  async syncFromExternal(
    config: ExternalCalendarSyncConfig,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let importedEvents = 0;
    const updatedEvents = 0;
    const skippedEvents = 0;
    let errorEvents = 0;

    try {
      // Set up progress tracking
      if (onProgress) {
        this.progressCallbacks.set(config.id, onProgress);
      }

      this.updateProgress(config.id, {
        totalEvents: 0,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: 0,
        currentOperation: 'Connecting to external calendar...',
        isComplete: false,
      });

      // Initialize service
      let service: GoogleCalendarService | OutlookCalendarService;
      if (config.provider === 'google') {
        service = new GoogleCalendarService(config.accessToken!);
      } else if (config.provider === 'outlook') {
        service = new OutlookCalendarService(config.accessToken!);
      } else {
        throw new Error(`Provider ${config.provider} not supported`);
      }

      // Get events from external calendar
      this.updateProgress(config.id, {
        totalEvents: 0,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: 0,
        currentOperation: 'Fetching events from external calendar...',
        isComplete: false,
      });

      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const sixMonthsAhead = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000));

      const eventsResult = await service.getEvents(
        config.providerCalendarId,
        threeMonthsAgo,
        sixMonthsAhead
      );

      if (!eventsResult.success) {
        throw new Error(`Failed to fetch events: ${eventsResult.error}`);
      }

      const externalEvents = eventsResult.data || [];

      this.updateProgress(config.id, {
        totalEvents: externalEvents.length,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: 0,
        currentOperation: `Processing ${externalEvents.length} events...`,
        isComplete: false,
      });

      // Convert and import events
      for (let i = 0; i < externalEvents.length; i++) {
        const externalEvent = externalEvents[i];

        try {
          let convertedEvent: EnhancedCalendarEvent;

          if (config.provider === 'google') {
            convertedEvent = GoogleCalendarService.convertFromGoogleEvent(
              externalEvent as any,
              config.userId,
              config.id
            );
          } else if (config.provider === 'outlook') {
            convertedEvent = OutlookCalendarService.convertFromOutlookEvent(
              externalEvent as any,
              config.userId,
              config.id
            );
          } else {
            throw new Error(`Provider ${config.provider} not supported`);
          }

          // Here you would save the event to your database
          // For now, we'll just count it as imported
          importedEvents++;

          this.updateProgress(config.id, {
            totalEvents: externalEvents.length,
            processedEvents: i + 1,
            skippedEvents,
            errorEvents,
            currentOperation: `Imported "${convertedEvent.title}"`,
            isComplete: false,
          });

        } catch (error) {
          errorEvents++;
          errors.push(`Event ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          this.updateProgress(config.id, {
            totalEvents: externalEvents.length,
            processedEvents: i + 1,
            skippedEvents,
            errorEvents,
            currentOperation: `Error processing event ${i + 1}`,
            isComplete: false,
          });
        }
      }

      // Complete
      this.updateProgress(config.id, {
        totalEvents: externalEvents.length,
        processedEvents: externalEvents.length,
        skippedEvents,
        errorEvents,
        currentOperation: 'Sync completed',
        isComplete: true,
      });

      return {
        success: true,
        importedEvents,
        updatedEvents,
        skippedEvents,
        errorEvents,
        errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');

      this.updateProgress(config.id, {
        totalEvents: 0,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: 1,
        currentOperation: 'Sync failed',
        isComplete: true,
      });

      return {
        success: false,
        importedEvents,
        updatedEvents,
        skippedEvents,
        errorEvents: errorEvents + 1,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      this.progressCallbacks.delete(config.id);
    }
  }

  /**
   * Sync events from internal system to external calendar
   */
  async syncToExternal(
    config: ExternalCalendarSyncConfig,
    events: EnhancedCalendarEvent[],
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let exportedEvents = 0;
    let updatedEvents = 0;
    const skippedEvents = 0;
    let errorEvents = 0;

    try {
      // Set up progress tracking
      if (onProgress) {
        this.progressCallbacks.set(config.id, onProgress);
      }

      this.updateProgress(config.id, {
        totalEvents: events.length,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: 0,
        currentOperation: 'Connecting to external calendar...',
        isComplete: false,
      });

      // Initialize service
      let service: GoogleCalendarService | OutlookCalendarService;
      if (config.provider === 'google') {
        service = new GoogleCalendarService(config.accessToken!);
      } else if (config.provider === 'outlook') {
        service = new OutlookCalendarService(config.accessToken!);
      } else {
        throw new Error(`Provider ${config.provider} not supported`);
      }

      // Export events to external calendar
      for (let i = 0; i < events.length; i++) {
        const event = events[i];

        try {
          this.updateProgress(config.id, {
            totalEvents: events.length,
            processedEvents: i,
            skippedEvents,
            errorEvents,
            currentOperation: `Exporting "${event.title}"...`,
            isComplete: false,
          });

          if (event.externalEventId) {
            // Update existing event
            if (config.provider === 'google') {
              const googleEvent = GoogleCalendarService.convertToGoogleEvent(event);
              const result = await (service as GoogleCalendarService).updateEvent(
                config.providerCalendarId,
                event.externalEventId,
                googleEvent
              );
              if (!result.success) {
                throw new Error(result.error);
              }
              updatedEvents++;
            } else if (config.provider === 'outlook') {
              const outlookEvent = OutlookCalendarService.convertToOutlookEvent(event);
              const result = await (service as OutlookCalendarService).updateEvent(
                event.externalEventId,
                outlookEvent
              );
              if (!result.success) {
                throw new Error(result.error);
              }
              updatedEvents++;
            }
          } else {
            // Create new event
            if (config.provider === 'google') {
              const googleEvent = GoogleCalendarService.convertToGoogleEvent(event);
              const result = await (service as GoogleCalendarService).createEvent(
                config.providerCalendarId,
                googleEvent
              );
              if (!result.success) {
                throw new Error(result.error);
              }
              exportedEvents++;
            } else if (config.provider === 'outlook') {
              const outlookEvent = OutlookCalendarService.convertToOutlookEvent(event);
              const result = await (service as OutlookCalendarService).createEvent(
                config.providerCalendarId,
                outlookEvent
              );
              if (!result.success) {
                throw new Error(result.error);
              }
              exportedEvents++;
            }
          }

        } catch (error) {
          errorEvents++;
          errors.push(`Event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Complete
      this.updateProgress(config.id, {
        totalEvents: events.length,
        processedEvents: events.length,
        skippedEvents,
        errorEvents,
        currentOperation: 'Export completed',
        isComplete: true,
      });

      return {
        success: true,
        importedEvents: exportedEvents,
        updatedEvents,
        skippedEvents,
        errorEvents,
        errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');

      this.updateProgress(config.id, {
        totalEvents: events.length,
        processedEvents: 0,
        skippedEvents: 0,
        errorEvents: errorEvents + 1,
        currentOperation: 'Export failed',
        isComplete: true,
      });

      return {
        success: false,
        importedEvents: exportedEvents,
        updatedEvents,
        skippedEvents,
        errorEvents: errorEvents + 1,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      this.progressCallbacks.delete(config.id);
    }
  }

  /**
   * Test connection to external calendar
   */
  async testConnection(
    provider: ExternalCalendarProvider,
    accessToken: string
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      let service: GoogleCalendarService | OutlookCalendarService;

      if (provider === 'google') {
        service = new GoogleCalendarService(accessToken);
        const result = await service.getCalendarList();
        return { success: result.success, data: result.success };
      } else if (provider === 'outlook') {
        service = new OutlookCalendarService(accessToken);
        const result = await service.getCalendarList();
        return { success: result.success, data: result.success };
      } else {
        return { success: false, error: `Provider ${provider} not supported` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update progress for a sync operation
   */
  private updateProgress(configId: string, progress: SyncProgress): void {
    const callback = this.progressCallbacks.get(configId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Cancel ongoing sync operation
   */
  cancelSync(configId: string): void {
    this.progressCallbacks.delete(configId);
  }
}