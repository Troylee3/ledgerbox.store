import React, { useState, useMemo } from 'react';
import { DbState, Transaction, DebtLog } from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Layers, 
  CreditCard, 
  Users, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ShoppingBag, 
  FileSpreadsheet, 
  FileDown, 
  Loader2,
  Package,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  ListFilter,
  Eye,
  EyeOff,
  Info,
  Coins,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  exportTransactionsReportPdf, 
  exportTransactionsToCsv, 
  exportDailySummaryToCsv, 
  exportCreditItemsToCsv,
  TransactionsReportPdfData 
} from '../lib/reportPdfExporter';

interface TransactionReportsViewProps {
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

export default function TransactionReportsView({ state, language }: TransactionReportsViewProps) {
  const { transactions, products, customers, settings } = state;
  const currency = settings.currencySymbol || 'TZS';
  const storeName = settings.storeName || (language === 'SW' ? 'Duka Langu' : 'My Store');

  // Filter mode state
  const [periodPreset, setPeriodPreset] = useState<'1_MONTH' | '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | 'SPECIFIC_MONTH' | 'CUSTOM_RANGE'>('1_MONTH');

  // Specific Month / Year selector
  const [selectedSpecificMonth, setSelectedSpecificMonth] = useState<number>(() => new Date().getMonth());
  const [selectedSpecificYear, setSelectedSpecificYear] = useState<number>(() => new Date().getFullYear());

  // Custom Date Range
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter filters & active view
  const [tableViewMode, setTableViewMode] = useState<'DAILY_SUMMARY' | 'GROUPED_BY_DATE' | 'ITEMIZED_LIST' | 'CREDIT_ITEMS'>('DAILY_SUMMARY');
  const [expandedDateKeys, setExpandedDateKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const toggleExpandDate = (dateKey: string) => {
    setExpandedDateKeys(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const expandAllDates = () => {
    const allKeys = new Set(dailySummary.map(d => d.dateKey));
    setExpandedDateKeys(allKeys);
  };

  const collapseAllDates = () => {
    setExpandedDateKeys(new Set());
  };

  // Available accounting years from transaction data & current date
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    transactions.forEach(tx => {
      const year = new Date(tx.timestamp).getFullYear();
      if (!isNaN(year) && year > 2000) {
        yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  // Unique cashiers
  const uniqueCashiers = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.cashierName) set.add(tx.cashierName);
    });
    return Array.from(set);
  }, [transactions]);

  // Compute Active Date Bounds
  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    if (periodPreset === '1_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const mName = language === 'SW' ? MONTH_NAMES_SW[now.getMonth()] : MONTH_NAMES_EN[now.getMonth()];
      label = language === 'SW' ? `Mwezi Huu / Mwezi 1 Uliopita (${mName} ${now.getFullYear()})` : `Last 1 Month (${mName} ${now.getFullYear()})`;
    } else if (periodPreset === '3_MONTHS') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = language === 'SW' ? 'Miezi 3 Iliyopita (Robo Mwaka / Last 3 Months)' : 'Last 3 Months (Quarterly)';
    } else if (periodPreset === '6_MONTHS') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = language === 'SW' ? 'Miezi 6 Iliyopita (Nusu Mwaka / Last 6 Months)' : 'Last 6 Months (Half Year)';
    } else if (periodPreset === '12_MONTHS') {
      start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = language === 'SW' ? 'Miezi 12 Iliyopita (Mwaka Mzima / Last 12 Months)' : 'Last 12 Months (Full Year)';
    } else if (periodPreset === 'SPECIFIC_MONTH') {
      start = new Date(selectedSpecificYear, selectedSpecificMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedSpecificYear, selectedSpecificMonth + 1, 0, 23, 59, 59, 999);
      const mName = language === 'SW' ? MONTH_NAMES_SW[selectedSpecificMonth] : MONTH_NAMES_EN[selectedSpecificMonth];
      label = language === 'SW' ? `Mwezi wa ${mName} ${selectedSpecificYear}` : `Month of ${mName} ${selectedSpecificYear}`;
    } else {
      // CUSTOM_RANGE
      const [sy, sm, sd] = customStartDate.split('-').map(Number);
      const [ey, em, ed] = customEndDate.split('-').map(Number);
      start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      label = `${customStartDate} → ${customEndDate}`;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label };
  }, [periodPreset, selectedSpecificMonth, selectedSpecificYear, customStartDate, customEndDate, language]);

  // Filter transactions in range
  const filteredTransactions = useMemo(() => {
    const sTime = startDate.getTime();
    const eTime = endDate.getTime();

    return transactions.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime >= sTime && txTime <= eTime;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, startDate, endDate]);

  // Expenses in range (if any)
  const filteredExpenses = useMemo(() => {
    const sTime = startDate.getTime();
    const eTime = endDate.getTime();
    const expList = (state as any).expenses || [];

    return expList.filter((exp: any) => {
      const expTime = new Date(exp.timestamp || exp.date).getTime();
      return expTime >= sTime && expTime <= eTime;
    });
  }, [state, startDate, endDate]);

  // Debt logs in range (both repayments and borrow logs)
  const filteredDebtLogs = useMemo(() => {
    const sTime = startDate.getTime();
    const eTime = endDate.getTime();
    const logs = (state as any).debtLogs || [];

    return logs.filter((log: any) => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= sTime && logTime <= eTime;
    }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state, startDate, endDate]);

  // Customers lookup map for customer names and phones in debt logs
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    ((state as any).customers || []).forEach((c: any) => {
      map.set(c.id, c);
    });
    return map;
  }, [state]);

  // Core Financial Aggregates (Strict Decoupling of Unpaid Debts & Real-Time Sync of Debt Repayments)
  const financialSummary = useMemo(() => {
    let grossSales = 0;
    let cogs = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let cashSales = 0;
    let mobileSales = 0;
    let creditSales = 0; // Unpaid Credit Issued (Deferred Revenue)
    let debtPaymentsCollected = 0; // Debt Repayments collected in period
    let otherSales = 0;
    let totalUnitsSold = 0;

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number; cost: number; profit: number }>();

    // 1. Process Transactions: Exclude unpaid credit from realized revenue!
    filteredTransactions.forEach(tx => {
      totalDiscount += (tx.discount || 0);
      totalTax += (tx.tax || 0);

      const pm = (tx.paymentMethod || 'CASH').toUpperCase();
      const isCredit = pm === 'CREDIT';
      const paidPortion = isCredit ? (tx.receivedAmount || 0) : (tx.total || 0);

      // Realized Sales add cash/mobile/other or initial downpayment
      grossSales += paidPortion;

      if (isCredit) {
        creditSales += ((tx.total || 0) - (tx.receivedAmount || 0));
        if (paidPortion > 0) {
          cashSales += paidPortion;
        }
      } else if (pm === 'CASH') {
        cashSales += (tx.total || 0);
      } else if (
        pm.includes('M-PESA') || 
        pm.includes('MPESA') || 
        pm.includes('TIGO') || 
        pm.includes('AIRTEL') || 
        pm.includes('HALO') || 
        pm === 'MOBILE' || 
        pm === 'CARD'
      ) {
        mobileSales += (tx.total || 0);
      } else {
        otherSales += (tx.total || 0);
      }

      // Compute COGS and Product rankings
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          const qty = item.quantity || 1;
          const unitPrice = item.price || (item.product?.sellingPrice || 0);
          const unitCost = item.product?.costPrice || 0;
          const itemTotal = unitPrice * qty;
          const itemCost = unitCost * qty;

          totalUnitsSold += qty;
          cogs += itemCost;

          const pId = item.productId || item.product?.id || item.product?.name || 'unknown';
          const pName = item.product?.name || (language === 'SW' ? 'Bidhaa' : 'Product');

          const existing = productSalesMap.get(pId) || { name: pName, quantity: 0, revenue: 0, cost: 0, profit: 0 };
          existing.quantity += qty;
          existing.revenue += itemTotal;
          existing.cost += itemCost;
          existing.profit += (itemTotal - itemCost);
          productSalesMap.set(pId, existing);
        });
      }
    });

    // 2. Process Debt Repayments: Sync realized debt repayments into period sales!
    filteredDebtLogs.forEach((log: any) => {
      if (log.type === 'PAYMENT') {
        const amt = (log.amount || 0);
        debtPaymentsCollected += amt;
        grossSales += amt;

        const method = (log.paymentMethod || 'CASH').toUpperCase();
        if (method === 'CASH') {
          cashSales += amt;
        } else if (
          method.includes('M-PESA') || 
          method.includes('MPESA') || 
          method.includes('TIGO') || 
          method.includes('AIRTEL') || 
          method.includes('HALO') || 
          method === 'MOBILE' || 
          method === 'CARD'
        ) {
          mobileSales += amt;
        } else {
          cashSales += amt;
        }
      }
    });

    const totalExpenses = filteredExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const grossProfit = Math.max(0, grossSales - cogs);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;
    const transactionCount = filteredTransactions.length;
    const averageOrderValue = transactionCount > 0 ? (grossSales / transactionCount) : 0;

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      grossSales,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMargin,
      totalDiscount,
      totalTax,
      cashSales,
      mobileSales,
      creditSales, // Unpaid credit sales issued
      debtPaymentsCollected, // Debt repayments synced into revenue
      otherSales,
      totalUnitsSold,
      transactionCount,
      averageOrderValue,
      topProducts
    };
  }, [filteredTransactions, filteredDebtLogs, filteredExpenses, language]);

  // Timeline / Daily Trend Data for Chart
  const timelineChartData = useMemo(() => {
    const dayMap = new Map<string, { dateStr: string; label: string; sales: number; profit: number; count: number }>();

    filteredTransactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      const dateKey = d.toISOString().split('T')[0];
      const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;

      const existing = dayMap.get(dateKey) || { dateStr: dateKey, label: shortDate, sales: 0, profit: 0, count: 0 };
      
      const isCredit = tx.paymentMethod === 'CREDIT';
      const paidPortion = isCredit ? (tx.receivedAmount || 0) : (tx.total || 0);
      existing.sales += paidPortion;
      existing.count += 1;

      let txCost = 0;
      tx.items?.forEach(item => {
        txCost += (item.product?.costPrice || 0) * (item.quantity || 0);
      });
      existing.profit += (paidPortion - txCost);
      dayMap.set(dateKey, existing);
    });

    filteredDebtLogs.forEach((log: any) => {
      if (log.type === 'PAYMENT') {
        const d = new Date(log.timestamp);
        const dateKey = d.toISOString().split('T')[0];
        const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;

        const existing = dayMap.get(dateKey) || { dateStr: dateKey, label: shortDate, sales: 0, profit: 0, count: 0 };
        existing.sales += (log.amount || 0);
        existing.profit += (log.amount || 0);
        dayMap.set(dateKey, existing);
      }
    });

    return Array.from(dayMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredTransactions, filteredDebtLogs]);

  // Aggregated Daily Data (Sum up amount of transactions per specific date & sync debt payments)
  const dailySummary = useMemo(() => {
    const dayMap = new Map<string, {
      dateKey: string;
      dateObj: Date;
      formattedDate: string;
      dayOfWeek: string;
      transactionCount: number;
      unitsCount: number;
      cashSales: number;
      mobileSales: number;
      creditSales: number; // Unpaid credit sales (not added to sales!)
      debtPaymentsCollected: number; // Debt payments collected & synced on this date
      otherSales: number;
      totalSales: number; // Realized daily sales
      totalDiscount: number;
      totalCogs: number;
      netProfit: number;
      profitMargin: number;
      avgTransaction: number;
      transactions: Transaction[];
      debtLogs: DebtLog[];
    }>();

    const dayNamesSw = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getOrCreateDayRecord = (d: Date, dateKey: string, rawTimestamp: string) => {
      let dayRecord = dayMap.get(dateKey);
      if (!dayRecord) {
        const dayOfWeek = isNaN(d.getTime()) ? '' : (language === 'SW' ? dayNamesSw[d.getDay()] : dayNamesEn[d.getDay()]);
        const formattedDate = isNaN(d.getTime()) ? rawTimestamp : d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        dayRecord = {
          dateKey,
          dateObj: d,
          formattedDate,
          dayOfWeek,
          transactionCount: 0,
          unitsCount: 0,
          cashSales: 0,
          mobileSales: 0,
          creditSales: 0,
          debtPaymentsCollected: 0,
          otherSales: 0,
          totalSales: 0,
          totalDiscount: 0,
          totalCogs: 0,
          netProfit: 0,
          profitMargin: 0,
          avgTransaction: 0,
          transactions: [],
          debtLogs: []
        };
        dayMap.set(dateKey, dayRecord);
      }
      return dayRecord;
    };

    // 1. Compile transactions for each date
    filteredTransactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      const dateKey = isNaN(d.getTime()) ? 'unknown' : d.toISOString().split('T')[0];
      const dayRecord = getOrCreateDayRecord(d, dateKey, tx.timestamp);

      dayRecord.transactionCount += 1;
      dayRecord.totalDiscount += (tx.discount || 0);
      dayRecord.transactions.push(tx);

      const pm = (tx.paymentMethod || 'CASH').toUpperCase();
      const isCredit = pm === 'CREDIT';
      const paidPortion = isCredit ? (tx.receivedAmount || 0) : (tx.total || 0);

      // Realized Sales add cash/mobile/other or downpayment (NB: Unpaid credit is NOT added to sales total)
      dayRecord.totalSales += paidPortion;

      if (isCredit) {
        dayRecord.creditSales += ((tx.total || 0) - (tx.receivedAmount || 0));
        if (paidPortion > 0) {
          dayRecord.cashSales += paidPortion;
        }
      } else if (pm === 'CASH') {
        dayRecord.cashSales += (tx.total || 0);
      } else if (
        pm.includes('M-PESA') || 
        pm.includes('MPESA') || 
        pm.includes('TIGO') || 
        pm.includes('AIRTEL') || 
        pm.includes('HALO') || 
        pm === 'MOBILE' || 
        pm === 'CARD'
      ) {
        dayRecord.mobileSales += (tx.total || 0);
      } else {
        dayRecord.otherSales += (tx.total || 0);
      }

      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach(it => {
          const q = it.quantity || 1;
          dayRecord.unitsCount += q;
          const cost = (it.product?.costPrice || 0) * q;
          dayRecord.totalCogs += cost;
        });
      }
    });

    // 2. Compile debt logs and sync PAYMENT logs into the sales of this date
    filteredDebtLogs.forEach((log: any) => {
      const d = new Date(log.timestamp);
      const dateKey = isNaN(d.getTime()) ? 'unknown' : d.toISOString().split('T')[0];
      const dayRecord = getOrCreateDayRecord(d, dateKey, log.timestamp);

      dayRecord.debtLogs.push(log);

      if (log.type === 'PAYMENT') {
        const amt = (log.amount || 0);
        dayRecord.debtPaymentsCollected += amt;
        dayRecord.totalSales += amt; // SYNC TO REALIZED SALES OF THIS DATE!

        const method = (log.paymentMethod || 'CASH').toUpperCase();
        if (method === 'CASH') {
          dayRecord.cashSales += amt;
        } else if (
          method.includes('M-PESA') || 
          method.includes('MPESA') || 
          method.includes('TIGO') || 
          method.includes('AIRTEL') || 
          method.includes('HALO') || 
          method === 'MOBILE' || 
          method === 'CARD'
        ) {
          dayRecord.mobileSales += amt;
        } else {
          dayRecord.cashSales += amt;
        }
      }
    });

    const list = Array.from(dayMap.values()).map(d => {
      d.netProfit = Math.max(0, d.totalSales - d.totalCogs);
      d.profitMargin = d.totalSales > 0 ? (d.netProfit / d.totalSales) * 100 : 0;
      d.avgTransaction = d.transactionCount > 0 ? (d.totalSales / d.transactionCount) : 0;
      return d;
    });

    // Sort descending by date (newest first)
    return list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredTransactions, filteredDebtLogs, language]);

  // Filtered daily breakdown according to search query
  const filteredDailySummary = useMemo(() => {
    if (!searchQuery.trim()) return dailySummary;
    const q = searchQuery.toLowerCase().trim();
    return dailySummary.filter(d => {
      return (
        d.dateKey.includes(q) ||
        d.formattedDate.toLowerCase().includes(q) ||
        d.dayOfWeek.toLowerCase().includes(q) ||
        d.transactions.some(tx => 
          tx.id.toLowerCase().includes(q) ||
          (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
          (tx.cashierName && tx.cashierName.toLowerCase().includes(q)) ||
          (tx.items && tx.items.some(it => it.product?.name?.toLowerCase().includes(q)))
        )
      );
    });
  }, [dailySummary, searchQuery]);

  // Filtered table rows with search & payment method
  const tableRows = useMemo(() => {
    return filteredTransactions.filter(tx => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        tx.id.toLowerCase().includes(query) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(query)) ||
        (tx.cashierName && tx.cashierName.toLowerCase().includes(query)) ||
        (tx.items && tx.items.some(it => it.product?.name?.toLowerCase().includes(query)));

      const matchesPayment = paymentFilter === 'ALL' || tx.paymentMethod === paymentFilter;
      const matchesCashier = cashierFilter === 'ALL' || tx.cashierName === cashierFilter;

      return matchesSearch && matchesPayment && matchesCashier;
    });
  }, [filteredTransactions, searchQuery, paymentFilter, cashierFilter]);

  // Grouped table rows by Date (for GROUPED_BY_DATE mode)
  const groupedTableRows = useMemo(() => {
    const groups = new Map<string, {
      dateKey: string;
      formattedDate: string;
      dayOfWeek: string;
      transactions: Transaction[];
      subtotal: number;
      totalProfit: number;
    }>();

    tableRows.forEach(tx => {
      const d = new Date(tx.timestamp);
      const dateKey = isNaN(d.getTime()) ? 'unknown' : d.toISOString().split('T')[0];
      const dayNamesSw = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
      const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = isNaN(d.getTime()) ? '' : (language === 'SW' ? dayNamesSw[d.getDay()] : dayNamesEn[d.getDay()]);
      const formattedDate = isNaN(d.getTime()) ? tx.timestamp : d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      let grp = groups.get(dateKey);
      if (!grp) {
        grp = {
          dateKey,
          formattedDate,
          dayOfWeek,
          transactions: [],
          subtotal: 0,
          totalProfit: 0
        };
        groups.set(dateKey, grp);
      }

      grp.transactions.push(tx);
      grp.subtotal += (tx.total || 0);

      let txCost = 0;
      tx.items?.forEach(it => {
        txCost += (it.product?.costPrice || 0) * (it.quantity || 1);
      });
      grp.totalProfit += Math.max(0, (tx.total || 0) - txCost);
    });

    return Array.from(groups.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [tableRows, language]);

  // Credit items inside current filtered date range (Vitu vilivyouzwa kwa mkopo)
  const periodCreditItems = useMemo(() => {
    const list: Array<{
      txId: string;
      receiptNumber: string;
      timestamp: string;
      productId: string;
      productName: string;
      categoryName: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      totalItemValue: number;
      totalTxAmount: number;
      receivedDownPayment: number;
      unpaidDebtPortion: number;
      cashierName: string;
      customerId?: string;
      customerName: string;
      customerPhone: string;
      customerCurrentDebt: number;
      dueDate?: string;
      status: 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'OVERDUE';
      statusLabel: string;
    }> = [];

    const customerMap = new Map<string, any>();
    (customers || []).forEach(c => customerMap.set(c.id, c));

    (filteredTransactions || []).forEach(tx => {
      const isCreditTx = tx.paymentMethod === 'CREDIT';
      if (!isCreditTx && !(tx.customerId && customerMap.get(tx.customerId)?.debt > 0 && tx.paymentMethod === 'CREDIT')) {
        return;
      }

      const customer = tx.customerId ? customerMap.get(tx.customerId) : null;
      const customerName = customer?.name || tx.customerName || (language === 'SW' ? 'Mteja wa Mkopo' : 'Credit Customer');
      const customerPhone = customer?.phone || '-';
      const customerDebt = customer ? (customer.debt || 0) : 0;
      const dueDate = customer?.dueDate;

      const totalTx = tx.total || 0;
      const downPayment = tx.receivedAmount || 0;
      const unpaidDebtPortion = Math.max(0, totalTx - downPayment);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const isPastDue = dueDate ? new Date(dueDate).getTime() < todayStart.getTime() : false;

      let status: 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'OVERDUE' = 'UNPAID';
      let statusLabel = language === 'SW' ? 'Inadaiwa (Bado Haijalipwa)' : 'Unpaid Debt';

      if (customerDebt <= 0) {
        status = 'SETTLED';
        statusLabel = language === 'SW' ? 'Imelipwa Yote' : 'Fully Settled';
      } else if (isPastDue) {
        status = 'OVERDUE';
        statusLabel = language === 'SW' ? 'Imechelewa (Overdue)' : 'Overdue';
      } else if (downPayment > 0) {
        status = 'PARTIAL';
        statusLabel = language === 'SW' ? 'Inalipwa Kidogo' : 'Partially Paid';
      } else {
        status = 'UNPAID';
        statusLabel = language === 'SW' ? 'Inadaiwa (Bado Haijalipwa)' : 'Unpaid Debt';
      }

      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach(it => {
          const qty = it.quantity || 1;
          const unitPrice = it.customPrice ?? (it.product?.sellingPrice || 0);
          const costPrice = it.product?.costPrice || 0;
          const totalItemValue = unitPrice * qty;

          list.push({
            txId: tx.id,
            receiptNumber: tx.id ? tx.id.substring(0, 10) : 'PM-REC',
            timestamp: tx.timestamp,
            productId: it.product?.id || 'prod',
            productName: it.product?.name || (language === 'SW' ? 'Bidhaa ya Mkopo' : 'Credit Item'),
            categoryName: it.product?.category || 'General',
            quantity: qty,
            unitPrice,
            costPrice,
            totalItemValue,
            totalTxAmount: totalTx,
            receivedDownPayment: downPayment,
            unpaidDebtPortion,
            cashierName: tx.cashierName || 'Staff',
            customerId: tx.customerId,
            customerName,
            customerPhone,
            customerCurrentDebt: customerDebt,
            dueDate,
            status,
            statusLabel
          });
        });
      }
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredTransactions, customers, language]);

  const filteredPeriodCreditItems = useMemo(() => {
    if (!searchQuery.trim() && cashierFilter === 'ALL') return periodCreditItems;
    const q = searchQuery.toLowerCase().trim();
    return periodCreditItems.filter(item => {
      const matchesSearch = !q || 
        item.productName.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.toLowerCase().includes(q) ||
        item.receiptNumber.toLowerCase().includes(q) ||
        item.cashierName.toLowerCase().includes(q);
      const matchesCashier = cashierFilter === 'ALL' || item.cashierName === cashierFilter;
      return matchesSearch && matchesCashier;
    });
  }, [periodCreditItems, searchQuery, cashierFilter]);

  // Handle Export Credit Items to CSV
  const handleExportCreditItemsCsv = () => {
    const exportItems = filteredPeriodCreditItems.map(item => ({
      receiptNumber: item.receiptNumber,
      timestamp: item.timestamp,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      totalItemValue: item.totalItemValue,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      cashierName: item.cashierName,
      dueDate: item.dueDate,
      status: item.statusLabel,
      downPayment: item.receivedDownPayment,
      unpaidDebtPortion: item.unpaidDebtPortion
    }));

    exportCreditItemsToCsv(
      exportItems, 
      storeName, 
      dateRangeLabel.replace(/\s+/g, '_')
    );
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const pdfData: TransactionsReportPdfData = {
        storeName,
        storePhone: (settings as any).phone || (settings as any).storePhone || '',
        storeAddress: (settings as any).address || (settings as any).storeAddress || '',
        currencySymbol: currency,
        generatedBy: (state as any).activeCashier?.name || 'Administrator',
        language,
        periodTitle: dateRangeLabel,
        dateRangeSubtitle: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        summary: {
          totalSales: financialSummary.grossSales,
          totalCogs: financialSummary.cogs,
          grossProfit: financialSummary.grossProfit,
          totalExpenses: financialSummary.totalExpenses,
          netProfit: financialSummary.netProfit,
          profitMarginPct: financialSummary.profitMargin,
          transactionCount: financialSummary.transactionCount,
          totalUnitsSold: financialSummary.totalUnitsSold,
          avgTransactionValue: financialSummary.averageOrderValue
        },
        cashFlow: {
          CASH: financialSummary.cashSales,
          M_PESA: financialSummary.mobileSales,
          TIGO_PESA: 0,
          AIRTEL_MONEY: 0,
          HALOPESA: 0,
          CARD: 0,
          CREDIT: financialSummary.creditSales
        },
        dailyBreakdown: dailySummary.map(d => ({
          dateStr: d.dateKey,
          formattedDate: `${d.dayOfWeek ? d.dayOfWeek + ', ' : ''}${d.formattedDate}`,
          transactionCount: d.transactionCount,
          unitsCount: d.unitsCount,
          cashSales: d.cashSales,
          mobileSales: d.mobileSales,
          creditSales: d.creditSales,
          totalSales: d.totalSales,
          netProfit: d.netProfit
        })),
        topProducts: financialSummary.topProducts.map(p => ({
          name: p.name,
          qtySold: p.quantity,
          revenueGained: p.revenue
        })),
        transactions: filteredTransactions.map(tx => ({
          receiptNumber: tx.id ? tx.id.substring(0, 10) : 'REC',
          timestamp: tx.timestamp,
          cashierName: tx.cashierName || 'Staff',
          paymentMethod: tx.paymentMethod || 'CASH',
          itemsCount: tx.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1,
          total: tx.total,
          discount: tx.discount,
          customerName: tx.customerName
        }))
      };

      await exportTransactionsReportPdf(pdfData);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(language === 'SW' ? 'Hitilafu wakati wa kutengeneza PDF. Tafadhali jaribu tena.' : 'Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle CSV / Excel Export for All Transactions
  const handleExportCsv = () => {
    const csvTransactions = filteredTransactions.map(tx => {
      const itemsSummary = tx.items?.map(it => `${it.product?.name || 'Item'} (x${it.quantity || 1})`).join('; ') || '';
      return {
        receiptNumber: tx.id ? tx.id.substring(0, 10) : 'REC',
        timestamp: tx.timestamp,
        cashierName: tx.cashierName || 'Staff',
        paymentMethod: tx.paymentMethod || 'CASH',
        itemsSummary,
        subtotal: tx.subtotal || tx.total,
        discount: tx.discount || 0,
        total: tx.total,
        customerName: tx.customerName
      };
    });

    exportTransactionsToCsv(csvTransactions, storeName, dateRangeLabel);
  };

  // Handle CSV / Excel Export for Daily Aggregated Totals
  const handleExportDailyCsv = () => {
    const dailyData = dailySummary.map(d => ({
      dateStr: d.dateKey,
      formattedDate: `${d.dayOfWeek ? d.dayOfWeek + ', ' : ''}${d.formattedDate}`,
      transactionCount: d.transactionCount,
      unitsCount: d.unitsCount,
      cashSales: d.cashSales,
      mobileSales: d.mobileSales,
      creditSales: d.creditSales,
      totalSales: d.totalSales,
      netProfit: d.netProfit
    }));

    exportDailySummaryToCsv(dailyData, storeName, dateRangeLabel);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER & PERIOD FILTER CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                <CalendarRange size={20} />
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <span>
                  {language === 'SW' ? 'Jenereta ya Ripoti za Miamala & Mauzo' : 'Transaction Reports & Sales Generator'}
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-md uppercase font-mono tracking-wider">
                  Live Reports
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              {language === 'SW'
                ? `Tengeneza na pakua ripoti kamili za miamala ya duka ya mwezi 1, miezi 3, miezi 6, miezi 12 au mwezi maalum unaoutaka kwa muundo wa PDF na Excel/CSV.`
                : `Generate and download comprehensive transaction reports for 1 month, 3 months, 6 months, 12 months or any specific custom month in PDF & Excel formats.`}
            </p>
          </div>

          {/* Top Quick Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Credit Items CSV / Excel */}
            <button
              onClick={handleExportCreditItemsCsv}
              disabled={periodCreditItems.length === 0}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              title={language === 'SW' ? 'Pakua Orodha ya Vitu vya Mkopo kwenye Excel / CSV' : 'Export Credit Items CSV'}
            >
              <Coins size={15} className="text-amber-700" />
              <span>{language === 'SW' ? 'Excel ya Vitu vya Mkopo' : 'Credit Items CSV'}</span>
            </button>

            {/* Export Daily Aggregated CSV */}
            <button
              onClick={handleExportDailyCsv}
              disabled={dailySummary.length === 0}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              title={language === 'SW' ? 'Pakua Jedwali la Excel la Mauzo ya Kila Tarehe' : 'Export Daily Date Totals Excel / CSV'}
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>{language === 'SW' ? 'Excel ya Kila Tarehe' : 'Daily Totals CSV'}</span>
            </button>

            {/* Export All Transactions CSV / Excel */}
            <button
              onClick={handleExportCsv}
              disabled={filteredTransactions.length === 0}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              title={language === 'SW' ? 'Pakua Miamala Yote kwenye Excel / CSV' : 'Export All Transactions CSV'}
            >
              <FileSpreadsheet size={15} className="text-slate-600" />
              <span>{language === 'SW' ? 'Excel ya Miamala' : 'All Txns CSV'}</span>
            </button>

            {/* Print Statement */}
            <button
              onClick={handlePrint}
              disabled={filteredTransactions.length === 0}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              title={language === 'SW' ? 'Chapa Ripoti' : 'Print Report'}
            >
              <Printer size={15} className="text-slate-600" />
              <span className="hidden sm:inline">{language === 'SW' ? 'Chapa' : 'Print'}</span>
            </button>

            {/* Export PDF Report */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || filteredTransactions.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm shadow-indigo-950/20 transition cursor-pointer select-none active:scale-95"
              title={language === 'SW' ? 'Pakua Ripoti ya PDF' : 'Download Executive PDF Report'}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{language === 'SW' ? 'Inatayarisha...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <FileDown size={15} />
                  <span>{language === 'SW' ? 'Pakua Ripoti ya PDF' : 'Download PDF Report'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* TIME HORIZON PRESET SELECTOR BUTTONS */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto scrollbar-none select-none">
            <button
              onClick={() => setPeriodPreset('1_MONTH')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === '1_MONTH'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Mwezi 1 (Mwezi Huu)' : '1 Month (Current)'}
            </button>

            <button
              onClick={() => setPeriodPreset('3_MONTHS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === '3_MONTHS'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Miezi 3 (Robo Mwaka)' : '3 Months (Quarter)'}
            </button>

            <button
              onClick={() => setPeriodPreset('6_MONTHS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === '6_MONTHS'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Miezi 6 (Nusu Mwaka)' : '6 Months (Half Year)'}
            </button>

            <button
              onClick={() => setPeriodPreset('12_MONTHS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === '12_MONTHS'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Miezi 12 (Mwaka 1)' : '12 Months (1 Year)'}
            </button>

            <button
              onClick={() => setPeriodPreset('SPECIFIC_MONTH')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === 'SPECIFIC_MONTH'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Mwezi Maalum' : 'Specific Month'}
            </button>

            <button
              onClick={() => setPeriodPreset('CUSTOM_RANGE')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer select-none whitespace-nowrap ${
                periodPreset === 'CUSTOM_RANGE'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'SW' ? 'Tarehe Maalum' : 'Custom Dates'}
            </button>
          </div>

          {/* DYNAMIC MONTH / DATE CONTROLS */}
          {periodPreset === 'SPECIFIC_MONTH' && (
            <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 p-1.5 rounded-2xl">
              {/* Month Dropdown */}
              <select
                value={selectedSpecificMonth}
                onChange={(e) => setSelectedSpecificMonth(parseInt(e.target.value, 10))}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              >
                {(language === 'SW' ? MONTH_NAMES_SW : MONTH_NAMES_EN).map((mName, idx) => (
                  <option key={idx} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedSpecificYear}
                onChange={(e) => setSelectedSpecificYear(parseInt(e.target.value, 10))}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodPreset === 'CUSTOM_RANGE' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              />
              <span className="text-slate-400 font-bold">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          )}
        </div>

        {/* Selected Period Badge */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              {language === 'SW' ? 'Kipindi Kilichochaguliwa:' : 'Active Range:'}
            </span>
            <span className="bg-indigo-50 border border-indigo-200/60 text-indigo-900 font-black px-2.5 py-0.5 rounded-lg font-mono">
              {dateRangeLabel}
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            {language === 'SW' ? 'Jumla ya Miamala:' : 'Transactions Found:'}{' '}
            <strong className="text-slate-900">{filteredTransactions.length}</strong>
          </div>
        </div>
      </div>

      {/* FINANCIAL SCORECARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Gross Sales */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-sm border border-slate-800 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
            <DollarSign size={20} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            {language === 'SW' ? '1. Jumla ya Mauzo' : '1. Gross Revenue'}
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white mb-2">
            {currency} {financialSummary.grossSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-300 font-medium flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>{financialSummary.transactionCount} {language === 'SW' ? 'Miamala' : 'Orders'}</span>
            <span className="font-mono">{financialSummary.totalUnitsSold} {language === 'SW' ? 'Vipande' : 'Units'}</span>
          </div>
        </div>

        {/* 2. COGS & Expenses */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <TrendingDown size={20} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            {language === 'SW' ? '2. Gharama za Bidhaa (COGS)' : '2. Cost of Goods Sold'}
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-800 mb-2">
            {currency} {financialSummary.cogs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>{language === 'SW' ? 'Gharama ya Mtaji' : 'Base Wholesale Cost'}</span>
            <span className="font-mono font-bold text-rose-700">
              {financialSummary.grossSales > 0 ? `${((financialSummary.cogs / financialSummary.grossSales) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-5 shadow-sm border border-emerald-800/60 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
            <TrendingUp size={20} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200 block mb-1">
            {language === 'SW' ? '3. Faida Halisi (Net Profit)' : '3. Net Profit'}
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white mb-2">
            {currency} {financialSummary.netProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 font-medium flex items-center justify-between border-t border-emerald-800/60 pt-2">
            <span>{language === 'SW' ? 'Kiwango cha Faida' : 'Profit Margin'}</span>
            <span className="font-mono font-bold bg-emerald-800/60 px-2 py-0.5 rounded text-white">
              {financialSummary.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 4. Average Order Value */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <ShoppingBag size={20} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            {language === 'SW' ? '4. Wastani kwa Risiti' : '4. Avg Order Value'}
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-sky-700 mb-2">
            {currency} {Math.round(financialSummary.averageOrderValue).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>{language === 'SW' ? 'Njia Kuu ya Malipo' : 'Top Payment'}</span>
            <span className="font-mono font-bold text-slate-700">
              {financialSummary.cashSales >= financialSummary.mobileSales ? 'Cash' : 'Mobile Money'}
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: TREND CHART & PAYMENT METHODS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales & Profit Trend Timeline Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" />
            {language === 'SW' ? 'Mwenendo wa Mauzo na Faida ya Kila Siku' : 'Daily Sales & Net Profit Performance'}
          </h4>
          <p className="text-[11px] text-slate-500 mb-4">
            {language === 'SW'
              ? 'Grafu ya mzunguko wa mapato na faida kwa siku zote za kipindi hiki.'
              : 'Daily revenue and net profit curve for the selected period.'}
          </p>

          <div className="h-64 w-full font-mono text-xs">
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${currency} ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="sales" name={language === 'SW' ? 'Mauzo Ghafi' : 'Sales'} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="profit" name={language === 'SW' ? 'Faida Halisi' : 'Net Profit'} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                {language === 'SW' ? 'Hakuna miamala kwenye kipindi hiki' : 'No transactions found in this period'}
              </div>
            )}
          </div>
        </div>

        {/* Payment Channels & Top Best Sellers */}
        <div className="lg:col-span-4 space-y-6">
          {/* Payment Methods Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-600" />
              {language === 'SW' ? 'Njia za Malipo Zilizotumika' : 'Payment Methods Distribution'}
            </h4>

            <div className="space-y-3 text-xs">
              {/* Cash */}
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">{language === 'SW' ? 'Fedha Taslimu (Cash)' : 'Cash Payments'}</span>
                  <span className="font-mono text-slate-900">
                    {financialSummary.grossSales > 0 ? `${((financialSummary.cashSales / financialSummary.grossSales) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${financialSummary.grossSales > 0 ? (financialSummary.cashSales / financialSummary.grossSales) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {currency} {financialSummary.cashSales.toLocaleString()}
                </span>
              </div>

              {/* Mobile Money */}
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">{language === 'SW' ? 'Simu (M-Pesa, Tigo, Airtel)' : 'Mobile Money'}</span>
                  <span className="font-mono text-slate-900">
                    {financialSummary.grossSales > 0 ? `${((financialSummary.mobileSales / financialSummary.grossSales) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${financialSummary.grossSales > 0 ? (financialSummary.mobileSales / financialSummary.grossSales) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {currency} {financialSummary.mobileSales.toLocaleString()}
                </span>
              </div>

              {/* Credit Issued */}
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">{language === 'SW' ? 'Mikopo / Madeni ya Wateja' : 'Customer Credit'}</span>
                  <span className="font-mono text-slate-900">
                    {financialSummary.grossSales > 0 ? `${((financialSummary.creditSales / financialSummary.grossSales) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: `${financialSummary.grossSales > 0 ? (financialSummary.creditSales / financialSummary.grossSales) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {currency} {financialSummary.creditSales.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Top 5 Products in Period */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={16} className="text-indigo-600" />
              {language === 'SW' ? 'Bidhaa Zilizouza Zaidi' : 'Top Selling Products in Period'}
            </h4>

            {financialSummary.topProducts.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {financialSummary.topProducts.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.quantity} {language === 'SW' ? 'vipande ziliuzwa' : 'units sold'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">{currency} {p.revenue.toLocaleString()}</div>
                      <div className="text-[10px] font-mono text-emerald-600 font-bold">+{currency} {p.profit.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic text-center py-4">
                {language === 'SW' ? 'Hakuna mauzo yaliyorekodiwa' : 'No sales recorded'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW SELECTOR & MAIN REPORT TABLES */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
        {/* View Switcher Header & Filters */}
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70">
          <div>
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setTableViewMode('DAILY_SUMMARY')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  tableViewMode === 'DAILY_SUMMARY'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={14} className={tableViewMode === 'DAILY_SUMMARY' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>{language === 'SW' ? 'Muhtasari wa Kila Tarehe (Sum ya Siku)' : 'Daily Date Breakdown & Sums'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  tableViewMode === 'DAILY_SUMMARY' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/80 text-slate-700'
                }`}>
                  {dailySummary.length}
                </span>
              </button>

              <button
                onClick={() => setTableViewMode('GROUPED_BY_DATE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  tableViewMode === 'GROUPED_BY_DATE'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={14} className={tableViewMode === 'GROUPED_BY_DATE' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>{language === 'SW' ? 'Iliyopangwa kwa Tarehe' : 'Grouped by Date'}</span>
              </button>

              <button
                onClick={() => setTableViewMode('ITEMIZED_LIST')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  tableViewMode === 'ITEMIZED_LIST'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt size={14} className={tableViewMode === 'ITEMIZED_LIST' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>{language === 'SW' ? 'Orodha ya Risiti Moja Moja' : 'Itemized Ledger'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  tableViewMode === 'ITEMIZED_LIST' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/80 text-slate-700'
                }`}>
                  {tableRows.length}
                </span>
              </button>

              <button
                onClick={() => setTableViewMode('CREDIT_ITEMS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  tableViewMode === 'CREDIT_ITEMS'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins size={14} className={tableViewMode === 'CREDIT_ITEMS' ? 'text-amber-200' : 'text-amber-600'} />
                <span>{language === 'SW' ? 'Vitu vya Mkopo' : 'Credit Items'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  tableViewMode === 'CREDIT_ITEMS' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'
                }`}>
                  {periodCreditItems.length}
                </span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {tableViewMode === 'DAILY_SUMMARY' && (
                language === 'SW'
                  ? 'Jedwali hili linajumlisha (sum up) mauzo yote, idadi ya miamala, fedha taslimu, na faida kwa kila tarehe husika.'
                  : 'This table sums up all transaction amounts, cash flow, transaction volume, and net profit per specific date.'
              )}
              {tableViewMode === 'GROUPED_BY_DATE' && (
                language === 'SW'
                  ? 'Miamala yote imepangwa chini ya tarehe husika ikiwa na jumla kuu na faida ya siku hiyo.'
                  : 'Transactions organized under each specific date header with instant daily subtotal calculations.'
              )}
              {tableViewMode === 'ITEMIZED_LIST' && (
                language === 'SW'
                  ? `Inaonesha risiti moja moja (${tableRows.length} kati ya ${filteredTransactions.length}) kwenye kipindi hiki.`
                  : `Showing all individual receipts (${tableRows.length} of ${filteredTransactions.length}) in this period.`
              )}
              {tableViewMode === 'CREDIT_ITEMS' && (
                language === 'SW'
                  ? `Inaonesha orodha maalum ya vitu vyote vilivyouzwa kwa mkopo (${filteredPeriodCreditItems.length}). Kumbuka mikopo haijumuishwi kwenye mauzo ya siku mpaka ilipwe.`
                  : `Showing all individual products sold on credit (${filteredPeriodCreditItems.length}). Debts are excluded from daily sales until collected.`
              )}
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'SW' ? 'Tafuta tarehe, risiti, mteja...' : 'Search date, receipt, customer...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none w-48 sm:w-56 focus:border-indigo-500"
              />
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'SW' ? 'Njia Zote za Malipo' : 'All Payments'}</option>
              <option value="CASH">Cash (Taslimu)</option>
              <option value="M-PESA">M-Pesa</option>
              <option value="TIGO-PESA">Tigo Pesa</option>
              <option value="AIRTEL-MONEY">Airtel Money</option>
              <option value="CREDIT">{language === 'SW' ? 'Mkopo' : 'Credit'}</option>
            </select>

            {/* Cashier Filter */}
            {uniqueCashiers.length > 0 && (
              <select
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'SW' ? 'Wafanyakazi Wote' : 'All Cashiers'}</option>
                {uniqueCashiers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {tableViewMode === 'DAILY_SUMMARY' && dailySummary.length > 0 && (
              <button
                onClick={() => expandedDateKeys.size === dailySummary.length ? collapseAllDates() : expandAllDates()}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title={expandedDateKeys.size === dailySummary.length ? 'Funga Zote' : 'Fungua Zote'}
              >
                {expandedDateKeys.size === dailySummary.length ? (
                  <>
                    <EyeOff size={13} />
                    <span>{language === 'SW' ? 'Funga Zote' : 'Collapse All'}</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} />
                    <span>{language === 'SW' ? 'Fungua Zote' : 'Expand All'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 1. DAILY AGGREGATED BREAKDOWN (SUM UP AMOUNT YA KILA TAREHE & DEBT REPAYMENTS SYNC) */}
        {tableViewMode === 'DAILY_SUMMARY' && (
          <div className="overflow-x-auto">
            {/* Informational Callout regarding Debts & Sales Syncing */}
            <div className="p-3 bg-amber-50/70 border-b border-amber-200/60 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-700 shrink-0" />
                <span>
                  {language === 'SW'
                    ? 'Kanuni ya Mauzo: Miamala ya mkopo (madeni mapya) haiongezwi kwenye mauzo ya siku hadi pale inapolipwa. Marejesho na malipo ya madeni yanasawazishwa moja kwa moja kwenye tarehe ambayo malipo hayo yamefanyika.'
                    : 'Revenue Policy: Credit sales are excluded from daily revenue until paid. Debt repayments sync directly to sales on the date payment is recorded.'}
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse min-w-[920px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4">{language === 'SW' ? 'Tarehe Husika' : 'Date & Day'}</th>
                  <th className="py-3 px-3 text-center">{language === 'SW' ? 'Miamala' : 'Txn Count'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Taslimu (Cash)' : 'Cash'}</th>
                  <th className="py-3 px-3 text-right">{language === 'SW' ? 'Simu / Mitandao' : 'Mobile'}</th>
                  <th className="py-3 px-3 text-right text-emerald-700 bg-emerald-50/40">
                    {language === 'SW' ? 'Marejesho ya Deni' : 'Debt Repaid'}
                  </th>
                  <th className="py-3 px-3 text-right text-amber-700 bg-amber-50/40">
                    {language === 'SW' ? 'Madeni Mapya' : 'Credit (Unpaid)'}
                  </th>
                  <th className="py-3 px-4 text-right bg-indigo-50/70 text-indigo-900 font-black">
                    {language === 'SW' ? 'JUMLA YA SIKU (TZS)' : 'DAILY TOTAL (TZS)'}
                  </th>
                  <th className="py-3 px-4 text-right text-emerald-800 font-black">
                    {language === 'SW' ? 'Faida Halisi' : 'Net Profit'}
                  </th>
                  <th className="py-3 px-4 text-center">{language === 'SW' ? 'Mchanganuo' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDailySummary.length > 0 ? (
                  filteredDailySummary.map((day, idx) => {
                    const isExpanded = expandedDateKeys.has(day.dateKey);
                    const paidDebtLogs = day.debtLogs.filter(l => l.type === 'PAYMENT');
                    const borrowDebtLogs = day.debtLogs.filter(l => l.type === 'BORROW');

                    return (
                      <React.Fragment key={day.dateKey}>
                        <tr 
                          className={`hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          {/* Index */}
                          <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Date & Day */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                              <span>{day.formattedDate}</span>
                              {day.dayOfWeek && (
                                <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {day.dayOfWeek}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Transaction Count */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-slate-700">
                              {day.transactionCount}
                            </span>
                          </td>

                          {/* Cash */}
                          <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                            {currency} {day.cashSales.toLocaleString()}
                          </td>

                          {/* Mobile */}
                          <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                            {currency} {day.mobileSales.toLocaleString()}
                          </td>

                          {/* Debt Payments Repaid & Synced */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                            {day.debtPaymentsCollected > 0 ? (
                              <span className="text-emerald-700" title="Imesawazishwa kwenye Mauzo ya Tarehe Hii">
                                +{currency} {day.debtPaymentsCollected.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Credit Sales (Unpaid) */}
                          <td className="py-3.5 px-3 text-right font-mono text-amber-700 bg-amber-50/30">
                            {day.creditSales > 0 ? (
                              <span title="Deni halijaongezwa kwenye mauzo hadi litakapolipwa">
                                {currency} {day.creditSales.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Daily Sum Amount (HIGHLIGHTED) */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-indigo-700 bg-indigo-50/50 text-sm">
                            {currency} {day.totalSales.toLocaleString()}
                          </td>

                          {/* Net Profit */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                            +{currency} {day.netProfit.toLocaleString()}
                          </td>

                          {/* Expand Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleExpandDate(day.dateKey)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer mx-auto ${
                                isExpanded 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>{isExpanded ? (language === 'SW' ? 'Funga' : 'Hide') : (language === 'SW' ? 'Mchanganuo' : 'View')}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Accordion: Itemized Transactions & Debt Sync Details for this Day */}
                        {isExpanded && (
                          <tr className="bg-indigo-50/20 border-y border-indigo-100">
                            <td colSpan={10} className="p-4 sm:p-5">
                              <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-3xs space-y-4">
                                {/* Header and Day Summary Badges */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <CalendarDays size={16} className="text-indigo-600" />
                                    <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                                      {language === 'SW' ? `Mchanganuo wa Mauzo na Madeni: ${day.formattedDate}` : `Breakdown for ${day.formattedDate}`}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                                    <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700">
                                      {language === 'SW' ? 'Mauzo ya Miamala:' : 'Txn Sales:'}{' '}
                                      <span className="font-mono text-slate-900">
                                        {currency} {(day.totalSales - day.debtPaymentsCollected).toLocaleString()}
                                      </span>
                                    </div>
                                    {day.debtPaymentsCollected > 0 && (
                                      <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl text-emerald-800 flex items-center gap-1">
                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                        {language === 'SW' ? 'Marejesho ya Deni:' : 'Debt Repaid:'}{' '}
                                        <span className="font-mono text-emerald-900 font-black">
                                          +{currency} {day.debtPaymentsCollected.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl text-indigo-900">
                                      {language === 'SW' ? 'Jumla ya Mauzo ya Siku Hii:' : 'Day Total Revenue:'}{' '}
                                      <span className="text-indigo-700 font-mono font-black text-sm">
                                        {currency} {day.totalSales.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* SECTION 1: TRANSACTIONS LIST */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                      <Receipt size={14} className="text-indigo-600" />
                                      {language === 'SW' ? 'Miamala ya Mauzo Iliyofanyika' : 'Sales Transactions'} ({day.transactions.length})
                                    </h5>
                                  </div>

                                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                                          <th className="py-2 px-3">{language === 'SW' ? 'Muda' : 'Time'}</th>
                                          <th className="py-2 px-3">{language === 'SW' ? 'Risiti' : 'Receipt ID'}</th>
                                          <th className="py-2 px-3">{language === 'SW' ? 'Mteja / Keshia' : 'Customer / Cashier'}</th>
                                          <th className="py-2 px-3">{language === 'SW' ? 'Njia' : 'Method'}</th>
                                          <th className="py-2 px-3">{language === 'SW' ? 'Bidhaa' : 'Items'}</th>
                                          <th className="py-2 px-3 text-right">{language === 'SW' ? 'Kiasi cha Mauzo' : 'Amount'}</th>
                                          <th className="py-2 px-3 text-center">{language === 'SW' ? 'Hali ya Mapato' : 'Revenue Status'}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {day.transactions.length > 0 ? (
                                          day.transactions.map((tx, tIdx) => {
                                            const tDate = new Date(tx.timestamp);
                                            const timeStr = isNaN(tDate.getTime()) ? '-' : tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            const itemsSummary = tx.items?.map(it => `${it.product?.name || 'Item'} (${it.quantity || 1})`).join(', ') || '-';
                                            const isCredit = tx.paymentMethod === 'CREDIT';

                                            return (
                                              <tr key={tx.id || tIdx} className="hover:bg-slate-50">
                                                <td className="py-2 px-3 font-mono text-slate-500">{timeStr}</td>
                                                <td className="py-2 px-3 font-mono font-bold text-indigo-700">{tx.id?.substring(0, 10)}</td>
                                                <td className="py-2 px-3">
                                                  <span className="font-bold text-slate-800">{tx.customerName || (language === 'SW' ? 'Mteja wa Kawaida' : 'Walk-in')}</span>
                                                  {tx.cashierName && <span className="text-[10px] text-slate-400 ml-1.5">({tx.cashierName})</span>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono uppercase ${
                                                    isCredit ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                                  }`}>
                                                    {tx.paymentMethod}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={itemsSummary}>
                                                  {itemsSummary}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                  {currency} {tx.total.toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                  {isCredit ? (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                                                      {language === 'SW' ? 'Mkopo (Haujaongezwa Mauzo)' : 'Credit (Deferred)'}
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                                      {language === 'SW' ? 'Mauzo Halisi (Imelipwa)' : 'Realized Sales'}
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={7} className="py-3 text-center text-slate-400 italic">
                                              {language === 'SW' ? 'Hakuna miamala ya mauzo ya moja kwa moja tarehe hii' : 'No direct sales transactions on this date'}
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* SECTION 2: DEBT REPAYMENTS SYNCED ON THIS DATE */}
                                {paidDebtLogs.length > 0 && (
                                  <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-3">
                                    <h5 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] mb-2">
                                      <CheckCircle2 size={14} className="text-emerald-600" />
                                      {language === 'SW' ? 'Marejesho ya Madeni Yaliyosawazishwa Kwenye Mauzo ya Tarehe Hii' : 'Debt Repayments Synced to This Date\'s Sales'} ({paidDebtLogs.length})
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-emerald-100/60 text-emerald-900 font-bold uppercase text-[9px] tracking-wider border-b border-emerald-200">
                                            <th className="py-2 px-3">{language === 'SW' ? 'Muda' : 'Time'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Mteja Aliyelipa' : 'Customer'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Njia ya Malipo' : 'Payment Method'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Maelezo' : 'Notes'}</th>
                                            <th className="py-2 px-3 text-right">{language === 'SW' ? 'Kiasi Kilicholipwa (TZS)' : 'Amount Paid'}</th>
                                            <th className="py-2 px-3 text-center">{language === 'SW' ? 'Hali' : 'Status'}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-100">
                                          {paidDebtLogs.map((log: any, lIdx: number) => {
                                            const cust = customerMap.get(log.customerId);
                                            const lDate = new Date(log.timestamp);
                                            const timeStr = isNaN(lDate.getTime()) ? '-' : lDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return (
                                              <tr key={log.id || lIdx} className="hover:bg-emerald-50/40">
                                                <td className="py-2 px-3 font-mono text-slate-600">{timeStr}</td>
                                                <td className="py-2 px-3 font-bold text-slate-800">
                                                  {cust?.name || log.customerName || (language === 'SW' ? 'Mteja wa Deni' : 'Customer')}
                                                  {cust?.phone && <span className="text-[10px] text-slate-400 ml-1">({cust.phone})</span>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-emerald-100 text-emerald-800">
                                                    {log.paymentMethod || 'CASH'}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-slate-600">
                                                  {log.note || (language === 'SW' ? 'Malipo ya deni' : 'Debt repayment')}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                                  +{currency} {(log.amount || 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                  <span className="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                                                    {language === 'SW' ? 'Imesawazishwa Mauzo' : 'Synced to Sales'}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* SECTION 3: NEW DEBTS INCURRED ON THIS DATE */}
                                {borrowDebtLogs.length > 0 && (
                                  <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-3">
                                    <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] mb-2">
                                      <Clock size={14} className="text-amber-600" />
                                      {language === 'SW' ? 'Madeni Mapya Yaliyotolewa Tarehe Hii' : 'New Debts Recorded on This Date'} ({borrowDebtLogs.length})
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-amber-100/60 text-amber-900 font-bold uppercase text-[9px] tracking-wider border-b border-amber-200">
                                            <th className="py-2 px-3">{language === 'SW' ? 'Muda' : 'Time'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Mteja Aliyekopa' : 'Customer'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Tarehe ya Kurejesha' : 'Due Date'}</th>
                                            <th className="py-2 px-3">{language === 'SW' ? 'Maelezo' : 'Notes'}</th>
                                            <th className="py-2 px-3 text-right">{language === 'SW' ? 'Kiasi cha Deni (TZS)' : 'Credit Amount'}</th>
                                            <th className="py-2 px-3 text-center">{language === 'SW' ? 'Hali' : 'Status'}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-100">
                                          {borrowDebtLogs.map((log: any, bIdx: number) => {
                                            const cust = customerMap.get(log.customerId);
                                            const lDate = new Date(log.timestamp);
                                            const timeStr = isNaN(lDate.getTime()) ? '-' : lDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return (
                                              <tr key={log.id || bIdx} className="hover:bg-amber-50/40">
                                                <td className="py-2 px-3 font-mono text-slate-600">{timeStr}</td>
                                                <td className="py-2 px-3 font-bold text-slate-800">
                                                  {cust?.name || log.customerName || (language === 'SW' ? 'Mteja' : 'Customer')}
                                                  {cust?.phone && <span className="text-[10px] text-slate-400 ml-1">({cust.phone})</span>}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-slate-600">
                                                  {log.dueDate ? new Date(log.dueDate).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600">
                                                  {log.note || (language === 'SW' ? 'Mteja amekopa bidhaa' : 'Customer credit')}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                                                  {currency} {(log.amount || 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                                    {language === 'SW' ? 'Litahesabiwa LIKILIPWA' : 'Deferred until paid'}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      {language === 'SW' ? 'Hakuna data ya mauzo kwa tarehe zilizochaguliwa' : 'No sales records found for selected dates'}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer: GRAND TOTAL FOR ALL DAYS */}
              {filteredDailySummary.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-950">
                    <td colSpan={2} className="py-4 px-4 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>{language === 'SW' ? 'JUMLA KUU YA SIKU ZOTE' : 'GRAND TOTAL FOR ALL DATES'}</span>
                    </td>
                    <td className="py-4 px-3 text-center font-mono text-indigo-300 font-black">
                      {filteredDailySummary.reduce((s, d) => s + d.transactionCount, 0)}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-slate-300">
                      {currency} {filteredDailySummary.reduce((s, d) => s + d.cashSales, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-slate-300">
                      {currency} {filteredDailySummary.reduce((s, d) => s + d.mobileSales, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-emerald-300 font-bold bg-slate-800/60">
                      +{currency} {filteredDailySummary.reduce((s, d) => s + d.debtPaymentsCollected, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-amber-300 bg-slate-800/60">
                      {currency} {filteredDailySummary.reduce((s, d) => s + d.creditSales, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-emerald-400 text-sm font-black bg-slate-800/80">
                      {currency} {filteredDailySummary.reduce((s, d) => s + d.totalSales, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-emerald-300 font-black">
                      +{currency} {filteredDailySummary.reduce((s, d) => s + d.netProfit, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-[10px] text-slate-400">
                      {filteredDailySummary.length} {language === 'SW' ? 'siku' : 'days'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* 2. GROUPED BY DATE VIEW */}
        {tableViewMode === 'GROUPED_BY_DATE' && (
          <div className="p-4 sm:p-6 space-y-6">
            {groupedTableRows.length > 0 ? (
              groupedTableRows.map((grp) => (
                <div key={grp.dateKey} className="bg-slate-50/70 border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                  {/* Date Section Header with Summed Total */}
                  <div className="bg-indigo-900 text-white p-3.5 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={18} className="text-indigo-300" />
                      <span className="font-extrabold text-sm sm:text-base tracking-tight">{grp.formattedDate}</span>
                      {grp.dayOfWeek && (
                        <span className="text-[11px] bg-indigo-800 text-indigo-200 font-bold px-2 py-0.5 rounded-md">
                          {grp.dayOfWeek}
                        </span>
                      )}
                      <span className="text-xs bg-indigo-700/80 text-white font-mono px-2 py-0.5 rounded-full font-bold ml-1">
                        {grp.transactions.length} {language === 'SW' ? 'miamala' : 'txns'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-indigo-200 mr-1.5">{language === 'SW' ? 'Faida ya Siku:' : 'Daily Profit:'}</span>
                        <span className="text-emerald-300 font-mono font-bold">+{currency} {grp.totalProfit.toLocaleString()}</span>
                      </div>
                      <div className="bg-indigo-950/60 px-3 py-1 rounded-xl border border-indigo-700/50">
                        <span className="text-indigo-200 mr-1.5">{language === 'SW' ? 'Jumla ya Siku:' : 'Daily Total:'}</span>
                        <span className="text-emerald-400 font-mono font-black text-sm">
                          {currency} {grp.subtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table for this specific group */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-4">{language === 'SW' ? 'Muda' : 'Time'}</th>
                          <th className="py-2.5 px-3">{language === 'SW' ? 'Namba ya Risiti' : 'Receipt ID'}</th>
                          <th className="py-2.5 px-3">{language === 'SW' ? 'Mteja / Keshia' : 'Customer / Cashier'}</th>
                          <th className="py-2.5 px-3">{language === 'SW' ? 'Njia ya Malipo' : 'Payment'}</th>
                          <th className="py-2.5 px-3 text-center">{language === 'SW' ? 'Vipande' : 'Items'}</th>
                          <th className="py-2.5 px-4 text-right">{language === 'SW' ? 'Kiasi (TZS)' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {grp.transactions.map((tx, idx) => {
                          const txDate = new Date(tx.timestamp);
                          const timeStr = isNaN(txDate.getTime()) ? '-' : txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const itemCount = tx.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1;

                          return (
                            <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{timeStr}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{tx.id.substring(0, 10)}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800">{tx.customerName || (language === 'SW' ? 'Mteja wa Kawaida' : 'Walk-in Customer')}</div>
                                {tx.cashierName && <div className="text-[10px] text-slate-400">{language === 'SW' ? 'Keshia:' : 'Cashier:'} {tx.cashierName}</div>}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase ${
                                  tx.paymentMethod === 'CASH' 
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tx.paymentMethod === 'CREDIT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {tx.paymentMethod || 'CASH'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{itemCount}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                {currency} {tx.total.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold text-xs border-t border-slate-200">
                          <td colSpan={4} className="py-2.5 px-4 text-slate-700 uppercase">
                            {language === 'SW' ? `Jumla ya Tarehe ${grp.formattedDate}:` : `Subtotal for ${grp.formattedDate}:`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                            {grp.transactions.reduce((s, tx) => s + (tx.items?.reduce((sub, it) => sub + (it.quantity || 1), 0) || 1), 0)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-indigo-900 font-black">
                            {currency} {grp.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 italic">
                {language === 'SW' ? 'Hakuna miamala inayolingana na vigezo vilivyochaguliwa' : 'No transactions match the selected criteria'}
              </div>
            )}
          </div>
        )}

        {/* 3. FLAT ITEMIZED TRANSACTIONS LEDGER TABLE */}
        {tableViewMode === 'ITEMIZED_LIST' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">{language === 'SW' ? 'Tarehe & Saa' : 'Date & Time'}</th>
                  <th className="py-3 px-3">{language === 'SW' ? 'Namba ya Risiti' : 'Receipt ID'}</th>
                  <th className="py-3 px-3">{language === 'SW' ? 'Mteja / Keshia' : 'Customer / Cashier'}</th>
                  <th className="py-3 px-3">{language === 'SW' ? 'Njia ya Malipo' : 'Payment'}</th>
                  <th className="py-3 px-3 text-center">{language === 'SW' ? 'Vipande' : 'Items'}</th>
                  <th className="py-3 px-4 text-right">{language === 'SW' ? 'Jumla (TZS)' : 'Total (TZS)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tableRows.length > 0 ? (
                  tableRows.map((tx, idx) => {
                    const txDate = new Date(tx.timestamp);
                    const formattedDate = `${txDate.toLocaleDateString()} ${txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    const itemCount = tx.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1;

                    return (
                      <tr 
                        key={tx.id || idx} 
                        className={`hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {formattedDate}
                        </td>

                        {/* Receipt ID */}
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {tx.id.substring(0, 10)}
                        </td>

                        {/* Customer / Cashier */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">
                            {tx.customerName || (language === 'SW' ? 'Mteja wa Kawaida' : 'Walk-in Customer')}
                          </div>
                          {tx.cashierName && (
                            <div className="text-[10px] text-slate-400">
                              {language === 'SW' ? 'Keshia:' : 'Cashier:'} {tx.cashierName}
                            </div>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase ${
                            tx.paymentMethod === 'CASH' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.paymentMethod === 'CREDIT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {tx.paymentMethod || 'CASH'}
                          </span>
                        </td>

                        {/* Items Count */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          {itemCount}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {currency} {tx.total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      {language === 'SW' ? 'Hakuna miamala inayolingana na vigezo vilivyochaguliwa' : 'No transactions match the selected criteria'}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer */}
              {tableRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-950">
                    <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span>{language === 'SW' ? 'JUMLA KUU YA MIAMALA INAYOONEKANA' : 'SUBTOTAL FOR FILTERED TRANSACTIONS'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                      {tableRows.reduce((s, tx) => s + (tx.items?.reduce((sub, it) => sub + (it.quantity || 1), 0) || 1), 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 text-sm">
                      {currency} {tableRows.reduce((s, tx) => s + (tx.total || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* 4. DEDICATED CREDIT ITEMS & DEBT SALES TABLE */}
        {tableViewMode === 'CREDIT_ITEMS' && (
          <div className="space-y-4 p-4 sm:p-6">
            {/* Accounting Rule Clarification Notice */}
            <div className="bg-amber-500/10 border border-amber-300/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold uppercase tracking-wide text-amber-900 text-[11px] mb-0.5">
                    {language === 'SW' ? 'Kanuni ya Uhakiki wa Mauzo & Mikopo' : 'Accounting & Credit Recognition Rule'}
                  </h4>
                  <p className="text-amber-800 leading-relaxed">
                    {language === 'SW'
                      ? 'Bidhaa zilizotolewa kwa mkopo hazijumuishwi kwenye mauzo ya fedha za siku hiyo hadi pale mteja anapofanya marejesho au kulipa deni lake lote. Malipo hayo yataingizwa na kuhesabiwa kama mauzo halisi kwenye tarehe ya ulipaji.'
                      : 'Items sold on credit are strictly excluded from daily cash sales totals until the customer makes payments. Any payment collected is automatically recognized as sales on the exact date of collection.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleExportCreditItemsCsv}
                disabled={filteredPeriodCreditItems.length === 0}
                className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Download size={14} />
                <span>{language === 'SW' ? 'Pakua Excel/CSV' : 'Export CSV'}</span>
              </button>
            </div>

            {/* Quick Metrics Cards for Period Credit Items */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'SW' ? 'Jumla ya Vitu vya Mkopo' : 'Gross Credit Items Value'}
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-700">
                  {currency} {filteredPeriodCreditItems.reduce((s, it) => s + it.totalItemValue, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {filteredPeriodCreditItems.reduce((s, it) => s + it.quantity, 0)} {language === 'SW' ? 'vipande jumla' : 'units total'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'SW' ? 'Bado Hayajalipwa (Deni)' : 'Outstanding Unpaid'}
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-rose-600">
                  {currency} {filteredPeriodCreditItems.filter(it => it.status !== 'SETTLED').reduce((s, it) => s + it.unpaidDebtPortion, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5">
                  {language === 'SW' ? 'Hazijaingia kwenye mauzo' : 'Excluded from daily sales'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'SW' ? 'Kianzio Kilicholipwa Siku Hiyo' : 'Down Payments Paid'}
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-emerald-600">
                  {currency} {filteredPeriodCreditItems.reduce((s, it) => s + it.receivedDownPayment, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {language === 'SW' ? 'Kimeingia kwenye mauzo ya siku' : 'Counted in daily sales'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'SW' ? 'Idadi ya Bidhaa / Miamala' : 'Credit Items Count'}
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-slate-800">
                  {filteredPeriodCreditItems.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'SW' ? 'kwenye kipindi kilichochaguliwa' : 'in selected period'}
                </div>
              </div>
            </div>

            {/* Credit Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">{language === 'SW' ? 'Tarehe & Risiti' : 'Date & Ref'}</th>
                    <th className="py-3 px-3">{language === 'SW' ? 'Bidhaa / Huduma' : 'Product / Item'}</th>
                    <th className="py-3 px-3 text-center">{language === 'SW' ? 'Idadi' : 'Qty'}</th>
                    <th className="py-3 px-3 text-right">{language === 'SW' ? 'Bei (TZS)' : 'Unit Price'}</th>
                    <th className="py-3 px-3 text-right">{language === 'SW' ? 'Thamani ya Mkopo' : 'Credit Value'}</th>
                    <th className="py-3 px-3">{language === 'SW' ? 'Mteja Aliyekopa' : 'Customer'}</th>
                    <th className="py-3 px-3">{language === 'SW' ? 'Keshia' : 'Cashier'}</th>
                    <th className="py-3 px-3 text-right">{language === 'SW' ? 'Kianzio Kilicholipwa' : 'Down Payment'}</th>
                    <th className="py-3 px-4 text-center">{language === 'SW' ? 'Hali ya Deni' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPeriodCreditItems.length > 0 ? (
                    filteredPeriodCreditItems.map((item, idx) => {
                      const itemDate = new Date(item.timestamp);
                      const dateStr = isNaN(itemDate.getTime()) 
                        ? item.timestamp 
                        : `${itemDate.toLocaleDateString()} ${itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                      return (
                        <tr 
                          key={`${item.txId}-${item.productId}-${idx}`}
                          className={`hover:bg-amber-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-600">{dateStr}</div>
                            <div className="font-mono text-[10px] font-bold text-indigo-600">{item.receiptNumber}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-400">{item.categoryName}</div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {item.quantity}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {currency} {item.unitPrice.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-900">
                            {currency} {item.totalItemValue.toLocaleString()}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.customerPhone}</div>
                            {item.dueDate && (
                              <div className="text-[9px] text-amber-700 font-medium">
                                {language === 'SW' ? 'Tarehe ya kurejesha:' : 'Due:'} {new Date(item.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-600">
                            {item.cashierName}
                          </td>

                          <td className="py-3 px-3 text-right font-mono">
                            {item.receivedDownPayment > 0 ? (
                              <span className="text-emerald-700 font-bold">
                                {currency} {item.receivedDownPayment.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                              item.status === 'SETTLED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.status === 'OVERDUE'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : item.status === 'PARTIAL'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {item.statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                        {language === 'SW' 
                          ? 'Hakuna vitu vilivyouzwa kwa mkopo kwenye kipindi hiki kilichochaguliwa.' 
                          : 'No items sold on credit found in this selected period.'}
                      </td>
                    </tr>
                  )}
                </tbody>

                {filteredPeriodCreditItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-950">
                      <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins size={15} className="text-amber-400" />
                        <span>{language === 'SW' ? 'JUMLA YA VITU VYA MKOPO' : 'TOTAL CREDIT ITEMS'}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-amber-300">
                        {filteredPeriodCreditItems.reduce((s, it) => s + it.quantity, 0)}
                      </td>
                      <td className="py-3.5 px-3"></td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300 font-black">
                        {currency} {filteredPeriodCreditItems.reduce((s, it) => s + it.totalItemValue, 0).toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-3.5 px-3 text-slate-400 font-mono text-[10px]">
                        {filteredPeriodCreditItems.length} {language === 'SW' ? 'rekodi za vitu' : 'item records'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-300 font-bold">
                        {currency} {filteredPeriodCreditItems.reduce((s, it) => s + it.receivedDownPayment, 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[10px] text-amber-200">
                        {language === 'SW' ? 'Haziongezeki mpaka zilipwe' : 'Deferred until paid'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
