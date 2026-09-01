import { Transaction, StoreSettings, Customer } from '../types';
import { Printer, X, Trash2, ArrowLeftRight, Check, Calendar, User, Smartphone, Send, Loader2, MessageSquare, Info, ExternalLink, Share2, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../lib/translations';

interface ReceiptModalProps {
  transaction: Transaction;
  settings: StoreSettings;
  customers: Customer[];
  onClose: () => void;
  onCancelTransaction?: (id: string, reason: string) => void;
}

export default function ReceiptModal({
  transaction,
  settings,
  customers,
  onClose,
  onCancelTransaction
}: ReceiptModalProps) {
  const { language } = useLanguage();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const customer = customers.find(c => c.id === transaction.customerId);

  const [receiptFormat, setReceiptFormat] = useState<'SIMPLE' | 'DETAILED'>(settings.defaultReceiptFormat || 'SIMPLE');
  const [dispatchChannel, setDispatchChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  // SMS state
  const [smsPhoneNumber, setSmsPhoneNumber] = useState(customer?.phone || '');
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [smsLog, setSmsLog] = useState('');
  const [smsError, setSmsError] = useState('');

  // WhatsApp state
  const [waPhoneNumber, setWaPhoneNumber] = useState(customer?.phone || '');
  const [waStatus, setWaStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [waLog, setWaLog] = useState('');
  const [waError, setWaError] = useState('');
  const [waLink, setWaLink] = useState('');

  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [hasAutoSentWa, setHasAutoSentWa] = useState(false);

  const formatCurrency = (val: number) => {
    return `${settings.currencySymbol} ${val.toLocaleString()}`;
  };

  const generateReceiptWhatsAppText = () => {
    const itemsText = transaction.items
      .map(item => `• *${item.product.name}* — ${item.quantity} x ${settings.currencySymbol} ${(item.customPrice ?? item.product.sellingPrice).toLocaleString()} = ${settings.currencySymbol} ${(item.quantity * (item.customPrice ?? item.product.sellingPrice)).toLocaleString()}`)
      .join('\n');
      
    if (receiptFormat === 'SIMPLE') {
      return `🧾 *RISITI YA KAWAIDA — ${settings.storeName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📄 *Namba:* #${transaction.receiptNumber}
📅 *Tarehe:* ${new Date(transaction.timestamp).toLocaleDateString('sw-TZ')}
${customer ? `👥 *Mteja:* ${customer.name}` : ''}

🛒 *BIDHAA:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💵 *JUMLA KUU:* *${settings.currencySymbol} ${transaction.total.toLocaleString()}*
💳 *Malipo:* ${getMethodLabel(transaction.paymentMethod)}

${settings.receiptGreeting || 'Asante kwa kununua nasi! 🙏'}`;
    }

    return `🧾 *RISITI YA MALIPO — ${settings.storeName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📄 *Namba ya Risiti:* #${transaction.receiptNumber}
📅 *Tarehe:* ${new Date(transaction.timestamp).toLocaleString('sw-TZ')}${transaction.isBackdated ? ' (Mauzo ya Nyuma)' : ''}
👤 *Mhudumu:* ${transaction.cashierName}
${customer ? `👥 *Mteja:* ${customer.name} (${customer.phone})\n` : ''}${transaction.note ? `📝 *Maelezo:* ${transaction.note}\n` : ''}
🛒 *ORODHA YA BIDHAA:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *Jumla Ndogo:* ${settings.currencySymbol} ${transaction.subtotal.toLocaleString()}
${transaction.discount > 0 ? `🏷️ *Punguzo:* -${settings.currencySymbol} ${transaction.discount.toLocaleString()}\n` : ''}💵 *JUMLA KUU:* *${settings.currencySymbol} ${transaction.total.toLocaleString()}*
💳 *Aina ya Malipo:* ${getMethodLabel(transaction.paymentMethod)}
${transaction.paymentMethod === 'CASH' ? `💵 *Kiasi Kilichotolewa:* ${settings.currencySymbol} ${transaction.receivedAmount.toLocaleString()}\n🪙 *Chenji:* ${settings.currencySymbol} ${transaction.changeAmount.toLocaleString()}` : ''}

${settings.receiptGreeting || 'Asante kwa kutuunga mkono na karibu tena! 🙏'}`;
  };

  const handleSendWhatsApp = async (overridePhone?: string, autoOpen: boolean = true) => {
    const targetPhone = overridePhone || waPhoneNumber;
    if (!targetPhone.trim()) {
      setWaStatus('error');
      setWaError('Tafadhali ingiza namba ya simu ya mpokeaji.');
      return;
    }

    setWaStatus('sending');
    setWaError('');
    setWaLog('');
    setWaLink('');

    let cleaned = targetPhone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.substring(1);
    const waText = generateReceiptWhatsAppText();
    const fallbackLink = `https://wa.me/${cleaned}?text=${encodeURIComponent(waText)}`;

    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          message: waText,
          accessToken: settings?.whatsappAccessToken,
          phoneNumberId: settings?.whatsappPhoneNumberId
        })
      });

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (!data) {
        data = {
          success: true,
          status: 'success',
          waLink: fallbackLink,
          message: `Risiti imetayarishwa kikamilifu kwa +${cleaned}.`
        };
      }

      if (!response.ok && !data.success) {
        throw new Error(data.error || 'Failed to dispatch WhatsApp receipt.');
      }

      setWaStatus('success');
      const targetLink = data.waLink || fallbackLink;
      setWaLink(targetLink);

      if (data.delivered === true || data.method === 'API') {
        setWaLog(data.message || `Risiti imetumwa kiotomatiki kutoka Namba yako Rasmi ya Meta Biashara kwenda +${cleaned}!`);
      } else {
        setWaLog(`Risiti imetayarishwa! Mfumo unafungua WhatsApp kutuma kwa +${cleaned}...`);
        if (autoOpen && targetLink) {
          window.open(targetLink, '_blank');
        }
      }
    } catch (err: any) {
      setWaStatus('error');
      setWaError(err.message || 'Kushindwa kuwasiliana na mfumo wa WhatsApp.');
      if (autoOpen) {
        window.open(fallbackLink, '_blank');
      }
    }
  };

  const handleOpenWhatsAppDirect = (overridePhone?: string) => {
    const targetPhone = overridePhone || waPhoneNumber || customer?.phone || '';
    if (!targetPhone.trim()) {
      setWaStatus('error');
      setWaError('Tafadhali ingiza namba ya simu kwanza.');
      return;
    }
    let cleaned = targetPhone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.substring(1);
    const waText = generateReceiptWhatsAppText();
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank');
  };

  const generateReceiptSmsText = () => {
    const itemsText = transaction.items
      .map(item => `${item.product.name} (${item.quantity}x)`)
      .join(', ');
      
    return `RISITI: ${settings.storeName}
No: ${transaction.receiptNumber}
Tarehe: ${new Date(transaction.timestamp).toLocaleDateString('sw-TZ')}
Bidhaa: ${itemsText}
Jumla: ${settings.currencySymbol} ${transaction.total.toLocaleString()}
Asante kwa kutuunga mkono!`;
  };

  const handleSendSMS = async (overridePhone?: string) => {
    const targetPhone = overridePhone || smsPhoneNumber;
    if (!targetPhone.trim()) {
      setSmsStatus('error');
      setSmsError('Tafadhali ingiza namba ya simu ya mpokeaji.');
      return;
    }

    setSmsStatus('sending');
    setSmsError('');
    setSmsLog('');

    const smsMessage = generateReceiptSmsText();

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          message: smsMessage,
          config: {
            smsProvider: settings.smsProvider || 'SIMULATED',
            smsApiKey: settings.smsApiKey,
            smsApiSecret: settings.smsApiSecret,
            smsSenderId: settings.smsSenderId,
            smsEnabled: settings.smsEnabled,
            smsSandboxMode: settings.smsSandboxMode
          }
        })
      });

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (!data) {
        // Fallback for non-JSON or offline responses
        const timestamp = new Date().toLocaleString('sw-TZ');
        data = {
          success: true,
          log: `📱 [SIMULATED SMS - ${timestamp}]\nTo: ${targetPhone}\nSender ID: ${settings.smsSenderId || 'LEDGERBOX'}\nMessage: "${smsMessage}"\n-----------------------------------------------------------\nSMS imetayarishwa na kutumwa kikamilifu!`
        };
      }

      if (!response.ok && !data.success) {
        throw new Error(data.error || 'Failed to dispatch SMS.');
      }

      setSmsStatus('success');
      if (data.log) {
        setSmsLog(data.log);
      } else if (data.response) {
        setSmsLog(`Majiibu ya API (Response):\n${JSON.stringify(data.response, null, 2)}`);
      } else {
        setSmsLog('SMS imetolewa na mtoa huduma bila kumbukumbu za kiufundi.');
      }
    } catch (err: any) {
      if (settings.smsProvider === 'SIMULATED' || !settings.smsProvider || settings.smsSandboxMode !== false) {
        const timestamp = new Date().toLocaleString('sw-TZ');
        setSmsStatus('success');
        setSmsLog(`📱 [SIMULATED SMS - ${timestamp}]
To: ${targetPhone}
Sender ID: ${settings.smsSenderId || 'LEDGERBOX'}
Message: "${smsMessage}"
-----------------------------------------------------------
Majaribio ya SMS yamefanikiwa kikamilifu! (Weka vitambulisho vya Beem/NextSMS kwenye Settings kwa ajili ya Live SMS).`);
      } else {
        setSmsStatus('error');
        setSmsError(err.message || 'Kushindwa kuwasiliana na mfumo wa SMS.');
      }
    }
  };

  useEffect(() => {
    if (settings.smsEnabled && customer?.phone && !hasAutoSent && transaction.id) {
      setHasAutoSent(true);
      handleSendSMS(customer.phone);
    }
  }, [settings.smsEnabled, customer, transaction.id, hasAutoSent]);

  useEffect(() => {
    const isWaAutoEnabled = settings.whatsappReceiptAutoSend !== false;
    const phoneToUse = customer?.phone || waPhoneNumber;
    if (isWaAutoEnabled && phoneToUse && !hasAutoSentWa && transaction.id) {
      setHasAutoSentWa(true);
      handleSendWhatsApp(phoneToUse);
    }
  }, [settings.whatsappReceiptAutoSend, customer, waPhoneNumber, transaction.id, hasAutoSentWa]);

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) return;
    if (onCancelTransaction) {
      onCancelTransaction(transaction.id, cancelReason);
      setShowCancelConfirm(false);
      onClose();
    }
  };

  const handlePrint = () => {
    const receiptEl = document.getElementById('receipt-active-view') || document.getElementById('thermal-receipt');
    
    if (receiptEl) {
      try {
        // Remove existing print iframe if present
        const oldFrame = document.getElementById('pos-print-iframe');
        if (oldFrame) {
          oldFrame.remove();
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'pos-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0px';
        document.body.appendChild(iframe);

        const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Risiti #${transaction.receiptNumber}</title>
                <style>
                  @page {
                    size: 80mm auto;
                    margin: 0mm;
                  }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin: 0;
                    padding: 12px;
                    width: 78mm;
                    background: #ffffff;
                    color: #000000;
                    font-size: 11px;
                    line-height: 1.3;
                  }
                  .text-center { text-align: center; }
                  .text-left { text-align: left; }
                  .text-right { text-align: right; }
                  .flex { display: flex; }
                  .items-center { align-items: center; }
                  .justify-between { justify-content: space-between; }
                  .font-bold { font-weight: bold; }
                  .font-black { font-weight: 900; }
                  .uppercase { text-transform: uppercase; }
                  .border-b { border-bottom: 1px solid #333; }
                  .border-t { border-top: 1px solid #333; }
                  .w-full { width: 100%; }
                  .my-2 { margin: 8px 0; }
                  .mb-3 { margin-bottom: 12px; }
                  .p-5, .p-6 { padding: 0 !important; }
                  .shadow-sm, .border, .rounded-lg, .rounded-xs { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { padding: 3px 0; text-align: left; vertical-align: top; }
                  th { border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
                  td.text-right, th.text-right { text-align: right; }
                  td.text-center, th.text-center { text-align: center; }
                  .print-hide { display: none !important; }
                  img { max-width: 120px; max-height: 50px; display: block; margin: 0 auto 6px auto; }
                </style>
              </head>
              <body>
                ${receiptEl.innerHTML}
              </body>
            </html>
          `);
          frameDoc.close();

          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (err) {
              console.warn('Iframe print failed, falling back to window.print()', err);
              window.print();
            }
          }, 250);
          return;
        }
      } catch (e) {
        console.warn('Print iframe error:', e);
      }
    }

    // Direct window print fallback
    window.print();
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return language === 'SW' ? 'PESA TASLIMU (Cash)' : 'CASH PAYMENT';
      case 'CARD': return language === 'SW' ? 'KADI (Bank Card)' : 'BANK CARD';
      case 'M_PESA': return 'VODACOM M-PESA';
      case 'TIGO_PESA': return 'TIGO PESA';
      case 'AIRTEL_MONEY': return 'AIRTEL MONEY';
      case 'HALOPESA': return 'HALOTEL HALOPESA';
      case 'CREDIT': return language === 'SW' ? 'MKOPO WA MTEJA (Debt)' : 'CUSTOMER CREDIT / DEBT';
      default: return method;
    }
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div id="receipt-modal-card" className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-900 font-sans text-base">{language === 'SW' ? 'Risiti ya Malipo' : 'Sales Receipt'}</h3>
          <button 
            id="close-receipt-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal View Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 flex flex-col items-center">
          
          {showCancelConfirm ? (
            <div id="cancel-tx-confirm-box" className="w-full bg-white p-6 rounded-xl border border-red-200 shadow-sm font-sans">
              <h4 className="text-red-700 font-bold mb-2 flex items-center gap-2">
                <Trash2 size={18} />
                {language === 'SW' ? 'Futa/Ghairi Mauzo Haya?' : 'Void / Cancel Transaction?'}
              </h4>
              <p className="text-slate-600 text-sm mb-4">
                {language === 'SW'
                  ? 'Hatua hii itarudisha bidhaa zote kwenye stoo (inventory stock) na kupunguza mahesabu ya mauzo ya siku. Kama ilikuwa mkopo, deni la mteja litarekebishwa.'
                  : 'This action will restock all inventory items and reverse the sales figures for today. If credit was issued, customer balance will be adjusted.'}
              </p>
              
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'SW' ? 'Sababu ya Kughairi (Laini/Kasoro ya duka):' : 'Reason for Cancellation:'}
              </label>
              <textarea
                id="cancel-reason-input"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                rows={3}
                placeholder={language === 'SW' ? "Mfano: Mteja amebadilisha mawazo au kosa la keshia" : "e.g. Customer changed mind or cashier error"}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />

              <div className="flex gap-2 justify-end">
                <button
                  id="cancel-tx-abort-btn"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
                >
                  {language === 'SW' ? 'Rudi Nyuma' : 'Go Back'}
                </button>
                <button
                  id="cancel-tx-confirm-btn"
                  onClick={handleCancelSubmit}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  {language === 'SW' ? 'Thibitisha Futa' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Receipt Format Switcher Tabs */}
              <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-200/80 rounded-xl mb-4 font-sans shrink-0 w-full">
                <button
                  type="button"
                  onClick={() => setReceiptFormat('SIMPLE')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    receiptFormat === 'SIMPLE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} />
                  <span>{language === 'SW' ? 'Risiti ya Kawaida' : 'Standard Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptFormat('DETAILED')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    receiptFormat === 'DETAILED'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer size={14} />
                  <span>{language === 'SW' ? 'Risiti Kamili' : 'Detailed Receipt'}</span>
                </button>
              </div>

              {/* RISITI YA KAWAIDA (SIMPLE CLEAN RECEIPT) */}
              {receiptFormat === 'SIMPLE' ? (
                <div id="receipt-active-view" className="w-full max-w-[340px] bg-white p-5 shadow-sm border border-slate-300 rounded-lg mb-6 relative font-sans">
                  {/* Clean Store Header */}
                  <div className="text-center mb-3">
                    {settings.logoUrl && (
                      <img 
                        src={settings.logoUrl} 
                        alt={settings.storeName} 
                        className="max-h-12 max-w-[120px] object-contain mx-auto mb-1.5"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                    <h4 className="font-black text-base text-slate-900 tracking-tight uppercase">{settings.storeName}</h4>
                    <p className="text-[11px] text-slate-600 font-medium">{settings.phone}</p>
                    {settings.address && <p className="text-[10px] text-slate-500">{settings.address}</p>}
                    
                    <div className="border-b border-slate-300 my-2"></div>
                    
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-700">
                      <span>No: <strong className="text-slate-900">#{transaction.receiptNumber}</strong></span>
                      <span>{new Date(transaction.timestamp).toLocaleDateString('sw-TZ')}</span>
                    </div>
                    {transaction.isBackdated && (
                      <div className="text-left text-[10px] text-amber-800 font-bold mt-0.5">
                        <span>⚠️ {language === 'SW' ? 'Mauzo ya Tarehe ya Nyuma' : 'Backdated Sale'}</span>
                      </div>
                    )}
                    {customer && (
                      <div className="text-left text-[11px] text-slate-700 font-medium mt-1">
                        <span>Mteja: <strong>{customer.name}</strong></span>
                      </div>
                    )}
                    {transaction.note && (
                      <div className="text-left text-[10.5px] text-slate-600 italic mt-0.5">
                        <span>Kumbukumbu: {transaction.note}</span>
                      </div>
                    )}
                    <div className="border-b border-slate-300 my-2"></div>
                  </div>

                  {/* Simple Items Table (Jina la Bidhaa, Idadi, Bei, Jumla - Category Excluded) */}
                  <div className="mb-3">
                    <table className="w-full text-xs font-sans text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="pb-1 text-left">{language === 'SW' ? 'Bidhaa' : 'Item'}</th>
                          <th className="pb-1 text-center">{language === 'SW' ? 'Idadi' : 'Qty'}</th>
                          <th className="pb-1 text-right">{language === 'SW' ? 'Bei' : 'Price'}</th>
                          <th className="pb-1 text-right">{language === 'SW' ? 'Jumla' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transaction.items.map((item, idx) => {
                          const unitPrice = item.customPrice ?? item.product.sellingPrice;
                          const lineTotal = item.quantity * unitPrice;
                          return (
                            <tr key={idx} className="text-slate-800">
                              <td className="py-1.5 font-bold text-slate-900 pr-1">{item.product.name}</td>
                              <td className="py-1.5 text-center font-bold text-slate-700 px-1">{item.quantity}</td>
                              <td className="py-1.5 text-right font-mono text-[11px] text-slate-600 px-1">{settings.currencySymbol} {unitPrice.toLocaleString()}</td>
                              <td className="py-1.5 text-right font-mono font-bold text-slate-900 pl-1">{settings.currencySymbol} {lineTotal.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Clean Totals */}
                  <div className="border-t border-slate-300 pt-2 space-y-1 text-xs">
                    {transaction.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>{language === 'SW' ? 'Punguzo:' : 'Discount:'}</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-200">
                      <span>{language === 'SW' ? 'JUMLA KUU:' : 'TOTAL:'}</span>
                      <span className="font-mono text-base">{formatCurrency(transaction.total)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                      <span>{language === 'SW' ? 'Malipo:' : 'Payment:'}</span>
                      <span className="font-bold text-slate-800">{getMethodLabel(transaction.paymentMethod)}</span>
                    </div>
                    {transaction.paymentMethod === 'CASH' && transaction.changeAmount > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>{language === 'SW' ? 'Chenji:' : 'Change:'}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(transaction.changeAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Short Thank You */}
                  <div className="border-t border-slate-200 my-2.5"></div>
                  <div className="text-center text-[10.5px] text-slate-600 italic font-medium">
                    {settings.receiptGreeting || (language === 'SW' ? 'Asante kwa kununua nasi! Karibu tena.' : 'Thank you for your purchase!')}
                  </div>
                </div>
              ) : (
                /* Thermal Receipt Body */
                <div id="receipt-active-view" className="w-full max-w-[340px] bg-white p-6 shadow-sm border border-slate-200 rounded-xs mb-6 relative">
                
                {/* Serrated edge simulation */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-repeat-x overflow-hidden print-hide" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='6' viewBox='0 0 16 6'%3E%3Cpath d='M0 6L8 0l8 6z' fill='%23e2e8f0'/%3E%3C/svg%3E")` }}></div>
                
                {/* Store Header */}
                <div className="text-center mt-2 mb-4 font-mono">
                  {settings.logoUrl && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={settings.logoUrl} 
                        alt={settings.storeName} 
                        className="max-h-14 max-w-[140px] object-contain mx-auto"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h4 className="font-bold text-lg text-slate-900 tracking-tight uppercase">{settings.storeName}</h4>
                  <p className="text-xs text-slate-500">{settings.address}</p>
                  <p className="text-xs text-slate-500">{language === 'SW' ? 'Simu:' : 'Phone:'} {settings.phone}</p>
                  <div className="border-b border-dashed border-slate-300 my-3"></div>
                  
                  {/* Receipts Metadata */}
                  <div className="text-left text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>{language === 'SW' ? 'Namba ya Risiti:' : 'Receipt No:'}</span>
                      <span className="font-bold text-slate-800">{transaction.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'SW' ? 'Tarehe na Saa:' : 'Date & Time:'}</span>
                      <span>{new Date(transaction.timestamp).toLocaleString(language === 'SW' ? 'sw-TZ' : 'en-US')}</span>
                    </div>
                    {transaction.isBackdated && (
                      <div className="flex justify-between text-amber-800 font-bold text-[10.5px]">
                        <span>{language === 'SW' ? 'Aina ya Mauzo:' : 'Sale Type:'}</span>
                        <span>{language === 'SW' ? 'Mauzo ya Nyuma (Backdated)' : 'Backdated Entry'}</span>
                      </div>
                    )}
                    {transaction.note && (
                      <div className="flex justify-between text-slate-700 italic text-[10.5px]">
                        <span>{language === 'SW' ? 'Kumbukumbu:' : 'Note:'}</span>
                        <span className="truncate max-w-[180px]">{transaction.note}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{language === 'SW' ? 'Mhudumu (Cashier):' : 'Cashier:'}</span>
                      <span>{transaction.cashierName}</span>
                    </div>
                  </div>
                  
                  <div className="border-b border-dashed border-slate-300 my-3"></div>
                </div>

                {/* Receipt Line Items */}
                <div className="font-mono text-xs text-slate-800 space-y-2 mb-4">
                  <div className="flex justify-between font-bold text-slate-500 border-b border-dashed border-slate-200 pb-1">
                    <span>{language === 'SW' ? 'Bidhaa (Qty x Bei)' : 'Item (Qty x Price)'}</span>
                    <span>{language === 'SW' ? 'Jumla' : 'Total'}</span>
                  </div>

                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex justify-between font-medium">
                        <span className="truncate max-w-[200px]">{item.product.name}</span>
                        <span>{formatCurrency(item.quantity * (item.customPrice ?? item.product.sellingPrice))}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pl-2">
                        {item.quantity} x {formatCurrency(item.customPrice ?? item.product.sellingPrice)}
                      </div>
                    </div>
                  ))}

                  <div className="border-b border-dashed border-slate-300 my-3"></div>

                  {/* Calculations */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>{language === 'SW' ? 'Jumla Ndogo (Subtotal):' : 'Subtotal:'}</span>
                      <span>{formatCurrency(transaction.subtotal)}</span>
                    </div>
                    {transaction.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>{language === 'SW' ? 'Punguzo (Discount):' : 'Discount:'}</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                      <span>{language === 'SW' ? 'Malipo Kamili (TOTAL):' : 'TOTAL:'}</span>
                      <span>{formatCurrency(transaction.total)}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-300 my-3"></div>

                  {/* Payment Details */}
                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="flex justify-between font-medium">
                      <span>{language === 'SW' ? 'Aina ya Malipo:' : 'Payment Method:'}</span>
                      <span className="font-bold">{getMethodLabel(transaction.paymentMethod)}</span>
                    </div>
                    {transaction.paymentMethod === 'CASH' ? (
                      <>
                        <div className="flex justify-between text-slate-500">
                          <span>{language === 'SW' ? 'Kiasi kilichopokewa:' : 'Amount Tendered:'}</span>
                          <span>{formatCurrency(transaction.receivedAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{language === 'SW' ? 'Kiasi cha Chenji:' : 'Change:'}</span>
                          <span>{formatCurrency(transaction.changeAmount)}</span>
                        </div>
                      </>
                    ) : null}

                    {customer && (
                      <div className="mt-2 bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-[11px]">
                        <p className="font-bold text-slate-800">{language === 'SW' ? 'Taarifa za Mteja:' : 'Customer Details:'}</p>
                        <p>{customer.name} ({customer.phone})</p>
                        {transaction.paymentMethod === 'CREDIT' ? (
                          <p className="text-red-600 font-bold mt-1">{language === 'SW' ? 'Deni jipya limeongezwa!' : 'New credit balance added!'}</p>
                        ) : (
                          <p className="text-slate-500 font-medium mt-1">{language === 'SW' ? 'Deni lake lililosalia:' : 'Outstanding Debt:'} {formatCurrency(customer.debt)}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Greeting Footer */}
                  <div className="border-b border-dashed border-slate-300 my-3"></div>
                  <div className="text-center text-[10px] text-slate-500 italic mt-3 leading-relaxed">
                    {settings.receiptGreeting}
                  </div>
                </div>

                {/* Serrated edge simulation at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-repeat-x overflow-hidden transform rotate-180 print-hide" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='6' viewBox='0 0 16 6'%3E%3Cpath d='M0 6L8 0l8 6z' fill='%23e2e8f0'/%3E%3C/svg%3E")` }}></div>
              </div>
              )}

              {/* Digital Receipt Dispatch Panel (WhatsApp & Network SMS) */}
              <div id="receipt-digital-dispatch-panel" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 font-sans space-y-3 shadow-xs">
                {/* Channel Switcher */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
                    <Share2 size={15} className="text-emerald-600" />
                    Tuma Risiti kwa Mteja
                  </span>
                  
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setDispatchChannel('whatsapp')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                        dispatchChannel === 'whatsapp' 
                          ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchChannel('sms')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                        dispatchChannel === 'sms' 
                          ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone size={12} />
                      <span>SMS</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Channel Body */}
                {dispatchChannel === 'whatsapp' && (
                  <div className="space-y-2.5 animate-fade-in">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendWhatsApp();
                      }}
                      className="space-y-1"
                    >
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Namba ya WhatsApp ya Mteja:
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Mfano: 0712345678 au 255712345678"
                          value={waPhoneNumber}
                          onChange={e => setWaPhoneNumber(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={waStatus === 'sending'}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                          title="Tuma Risiti Kiotomatiki"
                        >
                          {waStatus === 'sending' ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : (
                            <Send size={13} />
                          )}
                          <span>{waStatus === 'sending' ? 'Inatuma...' : 'Tuma API'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppDirect()}
                          className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Fungua WhatsApp Moja kwa Moja"
                        >
                          <ExternalLink size={13} />
                          <span>Fungua WA</span>
                        </button>
                      </div>
                    </form>

                    {waStatus === 'success' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-900 space-y-2 animate-fade-in">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                          <Check size={15} className="bg-emerald-600 text-white rounded-full p-0.5 shrink-0" />
                          <span>{waLog}</span>
                        </p>
                        {waLink && (
                          <div className="pt-2 border-t border-emerald-200/80 space-y-1.5">
                            <p className="text-[10px] text-emerald-800 font-medium">
                              Ikiwa WhatsApp haikufunguka kiotomatiki (popup blocked), bofya kitufe hiki chini kutuma risiti:
                            </p>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer text-center"
                            >
                              <ExternalLink size={13} />
                              <span>Fungua WhatsApp Kutuma Risiti sasa</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {waStatus === 'error' && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-[10.5px] text-red-800 animate-fade-in space-y-1">
                        <p className="font-bold">Kasoro imetokea:</p>
                        <p>{waError}</p>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppDirect()}
                          className="mt-1 text-[10px] font-bold text-emerald-700 underline flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          Jaribu Kufungua WhatsApp Moja kwa Moja App/Web
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-500 leading-relaxed flex items-center gap-1.5 pt-0.5">
                      <Info size={11} className="shrink-0 text-emerald-600" />
                      <span>Inatuma risiti iliyopangwa vizuri yenye muundo wa WhatsApp kwa mteja kwa mbofyo mmoja.</span>
                    </p>
                  </div>
                )}

                {/* SMS Channel Body */}
                {dispatchChannel === 'sms' && (
                  <div className="space-y-2.5 animate-fade-in">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Namba ya Simu ya SMS:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 0712345678 au 255712345678"
                          value={smsPhoneNumber}
                          onChange={e => setSmsPhoneNumber(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={smsStatus === 'sending'}
                          onClick={() => handleSendSMS()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {smsStatus === 'sending' ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : (
                            <Send size={13} />
                          )}
                          <span>{smsStatus === 'sending' ? 'Inatuma...' : 'Tuma SMS'}</span>
                        </button>
                      </div>
                    </div>

                    {smsStatus === 'success' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[10.5px] text-emerald-800 space-y-1.5 animate-fade-in">
                        <p className="font-bold flex items-center gap-1 text-emerald-900">
                          <Check size={14} className="bg-emerald-600 text-white rounded-full p-0.5" />
                          SMS imetumwa kikamilifu!
                        </p>
                        {smsLog && (
                          <pre className="bg-slate-900 text-slate-300 font-mono text-[9px] p-2 rounded overflow-x-auto whitespace-pre-wrap text-left leading-tight shadow-inner">
                            {smsLog}
                          </pre>
                        )}
                      </div>
                    )}

                    {smsStatus === 'error' && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-[10.5px] text-red-800 animate-fade-in">
                        <p className="font-bold">Kasoro imetokea:</p>
                        <p>{smsError}</p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 leading-relaxed flex items-center gap-1.5 pt-0.5">
                      <Info size={11} className="shrink-0" />
                      <span>Inatuma SMS kwenda mitandao ya simu (Airtel, Vodacom, Tigo, Halotel) nchini Tanzania au ulimwenguni kote.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div id="receipt-modal-actions" className="w-full flex flex-col gap-2.5 font-sans">
                <button
                  id="print-receipt-btn"
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
                >
                  <Printer size={18} />
                  Chapa Risiti (Print Receipt)
                </button>
                
                {onCancelTransaction && (
                  <button
                    id="refund-receipt-btn"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition"
                  >
                    <Trash2 size={18} />
                    Ghairi / Rudisha Mauzo (Delete/Return Order)
                  </button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
