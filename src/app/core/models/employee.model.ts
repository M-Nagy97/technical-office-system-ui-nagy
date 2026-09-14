export type EmployeeStatus = 'active' | 'suspended' | 'terminated' | 'retired';
export type EmploymentType = 'permanent' | 'temporary' | 'contract';
export type EmployeeGender = 'male' | 'female';
export type EmployeeMaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type EmployeeDocumentType = 'appointment_decision' | 'id_copy' | 'birth_certificate' | 'qualification' | 'other';

/**
 * Employee document attached to an employee record.
 */
export interface EmployeeDocument {
  id: string;
  type: EmployeeDocumentType;
  name: string;
  fileUrl: string;
  uploadDate: Date; // issueDate
  expiryDate?: Date;
  documentTypeId?: string;
  documentNumber?: string;
}

/**
 * Employee entity – personal, appointment, and qualification data.
 * بيانات الموظف – الشخصية، التعيين، والمؤهلات.
 */
export interface Employee {
  id: string;
  employeeNumber: string; // رقم الموظف
  nationalId: string; // الرقم القومي
  fullName: string; // الاسم الرباعي
  firstName: string;
  secondName: string;
  thirdName: string;
  lastName: string;
  gender: EmployeeGender;
  birthDate: Date;
  birthPlace: string;
  nationality: string;
  religion: string;
  maritalStatus: EmployeeMaritalStatus;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  /** Persisted child ids — required by UpdateEmployee sync (omit ⇒ insert+delete orphans). */
  contactId?: string;
  addressId?: string;
  educationId?: string;
  photo?: string;

  // بيانات التعيين - Appointment Data
  appointmentDate: Date; // تاريخ التعيين
  appointmentDecisionNumber: string; // رقم قرار التعيين
  appointmentDecisionDate: Date;
  jobTitle: string; // المسمى الوظيفي
  jobGrade: string; // الدرجة الوظيفية
  department: string; // القسم
  section: string; // الوحدة
  workLocation: string; // مكان العمل
  employmentType: EmploymentType; // نوع التعيين
  status: EmployeeStatus; // الحالة

  // المؤهلات - Qualifications
  educationLevel: string; // المؤهل الدراسي
  educationField: string; // التخصص
  graduationYear: number;

  documents: EmployeeDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeFilter {
  query?: string;
  department?: string | null;
  status?: EmployeeStatus | null;
  employmentType?: EmploymentType | null;
}

