/**
 * نوع الجزاء: تنبيه / إنذار كتابي / خصم / إيقاف / فصل
 */
export type PenaltyType = 'warning' | 'written_warning' | 'deduction' | 'suspension' | 'dismissal';

/**
 * حالة الجزاء
 */
export type PenaltyStatus = 'pending' | 'approved' | 'appealed' | 'cancelled';

/**
 * سجل جزاء موظف
 */
export interface Penalty {
  id: string;
  penaltyNumber: string;   // رقم الجزاء
  employeeId: string;
  employeeName: string;
  type: PenaltyType;      // تنبيه / إنذار كتابي / خصم / إيقاف / فصل
  reason: string;         // سبب الجزاء
  incidentDate: Date;     // تاريخ الواقعة
  decisionDate: Date;    // تاريخ القرار
  decisionNumber: string; // رقم القرار
  deductionDays?: number; // أيام الخصم
  suspensionDays?: number; // أيام الإيقاف
  status: PenaltyStatus;
  appealNotes?: string;
  approvedBy: string;
  notes?: string;
}

/** تسميات أنواع الجزاء بالعربية */
export const PENALTY_TYPE_LABELS: Record<PenaltyType, string> = {
  warning: 'تنبيه',
  written_warning: 'إنذار كتابي',
  deduction: 'خصم',
  suspension: 'إيقاف',
  dismissal: 'فصل',
};

/** تسميات حالات الجزاء بالعربية */
export const PENALTY_STATUS_LABELS: Record<PenaltyStatus, string> = {
  pending: 'قيد الدراسة',
  approved: 'معتمد',
  appealed: 'تحت الطعن',
  cancelled: 'ملغى',
};

/**
 * فلترة الجزاءات
 */
export interface PenaltyFilter {
  employeeId?: string | null;
  type?: PenaltyType | null;
  status?: PenaltyStatus | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  searchText?: string | null;
}

export type CreatePenaltyInput = Omit<Penalty, 'id' | 'penaltyNumber'>;
export type UpdatePenaltyInput = Partial<Penalty>;

