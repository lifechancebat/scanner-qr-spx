export interface ScanRecord {
  id: string;
  code: string;
  scanTime: number;
  finishTime: number;
  autoFinished: boolean;
  scannedBy?: string;
  scannedByUid?: string;
  notes?: string;
}

export interface CameraConfig {
  ip: string;
  port: string;
  username: string;
  password: string;
  urlFormat: '1' | '2' | '3';
  toolUrl?: string;
  tabletUrl?: string;
}
