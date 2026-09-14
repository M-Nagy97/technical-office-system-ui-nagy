import { Employee, EmployeeDocument, EmployeeStatus, EmploymentType } from '../models/employee.model';
import { EmployeeDto } from '../api/generated/model/employeeDto';
import { CreateEmployeeCommand } from '../api/generated/model/createEmployeeCommand';
import { UpdateEmployeeCommand } from '../api/generated/model/updateEmployeeCommand';
import {
  isImageMediaUrl,
  resolveMediaUrl,
  toStorageFileUrl,
} from '../utils/media-url.util';
import {
  NATIONAL_ID_DOCUMENT_TYPE_ID,
  isPersistedDocumentId,
  mapDocumentType,
  truncateDocumentNumber,
} from './employee-document-types';

const STATUS_ID_MAP: Record<number, EmployeeStatus> = {
  1: 'active',
  2: 'suspended',
  3: 'terminated',
  4: 'retired',
};

const STATUS_TO_ID_MAP: Record<EmployeeStatus, number> = {
  active: 1,
  suspended: 2,
  terminated: 3,
  retired: 4,
};

const EMPLOYMENT_TYPE_TO_ID: Record<EmploymentType, number> = {
  permanent: 1,
  temporary: 2,
  contract: 3,
};

const ID_TO_EMPLOYMENT_TYPE: Record<number, EmploymentType> = {
  1: 'permanent',
  2: 'temporary',
  3: 'contract',
};

const GENDER_TO_ID: Record<string, number> = {
  male: 1,
  female: 2,
};

const ID_TO_GENDER: Record<number, 'male' | 'female'> = {
  1: 'male',
  2: 'female',
};

const MARITAL_STATUS_TO_ID: Record<string, number> = {
  single: 1,
  married: 2,
  divorced: 3,
  widowed: 4,
};

const ID_TO_MARITAL_STATUS: Record<number, 'single' | 'married' | 'divorced' | 'widowed'> = {
  1: 'single',
  2: 'married',
  3: 'divorced',
  4: 'widowed',
};

const NATIONALITY_TO_ID: Record<string, number> = {
  'مصري': 64,
  'سعودي': 191,
  'أردني': 114,
  'سوري': 214,
  'لبناني': 124,
  'فلسطيني': 171,
  'سوداني': 209,
  'يمني': 244,
  'عراقي': 106,
};

const ID_TO_NATIONALITY: Record<number, string> = {
  64: 'مصري',
  191: 'سعودي',
  114: 'أردني',
  214: 'سوري',
  124: 'لبناني',
  171: 'فلسطيني',
  209: 'سوداني',
  244: 'يمني',
  106: 'عراقي',
};

function parseDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const parsed = d instanceof Date ? d : new Date(d);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function buildDocumentPayloads(employee: Partial<Employee>) {
  const natDoc = (employee.documents || []).find(
    (d) =>
      d.documentTypeId === NATIONAL_ID_DOCUMENT_TYPE_ID ||
      (d.documentNumber && d.documentNumber === employee.nationalId)
  );

  const nationalIdDocPayload =
    employee.nationalId && natDoc?.fileUrl
      ? [
          {
            id: isPersistedDocumentId(natDoc.id) ? natDoc.id : undefined,
            documentTypeId: NATIONAL_ID_DOCUMENT_TYPE_ID,
            documentNumber: truncateDocumentNumber(employee.nationalId),
            issueDate: parseDate(natDoc.uploadDate || employee.birthDate),
            expiryDate: parseDate(natDoc.expiryDate),
            fileUrl: toStorageFileUrl(natDoc.fileUrl) || '',
          },
        ]
      : employee.nationalId
        ? [
            {
              id: isPersistedDocumentId(natDoc?.id) ? natDoc!.id : undefined,
              documentTypeId: NATIONAL_ID_DOCUMENT_TYPE_ID,
              documentNumber: truncateDocumentNumber(employee.nationalId),
              issueDate: parseDate(natDoc?.uploadDate || employee.birthDate || new Date()),
              expiryDate: parseDate(natDoc?.expiryDate || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
              fileUrl: toStorageFileUrl(natDoc?.fileUrl) || '',
            },
          ]
        : [];

  const otherDocsPayload = (employee.documents || [])
    .filter((doc) => doc !== natDoc && doc.documentTypeId && doc.documentTypeId !== NATIONAL_ID_DOCUMENT_TYPE_ID)
    .filter((doc) => doc.documentNumber || doc.name)
    .map((doc) => ({
      id: isPersistedDocumentId(doc.id) ? doc.id : undefined,
      documentTypeId: doc.documentTypeId!,
      documentNumber: truncateDocumentNumber(doc.documentNumber || doc.name, 'DOC'),
      fileUrl: toStorageFileUrl(doc.fileUrl) || '',
      issueDate: parseDate(doc.uploadDate) || parseDate(new Date()),
      expiryDate: parseDate(doc.expiryDate) || parseDate(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
    }));

  return [...nationalIdDocPayload, ...otherDocsPayload].filter((d) => d.documentTypeId);
}

function buildCommandBody(employee: Partial<Employee>) {
  const mainPhone = employee.phone?.trim() || null;
  const altPhone = employee.alternatePhone?.trim() || null;
  const email = employee.email?.trim() || null;
  const hasContact = Boolean(mainPhone || altPhone || email);
  const hasEducation = Boolean(
    employee.educationLevel?.trim() || employee.educationField?.trim() || employee.graduationYear
  );
  const contactId = isPersistedDocumentId(employee.contactId) ? employee.contactId : undefined;
  const addressId = isPersistedDocumentId(employee.addressId) ? employee.addressId : undefined;
  const educationId = isPersistedDocumentId(employee.educationId) ? employee.educationId : undefined;

  return {
    firstName: employee.firstName ?? null,
    lastName: employee.lastName ?? null,
    arabicName: employee.fullName ?? null,
    birthDate: parseDate(employee.birthDate),
    genderId: employee.gender ? GENDER_TO_ID[employee.gender] : 1,
    nationalityId: employee.nationality ? (NATIONALITY_TO_ID[employee.nationality] ?? 64) : 64,
    maritalStatusId: employee.maritalStatus ? MARITAL_STATUS_TO_ID[employee.maritalStatus] : 1,
    hireDate: parseDate(employee.appointmentDate),
    statusId: employee.status ? STATUS_TO_ID_MAP[employee.status] : 1,
    birthPlace: employee.birthPlace?.trim() || null,
    religion: employee.religion?.trim() || null,
    appointmentDecisionNumber: employee.appointmentDecisionNumber?.trim() || null,
    appointmentDecisionDate: parseDate(employee.appointmentDecisionDate),
    employmentTypeId: employee.employmentType
      ? EMPLOYMENT_TYPE_TO_ID[employee.employmentType]
      : 1,
    // null ⇒ backend skips sync (empty [] deletes all orphans and can throw concurrency errors)
    contacts: hasContact
      ? [
          {
            ...(contactId ? { id: contactId } : {}),
            mobile: mainPhone || '',
            phone: altPhone || '',
            email: email || '',
            emergencyContactName: null,
            emergencyPhone: altPhone || null,
          },
        ]
      : null,
    addresses: employee.address
      ? [
          {
            ...(addressId ? { id: addressId } : {}),
            countryId: 64,
            cityId: 1,
            addressLine: employee.address,
            postalCode: null,
            isPrimary: true,
          },
        ]
      : null,
    experiences: null,
    educations: hasEducation
      ? [
          {
            ...(educationId ? { id: educationId } : {}),
            degree: employee.educationLevel?.trim() || null,
            university: employee.educationField?.trim() || null,
            graduationYear: employee.graduationYear ? Number(employee.graduationYear) : null,
            grade: null,
          },
        ]
      : null,
    documents: buildDocumentPayloads(employee),
  };
}

export class EmployeeMapper {
  static toDomain(dto: EmployeeDto): Employee {
    const primaryContact = dto.contacts && dto.contacts.length > 0 ? dto.contacts[0] : null;
    const primaryAddress = dto.addresses && Array.isArray(dto.addresses)
      ? (dto.addresses.find((a) => a.isPrimary) || dto.addresses[0])
      : null;
    const firstEducation = dto.educations && dto.educations.length > 0 ? dto.educations[0] : null;
    const contactIdRaw = (primaryContact as { id?: string } | null)?.id;
    const addressIdRaw = (primaryAddress as { id?: string } | null)?.id;
    const educationIdRaw = (firstEducation as { id?: string } | null)?.id;

    const currentPosition = dto.currentPosition;

    const fullName = dto.arabicName?.trim()
      || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim()
      || '—';

    // Keep API first/last names; derive middle names from Arabic full name when present.
    let firstName = dto.firstName?.trim() ?? '';
    let secondName = '';
    let thirdName = '';
    let lastName = dto.lastName?.trim() ?? '';
    if (dto.arabicName?.trim()) {
      const nameParts = dto.arabicName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length >= 4) {
        secondName = nameParts[1];
        thirdName = nameParts[2];
      } else if (nameParts.length === 3) {
        secondName = nameParts[1];
      }
    }

    const status: EmployeeStatus =
      dto.statusId != null && STATUS_ID_MAP[dto.statusId] ? STATUS_ID_MAP[dto.statusId] : 'active';

    const employmentTypeId = dto.employmentTypeId;
    const employmentType: EmploymentType =
      employmentTypeId != null && ID_TO_EMPLOYMENT_TYPE[employmentTypeId]
        ? ID_TO_EMPLOYMENT_TYPE[employmentTypeId]
        : 'permanent';

    const gender: 'male' | 'female' = (dto.genderId && ID_TO_GENDER[dto.genderId]) || 'male';
    const maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' =
      (dto.maritalStatusId && ID_TO_MARITAL_STATUS[dto.maritalStatusId]) || 'single';

    const documents: EmployeeDocument[] = (dto.documents || []).map((doc, idx) => ({
      id: isPersistedDocumentId(doc.id) ? doc.id!.trim() : `doc-${idx}`,
      documentNumber: doc.documentNumber ?? '',
      documentTypeId: doc.documentTypeId,
      type: mapDocumentType(doc.documentTypeId),
      name: doc.documentNumber ?? '',
      fileUrl: resolveMediaUrl(doc.fileUrl),
      uploadDate: doc.issueDate ? new Date(doc.issueDate) : new Date(0),
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
    }));

    const nationalIdDoc =
      documents.find((d) => d.documentTypeId === NATIONAL_ID_DOCUMENT_TYPE_ID) ||
      documents.find((d) => d.documentNumber && /^\d{14}$/.test(d.documentNumber)) ||
      null;
    const nationalId = nationalIdDoc?.documentNumber ?? '';

    const nationality =
      dto.nationalityId != null && ID_TO_NATIONALITY[dto.nationalityId]
        ? ID_TO_NATIONALITY[dto.nationalityId]
        : dto.nationalityId === 0
          ? 'أخرى'
          : 'مصري';

    const photo = documents.find((d) => isImageMediaUrl(d.fileUrl) && d.documentTypeId !== NATIONAL_ID_DOCUMENT_TYPE_ID)?.fileUrl;

    const birthPlace = dto.birthPlace ?? '';
    const religion = dto.religion ?? '';
    const appointmentDecisionNumber = dto.appointmentDecisionNumber ?? '';
    const appointmentDecisionDateRaw = dto.appointmentDecisionDate;

    return {
      id: dto.id ?? '',
      employeeNumber: dto.employeeCode ?? '',
      fullName,
      firstName,
      secondName,
      thirdName,
      lastName,
      nationalId,
      gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : new Date(0),
      birthPlace,
      nationality,
      religion,
      maritalStatus,
      phone: primaryContact?.mobile ?? primaryContact?.phone ?? '',
      alternatePhone:
        primaryContact?.emergencyPhone &&
        primaryContact.emergencyPhone !== (primaryContact?.mobile ?? primaryContact?.phone)
          ? primaryContact.emergencyPhone
          : primaryContact?.phone && primaryContact.phone !== primaryContact.mobile
            ? primaryContact.phone
            : undefined,
      email: primaryContact?.email ?? undefined,
      address: primaryAddress?.addressLine ?? '',
      contactId: isPersistedDocumentId(contactIdRaw) ? contactIdRaw!.trim() : undefined,
      addressId: isPersistedDocumentId(addressIdRaw) ? addressIdRaw!.trim() : undefined,
      educationId: isPersistedDocumentId(educationIdRaw) ? educationIdRaw!.trim() : undefined,
      photo,
      appointmentDate: dto.hireDate ? new Date(dto.hireDate) : new Date(0),
      appointmentDecisionNumber,
      appointmentDecisionDate: appointmentDecisionDateRaw
        ? new Date(appointmentDecisionDateRaw)
        : dto.hireDate
          ? new Date(dto.hireDate)
          : new Date(0),
      jobTitle: currentPosition?.jobPositionName ?? currentPosition?.jobPositionId ?? '',
      jobGrade: currentPosition?.jobGradeName ?? currentPosition?.jobGradeId ?? '',
      department: currentPosition?.organizationUnitName ?? currentPosition?.organizationUnitId ?? '',
      section: '',
      workLocation: '',
      employmentType,
      status,
      educationLevel: firstEducation?.degree ?? '',
      educationField: firstEducation?.university ?? '',
      graduationYear: firstEducation?.graduationYear ?? 0,
      documents,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static toDomainList(dtos: EmployeeDto[] | null | undefined): Employee[] {
    if (!dtos) return [];
    return dtos.map((dto) => this.toDomain(dto));
  }

  static toCreateCommand(employee: Partial<Employee>): CreateEmployeeCommand {
    return {
      employeeCode: employee.employeeNumber?.trim() || null,
      ...buildCommandBody(employee),
    } as CreateEmployeeCommand;
  }

  static toUpdateCommand(id: string, employee: Partial<Employee>): UpdateEmployeeCommand {
    return {
      id,
      ...buildCommandBody(employee),
    } as UpdateEmployeeCommand;
  }
}
