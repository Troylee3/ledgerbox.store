import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'SW' | 'EN';

const translations = {
  SW: {
    // Nav & Common
    pos: "Sajili Mauzo",
    inventory: "Katalogi & Stoo",
    expenses: "Matumizi & Afya ya Duka",
    receiptHistory: "Risiti History",
    customers: "Wateja / Madeni",
    reports: "Duru & Ripoti",
    settings: "Mipangilio",
    logout: "Ondoka",
    cashier: "MUUZAJI",
    loading: "Inapakia LedgerBox...",
    activeOffline: "Inakubali offline sasa hivi",
    salesCatalog: "Mfumo wa Mauzo & Katalogi",
    stockStore: "Mfumo wa Mauzo & Stoo",
    
    // Login
    loginTitle: "Ingia kwenye Mfumo",
    chooseUser: "Chagua Mtumiaji wa Kazi",
    enterPin: "Weka PIN yako ya ulinzi",
    loginBtn: "Ingia Kazini",
    invalidPin: "PIN si sahihi! Jaribu tena.",
    welcomeBack: "Karibu tena kazini,",

    // POS
    searchProductPlaceholder: "Tafuta bidhaa kwa jina au barcode...",
    allCategories: "Makundi Yote",
    emptyCartMessage: "Kikapu kiko tupu. Gusa bidhaa ili kuongeza kwenye kikapu.",
    quickCustomItem: "Ongeza Bidhaa Maalum (Custom)",
    customItemName: "Jina la bidhaa...",
    customItemPrice: "Bei ya kuuza (TZS)...",
    addBtn: "Ongeza",
    subtotal: "Nusu Jumla (Subtotal)",
    discount: "Punguzo (Discount)",
    total: "Jumla (Total)",
    selectCustomerPlaceholder: "Chagua Mteja (Hiari)",
    clearCart: "Futa Kikapu",
    checkoutBtn: "Lipa Sasa",
    stockAlert: "Stoo imebaki kidogo!",
    itemsInCart: "Bidhaa kwenye kikapu",
    
    // Checkout Drawer/Modal
    checkoutTitle: "Kamilisha Malipo & Risiti",
    paymentMethodLabel: "Njia ya Malipo",
    cashReceivedLabel: "Kiasi Kilichopokelewa kutoka kwa mteja",
    changeToReturn: "Chenji ya Kurudisha",
    exactAmount: "Pesa Kamili",
    cancelCheckout: "Ghairi",
    confirmPayment: "Sajili Mauzo & Risiti",
    debtPaymentNote: "Mteja atakopa kiasi hiki na kuongezwa kwenye deni lake.",

    // Receipt Modal
    receiptTitle: "Stakabadhi ya Mauzo",
    receiptNo: "Namba ya Risiti",
    cashierLabel: "Muuzaji",
    paidVia: "Imelipwa kwa",
    amountPaid: "Kiasi Kilicholipwa",
    thanksMessage: "Asante kwa kufanya manunuzi nasi!",
    printBtn: "Chapa Risiti (Print)",
    downloadPdf: "Pakua PDF (Download)",
    cancelTransactionBtn: "Batilisha Mauzo Haya (Delete)",
    cancelTxConfirm: "Je, una uhakika unataka kufuta na kubatilisha muamala huu? Bidhaa zitarudishwa stoo.",

    // Inventory
    inventoryTitle: "Katalogi ya Bidhaa & Usimamizi wa Stoo",
    inventorySub: "Orodha ya bidhaa zote, bei zao za kununulia na kuuzia, na viwango vya stoo iliyopo sasa.",
    addProductBtn: "Ongeza Bidhaa Mpya",
    addCategoryBtn: "Ongeza Kundi Mpya (Category)",
    barcodeLabel: "Barcode / SKU",
    productNameLabel: "Jina la Bidhaa",
    categoryLabel: "Kundi la Bidhaa",
    buyingPriceLabel: "Bei ya Kununulia",
    sellingPriceLabel: "Bei ya Kuuzia",
    stockLabel: "Stoo Iliyopo (Quantity)",
    minStockLabel: "Stoo ya Chini ya Tahadhari (Min Stock)",
    actionsLabel: "Vitendo",
    editProduct: "Hariri Bidhaa",
    deleteProduct: "Futa Bidhaa",
    saveBtn: "Hifadhi",
    categoryName: "Jina la Kundi",
    categoryColor: "Rangi ya Kundi",
    noProductsFound: "Hakuna bidhaa inayolingana na utafutaji wako.",

    // Customers / Debts
    customersTitle: "Daftari la Wateja & Kumbukumbu ya Madeni",
    customersSub: "Kagua salio la wateja wako, fanya makubaliano ya kulipa, au kumbuka nani anadaiwa na duka lako.",
    addCustomerBtn: "Ongeza Mteja Mpya",
    customerName: "Jina la Mteja",
    phoneLabel: "Namba ya Simu",
    emailLabel: "Barua Pepe (Email)",
    debtLabel: "Deni Linalodaiwa (Debt)",
    notesLabel: "Maelezo ya Ziada",
    recordPayment: "Lipa Deni / Kopesha",
    noCustomersFound: "Hakuna mteja anayelingana.",
    addDebt: "Kopesha (Add Debt)",
    payDebt: "Pokea Malipo (Pay Debt)",

    // Reports / Dashboard
    reportsTitle: "Duru & Ripoti za Mauzo ya Duka",
    reportsSub: "Mchanganuo kamili wa mauzo, faida ghafi, makusanyo, na mwenendo wa biashara kwa ujumla.",
    todaySales: "Mauzo ya Leo",
    todayProfit: "Faida Ghafi ya Leo",
    activeCustomers: "Wateja wenye Madeni",
    totalDebt: "Deni la Wateja Wote",
    salesTrend: "Mwelekeo wa Mauzo ya Siku",
    topSellingProducts: "Bidhaa Zinazouza Zaidi",
    recentTransactions: "Miamala ya Hivi Karibuni",
    periodToday: "Leo",
    periodMonth: "Mwezi Huu",
    periodAll: "Muda Wote",

    // Settings
    settingsTitle: "Mipangilio ya Mfumo",
    settingsSub: "Sanidi maelezo ya duka lako, stakabadhi za risiti, watumiaji wa mfumo, au pakua/hifadhi data zako zote.",
    storeSettings: "Taarifa za Duka",
    staffSettings: "Watumiaji & Watumishi",
    dataSettings: "Hifadhi & Rejesha Data (Backup)",
    storeNameLabel: "Jina la Duka / Supermarket",
    receiptGreetingLabel: "Salamu ya Risiti (Greeting)",
    currencySymbolLabel: "Alama ya Fedha",
    taxPercentLabel: "Kiwango cha Kodi ya Ziada (%)",
    addStaffBtn: "Ongeza Mtumishi Mpya",
    staffName: "Jina la Mtumishi",
    staffRole: "Wajibu (Role)",
    staffPin: "PIN (Namba 4)",
    permissions: "Ruhusa za Kazi",
    canSell: "Anaweza kuuza",
    canViewCostPrice: "Anaweza kuona bei ya kununulia (Cost)",
    canViewReports: "Anaweza kuona ripoti na faida",
    canManageInventory: "Anaweza kubadili stoo",
    canManageCustomers: "Anaweza kusimamia wateja/madeni",
    canManageSettings: "Anaweza kuona mipangilio mikuu",
    backupDatabase: "Pakua Backup ya Data",
    restoreDatabase: "Rejesha Data kutoka Kwenye Faili",
    resetDatabase: "Futa Data Zote (Reset)",
    resetConfirm: "Tahadhari! Kitendo hiki kitafuta data zote za bidhaa, mauzo na wateja. Huwezi kurudisha nyuma baada ya hapa.",
    whatsappHub: "WhatsApp AI Bookkeeper",
    whatsappSub: "Usimamizi wa mauzo na miamala kupitia WhatsApp",
  },
  EN: {
    // Nav & Common
    pos: "Register Sales",
    inventory: "Inventory & Stock",
    expenses: "Expenses & Business Health",
    receiptHistory: "Receipt History",
    customers: "Customers & Debt",
    reports: "Analytics & Reports",
    settings: "Settings",
    logout: "Log Out",
    cashier: "CASHIER",
    loading: "Loading LedgerBox...",
    activeOffline: "Offline mode active",
    salesCatalog: "POS Sales & Catalog System",
    stockStore: "Sales & Stock System",

    // Login
    loginTitle: "Log In to System",
    chooseUser: "Choose Staff Member",
    enterPin: "Enter your secure PIN",
    loginBtn: "Log In",
    invalidPin: "Invalid PIN! Please try again.",
    welcomeBack: "Welcome back,",

    // POS
    searchProductPlaceholder: "Search product by name or barcode...",
    allCategories: "All Categories",
    emptyCartMessage: "The cart is empty. Touch a product to add it to the cart.",
    quickCustomItem: "Add Custom Product (Quick Sale)",
    customItemName: "Product name...",
    customItemPrice: "Selling price (TZS)...",
    addBtn: "Add Item",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    selectCustomerPlaceholder: "Select Customer (Optional)",
    clearCart: "Clear Cart",
    checkoutBtn: "Pay Now",
    stockAlert: "Low stock alert!",
    itemsInCart: "Items in cart",

    // Checkout Drawer/Modal
    checkoutTitle: "Complete Payment & Receipt",
    paymentMethodLabel: "Payment Method",
    cashReceivedLabel: "Cash Received from customer",
    changeToReturn: "Change to Return",
    exactAmount: "Exact Amount",
    cancelCheckout: "Cancel",
    confirmPayment: "Register Sale & Receipt",
    debtPaymentNote: "Customer will buy on credit and this amount will be added to their debt balance.",

    // Receipt Modal
    receiptTitle: "Sales Receipt",
    receiptNo: "Receipt Number",
    cashierLabel: "Cashier",
    paidVia: "Paid Via",
    amountPaid: "Amount Paid",
    thanksMessage: "Thank you for shopping with us!",
    printBtn: "Print Receipt",
    downloadPdf: "Download PDF",
    cancelTransactionBtn: "Void/Cancel Transaction",
    cancelTxConfirm: "Are you sure you want to void this transaction? All items will be returned to stock.",

    // Inventory
    inventoryTitle: "Product Catalog & Stock Control",
    inventorySub: "List of all products, their cost and selling prices, and current stock levels.",
    addProductBtn: "Add New Product",
    addCategoryBtn: "Add New Category",
    barcodeLabel: "Barcode / SKU",
    productNameLabel: "Product Name",
    categoryLabel: "Product Category",
    buyingPriceLabel: "Cost Price (Buying)",
    sellingPriceLabel: "Selling Price",
    stockLabel: "Current Stock",
    minStockLabel: "Low Stock Alert Limit",
    actionsLabel: "Actions",
    editProduct: "Edit Product",
    deleteProduct: "Delete Product",
    saveBtn: "Save",
    categoryName: "Category Name",
    categoryColor: "Category Color",
    noProductsFound: "No products matched your search query.",

    // Customers / Debts
    customersTitle: "Customer Directory & Debt Tracker",
    customersSub: "Monitor customer balances, process debt payments, and track who owes the store money.",
    addCustomerBtn: "Add New Customer",
    customerName: "Customer Name",
    phoneLabel: "Phone Number",
    emailLabel: "Email Address",
    debtLabel: "Outstanding Debt",
    notesLabel: "Additional Notes",
    recordPayment: "Pay Debt / Lend",
    noCustomersFound: "No matching customers found.",
    addDebt: "Lend (Add Debt)",
    payDebt: "Receive Payment (Pay Debt)",

    // Reports / Dashboard
    reportsTitle: "Store Sales Dashboard & Analytics",
    reportsSub: "Complete breakdown of sales revenue, gross profits, cash collections, and general business trends.",
    todaySales: "Today's Sales",
    todayProfit: "Today's Gross Profit",
    activeCustomers: "Debtors (Customers)",
    totalDebt: "Total Customer Debt",
    salesTrend: "Hourly Sales Velocity",
    topSellingProducts: "Top Selling Products",
    recentTransactions: "Recent Transactions Log",
    periodToday: "Today",
    periodMonth: "This Month",
    periodAll: "All Time",

    // Settings
    settingsTitle: "System Settings",
    settingsSub: "Configure store info, receipt layout, cashiers/staff permissions, and perform data backups.",
    storeSettings: "Store Profile",
    staffSettings: "Staff & Cashiers",
    dataSettings: "Backup & Restore",
    storeNameLabel: "Store / Supermarket Name",
    receiptGreetingLabel: "Receipt Greeting Message",
    currencySymbolLabel: "Currency Symbol",
    taxPercentLabel: "Optional Tax Percent (%)",
    addStaffBtn: "Add New Staff Member",
    staffName: "Staff Name",
    staffRole: "Role",
    staffPin: "PIN (4 Digits)",
    permissions: "Workplace Permissions",
    canSell: "Can register sales",
    canViewCostPrice: "Can view product cost prices",
    canViewReports: "Can view profit reports",
    canManageInventory: "Can manage inventory & stock",
    canManageCustomers: "Can manage customers/debtors",
    canManageSettings: "Can manage global system settings",
    backupDatabase: "Download Local Backup",
    restoreDatabase: "Restore Data from File",
    resetDatabase: "Reset Database (Wipe)",
    resetConfirm: "Warning! This will permanently delete all products, sales records, and customer accounts. This action is irreversible.",
    whatsappHub: "WhatsApp AI Bookkeeper",
    whatsappSub: "Manage automated receipt ingestion from WhatsApp",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['SW']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('SW');

  useEffect(() => {
    const savedLang = localStorage.getItem('ledgerbox_language');
    if (savedLang === 'SW' || savedLang === 'EN') {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ledgerbox_language', lang);
  };

  const t = (key: keyof typeof translations['SW']): string => {
    const section = translations[language];
    return section[key] || translations['SW'][key] || String(key);
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
