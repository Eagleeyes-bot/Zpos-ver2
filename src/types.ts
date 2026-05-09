export interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  costPrice: number;
  sellingPrice?: number; // Optional now, as set at sale
  supplierId: string;
  status: 'available' | 'sold' | 'missing' | 'returned';
  purchaseDate: string;
  saleId?: string;
  // New Fields
  registeredBy: string;
  color: string;
  storage: string;
  batteryPercentage: number;
  region: string;
  branchName: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  customerId: string;
  deviceIds: string[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'cash' | 'card' | 'installment';
  installmentId?: string;
  createdAt: string;
  branchName: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  saleId: string;
  customerId: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numberOfMonths: number;
  status: 'active' | 'completed' | 'overdue';
  payments: InstallmentPayment[];
  createdAt: string;
}

export interface InstallmentPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}
