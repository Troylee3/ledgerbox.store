import React, { useState, useMemo } from 'react';
import { DbState, Expense, ExpenseCategory, PaymentMethod } from '../types';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  Trash2, 
  Edit, 
  FileSpreadsheet, 
  Printer, 
  Sliders, 
  Zap, 
  Truck, 
  Home, 
  Users, 
  User,
  ShoppingBag, 
  Coffee, 
  Wrench, 
  FileText, 
  CheckCircle2, 
  AlertOctagon, 
  Sparkles, 
  HelpCircle,
  Lightbulb,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Download,
  Percent,
  UserCheck,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  FileDown
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { useLanguage } from '../lib/translations';

interface ExpensesViewProps {
  state: DbState;
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt'>) => Expense | undefined;
  updateExpense: (exp: Expense) => void;
  deleteExpense: (id: string) => void;
  updateSettings: (settings: Partial<DbState['settings']>) => void;
}

export const CATEGORY_CONFIG: Record<ExpenseCategory, { 
  labelSw: string; 
  labelEn: string; 
  icon: any; 
  color: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
}> = {
  RENT: { 
    labelSw: 'Kodi ya Pango', 
    labelEn: 'Store Rent', 
    icon: Home, 
    color: 'text-purple-600', 
    badgeBg: 'bg-purple-100', 
    badgeText: 'text-purple-800 border-purple-200',
    barColor: '#9333ea'
  },
  SALARIES: { 
    labelSw: 'Mishahara & Vibaruwa', 
    labelEn: 'Salaries & Wages', 
    icon: Users, 
    color: 'text-blue-600', 
    badgeBg: 'bg-blue-100', 
    badgeText: 'text-blue-800 border-blue-200',
    barColor: '#2563eb'
  },
  UTILITIES: { 
    labelSw: 'LUKU (Umeme) & Maji', 
    labelEn: 'Electricity & Water', 
    icon: Zap, 
    color: 'text-amber-600', 
    badgeBg: 'bg-amber-100', 
    badgeText: 'text-amber-800 border-amber-200',
    barColor: '#d97706'
  },
  TRANSPORT: { 
    labelSw: 'Usafiri & Mizigo', 
    labelEn: 'Transport & Freight', 
    icon: Truck, 
    color: 'text-emerald-600', 
    badgeBg: 'bg-emerald-100', 
    badgeText: 'text-emerald-800 border-emerald-200',
    barColor: '#059669'
  },
  PACKAGING: { 
    labelSw: 'Mifuko & Vifungashio', 
    labelEn: 'Bags & Packaging', 
    icon: ShoppingBag, 
    color: 'text-teal-600', 
    badgeBg: 'bg-teal-100', 
    badgeText: 'text-teal-800 border-teal-200',
    barColor: '#0d9488'
  },
  MEALS: { 
    labelSw: 'Chakula & Posho', 
    labelEn: 'Meals & Refreshments', 
    icon: Coffee, 
    color: 'text-rose-600', 
    badgeBg: 'bg-rose-100', 
    badgeText: 'text-rose-800 border-rose-200',
    barColor: '#e11d48'
  },
  MARKETING: { 
    labelSw: 'Matangazo & Masoko', 
    labelEn: 'Marketing & Ads', 
    icon: Sparkles, 
    color: 'text-pink-600', 
    badgeBg: 'bg-pink-100', 
    badgeText: 'text-pink-800 border-pink-200',
    barColor: '#db2777'
  },
  MAINTENANCE: { 
    labelSw: 'Ukarabati & Matengenezo', 
    labelEn: 'Repairs & Maintenance', 
    icon: Wrench, 
    color: 'text-orange-600', 
    badgeBg: 'bg-orange-100', 
    badgeText: 'text-orange-800 border-orange-200',
    barColor: '#ea580c'
  },
  TAX_PERMITS: { 
    labelSw: 'Leseni & Vibali', 
    labelEn: 'Licenses & Permits', 
    icon: FileText, 
    color: 'text-indigo-600', 
    badgeBg: 'bg-indigo-100', 
    badgeText: 'text-indigo-800 border-indigo-200',
    barColor: '#4f46e5'
  },
  SUPPLIES: { 
    labelSw: 'Vifaa vya Duka/Ofisi', 
    labelEn: 'Shop Supplies', 
    icon: ShoppingBag, 
    color: 'text-cyan-600', 
    badgeBg: 'bg-cyan-100', 
    badgeText: 'text-cyan-800 border-cyan-200',
    barColor: '#0891b2'
  },
  OTHER: { 
    labelSw: 'Matumizi Mengineyo', 
    labelEn: 'Other Miscellaneous', 
    icon: HelpCircle, 
    color: 'text-slate-600', 
    badgeBg: 'bg-slate-100', 
    badgeText: 'text-slate-800 border-slate-200',
    barColor: '#64748b'
  }
};

const SUGGESTED_EXPENSE_TITLES = [
  'Kodi ya Pango (Mwezi Huu)',
  'LUKU Umeme wa Duka',
  'Nauli ya Mzigo Kariakoo',
  'Mshahara wa Mhudumu',
  'Mifuko ya Karatasi ya Wateja',
  'Maji ya Kunywa & Usafi',
  'Chai & Posho ya Wafanyakazi',
  'Matengenezo ya Friji / Rafu',
  'Leseni ya Biashara (Halmashauri)'
];

export default function ExpensesView({
  state,
  addExpense,
  updateExpense,
  deleteExpense,
  updateSettings
}: ExpensesViewProps) {
  const { language } = useLanguage();
  const currency = state.settings.currencySymbol || 'TSh';
  const expenses = state.expenses || [];
  const transactions = state.transactions || [];

  // Filter States
  const [activeTab, setActiveTab] = useState<'LIST' | 'USER_REPORT'>('LIST');
  const [timePeriod, setTimePeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL_TIME'>('THIS_MONTH');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedStaffCards, setExpandedStaffCards] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<Expense | null>(null);

  // Active cashier
  const currentCashierName = state.currentUser?.name || 'Msimamizi (Admin)';

  // Add/Edit Form state
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('RENT');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('CASH');
  const [formRecordedBy, setFormRecordedBy] = useState<string>(currentCashierName);
  const [formReceiptRef, setFormReceiptRef] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsRecurring, setFormIsRecurring] = useState<boolean>(false);

  // Budget settings form
  const [budgetAmount, setBudgetAmount] = useState<string>(() => 
    (state.settings.monthlyExpenseBudget || 250000).toString()
  );
  const [maxRatioThreshold, setMaxRatioThreshold] = useState<string>(() => 
    (state.settings.maxExpenseRatioThreshold || 35).toString()
  );

  // All known staff members from database & historical expenses
  const allKnownStaffNames = useMemo(() => {
    const namesSet = new Set<string>();
    if (state.currentUser?.name) namesSet.add(state.currentUser.name);
    (state.users || []).forEach(u => {
      if (u.name) namesSet.add(u.name);
    });
    expenses.forEach(e => {
      if (e.recordedBy) namesSet.add(e.recordedBy);
    });
    if (namesSet.size === 0) namesSet.add('Msimamizi (Admin)');
    return Array.from(namesSet);
  }, [state.users, state.currentUser, expenses]);

  // Calculate Date Ranges
  const dateRangeFiltered = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Start of week (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return {
      isMatching: (dateStr: string) => {
        const itemDate = new Date(dateStr);
        if (isNaN(itemDate.getTime())) return false;

        if (timePeriod === 'TODAY') {
          return dateStr.startsWith(todayStr);
        }
        if (timePeriod === 'THIS_WEEK') {
          return itemDate >= startOfWeek;
        }
        if (timePeriod === 'THIS_MONTH') {
          return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
        }
        if (timePeriod === 'THIS_YEAR') {
          return itemDate.getFullYear() === currentYear;
        }
        return true; // ALL_TIME
      },
      currentMonthStr: `${now.toLocaleString(language === 'SW' ? 'sw-TZ' : 'en-US', { month: 'long' })} ${currentYear}`
    };
  }, [timePeriod, language]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Time Filter
      if (!dateRangeFiltered.isMatching(exp.date)) return false;

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) return false;

      // 3. Staff / User Filter
      if (selectedStaff !== 'ALL' && exp.recordedBy !== selectedStaff) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catConfig = CATEGORY_CONFIG[exp.category];
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        const matchRef = exp.receiptRef?.toLowerCase().includes(q);
        const matchCat = catConfig?.labelSw.toLowerCase().includes(q) || catConfig?.labelEn.toLowerCase().includes(q);
        const matchRecordedBy = exp.recordedBy.toLowerCase().includes(q);
        return matchTitle || matchNotes || matchRef || matchCat || matchRecordedBy;
      }

      return true;
    });
  }, [expenses, dateRangeFiltered, selectedCategory, selectedStaff, searchQuery]);

  // Automatic Staff / User Expense Breakdown Analysis
  const staffExpenseReport = useMemo(() => {
    // Only filter by date range so staff report reflects the selected period accurately
    const periodExpenses = expenses.filter(exp => dateRangeFiltered.isMatching(exp.date));
    const totalPeriodExpenseAmount = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Grouping by recordedBy
    const staffMap: Record<string, {
      staffName: string;
      totalAmount: number;
      count: number;
      expenses: Expense[];
      categoryTotals: Record<ExpenseCategory, number>;
      paymentMethodTotals: Record<PaymentMethod, number>;
    }> = {};

    periodExpenses.forEach(exp => {
      const staffKey = (exp.recordedBy || 'Msimamizi (Admin)').trim();
      if (!staffMap[staffKey]) {
        staffMap[staffKey] = {
          staffName: staffKey,
          totalAmount: 0,
          count: 0,
          expenses: [],
          categoryTotals: {
            RENT: 0,
            SALARIES: 0,
            UTILITIES: 0,
            TRANSPORT: 0,
            PACKAGING: 0,
            MEALS: 0,
            MARKETING: 0,
            MAINTENANCE: 0,
            TAX_PERMITS: 0,
            SUPPLIES: 0,
            OTHER: 0
          },
          paymentMethodTotals: {
            CASH: 0,
            M_PESA: 0,
            AIRTEL_MONEY: 0,
            TIGO_PESA: 0,
            HALOPESA: 0,
            CARD: 0,
            CREDIT: 0
          }
        };
      }

      staffMap[staffKey].totalAmount += exp.amount;
      staffMap[staffKey].count += 1;
      staffMap[staffKey].expenses.push(exp);
      staffMap[staffKey].categoryTotals[exp.category] = (staffMap[staffKey].categoryTotals[exp.category] || 0) + exp.amount;
      staffMap[staffKey].paymentMethodTotals[exp.paymentMethod] = (staffMap[staffKey].paymentMethodTotals[exp.paymentMethod] || 0) + exp.amount;
    });

    const staffList = Object.values(staffMap).map(item => {
      // Find top category for this user
      let topCat: { key: ExpenseCategory; name: string; amount: number; color: string } = {
        key: 'OTHER',
        name: language === 'SW' ? 'Mengineyo' : 'Other',
        amount: 0,
        color: '#64748b'
      };

      Object.entries(item.categoryTotals).forEach(([catKey, amount]) => {
        if (amount > topCat.amount) {
          const cfg = CATEGORY_CONFIG[catKey as ExpenseCategory];
          topCat = {
            key: catKey as ExpenseCategory,
            name: language === 'SW' ? cfg?.labelSw : cfg?.labelEn,
            amount,
            color: cfg?.barColor || '#64748b'
          };
        }
      });

      // Sort individual expenses descending by date
      const sortedExpenses = [...item.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const percentage = totalPeriodExpenseAmount > 0 ? (item.totalAmount / totalPeriodExpenseAmount) * 100 : 0;
      const avgPerVoucher = item.count > 0 ? Math.round(item.totalAmount / item.count) : 0;

      return {
        staffName: item.staffName,
        totalAmount: item.totalAmount,
        count: item.count,
        percentage,
        avgPerVoucher,
        topCategory: topCat,
        categoryTotals: item.categoryTotals,
        paymentMethodTotals: item.paymentMethodTotals,
        expenses: sortedExpenses
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    const topStaffSpender = staffList[0] || null;
    const totalStaffCount = staffList.length;
    const avgSpentPerStaff = totalStaffCount > 0 ? Math.round(totalPeriodExpenseAmount / totalStaffCount) : 0;

    return {
      totalPeriodExpenseAmount,
      staffList,
      topStaffSpender,
      totalStaffCount,
      avgSpentPerStaff
    };
  }, [expenses, dateRangeFiltered, language]);

  // Financial Health & Business Performance Calculations for Period
  const performanceMetrics = useMemo(() => {
    // 1. Total Expenses in Selected Period
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 2. Total Sales and Gross Profit in Selected Period
    let totalRevenue = 0;
    let totalCOGS = 0; // Cost of Goods Sold

    transactions.forEach(tx => {
      if (dateRangeFiltered.isMatching(tx.timestamp)) {
        totalRevenue += tx.total;
        tx.items.forEach(item => {
          totalCOGS += (item.product.costPrice * item.quantity);
        });
      }
    });

    const grossProfit = Math.max(0, totalRevenue - totalCOGS);
    const netProfitOrLoss = grossProfit - totalExpenses; // Can be negative (loss!)
    const isNetLoss = netProfitOrLoss < 0;

    // Expense-to-Revenue Ratio (%)
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const expenseGrossRatio = grossProfit > 0 ? (totalExpenses / grossProfit) * 100 : 0;

    // Monthly Budget Evaluation
    const monthlyBudget = state.settings.monthlyExpenseBudget || 250000;
    const maxThreshold = state.settings.maxExpenseRatioThreshold || 35;

    // Expenses specifically for this calendar month (for budget progress)
    const now = new Date();
    const thisMonthExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const budgetPercentUsed = monthlyBudget > 0 ? (thisMonthExpenses / monthlyBudget) * 100 : 0;
    const isOverBudget = thisMonthExpenses > monthlyBudget;
    const budgetRemaining = Math.max(0, monthlyBudget - thisMonthExpenses);

    // Grouping by Category for Charts & Breakdown
    const categoryTotals: Record<ExpenseCategory, number> = {
      RENT: 0,
      SALARIES: 0,
      UTILITIES: 0,
      TRANSPORT: 0,
      PACKAGING: 0,
      MEALS: 0,
      MARKETING: 0,
      MAINTENANCE: 0,
      TAX_PERMITS: 0,
      SUPPLIES: 0,
      OTHER: 0
    };

    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categoryDataList = Object.entries(categoryTotals)
      .map(([catKey, amt]) => {
        const cat = catKey as ExpenseCategory;
        const config = CATEGORY_CONFIG[cat];
        return {
          category: cat,
          name: language === 'SW' ? config.labelSw : config.labelEn,
          amount: amt,
          percentage: totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0,
          color: config.barColor
        };
      })
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const topExpenseCategory = categoryDataList[0] || null;

    // Overspending Warning Status: 'CRITICAL_LOSS' | 'OVER_BUDGET' | 'HIGH_RATIO' | 'HEALTHY'
    let healthStatus: 'CRITICAL_LOSS' | 'OVER_BUDGET' | 'HIGH_RATIO' | 'HEALTHY' = 'HEALTHY';
    if (isNetLoss) {
      healthStatus = 'CRITICAL_LOSS';
    } else if (isOverBudget) {
      healthStatus = 'OVER_BUDGET';
    } else if (expenseRatio > maxThreshold || expenseGrossRatio > 70) {
      healthStatus = 'HIGH_RATIO';
    } else {
      healthStatus = 'HEALTHY';
    }

    return {
      totalExpenses,
      totalRevenue,
      totalCOGS,
      grossProfit,
      netProfitOrLoss,
      isNetLoss,
      expenseRatio,
      expenseGrossRatio,
      monthlyBudget,
      maxThreshold,
      thisMonthExpenses,
      budgetPercentUsed,
      isOverBudget,
      budgetRemaining,
      categoryDataList,
      topExpenseCategory,
      healthStatus
    };
  }, [filteredExpenses, transactions, dateRangeFiltered, expenses, state.settings, language]);

  // Open modal to add
  const handleOpenAddModal = (suggestedTitle?: string) => {
    setEditingExpense(null);
    setFormTitle(suggestedTitle || '');
    setFormCategory('RENT');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('CASH');
    setFormRecordedBy(currentCashierName);
    setFormReceiptRef('');
    setFormNotes('');
    setFormIsRecurring(false);
    setIsAddModalOpen(true);
  };

  // Open modal to edit
  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(exp.amount.toString());
    setFormDate(exp.date);
    setFormPaymentMethod(exp.paymentMethod);
    setFormRecordedBy(exp.recordedBy || currentCashierName);
    setFormReceiptRef(exp.receiptRef || '');
    setFormNotes(exp.notes || '');
    setFormIsRecurring(!!exp.isRecurring);
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (!formTitle.trim()) {
      alert(language === 'SW' ? 'Tafadhali weka jina au maelezo ya matumizi.' : 'Please enter the expense title.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(language === 'SW' ? 'Tafadhali weka kiasi sahihi cha fedha.' : 'Please enter a valid amount.');
      return;
    }

    const recordedByName = formRecordedBy.trim() || currentCashierName;

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        title: formTitle.trim(),
        category: formCategory,
        amount: amountNum,
        date: formDate,
        paymentMethod: formPaymentMethod,
        recordedBy: recordedByName,
        receiptRef: formReceiptRef.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isRecurring: formIsRecurring
      });
    } else {
      addExpense({
        title: formTitle.trim(),
        category: formCategory,
        amount: amountNum,
        date: formDate,
        paymentMethod: formPaymentMethod,
        recordedBy: recordedByName,
        receiptRef: formReceiptRef.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isRecurring: formIsRecurring
      });
    }

    setIsAddModalOpen(false);
  };

  // Toggle expanded staff card in user report
  const toggleStaffExpand = (staffName: string) => {
    setExpandedStaffCards(prev => ({
      ...prev,
      [staffName]: !prev[staffName]
    }));
  };

  // Print Staff Report Summary
  const handlePrintStaffReport = (staffName?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const store = state.settings.storeName || 'LedgerBox';

    const targetStaffList = staffName 
      ? staffExpenseReport.staffList.filter(s => s.staffName === staffName)
      : staffExpenseReport.staffList;

    const totalAmt = targetStaffList.reduce((sum, s) => sum + s.totalAmount, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Ripoti ya Matumizi kwa Watumiaji - ${store}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 20px; }
            .badge { display: inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 4px; font-size: 11px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { text-align: left; padding: 8px 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
            .amount { text-align: right; font-family: monospace; font-weight: bold; }
            .total-box { margin-top: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0 0 4px 0;">${store}</h2>
            <h4 style="margin: 0 0 6px 0; color: #475569;">
              ${staffName ? `RIPOTI YA MATUMIZI YA MTUMIAJI: ${staffName.toUpperCase()}` : 'RIPOTI YA KIOTOMATIKI: MATUMIZI KWA WATUMIAJI / WAFANYAKAZI WOTE'}
            </h4>
            <div style="font-size: 12px; color: #64748b;">
              Kipindi: <strong>${dateRangeFiltered.currentMonthStr} (${timePeriod})</strong> | Tarehe ya Kuchapishwa: <strong>${new Date().toLocaleDateString('sw-TZ')}</strong>
            </div>
          </div>

          ${targetStaffList.map(staff => `
            <div style="margin-bottom: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 14px; color: #0f172a;">👤 ${staff.staffName}</strong>
                  <span style="font-size: 11px; color: #64748b; margin-left: 8px;">(${staff.count} Vocha za Matumizi)</span>
                </div>
                <div style="font-size: 14px; font-family: monospace; font-weight: bold; color: #e11d48;">
                  ${currency} ${staff.totalAmount.toLocaleString()} (${staff.percentage.toFixed(1)}%)
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Tarehe</th>
                    <th>Maelezo ya Matumizi</th>
                    <th>Kundi</th>
                    <th>Njia</th>
                    <th>Ref</th>
                    <th style="text-align: right;">Kiasi (${currency})</th>
                  </tr>
                </thead>
                <tbody>
                  ${staff.expenses.map(exp => `
                    <tr>
                      <td style="font-family: monospace; color: #64748b;">${exp.date}</td>
                      <td><strong>${exp.title}</strong>${exp.notes ? `<div style="font-size: 10px; color: #64748b;">${exp.notes}</div>` : ''}</td>
                      <td>${CATEGORY_CONFIG[exp.category]?.labelSw || exp.category}</td>
                      <td><span class="badge">${exp.paymentMethod}</span></td>
                      <td style="font-family: monospace; font-size: 11px;">${exp.receiptRef || '-'}</td>
                      <td class="amount">${exp.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <div class="total-box">
            <span>JUMLA KUU YA MATUMIZI KATIKA KIPINDI HIKI:</span>
            <span style="color: #e11d48; font-size: 16px; font-family: monospace;">${currency} ${totalAmt.toLocaleString()}</span>
          </div>

          <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px;">
            <div>Imetayarishwa na: <strong>${currentCashierName}</strong></div>
            <div>Idhini ya Uongozi: ______________________</div>
          </div>

          <div class="footer">
            Ripoti hii ya ukaguzi wa matumizi imetolewa kiotomatiki na Mfumo wa LedgerBox POS
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Save budget settings
  const handleSaveBudgetSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const bAmt = parseFloat(budgetAmount);
    const rThresh = parseFloat(maxRatioThreshold);
    updateSettings({
      monthlyExpenseBudget: isNaN(bAmt) ? 250000 : bAmt,
      maxExpenseRatioThreshold: isNaN(rThresh) ? 35 : rThresh,
      expenseAlertsEnabled: true
    });
    setIsBudgetModalOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert(language === 'SW' ? 'Hakuna matumizi ya kupakua.' : 'No expenses to export.');
      return;
    }
    const headers = ['Tarehe', 'Jina la Matumizi', 'Kundi', 'Kiasi (TZS)', 'Njia ya Malipo', 'Kumbukumbu ya Risiti', 'Aliyerekodi', 'Maelezo'];
    const rows = filteredExpenses.map(e => [
      e.date,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${CATEGORY_CONFIG[e.category]?.labelSw || e.category}"`,
      e.amount,
      e.paymentMethod,
      `"${e.receiptRef || ''}"`,
      `"${e.recordedBy}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ripoti_ya_Matumizi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print voucher
  const handlePrintVoucher = (exp: Expense) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const catName = language === 'SW' ? CATEGORY_CONFIG[exp.category]?.labelSw : CATEGORY_CONFIG[exp.category]?.labelEn;
    const store = state.settings.storeName || 'LedgerBox';

    printWindow.document.write(`
      <html>
        <head>
          <title>Vocha ya Matumizi - ${exp.title}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 24px; max-width: 420px; margin: 0 auto; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
            .amount-box { text-align: center; background: #eee; padding: 12px; margin: 16px 0; font-size: 20px; font-weight: bold; border-radius: 6px; }
            .footer { border-top: 1px dashed #aaa; padding-top: 12px; margin-top: 24px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">${store}</h2>
            <p style="margin:4px 0; font-size:12px;">VOCHA YA MATUMIZI YA OFISI / DUKA</p>
            <p style="margin:0; font-size:11px;">Tarehe: ${exp.date}</p>
          </div>
          <div class="row"><span>Maelezo:</span> <strong>${exp.title}</strong></div>
          <div class="row"><span>Kundi:</span> <span>${catName}</span></div>
          <div class="row"><span>Malipo:</span> <span>${exp.paymentMethod}</span></div>
          ${exp.receiptRef ? `<div class="row"><span>Ref / Risiti:</span> <span>${exp.receiptRef}</span></div>` : ''}
          <div class="row"><span>Imerekodiwa na:</span> <span>${exp.recordedBy}</span></div>
          ${exp.notes ? `<div class="row"><span>Maoni:</span> <span>${exp.notes}</span></div>` : ''}
          
          <div class="amount-box">
            ${currency} ${exp.amount.toLocaleString()}
          </div>

          <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px;">
            <div>Saini ya Mpokeaji: ____________</div>
            <div>Idhini ya Meneja: ____________</div>
          </div>

          <div class="footer">
            Mfumo wa LedgerBox POS & Store Tracker
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-slate-50 text-slate-800 safe-area-pb">
      {/* PAGE HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 sm:px-6 shrink-0 sticky top-0 z-10 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <TrendingDown size={18} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {language === 'SW' ? 'Usimamizi wa Matumizi & Afya ya Duka' : 'Expenses & Business Health'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'SW' 
                    ? 'Rekodi gharama za kila siku, fuatilia faida halisi na udhibiti kula mtaji'
                    : 'Track operational expenses, calculate net profit/loss and prevent overspending'}
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title={language === 'SW' ? 'Sanidi Bajeti ya Mwezi & Tahadhari' : 'Configure Monthly Budget & Alerts'}
            >
              <Sliders size={14} className="text-slate-500" />
              <span>{language === 'SW' ? 'Bajeti ya Mwezi' : 'Budget Settings'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title={language === 'SW' ? 'Pakua Excel / CSV' : 'Export Excel / CSV'}
            >
              <Download size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Excel / CSV</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="py-2.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm shadow-rose-950/20 cursor-pointer min-h-[42px]"
            >
              <Plus size={16} />
              <span>{language === 'SW' ? 'Rekodi Matumizi' : 'Add Expense'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
        
        {/* ========================================================================= */}
        {/* REAL-TIME BUSINESS HEALTH & OVERSPENDING WARNING DIAGNOSTIC BANNER         */}
        {/* ========================================================================= */}
        <div className="w-full">
          {performanceMetrics.healthStatus === 'CRITICAL_LOSS' && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertOctagon size={22} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                      {language === 'SW' ? '🚨 TAHADHARI KUBWA YA HASARA (UNAKULA MTAJI)' : '🚨 CRITICAL NET LOSS WARNING'}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-900">
                      {dateRangeFiltered.currentMonthStr}
                    </span>
                  </div>
                  
                  <h3 className="text-base sm:text-lg font-black text-rose-950 leading-tight">
                    {language === 'SW' 
                      ? `Matumizi ya ${currency} ${performanceMetrics.totalExpenses.toLocaleString()} yamezidi Faida Ghafi ya ${currency} ${performanceMetrics.grossProfit.toLocaleString()}!`
                      : `Expenses of ${currency} ${performanceMetrics.totalExpenses.toLocaleString()} exceed Gross Profit of ${currency} ${performanceMetrics.grossProfit.toLocaleString()}!`}
                  </h3>
                  
                  <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                    {language === 'SW' ? (
                      <>
                        Biashara yako inapata <strong>Hasara Halisi ya {currency} {Math.abs(performanceMetrics.netProfitOrLoss).toLocaleString()}</strong>. 
                        Kila siku unayofungua duka bila mauzo ya kutosha kufidia matumizi, unakula mtaji wa kununulia bidhaa mpya.
                        {performanceMetrics.topExpenseCategory && (
                          <span className="block mt-1 bg-rose-150/50 p-1.5 rounded-lg text-rose-900">
                            💡 Kundi linaloongoza kutumia pesa nyingi zaidi ni <strong>{performanceMetrics.topExpenseCategory.name} ({currency} {performanceMetrics.topExpenseCategory.amount.toLocaleString()} - {performanceMetrics.topExpenseCategory.percentage.toFixed(0)}%)</strong>.
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Your business is operating at a <strong>Net Loss of {currency} {Math.abs(performanceMetrics.netProfitOrLoss).toLocaleString()}</strong>.
                        Operational costs exceed generated profit margin. Urgent cost reduction or sales drive required.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {performanceMetrics.healthStatus === 'OVER_BUDGET' && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-900">
                      {language === 'SW' ? '⚠️ UMEVUKA BAJETI YA MATUMIZI YA MWEZI' : '⚠️ MONTHLY EXPENSE BUDGET EXCEEDED'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-900">
                      {performanceMetrics.budgetPercentUsed.toFixed(0)}% Ya Bajeti
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-amber-950 leading-tight">
                    {language === 'SW'
                      ? `Umetumia ${currency} ${performanceMetrics.thisMonthExpenses.toLocaleString()} kati ya Bajeti ya ${currency} ${performanceMetrics.monthlyBudget.toLocaleString()}`
                      : `Spent ${currency} ${performanceMetrics.thisMonthExpenses.toLocaleString()} against budget of ${currency} ${performanceMetrics.monthlyBudget.toLocaleString()}`}
                  </h3>

                  <p className="text-xs text-amber-800 mt-1 font-medium">
                    {language === 'SW'
                      ? `Umezidisha bajeti yako kwa ${currency} ${(performanceMetrics.thisMonthExpenses - performanceMetrics.monthlyBudget).toLocaleString()}. Jaribu kusitisha matumizi yasiyo ya lazima mpaka mwezi ujao.`
                      : `Budget exceeded by ${currency} ${(performanceMetrics.thisMonthExpenses - performanceMetrics.monthlyBudget).toLocaleString()}. Postpone non-essential expenses.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {performanceMetrics.healthStatus === 'HIGH_RATIO' && (
            <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Percent size={18} />
                </div>
                <div className="flex-1">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-orange-200 text-orange-900">
                    {language === 'SW' ? 'ANGALIZO LA ASILIMIA YA MATUMIZI' : 'EXPENSE RATIO ALERT'}
                  </span>
                  <h4 className="font-bold text-orange-950 text-sm mt-0.5">
                    {language === 'SW'
                      ? `Matumizi yako yanachukua ${performanceMetrics.expenseRatio.toFixed(1)}% ya Mapato yote ya Mauzo`
                      : `Expenses consume ${performanceMetrics.expenseRatio.toFixed(1)}% of total gross sales`}
                  </h4>
                  <p className="text-xs text-orange-800 mt-0.5">
                    {language === 'SW'
                      ? `Kiwango cha juu kilichopendekezwa ni chini ya ${performanceMetrics.maxThreshold}%. Zingatia kupunguza gharama za uendeshaji ili kuongeza faida halisi mfukoni.`
                      : `Recommended threshold is under ${performanceMetrics.maxThreshold}%.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {performanceMetrics.healthStatus === 'HEALTHY' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                      {language === 'SW' ? 'AFYA YA BIASHARA: IPO SALAMA' : 'BUSINESS HEALTH: HEALTHY'}
                    </span>
                    <h4 className="font-extrabold text-emerald-950 text-sm">
                      {language === 'SW'
                        ? `Faida Halisi ya ${currency} ${performanceMetrics.netProfitOrLoss.toLocaleString()} baada ya kutoa matumizi yote.`
                        : `Net Profit of ${currency} ${performanceMetrics.netProfitOrLoss.toLocaleString()} after operational expenses.`}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 block font-bold">
                    {language === 'SW' ? 'Asilimia ya Matumizi vs Mauzo' : 'Expense to Sales Ratio'}
                  </span>
                  <span className="font-mono font-black text-emerald-900 text-sm">
                    {performanceMetrics.expenseRatio.toFixed(1)}% {language === 'SW' ? '(Nzuri)' : '(Safe)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TIME PERIOD SELECTOR, SUBTABS & QUICK CHIP SUGGESTIONS                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Left: Time Tabs & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {[
                { id: 'TODAY', label: language === 'SW' ? 'Leo' : 'Today' },
                { id: 'THIS_WEEK', label: language === 'SW' ? 'Wiki Hii' : 'This Week' },
                { id: 'THIS_MONTH', label: language === 'SW' ? 'Mwezi Huu' : 'This Month' },
                { id: 'THIS_YEAR', label: language === 'SW' ? 'Mwaka Huu' : 'This Year' },
                { id: 'ALL_TIME', label: language === 'SW' ? 'Muda Wote' : 'All Time' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTimePeriod(tab.id as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    timePeriod === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Switcher: List vs Automatic User Report */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('LIST')}
                className={`py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'LIST'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt size={13} />
                <span>{language === 'SW' ? 'Orodha ya Matumizi' : 'Expenses List'}</span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full">
                  {filteredExpenses.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('USER_REPORT')}
                className={`py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'USER_REPORT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={13} />
                <span>{language === 'SW' ? 'Ripoti ya Watumiaji' : 'Staff Report'}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'USER_REPORT' ? 'bg-rose-800 text-white' : 'bg-slate-300 text-slate-800'
                }`}>
                  {staffExpenseReport.totalStaffCount}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Record Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap pl-1">
              {language === 'SW' ? 'Rekodi Haraka:' : 'Quick Add:'}
            </span>
            {['Kodi ya Pango', 'LUKU Umeme', 'Nauli ya Mzigo', 'Mifuko'].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenAddModal(chip)}
                className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DEDICATED AUTOMATIC STAFF / USER EXPENSE REPORT                    */}
        {/* ========================================================================= */}
        {activeTab === 'USER_REPORT' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Staff Report Banner & Actions */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white p-5 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    {language === 'SW' ? '📊 RIPOTI YA KIOTOMATIKI' : '📊 AUTOMATIC AUDIT REPORT'}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {dateRangeFiltered.currentMonthStr} ({timePeriod})
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {language === 'SW' ? 'Matumizi Kulingana na Watumiaji / Wafanyakazi' : 'Staff & User Expense Ledger'}
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                  {language === 'SW'
                    ? 'Ripoti hii inakagua kiotomatiki ni mtumiaji yupi ametoa au kurekodi matumizi dukani, jumla ya pesa alizotumia, makundi makuu na vocha zote husika.'
                    : 'Automatic audit showing which staff members incurred or recorded expenses, total amounts, top spending categories, and full itemized vouchers.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePrintStaffReport()}
                  className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs shadow-2xs"
                >
                  <Printer size={14} />
                  <span>{language === 'SW' ? 'Chapa Ripoti Kamili' : 'Print Full Report'}</span>
                </button>
              </div>
            </div>

            {/* Staff Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Top Spender */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Mtumiaji Aliyetumia Zaidi' : 'Top Spender User'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <UserCheck size={15} />
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {staffExpenseReport.topStaffSpender?.staffName || '-'}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-500">{currency} {staffExpenseReport.topStaffSpender?.totalAmount.toLocaleString() || 0}</span>
                  <span className="font-bold text-rose-600">
                    {staffExpenseReport.topStaffSpender?.percentage.toFixed(0) || 0}% ya matumizi
                  </span>
                </div>
              </div>

              {/* 2. Total Staff with Expenses */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Wafanyakazi Waliohusika' : 'Active Staff Spenders'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
                    {staffExpenseReport.totalStaffCount} <span className="text-xs font-normal text-slate-400">{language === 'SW' ? 'Wafanyakazi' : 'Users'}</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10.5px] text-slate-500">
                  <span>{language === 'SW' ? 'Walioingiza vocha kipindi hiki' : 'Logged vouchers in period'}</span>
                </div>
              </div>

              {/* 3. Average Expense Per Staff */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Wastani kwa Kila Mfanyakazi' : 'Avg Spent per User'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <DollarSign size={15} />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
                    {currency} {staffExpenseReport.avgSpentPerStaff.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10.5px] text-slate-500">
                  <span>{language === 'SW' ? 'Mgawanyo wa wastani' : 'Evenly distributed metric'}</span>
                </div>
              </div>

              {/* 4. Total Period Expenses */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Jumla ya Matumizi Yote' : 'Total Store Expenses'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <TrendingDown size={15} />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-rose-600 font-mono">
                    {currency} {staffExpenseReport.totalPeriodExpenseAmount.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 flex items-center justify-between">
                  <span>{dateRangeFiltered.currentMonthStr}</span>
                  <span className="font-bold text-slate-700">{filteredExpenses.length} {language === 'SW' ? 'Vocha' : 'Vouchers'}</span>
                </div>
              </div>
            </div>

            {/* Staff Breakdown Progress / Distribution Comparison */}
            {staffExpenseReport.staffList.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                <h3 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <Percent size={16} className="text-slate-400" />
                  <span>{language === 'SW' ? 'Ulinganisho wa Matumizi kwa Kila Mtumiaji (% Share)' : 'User Expense Share Distribution'}</span>
                </h3>

                <div className="space-y-3">
                  {staffExpenseReport.staffList.map((staff, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                            {staff.staffName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 truncate">👤 {staff.staffName}</span>
                          <span className="text-[10px] text-slate-400">({staff.count} {language === 'SW' ? 'vocha' : 'vouchers'})</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-black text-slate-900">
                            {currency} {staff.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            {staff.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300"
                          style={{ width: `${Math.max(2, staff.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Itemized Staff Dossiers & Records */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 pt-2">
                <FileText size={16} className="text-slate-400" />
                <span>{language === 'SW' ? 'Mchanganuo wa Vocha za Kila Mtumiaji' : 'Itemized Staff Expense Logs'}</span>
              </h3>

              {staffExpenseReport.staffList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                  <UserCheck size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">{language === 'SW' ? 'Hakuna rekodi ya matumizi ya watumiaji katika kipindi hiki.' : 'No staff expenses recorded for this period.'}</p>
                </div>
              ) : (
                staffExpenseReport.staffList.map((staff, idx) => {
                  const isExpanded = expandedStaffCards[staff.staffName] !== false; // default expanded

                  return (
                    <div 
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Staff Header Bar */}
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                            {staff.staffName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-base">
                                {staff.staffName}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                                {staff.count} {language === 'SW' ? 'Vocha za Matumizi' : 'Vouchers'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono">
                                {staff.percentage.toFixed(1)}% {language === 'SW' ? 'ya Bajeti' : 'Share'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {language === 'SW' ? 'Kundi Kuu:' : 'Top Category:'} <strong>{staff.topCategory.name}</strong> ({currency} {staff.topCategory.amount.toLocaleString()}) • {language === 'SW' ? 'Wastani kwa Vocha:' : 'Avg per Voucher:'} {currency} {staff.avgPerVoucher.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                              {language === 'SW' ? 'Jumla Aliyotumia' : 'Total Spent'}
                            </span>
                            <span className="font-mono font-black text-rose-600 text-base sm:text-lg">
                              {currency} {staff.totalAmount.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                            <button
                              onClick={() => handlePrintStaffReport(staff.staffName)}
                              className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                              title={language === 'SW' ? `Chapa Ripoti ya ${staff.staffName}` : `Print Report for ${staff.staffName}`}
                            >
                              <Printer size={14} />
                            </button>

                            <button
                              onClick={() => toggleStaffExpand(staff.staffName)}
                              className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                              title={isExpanded ? 'Funga' : 'Fungua'}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Table of Vouchers for this user */}
                      {isExpanded && (
                        <div className="p-0 overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider font-mono">
                                <th className="py-2.5 px-4">{language === 'SW' ? 'Tarehe' : 'Date'}</th>
                                <th className="py-2.5 px-3">{language === 'SW' ? 'Maelezo ya Matumizi' : 'Expense Details'}</th>
                                <th className="py-2.5 px-3">{language === 'SW' ? 'Kundi' : 'Category'}</th>
                                <th className="py-2.5 px-3 text-center">{language === 'SW' ? 'Njia' : 'Method'}</th>
                                <th className="py-2.5 px-3">{language === 'SW' ? 'Risiti / Kumb' : 'Ref'}</th>
                                <th className="py-2.5 px-3 text-right">{language === 'SW' ? 'Kiasi' : 'Amount'}</th>
                                <th className="py-2.5 px-4 text-center">{language === 'SW' ? 'Vocha' : 'Print'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {staff.expenses.map(exp => {
                                const cfg = CATEGORY_CONFIG[exp.category];
                                const Icon = cfg?.icon || ShoppingBag;

                                return (
                                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                      {exp.date}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-bold text-slate-900">{exp.title}</span>
                                      {exp.notes && <div className="text-[10px] text-slate-500 mt-0.5">{exp.notes}</div>}
                                    </td>
                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${cfg?.badgeBg} ${cfg?.badgeText}`}>
                                        <Icon size={10} />
                                        <span>{language === 'SW' ? cfg?.labelSw : cfg?.labelEn}</span>
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                        {exp.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[10.5px] whitespace-nowrap">
                                      {exp.receiptRef ? `#${exp.receiptRef}` : '-'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                      {currency} {exp.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                      <button
                                        onClick={() => handlePrintVoucher(exp)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                        title={language === 'SW' ? "Chapa Vocha ya Malipo" : "Print Payment Voucher"}
                                      >
                                        <Printer size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: STANDARD EXPENSES LEDGER & ADVANCED FILTERS                        */}
        {/* ========================================================================= */}
        {activeTab === 'LIST' && (
          <>
            {/* CORE FINANCIAL METRIC CARDS (4 METRICS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Total Expenses */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Jumla ya Matumizi' : 'Total Expenses'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <TrendingDown size={15} />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-rose-600 font-mono tracking-tight">
                    {currency} {performanceMetrics.totalExpenses.toLocaleString()}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{filteredExpenses.length} {language === 'SW' ? 'miamala' : 'records'}</span>
                  <span className="font-semibold text-rose-600">
                    {performanceMetrics.expenseRatio.toFixed(0)}% {language === 'SW' ? 'ya mauzo' : 'of sales'}
                  </span>
                </div>
              </div>

              {/* 2. Gross Sales Revenue */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Mauzo ya Duka' : 'Sales Revenue'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <TrendingUp size={15} />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {currency} {performanceMetrics.totalRevenue.toLocaleString()}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{language === 'SW' ? 'Faida Ghafi:' : 'Gross Profit:'}</span>
                  <span className="font-mono font-bold text-blue-700">
                    {currency} {performanceMetrics.grossProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3. Net Profit / Loss */}
              <div className={`border rounded-2xl p-4 shadow-2xs flex flex-col justify-between ${
                performanceMetrics.isNetLoss 
                  ? 'bg-rose-50/50 border-rose-300 text-rose-950' 
                  : 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {language === 'SW' ? 'Faida Halisi (Net Profit)' : 'Net Profit / Loss'}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      performanceMetrics.isNetLoss ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {performanceMetrics.isNetLoss ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                  </div>
                  <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
                    performanceMetrics.isNetLoss ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {performanceMetrics.isNetLoss ? '-' : '+'}{currency} {Math.abs(performanceMetrics.netProfitOrLoss).toLocaleString()}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10.5px]">
                  <span className="font-medium">{performanceMetrics.isNetLoss ? (language === 'SW' ? 'Hasara Halisi' : 'Net Loss') : (language === 'SW' ? 'Faida Mfukoni' : 'Take-home')}</span>
                  <span className={`font-black uppercase text-[10px] px-1.5 py-0.2 rounded ${
                    performanceMetrics.isNetLoss ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {performanceMetrics.isNetLoss ? (language === 'SW' ? 'Kula Mtaji' : 'Deficit') : (language === 'SW' ? 'Faida Safi' : 'Profitable')}
                  </span>
                </div>
              </div>

              {/* 4. Monthly Budget Progress */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {language === 'SW' ? 'Bajeti ya Mwezi' : 'Monthly Budget'}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      performanceMetrics.isOverBudget 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {performanceMetrics.budgetPercentUsed.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mt-2">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        performanceMetrics.isOverBudget
                          ? 'bg-rose-600'
                          : performanceMetrics.budgetPercentUsed > 80
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, performanceMetrics.budgetPercentUsed)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{currency} {performanceMetrics.thisMonthExpenses.toLocaleString()} / {currency} {performanceMetrics.monthlyBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown & Advisor */}
            {performanceMetrics.categoryDataList.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Category Breakdown Bars */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Percent size={15} className="text-slate-400" />
                      <span>{language === 'SW' ? 'Mgawanyo wa Matumizi kwa Makundi' : 'Expense Breakdown by Category'}</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-bold">
                      {dateRangeFiltered.currentMonthStr}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {performanceMetrics.categoryDataList.map((item, idx) => {
                      const config = CATEGORY_CONFIG[item.category as ExpenseCategory];
                      const Icon = config?.icon || ShoppingBag;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md ${config?.badgeBg || 'bg-slate-100'} ${config?.color || 'text-slate-600'} flex items-center justify-center shrink-0`}>
                                <Icon size={13} />
                              </div>
                              <span className="font-bold text-slate-800">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{currency} {item.amount.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-slate-400 font-mono w-10 text-right">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: item.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Smart Financial Doctor Advice Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
                        <Lightbulb size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-indigo-100">
                          {language === 'SW' ? 'Ushauri wa Kifedha (AI Advice)' : 'Financial AI Advisor'}
                        </h4>
                        <span className="text-[10px] text-indigo-300">
                          {language === 'SW' ? 'Mbinu za kuokoa mtaji wako' : 'Tips to protect your store capital'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                      {performanceMetrics.isNetLoss ? (
                        <div className="bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-xl text-rose-200 text-[11px]">
                          🚨 <strong>Hasara Imegundulika:</strong> Ongeza bei ndogo kwenye bidhaa zinazotoka kwa wingi, au punguza matumizi ya {performanceMetrics.topExpenseCategory?.name || 'uendeshaji'} mara moja.
                        </div>
                      ) : (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-emerald-200 text-[11px]">
                          ✨ <strong>Biashara Nzuri:</strong> Una margin nzuri ya faida. Weka kando 20% ya faida halisi kila wiki kama akiba ya kodi na dharura.
                        </div>
                      )}

                      <p className="text-[11.5px]">
                        {language === 'SW'
                          ? '• Andika kila senti inayotoka dukani, hata kama ni 500/- ya maji au vocha ya simu.'
                          : '• Record every single cent spent from the register, however small.'}
                      </p>
                      <p className="text-[11.5px]">
                        {language === 'SW'
                          ? '• Tenga pesa ya mtaji wa mizigo mbali na pesa ya matumizi binafsi ya nyumbani.'
                          : '• Keep operating cash strictly separate from personal household cash.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>LedgerBox Health Engine</span>
                    <span className="text-emerald-400 font-bold">100% Offline & Sync</span>
                  </div>
                </div>
              </div>
            )}

            {/* EXPENSES LIST & SEARCH / FILTER CONTROLS */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              {/* Filter Bar */}
              <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={language === 'SW' ? 'Tafuta matumizi kwa jina, risiti, kundi au aliyerekodi...' : 'Search by title, receipt ref, category...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Filters: Category & Staff */}
                <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
                  {/* Category Dropdown Filter */}
                  <div className="flex items-center gap-1.5">
                    <Filter size={13} className="text-slate-400 shrink-0" />
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">{language === 'SW' ? 'Makundi Yote ya Matumizi' : 'All Expense Categories'}</option>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {language === 'SW' ? config.labelSw : config.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Staff / User Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <select
                      value={selectedStaff}
                      onChange={e => setSelectedStaff(e.target.value)}
                      className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">{language === 'SW' ? 'Wafanyakazi Wote' : 'All Staff / Users'}</option>
                      {allKnownStaffNames.map((sName, idx) => (
                        <option key={idx} value={sName}>
                          👤 {sName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* List Content */}
              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Receipt size={24} />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">
                    {language === 'SW' ? 'Hakuna kumbukumbu ya matumizi' : 'No expenses recorded'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    {language === 'SW' 
                      ? 'Bofya kitufe cha "Rekodi Matumizi" hapo juu ili kuingiza gharama za leo.'
                      : 'Click the "Add Expense" button above to record your store expenses.'}
                  </p>
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="mt-4 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>{language === 'SW' ? 'Rekodi Sasa' : 'Add First Expense'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* MOBILE CARDS VIEW (< md screens) */}
                  <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2">
                    {filteredExpenses.map(exp => {
                      const config = CATEGORY_CONFIG[exp.category];
                      const Icon = config?.icon || ShoppingBag;

                      return (
                        <div 
                          key={exp.id}
                          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-xl ${config?.badgeBg || 'bg-slate-100'} ${config?.color || 'text-slate-600'} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block truncate">
                                  {language === 'SW' ? config?.labelSw : config?.labelEn}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">
                                  {exp.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
                                  <span className="flex items-center gap-0.5">
                                    <Calendar size={10} />
                                    <span>{exp.date}</span>
                                  </span>
                                  <span className="bg-slate-200/70 px-1.5 py-0.2 rounded font-mono">
                                    {exp.paymentMethod}
                                  </span>
                                  {exp.receiptRef && (
                                    <span className="bg-slate-200/70 px-1.5 py-0.2 rounded font-mono">
                                      #{exp.receiptRef}
                                    </span>
                                  )}
                                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5 border border-rose-100">
                                    <User size={10} />
                                    <span>{exp.recordedBy}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-rose-600 text-sm block">
                                {currency} {exp.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {exp.notes && (
                            <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 my-2 font-medium">
                              {exp.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 mt-1 text-[11px]">
                            <span className="text-slate-500 text-[10px] flex items-center gap-1">
                              <User size={11} className="text-slate-400" />
                              <span>{language === 'SW' ? 'Mhusika:' : 'By:'} <strong>{exp.recordedBy}</strong></span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handlePrintVoucher(exp)}
                                className="p-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
                                title="Chapa Vocha"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(exp)}
                                className="p-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
                                title="Hariri"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(language === 'SW' ? `Je, una uhakika unataka kufuta matumizi haya ya ${exp.title}?` : `Delete expense ${exp.title}?`)) {
                                    deleteExpense(exp.id);
                                  }
                                }}
                                className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition cursor-pointer"
                                title="Futa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md screens) */}
                  <table className="hidden md:table w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10.5px] uppercase tracking-wider font-mono">
                        <th className="py-3 px-4">{language === 'SW' ? 'Tarehe' : 'Date'}</th>
                        <th className="py-3 px-3">{language === 'SW' ? 'Maelezo ya Matumizi' : 'Expense Details'}</th>
                        <th className="py-3 px-3">{language === 'SW' ? 'Kundi' : 'Category'}</th>
                        <th className="py-3 px-3 text-right">{language === 'SW' ? 'Kiasi' : 'Amount'}</th>
                        <th className="py-3 px-3 text-center">{language === 'SW' ? 'Njia ya Malipo' : 'Method'}</th>
                        <th className="py-3 px-3">{language === 'SW' ? 'Mtumiaji / Aliyerekodi' : 'User / Recorder'}</th>
                        <th className="py-3 px-4 text-center">{language === 'SW' ? 'Vitendo' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredExpenses.map(exp => {
                        const config = CATEGORY_CONFIG[exp.category];
                        const Icon = config?.icon || ShoppingBag;

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                              {exp.date}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{exp.title}</div>
                              {exp.notes && <div className="text-[10px] text-slate-500 mt-0.5">{exp.notes}</div>}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${config?.badgeBg} ${config?.badgeText}`}>
                                <Icon size={11} />
                                <span>{language === 'SW' ? config?.labelSw : config?.labelEn}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-rose-600 text-sm whitespace-nowrap">
                              {currency} {exp.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                                {exp.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700 text-[11px] whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 font-semibold border border-slate-200/60">
                                <User size={12} className="text-slate-400" />
                                <span>{exp.recordedBy}</span>
                              </div>
                              {exp.receiptRef && <div className="text-[10px] text-slate-400 font-mono mt-0.5">#{exp.receiptRef}</div>}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePrintVoucher(exp)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                  title={language === 'SW' ? "Chapa Vocha ya Malipo" : "Print Payment Voucher"}
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(exp)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                  title={language === 'SW' ? "Sahihisha" : "Edit"}
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(language === 'SW' ? `Je, una uhakika unataka kufuta matumizi ya ${exp.title}?` : `Delete expense ${exp.title}?`)) {
                                      deleteExpense(exp.id);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                  title={language === 'SW' ? "Futa" : "Delete"}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE                                                 */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingExpense
                      ? (language === 'SW' ? 'Sahihisha Matumizi' : 'Edit Expense')
                      : (language === 'SW' ? 'Rekodi Matumizi Mapya' : 'Record New Expense')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'SW' ? 'Ingiza gharama za duka ili zikatwe kwenye faida ghafi' : 'Log operational costs to balance your P&L'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm shadow-2xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Category Picker Grid */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                  {language === 'SW' ? '1. Chagua Kundi la Matumizi *' : '1. Select Category *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(catKey => {
                    const cfg = CATEGORY_CONFIG[catKey];
                    const Icon = cfg.icon;
                    const isSelected = formCategory === catKey;

                    return (
                      <button
                        type="button"
                        key={catKey}
                        onClick={() => setFormCategory(catKey)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold ring-2 ring-rose-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg ${cfg.badgeBg} ${cfg.color} flex items-center justify-center shrink-0`}>
                          <Icon size={13} />
                        </div>
                        <span className="text-[11px] truncate">
                          {language === 'SW' ? cfg.labelSw : cfg.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Quick Suggestions */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  {language === 'SW' ? '2. Jina / Maelezo ya Matumizi *' : '2. Expense Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'SW' ? 'Mfano: Kodi ya pango Mwezi huu...' : 'e.g. Store Rent for August...'}
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />

                {/* Quick title suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">{language === 'SW' ? 'Mifano:' : 'Suggestions:'}</span>
                  {SUGGESTED_EXPENSE_TITLES.slice(0, 4).map((title, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setFormTitle(title)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded cursor-pointer transition"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount and Date (Two Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    {language === 'SW' ? '3. Kiasi (TZS) *' : '3. Amount (TZS) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  {/* Quick Amount Helpers */}
                  <div className="flex items-center gap-1 mt-1">
                    {[10000, 30000, 50000, 100000].map(amt => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setFormAmount(amt.toString())}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono cursor-pointer"
                      >
                        +{(amt / 1000)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    {language === 'SW' ? '4. Tarehe ya Matumizi' : '4. Expense Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Payment Method and Receipt Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    {language === 'SW' ? '5. Njia ya Malipo' : '5. Payment Method'}
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="CASH">Pesa Taslimu (Cash)</option>
                    <option value="M_PESA">Vodacom M-Pesa</option>
                    <option value="AIRTEL_MONEY">Airtel Money</option>
                    <option value="TIGO_PESA">Tigo Pesa</option>
                    <option value="HALOPESA">HaloPesa</option>
                    <option value="CARD">Kadi ya Benki (Card)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    {language === 'SW' ? 'Namba ya Risiti / Kumbukumbu' : 'Receipt / Ref Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="Mfano: LUKU-8891, TXN-02..."
                    value={formReceiptRef}
                    onChange={e => setFormReceiptRef(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Staff / User Who Incurred or Recorded Expense */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  {language === 'SW' ? '6. Aliyefanya / Aliyerekodi Matumizi (Mtumiaji / Mfanyakazi) *' : '6. User / Staff Responsible *'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Jina la mtumiaji / keshia..."
                      value={formRecordedBy}
                      onChange={e => setFormRecordedBy(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  {allKnownStaffNames.length > 0 && (
                    <select
                      onChange={e => {
                        if (e.target.value) setFormRecordedBy(e.target.value);
                      }}
                      value=""
                      className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="">{language === 'SW' ? 'Chagua Mfanyakazi...' : 'Select Staff...'}</option>
                      {allKnownStaffNames.map((sName, idx) => (
                        <option key={idx} value={sName}>
                          👤 {sName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'SW' ? 'Matumizi yatahesabiwa kwenye ripoti ya kiotomatiki ya mfanyakazi huyu.' : 'Recorded under this user for automatic staff expense reporting.'}
                </p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  {language === 'SW' ? 'Maelezo ya Ziada (Hiari)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'SW' ? 'Maelezo mengineyo kuhusu matumizi haya...' : 'Extra notes about this expense...'}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="py-2.5 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-rose-950/20"
                >
                  {editingExpense
                    ? (language === 'SW' ? 'Hifadhi Mabadiliko' : 'Update Expense')
                    : (language === 'SW' ? 'Hifadhi Matumizi' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MONTHLY BUDGET & OVERSPENDING ALERTS SETTINGS                      */}
      {/* ========================================================================= */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-50 border-b border-indigo-100 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {language === 'SW' ? 'Mpangilio wa Bajeti & Tahadhari' : 'Budget & Alert Settings'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'SW' ? 'Weka viwango vya kukuonya unapotumia pesa kupita kiasi' : 'Set thresholds to alert you on overspending'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm shadow-2xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudgetSettings} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  {language === 'SW' ? 'Kikomo cha Bajeti ya Matumizi kwa Mwezi (TZS)' : 'Monthly Expense Budget (TZS)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={budgetAmount}
                    onChange={e => setBudgetAmount(e.target.value)}
                    className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  {language === 'SW' ? 'Mfumo utakupa tahadhari ya njano ukifikia 80% na nyekundu ukizidisha kiwango hiki.' : 'You will be alerted when reaching 80% or exceeding this limit.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  {language === 'SW' ? 'Kiwango cha Juu cha Asilimia ya Matumizi dhidi ya Mauzo (%)' : 'Max Expense to Sales Ratio (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    required
                    value={maxRatioThreshold}
                    onChange={e => setMaxRatioThreshold(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  {language === 'SW' ? 'Kiwango salama cha duka la rejareja ni kati ya 20% hadi 35%.' : 'Standard retail recommendation is 20% to 35%.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-indigo-950/20"
                >
                  {language === 'SW' ? 'Hifadhi Mipangilio' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
