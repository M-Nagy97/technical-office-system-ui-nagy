/**
 * Employee document attached to an employee record.
 */
export interface EmployeeDocument {
  id: string;
  type: 'appointment_decision' | 'id_copy' | 'birth_certificate' | 'qualification' | 'other';
  name: string;
  fileUrl: string;
  uploadDate: Date;
}

/**
 * Appointment-related document (قرار التعيين، إلخ).
 */
export interface AppointmentDocument {
  id: string;
  employeeId: string;
  documentType: string;
  documentNumber: string;
  issueDate: Date;
  description: string;
  fileUrl?: string;
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
  gender: 'male' | 'female';
  birthDate: Date;
  birthPlace: string;
  nationality: string;
  religion: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
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
  employmentType: 'permanent' | 'temporary' | 'contract'; // نوع التعيين
  status: 'active' | 'suspended' | 'terminated' | 'retired'; // الحالة

  // المؤهلات - Qualifications
  educationLevel: string; // المؤهل الدراسي
  educationField: string; // التخصص
  graduationYear: number;

  documents: EmployeeDocument[];
  createdAt: Date;
  updatedAt: Date;
}
