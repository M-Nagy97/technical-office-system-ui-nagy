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

const MARITAL_STATUS_TO_ID: Record<string, number> = {
  single: 1,
  married: 2,
  divorced: 3,
  widowed: 4,
};

export class EmployeeMapper {
  static toDomain(dto: EmployeeDto): Employee {
    const primaryContact = dto.contacts && dto.contacts.length > 0 ? dto.contacts[0] : null;
    const primaryAddress = dto.addresses && Array.isArray(dto.addresses)
      ? (dto.addresses.find((a) => a.isPrimary) || dto.addresses[0])
      : null;
    const firstExperience = dto.experiences && dto.experiences.length > 0 ? dto.experiences[0] : null;

    const fullName = dto.arabicName?.trim()
      || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim()
      || '—';

    const status: EmployeeStatus = (dto.statusId != null && STATUS_ID_MAP[dto.statusId])
      ? STATUS_ID_MAP[dto.statusId]
      : 'active';

    const documents: EmployeeDocument[] = (dto.documents || []).map((doc, idx) => ({
      id: doc.documentNumber || `doc-${idx}`,
      type: 'other' as const,
      name: doc.documentNumber ?? '',
      fileUrl: doc.fileUrl ?? '',
      uploadDate: doc.issueDate ? new Date(doc.issueDate) : new Date(0),
    }));

    return {
      id: dto.id ?? '',
      employeeNumber: dto.employeeCode ?? '',
      fullName,
      firstName: dto.firstName ?? '',
      secondName: '',
      thirdName: '',
      lastName: dto.lastName ?? '',
      nationalId: '',
      gender: dto.genderId === 1 ? 'male' : 'female',
      birthDate: dto.birthDate ? new Date(dto.birthDate) : new Date(0),
      birthPlace: '',
      nationality: '',
      religion: '',
      maritalStatus: 'single',
      phone: primaryContact?.phone ?? primaryContact?.mobile ?? '',
      alternatePhone: primaryContact?.mobile ?? undefined,
      email: primaryContact?.email ?? undefined,
      address: primaryAddress?.addressLine ?? '',
      photo: undefined,
      appointmentDate: dto.hireDate ? new Date(dto.hireDate) : new Date(0),
      appointmentDecisionNumber: '',
      appointmentDecisionDate: new Date(0),
      jobTitle: firstExperience?.jobTitle ?? '',
      jobGrade: '',
      department: '',
      section: '',
      workLocation: '',
      employmentType: 'permanent',
      status,
      educationLevel: '',
      educationField: '',
      graduationYear: 0,
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
      employeeCode: employee.employeeNumber ?? null,
      firstName: employee.firstName ?? null,
      lastName: employee.lastName ?? null,
      arabicName: employee.fullName ?? null,
      birthDate: employee.birthDate ? employee.birthDate.toISOString() : undefined,
      genderId: employee.gender ? GENDER_TO_ID[employee.gender] : 1,
      maritalStatusId: employee.maritalStatus ? MARITAL_STATUS_TO_ID[employee.maritalStatus] : 1,
      hireDate: employee.appointmentDate ? employee.appointmentDate.toISOString() : undefined,
      statusId: employee.status ? STATUS_TO_ID_MAP[employee.status] : 1,
      contacts: employee.phone || employee.email ? [
        {
          phone: employee.phone ?? null,
          mobile: employee.alternatePhone ?? null,
          email: employee.email ?? null,
        },
      ] : [],
      addresses: employee.address ? [
        {
          addressLine: employee.address,
          isPrimary: true,
        },
      ] : [],
      experiences: employee.jobTitle ? [
        {
          jobTitle: employee.jobTitle,
        },
      ] : [],
    };
  }

  static toUpdateCommand(id: string, employee: Partial<Employee>): UpdateEmployeeCommand {
    return {
      id,
      firstName: employee.firstName ?? null,
      lastName: employee.lastName ?? null,
      arabicName: employee.fullName ?? null,
      birthDate: employee.birthDate ? employee.birthDate.toISOString() : undefined,
      genderId: employee.gender ? GENDER_TO_ID[employee.gender] : undefined,
      maritalStatusId: employee.maritalStatus ? MARITAL_STATUS_TO_ID[employee.maritalStatus] : undefined,
      hireDate: employee.appointmentDate ? employee.appointmentDate.toISOString() : undefined,
      statusId: employee.status ? STATUS_TO_ID_MAP[employee.status] : undefined,
      contacts: employee.phone || employee.email ? [
        {
          phone: employee.phone ?? null,
          mobile: employee.alternatePhone ?? null,
          email: employee.email ?? null,
        },
      ] : undefined,
      addresses: employee.address ? [
        {
          addressLine: employee.address,
          isPrimary: true,
        },
      ] : undefined,
      experiences: employee.jobTitle ? [
        {
          jobTitle: employee.jobTitle,
        },
      ] : undefined,
    };
  }
}
