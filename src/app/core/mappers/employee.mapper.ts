import { Employee, EmployeeDocument, EmployeeStatus } from '../models/employee.model';
import { EmployeeDto } from '../api/generated/model/employeeDto';
import { CreateEmployeeCommand } from '../api/generated/model/createEmployeeCommand';
import { UpdateEmployeeCommand } from '../api/generated/model/updateEmployeeCommand';

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
  'أخرى': 64,
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

export class EmployeeMapper {
  static toDomain(dto: EmployeeDto): Employee {
    const primaryContact = dto.contacts && dto.contacts.length > 0 ? dto.contacts[0] : null;
    const primaryAddress = dto.addresses && Array.isArray(dto.addresses)
      ? (dto.addresses.find((a) => a.isPrimary) || dto.addresses[0])
      : null;
    const firstExperience = dto.experiences && dto.experiences.length > 0 ? dto.experiences[0] : null;
    const firstEducation = dto.educations && dto.educations.length > 0 ? dto.educations[0] : null;

    const fullName = dto.arabicName?.trim()
      || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim()
      || '—';

    let firstName = dto.firstName?.trim() ?? '';
    let secondName = '';
    let thirdName = '';
    let lastName = dto.lastName?.trim() ?? '';

    if (fullName && fullName !== '—') {
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      if (nameParts.length >= 4) {
        firstName = nameParts[0];
        secondName = nameParts[1];
        thirdName = nameParts[2];
        lastName = nameParts.slice(3).join(' ');
      } else if (nameParts.length === 3) {
        firstName = nameParts[0];
        secondName = nameParts[1];
        thirdName = '';
        lastName = nameParts[2];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        secondName = '';
        thirdName = '';
        lastName = nameParts[1];
      } else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }
    }

    const status: EmployeeStatus = (dto.statusId != null && STATUS_ID_MAP[dto.statusId])
      ? STATUS_ID_MAP[dto.statusId]
      : 'active';

    const gender: 'male' | 'female' = (dto.genderId && ID_TO_GENDER[dto.genderId]) || 'male';
    const maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' =
      (dto.maritalStatusId && ID_TO_MARITAL_STATUS[dto.maritalStatusId]) || 'single';

    let department = '';
    let section = '';
    let workLocation = '';
    if (firstExperience?.company) {
      const compParts = firstExperience.company.split(' / ').map((s) => s.trim());
      department = compParts[0] || '';
      section = compParts[1] || '';
      workLocation = compParts[2] || '';
    }

    const documents: EmployeeDocument[] = (dto.documents || []).map((doc, idx) => ({
      id: doc.documentNumber || `doc-${idx}`,
      documentNumber: doc.documentNumber ?? '',
      documentTypeId: doc.documentTypeId,
      type: 'other' as const,
      name: doc.documentNumber ?? '',
      fileUrl: doc.fileUrl ?? '',
      uploadDate: doc.issueDate ? new Date(doc.issueDate) : new Date(0),
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
    }));

    const nationalIdDoc = (dto.documents || []).find((d) => d.documentNumber && /^\d{14}$/.test(d.documentNumber))
      || (dto.documents && dto.documents.length > 0 ? dto.documents[0] : null);
    const nationalId = nationalIdDoc?.documentNumber ?? '';

    const nationality = (dto.nationalityId && ID_TO_NATIONALITY[dto.nationalityId]) || 'مصري';

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
      birthDate: dto.birthDate ? new Date(dto.birthDate) : new Date(),
      birthPlace: '',
      nationality,
      religion: '',
      maritalStatus,
      phone: primaryContact?.mobile ?? primaryContact?.phone ?? '',
      alternatePhone: primaryContact?.emergencyPhone || (primaryContact?.phone && primaryContact?.phone !== primaryContact?.mobile ? primaryContact.phone : undefined),
      email: primaryContact?.email ?? undefined,
      address: primaryAddress?.addressLine ?? '',
      photo: undefined,
      appointmentDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      appointmentDecisionNumber: '',
      appointmentDecisionDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      jobTitle: firstExperience?.jobTitle ?? '',
      jobGrade: '',
      department,
      section,
      workLocation,
      employmentType: 'permanent',
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
    const mainPhone = employee.phone?.trim() || null;
    const altPhone = employee.alternatePhone?.trim() || null;
    const email = employee.email?.trim() || null;

    const hasContact = Boolean(mainPhone || altPhone || email);

    const parseDate = (d: any) => {
      if (!d) return undefined;
      const parsed = d instanceof Date ? d : new Date(d);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    };

    const companyName = [employee.department, employee.section, employee.workLocation].filter(Boolean).join(' / ')
      || employee.jobTitle?.trim()
      || 'الشركة';

    const hasExperience = Boolean(employee.jobTitle?.trim() || employee.department?.trim());
    const hasEducation = Boolean(employee.educationLevel?.trim() || employee.educationField?.trim() || employee.graduationYear);

    const natDoc = (employee.documents || []).find(
      (d) => (d.documentNumber && d.documentNumber === employee.nationalId) ||
             (d.name && d.name === employee.nationalId) ||
             d.documentTypeId === 'dce167b1-ee8f-4d86-bdd3-477446980566'
    );

    const nationalIdDocPayload = employee.nationalId ? [{
      documentTypeId: natDoc?.documentTypeId || 'dce167b1-ee8f-4d86-bdd3-477446980566',
      documentNumber: employee.nationalId,
      issueDate: parseDate(natDoc?.uploadDate || employee.appointmentDate || employee.birthDate || new Date()),
      expiryDate: parseDate(natDoc?.expiryDate || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
      fileUrl: natDoc?.fileUrl || 'https://example.com/doc.pdf',
    }] : [];

    const otherDocsPayload = (employee.documents || [])
      .filter((doc) => doc !== natDoc && (doc.name || doc.id || doc.documentNumber))
      .map((doc) => ({
        documentTypeId: doc.documentTypeId || 'dce167b1-ee8f-4d86-bdd3-477446980566',
        documentNumber: doc.documentNumber || doc.name || doc.id || 'DOC',
        fileUrl: doc.fileUrl || 'https://example.com/doc.pdf',
        issueDate: parseDate(doc.uploadDate) || parseDate(new Date()),
        expiryDate: parseDate(doc.expiryDate) || parseDate(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
      }));

    return {
      employeeCode: employee.employeeNumber ?? null,
      firstName: employee.firstName ?? null,
      lastName: employee.lastName ?? null,
      arabicName: employee.fullName ?? null,
      birthDate: parseDate(employee.birthDate),
      genderId: employee.gender ? GENDER_TO_ID[employee.gender] : 1,
      nationalityId: employee.nationality ? (NATIONALITY_TO_ID[employee.nationality] ?? 64) : 64,
      maritalStatusId: employee.maritalStatus ? MARITAL_STATUS_TO_ID[employee.maritalStatus] : 1,
      hireDate: parseDate(employee.appointmentDate),
      statusId: employee.status ? STATUS_TO_ID_MAP[employee.status] : 1,
      contacts: hasContact ? [
        {
          mobile: mainPhone || altPhone || '',
          phone: altPhone || mainPhone || '',
          email: email || '',
          emergencyContactName: 'جهة اتصال الطوارئ',
          emergencyPhone: altPhone || mainPhone || '',
        },
      ] : [],
      addresses: employee.address ? [
        {
          countryId: 64,
          cityId: 1,
          addressLine: employee.address,
          postalCode: '44621',
          isPrimary: true,
        },
      ] : [],
      experiences: hasExperience ? [
        {
          jobTitle: employee.jobTitle?.trim() || employee.department?.trim() || 'موظف',
          company: companyName,
          startDate: parseDate(employee.appointmentDate || new Date()),
          endDate: parseDate(new Date()),
        },
      ] : [],
      educations: hasEducation ? [
        {
          degree: employee.educationLevel?.trim() || 'مؤهل',
          university: employee.educationField?.trim() || 'جامعة',
          graduationYear: Number(employee.graduationYear) || new Date().getFullYear(),
          grade: 'جيد',
        },
      ] : [],
      documents: [...nationalIdDocPayload, ...otherDocsPayload],
    };
  }

  static toUpdateCommand(id: string, employee: Partial<Employee>): UpdateEmployeeCommand {
    const mainPhone = employee.phone?.trim() || null;
    const altPhone = employee.alternatePhone?.trim() || null;
    const email = employee.email?.trim() || null;

    const hasContact = Boolean(mainPhone || altPhone || email);

    const parseDate = (d: any) => {
      if (!d) return undefined;
      const parsed = d instanceof Date ? d : new Date(d);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    };

    const companyName = [employee.department, employee.section, employee.workLocation].filter(Boolean).join(' / ')
      || employee.jobTitle?.trim()
      || 'الشركة';

    const hasExperience = Boolean(employee.jobTitle?.trim() || employee.department?.trim());
    const hasEducation = Boolean(employee.educationLevel?.trim() || employee.educationField?.trim() || employee.graduationYear);

    const natDoc = (employee.documents || []).find(
      (d) => (d.documentNumber && d.documentNumber === employee.nationalId) ||
             (d.name && d.name === employee.nationalId) ||
             d.documentTypeId === 'dce167b1-ee8f-4d86-bdd3-477446980566'
    );

    const nationalIdDocPayload = employee.nationalId ? [{
      documentTypeId: natDoc?.documentTypeId || 'dce167b1-ee8f-4d86-bdd3-477446980566',
      documentNumber: employee.nationalId,
      issueDate: parseDate(natDoc?.uploadDate || employee.appointmentDate || employee.birthDate || new Date()),
      expiryDate: parseDate(natDoc?.expiryDate || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
      fileUrl: natDoc?.fileUrl || 'https://example.com/doc.pdf',
    }] : [];

    const otherDocsPayload = (employee.documents || [])
      .filter((doc) => doc !== natDoc && (doc.name || doc.id || doc.documentNumber))
      .map((doc) => ({
        documentTypeId: doc.documentTypeId || 'dce167b1-ee8f-4d86-bdd3-477446980566',
        documentNumber: doc.documentNumber || doc.name || doc.id || 'DOC',
        fileUrl: doc.fileUrl || 'https://example.com/doc.pdf',
        issueDate: parseDate(doc.uploadDate) || parseDate(new Date()),
        expiryDate: parseDate(doc.expiryDate) || parseDate(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)),
      }));

    return {
      id,
      firstName: employee.firstName ?? null,
      lastName: employee.lastName ?? null,
      arabicName: employee.fullName ?? null,
      birthDate: parseDate(employee.birthDate),
      genderId: employee.gender ? GENDER_TO_ID[employee.gender] : undefined,
      nationalityId: employee.nationality ? (NATIONALITY_TO_ID[employee.nationality] ?? 64) : undefined,
      maritalStatusId: employee.maritalStatus ? MARITAL_STATUS_TO_ID[employee.maritalStatus] : undefined,
      hireDate: parseDate(employee.appointmentDate),
      statusId: employee.status ? STATUS_TO_ID_MAP[employee.status] : undefined,
      contacts: hasContact ? [
        {
          mobile: mainPhone || altPhone || '',
          phone: altPhone || mainPhone || '',
          email: email || '',
          emergencyContactName: 'جهة اتصال الطوارئ',
          emergencyPhone: altPhone || mainPhone || '',
        },
      ] : [],
      addresses: employee.address ? [
        {
          countryId: 64,
          cityId: 1,
          addressLine: employee.address,
          postalCode: '44621',
          isPrimary: true,
        },
      ] : [],
      experiences: hasExperience ? [
        {
          jobTitle: employee.jobTitle?.trim() || employee.department?.trim() || 'موظف',
          company: companyName,
          startDate: parseDate(employee.appointmentDate || new Date()),
          endDate: parseDate(new Date()),
        },
      ] : [],
      educations: hasEducation ? [
        {
          degree: employee.educationLevel?.trim() || 'مؤهل',
          university: employee.educationField?.trim() || 'جامعة',
          graduationYear: Number(employee.graduationYear) || new Date().getFullYear(),
          grade: 'جيد',
        },
      ] : [],
      documents: [...nationalIdDocPayload, ...otherDocsPayload],
    };
  }
}
