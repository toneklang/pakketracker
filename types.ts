
export enum Carrier {
  POSTNORD = 'PostNord',
  GLS = 'GLS',
  DAO = 'DAO',
  BRING = 'Bring',
  DHL = 'DHL',
  UPS = 'UPS',
  FEDEX = 'FedEx',
  OTHER = 'Other'
}

export enum PackageStatus {
  IN_TRANSIT = 'In Transit',
  READY_FOR_PICKUP = 'Ready for Pickup',
  PICKED_UP = 'Picked Up'
}

export interface Package {
  id: string;
  trackingNumber: string;
  carrier: Carrier;
  sender: string;
  status: PackageStatus;
  receivedDate: string;
  originalText: string;
  lastUpdated: string;
}

export interface ParseResult {
  trackingNumber: string | null;
  carrier: Carrier;
  sender: string | null;
  status: PackageStatus;
}
