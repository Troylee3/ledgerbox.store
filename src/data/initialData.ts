import { DbState, Product, Category, Customer, Transaction, StoreSettings, StaffUser, Supplier, Expense } from '../types';

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'Kodi ya Pango la Duka (Mwezi Huu)',
    category: 'RENT',
    amount: 150000,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'M_PESA',
    recordedBy: 'Brayan (Admin)',
    receiptRef: 'TXN-KODI-8842',
    notes: 'Malipo ya nusu mwezi kodi ya duka kuu',
    isRecurring: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'exp-2',
    title: 'Umeme wa LUKU Dukan',
    category: 'UTILITIES',
    amount: 30000,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'AIRTEL_MONEY',
    recordedBy: 'Brayan (Admin)',
    receiptRef: 'LUKU-990184',
    notes: 'Units 85 za umeme wa duka na friji',
    isRecurring: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'exp-3',
    title: 'Usafiri na Mzigo wa Kariakoo',
    category: 'TRANSPORT',
    amount: 25000,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'CASH',
    recordedBy: 'Anna (Keshia)',
    receiptRef: 'BAJAJ-044',
    notes: 'Kusafirisha mchele na mafuta kutoka soko kuu',
    isRecurring: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'exp-4',
    title: 'Mifuko ya Karatasi & Vifungashio vya Sukari',
    category: 'PACKAGING',
    amount: 15000,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    recordedBy: 'Anna (Keshia)',
    receiptRef: 'VIFUNG-12',
    notes: 'Robo 5 za mifuko ya eco ya wateja',
    isRecurring: false,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1',
    name: 'Kariakoo Agritech Ltd',
    companyName: 'Kariakoo Wholesalers & Distributors',
    phone: '0712345678',
    email: 'info@kariakooagritech.co.tz',
    address: 'Msimbazi St, Kariakoo, Dar es Salaam',
    notes: 'Muuzaji mkuu wa pembejeo za kilimo na mbolea.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'supp-2',
    name: 'Puma Energy Tanzania',
    companyName: 'Puma Energy Ltd',
    phone: '0784990011',
    email: 'orders@pumaenergy.co.tz',
    address: 'Nyerere Road, Dar es Salaam',
    notes: 'Msambazaji wa mafuta ya magari na vilainishi (lubricants).',
    createdAt: new Date().toISOString()
  },
  {
    id: 'supp-3',
    name: 'Shoppers Wholesalers',
    companyName: 'Shoppers Trading Co.',
    phone: '0754882233',
    email: 'supplies@shoppers.tz',
    address: 'Mikocheni, Dar es Salaam',
    notes: 'Msambazaji wa bidhaa za vinywaji, vyakula na vifaa vya nyumbani.',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Chakula na Nafaka', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'cat-2', name: 'Vinywaji', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'cat-3', name: 'Vifaa vya Usafi', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'cat-4', name: 'Urembo na Afya', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'cat-5', name: 'Nyinginezo', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Sukari ya Kilombero 1Kg',
    barcode: '6001234567890',
    category: 'cat-1',
    costPrice: 2800,
    sellingPrice: 3400,
    stock: 45,
    minStock: 10,
    imageUrl: '',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Mafuta ya Kupikia Azam 1L',
    barcode: '6001234567891',
    category: 'cat-1',
    costPrice: 4500,
    sellingPrice: 5500,
    stock: 28,
    minStock: 5,
    imageUrl: '',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Mchele Safi wa Kyela 1Kg',
    barcode: '6001234567892',
    category: 'cat-1',
    costPrice: 2300,
    sellingPrice: 3000,
    stock: 60,
    minStock: 15,
    imageUrl: '',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Sabuni ya Kanga (White)',
    barcode: '6001234567893',
    category: 'cat-3',
    costPrice: 800,
    sellingPrice: 1200,
    stock: 12, // low stock testing
    minStock: 15,
    imageUrl: '',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Maji ya Kilimanjaro 1.5L',
    barcode: '6001234567894',
    category: 'cat-2',
    costPrice: 700,
    sellingPrice: 1100,
    stock: 120,
    minStock: 20,
    imageUrl: '',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Coca-Cola Soda 350ml (Kopo)',
    barcode: '6001234567895',
    category: 'cat-2',
    costPrice: 850,
    sellingPrice: 1200,
    stock: 8, // very low stock testing
    minStock: 20,
    imageUrl: '',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Colgate Whitening Toothpaste 120g',
    barcode: '6001234567896',
    category: 'cat-4',
    costPrice: 2500,
    sellingPrice: 3500,
    stock: 22,
    minStock: 8,
    imageUrl: '',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-8',
    name: 'Unga wa Ngano Azam Home Pride 2Kg',
    barcode: '6001234567897',
    category: 'cat-1',
    costPrice: 3100,
    sellingPrice: 3800,
    stock: 35,
    minStock: 8,
    imageUrl: '',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-9',
    name: 'Dawa ya Mbu Rambo (Spray)',
    barcode: '6001234567898',
    category: 'cat-3',
    costPrice: 4200,
    sellingPrice: 5500,
    stock: 14,
    minStock: 5,
    imageUrl: '',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod-10',
    name: 'Kiberiti cha Paka (Box ya 10)',
    barcode: '6001234567899',
    category: 'cat-5',
    costPrice: 350,
    sellingPrice: 600,
    stock: 50,
    minStock: 10,
    imageUrl: '',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Mama Maria Juma',
    phone: '0712345678',
    email: 'maria.juma@gmail.com',
    debt: 12500, // outstanding debt in TZS
    notes: 'Muuzaji wa duka ndogo jirani. Huruhusiwa kukopa mpaka Kikomo cha 50,000/-',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust-2',
    name: 'Banyeka Edward',
    phone: '0754987654',
    email: 'banyeka.ed@yahoo.com',
    debt: 0,
    notes: 'Hukata risiti mara kwa mara kwa matumizi ya ofisini kwake.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust-3',
    name: 'Asha Ramadhani',
    phone: '0787112233',
    email: 'asha.rama@outlook.com',
    debt: 8000,
    notes: 'Hulipa kupitia M-Pesa kila mwisho wa mwezi.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'LedgerBox',
  phone: '0765 432 100',
  address: 'Shekilango Rd, Dar es Salaam, Tanzania',
  receiptGreeting: 'Asante kwa kufanya manunuzi LedgerBox! Karibu tena.',
  currencySymbol: 'TSh',
  taxPercent: 0,
  monthlyExpenseBudget: 250000, // Bajeti ya matumizi kwa mwezi (TSh 250,000)
  maxExpenseRatioThreshold: 35, // 35% ya mauzo/faida
  expenseAlertsEnabled: true,
  smsProvider: 'SIMULATED',
  smsApiKey: '',
  smsApiSecret: '',
  smsSenderId: 'LEDGERBOX',
  smsEnabled: false,
  smsSandboxMode: false,
  whatsappReceiptAutoSend: true,
  defaultReceiptFormat: 'SIMPLE',
  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappBusinessPhone: '',
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'MONTHLY',
  subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  monthlyFeeAmount: 15000,
  developerName: 'BRAYAN FLAVIAN KAKO',
  developerPhone: '0613584700'
};

// Past transactions helper to make a realistic report dashboard
export const generateInitialTransactions = (products: Product[], customers: Customer[]): Transaction[] => {
  const transactions: Transaction[] = [];
  const paymentMethods: Array<'CASH' | 'CARD' | 'M_PESA' | 'TIGO_PESA' | 'AIRTEL_MONEY'> = [
    'CASH', 'M_PESA', 'TIGO_PESA', 'CASH', 'CARD'
  ];

  const cashiers = ['Brayan', 'Anna', 'Joel'];

  // Days sequence: past 7 days
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    // 2-4 transactions per day
    const numSales = 2 + Math.floor(Math.random() * 3);

    for (let s = 0; s < numSales; s++) {
      // Pick random items
      const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 3));
      const items = selectedProducts.map(prod => ({
        product: prod,
        quantity: 1 + Math.floor(Math.random() * 3),
        customPrice: prod.sellingPrice
      }));

      const subtotal = items.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
      const discount = Math.random() > 0.7 ? (Math.random() > 0.5 ? 500 : 1000) : 0;
      const total = Math.max(subtotal - discount, 0);

      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const customer = Math.random() > 0.5 ? customers[Math.floor(Math.random() * customers.length)] : undefined;
      const cashier = cashiers[Math.floor(Math.random() * cashiers.length)];

      const receivedAmount = paymentMethod === 'CASH' ? Math.ceil(total / 1000) * 1000 : total;
      const changeAmount = paymentMethod === 'CASH' ? receivedAmount - total : 0;

      // Ensure proper timestamp spacing
      const trTime = new Date(dayDate);
      trTime.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

      transactions.push({
        id: `tr-${i}-${s}-${Math.random().toString(36).substr(2, 4)}`,
        items,
        subtotal,
        discount,
        total,
        paymentMethod,
        customerId: customer?.id,
        receivedAmount,
        changeAmount,
        timestamp: trTime.toISOString(),
        cashierName: cashier,
        receiptNumber: `PM-${Math.floor(100000 + Math.random() * 900000)}`
      });
    }
  }

  return transactions;
};

export const getEmptyDbState = (): DbState => {
  return {
    products: [],
    categories: INITIAL_CATEGORIES,
    transactions: [],
    customers: [],
    debtLogs: [],
    stockLogs: [],
    expenses: [],
    suppliers: INITIAL_SUPPLIERS,
    settings: { ...INITIAL_SETTINGS },
    users: [],
    currentUser: null
  };
};

export const getInitialDbState = (): DbState => {
  const products = INITIAL_PRODUCTS;
  const categories = INITIAL_CATEGORIES;
  const customers = INITIAL_CUSTOMERS;
  const settings = INITIAL_SETTINGS;
  const transactions = generateInitialTransactions(products, customers);
  const expenses = INITIAL_EXPENSES;

  // Seed default history of debt log
  const debtLogs = [
    {
      id: 'debt-log-1',
      customerId: 'cust-1',
      type: 'BORROW' as const,
      amount: 15000,
      note: 'Alichukua mafuta na unga wa ngano',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'debt-log-2',
      customerId: 'cust-1',
      type: 'PAYMENT' as const,
      amount: 2500,
      note: 'Alilipa taslimu asubuhi',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'debt-log-3',
      customerId: 'cust-3',
      type: 'BORROW' as const,
      amount: 8000,
      note: 'Mikopo ya soda na sukari dharura',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Seed stock history logs
  const stockLogs = products.map(p => ({
    id: `stock-log-${p.id}`,
    productId: p.id,
    type: 'IN' as const,
    quantity: p.stock + 10, // original stock
    note: 'Kuingiza mzigo wa mwanzoni wa duka',
    timestamp: p.createdAt
  }));

  const users: StaffUser[] = [
    {
      id: 'usr-1',
      name: 'Brayan (Admin)',
      role: 'ADMIN',
      pin: '1234',
      createdAt: new Date().toISOString(),
      permissions: {
        canSell: true,
        canViewCostPrice: true,
        canViewReports: true,
        canManageInventory: true,
        canManageCustomers: true,
        canManageExpenses: true,
        canManageSettings: true
      }
    },
    {
      id: 'usr-2',
      name: 'Anna (Keshia)',
      role: 'CASHIER',
      pin: '0000',
      createdAt: new Date().toISOString(),
      permissions: {
        canSell: true,
        canViewCostPrice: false,
        canViewReports: false,
        canManageInventory: false,
        canManageCustomers: true,
        canManageExpenses: false,
        canManageSettings: false
      }
    }
  ];

  return {
    products,
    categories,
    transactions,
    customers,
    debtLogs,
    stockLogs,
    expenses,
    suppliers: INITIAL_SUPPLIERS,
    settings,
    users,
    currentUser: null
  };
};
