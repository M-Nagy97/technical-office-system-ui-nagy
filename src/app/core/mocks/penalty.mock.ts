import { Penalty, PenaltyType, PenaltyStatus } from '../models/penalty.model';
import { Employee } from '../models/employee.model';

const MOCK_PENALTY_TYPES: PenaltyType[] = ['warning', 'written_warning', 'deduction', 'suspension', 'dismissal'];
const MOCK_PENALTY_REASONS: string[] = [
  'التأخر عن العمل دون عذر مقبول',
  'عدم الالتزام بمواعيد الدوام الرسمية',
  'إهمال في أداء المهام الموكلة',
  'مخالفة تعليمات العمل واللوائح الداخلية',
  'عدم تسليم التقرير الشهري في الموعد المحدد',
  'الغياب دون إذن مسبق لمدة يومين',
  'التصرف بشكل يخل بواجبات الوظيفة',
  'الإخلال بأمانة الوظيفة',
];
const MOCK_PENALTY_STATUSES: PenaltyStatus[] = ['pending', 'approved', 'appealed', 'cancelled'];

export function generateMockPenalties(employees: Employee[], count = 10): Penalty[] {
  // Disabled mock penalties generation:
  return [];

  /*
  if (employees.length === 0) return [];
  const list: Penalty[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < count; i++) {
    const emp = employees[i % employees.length];
    const type = MOCK_PENALTY_TYPES[i % MOCK_PENALTY_TYPES.length];
    const incidentDate = new Date();
    incidentDate.setDate(incidentDate.getDate() - (i + 1) * 8);
    const decisionDate = new Date(incidentDate);
    decisionDate.setDate(decisionDate.getDate() + 3);
    const penaltySeq = String(i + 1).padStart(4, '0');

    list.push({
      id: `pen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      penaltyNumber: `PEN-${currentYear}-${penaltySeq}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      type,
      reason: MOCK_PENALTY_REASONS[i % MOCK_PENALTY_REASONS.length],
      incidentDate,
      decisionDate,
      decisionNumber: `قرار ${100 + i} لسنة ${currentYear}`,
      deductionDays: type === 'deduction' ? (i % 3) + 1 : undefined,
      suspensionDays: type === 'suspension' ? (i % 2) + 1 : undefined,
      status: MOCK_PENALTY_STATUSES[i % MOCK_PENALTY_STATUSES.length],
      approvedBy: 'الإدارة',
      notes: i % 2 === 0 ? 'تم التحقق من الواقعة.' : undefined,
    });
  }

  return list;
  */
}
