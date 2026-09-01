import React, { useState, useMemo } from 'react';
import { Customer, DbState, DebtLog, PaymentMethod } from '../types';
import { 
  Users, Search, UserPlus, Phone, Mail, Coins, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Plus, Minus, Trash2, Check, FileText, X, AlertCircle, MessageSquare, Send, ExternalLink, Loader2, BookUser, UploadCloud, Calendar, Clock, AlertTriangle, Bell, Edit3, Filter
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import GoogleContactsModal from './GoogleContactsModal';
import { GoogleContactPerson, createGoogleContact } from '../lib/contacts';
import { getAccessToken } from '../lib/firebase';

export function getDueDateStatus(c: Customer) {
  if (!c.debt || c.debt <= 0) return { type: 'NONE', label: '', daysLeft: null, formattedDate: '' };
  if (!c.dueDate) return { type: 'NO_DUE_DATE', label: 'Haina tarehe ya mwisho', daysLeft: null, formattedDate: '' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(c.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const formattedDate = due.toLocaleDateString('sw-TZ');

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      type: 'OVERDUE',
      label: `Imepitiliza siku ${daysOverdue}`,
      daysLeft: diffDays,
      formattedDate
    };
  } else if (diffDays <= 3) {
    return {
      type: 'DUE_SOON',
      label: diffDays === 0 ? 'Inatakiwa kulipwa LEO!' : `Imebaki siku ${diffDays}`,
      daysLeft: diffDays,
      formattedDate
    };
  } else {
    return {
      type: 'FUTURE',
      label: `Mwisho: ${formattedDate}`,
      daysLeft: diffDays,
      formattedDate
    };
  }
}

interface CustomersViewProps {
  state: DbState;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'debt'>, initialDebt?: number, initialDebtNote?: string, initialDueDate?: string) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  recordDebtLog: (
    customerId: string, 
    type: 'BORROW' | 'PAYMENT', 
    amount: number, 
    note: string, 
    receiptId?: string, 
    newDueDate?: string,
    customTimestamp?: string,
    paymentMethod?: PaymentMethod,
    recordedBy?: string
  ) => void;
}

export default function CustomersView({
  state,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  recordDebtLog
}: CustomersViewProps) {
  const { language, t } = useLanguage();
  const { customers, debtLogs, settings } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerIdForDetails, setSelectedCustomerIdForDetails] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'DEBTORS' | 'DUE_REMINDERS' | 'OVERDUE'>('ALL');

  // Forms states
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState<'BORROW' | 'PAYMENT' | null>(null);
  
  // Google Contacts Modals
  const [isGoogleContactsHubOpen, setIsGoogleContactsHubOpen] = useState(false);
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  const [isSyncingSingleToGoogle, setIsSyncingSingleToGoogle] = useState(false);
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);

  // New Customer Fields
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cInitialDebt, setCInitialDebt] = useState('');
  const [cInitialDebtNote, setCInitialDebtNote] = useState('');
  const [cInitialDueDate, setCInitialDueDate] = useState('');

  // Debt adjustment fields
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNote, setDebtNote] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtPaymentMethod, setDebtPaymentMethod] = useState<PaymentMethod>('CASH');
  const [debtPaymentDate, setDebtPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // WhatsApp dispatch states
  const [waSendStatus, setWaSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [waSendLog, setWaSendLog] = useState('');
  const [waDirectLink, setWaDirectLink] = useState('');

  // Due Date Statistics calculation
  const dueStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let overdueDebt = 0;
    let dueSoonCount = 0;
    let dueSoonDebt = 0;

    customers.forEach(c => {
      if (c.debt > 0 && c.dueDate) {
        const due = new Date(c.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          overdueCount++;
          overdueDebt += c.debt;
        } else if (diffDays <= 3) {
          dueSoonCount++;
          dueSoonDebt += c.debt;
        }
      }
    });

    return {
      overdueCount,
      overdueDebt,
      dueSoonCount,
      dueSoonDebt,
      totalRemindersCount: overdueCount + dueSoonCount
    };
  }, [customers]);

  const handleSendWhatsAppDebtStatement = async (cust: Customer) => {
    if (!cust.phone) {
      alert(language === 'SW' ? 'Mteja hana namba ya simu!' : 'Customer has no phone number!');
      return;
    }

    setWaSendStatus('sending');
    setWaSendLog('');

    const formattedPhone = cust.phone.replace(/[^0-9]/g, '');
    let cleanPhone = formattedPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '255' + cleanPhone.slice(1);
    }

    const logsForCust = debtLogs.filter(l => l.customerId === cust.id).slice(0, 5);
    const logsText = logsForCust.length > 0 
      ? `\n📜 *MIAMALA YA HIVI KARIBUNI:*\n` + logsForCust.map(l => `${l.type === 'BORROW' ? '🔴 Mkopo' : '🟢 Malipo'}: ${settings.currencySymbol} ${l.amount.toLocaleString()} (${new Date(l.timestamp).toLocaleDateString('sw-TZ')}) - ${l.note}`).join('\n')
      : '';

    const dueDateNotice = cust.dueDate 
      ? `\n⏰ *TAREHE YA MWISHO YA KULIPA:* ${new Date(cust.dueDate).toLocaleDateString('sw-TZ')}`
      : '';

    const messageText = `🧾 *KAULI YA DENI / TAARIFA YA MKOPO — ${settings.storeName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
👥 *Mteja:* ${cust.name}
📱 *Simu:* ${cust.phone}
📅 *Tarehe:* ${new Date().toLocaleDateString('sw-TZ')}

💰 *JUMLA YA DENI LINALODAIWA:* *${settings.currencySymbol} ${cust.debt.toLocaleString()}*${dueDateNotice}
${logsText}
━━━━━━━━━━━━━━━━━━━━
Tafadhali kamilisha malipo yako kabla au ifikapo tarehe ya mwisho. Wasiliana nasi kwa maelezo zaidi.
_Imezalishwa na Mfumo wa ${settings.storeName}_`;

    const encodedMsg = encodeURIComponent(messageText);
    const directUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    setWaDirectLink(directUrl);

    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cust.phone,
          message: messageText
        })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }
      if (res.ok && data.delivered === true) {
        setWaSendStatus('success');
        setWaSendLog(language === 'SW' ? 'Ujumbe wa deni umetumwa kwa Meta WhatsApp API!' : 'Debt reminder sent via Meta WhatsApp API!');
      } else {
        setWaSendStatus('success');
        setWaSendLog(language === 'SW' ? 'Kufungua WhatsApp kutuma kumbukumbu ya deni...' : 'Opening WhatsApp to send debt reminder...');
        window.open(data.waLink || directUrl, '_blank');
      }
    } catch (err: any) {
      setWaSendStatus('error');
      setWaSendLog(err.message || 'Error sending via API');
      window.open(directUrl, '_blank');
    }
  };

  // Filter customers by search name/phone and filter tab
  const filteredCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q);
      if (!matchesSearch) return false;

      if (customerFilter === 'DEBTORS') {
        return c.debt > 0;
      }
      if (customerFilter === 'DUE_REMINDERS') {
        if (c.debt <= 0) return false;
        if (!c.dueDate) return false;
        const due = new Date(c.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3; // overdue or due within 3 days
      }
      if (customerFilter === 'OVERDUE') {
        if (c.debt <= 0 || !c.dueDate) return false;
        const due = new Date(c.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 0;
      }

      return true;
    });
  }, [customers, searchQuery, customerFilter]);

  // Overall statistics for ledger
  const totalLedgerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.debt, 0);
  }, [customers]);

  const activeDebtorsCount = useMemo(() => {
    return customers.filter(c => c.debt > 0).length;
  }, [customers]);

  // Detailed Customer Object
  const activeCustomer = customers.find(c => c.id === selectedCustomerIdForDetails);
  
  // Debt Logs for active customer
  const activeCustomerLogs = useMemo(() => {
    if (!selectedCustomerIdForDetails) return [];
    return debtLogs.filter(log => log.customerId === selectedCustomerIdForDetails);
  }, [debtLogs, selectedCustomerIdForDetails]);

  // Google Contacts batch & picker handlers
  const handleImportCustomersBatch = (imported: Array<Omit<Customer, 'id' | 'createdAt' | 'debt'>>) => {
    imported.forEach(c => addCustomer(c));
  };

  const handleSelectContactFromPicker = (contact: GoogleContactPerson) => {
    setCName(contact.displayName || '');
    setCPhone(contact.phone || '');
    setCEmail(contact.email || '');
    const noteItems = [
      contact.company ? `Company: ${contact.company}` : '',
      contact.address ? `Address: ${contact.address}` : '',
      contact.notes ? contact.notes : ''
    ].filter(Boolean).join(' | ');
    setCNotes(noteItems);
  };

  const handleSyncCustomerToGoogle = async (cust: Customer) => {
    const token = await getAccessToken();
    if (!token) {
      setIsGoogleContactsHubOpen(true);
      return;
    }

    setIsSyncingSingleToGoogle(true);
    try {
      const names = cust.name.trim().split(' ');
      const givenName = names[0] || 'Customer';
      const familyName = names.slice(1).join(' ') || '';

      await createGoogleContact(token, {
        givenName,
        familyName,
        phone: cust.phone || undefined,
        email: cust.email || undefined,
        company: settings.storeName || undefined,
        notes: `LedgerBox Customer | Current Debt: ${cust.debt} | Notes: ${cust.notes || ''}`
      });

      setSyncStatusToast(
        language === 'SW' 
          ? `${cust.name} amehifadhiwa kwenye Google Contacts!` 
          : `Synced ${cust.name} to Google Contacts successfully!`
      );
      setTimeout(() => setSyncStatusToast(null), 4000);
    } catch (err: any) {
      console.error('Error syncing customer to Google:', err);
      alert(err.message || 'Failed to sync to Google Contacts');
    } finally {
      setIsSyncingSingleToGoogle(false);
    }
  };

  // Submissions
  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cPhone.trim()) return;

    const initialDebtNum = parseFloat(cInitialDebt);
    const validInitialDebt = (!isNaN(initialDebtNum) && initialDebtNum > 0) ? initialDebtNum : 0;

    addCustomer(
      {
        name: cName.trim(),
        phone: cPhone.trim(),
        email: cEmail.trim(),
        notes: cNotes.trim()
      },
      validInitialDebt,
      cInitialDebtNote.trim() || (validInitialDebt > 0 ? (language === 'SW' ? 'Deni la mwanzo wakati wa kusajili' : 'Initial debt balance') : undefined),
      cInitialDueDate || undefined
    );

    setCName('');
    setCPhone('');
    setCEmail('');
    setCNotes('');
    setCInitialDebt('');
    setCInitialDebtNote('');
    setCInitialDueDate('');
    setIsAddingCustomer(false);
  };

  const handleDebtActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerIdForDetails || !showDebtForm || !debtAmount.trim()) return;

    const amt = parseFloat(debtAmount);
    if (isNaN(amt) || amt <= 0) return;

    const paymentTimestamp = debtPaymentDate 
      ? `${debtPaymentDate}T${new Date().toTimeString().split(' ')[0]}`
      : undefined;

    recordDebtLog(
      selectedCustomerIdForDetails,
      showDebtForm,
      amt,
      debtNote.trim() || (showDebtForm === 'BORROW' ? 'Manual credit allocation' : 'Debt repayment manual entry'),
      undefined,
      debtDueDate || undefined,
      paymentTimestamp,
      showDebtForm === 'PAYMENT' ? debtPaymentMethod : 'CREDIT'
    );

    setDebtAmount('');
    setDebtNote('');
    setDebtDueDate('');
    setDebtPaymentMethod('CASH');
    setDebtPaymentDate(new Date().toISOString().split('T')[0]);
    setShowDebtForm(null);
  };

  return (
    <div id="customers-wrapper" className="p-3 sm:p-4 lg:p-6 flex flex-col md:flex-row gap-4 md:gap-6 h-full overflow-y-auto md:overflow-hidden font-sans bg-slate-50">
      
      {/* Customers List & KPI section (Left Column) */}
      <div className={`flex-1 flex flex-col min-w-0 md:h-full shrink-0 md:shrink ${selectedCustomerIdForDetails ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Page Titles */}
        <div className="mb-3 sm:mb-4 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{t('customersTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('customersSub')}</p>
        </div>

        {/* KPI Summaries Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3 shrink-0">
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'SW' ? 'Jumla ya Mikopo' : 'Total Outstanding Debt'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-red-700 font-mono">
                {settings.currencySymbol} {totalLedgerDebt.toLocaleString()}
              </h3>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-700 shrink-0">
              <Coins size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'SW' ? 'Wateja Wakopaji' : 'Active Debtors'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-950 font-mono">
                {activeDebtorsCount} {language === 'SW' ? 'wateja' : 'customers'}
              </h3>
            </div>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 shrink-0">
              <Users size={16} />
            </div>
          </div>

          <div 
            onClick={() => setCustomerFilter(customerFilter === 'DUE_REMINDERS' ? 'ALL' : 'DUE_REMINDERS')}
            className={`col-span-2 sm:col-span-1 border p-3.5 rounded-xl shadow-2xs flex items-center justify-between cursor-pointer transition ${
              dueStats.totalRemindersCount > 0 
                ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/80' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                <Bell size={12} className={dueStats.totalRemindersCount > 0 ? "text-rose-600 animate-bounce" : "text-slate-400"} />
                {language === 'SW' ? 'Arifa za Due Date' : 'Due Date Reminders'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-rose-700 font-mono">
                {dueStats.totalRemindersCount} {language === 'SW' ? 'arifa' : 'alerts'}
              </h3>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              dueStats.totalRemindersCount > 0 ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
            }`}>
              <Clock size={16} />
            </div>
          </div>
        </div>

        {/* DUE DATE REMINDERS ALERT BANNER */}
        {dueStats.totalRemindersCount > 0 && (
          <div className="mb-3.5 p-3.5 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/90 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={16} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span>{language === 'SW' ? 'Wateja Wanaodaiwa Wanaokaribia/Waliopitiliza Siku za Kulipa' : 'Debtors Approaching or Overdue Payment Dates'}</span>
                  <span className="bg-rose-600 text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {dueStats.totalRemindersCount}
                  </span>
                </h4>
                <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-2">
                  {dueStats.overdueCount > 0 && (
                    <span className="text-red-700 font-extrabold flex items-center gap-1">
                      🔴 {dueStats.overdueCount} {language === 'SW' ? 'wamepitiliza tarehe' : 'overdue'} ({settings.currencySymbol} {dueStats.overdueDebt.toLocaleString()})
                    </span>
                  )}
                  {dueStats.dueSoonCount > 0 && (
                    <span className="text-amber-800 font-extrabold flex items-center gap-1">
                      🟡 {dueStats.dueSoonCount} {language === 'SW' ? 'wanatakiwa kulipwa siku 3 zijazo' : 'due in 3 days'} ({settings.currencySymbol} {dueStats.dueSoonDebt.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setCustomerFilter(customerFilter === 'DUE_REMINDERS' ? 'ALL' : 'DUE_REMINDERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                customerFilter === 'DUE_REMINDERS'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white hover:bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {customerFilter === 'DUE_REMINDERS' 
                ? (language === 'SW' ? 'Onyesha Wateja Wote' : 'Show All Customers') 
                : (language === 'SW' ? 'Onyesha Arifa Hizi Pekee' : 'View Reminders Only')}
            </button>
          </div>
        )}

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 mb-3 shrink-0 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 shrink-0 flex items-center gap-1">
            <Filter size={11} />
            {language === 'SW' ? 'Chuja:' : 'Filter:'}
          </span>
          <button
            onClick={() => setCustomerFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              customerFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {language === 'SW' ? 'Wateja Wote' : 'All Customers'} ({customers.length})
          </button>
          <button
            onClick={() => setCustomerFilter('DEBTORS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              customerFilter === 'DEBTORS'
                ? 'bg-red-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {language === 'SW' ? 'Wanaodaiwa' : 'With Debt'} ({activeDebtorsCount})
          </button>
          <button
            onClick={() => setCustomerFilter('DUE_REMINDERS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              customerFilter === 'DUE_REMINDERS'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50 hover:border-rose-300'
            }`}
          >
            <Clock size={12} className={customerFilter === 'DUE_REMINDERS' ? 'text-white' : 'text-rose-600'} />
            <span>{language === 'SW' ? 'Arifa za Due Date' : 'Due Date Alerts'}</span>
            {dueStats.totalRemindersCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                customerFilter === 'DUE_REMINDERS' ? 'bg-white text-rose-800' : 'bg-rose-600 text-white'
              }`}>
                {dueStats.totalRemindersCount}
              </span>
            )}
          </button>
          {dueStats.overdueCount > 0 && (
            <button
              onClick={() => setCustomerFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                customerFilter === 'OVERDUE'
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle size={12} className="text-red-600" />
              <span>{language === 'SW' ? 'Imepitiliza' : 'Overdue'} ({dueStats.overdueCount})</span>
            </button>
          )}
        </div>

        {/* Searching filter controls & trigger adding card */}
        <div className="flex flex-wrap gap-2.5 mb-3.5 shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
            <input
              id="customer-search-input"
              type="text"
              placeholder={language === 'SW' ? "Tafuta mteja kwa jina au simu..." : "Search customer by name or phone..."}
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-805 text-xs focus:bg-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            id="open-google-contacts-hub-btn"
            onClick={() => setIsGoogleContactsHubOpen(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Sawazisha au agiza kutoka Google Contacts"
          >
            <BookUser size={14} className="text-blue-600" />
            <span>Google Contacts</span>
          </button>
          
          <button
            id="add-customer-trigger-btn"
            onClick={() => setIsAddingCustomer(true)}
            className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <UserPlus size={14} />
            {language === 'SW' ? 'Sajili Mteja / Anaekopa' : 'New Customer / Debtor'}
          </button>
        </div>

        {/* Customer Listing Section */}
        <div id="customers-list-box" className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 bg-white/50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
              <Users size={24} className="mb-2 text-slate-300" />
              <p className="text-xs">
                {language === 'SW' ? 'Hakuna mteja anayelingana na ombi lako.' : 'No customers match your search.'}
              </p>
            </div>
          ) : (
            filteredCustomers.map(c => {
              const active = selectedCustomerIdForDetails === c.id;
              const dueStatus = getDueDateStatus(c);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerIdForDetails(active ? null : c.id);
                    setShowDebtForm(null);
                  }}
                  className={`p-3.5 bg-white border rounded-xl hover:shadow-xs transition flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 cursor-pointer ${
                    active 
                      ? 'border-slate-800 ring-1 ring-slate-800/10' 
                      : dueStatus.type === 'OVERDUE'
                      ? 'border-red-300 bg-red-50/20'
                      : dueStatus.type === 'DUE_SOON'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1 fill-none flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{c.name}</h4>
                      {c.debt > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded">
                          {language === 'SW' ? 'ANADAIWA' : 'OWES'}
                        </span>
                      )}

                      {/* DUE DATE BADGE ON CARD */}
                      {dueStatus.type === 'OVERDUE' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 text-[10px] font-extrabold rounded-md flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={11} className="text-red-600" />
                          <span>{dueStatus.label} ({dueStatus.formattedDate})</span>
                        </span>
                      )}
                      {dueStatus.type === 'DUE_SOON' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                          <Clock size={11} className="text-amber-700" />
                          <span>{dueStatus.label} ({dueStatus.formattedDate})</span>
                        </span>
                      )}
                      {dueStatus.type === 'FUTURE' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <Calendar size={11} className="text-slate-500" />
                          <span>{dueStatus.label}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2.5 text-[11px] text-slate-500 font-medium pt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone size={10} /> {c.phone}
                      </span>
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                    {/* Quick WhatsApp Reminder Button on card for overdue/due soon */}
                    {(dueStatus.type === 'OVERDUE' || dueStatus.type === 'DUE_SOON') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendWhatsAppDebtStatement(c);
                        }}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        title="Tuma Arifa ya WhatsApp"
                      >
                        <MessageSquare size={13} className="text-emerald-600" />
                        <span className="text-[10px] hidden lg:inline">{language === 'SW' ? 'Arifa' : 'Remind'}</span>
                      </button>
                    )}

                    <div className="sm:text-right">
                      <span className="text-[9.5px] font-medium text-slate-400 uppercase tracking-widest block">
                        {language === 'SW' ? 'Deni Lote' : 'Total Debt'}
                      </span>
                      <span className={`font-mono font-black text-sm ${c.debt > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                        {settings.currencySymbol} {c.debt.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600">
                      {active ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Full Details and Debt Ledger Form (Right Column, display when customer is selected) */}
      <div id="customer-details-sidepanel" className={`w-full md:w-[350px] bg-white border border-slate-200 rounded-xl shadow-2xs md:h-full shrink-0 flex flex-col overflow-hidden font-sans ${selectedCustomerIdForDetails ? 'flex' : 'hidden md:flex'}`}>
        {activeCustomer ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Header customer card */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{activeCustomer.name}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">LedgerBox Customer Portal</p>
              </div>
              <button
                id="close-details-panel-btn"
                onClick={() => { setSelectedCustomerIdForDetails(null); setShowDebtForm(null); }}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable workspace */}
            <div className="flex-1 overflow-y-auto p-4.5 space-y-4">
              
              {/* Debt block info */}
              <div className="p-4 rounded-xl border text-center shadow-xs bg-slate-55 overflow-hidden flex flex-col justify-center border-slate-200 bg-slate-50/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'SW' ? 'Hali ya Deni la Mteja' : 'Customer Debt Balance'}
                </span>
                <h1 className={`text-2xl font-black mt-1 leading-none ${activeCustomer.debt > 0 ? 'text-red-700 font-mono' : 'text-slate-800'}`}>
                  {settings.currencySymbol} {activeCustomer.debt.toLocaleString()}
                </h1>
                
                {activeCustomer.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-2.5 border-t border-slate-100 pt-2">
                    "{activeCustomer.notes}"
                  </p>
                )}
              </div>

              {/* PAYMENT DUE DATE CARD IN SIDEPANEL */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-600" />
                    {language === 'SW' ? 'Tarehe ya Mwisho ya Kulipa' : 'Payment Due Date'}
                  </span>
                  {activeCustomer.dueDate && (
                    <button
                      type="button"
                      onClick={() => {
                        updateCustomer({ ...activeCustomer, dueDate: undefined });
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                    >
                      {language === 'SW' ? 'Ondoa Tarehe' : 'Clear Date'}
                    </button>
                  )}
                </div>

                <input
                  id="active-customer-due-date-input"
                  type="date"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-slate-800"
                  value={activeCustomer.dueDate ? activeCustomer.dueDate.split('T')[0] : ''}
                  onChange={(e) => {
                    updateCustomer({ ...activeCustomer, dueDate: e.target.value || undefined });
                  }}
                />

                {activeCustomer.debt > 0 && (
                  <div>
                    {(() => {
                      const st = getDueDateStatus(activeCustomer);
                      if (st.type === 'OVERDUE') {
                        return (
                          <div className="p-2 bg-red-100 text-red-900 border border-red-200 rounded-lg text-[11px] font-bold flex items-center justify-between mt-1">
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={13} className="text-red-700 animate-bounce" />
                              <span>{st.label}!</span>
                            </span>
                            <span className="font-mono text-[9px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded uppercase font-black">
                              OVERDUE
                            </span>
                          </div>
                        );
                      } else if (st.type === 'DUE_SOON') {
                        return (
                          <div className="p-2 bg-amber-100 text-amber-950 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center justify-between mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-amber-800" />
                              <span>{st.label}</span>
                            </span>
                            <span className="font-mono text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded uppercase font-black">
                              DUE SOON
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Action buttons (Lipa, Kukopesha) */}
              {showDebtForm ? (
                <form id="record-debt-action-form" onSubmit={handleDebtActionSubmit} className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <h5 className={`font-bold uppercase tracking-wide text-[10.5px] ${showDebtForm === 'BORROW' ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {showDebtForm === 'BORROW' 
                        ? (language === 'SW' ? 'Sajili Mkopo Mpya (+)' : 'Issue New Credit (+)')
                        : (language === 'SW' ? 'Pokea Malipo (-)' : 'Receive Payment (-)')}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowDebtForm(null)}
                      className="text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      {language === 'SW' ? 'Ghairi' : 'Cancel'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? `Kiasi cha Pesa (${settings.currencySymbol}) *` : `Amount (${settings.currencySymbol}) *`}
                    </label>
                    <input
                      id="debt-amount-input"
                      type="number"
                      required
                      min="1"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-slate-805"
                      placeholder="1000"
                      value={debtAmount}
                      onChange={e => setDebtAmount(e.target.value)}
                    />
                  </div>

                  {/* Payment Method & Date for Debt Repayments */}
                  {showDebtForm === 'PAYMENT' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                            {language === 'SW' ? 'Njia ya Malipo' : 'Payment Method'}
                          </label>
                          <select
                            value={debtPaymentMethod}
                            onChange={e => setDebtPaymentMethod(e.target.value as PaymentMethod)}
                            className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="CASH">Cash (Taslimu)</option>
                            <option value="M-PESA">M-Pesa</option>
                            <option value="TIGO-PESA">Tigo Pesa</option>
                            <option value="AIRTEL-MONEY">Airtel Money</option>
                            <option value="HALOPESA">HaloPesa</option>
                            <option value="CARD">Bank / Card</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                            {language === 'SW' ? 'Tarehe ya Malipo' : 'Payment Date'}
                          </label>
                          <input
                            type="date"
                            className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={debtPaymentDate}
                            onChange={e => setDebtPaymentDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-medium">
                        💡 {language === 'SW' 
                          ? 'Malipo haya yatahusishwa na kusawazishwa moja kwa moja kwenye mauzo ya tarehe uliyochagua.' 
                          : 'This payment will be automatically synced with the sales of the chosen date.'}
                      </div>
                    </>
                  )}

                  {/* Due Date field on borrowing */}
                  {showDebtForm === 'BORROW' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                          <Calendar size={12} />
                          {language === 'SW' ? 'Tarehe ya Mwisho ya Kulipa (Due Date - Hiari)' : 'Payment Due Date (Optional)'}
                        </label>
                        <input
                          id="debt-due-date-input"
                          type="date"
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          value={debtDueDate}
                          onChange={e => setDebtDueDate(e.target.value)}
                        />
                      </div>
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium">
                        ⚠️ {language === 'SW' 
                          ? 'Deni hili halitahesabiwa kwenye mauzo ya leo hadi litakapolipwa au kupunguzwa.' 
                          : 'This credit will not be added to today sales until it is paid or reduced.'}
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Maelezo/Sababu (Maoni)' : 'Description / Reason'}
                    </label>
                    <input
                      id="debt-note-input"
                      type="text"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                      placeholder={language === 'SW' ? "Mfano: Amelipa nusu kwa M-pesa au amechukua soda" : "e.g. Paid half via M-Pesa or took soda"}
                      value={debtNote}
                      onChange={e => setDebtNote(e.target.value)}
                    />
                  </div>

                  <button
                    id="submit-debt-action-btn"
                    type="submit"
                    className={`w-full py-2 font-bold text-white text-xs rounded-lg shadow-sm transition cursor-pointer uppercase tracking-wider ${
                      showDebtForm === 'BORROW'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {language === 'SW' ? 'Hifadhi Mabadiliko' : 'Save Changes'}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    id="trigger-borrow-form-btn"
                    onClick={() => setShowDebtForm('BORROW')}
                    className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    {language === 'SW' ? 'Ongeza Mkopo' : 'Add Debt'}
                  </button>

                  <button
                    id="trigger-payment-form-btn"
                    onClick={() => setShowDebtForm('PAYMENT')}
                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Minus size={14} />
                    {language === 'SW' ? 'Pokea Malipo' : 'Pay Debt'}
                  </button>
                </div>
              )}

              {/* Send Debt Statement via WhatsApp */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <button
                  id="send-whatsapp-debt-statement-btn"
                  onClick={() => handleSendWhatsAppDebtStatement(activeCustomer)}
                  disabled={waSendStatus === 'sending'}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {waSendStatus === 'sending' ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      {language === 'SW' ? 'Inatuma Risiti ya Deni WhatsApp...' : 'Sending Debt Reminder...'}
                    </>
                  ) : (
                    <>
                      <MessageSquare size={15} />
                      {language === 'SW' ? 'Tuma Risiti/Taarifa ya Deni (WhatsApp)' : 'Send Debt Statement (WhatsApp)'}
                    </>
                  )}
                </button>

                {/* Sync to Google Contacts Button */}
                <button
                  id="sync-customer-to-google-btn"
                  onClick={() => handleSyncCustomerToGoogle(activeCustomer)}
                  disabled={isSyncingSingleToGoogle}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSyncingSingleToGoogle ? (
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  ) : (
                    <UploadCloud size={14} className="text-blue-600" />
                  )}
                  <span>
                    {isSyncingSingleToGoogle 
                      ? (language === 'SW' ? 'Inahifadhi Google Contacts...' : 'Saving to Google Contacts...') 
                      : (language === 'SW' ? 'Sawazisha na Google Contacts' : 'Sync to Google Contacts')}
                  </span>
                </button>

                {syncStatusToast && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>{syncStatusToast}</span>
                  </div>
                )}

                {waSendLog && (
                  <div className={`mt-2 p-2 rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 ${
                    waSendStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <span>{waSendLog}</span>
                    {waDirectLink && (
                      <a 
                        href={waDirectLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline font-bold text-emerald-700 flex items-center gap-1 shrink-0 hover:text-emerald-900"
                      >
                        <ExternalLink size={12} />
                        {language === 'SW' ? 'Fungua WhatsApp' : 'Open WhatsApp'}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Debt Activities Logs Audit trailing */}
              <div className="border-t border-slate-100 pt-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  <FileText size={12} />
                  {language === 'SW' ? 'Kumbukumbu za Mikopo (History Log)' : 'Debt Ledger History Log'}
                </div>

                {activeCustomerLogs.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-400 py-4 italic">
                    {language === 'SW' ? 'Hakuna kumbukumbu bado.' : 'No log history found.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeCustomerLogs.map((log) => {
                      const isBorrow = log.type === 'BORROW';

                      return (
                        <div 
                          key={log.id} 
                          className={`p-2.5 rounded-lg border text-xs leading-normal flex flex-col justify-between hover:shadow-2xs transition ${
                            isBorrow 
                              ? 'bg-amber-50/50 border-amber-100' 
                              : 'bg-emerald-50/50 border-emerald-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-extrabold text-[10px] uppercase ${isBorrow ? 'text-amber-800' : 'text-emerald-800'}`}>
                              {isBorrow 
                                ? (language === 'SW' ? 'Amekopa (+)' : 'Borrowed (+)')
                                : (language === 'SW' ? 'Amelipa (-)' : 'Paid (-)')}
                            </span>
                            <span className="text-[9.5px] text-slate-400">{new Date(log.timestamp).toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US')}</span>
                          </div>
                          
                          <p className="text-slate-700 font-medium">{log.note}</p>
                          <p className="font-mono font-bold text-slate-900 mt-1">
                            {isBorrow ? '+' : '-'}{settings.currencySymbol} {log.amount.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Deletion button if depth is empty */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  id="delete-customer-btn"
                  onClick={() => {
                    const confirmMsg = language === 'SW'
                      ? `Una uhakika unataka kufuta rekodi ya mteja ${activeCustomer.name}? Kupoteza rekodi hakuwezi kurejeshwa.`
                      : `Are you sure you want to permanently delete customer ${activeCustomer.name}? This action cannot be undone.`;
                    if (confirm(confirmMsg)) {
                      deleteCustomer(activeCustomer.id);
                      setSelectedCustomerIdForDetails(null);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10.5px] font-bold border border-red-100 flex items-center gap-1 transition"
                >
                  <Trash2 size={11} />
                  {language === 'SW' ? 'Futa Mteja Huyu' : 'Delete Customer'}
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* Empty State details drawer */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 font-sans h-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-350 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h4 className="font-bold text-slate-700 text-xs">
              {language === 'SW' ? 'Chagua Mteja' : 'Select Customer'}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-relaxed">
              {language === 'SW'
                ? 'Gusa jina la mteja upande wa kushoto ili kuona faili lake, kufanya marekebisho, kuongeza deni, au kupokea malipo yake.'
                : 'Select a customer from the left list to view their transaction history, add new credit, or register debt payments.'}
            </p>
          </div>
        )}
      </div>

      {/* New customer popover Form Overlay (Displays when isAddingCustomer is true) */}
      {isAddingCustomer && (
        <div id="add-customer-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 max-w-sm w-full shadow-xl font-sans max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'SW' ? 'Sajili Mteja / Mtu Anaekopa' : 'Register Customer / Debtor'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === 'SW' ? 'Weka taarifa za mteja na kiasi cha deni anachokopa.' : 'Enter customer details and optional initial debt amount.'}
                </p>
              </div>
              <button
                id="close-add-customer-btn"
                onClick={() => setIsAddingCustomer(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Autofill from Google Contacts banner */}
            <div className="flex items-center justify-between bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/70 mb-3 text-xs">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <BookUser size={15} className="text-blue-600 shrink-0" />
                <span className="text-[11px]">{language === 'SW' ? 'Kutoka Google Contacts:' : 'From Google Contacts:'}</span>
              </div>
              <button
                type="button"
                id="autofill-customer-from-google-btn"
                onClick={() => setIsGooglePickerOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-bold transition cursor-pointer shadow-2xs"
              >
                {language === 'SW' ? 'Chagua Mteja' : 'Pick Contact'}
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-3 text-xs text-slate-700">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Jina Kamili la Mteja / Anaekopa *' : 'Full Name *'}
                </label>
                <input
                  id="new-cust-name"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white font-medium"
                  placeholder={language === 'SW' ? "Mfano: Mama Brayan" : "e.g. John Doe"}
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Namba ya Simu *' : 'Phone Number *'}
                </label>
                <input
                  id="new-cust-phone"
                  type="tel"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-805 font-medium"
                  placeholder={language === 'SW' ? "Mfano: 0712345678" : "e.g. 0712345678"}
                  value={cPhone}
                  onChange={e => setCPhone(e.target.value)}
                />
              </div>

              {/* Initial Debt / Borrow Section */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10.5px] font-extrabold text-amber-900 uppercase">
                    {language === 'SW' ? 'Deni la Mwanzo / Kiasi Anachokopa' : 'Initial Debt / Borrowed Amount'}
                  </label>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                    {language === 'SW' ? 'Hiari' : 'Optional'}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2 text-[11px] font-bold text-amber-800">
                    {settings.currencySymbol}
                  </span>
                  <input
                    id="new-cust-initial-debt"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full pl-10 pr-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    placeholder="0"
                    value={cInitialDebt}
                    onChange={e => setCInitialDebt(e.target.value)}
                  />
                </div>

                {parseFloat(cInitialDebt) > 0 && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">
                        {language === 'SW' ? 'Sababu au Maelezo ya Mkopo' : 'Reason / Credit Note'}
                      </label>
                      <input
                        id="new-cust-initial-debt-note"
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder={language === 'SW' ? "Mfano: Mkopo wa mchele kilo 25 au deni la nyuma" : "e.g. Credit sale of items or previous balance"}
                        value={cInitialDebtNote}
                        onChange={e => setCInitialDebtNote(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        <Calendar size={12} />
                        {language === 'SW' ? 'Tarehe ya Mwisho ya Kulipa (Due Date)' : 'Payment Due Date'}
                      </label>
                      <input
                        id="new-cust-initial-due-date"
                        type="date"
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        value={cInitialDueDate}
                        onChange={e => setCInitialDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-amber-800/90 leading-tight">
                  {language === 'SW'
                    ? 'Weka kiasi ikiwa mtu huyu anachukua bidhaa za mkopo au ana deni tayari wakati wa kusajiliwa.'
                    : 'Set amount if this customer is taking credit or already owes a balance at registration.'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Barua Pepe (Email - Hiari)' : 'Email Address (Optional)'}
                </label>
                <input
                  id="new-cust-email"
                  type="email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  placeholder="brayan@mteja.com"
                  value={cEmail}
                  onChange={e => setCEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Maelezo Mengine (Notes)' : 'Additional Notes'}
                </label>
                <textarea
                  id="new-cust-notes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  rows={2}
                  placeholder={language === 'SW' ? "Kikomo cha mkopo, anuani, au tabia za malipo" : "Credit limit, address, or payment behavior notes"}
                  value={cNotes}
                  onChange={e => setCNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                <button
                  id="new-cust-cancel"
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg text-xs"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  id="new-cust-submit"
                  type="submit"
                  className="px-4.5 py-2 bg-slate-850 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition shadow-sm"
                >
                  {language === 'SW' ? 'Hifadhi Mteja / Anaekopa' : 'Save Customer / Debtor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Contacts Hub Modal */}
      <GoogleContactsModal
        isOpen={isGoogleContactsHubOpen}
        onClose={() => setIsGoogleContactsHubOpen(false)}
        state={state}
        onImportCustomers={handleImportCustomersBatch}
      />

      {/* Google Contacts Picker Modal for Autofilling Form */}
      <GoogleContactsModal
        isOpen={isGooglePickerOpen}
        onClose={() => setIsGooglePickerOpen(false)}
        state={state}
        pickerMode={true}
        pickerTarget="customer"
        onSelectContactForFill={handleSelectContactFromPicker}
      />

    </div>
  );
}
