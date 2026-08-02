/** ZKT K14 Pro — zkemkeeper (CZKEM) bridge only */
export type DeviceIntegrationMode = 1;

export interface Device {
  id: string;
  deviceName: string;
  deviceIp: string;
  port: number;
  commPassword?: number;
  location?: string;
  brand?: string;
  isActive: boolean;
  lastSync?: string;
  lastStatus?: 'Connected' | 'Failed' | 'Unknown';
  integrationMode?: DeviceIntegrationMode;
}

export interface DeviceFormData {
  deviceName: string;
  deviceIp: string;
  port: number;
  commPassword?: number;
  location?: string;
  isActive: boolean;
}

export interface DeviceLogPreview {
  enrollNumber: string;
  empId?: string;
  employeeName?: string;
  employeeFound: boolean;
  punchTime: string;
  direction: number;
  directionLabel: string;
  alreadySaved: boolean;
}

export interface ImportLogItem {
  empId?: string;
  enrollNumber: string;
  punchTime: string;
  direction: number;
}

export interface ReadLogsResult {
  deviceId: string;
  success: boolean;
  errorMessage?: string;
  logs: DeviceLogPreview[];
}

export interface ConnectionResult {
  success: boolean;
  deviceInfo?: {
    serialNumber: string;
    model: string;
    firmwareVersion: string;
  };
  errorMessage?: string;
}

export interface SyncResult {
  deviceId: string;
  logsImported: number;
  success: boolean;
  message: string;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}
