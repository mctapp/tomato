// types/distributor.ts
export interface DistributorContact {
  id?: number;
  name: string;
  position?: string;
  department?: string;
  email?: string;
  officePhone?: string;
  mobilePhone?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface DistributorBase {
  name: string;
  isActive: boolean;
  businessRegistrationNumber?: string;
  address?: string;
  website?: string;
  ceoName?: string;
  notes?: string;
  taxInvoiceEmail?: string;
  bankName?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
  settlementCycle?: string;
  defaultRevenueShare?: number;
  paymentMethod?: string;
}

export interface DistributorStats {
  totalDistributors: number;
  totalContacts: number;
}

export interface DistributorResponse extends DistributorBase {
  id: number;
  contacts: DistributorContact[];
}

export interface DistributorListItemResponse {
  id: number;
  name: string;
  isActive: boolean;
}

export interface DistributorCreate extends DistributorBase {
  contacts?: DistributorContact[];
}

export interface DistributorUpdate extends Partial<DistributorBase> {
  contacts?: Array<{id?: number} & Partial<DistributorContact>>;
}
