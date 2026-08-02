import * as XLSX from 'xlsx';
import { AttendanceRawDto, PunchDirection, AttendanceSource } from '../../../core/api/generated';

function norm(s: string): string {
  return s.trim().replace(/^\uFEFF/, '');
}

function parseDirection(v: string): PunchDirection {
  const x = norm(v).toLowerCase();
  if (x === 'in' || x === '1' || x === 'دخول') return PunchDirection.NUMBER_1;
  if (x === 'out' || x === '2' || x === 'خروج') return PunchDirection.NUMBER_2;
  return PunchDirection.NUMBER_3;
}

function parseFingerTime(v: string): string {
  const s = norm(v);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const normalized = s.replace(' ', 'T');
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    // If source includes timezone/offset, keep absolute instant.
    return d.toISOString();
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (m) {
    return `${m[1]}T${m[2].length === 5 ? m[2] + ':00' : m[2]}`;
  }
  throw new Error(`Invalid FingerTime: ${v}`);
}

/** CSV text → raw punch DTOs for import (Manual source). */
export function parseAttendanceImportCsv(text: string): AttendanceRawDto[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(norm);
  const idx = (name: string) => {
    const i = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return i;
  };
  const iEmp = idx('EmpId');
  const iTime = idx('FingerTime');
  const iDir = idx('Direction');
  const iDev = idx('DeviceId');
  if (iEmp < 0 || iTime < 0 || iDir < 0) {
    throw new Error('CSV must include columns: EmpId, FingerTime, Direction');
  }
  const rows: AttendanceRawDto[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(',').map(norm);
    const empId = cells[iEmp];
    if (!empId) continue;
    rows.push({
      empId,
      fingerTime: parseFingerTime(cells[iTime] ?? ''),
      direction: parseDirection(cells[iDir] ?? ''),
      source: AttendanceSource.NUMBER_2,
      deviceId: iDev >= 0 && cells[iDev] ? cells[iDev] : null,
    });
  }
  return rows;
}

/** First worksheet of xlsx file → same shape as CSV (header row). */
export function parseAttendanceImportXlsx(arrayBuffer: ArrayBuffer): AttendanceRawDto[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) return [];
  const headerKeys = Object.keys(rows[0]).map(norm);
  const findKey = (name: string) =>
    headerKeys.find((k) => k.toLowerCase() === name.toLowerCase());
  const kEmp = findKey('EmpId');
  const kTime = findKey('FingerTime');
  const kDir = findKey('Direction');
  const kDev = findKey('DeviceId');
  if (!kEmp || !kTime || !kDir) {
    throw new Error('Sheet must include columns: EmpId, FingerTime, Direction');
  }
  const out: AttendanceRawDto[] = [];
  for (const row of rows) {
    const empId = String(row[kEmp] ?? '').trim();
    if (!empId) continue;
    out.push({
      empId,
      fingerTime: parseFingerTime(String(row[kTime] ?? '')),
      direction: parseDirection(String(row[kDir] ?? '')),
      source: AttendanceSource.NUMBER_2,
      deviceId: kDev && row[kDev] ? String(row[kDev]).trim() || null : null,
    });
  }
  return out;
}
