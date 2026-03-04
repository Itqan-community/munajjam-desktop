export type Region = "SA";

export interface MetricSnapshot {
  date: string;
  csat: number;
  nps: number;
  ces: number;
}

export interface ComplianceData {
  privacyPolicy: boolean;
  returnPolicy: boolean;
  commercialRegistration: boolean;
  taxLicense: boolean;
  customerSupport: boolean;
  securePayment: boolean;
  certificationDate: string | null;
}

export interface Shop {
  id: string;
  nameAr: string;
  categorySlug: string;
  region: Region;
  logoUrl?: string;
  website?: string;
  metrics: MetricSnapshot[];
  sampleSize?: number;
  lastUpdated: string;
  compliance?: ComplianceData;
}

export interface Category {
  slug: string;
  nameAr: string;
  descriptionAr?: string;
}
