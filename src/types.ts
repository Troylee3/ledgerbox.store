/**
 * Types and Interfaces for LedgerBox POS System
 */

export interface BusinessAccount {
  id: string;
  email: string;
  ownerName: string;
  storeName: string;
  phone?: string;
  address?: string;
  password?: string;
  passwordHash?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string; // SKU or barcode for search
  category: string; // category ID
  costPrice: number; // to calculate profit
  sellingPrice: number;
  stock: number;
  minStock: number; // threshold for low stock alert
  imageUrl: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // for color coding the POS grid
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number; // optional custom price for this specific sale
}

export type PaymentMethod = 
  | 'CASH'       // Pesa Taslimu
  | 'CARD'       // Kadi ya Benki
  | 'M_PESA'     // Vodacom M-Pesa
  | 'TIGO_PESA'  // Tigo Pesa
  | 'AIRTEL_MONEY' // Airtel Money
  | 'HALOPESA'   // Halotel HaloPesa
  | 'CREDIT';    // Mkopo / Deni (Lipa Baadaye)

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number; // absolute amount of discount
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: string; // linked customer for debt or customer ledger
  customerName?: string; // optional customer name snapshot
  receivedAmount: number; // amount paid by customer
  changeAmount: number; // returned change
  timestamp: string; // ISO date string
  cashierName: string;
  receiptNumber: string; // PM-XXXXXX format
  note?: string; // Optional custom remarks or backdated reference note
  isBackdated?: boolean; // Flag if recorded for past date
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  debt: number; // accumulated unpaid balance (Deni linalodaiwa)
  dueDate?: string; // ISO date string (YYYY-MM-DD) for debt payment deadline
  notes: string;
  createdAt: string;
}

export interface DebtLog {
  id: string;
  customerId: string;
  type: 'BORROW' | 'PAYMENT';
  amount: number;
  note: string;
  timestamp: string;
  receiptId?: string; // if related to a transaction
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  recordedBy?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'SALE' | 'ADJUST';
  quantity: number; // absolute change
  note: string;
  timestamp: string;
}

export type ExpenseCategory = 
  | 'RENT'          // Kodi ya Pango
  | 'SALARIES'      // Mishahara na Vibaruwa
  | 'UTILITIES'     // LUKU (Umeme), Maji, Internet
  | 'TRANSPORT'     // Usafiri & Nauli ya Mizigo
  | 'PACKAGING'     // Mifuko & Vifungashio
  | 'MEALS'         // Posho ya Chakula & Chai
  | 'MARKETING'     // Matangazo & Masoko
  | 'MAINTENANCE'   // Ukarabati & Matengenezo
  | 'TAX_PERMITS'   // Leseni, Ushuru & Vibali
  | 'SUPPLIES'      // Vifaa vya Ofisi/Duka
  | 'OTHER';        // Matumizi Mengineyo

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  recordedBy: string;
  receiptRef?: string; // Namba ya risiti au muamala
  notes?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  pin: string; // pin for login, e.g. "1234"
  createdAt: string;
  permissions: {
    canSell: boolean;
    canViewCostPrice: boolean;
    canViewReports: boolean;
    canManageInventory: boolean;
    canManageCustomers: boolean;
    canManageExpenses?: boolean;
    canManageSettings: boolean;
  };
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  receiptGreeting: string; // e.g. "Asante kwa kufanya manunuzi nasi!"
  currencySymbol: string; // e.g. "TZS" or "TSh"
  taxPercent: number; // if tax is included in prices or extra
  logoUrl?: string; // Business logo image (base64 Data URL or HTTP URL)
  monthlyExpenseBudget?: number; // Bajeti ya matumizi kwa mwezi (e.g. 500,000)
  maxExpenseRatioThreshold?: number; // Asilimia ya juu ya matumizi dhidi ya mauzo (e.g. 35%)
  expenseAlertsEnabled?: boolean; // Wezesha tahadhari za kiotomatiki
  smsProvider?: 'BEEM' | 'NEXTSMS' | 'TWILIO' | 'SIMULATED';
  smsApiKey?: string;
  smsApiSecret?: string;
  smsSenderId?: string;
  smsEnabled?: boolean;
  smsSandboxMode?: boolean;
  whatsappReceiptAutoSend?: boolean;
  defaultReceiptFormat?: 'SIMPLE' | 'DETAILED';
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessPhone?: string;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'LOCKED' | 'TRIAL';
  subscriptionExpiryDate?: string;
  subscriptionPlan?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'TRIAL';
  monthlyFeeAmount?: number;
  developerName?: string;
  developerPhone?: string;
  developerPin?: string;
  lastLicenseKeyUsed?: string;
  activatedAt?: string;
}

export interface Shop {
  id: string;
  name: string;
  createdAt: string;
  lastSynced?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface DbState {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  customers: Customer[];
  debtLogs: DebtLog[];
  stockLogs: StockLog[];
  expenses?: Expense[];
  suppliers?: Supplier[];
  settings: StoreSettings;
  users?: StaffUser[];
  currentUser?: StaffUser | null;
}
