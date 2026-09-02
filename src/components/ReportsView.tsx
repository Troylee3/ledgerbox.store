import { useMemo, useState } from 'react';
import { DbState, Transaction, Product, PaymentMethod } from '../types';
import { 
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, Users, AlertTriangle, FileText, ChevronRight, Award, LogIn, LogOut, CheckCircle, CheckCircle2, Search, Calendar, Filter, User, Info, ShieldCheck, Scale, Receipt, Building2, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Activity, BarChart2, Layers, Percent, Zap, Download, Printer, Loader2, FileDown, Coins, Clock, CreditCard, AlertCircle, Package, BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  ComposedChart,
  ReferenceLine,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { calculateTanzaniaTax } from '../lib/taxEngine';
import { useLanguage } from '../lib/translations';
import { exportReportToPdf, exportCreditItemsToCsv } from '../lib/reportPdfExporter';
import FinancialPositionView from './FinancialPositionView';
import ProfitOrLossStatementView from './ProfitOrLossStatementView';
import TransactionReportsView from './TransactionReportsView';

interface ReportsViewProps {
  state: DbState;
  onNavigateToInventory: () => void;
}

export default function ReportsView({ state, onNavigateToInventory }: ReportsViewProps) {
  const { language, t } = useLanguage();
  const { transactions, products, customers, settings, stockLogs } = state;
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Top Tab Selector
  const [activeReportTab, setActiveReportTab] = useState<'KPI_METRICS' | 'TRANSACTIONS_REPORT' | 'CREDIT_ITEMS' | 'CASHIER_ITEMS' | 'TAX_ENGINE' | 'FINANCIAL_POSITION' | 'PROFIT_LOSS'>('KPI_METRICS');

  // Tax Engine Input States
  const [taxTurnover, setTaxTurnover] = useState<string>('25000000');
  const [taxExpenses, setTaxExpenses] = useState<string>('15000000');
  const [taxKeepsRecords, setTaxKeepsRecords] = useState<boolean>(true);

  // Time period toggle for KPI metrics
  const [timePeriod, setTimePeriod] = useState<'TODAY' | 'THIS_MONTH' | 'ALL_TIME'>('TODAY');

  // Filters for Cashier Itemized sales ledger
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // Filters for Credit Items report ("Vitu vilivyouzwa kwa mkopo")
  const [creditSearchQuery, setCreditSearchQuery] = useState<string>('');
  const [creditStatusFilter, setCreditStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'OVERDUE'>('ALL');
  const [creditPeriodFilter, setCreditPeriodFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH'>('ALL');
  const [creditCashierFilter, setCreditCashierFilter] = useState<string>('ALL');

  // Dynamically compute taxes according to Tanzanian tax law
  const taxCalculations = useMemo(() => {
    const turnoverVal = parseFloat(taxTurnover) || 0;
    const expensesVal = parseFloat(taxExpenses) || 0;
    return calculateTanzaniaTax({
      annualTurnover: turnoverVal,
      annualExpenses: expensesVal,
      keepsRecords: taxKeepsRecords
    });
  }, [taxTurnover, taxExpenses, taxKeepsRecords]);

  // Core metrics computations
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let salesTotal = 0;
    let costTotal = 0;
    let receiptsCount = transactions.length;

    let salesMonthly = 0;
    let costMonthly = 0;
    let receiptsMonthly = 0;

    let salesToday = 0;
    let costToday = 0;
    let receiptsToday = 0;

    let cashFlowAll = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    let cashFlowMonthly = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    let cashFlowToday = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const isToday = tx.timestamp.split('T')[0] === todayStr;
      const isThisMonth = txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;

      const isCredit = tx.paymentMethod === 'CREDIT';
      const paidPortion = isCredit ? (tx.receivedAmount || 0) : tx.total;

      // 1. ALL TIME COMPILING (Exclude unpaid credit from sales total)
      salesTotal += paidPortion;
      if (isCredit) {
        cashFlowAll.CREDIT += tx.total;
        if (paidPortion > 0) cashFlowAll.CASH += paidPortion;
      } else {
        cashFlowAll[tx.paymentMethod] += tx.total;
      }

      tx.items.forEach(item => {
        const cost = (item.product?.costPrice || 0) * (item.quantity || 1);
        costTotal += cost;
      });

      // 2. MONTHLY COMPILING
      if (isThisMonth) {
        salesMonthly += paidPortion;
        receiptsMonthly++;
        if (isCredit) {
          cashFlowMonthly.CREDIT += tx.total;
          if (paidPortion > 0) cashFlowMonthly.CASH += paidPortion;
        } else {
          cashFlowMonthly[tx.paymentMethod] += tx.total;
        }
        tx.items.forEach(item => {
          costMonthly += ((item.product?.costPrice || 0) * (item.quantity || 1));
        });
      }

      // 3. TODAY COMPILING
      if (isToday) {
        salesToday += paidPortion;
        receiptsToday++;
        if (isCredit) {
          cashFlowToday.CREDIT += tx.total;
          if (paidPortion > 0) cashFlowToday.CASH += paidPortion;
        } else {
          cashFlowToday[tx.paymentMethod] += tx.total;
        }
        tx.items.forEach(item => {
          costToday += ((item.product?.costPrice || 0) * (item.quantity || 1));
        });
      }
    });

    // 4. DEBT REPAYMENTS COMPILING (Paid / Reduced Debts sync to sales on payment date)
    const debtLogs = state.debtLogs || [];
    debtLogs.forEach(log => {
      if (log.type === 'PAYMENT') {
        const logDate = new Date(log.timestamp);
        const isLogToday = log.timestamp.split('T')[0] === todayStr;
        const isLogThisMonth = logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth;

        salesTotal += log.amount;

        if (isLogThisMonth) {
          salesMonthly += log.amount;
        }

        if (isLogToday) {
          salesToday += log.amount;
        }

        const method = (log.paymentMethod || 'CASH') as PaymentMethod;
        if (cashFlowAll[method] !== undefined) {
          cashFlowAll[method] += log.amount;
        }
        if (isLogThisMonth && cashFlowMonthly[method] !== undefined) {
          cashFlowMonthly[method] += log.amount;
        }
        if (isLogToday && cashFlowToday[method] !== undefined) {
          cashFlowToday[method] += log.amount;
        }
      }
    });

    // 5. EXPENSES COMPILING (Expenses deduct from Sales and Profit of the Day)
    const expensesList = state.expenses || [];
    let expensesTotal = 0;
    let expensesMonthly = 0;
    let expensesToday = 0;

    let expenseCashFlowAll: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    let expenseCashFlowMonthly: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    let expenseCashFlowToday: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      M_PESA: 0,
      TIGO_PESA: 0,
      AIRTEL_MONEY: 0,
      HALOPESA: 0,
      CREDIT: 0
    };

    expensesList.forEach(exp => {
      const expDate = new Date(exp.date);
      const isExpToday = exp.date && exp.date.startsWith(todayStr);
      const isExpThisMonth = !isNaN(expDate.getTime()) && expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
      const amt = exp.amount || 0;
      const pm = (exp.paymentMethod || 'CASH') as PaymentMethod;

      expensesTotal += amt;
      if (expenseCashFlowAll[pm] !== undefined) {
        expenseCashFlowAll[pm] += amt;
      }

      if (isExpThisMonth) {
        expensesMonthly += amt;
        if (expenseCashFlowMonthly[pm] !== undefined) {
          expenseCashFlowMonthly[pm] += amt;
        }
      }

      if (isExpToday) {
        expensesToday += amt;
        if (expenseCashFlowToday[pm] !== undefined) {
          expenseCashFlowToday[pm] += amt;
        }
      }
    });

    // Net Sales = Gross Realized Sales - Period Operating Expenses
    const netSalesToday = Math.max(0, salesToday - expensesToday);
    const netSalesMonthly = Math.max(0, salesMonthly - expensesMonthly);
    const netSalesTotal = Math.max(0, salesTotal - expensesTotal);

    // Net Profit = (Realized Sales - COGS) - Operating Expenses
    const profitToday = Math.max(0, (salesToday - costToday) - expensesToday);
    const profitMonthly = Math.max(0, (salesMonthly - costMonthly) - expensesMonthly);
    const profitTotal = Math.max(0, (salesTotal - costTotal) - expensesTotal);

    // Net Cash Flow per payment method
    const netCashFlowToday = {
      CASH: Math.max(0, cashFlowToday.CASH - expenseCashFlowToday.CASH),
      M_PESA: Math.max(0, cashFlowToday.M_PESA - expenseCashFlowToday.M_PESA),
      TIGO_PESA: Math.max(0, cashFlowToday.TIGO_PESA - expenseCashFlowToday.TIGO_PESA),
      AIRTEL_MONEY: Math.max(0, cashFlowToday.AIRTEL_MONEY - expenseCashFlowToday.AIRTEL_MONEY),
      HALOPESA: Math.max(0, cashFlowToday.HALOPESA - expenseCashFlowToday.HALOPESA),
      CARD: Math.max(0, cashFlowToday.CARD - expenseCashFlowToday.CARD),
      CREDIT: cashFlowToday.CREDIT
    };

    const netCashFlowMonthly = {
      CASH: Math.max(0, cashFlowMonthly.CASH - expenseCashFlowMonthly.CASH),
      M_PESA: Math.max(0, cashFlowMonthly.M_PESA - expenseCashFlowMonthly.M_PESA),
      TIGO_PESA: Math.max(0, cashFlowMonthly.TIGO_PESA - expenseCashFlowMonthly.TIGO_PESA),
      AIRTEL_MONEY: Math.max(0, cashFlowMonthly.AIRTEL_MONEY - expenseCashFlowMonthly.AIRTEL_MONEY),
      HALOPESA: Math.max(0, cashFlowMonthly.HALOPESA - expenseCashFlowMonthly.HALOPESA),
      CARD: Math.max(0, cashFlowMonthly.CARD - expenseCashFlowMonthly.CARD),
      CREDIT: cashFlowMonthly.CREDIT
    };

    const netCashFlowAll = {
      CASH: Math.max(0, cashFlowAll.CASH - expenseCashFlowAll.CASH),
      M_PESA: Math.max(0, cashFlowAll.M_PESA - expenseCashFlowAll.M_PESA),
      TIGO_PESA: Math.max(0, cashFlowAll.TIGO_PESA - expenseCashFlowAll.TIGO_PESA),
      AIRTEL_MONEY: Math.max(0, cashFlowAll.AIRTEL_MONEY - expenseCashFlowAll.AIRTEL_MONEY),
      HALOPESA: Math.max(0, cashFlowAll.HALOPESA - expenseCashFlowAll.HALOPESA),
      CARD: Math.max(0, cashFlowAll.CARD - expenseCashFlowAll.CARD),
      CREDIT: cashFlowAll.CREDIT
    };

    const activeDebts = customers.reduce((sum, c) => sum + c.debt, 0);

    // Capital calculation - value of current active inventory at purchase price
    const capitalTotal = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);

    // Losses calculated from stock reductions / stock logs of type ADJUST
    let allTimeLoss = 0;
    let monthlyLoss = 0;
    let todayLoss = 0;

    stockLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const isLogToday = log.timestamp.split('T')[0] === todayStr;
      const isLogThisMonth = logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth;

      const isLoss = log.type === 'ADJUST' && (
        log.note.toLowerCase().includes('reduced') || 
        log.note.toLowerCase().includes('kuharibika') || 
        log.note.toLowerCase().includes('punguza') || 
        log.note.toLowerCase().includes('hasara') || 
        log.note.toLowerCase().includes('lost') || 
        log.note.toLowerCase().includes('stolen') || 
        log.note.toLowerCase().includes('damag')
      );

      if (isLoss) {
        // Find product to get cost price
        const product = products.find(p => p.id === log.productId);
        if (product) {
          const lossValue = log.quantity * product.costPrice;
          allTimeLoss += lossValue;
          if (isLogThisMonth) {
            monthlyLoss += lossValue;
          }
          if (isLogToday) {
            todayLoss += lossValue;
          }
        }
      }
    });

    return {
      grossSalesTotal: salesTotal,
      expensesTotal,
      salesTotal: netSalesTotal,
      profitTotal,
      debtTotal: activeDebts,
      receiptsCount,
      cashFlowAll: netCashFlowAll,
      grossCashFlowAll: cashFlowAll,
      expenseCashFlowAll,
      capitalTotal,

      grossSalesMonthly: salesMonthly,
      expensesMonthly,
      salesMonthly: netSalesMonthly,
      profitMonthly,
      receiptsMonthly,
      cashFlowMonthly: netCashFlowMonthly,
      grossCashFlowMonthly: cashFlowMonthly,
      expenseCashFlowMonthly,
      monthlyLoss,

      grossSalesToday: salesToday,
      expensesToday,
      salesToday: netSalesToday,
      profitToday,
      receiptsToday,
      cashFlowToday: netCashFlowToday,
      grossCashFlowToday: cashFlowToday,
      expenseCashFlowToday,
      todayLoss,

      allTimeLoss
    };
  }, [transactions, customers, products, stockLogs, state.expenses, state.debtLogs]);

  // Determine active duration metrics
  const activeKPIs = useMemo(() => {
    switch (timePeriod) {
      case 'TODAY':
        return {
          grossSales: metrics.grossSalesToday,
          expenses: metrics.expensesToday,
          sales: metrics.salesToday, // Net sales with expenses deducted
          profit: metrics.profitToday,
          loss: metrics.todayLoss,
          receipts: metrics.receiptsToday,
          cashFlow: metrics.cashFlowToday,
          grossCashFlow: metrics.grossCashFlowToday,
          expenseCashFlow: metrics.expenseCashFlowToday,
          durationLabel: language === 'SW' ? 'Leo (Today)' : 'Today'
        };
      case 'THIS_MONTH':
        return {
          grossSales: metrics.grossSalesMonthly,
          expenses: metrics.expensesMonthly,
          sales: metrics.salesMonthly,
          profit: metrics.profitMonthly,
          loss: metrics.monthlyLoss,
          receipts: metrics.receiptsMonthly,
          cashFlow: metrics.cashFlowMonthly,
          grossCashFlow: metrics.grossCashFlowMonthly,
          expenseCashFlow: metrics.expenseCashFlowMonthly,
          durationLabel: language === 'SW' ? 'Mwezi Huu' : 'This Month'
        };
      case 'ALL_TIME':
      default:
        return {
          grossSales: metrics.grossSalesTotal,
          expenses: metrics.expensesTotal,
          sales: metrics.salesTotal,
          profit: metrics.profitTotal,
          loss: metrics.allTimeLoss,
          receipts: metrics.receiptsCount,
          cashFlow: metrics.cashFlowAll,
          grossCashFlow: metrics.grossCashFlowAll,
          expenseCashFlow: metrics.expenseCashFlowAll,
          durationLabel: language === 'SW' ? 'Muda Wote' : 'All Time'
        };
    }
  }, [timePeriod, metrics, language]);

  // Itemized transactions list (latest first)
  const itemizedSales = useMemo(() => {
    const list: {
      txId: string;
      receiptNumber: string;
      timestamp: string;
      cashierName: string;
      productName: string;
      quantity: number;
      sellingPrice: number;
      totalValue: number;
      paymentMethod: string;
    }[] = [];

    // Sort transactions latest first
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sortedTxs.forEach(tx => {
      tx.items.forEach(item => {
        const price = item.customPrice ?? item.product.sellingPrice;
        list.push({
          txId: tx.id,
          receiptNumber: tx.receiptNumber,
          timestamp: tx.timestamp,
          cashierName: tx.cashierName || 'Brayan',
          productName: item.product.name,
          quantity: item.quantity,
          sellingPrice: price,
          totalValue: price * item.quantity,
          paymentMethod: tx.paymentMethod
        });
      });
    });

    return list;
  }, [transactions]);

  // Unique Cashiers extracted
  const uniqueCashiers = useMemo(() => {
    const names = new Set<string>();
    names.add('Brayan');
    names.add('Farida');
    if (state.users) {
      state.users.forEach(u => names.add(u.name));
    }
    transactions.forEach(tx => {
      if (tx.cashierName) {
        names.add(tx.cashierName);
      }
    });
    return Array.from(names);
  }, [state.users, transactions]);

  // Filtered cashier list
  const filteredItemizedSales = useMemo(() => {
    return itemizedSales.filter(sale => {
      const matchesCashier = selectedCashier === 'all' || sale.cashierName.toLowerCase() === selectedCashier.toLowerCase();
      const matchesSearch = sale.productName.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
                           sale.receiptNumber.toLowerCase().includes(itemSearchQuery.toLowerCase());
      return matchesCashier && matchesSearch;
    });
  }, [itemizedSales, selectedCashier, itemSearchQuery]);

  // All items sold on credit (Vitu vilivyouzwa kwa mkopo)
  const creditSalesItems = useMemo(() => {
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

    (transactions || []).forEach(tx => {
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
            receiptNumber: tx.receiptNumber || (tx.id ? tx.id.substring(0, 10) : 'PM-REC'),
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
  }, [transactions, customers, language]);

  // Filtered items sold on credit
  const filteredCreditItems = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return creditSalesItems.filter(item => {
      const q = creditSearchQuery.toLowerCase().trim();
      if (q) {
        const matchProd = item.productName.toLowerCase().includes(q);
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchPhone = item.customerPhone.toLowerCase().includes(q);
        const matchReceipt = item.receiptNumber.toLowerCase().includes(q);
        const matchCashier = item.cashierName.toLowerCase().includes(q);
        if (!matchProd && !matchCust && !matchPhone && !matchReceipt && !matchCashier) {
          return false;
        }
      }

      if (creditStatusFilter !== 'ALL' && item.status !== creditStatusFilter) {
        return false;
      }

      if (creditCashierFilter !== 'ALL' && item.cashierName !== creditCashierFilter) {
        return false;
      }

      if (creditPeriodFilter === 'TODAY') {
        if (!item.timestamp.startsWith(todayStr)) return false;
      } else if (creditPeriodFilter === 'THIS_MONTH') {
        const d = new Date(item.timestamp);
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
      }

      return true;
    });
  }, [creditSalesItems, creditSearchQuery, creditStatusFilter, creditCashierFilter, creditPeriodFilter]);

  // Credit items summary scorecard totals
  const creditSummaryStats = useMemo(() => {
    let totalGrossValue = 0;
    let totalUnits = 0;
    let totalCost = 0;
    let unpaidCount = 0;
    let settledCount = 0;
    let overdueCount = 0;

    filteredCreditItems.forEach(it => {
      totalGrossValue += it.totalItemValue;
      totalUnits += it.quantity;
      totalCost += (it.costPrice * it.quantity);
      if (it.status === 'UNPAID' || it.status === 'PARTIAL') unpaidCount++;
      else if (it.status === 'SETTLED') settledCount++;
      else if (it.status === 'OVERDUE') overdueCount++;
    });

    const totalRepaymentsCollected = (state.debtLogs || [])
      .filter(l => l.type === 'PAYMENT')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    const activeTotalDebtBalance = (customers || []).reduce((sum, c) => sum + (c.debt || 0), 0);

    return {
      totalGrossValue,
      totalUnits,
      totalCost,
      unpaidCount,
      settledCount,
      overdueCount,
      totalRepaymentsCollected,
      activeTotalDebtBalance
    };
  }, [filteredCreditItems, state.debtLogs, customers]);

  // Handle Export Credit Items to CSV
  const handleExportCreditItemsCsv = () => {
    const exportItems = filteredCreditItems.map(item => ({
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
      settings.storeName || 'LedgerBox', 
      creditPeriodFilter === 'TODAY' ? 'Leo' : creditPeriodFilter === 'THIS_MONTH' ? 'Mwezi_Huu' : 'Muda_Wote'
    );
  };

  // Top 5 Best-Selling Products calculations
  const bestSellers = useMemo(() => {
    const counts: Record<string, { product: Product; qtySold: number; revenueGained: number }> = {};
    
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        const prod = item.product;
        if (!counts[prod.id]) {
          counts[prod.id] = { 
            product: products.find(p => p.id === prod.id) || prod, 
            qtySold: 0, 
            revenueGained: 0 
          };
        }
        counts[prod.id].qtySold += item.quantity;
        counts[prod.id].revenueGained += (item.customPrice ?? prod.sellingPrice) * item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5);
  }, [transactions, products]);

  // Critical Low Stock Products
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).slice(0, 5);
  }, [products]);

  // Trend chart controls (Expense vs Income Overlay)
  const [trendChartDays, setTrendChartDays] = useState<'30' | '14' | '7'>('30');
  const [trendChartType, setTrendChartType] = useState<'OVERLAY_LINE' | 'AREA' | 'BAR'>('OVERLAY_LINE');
  const [showTrendNetProfit, setShowTrendNetProfit] = useState<boolean>(true);
  const [showMarginRate, setShowMarginRate] = useState<boolean>(false);

  // Compute 30-day Daily Expense Trends compared to Income (Revenue, Costs, & Margins)
  const expenseIncomeTrendData = useMemo(() => {
    const list = [];
    const now = new Date();
    const daysCount = trendChartDays === '30' ? 30 : trendChartDays === '14' ? 14 : 7;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isodate = d.toISOString().split('T')[0];

      // Formatted labels
      const dayNum = d.getDate();
      const monthShort = d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { month: 'short' });
      const weekday = d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { weekday: 'short' });
      const label = `${dayNum} ${monthShort}`;
      const shortLabel = `${dayNum}/${d.getMonth() + 1}`;
      const fullDate = d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Income & Cost of Goods Sold from transactions
      let income = 0;
      let cogs = 0;
      let txCount = 0;
      let unpaidCredit = 0;

      (transactions || []).forEach(tx => {
        if (tx.timestamp && tx.timestamp.split('T')[0] === isodate) {
          const isCredit = tx.paymentMethod === 'CREDIT';
          const paidPart = isCredit ? (tx.receivedAmount || 0) : tx.total;
          income += paidPart;
          if (isCredit) {
            unpaidCredit += (tx.total - (tx.receivedAmount || 0));
          }
          txCount++;
          (tx.items || []).forEach(it => {
            const cost = (it.product?.costPrice || 0) * (it.quantity || 1);
            cogs += cost;
          });
        }
      });

      // Sync debt repayments collected on this date
      let debtRepayments = 0;
      (state.debtLogs || []).forEach(log => {
        if (log.type === 'PAYMENT' && log.timestamp && log.timestamp.split('T')[0] === isodate) {
          debtRepayments += log.amount;
          income += log.amount;
        }
      });

      const grossProfit = Math.max(0, income - cogs);

      // Expenses recorded on this date
      let expenses = 0;
      let expCount = 0;
      const expenseBreakdown: { title: string; amount: number; category: string }[] = [];

      (state.expenses || []).forEach(exp => {
        if (exp.date && (exp.date === isodate || exp.date.startsWith(isodate))) {
          expenses += exp.amount;
          expCount++;
          expenseBreakdown.push({
            title: exp.title,
            amount: exp.amount,
            category: exp.category
          });
        }
      });

      const netProfit = grossProfit - expenses;
      const profitSpread = income - expenses;
      const profitMarginPct = income > 0 ? ((netProfit / income) * 100) : (expenses > 0 ? -100 : 0);
      const isProfitable = netProfit > 0;
      const isLoss = netProfit < 0;

      list.push({
        dateString: isodate,
        label,
        shortLabel,
        weekday,
        fullDate,
        income,
        expenses,
        cogs,
        grossProfit,
        netProfit,
        profitSpread,
        profitMarginPct: Number(profitMarginPct.toFixed(1)),
        isProfitable,
        isLoss,
        txCount,
        expCount,
        expenseBreakdown
      });
    }

    return list;
  }, [transactions, state.expenses, trendChartDays, language]);

  // Summary aggregation over the selected trend horizon (30 days)
  const trendSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCogs = 0;
    let totalTx = 0;
    let totalExp = 0;
    let profitableDays = 0;
    let deficitDays = 0;
    let breakEvenDays = 0;

    let peakExpense = { date: '', amount: 0, fullDate: '' };
    let peakIncome = { date: '', amount: 0, fullDate: '' };
    let bestProfitDay = { date: '', amount: -Infinity, fullDate: '', marginPct: 0 };
    let worstProfitDay = { date: '', amount: Infinity, fullDate: '', marginPct: 0 };

    expenseIncomeTrendData.forEach(d => {
      totalIncome += d.income;
      totalExpenses += d.expenses;
      totalCogs += d.cogs;
      totalTx += d.txCount;
      totalExp += d.expCount;

      if (d.netProfit > 0) profitableDays++;
      else if (d.netProfit < 0) deficitDays++;
      else breakEvenDays++;

      if (d.expenses > peakExpense.amount) {
        peakExpense = { date: d.label, amount: d.expenses, fullDate: d.fullDate };
      }
      if (d.income > peakIncome.amount) {
        peakIncome = { date: d.label, amount: d.income, fullDate: d.fullDate };
      }
      if (d.netProfit > bestProfitDay.amount && (d.income > 0 || d.expenses > 0)) {
        bestProfitDay = { date: d.label, amount: d.netProfit, fullDate: d.fullDate, marginPct: d.profitMarginPct };
      }
      if (d.netProfit < worstProfitDay.amount && (d.income > 0 || d.expenses > 0)) {
        worstProfitDay = { date: d.label, amount: d.netProfit, fullDate: d.fullDate, marginPct: d.profitMarginPct };
      }
    });

    const grossProfit = Math.max(0, totalIncome - totalCogs);
    const netProfit = grossProfit - totalExpenses;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : (totalExpenses > 0 ? 100 : 0);
    const avgProfitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const isNetLoss = netProfit < 0;

    const days = expenseIncomeTrendData.length || 1;
    const avgDailyIncome = totalIncome / days;
    const avgDailyExpense = totalExpenses / days;
    const avgDailyNet = netProfit / days;

    return {
      totalIncome,
      totalExpenses,
      totalCogs,
      grossProfit,
      netProfit,
      expenseRatio,
      avgProfitMargin: Number(avgProfitMargin.toFixed(1)),
      isNetLoss,
      profitableDays,
      deficitDays,
      breakEvenDays,
      totalTx,
      totalExp,
      peakExpense,
      peakIncome,
      bestProfitDay: bestProfitDay.amount !== -Infinity ? bestProfitDay : { date: '-', amount: 0, fullDate: '', marginPct: 0 },
      worstProfitDay: worstProfitDay.amount !== Infinity ? worstProfitDay : { date: '-', amount: 0, fullDate: '', marginPct: 0 },
      avgDailyIncome,
      avgDailyExpense,
      avgDailyNet
    };
  }, [expenseIncomeTrendData]);

  // Compute 7 days chart sequence
  const chartData = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isodate = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('sw-TZ', { weekday: 'short' });

      let grossDailySales = 0;
      let dailyCost = 0;
      let dailyExpenses = 0;

      transactions.forEach(tx => {
        const txDate = tx.timestamp.split('T')[0];
        if (txDate === isodate) {
          const isCredit = tx.paymentMethod === 'CREDIT';
          const paidPart = isCredit ? (tx.receivedAmount || 0) : tx.total;
          grossDailySales += paidPart;
          tx.items.forEach(it => {
            dailyCost += (it.product?.costPrice || 0) * (it.quantity || 1);
          });
        }
      });

      (state.debtLogs || []).forEach(log => {
        if (log.type === 'PAYMENT' && log.timestamp && log.timestamp.split('T')[0] === isodate) {
          grossDailySales += log.amount;
        }
      });

      (state.expenses || []).forEach(exp => {
        if (exp.date && exp.date.startsWith(isodate)) {
          dailyExpenses += exp.amount || 0;
        }
      });

      const netDailySales = Math.max(0, grossDailySales - dailyExpenses);
      const netDailyProfit = Math.max(0, (grossDailySales - dailyCost) - dailyExpenses);

      list.push({
        label: dayLabel,
        sales: netDailySales,
        grossSales: grossDailySales,
        expenses: dailyExpenses,
        profit: netDailyProfit,
        dateString: isodate
      });
    }
    return list;
  }, [transactions, state.expenses, state.debtLogs]);

  // Compute maximum sales for chart scaling
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.sales), 10000);
    return Math.ceil(maxVal / 5000) * 5000;
  }, [chartData]);

  // PDF Export States & Handler
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportReportToPdf({
        storeName: settings.storeName || 'LedgerBox POS & Store',
        storePhone: settings.phone,
        storeAddress: settings.address,
        currencySymbol: settings.currencySymbol || 'TSh',
        generatedBy: state.currentUser?.name || 'Admin',
        language,
        timePeriodLabel: activeKPIs.durationLabel,
        trendChartDays,
        trendSummary,
        trendData: expenseIncomeTrendData,
        cashFlow: activeKPIs.cashFlow,
        topProducts: bestSellers.map(b => ({
          name: b.product.name,
          qtySold: b.qtySold,
          revenueGained: b.revenueGained
        }))
      }, 'recharts-trend-chart-card');

      setPdfSuccessMessage(
        language === 'SW' 
          ? `Ripoti ya PDF (Siku ${trendChartDays}) imetengenezwa na kupakuliwa kikamilifu!` 
          : `PDF Report (${trendChartDays} Days) generated & downloaded successfully!`
      );
      setTimeout(() => setPdfSuccessMessage(null), 4500);
    } catch (error) {
      console.error('Failed to export PDF', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (state.currentUser?.permissions?.canViewReports === false) {
    return (
      <div className="p-6 text-center text-slate-500 font-sans font-medium h-full flex flex-col items-center justify-center bg-slate-50">
        <AlertTriangle size={48} className="text-amber-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Ufikiaji Umezuiliwa (Access Restricted)</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">Huna kibali cha kuona ripoti na uchambuzi wa duka hili la LedgerBox. Tafadhali wasiliana na Admin wako.</p>
      </div>
    );
  }

  return (
    <div id="reports-wrapper" className="p-4 lg:p-6 bg-slate-50/70 flex flex-col h-full overflow-y-auto font-sans">
      
      {/* PDF Success Toast Feedback */}
      {pdfSuccessMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title & Top PDF Export Action */}
      <div className="mb-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {language === 'SW' ? 'Ripoti na Uchambuzi (Store Analytics)' : 'Reports & Analytics'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'SW'
              ? 'Gundua bidhaa zinazofanya vizuri, fuatilia faida halisi siku hadi siku, na keshia aliyetekeleza mauzo.'
              : 'Discover top selling products, track net daily profit, and view sales breakdown by cashier.'}
          </p>
        </div>

        {/* Executive Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer select-none active:scale-95"
            title={language === 'SW' ? 'Pakua ripoti ya PDF yenye grafu na data zote' : 'Download formatted PDF report with trend charts'}
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{language === 'SW' ? 'Inatayarisha PDF...' : 'Generating PDF...'}</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>{language === 'SW' ? 'Pakua Ripoti ya PDF' : 'Export PDF Report'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Subtabs navigation selector */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-6 shrink-0 gap-1 overflow-x-auto scrollbar-none select-none font-sans border border-slate-200/80">
        <button
          onClick={() => setActiveReportTab('KPI_METRICS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'KPI_METRICS'
              ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <TrendingUp size={16} />
          {language === 'SW' ? 'Leo & Ripoti za Kifedha (Daily / Monthly)' : 'Financial & Sales Metrics'}
        </button>
        <button
          onClick={() => setActiveReportTab('TRANSACTIONS_REPORT')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'TRANSACTIONS_REPORT'
              ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/40 font-bold'
          }`}
        >
          <Calendar size={16} />
          {language === 'SW' ? 'Jenereta ya Miamala (1, 3, 6, 12 Miezi)' : 'Transaction Reports (1, 3, 6, 12 Mo)'}
        </button>
        <button
          onClick={() => setActiveReportTab('CREDIT_ITEMS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'CREDIT_ITEMS'
              ? 'bg-amber-600 text-white shadow-sm font-extrabold'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/40 font-bold'
          }`}
        >
          <Coins size={16} className={activeReportTab === 'CREDIT_ITEMS' ? 'text-amber-200' : 'text-amber-600'} />
          {language === 'SW' ? 'Vitu Vilivyouzwa kwa Mkopo' : 'Items Sold on Credit'}
          {creditSalesItems.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeReportTab === 'CREDIT_ITEMS' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {creditSalesItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveReportTab('CASHIER_ITEMS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'CASHIER_ITEMS'
              ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <Users size={16} />
          {language === 'SW' ? 'Nani Ameuza Nini? (Who Sold What?)' : 'Cashier Sales Ledger'}
        </button>
        <button
          onClick={() => setActiveReportTab('TAX_ENGINE')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'TAX_ENGINE'
              ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <Scale size={16} />
          {language === 'SW' ? 'Kodi ya TRA (Tanzania Tax)' : 'TRA Tax Calculations'}
        </button>
        <button
          onClick={() => setActiveReportTab('FINANCIAL_POSITION')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'FINANCIAL_POSITION'
              ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <Building2 size={16} />
          {language === 'SW' ? 'Hali ya Kifedha ya Mwaka (Financial Position)' : 'Financial Position & Balance Sheet'}
        </button>
        <button
          onClick={() => setActiveReportTab('PROFIT_LOSS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeReportTab === 'PROFIT_LOSS'
              ? 'bg-white text-emerald-700 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <TrendingUp size={16} />
          {language === 'SW' ? 'Taarifa ya Faida au Hasara (Profit or Loss)' : 'Statement of Profit or Loss'}
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeReportTab === 'KPI_METRICS' ? (
        <>
          {/* Time Duration Selector Wrapper */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5 mt-0.5 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {language === 'SW' ? 'Muda wa ripoti ya mapato:' : 'Report Time Horizon:'}
              </span>
              <span className="bg-slate-150 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] font-sans">{activeKPIs.durationLabel}</span>
            </div>

            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 shadow-3xs">
              {[
                { id: 'TODAY', label: language === 'SW' ? 'Leo Pekee (Daily)' : 'Today' },
                { id: 'THIS_MONTH', label: language === 'SW' ? 'Mwezi Huu (Monthly)' : 'This Month' },
                { id: 'ALL_TIME', label: language === 'SW' ? 'Muda Wote' : 'All Time' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTimePeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-md text-[10.5px] font-extrabold cursor-pointer select-none transition ${
                    timePeriod === p.id
                      ? 'bg-white text-slate-900 shadow-3xs'
                      : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Analytics KPI Bento Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Sales Card (Net Sales after daily expenses deducted) */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800 shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest block">
                    {language === 'SW' ? 'Mauzo Halisi (' : 'Net Sales ('}{timePeriod === 'TODAY' ? (language === 'SW' ? 'Leo' : 'Today') : timePeriod === 'THIS_MONTH' ? (language === 'SW' ? 'Mwezi' : 'Month') : (language === 'SW' ? 'Duka' : 'Store')})
                  </span>
                  <h3 className="text-base font-black text-slate-950 font-mono mt-0.5" title={activeKPIs.sales.toString()}>
                    {settings.currencySymbol} {activeKPIs.sales.toLocaleString()}
                  </h3>
                </div>
              </div>
              {activeKPIs.expenses > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-medium">
                  <span>{language === 'SW' ? 'Ghafi:' : 'Gross:'} {settings.currencySymbol} {activeKPIs.grossSales.toLocaleString()}</span>
                  <span className="text-rose-600 font-bold">-{settings.currencySymbol} {activeKPIs.expenses.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Expenses Deducted Card */}
            <div className="bg-white border border-rose-100 p-4 rounded-xl shadow-2xs flex flex-col justify-between bg-rose-50/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-700 shrink-0">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-rose-700 uppercase tracking-widest block">
                    {language === 'SW' ? 'Gharama za (' : 'Expenses ('}{timePeriod === 'TODAY' ? (language === 'SW' ? 'Leo' : 'Today') : timePeriod === 'THIS_MONTH' ? (language === 'SW' ? 'Mwezi' : 'Month') : (language === 'SW' ? 'Kipindi' : 'Period')})
                  </span>
                  <h3 className="text-base font-black text-rose-700 font-mono mt-0.5">
                    {settings.currencySymbol} {activeKPIs.expenses.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-rose-150/50 text-[10px] text-rose-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                <span>{language === 'SW' ? 'Zimejipunguza kwenye mauzo' : 'Deducted from sales'}</span>
              </div>
            </div>

            {/* Profit Card (Net Profit after expenses and cost price) */}
            <div className="bg-gradient-to-r from-emerald-50/50 to-emerald-100/10 border border-emerald-500/20 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-[10.5px] font-black text-emerald-800 uppercase tracking-widest block">
                    {language === 'SW' ? 'Faida Halisi (Profit)' : 'Net Profit'}
                  </span>
                  <h3 className="text-base font-black text-emerald-700 font-mono mt-0.5">
                    {settings.currencySymbol} {activeKPIs.profit.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[10px] text-emerald-700 font-bold flex items-center justify-between">
                <span>{language === 'SW' ? 'Baada ya gharama zote' : 'Net after all expenses'}</span>
                <span>{activeKPIs.grossSales > 0 ? `${((activeKPIs.profit / activeKPIs.grossSales) * 100).toFixed(1)}%` : '0%'}</span>
              </div>
            </div>

            {/* Outstanding Receivables / debts */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-800 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-455 uppercase tracking-widest block">
                    {language === 'SW' ? 'Madeni ya Wateja' : 'Customer Debts'}
                  </span>
                  <h3 className="text-base font-black text-red-700 font-mono mt-0.5">
                    {settings.currencySymbol} {metrics.debtTotal.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                <span>{language === 'SW' ? 'Risiti zilizofanyika:' : 'Transactions:'}</span>
                <strong className="text-slate-800 font-mono">{activeKPIs.receipts}</strong>
              </div>
            </div>

          </div>

          {/* 📊 HALI YA KIFEDHA (DYNAMIC PROFIT & LOSS DETAILS) */}
          <div className="bg-slate-900 text-white rounded-xl p-5 mb-5 shadow-sm border border-slate-800 font-sans">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse"></span>
                  {language === 'SW' ? 'Hesabu ya Mtaji, Gharama na Faida Halisi' : 'Revenue, Expenses & Net Profit Breakdown'} ({timePeriod === 'TODAY' ? (language === 'SW' ? 'Leo' : 'Today') : timePeriod === 'THIS_MONTH' ? (language === 'SW' ? 'Mwezi' : 'Month') : (language === 'SW' ? 'Muda Wote' : 'All-time')})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {timePeriod === 'TODAY' 
                    ? (language === 'SW' 
                        ? 'Mchanganuo wa mauzo ya leo, gharama za siku zilizojipunguza moja kwa moja, faida halisi na hasara za bidhaa.' 
                        : 'Review of today\'s gross sales, daily operational expenses deducted directly, net profit, and inventory losses.')
                    : timePeriod === 'THIS_MONTH'
                      ? (language === 'SW'
                          ? 'Ripoti ya kifedha ya mwezi huu duka zima kwa kuzingatia mauzo ghafi, gharama za mwezi na faida halisi.'
                          : 'Monthly store-wide financial performance metrics, matching gross sales against operational expenses.')
                      : (language === 'SW'
                          ? 'Kipimo chote cha mauzo, gharama na faida halisi tangu kuanzishwa kwa mfumo katika LedgerBox.'
                          : 'Historical aggregate metrics of gross revenue, operational expenses, and net profit since store creation.')
                  }
                </p>
              </div>
              <div className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-mono text-sky-400 font-bold border border-slate-700 uppercase">
                {timePeriod === 'TODAY' ? (language === 'SW' ? 'Leo' : 'Today') : timePeriod === 'THIS_MONTH' ? (language === 'SW' ? 'Mwezi Huu' : 'This Month') : (language === 'SW' ? 'Muda Wote' : 'All Time')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* GROSS REVENUE */}
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-350 uppercase tracking-widest font-black block">
                    {language === 'SW' ? '1. Mauzo Ghafi (Gross)' : '1. Gross Revenue'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {language === 'SW' 
                      ? 'Thamani ya pesa za mauzo yote yaliyokusanywa bila kutoa gharama.' 
                      : 'Total customer payment inflows before deducting expenses.'}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-black text-white font-mono leading-none">
                    {settings.currencySymbol} {activeKPIs.grossSales.toLocaleString()}
                  </h4>
                  <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                    {language === 'SW' ? 'Risiti zote:' : 'Receipts:'} <strong className="text-white font-normal">{activeKPIs.receipts}</strong>
                  </span>
                </div>
              </div>

              {/* OPERATING EXPENSES DEDUCTED */}
              <div className="bg-slate-850 p-4 rounded-xl border border-rose-900/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-rose-400 uppercase tracking-widest font-black block">
                    {language === 'SW' ? '2. Gharama za Siku (-)' : '2. Operating Expenses (-)'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {language === 'SW' 
                      ? 'Gharama za uendeshaji zilizojipunguza kwenye mauzo ya siku.' 
                      : 'Operational expenses auto-deducted from today\'s sales.'}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-black text-rose-400 font-mono leading-none">
                    -{settings.currencySymbol} {activeKPIs.expenses.toLocaleString()}
                  </h4>
                  <span className="text-[10.5px] text-rose-300/80 font-medium mt-1 block">
                    {language === 'SW' ? 'Zimeondolewa kwenye mauzo' : 'Auto-deducted from sales'}
                  </span>
                </div>
              </div>

              {/* NET REVENUE (AFTER EXPENSES) */}
              <div className="bg-slate-850 p-4 rounded-xl border border-sky-900/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-sky-400 uppercase tracking-widest font-black block">
                    {language === 'SW' ? '3. Mauzo Halisi (Net)' : '3. Net Sales'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {language === 'SW' 
                      ? 'Mauzo yaliyobaki baada ya kutoa gharama za siku husika.' 
                      : 'Sales balance remaining after deducting daily expenses.'}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-black text-sky-300 font-mono leading-none">
                    {settings.currencySymbol} {activeKPIs.sales.toLocaleString()}
                  </h4>
                  <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                    {language === 'SW' ? 'Mauzo Ghafi - Gharama' : 'Gross Sales - Expenses'}
                  </span>
                </div>
              </div>

              {/* NET PROFIT */}
              <div className="bg-slate-850 p-4 rounded-xl border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-black block text-emerald-400">
                    {language === 'SW' ? '4. Faida Halisi (Profit)' : '4. Net Profit'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {language === 'SW' 
                      ? 'Faida halisi baada ya kutoa mtaji wa bidhaa na gharama zote.' 
                      : 'Net business profit after deducting COGS and expenses.'}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-black text-emerald-400 font-mono leading-none">
                    {settings.currencySymbol} {activeKPIs.profit.toLocaleString()}
                  </h4>
                  <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                    % {language === 'SW' ? 'ya Mauzo:' : 'of Sales:'} <strong className="text-emerald-400">{activeKPIs.grossSales > 0 ? ((activeKPIs.profit / activeKPIs.grossSales) * 100).toFixed(1) : 0}%</strong>
                  </span>
                </div>
              </div>

            </div>

            {/* Ratio visual indicator bar */}
            {activeKPIs.profit > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                  <span>
                    {language === 'SW' ? 'Uwiano halisi wa Faida dhidi ya Hasara ya bidhaa (Profit-Loss Ratio):' : 'Net Profit vs Expired/Stock Loss Ratio:'}
                  </span>
                  <span>
                    {language === 'SW' ? 'Teal: Faida' : 'Teal: Net Profit'} ({((activeKPIs.profit / ((activeKPIs.profit + activeKPIs.loss) || 1)) * 100).toFixed(0)}%) | {language === 'SW' ? 'Red: Hasara' : 'Red: Written-off Loss'} ({((activeKPIs.loss / ((activeKPIs.profit + activeKPIs.loss) || 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full w-full overflow-hidden flex">
                  <div style={{ width: `${(activeKPIs.profit / ((activeKPIs.profit + activeKPIs.loss) || 1)) * 100}%` }} className="h-full bg-emerald-500"></div>
                  <div style={{ width: `${(activeKPIs.loss / ((activeKPIs.profit + activeKPIs.loss) || 1)) * 100}%` }} className="h-full bg-red-500"></div>
                </div>
              </div>
            )}
          </div>

          {/* 📈 30-DAY DAILY EXPENSE TRENDS COMPARED TO INCOME & PROFIT MARGINS (RECHARTS) */}
          <div id="recharts-trend-chart-card" className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 mb-6 shadow-sm font-sans">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-3xs">
                    <TrendingUp size={20} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-1.5">
                        {language === 'SW' ? 'Mwenendo wa Mapato na Matumizi (Overlayed Daily Trends)' : 'Overlayed Daily Income, Expense & Profit Trends'}
                      </h3>
                      <span className="text-[10.5px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                        {trendChartDays} {language === 'SW' ? 'SIKU' : 'DAYS'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      {language === 'SW' 
                        ? 'Grafu ya mistari iliyopishanishwa (Overlay) ikilinganisha mapato ya mauzo, gharama za duka na faida halisi kwa siku 30 zilizopita.' 
                        : 'Multi-line overlay visualizing daily sales revenue, operational expenses, and net profit margins over the selected period.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Horizon, Chart Type Selectors & PDF Action */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Horizon Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 shadow-3xs">
                  {[
                    { id: '30', label: language === 'SW' ? 'Siku 30' : '30 Days' },
                    { id: '14', label: language === 'SW' ? 'Siku 14' : '14 Days' },
                    { id: '7', label: language === 'SW' ? 'Siku 7' : '7 Days' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTrendChartDays(p.id as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                        trendChartDays === p.id 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Chart Style Switcher (Overlay Line vs Area vs Bar) */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 shadow-3xs">
                  <button
                    onClick={() => setTrendChartType('OVERLAY_LINE')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer select-none ${
                      trendChartType === 'OVERLAY_LINE' 
                        ? 'bg-white text-indigo-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={language === 'SW' ? 'Mistari Iliyopishanishwa (Overlay Lines)' : 'Overlay Trend Lines'}
                  >
                    <TrendingUp size={13} />
                    <span className="hidden sm:inline">{language === 'SW' ? 'Mistari' : 'Lines'}</span>
                  </button>
                  <button
                    onClick={() => setTrendChartType('AREA')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer select-none ${
                      trendChartType === 'AREA' 
                        ? 'bg-white text-indigo-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={language === 'SW' ? 'Mtiririko wa Miinuko (Area Curves)' : 'Area Curves'}
                  >
                    <Activity size={13} />
                    <span className="hidden sm:inline">{language === 'SW' ? 'Mtiririko' : 'Area'}</span>
                  </button>
                  <button
                    onClick={() => setTrendChartType('BAR')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer select-none ${
                      trendChartType === 'BAR' 
                        ? 'bg-white text-indigo-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={language === 'SW' ? 'Nguzo za Kulinganisha (Bars)' : 'Comparison Bars'}
                  >
                    <Layers size={13} />
                    <span className="hidden sm:inline">{language === 'SW' ? 'Nguzo' : 'Bars'}</span>
                  </button>
                </div>

                {/* Quick PDF button in card header */}
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer select-none"
                  title={language === 'SW' ? 'Pakua ripoti hii kama PDF' : 'Download report as PDF'}
                >
                  {isExportingPdf ? (
                    <Loader2 size={13} className="animate-spin text-indigo-300" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span className="hidden sm:inline">{language === 'SW' ? 'PDF' : 'PDF'}</span>
                </button>
              </div>
            </div>

            {/* Performance Strip with Profit Margin & Day Ratios */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4.5">
              
              {/* Total Income */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-indigo-700 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      {language === 'SW' ? 'Mapato (Gross Income)' : 'Gross Revenue'}
                    </span>
                    <ArrowUpRight size={15} />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-indigo-950 font-mono">
                    {settings.currencySymbol} {trendSummary.totalIncome.toLocaleString()}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium mt-1">
                  <span>{trendSummary.totalTx} {language === 'SW' ? 'mauzo' : 'sales'}</span>
                  <span className="text-indigo-600 font-bold">~{settings.currencySymbol}{Math.round(trendSummary.avgDailyIncome).toLocaleString()}/siku</span>
                </div>
              </div>

              {/* Total Operating Expenses */}
              <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-rose-700 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      {language === 'SW' ? 'Matumizi (Expenses)' : 'Total Expenses'}
                    </span>
                    <ArrowDownRight size={15} />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-rose-950 font-mono">
                    {settings.currencySymbol} {trendSummary.totalExpenses.toLocaleString()}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium mt-1">
                  <span>{trendSummary.totalExp} {language === 'SW' ? 'vocha' : 'vouchers'}</span>
                  <span className="text-rose-600 font-bold">~{settings.currencySymbol}{Math.round(trendSummary.avgDailyExpense).toLocaleString()}/siku</span>
                </div>
              </div>

              {/* Net Profit Margin */}
              <div className={`border rounded-xl p-3.5 flex flex-col justify-between ${
                trendSummary.isNetLoss ? 'bg-red-50/50 border-red-200 text-red-950' : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      trendSummary.isNetLoss ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      {language === 'SW' ? 'Faida Halisi (Net Profit)' : 'Net Profit'}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      trendSummary.isNetLoss ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {trendSummary.isNetLoss ? (language === 'SW' ? 'Hasara' : 'Deficit') : (language === 'SW' ? 'Faida' : 'Surplus')}
                    </span>
                  </div>
                  <h4 className={`text-base sm:text-lg font-black font-mono ${
                    trendSummary.isNetLoss ? 'text-red-700' : 'text-emerald-800'
                  }`}>
                    {trendSummary.netProfit >= 0 ? '+' : ''}{settings.currencySymbol} {trendSummary.netProfit.toLocaleString()}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  {language === 'SW' ? 'Wastani wa faida:' : 'Average net margin:'} <strong className="text-emerald-700">{trendSummary.avgProfitMargin}%</strong>
                </p>
              </div>

              {/* Profitability Performance / Win Rate */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-600 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      {language === 'SW' ? 'Siku Zenye Faida' : 'Profitable Days'}
                    </span>
                    <Percent size={14} className="text-indigo-600" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                    <span>{trendSummary.profitableDays}</span>
                    <span className="text-xs text-slate-400 font-normal">/ {expenseIncomeTrendData.length} {language === 'SW' ? 'siku' : 'days'}</span>
                  </h4>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 size={11} /> {((trendSummary.profitableDays / (expenseIncomeTrendData.length || 1)) * 100).toFixed(0)}% Faida
                  </span>
                  {trendSummary.deficitDays > 0 && (
                    <span className="text-rose-600 font-bold">
                      {trendSummary.deficitDays} {language === 'SW' ? 'siku za hasara' : 'loss days'}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Recharts Canvas */}
            <div className="h-80 w-full mt-2 select-none">
              {expenseIncomeTrendData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-450">
                  {language === 'SW' ? 'Bado hakuna data ya siku 30.' : 'No data recorded for this horizon.'}
                </div>
              ) : trendChartType === 'OVERLAY_LINE' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={expenseIncomeTrendData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overlayIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.18}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="overlayExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }} 
                      axisLine={{ stroke: '#e2e8f0' }} 
                      tickLine={false}
                      interval={trendChartDays === '30' ? 2 : trendChartDays === '14' ? 1 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]?.payload;
                          const netProfit = data?.netProfit || 0;
                          const marginPct = data?.profitMarginPct || 0;
                          const isLoss = netProfit < 0;

                          return (
                            <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-sans z-50 min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px]">
                                  {data?.fullDate}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                  isLoss ? 'bg-red-900/80 text-red-200' : 'bg-emerald-900/80 text-emerald-200'
                                }`}>
                                  {marginPct >= 0 ? '+' : ''}{marginPct}% margin
                                </span>
                              </div>

                              {/* Income Row */}
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                                  {language === 'SW' ? 'Mapato (Income)' : 'Gross Income'}:
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {settings.currencySymbol} {Number(data?.income || 0).toLocaleString()}
                                </span>
                              </div>

                              {/* Expenses Row */}
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  {language === 'SW' ? 'Matumizi (Expenses)' : 'Expenses'}:
                                </span>
                                <span className="font-mono font-bold text-rose-300">
                                  {settings.currencySymbol} {Number(data?.expenses || 0).toLocaleString()}
                                </span>
                              </div>

                              {/* Cost of Goods Sold (COGS) */}
                              {data?.cogs > 0 && (
                                <div className="flex items-center justify-between gap-4 text-[10.5px] text-slate-400">
                                  <span>{language === 'SW' ? 'Mtaji wa Bidhaa (COGS)' : 'Cost of Goods'}:</span>
                                  <span className="font-mono font-medium text-slate-300">
                                    {settings.currencySymbol} {Number(data.cogs).toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {/* Net Profit Row */}
                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                                <span className={`flex items-center gap-1.5 font-bold ${isLoss ? 'text-red-400' : 'text-emerald-300'}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${isLoss ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                  {language === 'SW' ? 'Faida Halisi (Net Profit)' : 'Net Profit'}:
                                </span>
                                <span className={`font-mono font-extrabold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {netProfit >= 0 ? '+' : ''}{settings.currencySymbol} {netProfit.toLocaleString()}
                                </span>
                              </div>

                              {/* Activity footnote */}
                              <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
                                <span>{data?.txCount || 0} {language === 'SW' ? 'mauzo' : 'sales'}</span>
                                <span>{data?.expCount || 0} {language === 'SW' ? 'vocha za matumizi' : 'expenses'}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      height={36} 
                      iconType="circle" 
                      formatter={(value) => (
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {value === 'income' 
                            ? (language === 'SW' ? 'Mapato (Income)' : 'Gross Income') 
                            : value === 'expenses' 
                              ? (language === 'SW' ? 'Matumizi (Expenses)' : 'Expenses') 
                              : (language === 'SW' ? 'Faida Halisi (Net Margin)' : 'Net Profit Margin')}
                        </span>
                      )} 
                    />
                    {/* Subtle Area gradient under income line */}
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      fill="url(#overlayIncomeGrad)" 
                      stroke="none" 
                      tooltipType="none"
                      legendType="none"
                    />
                    {/* Primary Overlay Lines */}
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      name="income"
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6.5, fill: '#4338ca', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      name="expenses"
                      stroke="#e11d48" 
                      strokeWidth={3} 
                      dot={{ r: 3, fill: '#e11d48', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6.5, fill: '#be123c', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netProfit" 
                      name="netProfit"
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 5.5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : trendChartType === 'AREA' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expenseIncomeTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }} 
                      axisLine={{ stroke: '#e2e8f0' }} 
                      tickLine={false}
                      interval={trendChartDays === '30' ? 2 : trendChartDays === '14' ? 1 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]?.payload;
                          const netProfit = data?.netProfit || 0;
                          const isLoss = netProfit < 0;

                          return (
                            <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-sans z-50 min-w-[210px]">
                              <p className="font-extrabold text-slate-200 border-b border-slate-800 pb-1.5 uppercase tracking-wider text-[11px]">
                                {data?.fullDate}
                              </p>

                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                                  {language === 'SW' ? 'Mapato (Income)' : 'Income'}:
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {settings.currencySymbol} {Number(data?.income || 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  {language === 'SW' ? 'Matumizi (Expenses)' : 'Expenses'}:
                                </span>
                                <span className="font-mono font-bold text-rose-300">
                                  {settings.currencySymbol} {Number(data?.expenses || 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                                <span className={`flex items-center gap-1.5 font-semibold ${isLoss ? 'text-red-400' : 'text-emerald-300'}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${isLoss ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                  {language === 'SW' ? 'Faida Halisi (Net)' : 'Net Margin'}:
                                </span>
                                <span className={`font-mono font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {netProfit >= 0 ? '+' : ''}{settings.currencySymbol} {netProfit.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      height={34} 
                      iconType="circle" 
                      formatter={(value) => (
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {value === 'income' 
                            ? (language === 'SW' ? 'Mapato (Income)' : 'Sales Income') 
                            : value === 'expenses' 
                              ? (language === 'SW' ? 'Matumizi (Expenses)' : 'Operating Expenses') 
                              : (language === 'SW' ? 'Faida Halisi (Net Profit)' : 'Net Profit')}
                        </span>
                      )} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name="income"
                      stroke="#4f46e5" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#incomeAreaGrad)" 
                      dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#4338ca', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      name="expenses"
                      stroke="#e11d48" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#expenseAreaGrad)" 
                      dot={{ r: 3, fill: '#e11d48', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#be123c', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netProfit" 
                      name="netProfit"
                      stroke="#10b981" 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseIncomeTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }} 
                      axisLine={{ stroke: '#e2e8f0' }} 
                      tickLine={false}
                      interval={trendChartDays === '30' ? 2 : trendChartDays === '14' ? 1 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]?.payload;
                          const netProfit = data?.netProfit || 0;
                          const isLoss = netProfit < 0;

                          return (
                            <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-sans z-50 min-w-[210px]">
                              <p className="font-extrabold text-slate-200 border-b border-slate-800 pb-1.5 uppercase tracking-wider text-[11px]">
                                {data?.fullDate}
                              </p>

                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                                  {language === 'SW' ? 'Mapato (Income)' : 'Income'}:
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {settings.currencySymbol} {Number(data?.income || 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  {language === 'SW' ? 'Matumizi (Expenses)' : 'Expenses'}:
                                </span>
                                <span className="font-mono font-bold text-rose-300">
                                  {settings.currencySymbol} {Number(data?.expenses || 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                                <span className={`flex items-center gap-1.5 font-semibold ${isLoss ? 'text-red-400' : 'text-emerald-300'}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${isLoss ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                  {language === 'SW' ? 'Faida Halisi (Net)' : 'Net Margin'}:
                                </span>
                                <span className={`font-mono font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {netProfit >= 0 ? '+' : ''}{settings.currencySymbol} {netProfit.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      height={34} 
                      iconType="circle" 
                      formatter={(value) => (
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {value === 'income' 
                            ? (language === 'SW' ? 'Mapato (Income)' : 'Sales Income') 
                            : (language === 'SW' ? 'Matumizi (Expenses)' : 'Operating Expenses')}
                        </span>
                      )} 
                    />
                    <Bar dataKey="income" name="income" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expenses" name="expenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Insights Footer with Best Margin Day and Diagnostics */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-4 flex-wrap">
                {trendSummary.bestProfitDay.amount > 0 && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-800">{language === 'SW' ? 'Faida kubwa zaidi:' : 'Best Profit Day:'}</strong> 
                    <span className="text-emerald-700 font-bold">{trendSummary.bestProfitDay.date} (+{settings.currencySymbol} {trendSummary.bestProfitDay.amount.toLocaleString()})</span>
                  </span>
                )}
                {trendSummary.peakExpense.amount > 0 && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-800">{language === 'SW' ? 'Matumizi ya juu:' : 'Peak Expense:'}</strong> 
                    <span className="text-rose-600 font-bold">{trendSummary.peakExpense.date} ({settings.currencySymbol} {trendSummary.peakExpense.amount.toLocaleString()})</span>
                  </span>
                )}
                {trendSummary.peakIncome.amount > 0 && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-800">{language === 'SW' ? 'Mauzo ya juu:' : 'Peak Revenue:'}</strong> 
                    <span className="text-indigo-600 font-bold">{trendSummary.peakIncome.date} ({settings.currencySymbol} {trendSummary.peakIncome.amount.toLocaleString()})</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] font-medium text-slate-500">
                {language === 'SW' ? 'Wastani wa siku:' : 'Daily Average:'} <span className="font-mono font-bold text-slate-800">Mapato {settings.currencySymbol} {Math.round(trendSummary.avgDailyIncome).toLocaleString()}</span> | <span className="font-mono font-bold text-rose-700">Matumizi {settings.currencySymbol} {Math.round(trendSummary.avgDailyExpense).toLocaleString()}</span> | <span className="font-mono font-bold text-emerald-700">Faida {settings.currencySymbol} {Math.round(trendSummary.avgDailyNet).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Secondary Row: Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Recharts Daily Sales Trend Column (Spans 2 cols on wide display) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-extrabold text-slate-850 text-xs uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-600" />
                    {language === 'SW' ? 'Mwenendo wa Mauzo ya Siku 7 (Daily Sales Trend)' : '7-Day Daily Sales Trend'}
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold uppercase">
                    Recharts
                  </span>
                </div>
                <p className="text-[11px] text-slate-450 mb-4 font-medium">
                  {language === 'SW' 
                    ? 'Mwenendo wa mauzo ya kila siku ya keshia na faida iliyopatikana kulingana na historia ya miamala.' 
                    : 'Visualizing daily sales totals and net profit margins over the last 7 days from transaction history.'}
                </p>
              </div>

              {/* Recharts Canvas */}
              <div className="h-64 w-full mt-1 select-none">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-450">
                    {language === 'SW' ? 'Bado hakuna takwimu! fanya mauzo.' : 'No checkout data recorded yet! Start selling.'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                        axisLine={{ stroke: '#e2e8f0' }} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0]?.payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-sans z-50">
                                <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1 uppercase tracking-wider text-[11px]">
                                  {label} ({data?.dateString})
                                </p>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                                    {language === 'SW' ? 'Mauzo' : 'Sales'}:
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    {settings.currencySymbol} {Number(data?.sales || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                    {language === 'SW' ? 'Faida' : 'Profit'}:
                                  </span>
                                  <span className="font-mono font-bold text-emerald-400">
                                    {settings.currencySymbol} {Number(data?.profit || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        height={32} 
                        iconType="circle" 
                        formatter={(value) => (
                          <span className="text-xs font-bold text-slate-700 ml-1">
                            {value === 'sales' ? (language === 'SW' ? 'Mauzo (Sales)' : 'Sales Revenue') : (language === 'SW' ? 'Faida (Profit)' : 'Net Profit')}
                          </span>
                        )} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        name="sales"
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }} 
                        activeDot={{ r: 7, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        name="profit"
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        strokeDasharray="4 4"
                        dot={{ r: 3.5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                        activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Cash flow payment breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between font-sans">
              <div>
                <h4 className="font-extrabold text-slate-855 text-xs uppercase tracking-wide mb-1.5">
                  {language === 'SW' ? 'Mzunguko kwa Njia ya Malipo' : 'Cash Flow by Payment Method'}
                </h4>
                <p className="text-[11px] text-slate-450 mb-3.5 leading-relaxed">
                  {language === 'SW' 
                    ? 'Mkusanyiko wa mauzo ya kipindi kulingana na vituo vya risiti duka sasa.' 
                    : 'Distribution of gross sales revenue across all active checkout channels.'}
                </p>
              </div>

              <div id="payment-methods-breakdown" className="space-y-2.5 flex-grow justify-center flex flex-col">
                {[
                  { label: language === 'SW' ? 'Pesa Taslimu (Cash)' : 'Cash', val: activeKPIs.cashFlow.CASH, color: 'bg-slate-805' },
                  { label: 'Vodacom M-Pesa', val: activeKPIs.cashFlow.M_PESA, color: 'bg-red-500' },
                  { label: 'Tigo Pesa', val: activeKPIs.cashFlow.TIGO_PESA, color: 'bg-blue-600' },
                  { label: language === 'SW' ? 'Kadi (Bank Card)' : 'Bank Card', val: activeKPIs.cashFlow.CARD, color: 'bg-indigo-600' },
                  { label: language === 'SW' ? 'Mikopo ya Wateja' : 'Customer Credit (Debt)', val: activeKPIs.cashFlow.CREDIT, color: 'bg-amber-600' },
                  { label: language === 'SW' ? 'Nyingine za Simu' : 'Other Mobile Money', val: activeKPIs.cashFlow.AIRTEL_MONEY + activeKPIs.cashFlow.HALOPESA, color: 'bg-purple-600' }
                ].map((m, i) => {
                  const pct = activeKPIs.sales > 0 ? (m.val / activeKPIs.sales) * 100 : 0;

                  return (
                    <div key={i} className="text-xs space-y-1">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-705 truncate max-w-[150px]">{m.label}</span>
                        <span className="font-bold text-slate-900 font-mono">{settings.currencySymbol} {m.val.toLocaleString()} ({pct.toFixed(0)}%)</span>
                      </div>
                      
                      <div className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${m.color}`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Third Row: Best sellers with critical alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top 5 Best Sellers Column */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4.5 border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-850 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Award size={15} className="text-amber-500" />
                  {language === 'SW' ? 'Bidhaa Zinazouza Sana (Best Sellers)' : 'Best Selling Products'}
                </h4>
                <span className="text-[10px] text-slate-400 font-bold font-mono">TOP 5 ITEMS</span>
              </div>

              <div className="space-y-3.5 text-xs font-sans">
                {bestSellers.length === 0 ? (
                  <p className="text-slate-450 italic py-6 text-center">
                    {language === 'SW' ? 'Bado hakuna mauzo ya kukokotoa bidhaa bora.' : 'No sales transactions recorded yet.'}
                  </p>
                ) : (
                  bestSellers.map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5.5 h-5.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-slate-905 truncate max-w-[150px] sm:max-w-xs">{item.product.name}</h5>
                          <p className="text-[10.5px] text-slate-455 mt-0.5">
                            {item.qtySold} {language === 'SW' ? 'vipande viliuzwa' : 'units sold'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap font-mono">
                        <span className="font-black text-slate-900 block">{settings.currencySymbol} {item.revenueGained.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Critical Low Stock Column */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-855 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-red-500 animate-pulse" />
                    {language === 'SW' ? 'Hisa Inayokaribia Kwisha (Low Stock Alerts)' : 'Low Stock Alerts'}
                  </h4>
                  <span className="text-[11px] font-black text-red-600 bg-red-55 px-2 py-0.5 rounded">
                    {language === 'SW' ? 'Dharura!' : 'Warning!'}
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-normal">
                  {lowStockItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                      <CheckCircle size={28} className="text-emerald-500 mb-1" />
                      <p className="text-xs">
                        {language === 'SW' ? 'Mambo safi! Bidhaa zote zina hisa za kutosha kwa sasa.' : 'All good! All products have healthy stock levels.'}
                      </p>
                    </div>
                  ) : (
                    lowStockItems.map(p => {
                      const outOfStock = p.stock === 0;

                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-1.5 border border-slate-50 hover:bg-slate-50/50 rounded-lg transition duration-200">
                          <div>
                            <h5 className="font-bold text-slate-900">{p.name}</h5>
                            <p className="text-[10.5px] text-slate-450 mt-0.5">
                              {language === 'SW' ? 'Kiwango cha usalama:' : 'Min Threshold:'} {p.minStock} units
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`font-mono font-black px-2 py-0.5 rounded text-[11px] block ${
                              outOfStock
                                ? 'bg-red-105 text-red-800 bg-red-100'
                                : 'bg-amber-105 text-amber-800 bg-amber-100'
                            }`}>
                              {outOfStock ? (language === 'SW' ? 'Tupu (0 Qty)' : 'Out of Stock (0)') : `${p.stock} units`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {lowStockItems.length > 0 && (
                <button
                  id="lowstock-navigate-btn"
                  onClick={onNavigateToInventory}
                  className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-205 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {language === 'SW' ? 'Nenda Kwenye Stoo Kuongeza Bidhaa' : 'Go to Inventory & Restock'}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

          </div>
        </>
      ) : activeReportTab === 'CREDIT_ITEMS' ? (
        /* RENDER CREDIT ITEMS & UNPAID MERCHANDISE REPORT TAB ("Vitu vilivyouzwa kwa mkopo") */
        <div className="space-y-5 font-sans">
          
          {/* Main Card Container */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            
            {/* Header & Description */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3.5 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Coins size={18} />
                  </div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                    {language === 'SW' ? 'Taarifa ya Vitu Vilivyouzwa kwa Mkopo (Credit Sales & Items)' : 'Items Sold on Credit & Debts Ledger'}
                  </h3>
                </div>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-normal">
                  {language === 'SW'
                    ? 'Orodha maalum ya bidhaa zote zilizotolewa kwa wateja kwa mkopo. Mikopo hii haijumuishwi kwenye mauzo ya siku hiyo hadi itakapolipwa.'
                    : 'Detailed record of all inventory issued on credit. These remain decoupled from realized daily sales until customer payments are received.'}
                </p>
              </div>

              {/* Action Buttons & Counter */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportCreditItemsCsv}
                  disabled={filteredCreditItems.length === 0}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer select-none"
                  title={language === 'SW' ? 'Pakua Excel/CSV ya vitu vya mkopo' : 'Export Credit Items to Excel/CSV'}
                >
                  <FileSpreadsheet size={15} />
                  <span>{language === 'SW' ? 'Pakua Excel (CSV)' : 'Export CSV'}</span>
                </button>
                <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
                  {filteredCreditItems.length} {language === 'SW' ? 'vitu' : 'items'}
                </div>
              </div>
            </div>

            {/* Accounting Rule Clarification Notice Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 mb-5 flex items-start gap-3">
              <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="font-extrabold block text-amber-950 mb-0.5">
                  {language === 'SW' ? 'Kanuni ya Uhasibu wa Mauzo (Sales & Credit Accounting Rule):' : 'Revenue Recognition Principle:'}
                </strong>
                {language === 'SW' 
                  ? 'Vitu vilivyouzwa kwa mkopo HAVIJALIKIZWA wala kujumlishwa kwenye jumla ya mauzo ya siku husika (Realized Daily Sales). Thamani yake hubaki kama deni la mteja. Mteja anapofanya malipo (Marejesho), kiasi alicholipa huingizwa moja kwa moja kama mauzo halisi ya tarehe ya malipo hayo.'
                  : 'Items sold on credit are strictly excluded from the date\'s realized daily sales. Their value is held in accounts receivable. Once the customer submits payments, the settled amount is synchronized directly into that specific payment date\'s revenue.'}
              </div>
            </div>

            {/* Scorecard Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
              
              {/* Gross Credit Value */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {language === 'SW' ? 'Thamani ya Vitu vya Mkopo' : 'Gross Credit Items Value'}
                </span>
                <h4 className="text-base font-black text-slate-900 font-mono mt-1">
                  {settings.currencySymbol} {creditSummaryStats.totalGrossValue.toLocaleString()}
                </h4>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {creditSummaryStats.totalUnits} {language === 'SW' ? 'vipande kwa jumla' : 'total units'}
                </span>
              </div>

              {/* Outstanding Debts */}
              <div className="bg-red-50/50 border border-red-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-black text-red-800 uppercase tracking-wider block">
                  {language === 'SW' ? 'Salio Linalodaiwa Sasa' : 'Current Unpaid Balance'}
                </span>
                <h4 className="text-base font-black text-red-700 font-mono mt-1">
                  {settings.currencySymbol} {creditSummaryStats.activeTotalDebtBalance.toLocaleString()}
                </h4>
                <span className="text-[10px] text-red-600 mt-0.5 block font-bold">
                  {creditSummaryStats.unpaidCount + creditSummaryStats.overdueCount} {language === 'SW' ? 'rekodi zinazodaiwa' : 'pending debts'}
                </span>
              </div>

              {/* Repayments Collected */}
              <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                  {language === 'SW' ? 'Madeni Yaliyolipwa / Rejeshwa' : 'Repayments Collected'}
                </span>
                <h4 className="text-base font-black text-emerald-700 font-mono mt-1">
                  {settings.currencySymbol} {creditSummaryStats.totalRepaymentsCollected.toLocaleString()}
                </h4>
                <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                  {language === 'SW' ? 'Imeingizwa kwenye mauzo halisi' : 'Synchronized to realized sales'}
                </span>
              </div>

              {/* Items Count by Status */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {language === 'SW' ? 'Hali za Madeni' : 'Debt Statuses'}
                </span>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    {creditSummaryStats.unpaidCount} {language === 'SW' ? 'Inadaiwa' : 'Unpaid'}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    {creditSummaryStats.settledCount} {language === 'SW' ? 'Imelipwa' : 'Paid'}
                  </span>
                  {creditSummaryStats.overdueCount > 0 && (
                    <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      {creditSummaryStats.overdueCount} {language === 'SW' ? 'Imechelewa' : 'Overdue'}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Filters Bar Row */}
            <div className="flex flex-col lg:flex-row items-center gap-3 mb-5 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              
              {/* Search items field */}
              <div className="relative flex-1 w-full font-sans">
                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder={language === 'SW' ? "Tafuta bidhaa, mteja, namba ya simu, risiti, keshia..." : "Search item, customer, phone, receipt ref, cashier..."}
                  className="w-full pl-8.5 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800 text-xs h-9 shadow-3xs"
                  value={creditSearchQuery}
                  onChange={e => setCreditSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none h-9 w-full sm:w-[150px] shadow-3xs font-extrabold cursor-pointer"
                  value={creditStatusFilter}
                  onChange={e => setCreditStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">{language === 'SW' ? 'Hali Zote (All)' : 'All Statuses'}</option>
                  <option value="UNPAID">{language === 'SW' ? 'Inadaiwa (Unpaid)' : 'Unpaid'}</option>
                  <option value="PARTIAL">{language === 'SW' ? 'Inalipwa Kidogo' : 'Partially Paid'}</option>
                  <option value="SETTLED">{language === 'SW' ? 'Imelipwa Yote' : 'Fully Settled'}</option>
                  <option value="OVERDUE">{language === 'SW' ? 'Imechelewa (Overdue)' : 'Overdue'}</option>
                </select>
              </div>

              {/* Period Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none h-9 w-full sm:w-[140px] shadow-3xs font-extrabold cursor-pointer"
                  value={creditPeriodFilter}
                  onChange={e => setCreditPeriodFilter(e.target.value as any)}
                >
                  <option value="ALL">{language === 'SW' ? 'Muda Wote' : 'All Time'}</option>
                  <option value="TODAY">{language === 'SW' ? 'Leo Pekee' : 'Today'}</option>
                  <option value="THIS_MONTH">{language === 'SW' ? 'Mwezi Huu' : 'This Month'}</option>
                </select>
              </div>

              {/* Cashier selection filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none h-9 w-full sm:w-[140px] shadow-3xs font-extrabold cursor-pointer"
                  value={creditCashierFilter}
                  onChange={e => setCreditCashierFilter(e.target.value)}
                >
                  <option value="ALL">{language === 'SW' ? 'Wauzaji Wote' : 'All Cashiers'}</option>
                  {uniqueCashiers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Table of Credit Items */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs bg-white">
              {filteredCreditItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs flex flex-col items-center justify-center gap-2">
                  <Package size={28} className="text-slate-300" />
                  <span>{language === 'SW' ? 'Hakuna bidhaa za mkopo zilizopatikana kwenye vigezo hivi.' : 'No credit items found matching your filters.'}</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">
                      <th className="py-3 px-3.5">{language === 'SW' ? 'Tarehe na Saa' : 'Date & Time'}</th>
                      <th className="py-3 px-3">{language === 'SW' ? 'Bidhaa na Idadi' : 'Product & Qty'}</th>
                      <th className="py-3 px-3 text-right">{language === 'SW' ? 'Bei ya Kuuzia' : 'Unit Price'}</th>
                      <th className="py-3 px-3 text-right">{language === 'SW' ? 'Thamani ya Mkopo' : 'Credit Value'}</th>
                      <th className="py-3 px-3">{language === 'SW' ? 'Mteja (Mkopaji)' : 'Debtor / Customer'}</th>
                      <th className="py-3 px-3">{language === 'SW' ? 'Keshia' : 'Staff'}</th>
                      <th className="py-3 px-3 text-center">{language === 'SW' ? 'Risiti' : 'Receipt'}</th>
                      <th className="py-3 px-3 text-right">{language === 'SW' ? 'Awali / Salio' : 'Down / Balance'}</th>
                      <th className="py-3 px-3.5 text-center">{language === 'SW' ? 'Hali ya Deni' : 'Debt Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium font-sans">
                    {filteredCreditItems.map((item, idx) => (
                      <tr key={item.txId + '-' + item.productId + '-' + idx} className="hover:bg-amber-50/30 transition">
                        
                        {/* Timestamp */}
                        <td className="py-3 px-3.5 text-slate-500 font-mono text-[10.5px] whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleString(language === 'SW' ? 'sw-TZ' : 'en-US')}
                        </td>

                        {/* Product & Qty */}
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900 block">{item.productName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} {language === 'SW' ? 'vipande' : 'units'} • {item.categoryName}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {settings.currencySymbol} {item.unitPrice.toLocaleString()}
                        </td>

                        {/* Total Item Value */}
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-900 whitespace-nowrap">
                          {settings.currencySymbol} {item.totalItemValue.toLocaleString()}
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{item.customerName}</span>
                          {item.customerPhone !== '-' && (
                            <span className="text-[10px] text-slate-400 font-mono">{item.customerPhone}</span>
                          )}
                        </td>

                        {/* Cashier */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <User size={10} className="text-slate-400" />
                            {item.cashierName}
                          </span>
                        </td>

                        {/* Receipt */}
                        <td className="py-3 px-3 text-center font-mono text-[10.5px] font-bold text-slate-500">
                          {item.receiptNumber}
                        </td>

                        {/* Down Payment & Remaining Balance */}
                        <td className="py-3 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                          {item.receivedDownPayment > 0 ? (
                            <div>
                              <span className="text-emerald-700 font-bold block text-[10px]">
                                {language === 'SW' ? 'Awali:' : 'Paid:'} {settings.currencySymbol} {item.receivedDownPayment.toLocaleString()}
                              </span>
                              <span className="text-red-700 font-black">
                                {language === 'SW' ? 'Salio:' : 'Bal:'} {settings.currencySymbol} {item.customerCurrentDebt.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-red-700 font-black">
                              {settings.currencySymbol} {item.customerCurrentDebt.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase inline-flex items-center gap-1 ${
                            item.status === 'SETTLED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : item.status === 'PARTIAL'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300/60'
                          }`}>
                            {item.status === 'SETTLED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {item.statusLabel}
                          </span>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>
      ) : activeReportTab === 'CASHIER_ITEMS' ? (
        /* RENDER ITEM-CASHIER REPORT TAB ("report ya user yupi ndo ameuza kitu flani") */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3.5 mb-4">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users size={16} className="text-slate-700" />
                {language === 'SW' ? 'Audit Trail ya Wafanyakazi (Who Sold What?)' : 'Staff Sales Log (Who Sold What?)'}
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1 leading-normal">
                {language === 'SW' 
                  ? 'Uchambuzi maalum wa maisha halisi ya duka kukuonyesha ni bidhaa ipi imeuzwa na keshia yupi, kwa risiti ipi na kwa mfumo upi wa kupokelea malipo.' 
                  : 'Real-time staff checkout logs tracking exactly which item was sold by whom, on which receipt, and under what payment method.'}
              </p>
            </div>
            
            <div className="bg-slate-100 px-3 py-1 rounded-lg text-[10.5px] font-mono text-slate-650 font-black border border-slate-200/55 whitespace-nowrap shrink-0">
              {language === 'SW' ? 'Mistari:' : 'Logs:'} {filteredItemizedSales.length} {language === 'SW' ? 'iliyopatikana' : 'found'}
            </div>
          </div>

          {/* Filters Bar Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-5 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-3xs">
            
            {/* Search items field */}
            <div className="relative flex-1 w-full font-sans">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder={language === 'SW' ? "Tafuta jina la bidhaa, au namba ya risiti (Mchele, PM-XX)..." : "Search product name or receipt number..."}
                className="w-full pl-8.5 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-855 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-805 text-xs h-9 shadow-3xs"
                value={itemSearchQuery}
                onChange={e => setItemSearchQuery(e.target.value)}
              />
            </div>

            {/* Cashier selection dropdown filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <Filter size={13} className="text-slate-405" />
              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 h-9 w-full sm:w-[180px] shadow-3xs font-extrabold cursor-pointer"
                value={selectedCashier}
                onChange={e => setSelectedCashier(e.target.value)}
              >
                <option value="all">{language === 'SW' ? 'Keshia Wote (All Cashiers)' : 'All Staff Members'}</option>
                {uniqueCashiers.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Itemized list table */}
          <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-3xs bg-white">
            {filteredItemizedSales.length === 0 ? (
              <div className="p-12 text-center text-slate-450 italic text-xs flex flex-col items-center justify-center gap-2">
                <Search size={24} className="text-slate-300" />
                <span>{language === 'SW' ? 'Hakuna mauzo ya bidhaa yaliyopatikana kwa keshia na neno-siri hili kwa sasa.' : 'No checkout items matched your search filters.'}</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-3.5">{language === 'SW' ? 'Tarehe na Saa' : 'Date & Time'}</th>
                    <th className="py-3 px-3">{language === 'SW' ? 'Muuzaji (Keshia)' : 'Sold By (Staff)'}</th>
                    <th className="py-3 px-3">{language === 'SW' ? 'Bidhaa na Idadi ya kizio' : 'Product & Qty'}</th>
                    <th className="py-3 px-3 text-right">{language === 'SW' ? 'Bei ya Kuuzia' : 'Unit Price'}</th>
                    <th className="py-3 px-3 text-right">{language === 'SW' ? 'Thamani ya Mauzo' : 'Total Revenue'}</th>
                    <th className="py-3 px-3 text-center">{language === 'SW' ? 'Njia ya Malipo' : 'Payment Mode'}</th>
                    <th className="py-3 px-4 text-center">{language === 'SW' ? 'Risiti Kielezo' : 'Receipt Ref'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705 text-xs font-medium font-sans">
                  {filteredItemizedSales.map((sale, i) => {
                    return (
                      <tr key={sale.txId + '-' + i} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3.5 text-slate-500 font-mono text-[10.5px]">
                          {new Date(sale.timestamp).toLocaleString(language === 'SW' ? 'sw-TZ' : 'en-US')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-755 font-bold px-2 py-0.5 rounded-full text-[10.5px]">
                            <User size={10} className="text-slate-500" />
                            {sale.cashierName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {sale.productName} <span className="text-slate-500 font-normal font-mono ml-1">x {sale.quantity}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-550">
                          {settings.currencySymbol} {sale.sellingPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-xs">
                          {settings.currencySymbol} {sale.totalValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block font-sans ${
                            sale.paymentMethod === 'CASH'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : sale.paymentMethod === 'CREDIT'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200/50'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/40'
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px] font-black text-slate-500">
                          {sale.receiptNumber}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeReportTab === 'TRANSACTIONS_REPORT' ? (
        /* RENDER TRANSACTION REPORTS GENERATOR TAB */
        <TransactionReportsView state={state} language={language} />
      ) : activeReportTab === 'FINANCIAL_POSITION' ? (
        /* RENDER FINANCIAL POSITION TAB */
        <FinancialPositionView state={state} language={language} />
      ) : activeReportTab === 'PROFIT_LOSS' ? (
        /* RENDER STATEMENT OF PROFIT OR LOSS TAB */
        <ProfitOrLossStatementView state={state} language={language} />
      ) : (
        /* RENDER TAX_ENGINE TAB */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
          {/* Inputs Panel (Left) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Scale size={16} className="text-sky-600" />
              {language === 'SW' ? 'Ingiza Data za Kodi (TRA Inputs)' : 'TRA Tax Estimator Inputs'}
            </h3>

            <div className="space-y-4">
              {/* Turnover */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  {language === 'SW' ? 'Mauzo Ghafi ya Mwaka (Annual Turnover - TZS)' : 'Annual Turnover (Gross Sales - TZS)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">TZS</span>
                  <input
                    type="number"
                    value={taxTurnover}
                    onChange={(e) => setTaxTurnover(e.target.value)}
                    placeholder={language === 'SW' ? "Weka mauzo ghafi..." : "Enter annual gross sales..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-800 focus:bg-white transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {language === 'SW' ? 'Jumla ya mauzo yote ya mwaka kabla ya kutoa matumizi.' : 'Total aggregate gross sales before deducting any operating costs or purchases.'}
                </p>
              </div>

              {/* Expenses */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  {language === 'SW' ? 'Matumizi ya Mwaka (Annual Expenses - TZS)' : 'Annual Expenses (Costs - TZS)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">TZS</span>
                  <input
                    type="number"
                    value={taxExpenses}
                    onChange={(e) => setTaxExpenses(e.target.value)}
                    placeholder={language === 'SW' ? "Weka matumizi ya mwaka..." : "Enter annual operating expenses..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-800 focus:bg-white transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {language === 'SW' ? 'Jumla ya gharama zote za uendeshaji wa biashara kwa mwaka.' : 'Total operating expenses, salaries, rent, and inventory purchase costs per annum.'}
                </p>
              </div>

              {/* Keep Records Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    {language === 'SW' ? 'Unatunza Vitabu/Kumbukumbu?' : 'Do you keep standard accounting books?'}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {language === 'SW' ? 'Kushikilia rekodi huathiri kiwango cha kodi' : 'Keeping audit trails reduces presumptive tax rates significantly'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTaxKeepsRecords(!taxKeepsRecords)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-250 ${
                    taxKeepsRecords ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                      taxKeepsRecords ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Brief Tra Banner */}
              <div className="bg-sky-50/50 rounded-xl p-3.5 border border-sky-100 flex items-start gap-2.5">
                <Info size={16} className="text-sky-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-sky-850 leading-relaxed">
                  <strong className="block font-extrabold mb-0.5">
                    {language === 'SW' ? 'Kuhusu Sheria za Kodi za TRA:' : 'About TRA Tanzanian Tax Guidelines:'}
                  </strong>
                  {language === 'SW' 
                    ? 'Mifumo ya kodi nchini Tanzania inasimamiwa na Mamlaka ya Mapato (TRA). Kwa mujibu wa sheria za sasa, biashara zenye mauzo yasiyozidi milioni 200 kwa mwaka zinatozwa Kodi ya Makadirio (Presumptive Tax). Biashara kubwa na makampuni yanatozwa Corporate Tax ya 30% kwenye faida.'
                    : 'Tax structures in Tanzania are regulated by the Tanzania Revenue Authority (TRA). Businesses with a turnover of less than TZS 200 Million per year are eligible for Presumptive Tax rates. Businesses exceeding TZS 200 Million are assessed corporate income tax at 30% of net profits.'}
                </div>
              </div>
            </div>
          </div>

          {/* Results Explanations (Right) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Main Verdict Summary Box */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-6 -translate-y-6">
                <Scale size={240} className="text-white" />
              </div>

              <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 font-black px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider inline-block mb-3">
                {taxCalculations.recommendedTaxRegime === 'CORPORATE_TAX_REGIME' ? 'Corporate Tax Regime' : 'Presumptive Tax Regime'}
              </span>

              <h4 className="text-xs text-slate-405 font-bold uppercase tracking-wider">
                {language === 'SW' ? 'Kadirio la Jumla ya Kodi ya Mwaka (Total Tax)' : 'Estimated Annual Tax Liability (Total Tax)'}
              </h4>
              <div className="flex items-baseline gap-2 mt-1 mb-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {settings.currencySymbol} {taxCalculations.totalTaxLiability.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400">
                  {language === 'SW' ? 'kwa mwaka' : 'per year'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3.5 text-center">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">
                    {language === 'SW' ? 'Mauzo Ghafi' : 'Annual Turnover'}
                  </span>
                  <span className="block text-xs font-bold font-mono mt-0.5 text-slate-100">{settings.currencySymbol} {taxCalculations.turnover.toLocaleString()}</span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="block text-[10px] text-slate-400 uppercase">
                    {language === 'SW' ? 'Matumizi' : 'Operating Expenses'}
                  </span>
                  <span className="block text-xs font-bold font-mono mt-0.5 text-slate-100">{settings.currencySymbol} {taxCalculations.expenses.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">
                    {language === 'SW' ? 'Faida Halisi' : 'Net Profit'}
                  </span>
                  <span className="block text-xs font-bold font-mono mt-0.5 text-emerald-400">{settings.currencySymbol} {taxCalculations.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Individual Tax Components Details */}
            <div className="space-y-4">
              {/* Presumptive Tax Result */}
              <div className={`bg-white border rounded-xl p-4.5 shadow-3xs hover:border-slate-300/80 transition ${
                taxCalculations.recommendedTaxRegime === 'PRESUMPTIVE_TAX_REGIME' ? 'border-l-4 border-l-emerald-500' : 'opacity-70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <Scale size={14} className="text-emerald-500" />
                    {language === 'SW' ? 'Kodi ya Makadirio (Presumptive Tax)' : 'Presumptive Income Tax'}
                    {taxCalculations.recommendedTaxRegime === 'PRESUMPTIVE_TAX_REGIME' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        {language === 'SW' ? 'Kundi Lako' : 'Your Regime'}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {settings.currencySymbol} {taxCalculations.presumptiveTax.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  {taxCalculations.presumptiveTax.explanation}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'SW' ? 'Kifungu cha Sheria:' : 'Legal Reference:'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    <ShieldCheck size={10} />
                    {taxCalculations.presumptiveTax.legalReference}
                  </span>
                </div>
              </div>

              {/* Corporate Tax Result */}
              <div className={`bg-white border rounded-xl p-4.5 shadow-3xs hover:border-slate-300/80 transition ${
                taxCalculations.recommendedTaxRegime === 'CORPORATE_TAX_REGIME' ? 'border-l-4 border-l-sky-500' : 'opacity-70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <TrendingUp size={14} className="text-sky-500" />
                    {language === 'SW' ? 'Kodi ya Mapato ya Kampuni (Corporate Tax - 30%)' : 'Corporate Income Tax (30%)'}
                    {taxCalculations.recommendedTaxRegime === 'CORPORATE_TAX_REGIME' && (
                      <span className="bg-sky-100 text-sky-800 text-[8.5px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        {language === 'SW' ? 'Kundi Lako' : 'Your Regime'}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {settings.currencySymbol} {taxCalculations.corporateTax.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  {taxCalculations.corporateTax.explanation}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'SW' ? 'Kifungu cha Sheria:' : 'Legal Reference:'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    <ShieldCheck size={10} />
                    {taxCalculations.corporateTax.legalReference}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
