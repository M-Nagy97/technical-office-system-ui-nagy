import * as XLSX from 'xlsx';
import { PublicHolidayDto, PublicHolidayImportInput, PublicHolidayStatus } from '../../../core/services/attendance-api.service';

export const HOLIDAY_IMPORT_HEADERS = {
  name: ['name', 'الاسم'],
  fromDate: ['fromdate', 'from', 'من'],
  toDate: ['todate', 'to', 'إلى', 'الى'],
  notes: ['notes', 'ملاحظات'],
  originalOccasionDate: ['originaloccasiondate', 'occasiondate', 'تاريخ المناسبة الأصلي', 'تاريخ المناسبة الاصلى'],
} as const;

export interface ParsedHolidayImportRow {
  name: string | null;
  fromDate: string | null;
  toDate: string | null;
  notes: string | null;
  originalOccasionDate: string | null;
  sourceRow: number;
}

function normHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, '').replace(/\s+/g, '').toLowerCase();
}

function headerIndex(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map(normHeader);
  const wanted = aliases.map(normHeader);
  return normalized.findIndex((h) => wanted.includes(h));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function parseHolidayDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYmd(value);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = (
      XLSX as unknown as {
        SSF?: { parse_date_code: (n: number) => { y: number; m: number; d: number } | null };
      }
    ).SSF?.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toYmd(d);
  return null;
}

function mapRecords(records: Record<string, unknown>[], headerOffset: number): ParsedHolidayImportRow[] {
  if (!records.length) return [];
  const headers = Object.keys(records[0]);
  const iName = headerIndex(headers, HOLIDAY_IMPORT_HEADERS.name);
  const iFrom = headerIndex(headers, HOLIDAY_IMPORT_HEADERS.fromDate);
  const iTo = headerIndex(headers, HOLIDAY_IMPORT_HEADERS.toDate);
  const iNotes = headerIndex(headers, HOLIDAY_IMPORT_HEADERS.notes);
  const iOccasion = headerIndex(headers, HOLIDAY_IMPORT_HEADERS.originalOccasionDate);
  if (iName < 0 || iFrom < 0 || iTo < 0) {
    throw new Error('Holiday file must include Name, FromDate and ToDate columns.');
  }
  return records.map((row, idx) => {
    const keys = Object.keys(row);
    const cell = (i: number) => (i >= 0 ? row[keys[i]] : null);
    return {
      name: String(cell(iName) ?? '').trim() || null,
      fromDate: parseHolidayDate(cell(iFrom)),
      toDate: parseHolidayDate(cell(iTo)),
      notes: iNotes >= 0 ? String(cell(iNotes) ?? '').trim() || null : null,
      originalOccasionDate: iOccasion >= 0 ? parseHolidayDate(cell(iOccasion)) : null,
      sourceRow: headerOffset + idx + 1,
    };
  });
}

export function parseHolidayImportCsv(text: string): ParsedHolidayImportRow[] {
  const wb = XLSX.read(text, { type: 'string', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return mapRecords(records, 1);
}

export function parseHolidayImportXlsx(buffer: ArrayBuffer): ParsedHolidayImportRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return mapRecords(records, 1);
}

export function toImportInputs(rows: ParsedHolidayImportRow[]): PublicHolidayImportInput[] {
  return rows.map((row) => ({
    name: row.name,
    fromDate: row.fromDate,
    toDate: row.toDate,
    notes: row.notes,
    originalOccasionDate: row.originalOccasionDate,
    sourceRow: row.sourceRow,
  }));
}

export function buildHolidayTemplateSheet(year: number): unknown[][] {
  return [
    ['Name', 'FromDate', 'ToDate', 'Notes', 'OriginalOccasionDate'],
    ['6 أكتوبر', `${year}-10-06`, `${year}-10-06`, '', ''],
    ['عيد الفطر', `${year}-03-20`, `${year}-03-23`, '', `${year - 1}-03-30`],
  ];
}

export function buildHolidayExportRows(rows: PublicHolidayDto[]): unknown[][] {
  return [
    ['Name', 'FromDate', 'ToDate', 'Notes', 'OriginalOccasionDate', 'Status'],
    ...rows.map((row) => [
      row.name,
      row.fromDate?.slice(0, 10) ?? '',
      row.toDate?.slice(0, 10) ?? '',
      row.notes ?? '',
      row.originalOccasionDate?.slice(0, 10) ?? '',
      row.status === PublicHolidayStatus.Draft ? 'Draft' : 'Confirmed',
    ]),
  ];
}
