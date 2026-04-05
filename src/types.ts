export interface ScanRecord {
  id: string;
  code: string;
  scanTime: number;
  finishTime: number;
  autoFinished: boolean;
  extractedData?: {
    recipientName?: string;
    phone?: string;
    address?: string;
  };
  scannedBy?: string;
  scannedByUid?: string;
}
