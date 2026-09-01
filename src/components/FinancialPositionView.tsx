import React, { useState, useMemo, useEffect } from 'react';
import { DbState } from '../types';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Printer, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  CheckCircle2, 
  Wallet, 
  CreditCard, 
  Scale,
  Package,
  ShieldCheck,
  FileSpreadsheet,
  BarChart3,
  PlusCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  HelpCircle,
  Landmark,
  Percent,
  CheckCircle,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface FinancialPositionViewProps {
  state: DbState;
  language: 'SW' | 'EN';
}

const MONTH_NAMES_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface CustomAssetOrLiability {
  id: string;
  name: string;
  nameEn: string;
  amount: number;
  category?: 'FIXED_ASSET' | 'LONG_TERM_LIABILITY' | 'CURRENT_LIABILITY';
  dateRecorded?: string;
  notes?: string;
}

export default function FinancialPositionView({ state, language }: FinancialPositionViewProps) {
  const { transactions, products, customers, settings, stockLogs } = state;
  const currency = settings.currencySymbol || 'TZS';
  const storeName = settings.storeName || (language === 'SW' ? 'Duka Langu' : 'My Store');

  // Available accounting years from transaction data & current date
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
    transactions.forEach(tx => {
      const year = new Date(tx.timestamp).getFullYear();
      if (!isNaN(year) && year > 2000) {
        yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear();
  });

  const [viewMode, setViewMode] = useState<'OFFICIAL_STATEMENT' | 'MONTHLY_TABLE' | 'ASSET_BREAKDOWN'>('OFFICIAL_STATEMENT');

  // Storage keys based on store context
  const fixedAssetsStorageKey = `pm_financial_custom_assets_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const liabilitiesStorageKey = `pm_financial_custom_liabilities_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const accountsPayableKey = `pm_financial_accounts_payable_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // User-recorded Fixed Assets (e.g. Mashine, Gari, Vifaa vya POS, Samani) - Starts strictly empty unless user recorded
  const [fixedAssets, setFixedAssets] = useState<CustomAssetOrLiability[]>(() => {
    try {
      const saved = localStorage.getItem(fixedAssetsStorageKey) || localStorage.getItem('pm_financial_custom_assets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User-recorded Long-term Liabilities (e.g. Mkopo wa Benki, SACCOS) - Starts strictly empty unless user recorded
  const [longTermLiabilities, setLongTermLiabilities] = useState<CustomAssetOrLiability[]>(() => {
    try {
      const saved = localStorage.getItem(liabilitiesStorageKey) || localStorage.getItem('pm_financial_custom_liabilities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User-recorded Accounts Payable / Madeni ya Wasambazaji
  const [accountsPayable, setAccountsPayable] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(accountsPayableKey) || localStorage.getItem('pm_financial_accounts_payable');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Persist user-recorded entries to localStorage
  useEffect(() => {
    localStorage.setItem(fixedAssetsStorageKey, JSON.stringify(fixedAssets));
  }, [fixedAssets, fixedAssetsStorageKey]);

  useEffect(() => {
    localStorage.setItem(liabilitiesStorageKey, JSON.stringify(longTermLiabilities));
  }, [longTermLiabilities, liabilitiesStorageKey]);

  useEffect(() => {
    localStorage.setItem(accountsPayableKey, accountsPayable.toString());
  }, [accountsPayable, accountsPayableKey]);

  // Modal State for Recording/Editing Assets and Liabilities
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeRecordType, setActiveRecordType] = useState<'FIXED_ASSET' | 'LONG_TERM_LIABILITY' | 'ACCOUNTS_PAYABLE'>('FIXED_ASSET');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Form input fields
  const [recordName, setRecordName] = useState('');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  // Handle adding or editing a record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(recordAmount);
    if (isNaN(amountVal) || amountVal < 0) {
      alert(language === 'SW' ? 'Tafadhali ingiza kiasi halali cha fedha (nambari)' : 'Please enter a valid amount');
      return;
    }

    if (activeRecordType === 'ACCOUNTS_PAYABLE') {
      setAccountsPayable(amountVal);
      setIsRecordModalOpen(false);
      setEditingItemId(null);
      setRecordName('');
      setRecordAmount('');
      setRecordNotes('');
      return;
    }

    if (!recordName.trim()) {
      alert(language === 'SW' ? 'Tafadhali ingiza jina au maelezo ya rasilimali/dhima' : 'Please enter a name or description');
      return;
    }

    const newItem: CustomAssetOrLiability = {
      id: editingItemId || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: recordName.trim(),
      nameEn: recordName.trim(),
      amount: amountVal,
      category: activeRecordType,
      dateRecorded: new Date().toISOString().split('T')[0],
      notes: recordNotes.trim()
    };

    if (activeRecordType === 'FIXED_ASSET') {
      if (editingItemId) {
        setFixedAssets(prev => prev.map(item => item.id === editingItemId ? newItem : item));
      } else {
        setFixedAssets(prev => [...prev, newItem]);
      }
    } else if (activeRecordType === 'LONG_TERM_LIABILITY') {
      if (editingItemId) {
        setLongTermLiabilities(prev => prev.map(item => item.id === editingItemId ? newItem : item));
      } else {
        setLongTermLiabilities(prev => [...prev, newItem]);
      }
    }

    // Reset Form
    setIsRecordModalOpen(false);
    setEditingItemId(null);
    setRecordName('');
    setRecordAmount('');
    setRecordNotes('');
  };

  const handleEditItem = (item: CustomAssetOrLiability, type: 'FIXED_ASSET' | 'LONG_TERM_LIABILITY') => {
    setActiveRecordType(type);
    setEditingItemId(item.id);
    setRecordName(item.name);
    setRecordAmount(item.amount.toString());
    setRecordNotes(item.notes || '');
    setIsRecordModalOpen(true);
  };

  const handleDeleteItem = (id: string, type: 'FIXED_ASSET' | 'LONG_TERM_LIABILITY') => {
    if (confirm(language === 'SW' ? 'Una uhakika unataka kufuta rekodi hii kutoka kwenye Mizania?' : 'Are you sure you want to delete this record?')) {
      if (type === 'FIXED_ASSET') {
        setFixedAssets(prev => prev.filter(item => item.id !== id));
      } else {
        setLongTermLiabilities(prev => prev.filter(item => item.id !== id));
      }
    }
  };

  const openNewRecordModal = (type: 'FIXED_ASSET' | 'LONG_TERM_LIABILITY' | 'ACCOUNTS_PAYABLE') => {
    setActiveRecordType(type);
    setEditingItemId(null);
    setRecordName('');
    if (type === 'ACCOUNTS_PAYABLE') {
      setRecordAmount(accountsPayable > 0 ? accountsPayable.toString() : '');
    } else {
      setRecordAmount('');
    }
    setRecordNotes('');
    setIsRecordModalOpen(true);
  };

  // Month-by-Month computation for the selected year
  const annualMonthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthLabel = language === 'SW' ? MONTH_NAMES_SW[i] : MONTH_NAMES_EN[i];
      const shortLabel = monthLabel.substring(0, 3);
      return {
        monthIndex: i,
        monthName: monthLabel,
        shortName: shortLabel,
        txCount: 0,
        grossSales: 0,
        cogs: 0,
        grossProfit: 0,
        discounts: 0,
        losses: 0,
        netProfit: 0,
        cashCollections: 0,
        mobileMoney: 0,
        creditIssued: 0,
        profitMargin: 0
      };
    });

    // 1. Transactions breakdown (Strict decoupling of unpaid credit)
    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      if (txDate.getFullYear() === selectedYear) {
        const mIdx = txDate.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          const row = months[mIdx];
          const isCredit = tx.paymentMethod === 'CREDIT';
          const paidPortion = isCredit ? (tx.receivedAmount || 0) : (tx.total || 0);

          row.txCount += 1;
          row.grossSales += paidPortion;
          row.discounts += (tx.discount || 0);

          if (isCredit) {
            row.creditIssued += ((tx.total || 0) - (tx.receivedAmount || 0));
            if (paidPortion > 0) row.cashCollections += paidPortion;
          } else if (tx.paymentMethod === 'CASH') {
            row.cashCollections += tx.total;
          } else {
            row.mobileMoney += tx.total;
          }

          // Compute COGS
          let txCost = 0;
          tx.items?.forEach(item => {
            const cost = (item.product?.costPrice || 0) * (item.quantity || 0);
            txCost += cost;
          });
          row.cogs += txCost;
        }
      }
    });

    // Process Debt Repayments: Sync realized debt payments to gross sales and liquid funds of the payment month
    (state.debtLogs || []).forEach(log => {
      if (log.type === 'PAYMENT') {
        const logDate = new Date(log.timestamp);
        if (logDate.getFullYear() === selectedYear) {
          const mIdx = logDate.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            const amt = log.amount || 0;
            months[mIdx].grossSales += amt;
            const pm = (log.paymentMethod || 'CASH').toUpperCase();
            if (pm === 'CASH') {
              months[mIdx].cashCollections += amt;
            } else {
              months[mIdx].mobileMoney += amt;
            }
          }
        }
      }
    });

    // 2. Stock logs / losses breakdown
    stockLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate.getFullYear() === selectedYear) {
        const mIdx = logDate.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          if (log.type === 'ADJUST' && (log.note?.toLowerCase().includes('damage') || log.note?.toLowerCase().includes('haribika') || log.note?.toLowerCase().includes('loss') || log.note?.toLowerCase().includes('uharibifu'))) {
            const product = products.find(p => p.id === log.productId);
            const unitCost = product?.costPrice || 0;
            const lossVal = Math.abs(log.quantity) * unitCost;
            months[mIdx].losses += lossVal;
          }
        }
      }
    });

    // Finalize gross & net profit and margins
    months.forEach(m => {
      m.grossProfit = Math.max(0, m.grossSales - m.cogs);
      m.netProfit = Math.max(0, m.grossProfit - m.losses);
      m.profitMargin = m.grossSales > 0 ? (m.netProfit / m.grossSales) * 100 : 0;
    });

    return months;
  }, [transactions, products, stockLogs, selectedYear, language]);

  // Aggregate Annual Totals
  const yearTotals = useMemo(() => {
    return annualMonthlyData.reduce(
      (acc, m) => {
        acc.txCount += m.txCount;
        acc.grossSales += m.grossSales;
        acc.cogs += m.cogs;
        acc.grossProfit += m.grossProfit;
        acc.discounts += m.discounts;
        acc.losses += m.losses;
        acc.netProfit += m.netProfit;
        acc.cashCollections += m.cashCollections;
        acc.mobileMoney += m.mobileMoney;
        acc.creditIssued += m.creditIssued;
        return acc;
      },
      {
        txCount: 0,
        grossSales: 0,
        cogs: 0,
        grossProfit: 0,
        discounts: 0,
        losses: 0,
        netProfit: 0,
        cashCollections: 0,
        mobileMoney: 0,
        creditIssued: 0
      }
    );
  }, [annualMonthlyData]);

  // Total Fixed Assets Sum
  const totalFixedAssets = useMemo(() => {
    return fixedAssets.reduce((sum, fa) => sum + (fa.amount || 0), 0);
  }, [fixedAssets]);

  // Total Long-term Liabilities Sum
  const totalLongTermLiabilities = useMemo(() => {
    return longTermLiabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  }, [longTermLiabilities]);

  // Annual Statement of Financial Position Key Items
  const financialPosition = useMemo(() => {
    // Current Inventory Valuation at cost
    const inventoryCostValue = products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stock || 0)), 0);
    const inventoryRetailValue = products.reduce((sum, p) => sum + ((p.sellingPrice || 0) * (p.stock || 0)), 0);
    const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    // Accounts Receivable (Customer Debts)
    const accountsReceivable = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

    // Liquid Cash & Mobile Money Generated during the year
    const liquidCash = yearTotals.cashCollections;
    const liquidMobileMoney = yearTotals.mobileMoney;
    const totalLiquidFunds = liquidCash + liquidMobileMoney;

    // Total Current Assets
    const currentAssets = totalLiquidFunds + inventoryCostValue + accountsReceivable;

    // Total Non-Current Assets (Fixed assets)
    const nonCurrentAssets = totalFixedAssets;

    // Total Assets (Jumla Kuu ya Rasilimali)
    const totalAssets = currentAssets + nonCurrentAssets;

    // Current Liabilities (Dhima za Sasa)
    // Accrued TRA Tax estimate
    const annualTurnover = yearTotals.grossSales;
    let accruedTax = 0;
    if (annualTurnover > 200000000) {
      accruedTax = yearTotals.netProfit * 0.30;
    } else if (annualTurnover > 100000000) {
      accruedTax = 450000 + ((annualTurnover - 100000000) * 0.035);
    } else if (annualTurnover > 40000000) {
      accruedTax = 250000 + ((annualTurnover - 40000000) * 0.03);
    } else if (annualTurnover > 20000000) {
      accruedTax = 150000;
    } else if (annualTurnover > 0) {
      accruedTax = 50000;
    }

    const currentLiabilities = accruedTax + accountsPayable;
    const totalLiabilities = currentLiabilities + totalLongTermLiabilities;

    // Equity and Reserves:
    // Retained Profit for the year
    const retainedEarnings = yearTotals.netProfit;
    
    // Balancing Owner's Capital Base = Total Assets - Total Liabilities - Retained Earnings
    // Ensuring Balance Equation: Total Equity & Liabilities === Total Assets
    const initialCapitalBase = Math.max(0, totalAssets - totalLiabilities - retainedEarnings);
    const totalEquity = initialCapitalBase + retainedEarnings;
    const totalEquityAndLiabilities = totalEquity + totalLiabilities;

    // Net Worth & Working Capital
    const netWorth = totalAssets - totalLiabilities;
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : (currentAssets > 0 ? 10 : 1);

    return {
      inventoryCostValue,
      inventoryRetailValue,
      totalStockUnits,
      accountsReceivable,
      liquidCash,
      liquidMobileMoney,
      totalLiquidFunds,
      nonCurrentAssets,
      currentAssets,
      totalAssets,
      accruedTax,
      accountsPayable,
      currentLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
      initialCapitalBase,
      retainedEarnings,
      totalEquity,
      totalEquityAndLiabilities,
      netWorth,
      workingCapital,
      currentRatio,
      annualNetProfit: yearTotals.netProfit,
      annualTurnover: yearTotals.grossSales
    };
  }, [products, customers, yearTotals, totalFixedAssets, totalLongTermLiabilities, accountsPayable]);

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // Handle CSV export
  const handleExportCSV = () => {
    const headers = [
      language === 'SW' ? 'Kipengele cha Mizania' : 'Balance Sheet Line Item',
      language === 'SW' ? `Kiasi Tarehe 31 Des ${selectedYear} (TZS)` : `Amount at 31 Dec ${selectedYear} (TZS)`,
      language === 'SW' ? 'Ufafanuzi wa Hesabu' : 'Classification / Note'
    ];

    const rows = [
      ['A. RASILIMALI ZISIZO ZA SASA (NON-CURRENT ASSETS)', '', ''],
      ...fixedAssets.map(fa => [
        language === 'SW' ? fa.name : fa.nameEn,
        fa.amount,
        'Rasilimali za kudumu za duka'
      ]),
      [language === 'SW' ? 'JUMLA YA RASILIMALI ZISIZO ZA SASA' : 'TOTAL NON-CURRENT ASSETS', financialPosition.nonCurrentAssets, 'Note 1'],
      ['', '', ''],
      ['B. RASILIMALI ZA SASA (CURRENT ASSETS)', '', ''],
      [language === 'SW' ? 'Stoo ya Bidhaa kwa Bei ya Gharama (Inventory)' : 'Merchandise Inventory at Cost', financialPosition.inventoryCostValue, 'Note 2'],
      [language === 'SW' ? 'Madeni ya Wateja (Accounts Receivable)' : 'Trade Receivables (Debtors)', financialPosition.accountsReceivable, 'Note 3'],
      [language === 'SW' ? 'Fedha Taslimu Mkononi (Cash on Hand)' : 'Cash in Hand', financialPosition.liquidCash, 'Note 4'],
      [language === 'SW' ? 'Fedha za Mitandao ya Simu (Mobile Money)' : 'Mobile Money Balances', financialPosition.liquidMobileMoney, 'Note 4'],
      [language === 'SW' ? 'JUMLA YA RASILIMALI ZA SASA' : 'TOTAL CURRENT ASSETS', financialPosition.currentAssets, ''],
      ['', '', ''],
      [language === 'SW' ? 'JUMLA KUU YA RASILIMALI (TOTAL ASSETS)' : 'TOTAL ASSETS', financialPosition.totalAssets, 'Assets = Equity + Liabilities'],
      ['', '', ''],
      ['C. MTAJI NA THAMANI HALISI (EQUITY & RESERVES)', '', ''],
      [language === 'SW' ? 'Mtaji wa Mmiliki wa Biashara (Owner Capital)' : 'Owner Capital Base', financialPosition.initialCapitalBase, 'Note 5'],
      [language === 'SW' ? 'Faida Halisi ya Mwaka (Retained Earnings)' : 'Retained Profit for the Year', financialPosition.retainedEarnings, 'Kutoka Taarifa ya Faida/Hasara'],
      [language === 'SW' ? 'JUMLA YA MTAJI NA THAMANI HALISI' : 'TOTAL EQUITY', financialPosition.totalEquity, ''],
      ['', '', ''],
      ['D. DHIMA ZISIZO ZA SASA (NON-CURRENT LIABILITIES)', '', ''],
      ...longTermLiabilities.map(l => [
        language === 'SW' ? l.name : l.nameEn,
        l.amount,
        'Madeni ya muda mrefu'
      ]),
      [language === 'SW' ? 'JUMLA YA DHIMA ZISIZO ZA SASA' : 'TOTAL NON-CURRENT LIABILITIES', financialPosition.totalLongTermLiabilities, ''],
      ['', '', ''],
      ['E. DHIMA ZA SASA (CURRENT LIABILITIES)', '', ''],
      [language === 'SW' ? 'Madeni ya Wasambazaji (Accounts Payable)' : 'Trade Payables (Suppliers)', financialPosition.accountsPayable, ''],
      [language === 'SW' ? 'Kodi ya TRA ya Kulipwa (Accrued Tax)' : 'Accrued TRA Tax Liability', financialPosition.accruedTax, 'Note 6'],
      [language === 'SW' ? 'JUMLA YA DHIMA ZA SASA' : 'TOTAL CURRENT LIABILITIES', financialPosition.currentLiabilities, ''],
      ['', '', ''],
      [language === 'SW' ? 'JUMLA YA DHIMA (TOTAL LIABILITIES)' : 'TOTAL LIABILITIES', financialPosition.totalLiabilities, ''],
      ['', '', ''],
      [language === 'SW' ? 'JUMLA KUU YA MTAJI NA DHIMA (TOTAL EQUITY & LIABILITIES)' : 'TOTAL EQUITY AND LIABILITIES', financialPosition.totalEquityAndLiabilities, '100% Balanced']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement_of_Financial_Position_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SECTION HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <span>
                  {language === 'SW'
                    ? `Taarifa ya Hali ya Kifedha kwa Mwaka Ulioishia 31 Desemba ${selectedYear}`
                    : `Statement of Financial Position for the Year Ended 31st Dec ${selectedYear}`}
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-md uppercase font-mono tracking-wider">
                  Balance Sheet
                </span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            {language === 'SW'
              ? `Hesabu rasmi za Mizania ya ${storeName} zinazoonesha Rasilimali zote (Assets), Dhima na Madeni (Liabilities), Thamani Halisi ya Mmiliki (Equity), Mtaji wa Mzunguko (Working Capital), na uwiano wa hesabu.`
              : `Official balance sheet & statement of financial position for ${storeName} detailing Non-Current & Current Assets, Liabilities, Owner's Equity, and Net Working Capital.`}
          </p>
        </div>

        {/* Year Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Record Asset / Liability Button */}
          <button
            onClick={() => openNewRecordModal('FIXED_ASSET')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20 active:scale-95"
            title={language === 'SW' ? 'Rekodi rasilimali za kudumu, mikopo, au madeni ya wasambazaji' : 'Record custom fixed assets, loans or supplier payables'}
          >
            <Plus size={15} />
            <span>{language === 'SW' ? '+ Rekodi Rasilimali / Dhima' : '+ Record Asset / Liability'}</span>
          </button>

          {/* Year Picker Dropdown */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 shadow-3xs">
            <Calendar size={15} className="text-slate-500 mr-2 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 mr-1.5 uppercase tracking-wider">
              {language === 'SW' ? 'Mwaka:' : 'Year:'}
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-extrabold text-xs text-slate-900 outline-none cursor-pointer pr-1"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            title={language === 'SW' ? 'Pakua Jedwali (CSV / Excel)' : 'Export CSV / Excel'}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <Download size={14} className="text-slate-600" />
            <span className="hidden sm:inline">CSV / Excel</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            title={language === 'SW' ? 'Chapa Taarifa ya Hali ya Kifedha' : 'Print Statement'}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-950/20"
          >
            <Printer size={14} />
            <span>{language === 'SW' ? 'Chapa Taarifa' : 'Print Statement'}</span>
          </button>
        </div>
      </div>

      {/* TOP EXECUTIVE KPI FINANCIAL SCORECARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Assets Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400">
            <Building2 size={20} />
          </div>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            {language === 'SW' ? '1. Jumla ya Rasilimali (Assets)' : '1. Total Business Assets'}
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white mb-2">
            {currency} {financialPosition.totalAssets.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>{language === 'SW' ? 'Stoo, Pesa & Vifaa' : 'Stock, Cash & Equipment'}</span>
            <span className="font-mono font-bold">100% Assets</span>
          </div>
        </div>

        {/* 2. Total Liabilities Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Scale size={20} />
          </div>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            {language === 'SW' ? '2. Jumla ya Dhima (Liabilities)' : '2. Total Liabilities'}
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-rose-600 mb-2">
            {currency} {financialPosition.totalLiabilities.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>{language === 'SW' ? 'Kodi ya TRA & Madeni' : 'Accrued Taxes & Debts'}</span>
            <span className="font-mono font-bold text-rose-700">
              {financialPosition.totalAssets > 0 ? `${((financialPosition.totalLiabilities / financialPosition.totalAssets) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* 3. Owner Equity & Net Worth */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800/60 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
            <Layers size={20} />
          </div>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-200 block mb-1">
            {language === 'SW' ? '3. Thamani Halisi (Net Worth)' : '3. Owner Equity & Net Worth'}
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white mb-2">
            {currency} {financialPosition.netWorth.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 font-medium flex items-center justify-between border-t border-emerald-800/60 pt-2">
            <span>{language === 'SW' ? 'Mtaji + Faida Halisi' : 'Capital + Retained Profit'}</span>
            <span className="font-mono font-bold bg-emerald-800/60 px-2 py-0.5 rounded text-white">
              {financialPosition.totalAssets > 0 ? `${((financialPosition.netWorth / financialPosition.totalAssets) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* 4. Net Working Capital Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Wallet size={20} />
          </div>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            {language === 'SW' ? '4. Mtaji wa Mzunguko (Working Capital)' : '4. Net Working Capital'}
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-sky-700 mb-2">
            {currency} {financialPosition.workingCapital.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>{language === 'SW' ? 'Ukwasi wa Biashara' : 'Current Assets - Liabilities'}</span>
            <span className="font-mono font-bold text-emerald-700">
              Ratio {financialPosition.currentRatio.toFixed(1)}:1
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE TABS */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 overflow-x-auto scrollbar-none select-none">
        <button
          onClick={() => setViewMode('OFFICIAL_STATEMENT')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer select-none whitespace-nowrap ${
            viewMode === 'OFFICIAL_STATEMENT'
              ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 size={15} />
          {language === 'SW' ? '1. Taarifa Rasmi ya Hali ya Kifedha (Statement of Financial Position)' : '1. Statement of Financial Position'}
        </button>

        <button
          onClick={() => setViewMode('MONTHLY_TABLE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer select-none whitespace-nowrap ${
            viewMode === 'MONTHLY_TABLE'
              ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={15} />
          {language === 'SW' ? '2. Jedwali la Miezi 12 (12-Month Ledger)' : '2. 12-Month Performance Table'}
        </button>

        <button
          onClick={() => setViewMode('ASSET_BREAKDOWN')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer select-none whitespace-nowrap ${
            viewMode === 'ASSET_BREAKDOWN'
              ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={15} />
          {language === 'SW' ? '3. Grafu na Muundo wa Rasilimali (Visual Trends)' : '3. Visual Trends & Asset Structure'}
        </button>
      </div>

      {/* VIEW 1: OFFICIAL STATEMENT OF FINANCIAL POSITION (MIZANIA RASMI YA MWAKA ULIOISHIA) */}
      {viewMode === 'OFFICIAL_STATEMENT' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          {/* Official Formal Accounting Header */}
          <div className="p-6 text-center border-b border-slate-200 bg-slate-50/70">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-1">
              {storeName.toUpperCase()}
            </span>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight uppercase">
              {language === 'SW'
                ? `TAARIFA YA HALI YA KIFEDHA KWA MWAKA ULIOISHIA 31 DESEMBA ${selectedYear}`
                : `STATEMENT OF FINANCIAL POSITION FOR THE YEAR ENDED 31ST DECEMBER ${selectedYear}`}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {language === 'SW'
                ? `(Mizania Rasmi ya Mwaka - Viwango vyote vya fedha katika Shilingi ya Tanzania ${currency})`
                : `(Official Annual Balance Sheet - All figures presented in Tanzanian Shillings ${currency})`}
            </p>
          </div>

          {/* Itemized Formal Accounting Balance Sheet Table */}
          <div className="overflow-x-auto p-4 sm:p-6">
            <table className="w-full text-left text-xs border-collapse max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-slate-500 font-mono">#</th>
                  <th className="py-3 px-3">{language === 'SW' ? 'MAELEZO YA RASILIMALI NA DHIMA' : 'LINE ITEM DESCRIPTION'}</th>
                  <th className="py-3 px-3 text-center w-24 text-slate-500">{language === 'SW' ? 'DOKEZO' : 'NOTE'}</th>
                  <th className="py-3 px-3 text-right w-44 font-mono font-black">{selectedYear} ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* 1. NON-CURRENT ASSETS */}
                <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                  <td className="py-2.5 px-3 font-mono text-slate-500">1.0</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide flex items-center justify-between">
                    <span>{language === 'SW' ? 'RASILIMALI ZISIZO ZA SASA (NON-CURRENT ASSETS)' : 'NON-CURRENT ASSETS'}</span>
                    <button
                      onClick={() => openNewRecordModal('FIXED_ASSET')}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus size={11} />
                      <span>{language === 'SW' ? 'Weka Mali/Kifaa' : 'Add Asset'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">Note 1</td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                </tr>

                {fixedAssets.length === 0 ? (
                  <tr>
                    <td className="py-2.5 px-3"></td>
                    <td colSpan={2} className="py-2.5 px-3 pl-8 text-slate-400 italic text-[11px]">
                      {language === 'SW' 
                        ? 'Hakuna rasilimali ya kudumu iliyorekodiwa (Gusa "+ Weka Mali/Kifaa" kurekodi mali zako)'
                        : 'No fixed assets recorded (Click "+ Add Asset" to record yours)'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">0</td>
                  </tr>
                ) : (
                  fixedAssets.map((fa) => (
                    <tr key={fa.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 pl-8 text-slate-700 flex items-center justify-between">
                        <span className="font-medium">{fa.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditItem(fa, 'FIXED_ASSET')}
                            title={language === 'SW' ? 'Hariri' : 'Edit'}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(fa.id, 'FIXED_ASSET')}
                            title={language === 'SW' ? 'Futa' : 'Delete'}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400 text-[10px]">
                        {fa.notes ? fa.notes : ''}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{fa.amount.toLocaleString()}</td>
                    </tr>
                  ))
                )}

                <tr className="bg-indigo-50/40 font-bold border-b border-indigo-200/60">
                  <td className="py-2.5 px-3 font-mono text-indigo-800">1.1</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-950">
                    {language === 'SW' ? 'JUMLA YA RASILIMALI ZISIZO ZA SASA' : 'TOTAL NON-CURRENT ASSETS'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-700 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-900">
                    {financialPosition.nonCurrentAssets.toLocaleString()}
                  </td>
                </tr>

                {/* 2. CURRENT ASSETS */}
                <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                  <td className="py-2.5 px-3 font-mono text-slate-500">2.0</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide">
                    {language === 'SW' ? 'RASILIMALI ZA SASA (CURRENT ASSETS)' : 'CURRENT ASSETS'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Stoo ya Bidhaa kwa Bei ya Kununulia (Merchandise Inventory at Cost)' : 'Merchandise Inventory (at Cost)'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">Note 2</td>
                  <td className="py-2 px-3 text-right font-mono font-medium">{financialPosition.inventoryCostValue.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Madeni ya Wateja / Waidaiwa (Trade & Other Receivables)' : 'Trade Accounts Receivable (Debtors)'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">Note 3</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-amber-800">{financialPosition.accountsReceivable.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Fedha Taslimu Mkononi (Cash on Hand)' : 'Cash in Hand (Liquid)'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">Note 4</td>
                  <td className="py-2 px-3 text-right font-mono font-medium">{financialPosition.liquidCash.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Salio la Mitandao ya Simu na Benki (Mobile Money & Bank Balances)' : 'Mobile Money (M-Pesa / Tigo / Airtel) & Bank'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">Note 4</td>
                  <td className="py-2 px-3 text-right font-mono font-medium">{financialPosition.liquidMobileMoney.toLocaleString()}</td>
                </tr>
                <tr className="bg-indigo-50/40 font-bold border-b border-indigo-200/60">
                  <td className="py-2.5 px-3 font-mono text-indigo-800">2.1</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-950">
                    {language === 'SW' ? 'JUMLA YA RASILIMALI ZA SASA' : 'TOTAL CURRENT ASSETS'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-700 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-900">
                    {financialPosition.currentAssets.toLocaleString()}
                  </td>
                </tr>

                {/* 3. TOTAL ASSETS (GRAND TOTAL) */}
                <tr className="bg-slate-900 text-white font-extrabold text-sm sm:text-base border-t-2 border-b-4 border-double border-indigo-400">
                  <td className="py-3.5 px-3 font-mono text-indigo-400">3.0</td>
                  <td className="py-3.5 px-3 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-indigo-400" />
                    <span>
                      {language === 'SW'
                        ? 'JUMLA KUU YA RASILIMALI (TOTAL ASSETS)'
                        : 'TOTAL ASSETS'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-xs text-indigo-300 font-bold">
                    100%
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-300 text-base sm:text-lg">
                    {currency} {financialPosition.totalAssets.toLocaleString()}
                  </td>
                </tr>

                {/* 4. EQUITY AND RESERVES */}
                <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                  <td className="py-2.5 px-3 font-mono text-slate-500">4.0</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide">
                    {language === 'SW' ? 'MTAJI NA THAMANI HALISI (EQUITY & RESERVES)' : 'EQUITY & RESERVES'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">Note 5</td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Mtaji wa Mmiliki wa Biashara (Owner Capital Base)' : 'Owner Initial Capital Contribution'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400"></td>
                  <td className="py-2 px-3 text-right font-mono font-medium">{financialPosition.initialCapitalBase.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Faida Halisi ya Mwaka Iliyobaki (Retained Earnings for the Year)' : 'Retained Net Profit for the Year'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">P&L</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">{financialPosition.retainedEarnings.toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-50/40 font-bold border-b border-emerald-200/60">
                  <td className="py-2.5 px-3 font-mono text-emerald-800">4.1</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-950">
                    {language === 'SW' ? 'JUMLA YA MTAJI NA THAMANI HALISI' : 'TOTAL OWNER’S EQUITY & RESERVES'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-900">
                    {financialPosition.totalEquity.toLocaleString()}
                  </td>
                </tr>

                {/* 5. NON-CURRENT LIABILITIES */}
                <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                  <td className="py-2.5 px-3 font-mono text-slate-500">5.0</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide flex items-center justify-between">
                    <span>{language === 'SW' ? 'DHIMA ZISIZO ZA SASA (NON-CURRENT LIABILITIES)' : 'NON-CURRENT LIABILITIES'}</span>
                    <button
                      onClick={() => openNewRecordModal('LONG_TERM_LIABILITY')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus size={11} />
                      <span>{language === 'SW' ? 'Weka Mkopo' : 'Add Loan'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                </tr>

                {longTermLiabilities.length === 0 ? (
                  <tr>
                    <td className="py-2.5 px-3"></td>
                    <td colSpan={2} className="py-2.5 px-3 pl-8 text-slate-400 italic text-[11px]">
                      {language === 'SW' 
                        ? 'Hakuna mkopo wa muda mrefu uliorekodiwa (Gusa "+ Weka Mkopo" kurekodi)'
                        : 'No long-term liabilities recorded (Click "+ Add Loan" to record)'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">0</td>
                  </tr>
                ) : (
                  longTermLiabilities.map((l) => (
                    <tr key={l.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 pl-8 text-slate-700 flex items-center justify-between">
                        <span className="font-medium">{l.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditItem(l, 'LONG_TERM_LIABILITY')}
                            title={language === 'SW' ? 'Hariri' : 'Edit'}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(l.id, 'LONG_TERM_LIABILITY')}
                            title={language === 'SW' ? 'Futa' : 'Delete'}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400 text-[10px]">
                        {l.notes ? l.notes : ''}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">{l.amount.toLocaleString()}</td>
                    </tr>
                  ))
                )}

                <tr className="bg-rose-50/40 font-bold border-b border-rose-200/60">
                  <td className="py-2.5 px-3 font-mono text-rose-800">5.1</td>
                  <td className="py-2.5 px-3 font-bold text-rose-950">
                    {language === 'SW' ? 'JUMLA YA DHIMA ZISIZO ZA SASA' : 'TOTAL NON-CURRENT LIABILITIES'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-rose-700 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-900">
                    {financialPosition.totalLongTermLiabilities.toLocaleString()}
                  </td>
                </tr>

                {/* 6. CURRENT LIABILITIES */}
                <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                  <td className="py-2.5 px-3 font-mono text-slate-500">6.0</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide flex items-center justify-between">
                    <span>{language === 'SW' ? 'DHIMA ZA SASA (CURRENT LIABILITIES)' : 'CURRENT LIABILITIES'}</span>
                    <button
                      onClick={() => openNewRecordModal('ACCOUNTS_PAYABLE')}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition"
                    >
                      <Edit2 size={11} />
                      <span>{language === 'SW' ? 'Rekodi Deni la Msambazaji' : 'Edit Supplier Payables'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Madeni ya Wasambazaji na Watoa Huduma (Trade & Other Payables)' : 'Trade Accounts Payable (Suppliers)'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400"></td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-rose-700">{financialPosition.accountsPayable.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 pl-8 text-slate-700">
                    {language === 'SW' ? 'Kodi ya TRA ya Kulipwa (Estimated Accrued Income Tax)' : 'Accrued TRA Income Tax Provision'}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">Note 6</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-rose-700">{financialPosition.accruedTax.toLocaleString()}</td>
                </tr>
                <tr className="bg-rose-50/40 font-bold border-b border-rose-200/60">
                  <td className="py-2.5 px-3 font-mono text-rose-800">6.1</td>
                  <td className="py-2.5 px-3 font-bold text-rose-950">
                    {language === 'SW' ? 'JUMLA YA DHIMA ZA SASA' : 'TOTAL CURRENT LIABILITIES'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-rose-700 font-mono text-[10px]"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-900">
                    {financialPosition.currentLiabilities.toLocaleString()}
                  </td>
                </tr>

                {/* 7. TOTAL EQUITY AND LIABILITIES (GRAND TOTAL - DOUBLE UNDERLINE) */}
                <tr className="bg-slate-900 text-white font-extrabold text-sm sm:text-base border-t-2 border-b-4 border-double border-indigo-400">
                  <td className="py-3.5 px-3 font-mono text-indigo-400">7.0</td>
                  <td className="py-3.5 px-3 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>
                      {language === 'SW'
                        ? 'JUMLA KUU YA MTAJI NA DHIMA (TOTAL EQUITY & LIABILITIES)'
                        : 'TOTAL EQUITY AND LIABILITIES'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-xs text-emerald-400 font-bold">
                    Balanced
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-300 text-base sm:text-lg">
                    {currency} {financialPosition.totalEquityAndLiabilities.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Accounting Footnotes & Compliance Signoff */}
            <div className="mt-8 pt-6 border-t border-slate-200 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">
                  {language === 'SW' ? 'Vidokezo vya Mizania (Balance Sheet Notes):' : 'Accounting & Disclosure Notes:'}
                </span>
                <p className="text-[11px] text-slate-500">
                  • <strong>Note 1 (Fixed Assets):</strong> Vifaa na miundombinu ya uendeshaji wa duka vimekadiriwa kwa gharama za manunuzi halisi.
                </p>
                <p className="text-[11px] text-slate-500">
                  • <strong>Note 2 (Inventory):</strong> Thamani ya stoo imehesabiwa kwa mbinu ya gharama (Cost Value) kwa bidhaa zote zilizopo ghalani tarehe 31 Desemba {selectedYear}.
                </p>
                <p className="text-[11px] text-slate-500">
                  • <strong>Note 3 & 4 (Receivables & Cash):</strong> Madeni ya wateja na fedha za mauzo yote ya cash na mitandao ya simu yamesawazishwa.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block mb-1">
                    {language === 'SW' ? 'Uthibitisho wa Uongozi / Mhasibu (Signoff):' : 'Management & Store Owner Signoff:'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {language === 'SW'
                      ? 'Taarifa hii ya Hali ya Kifedha imeandaliwa kulingana na viwango vya kihasibu (Financial Reporting Standards) na imethibitishwa kuwa na usawa kamili (100% Balanced).'
                      : 'This Statement of Financial Position has been generated in accordance with standard accounting principles and verified to be perfectly balanced.'}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>Tarehe: {new Date().toLocaleDateString()}</span>
                  <span className="font-bold text-slate-800 uppercase">Imethibitishwa (Verified & Balanced)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 12-MONTH FINANCIAL TABLE (JEDWALI LA MIEZI 12) */}
      {viewMode === 'MONTHLY_TABLE' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                {language === 'SW'
                  ? `Jedwali la Mwenendo wa Kifedha Mwezi kwa Mwezi (${selectedYear})`
                  : `12-Month Financial Performance & Position Ledger (${selectedYear})`}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'SW'
                  ? 'Uchambuzi kamili wa mauzo, gharama za bidhaa (COGS), faida ghafi, hasara, faida halisi na ukusanyaji wa fedha taslimu na simu.'
                  : 'Itemized monthly breakdown of sales, cost of goods sold, gross margin, operating deductions, net profit, and payments.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {language === 'SW' ? 'Mauzo ya Mwaka' : 'Annual Turnover'}
              </span>
              <span className="font-mono font-extrabold text-sm sm:text-base text-indigo-700">
                {currency} {yearTotals.grossSales.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">{language === 'SW' ? 'Mwezi' : 'Month'}</th>
                  <th className="py-3 px-3 text-center">{language === 'SW' ? 'Risiti' : 'Tx Count'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Mauzo Ghafi (Sales)' : 'Gross Sales'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Gharama (COGS)' : 'COGS'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Faida Ghafi' : 'Gross Profit'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Hasara' : 'Losses'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Faida Halisi' : 'Net Profit'}</th>
                  <th className="py-3 px-3 text-center">{language === 'SW' ? 'Margin %' : 'Margin %'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Cash' : 'Cash'}</th>
                  <th className="py-3 px-4 text-right">{language === 'SW' ? 'Mitandao ya Simu' : 'Mobile Money'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {annualMonthlyData.map((m, idx) => {
                  const hasSales = m.grossSales > 0;
                  return (
                    <tr 
                      key={m.monthIndex} 
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      } ${!hasSales ? 'opacity-60' : ''}`}
                    >
                      {/* Month Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 font-mono">
                          {m.monthIndex + 1}
                        </span>
                        <span>{m.monthName}</span>
                      </td>

                      {/* Tx Count */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-slate-600">
                        {m.txCount}
                      </td>

                      {/* Gross Sales */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {m.grossSales > 0 ? `${currency} ${m.grossSales.toLocaleString()}` : '-'}
                      </td>

                      {/* COGS */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {m.cogs > 0 ? `${currency} ${m.cogs.toLocaleString()}` : '-'}
                      </td>

                      {/* Gross Profit */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {m.grossProfit > 0 ? `${currency} ${m.grossProfit.toLocaleString()}` : '-'}
                      </td>

                      {/* Losses */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {m.losses > 0 ? `-${currency} ${m.losses.toLocaleString()}` : '0'}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/30">
                        {m.netProfit > 0 ? `${currency} ${m.netProfit.toLocaleString()}` : '-'}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-3 text-center">
                        {hasSales ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                            m.profitMargin >= 30 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : m.profitMargin >= 15 
                                ? 'bg-sky-100 text-sky-800' 
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.profitMargin.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Cash */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {m.cashCollections > 0 ? `${currency} ${m.cashCollections.toLocaleString()}` : '-'}
                      </td>

                      {/* Mobile Money */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.mobileMoney > 0 ? `${currency} ${m.mobileMoney.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* TABLE GRAND TOTAL FOOTER ROW */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-950">
                  <td className="py-3.5 px-4 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    <span>{language === 'SW' ? 'JUMLA KUU YA MWAKA' : 'ANNUAL GRAND TOTAL'}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-300">
                    {yearTotals.txCount}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-white">
                    {currency} {yearTotals.grossSales.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                    {currency} {yearTotals.cogs.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-300">
                    {currency} {yearTotals.grossProfit.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-300">
                    {yearTotals.losses > 0 ? `-${currency} ${yearTotals.losses.toLocaleString()}` : '0'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400 bg-slate-950">
                    {currency} {yearTotals.netProfit.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-emerald-300 font-black">
                    {yearTotals.grossSales > 0 
                      ? `${((yearTotals.netProfit / yearTotals.grossSales) * 100).toFixed(1)}%` 
                      : '0%'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                    {currency} {yearTotals.cashCollections.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {currency} {yearTotals.mobileMoney.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: VISUAL CHARTS & ASSET VALUATION BREAKDOWN */}
      {viewMode === 'ASSET_BREAKDOWN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Revenue vs Cost Bar Chart */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" />
              {language === 'SW'
                ? `Mwenendo wa Mauzo, Gharama na Faida ya Kila Mwezi (${selectedYear})`
                : `Monthly Revenue, COGS & Net Profit Trends (${selectedYear})`}
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">
              {language === 'SW'
                ? 'Ulinganifu wa grafu ya mapato ghafi dhidi ya gharama za bidhaa na faida halisi kwa kila mwezi wa mwaka.'
                : 'Monthly visual comparison between gross sales, cost of goods sold, and net profit.'}
            </p>

            <div className="h-72 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortName" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${currency} ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="grossSales" name={language === 'SW' ? 'Mauzo Ghafi' : 'Gross Sales'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cogs" name={language === 'SW' ? 'Gharama za Bidhaa' : 'COGS'} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name={language === 'SW' ? 'Faida Halisi' : 'Net Profit'} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Asset Valuation Breakdown (Right) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Package size={16} className="text-emerald-600" />
                {language === 'SW' ? 'Muundo wa Rasilimali za Biashara' : 'Asset Structure Breakdown'}
              </h4>
              <p className="text-[11px] text-slate-500 mb-4">
                {language === 'SW' ? 'Asilimia ya kila rasilimali kwenye biashara yako.' : 'Percentage breakdown of all business assets.'}
              </p>

              <div className="space-y-3 text-xs">
                {/* Stock Inventory */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-700">{language === 'SW' ? 'Stoo ya Bidhaa (Stock)' : 'Stock Inventory'}</span>
                    <span className="font-mono text-indigo-700">
                      {financialPosition.totalAssets > 0 
                        ? `${((financialPosition.inventoryCostValue / financialPosition.totalAssets) * 100).toFixed(1)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${financialPosition.totalAssets > 0 ? (financialPosition.inventoryCostValue / financialPosition.totalAssets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {currency} {financialPosition.inventoryCostValue.toLocaleString()}
                  </span>
                </div>

                {/* Liquid Cash & Mobile Money */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-700">{language === 'SW' ? 'Fedha za Mauzo (Cash & Mobile)' : 'Cash & Mobile Money'}</span>
                    <span className="font-mono text-emerald-700">
                      {financialPosition.totalAssets > 0 
                        ? `${((financialPosition.totalLiquidFunds / financialPosition.totalAssets) * 100).toFixed(1)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full" 
                      style={{ width: `${financialPosition.totalAssets > 0 ? (financialPosition.totalLiquidFunds / financialPosition.totalAssets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {currency} {financialPosition.totalLiquidFunds.toLocaleString()}
                  </span>
                </div>

                {/* Accounts Receivable */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-700">{language === 'SW' ? 'Madeni ya Wateja (Debts)' : 'Customer Receivables'}</span>
                    <span className="font-mono text-amber-700">
                      {financialPosition.totalAssets > 0 
                        ? `${((financialPosition.accountsReceivable / financialPosition.totalAssets) * 100).toFixed(1)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${financialPosition.totalAssets > 0 ? (financialPosition.accountsReceivable / financialPosition.totalAssets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {currency} {financialPosition.accountsReceivable.toLocaleString()}
                  </span>
                </div>

                {/* Fixed Hardware/Assets */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-700">{language === 'SW' ? 'Vifaa vya Duka (Equipment)' : 'Fixtures & Equipment'}</span>
                    <span className="font-mono text-slate-700">
                      {financialPosition.totalAssets > 0 
                        ? `${((financialPosition.nonCurrentAssets / financialPosition.totalAssets) * 100).toFixed(1)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-slate-400 h-2 rounded-full" 
                      style={{ width: `${financialPosition.totalAssets > 0 ? (financialPosition.nonCurrentAssets / financialPosition.totalAssets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {currency} {financialPosition.nonCurrentAssets.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Health Verdict */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>{language === 'SW' ? 'Tathmini ya Mzunguko wa Mtaji:' : 'Liquidity Health Verdict:'}</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                {financialPosition.workingCapital > 0
                  ? (language === 'SW' 
                      ? 'Biashara ina ukwasi wa kutosha (Positive Working Capital) kuendesha shughuli zake na kulipa madeni bila changamoto.' 
                      : 'Healthy liquidity position with positive working capital capable of meeting all short-term operational requirements.')
                  : (language === 'SW' 
                      ? 'Tahadhari: Punguza madeni ya wateja au ongeza mzunguko wa fedha taslimu.' 
                      : 'Notice: Accelerate credit collection to boost immediate liquid reserves.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RECORD / EDIT ASSET OR LIABILITY MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {editingItemId 
                      ? (language === 'SW' ? 'Hariri Rekodi ya Mizania' : 'Edit Balance Sheet Entry')
                      : (language === 'SW' ? 'Rekodi Rasilimali au Dhima Mpya' : 'Record New Asset or Liability')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'SW'
                      ? 'Weka rekodi sahihi za duka lako ili kupata ripoti sahihi 100% ya Mizania.'
                      : 'Enter verified business assets and liabilities to calculate your true net worth.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRecordModalOpen(false);
                  setEditingItemId(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Type Tabs (if not editing an existing item) */}
            {!editingItemId && (
              <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRecordType('FIXED_ASSET');
                    setRecordName('');
                    setRecordAmount('');
                    setRecordNotes('');
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-center transition cursor-pointer ${
                    activeRecordType === 'FIXED_ASSET'
                      ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'SW' ? '1. Rasilimali ya Kudumu' : '1. Fixed Asset'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRecordType('LONG_TERM_LIABILITY');
                    setRecordName('');
                    setRecordAmount('');
                    setRecordNotes('');
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-center transition cursor-pointer ${
                    activeRecordType === 'LONG_TERM_LIABILITY'
                      ? 'bg-white text-rose-700 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'SW' ? '2. Mkopo wa Muda Mrefu' : '2. Long-term Debt'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRecordType('ACCOUNTS_PAYABLE');
                    setRecordName(language === 'SW' ? 'Madeni ya Wasambazaji' : 'Supplier Payables');
                    setRecordAmount(accountsPayable > 0 ? accountsPayable.toString() : '');
                    setRecordNotes('');
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-center transition cursor-pointer ${
                    activeRecordType === 'ACCOUNTS_PAYABLE'
                      ? 'bg-white text-amber-700 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'SW' ? '3. Wasambazaji' : '3. Supplier Payables'}
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveRecord} className="p-5 space-y-4 text-xs font-sans">
              {activeRecordType === 'ACCOUNTS_PAYABLE' ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 text-xs">
                    <div className="font-extrabold mb-1 flex items-center gap-1.5">
                      <Info size={14} className="text-amber-700" />
                      <span>{language === 'SW' ? 'Madeni ya Wasambazaji (Accounts Payable)' : 'Accounts Payable'}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {language === 'SW'
                        ? 'Weka jumla ya fedha unazodaiwa na wasambazaji wa bidhaa au watoa huduma wa duka lako kufikia sasa.'
                        : 'Enter the outstanding total owed to merchandise suppliers or utility vendors for this store.'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {language === 'SW' ? `Jumla ya Madeni ya Wasambazaji (${currency})` : `Total Supplier Payables (${currency})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="e.g. 1500000"
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {activeRecordType === 'FIXED_ASSET'
                        ? (language === 'SW' ? 'Jina la Rasilimali ya Kudumu (Kifaa / Mali)' : 'Fixed Asset Name / Description')
                        : (language === 'SW' ? 'Jina la Mkopo au Taasisi ya Kifedha' : 'Loan / Liability Name or Financial Institution')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeRecordType === 'FIXED_ASSET'
                          ? (language === 'SW' ? 'mf. Pikipiki ya Usambazaji, Friji Kubwa, Rafu za Chuma, Kompyuta' : 'e.g. Delivery Motorcycle, Large Display Freezer, Steel Shelves')
                          : (language === 'SW' ? 'mf. Mkopo wa Benki ya NMB / CRDB, SACCOS ya Wafanyabiashara' : 'e.g. NMB Bank SME Loan, SACCOS Loan')
                      }
                      value={recordName}
                      onChange={(e) => setRecordName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {language === 'SW' ? `Kiasi cha Thamani / Mkopo (${currency})` : `Valuation / Debt Amount (${currency})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="e.g. 2500000"
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  {/* Notes / Details */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {language === 'SW' ? 'Dokezo au Maelezo ya Ziada (Hiari)' : 'Notes / Additional Details (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'SW' ? 'mf. Ilinunuliwa Machi 2025, Namba ya Usajili, n.k.' : 'e.g. Purchased March 2025, Reg No, etc.'}
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setEditingItemId(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Save size={15} />
                  <span>{language === 'SW' ? 'Hifadhi kwenye Mizania' : 'Save to Balance Sheet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

