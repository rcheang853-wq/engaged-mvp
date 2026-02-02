'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, FileText, Calendar, X, CheckCircle, AlertCircle } from 'lucide-react';
import { EnhancedCalendarEvent, CalendarEventsListRequest } from '@/types/calendar';
import { calendarService } from '@/services/calendar-service';
import { cn } from '@/lib/utils';

interface CalendarExportImportProps {
  userId: string;
  onEventsUpdated?: () => void;
}

interface ExportOptions {
  format: 'ics' | 'csv' | 'json';
  dateRange: 'all' | 'month' | 'year' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  includePrivate: boolean;
  includeConflicts: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
}

export const CalendarExportImport: React.FC<CalendarExportImportProps> = ({
  userId,
  onEventsUpdated
}) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'ics',
    dateRange: 'year',
    includePrivate: true,
    includeConflicts: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Determine date range
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      const now = new Date();
      switch (exportOptions.dateRange) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'custom':
          startDate = exportOptions.customStartDate;
          endDate = exportOptions.customEndDate;
          break;
        default:
          // all - no date restriction
          break;
      }

      // Build filter request
      const listRequest: CalendarEventsListRequest = {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        filter: {
          visibility: exportOptions.includePrivate ? undefined : ['public']
        },
        pagination: { limit: 1000, orderBy: 'start_time', orderDirection: 'asc' },
        includeConflicts: exportOptions.includeConflicts
      };

      // Get events from service
      const result = await calendarService.listEvents(listRequest, userId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch events');
      }

      const events = result.data.events;

      // Generate export content based on format
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportOptions.format) {
        case 'ics':
          content = generateICSContent(events);
          filename = `calendar-export-${formatDate(new Date())}.ics`;
          mimeType = 'text/calendar';
          break;
        case 'csv':
          content = generateCSVContent(events);
          filename = `calendar-export-${formatDate(new Date())}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = JSON.stringify(events, null, 2);
          filename = `calendar-export-${formatDate(new Date())}.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Trigger download
      downloadFile(content, filename, mimeType);
      setExportDialogOpen(false);

    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await readFileContent(file);
      const events = await parseImportFile(file.name, content);

      let imported = 0;
      let skipped = 0;
      let duplicates = 0;
      const errors: string[] = [];

      // Import events one by one
      for (const eventData of events) {
        try {
          const result = await calendarService.createEvent({
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            timezone: eventData.timezone || 'UTC',
            allDay: eventData.allDay || false,
            location: eventData.location,
            priority: eventData.priority || 'normal',
            visibility: eventData.visibility || 'private',
            checkConflicts: false // Skip conflict checking during import
          }, userId);

          if (result.success) {
            imported++;
          } else {
            if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
              duplicates++;
            } else {
              errors.push(`${eventData.title}: ${result.error}`);
              skipped++;
            }
          }
        } catch (error) {
          errors.push(`${eventData.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          skipped++;
        }
      }

      setImportResult({
        success: true,
        imported,
        skipped,
        duplicates,
        errors: errors.slice(0, 10) // Limit to first 10 errors
      });

      if (imported > 0 && onEventsUpdated) {
        onEventsUpdated();
      }

    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        duplicates: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  return (
    <div className="flex gap-3">
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Calendar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium">Export Format</label>
              <div className="mt-2 space-y-2">
                {[
                  { value: 'ics' as const, label: 'iCalendar (.ics)', desc: 'Standard calendar format' },
                  { value: 'csv' as const, label: 'CSV (.csv)', desc: 'Spreadsheet format' },
                  { value: 'json' as const, label: 'JSON (.json)', desc: 'Developer format' }
                ].map(option => (
                  <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={exportOptions.format === option.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <div className="mt-2 space-y-2">
                {[
                  { value: 'all' as const, label: 'All Events' },
                  { value: 'year' as const, label: 'This Year' },
                  { value: 'month' as const, label: 'This Month' },
                  { value: 'custom' as const, label: 'Custom Range' }
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dateRange"
                      value={option.value}
                      checked={exportOptions.dateRange === option.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>

              {exportOptions.dateRange === 'custom' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Start Date</label>
                    <input
                      type="date"
                      className="w-full text-sm border rounded p-2"
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        customStartDate: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End Date</label>
                    <input
                      type="date"
                      className="w-full text-sm border rounded p-2"
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        customEndDate: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includePrivate}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includePrivate: e.target.checked }))}
                />
                <span className="text-sm">Include private events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeConflicts}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeConflicts: e.target.checked }))}
                />
                <span className="text-sm">Include conflict information</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleExport} disabled={isExporting} className="flex-1">
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Calendar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!importResult ? (
              <>
                <div className="text-sm text-gray-600">
                  Upload a calendar file to import events. Supported formats: .ics, .csv, .json
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-600 mb-3">
                    Click to select a file or drag and drop
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Choose File'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics,.csv,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="text-xs text-gray-500">
                  <strong>Note:</strong> Duplicate events will be skipped. Private events will maintain their privacy settings.
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded-lg',
                  importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                )}>
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      {importResult.success ? 'Import Completed' : 'Import Failed'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {importResult.success
                        ? `${importResult.imported} events imported successfully`
                        : 'Please check the file format and try again'
                      }
                    </div>
                  </div>
                </div>

                {importResult.success && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                      <div className="text-xs text-gray-500">Imported</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                      <div className="text-xs text-gray-500">Duplicates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{importResult.skipped}</div>
                      <div className="text-xs text-gray-500">Skipped</div>
                    </div>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-2">Errors:</div>
                    <div className="max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setImportResult(null);
                      setImportDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImportResult(null)}
                  >
                    Import Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Utility functions

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function generateICSContent(events: EnhancedCalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Your Calendar App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@your-calendar-app.com`);
    lines.push(`DTSTART:${formatICSDate(event.startTime)}`);
    lines.push(`DTEND:${formatICSDate(event.endTime)}`);
    lines.push(`SUMMARY:${escapeICSText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    lines.push(`CREATED:${formatICSDate(event.createdAt)}`);
    lines.push(`LAST-MODIFIED:${formatICSDate(event.updatedAt)}`);
    lines.push(`STATUS:${event.status.toUpperCase()}`);
    lines.push(`PRIORITY:${getPriorityNumber(event.priority)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function generateCSVContent(events: EnhancedCalendarEvent[]): string {
  const headers = [
    'Title',
    'Description',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'All Day',
    'Location',
    'Priority',
    'Status',
    'Visibility'
  ];

  const rows = events.map(event => [
    escapeCsvText(event.title),
    escapeCsvText(event.description || ''),
    formatDate(event.startTime),
    event.allDay ? '' : event.startTime.toTimeString().slice(0, 8),
    formatDate(event.endTime),
    event.allDay ? '' : event.endTime.toTimeString().slice(0, 8),
    event.allDay ? 'Yes' : 'No',
    escapeCsvText(event.location || ''),
    event.priority,
    event.status,
    event.visibility
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function escapeCsvText(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getPriorityNumber(priority: string): number {
  const priorityMap: { [key: string]: number } = {
    low: 9,
    normal: 5,
    high: 3,
    urgent: 1
  };
  return priorityMap[priority] || 5;
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function parseImportFile(filename: string, content: string): Promise<any[]> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'ics':
      return parseICSContent(content);
    case 'csv':
      return parseCSVContent(content);
    case 'json':
      return JSON.parse(content);
    default:
      throw new Error('Unsupported file format');
  }
}

function parseICSContent(content: string): any[] {
  const events: any[] = [];
  const lines = content.split(/\r?\n/);
  let currentEvent: any = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent && trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':');

      switch (key) {
        case 'SUMMARY':
          currentEvent.title = unescapeICSText(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeICSText(value);
          break;
        case 'LOCATION':
          currentEvent.location = unescapeICSText(value);
          break;
        case 'DTSTART':
          currentEvent.startTime = parseICSDate(value);
          break;
        case 'DTEND':
          currentEvent.endTime = parseICSDate(value);
          break;
      }
    }
  }

  return events;
}

function parseCSVContent(content: string): any[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const events: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const event: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'title':
            event.title = value;
            break;
          case 'description':
            event.description = value;
            break;
          case 'start date':
            event.startDate = value;
            break;
          case 'start time':
            event.startTime = value;
            break;
          case 'end date':
            event.endDate = value;
            break;
          case 'end time':
            event.endTime = value;
            break;
          case 'location':
            event.location = value;
            break;
          case 'all day':
            event.allDay = value.toLowerCase() === 'yes';
            break;
        }
      });

      // Combine date and time
      if (event.startDate) {
        event.startTime = event.allDay
          ? new Date(event.startDate).toISOString()
          : new Date(`${event.startDate} ${event.startTime || '00:00'}`).toISOString();
      }
      if (event.endDate) {
        event.endTime = event.allDay
          ? new Date(event.endDate).toISOString()
          : new Date(`${event.endDate} ${event.endTime || '23:59'}`).toISOString();
      }

      events.push(event);
    }
  }

  return events;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function unescapeICSText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\(.)/g, '$1');
}

function parseICSDate(dateStr: string): string {
  // Handle YYYYMMDDTHHMMSSZ format
  if (dateStr.length === 16 && dateStr.endsWith('Z')) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(9, 11);
    const minute = dateStr.slice(11, 13);
    const second = dateStr.slice(13, 15);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }

  return new Date(dateStr).toISOString();
}

export default CalendarExportImport;