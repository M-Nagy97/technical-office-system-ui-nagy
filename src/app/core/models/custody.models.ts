/** Matches MyERP.EmployeeCustody.Core.Domain.Custody.CustodyTransactionType */
export enum CustodyTransactionType {
  Give = 1,
  Spend = 2,
  Return = 3,
}

/** Matches CustodyDocumentType */
export enum CustodyDocumentType {
  Contract = 1,
  Check = 2,
  Letter = 3,
  Other = 4,
}

/** Matches CustodyDocumentStatus */
export enum CustodyDocumentStatus {
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
}

/** Matches DocumentTransactionAction */
export enum DocumentTransactionAction {
  Receive = 1,
  Deliver = 2,
  Sign = 3,
  Return = 4,
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CustodyTransactionDto {
  id: string;
  employeeId: string;
  amount: number;
  type: CustodyTransactionType;
  transactionDate: string;
  notes?: string | null;
  attachmentUrl?: string | null;
}

export interface DocumentInHandDto {
  documentId: string;
  title: string;
  documentType: CustodyDocumentType;
}

export interface EmployeeCustodyDetailsDto {
  employeeId: string;
  balance: number;
  recentTransactions: CustodyTransactionDto[];
  documentsInHand: DocumentInHandDto[];
}

export interface DocumentTransactionDto {
  id: string;
  documentId: string;
  fromEmployeeId?: string | null;
  toEmployeeId?: string | null;
  action: DocumentTransactionAction;
  transactionDate: string;
  notes?: string | null;
  attachmentUrl?: string | null;
}

export interface CustodyDocumentSummaryDto {
  id: string;
  title: string;
  documentType: CustodyDocumentType;
  status: CustodyDocumentStatus;
  currentCustodianEmployeeId?: string | null;
}

export interface CreateCustodyTransactionPayload {
  employeeId: string;
  amount: number;
  type: CustodyTransactionType;
  transactionDate: string;
  notes?: string | null;
  attachmentUrl?: string | null;
}

export interface ReturnCustodyAmountPayload {
  employeeId: string;
  amount: number;
  transactionDate: string;
  notes?: string | null;
  attachmentUrl?: string | null;
}

export interface CreateDocumentPayload {
  title: string;
  documentType: CustodyDocumentType;
  initialToEmployeeId?: string | null;
  initialFromEmployeeId?: string | null;
  initialTransactionDate?: string | null;
  initialNotes?: string | null;
  initialAttachmentUrl?: string | null;
}

export interface TransferDocumentPayload {
  documentId: string;
  action: DocumentTransactionAction;
  fromEmployeeId?: string | null;
  toEmployeeId?: string | null;
  transactionDate: string;
  notes?: string | null;
  attachmentUrl?: string | null;
}

export interface CompleteDocumentPayload {
  documentId: string;
  completedAt: string;
  completedByEmployeeId?: string | null;
  notes?: string | null;
  attachmentUrl?: string | null;
}
