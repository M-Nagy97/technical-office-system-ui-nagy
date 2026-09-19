import { TranslateService } from '@ngx-translate/core';
import { EmployeeDocumentType } from '../models/employee.model';

/** Seeded GUIDs from HR EmployeeDocumentType.GetDefaultDefinitions(). */
export const NATIONAL_ID_DOCUMENT_TYPE_ID = 'dce167b1-ee8f-4d86-bdd3-477446980566';
export const PASSPORT_DOCUMENT_TYPE_ID = 'e4a5b6c7-d8e9-4f01-a2b3-c4d5e6f7a8b9';
export const RESIDENCY_PERMIT_TYPE_ID = 'f5b6c7d8-e9f0-4a12-b3c4-d5e6f7a8b9c0';
export const DRIVING_LICENSE_TYPE_ID = 'a6b7c8d9-e0f1-4b23-c4d5-e6f7a8b9c0d1';
export const EMPLOYMENT_CONTRACT_TYPE_ID = 'b7c8d9e0-f1a2-4c34-d5e6-f7a8b9c0d1e2';

/** GUID → UI type (for API → domain mapping). */
export const DOC_TYPE_BY_GUID: Record<string, EmployeeDocumentType> = {
  [NATIONAL_ID_DOCUMENT_TYPE_ID]: 'id_copy',
  [PASSPORT_DOCUMENT_TYPE_ID]: 'other',
  [RESIDENCY_PERMIT_TYPE_ID]: 'birth_certificate',
  [DRIVING_LICENSE_TYPE_ID]: 'qualification',
  [EMPLOYMENT_CONTRACT_TYPE_ID]: 'appointment_decision',
};

/**
 * Uploadable UI types that have known backend documentTypeId GUIDs.
 * birth_certificate / qualification map to residency / driving-license seed types.
 */
export const UPLOADABLE_DOC_TYPE_GUIDS: Partial<Record<EmployeeDocumentType, string>> = {
  id_copy: NATIONAL_ID_DOCUMENT_TYPE_ID,
  appointment_decision: EMPLOYMENT_CONTRACT_TYPE_ID,
  birth_certificate: RESIDENCY_PERMIT_TYPE_ID,
  qualification: DRIVING_LICENSE_TYPE_ID,
  other: PASSPORT_DOCUMENT_TYPE_ID,
};

/** i18n keys for document type labels (`employees.doc_type.*`). */
export const DOC_TYPE_I18N_KEYS: Record<EmployeeDocumentType, string> = {
  appointment_decision: 'employees.doc_type.appointment_decision',
  id_copy: 'employees.doc_type.id_copy',
  birth_certificate: 'employees.doc_type.birth_certificate',
  qualification: 'employees.doc_type.qualification',
  other: 'employees.doc_type.other',
};

export function getDocTypeLabel(
  type: EmployeeDocumentType,
  translate: TranslateService
): string {
  const key = DOC_TYPE_I18N_KEYS[type];
  return key ? translate.instant(key) : type;
}

/** Options for filters (all known UI types). */
export function buildDocTypeFilterOptions(
  translate: TranslateService
): { label: string; value: EmployeeDocumentType }[] {
  return (Object.keys(DOC_TYPE_I18N_KEYS) as EmployeeDocumentType[]).map((value) => ({
    label: getDocTypeLabel(value, translate),
    value,
  }));
}

/** Options for upload dialog (types with known GUIDs). */
export function buildDocTypeUploadOptions(
  translate: TranslateService
): { label: string; value: EmployeeDocumentType }[] {
  return (Object.keys(UPLOADABLE_DOC_TYPE_GUIDS) as EmployeeDocumentType[]).map((value) => ({
    label: getDocTypeLabel(value, translate),
    value,
  }));
}

export function mapDocumentType(documentTypeId?: string | null): EmployeeDocumentType {
  if (!documentTypeId) return 'other';
  return DOC_TYPE_BY_GUID[documentTypeId] ?? 'other';
}

export function resolveDocumentTypeId(type: EmployeeDocumentType): string | undefined {
  return UPLOADABLE_DOC_TYPE_GUIDS[type];
}

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True only for real UUID strings suitable as persisted entity keys. */
export function isPersistedDocumentId(id?: string | null): boolean {
  return Boolean(id && GUID_RE.test(id.trim()));
}

/** Backend EmployeeDocuments.DocumentNumber is nvarchar(50). */
export function truncateDocumentNumber(value: string | null | undefined, fallback = 'DOC'): string {
  const trimmed = (value ?? '').trim() || fallback;
  return trimmed.length > 50 ? trimmed.slice(0, 50) : trimmed;
}
