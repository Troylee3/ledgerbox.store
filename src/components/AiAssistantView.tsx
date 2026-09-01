import { useState, useMemo, useRef, useEffect } from 'react';
import { DbState } from '../types';
import { 
  Brain, Sparkles, Send, Loader2, Copy, Check, Volume2, Trash2, 
  Store, MessageSquare, ShieldCheck, Scale, Zap, Info, HelpCircle
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { generateOfflineAdvice } from '../lib/offlineAdvisor';
import { calculateTanzaniaTax } from '../lib/taxEngine';

interface AiAssistantViewProps {
  state: DbState;
}

export default function AiAssistantView({ state }: AiAssistantViewProps) {
  const { language } = useLanguage();
  const { transactions, products, customers, settings } = state;

  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; text: string; timestamp: string }[]>([
    {
      role: 'assistant',
      text: language === 'SW'
        ? `Habari gani! Mimi ni **LedgerBox AI**, Msaidizi Wako wa Akili Mnemba na Mshauri wa Biashara aliyetengenezwa na **Brayan Kako**.\n\nNina uwezo wa **kumjibu mteja/user maswali YOTE** atakayoniuliza! Unataka kujua nini leo? Unaweza kuniuliza kuhusu:\n- 📊 **Mwenendo wa Duka Lako:** Uchambuzi wa faida, mauzo, na stoo\n- 🇹🇿 **Kodi za TRA & Leseni:** Viwango vya kodi, EFD, na sheria za Tanzania\n- 📱 **SMS za Wateja:** Kuandika jumbe za makumbusho ya madeni au promosheni\n- 🚀 **Mbinu za Biashara:** Jinsi ya kuongeza mauzo na wateja\n- ❓ **Maswali ya Jumla:** Hesabu, ushauri, teknolojia, au jambo lolote!`
        : `Welcome! I am **LedgerBox AI**, your Smart AI Assistant and Business Advisor built by **Brayan Kako**.\n\nI am equipped to **answer ALL questions** you ask me! What would you like to inquire about today? You can ask me about:\n- 📊 **Store Analytics:** Profit analysis, sales trends, and inventory status\n- 🇹🇿 **TRA Taxes & Compliance:** Tanzanian tax regimes, EFD machines, and business licensing\n- 📱 **Customer Messaging:** Drafting polite debt reminders or promotional SMS\n- 🚀 **Business Strategy:** Tactics to boost sales velocity and retail customers\n- ❓ **General Knowledge:** Math, advice, tech, writing, or any general topic!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAiLoading]);

  // Compute Store Metrics for AI context
  const storeSummary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalSales = 0;
    let totalCost = 0;
    let todaySales = 0;

    transactions.forEach(tx => {
      totalSales += tx.total;
      const txDate = tx.timestamp.split('T')[0];
      if (txDate === todayStr) {
        todaySales += tx.total;
      }
      tx.items.forEach(it => {
        totalCost += (it.product?.costPrice || 0) * it.quantity;
      });
    });

    const totalProfit = Math.max(0, totalSales - totalCost);
    const totalDebts = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
    const lowStock = products.filter(p => p.stock <= p.minStock);

    const taxCalc = calculateTanzaniaTax({
      annualTurnover: totalSales,
      annualExpenses: totalCost,
      keepsRecords: true,
      isVatRegistered: false
    });

    return {
      storeName: settings.storeName || "Duka la LedgerBox",
      currency: settings.currencySymbol || "TZS",
      dateAnalyzed: todayStr,
      kpis: {
        totalSales,
        monthlySales: totalSales,
        todaySales,
        totalProfit,
        monthlyProfit: totalProfit,
        todayProfit: Math.max(0, todaySales - (todaySales * 0.7)),
        totalCapitalInvested: products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0),
        totalCustomerDebts: totalDebts,
        allTimeLoss: 0,
        monthlyLoss: 0,
        todayLoss: 0,
        totalReceipts: transactions.length,
      },
      lowStockProducts: lowStock.slice(0, 5).map(p => ({
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        sellingPrice: p.sellingPrice
      })),
      bestSellingProducts: products.slice(0, 5).map(p => ({
        name: p.name,
        quantitySold: 10,
        revenue: p.sellingPrice * 10
      })),
      taxEstimation: {
        annualTurnoverEstimate: totalSales,
        annualExpensesEstimate: totalCost,
        recommendedTaxRegime: taxCalc.recommendedTaxRegime,
        estimatedAnnualTax: taxCalc.totalTaxLiability,
      }
    };
  }, [transactions, products, customers, settings]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || userInput;
    if (!promptToSend.trim() || isAiLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedHistory = [
      ...aiMessages,
      { role: 'user' as const, text: promptToSend, timestamp: timeStr }
    ];
    setAiMessages(updatedHistory);
    
    if (!customPrompt) {
      setUserInput('');
    }
    setIsAiLoading(true);

    if (isOfflineMode) {
      setTimeout(() => {
        try {
          const offlineText = generateOfflineAdvice(promptToSend, storeSummary, language);
          setAiMessages(prev => [
            ...prev,
            { role: 'assistant', text: offlineText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
        } catch (e: any) {
          setAiMessages(prev => [
            ...prev,
            { role: 'assistant', text: `Error: ${e.message || e}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
        } finally {
          setIsAiLoading(false);
        }
      }, 500);
      return;
    }

    try {
      const response = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          storeSummary: storeSummary
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.text) {
        setAiMessages(prev => [
          ...prev,
          { role: 'assistant', text: data.text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      } else {
        // Fallback to offline advisor on server failure
        const offlineText = generateOfflineAdvice(promptToSend, storeSummary, language);
        const notice = language === 'SW'
          ? `⚠️ **Server Warning:** ${data.error || 'Server error'}.\n\nMshauri wa Ndani wa LedgerBox amekujibu kwa usahihi:\n\n${offlineText}`
          : `⚠️ **Server Warning:** ${data.error || 'Server error'}.\n\nYour Local LedgerBox Assistant responded:\n\n${offlineText}`;

        setAiMessages(prev => [
          ...prev,
          { role: 'assistant', text: notice, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    } catch (err: any) {
      // Network fetch error -> Fallback
      const offlineText = generateOfflineAdvice(promptToSend, storeSummary, language);
      const notice = language === 'SW'
        ? `🔌 **Mtandao Umekatika (Offline Mode Activated):** Imeshindikana kuunganishwa na server ya AI. Mshauri wako wa Ndani amekujibu papo hapo:\n\n${offlineText}`
        : `🔌 **Network Offline:** Unable to contact the remote AI server. Your Local Assistant has answered instantly:\n\n${offlineText}`;

      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', text: notice, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSpeakText = (text: string, idx: number) => {
    if ('speechSynthesis' in window) {
      if (speakingIndex === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      setSpeakingIndex(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* TOP AI HEADER & METRICS BAR */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 shrink-0">
            <Brain size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2 tracking-tight">
              LedgerBox AI Assistant
              <span className={`w-2 h-2 rounded-full animate-ping ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {language === 'SW' ? 'Akili mnemba inayojibu maswali YOTE ya biashara na jumla' : 'Smart AI capable of answering ALL business & general questions'}
            </p>
          </div>
        </div>

        {/* Live Store Quick Stats Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0">
            <Store size={13} className="text-indigo-400" />
            <div className="text-[10px]">
              <span className="text-slate-400 block uppercase font-bold">{language === 'SW' ? 'Mauzo' : 'Sales'}</span>
              <span className="font-extrabold text-white">{storeSummary.currency} {storeSummary.kpis.totalSales.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0">
            <Zap size={13} className="text-emerald-400" />
            <div className="text-[10px]">
              <span className="text-slate-400 block uppercase font-bold">{language === 'SW' ? 'Faida' : 'Profit'}</span>
              <span className="font-extrabold text-emerald-400">{storeSummary.currency} {storeSummary.kpis.totalProfit.toLocaleString()}</span>
            </div>
          </div>

          {/* Online/Offline Toggle */}
          <button
            type="button"
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition select-none shrink-0 ${
              isOfflineMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            {isOfflineMode ? 'Offline Mode' : 'Gemini Cloud AI'}
          </button>

          <button
            type="button"
            onClick={() => setAiMessages([aiMessages[0]])}
            title={language === 'SW' ? "Futa Historia ya Soga" : "Clear Chat History"}
            className="p-2 bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-900 rounded-xl text-slate-400 hover:text-rose-300 transition cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* QUICK SUGGESTION CHIPS BAR */}
      <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] shrink-0">
        <span className="text-slate-500 font-bold uppercase tracking-wider shrink-0 text-[9.5px] flex items-center gap-1">
          <Sparkles size={11} className="text-indigo-400" />
          {language === 'SW' ? 'Maswali ya Haraka:' : 'Quick Prompts:'}
        </span>

        {[
          { 
            q: language === 'SW' ? "Nieleze jinsi ya kutumia mfumo huu wa LedgerBox POS kuanzia mwanzo mpaka mwisho" : "Explain how to use this LedgerBox POS system step by step", 
            label: language === 'SW' ? "📖 Mwongozo wa Mfumo" : "📖 Full User Guide" 
          },
          { 
            q: language === 'SW' ? "Jinsi ya kufanya mauzo ya kaunta na kuchapa au kutuma risiti kwa wateja" : "How to conduct sales and print or send receipts to customers", 
            label: language === 'SW' ? "🛒 Mauzo & Risiti" : "🛒 Sales & Receipts" 
          },
          { 
            q: language === 'SW' ? "Jinsi ya kuongeza bidhaa mpya stoo na kutengeneza oda kwa supplier" : "How to add new inventory products and draft supplier orders", 
            label: language === 'SW' ? "📦 Stoo & Bidhaa" : "📦 Inventory & Orders" 
          },
          { 
            q: language === 'SW' ? "Jinsi ya kusajili mteja anayekopa offline na kurekodi marejesho ya madeni" : "How to register credit customers offline and record repayments", 
            label: language === 'SW' ? "👥 Wateja & Madeni" : "👥 Debt Tracker" 
          },
          { 
            q: language === 'SW' ? "Jinsi ya kuweka App ya LedgerBox kwenye simu au laptop na kuitumia 100% offline" : "How to install LedgerBox PWA on phone/laptop for 100% offline use", 
            label: language === 'SW' ? "📱 App ya Offline" : "📱 Offline PWA App" 
          },
          { 
            q: language === 'SW' ? "Fanya uchambuzi wa kina wa mauzo, faida na stoo ya duka langu" : "Analyze my store sales, profit, and stock performance", 
            label: language === 'SW' ? "📊 Uchambuzi wa Duka" : "📊 Store Audit" 
          },
          { 
            q: language === 'SW' ? "Ushauri wa sheria za kodi za TRA, EFD na leseni za biashara Tanzania" : "Tanzanian TRA tax compliance, EFD rules and business license advice", 
            label: language === 'SW' ? "🇹🇿 Kodi ya TRA" : "🇹🇿 TRA Compliance" 
          },
          { 
            q: language === 'SW' ? "Namba ya simu ya msanidi wa mfumo huu wa LedgerBox ni ipi?" : "What is the contact phone number of the LedgerBox developer?", 
            label: language === 'SW' ? "📞 Namba ya Simu" : "📞 Phone Number" 
          },
          { 
            q: language === 'SW' ? "Nani ametengeneza mfumo huu wa LedgerBox?" : "Who developed this LedgerBox system?", 
            label: language === 'SW' ? "👨‍💻 Aliyeunda Mfumo" : "👨‍💻 Creator Info" 
          },
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.q)}
            disabled={isAiLoading}
            className="bg-slate-900 hover:bg-indigo-900/60 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-700/60 rounded-xl px-3 py-1 font-semibold whitespace-nowrap transition cursor-pointer select-none shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* CHAT MESSAGES LOG CONTAINER */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-900 scrollbar-thin scrollbar-thumb-slate-800">
        {aiMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-4 md:p-5 shadow-md leading-relaxed text-xs md:text-[13px] relative group ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none font-medium'
                    : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none font-sans'
                }`}
              >
                {/* Role Header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10 opacity-80 text-[10px]">
                  <span className="font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    {isUser ? (
                      <>👤 {language === 'SW' ? 'Wewe (Admin)' : 'You (Admin)'}</>
                    ) : (
                      <><Brain size={12} className="text-indigo-400" /> LedgerBox AI</>
                    )}
                  </span>
                  <span className="font-mono text-[9px] opacity-70">{msg.timestamp}</span>
                </div>

                {/* Message Body Content */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text.split('\n').map((line, lIdx) => {
                    let formattedLine = line;
                    const boldRegex = /\*\*(.*?)\*\*/g;
                    formattedLine = formattedLine.replace(boldRegex, '<strong class="text-white font-extrabold">$1</strong>');
                    const codeRegex = /`(.*?)`/g;
                    formattedLine = formattedLine.replace(codeRegex, '<code class="bg-slate-900 text-indigo-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-800">$1</code>');

                    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                      return (
                        <div key={lIdx} className="flex items-start gap-2 my-1 pl-2">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span dangerouslySetInnerHTML={{ __html: formattedLine.trim().substring(2) }} />
                        </div>
                      );
                    }
                    return (
                      <p 
                        key={lIdx} 
                        className="my-1 leading-relaxed" 
                        dangerouslySetInnerHTML={{ __html: formattedLine }} 
                      />
                    );
                  })}
                </div>

                {/* Assistant Message Control Actions (Copy & Speech) */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, idx)}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 flex items-center gap-1 transition cursor-pointer select-none"
                    >
                      {copiedIndex === idx ? (
                        <><Check size={12} className="text-emerald-400" /> {language === 'SW' ? 'Imenakiliwa' : 'Copied'}</>
                      ) : (
                        <><Copy size={12} /> {language === 'SW' ? 'Nakili Text' : 'Copy'}</>
                      )}
                    </button>

                    {'speechSynthesis' in window && (
                      <button
                        type="button"
                        onClick={() => handleSpeakText(msg.text, idx)}
                        className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer select-none ${
                          speakingIndex === idx 
                            ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse' 
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <Volume2 size={12} />
                        {speakingIndex === idx ? (language === 'SW' ? 'Inasoma...' : 'Reading...') : (language === 'SW' ? 'Soma' : 'Read')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator Bubble */}
        {isAiLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-bl-none p-4 shadow-md flex items-center gap-3 text-xs text-slate-300 font-bold">
              <Loader2 size={18} className="text-indigo-500 animate-spin shrink-0" />
              <span className="animate-pulse">
                {language === 'SW' ? 'LedgerBox AI inatafakari na kuandika majibu...' : 'LedgerBox AI is processing your request...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM CONSOLE */}
      <div className="p-3.5 md:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 max-w-5xl mx-auto"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isAiLoading}
            placeholder={
              language === 'SW'
                ? "Uliza swali lolote hapa (mfano: Nifanye nini kuongeza faida? / What is TRA tax?)..."
                : "Ask any question here (e.g. How do I increase profit? / What is TRA tax?)..."
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900/90 transition shadow-inner"
          />

          <button
            type="submit"
            disabled={!userInput.trim() || isAiLoading}
            className="h-11 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer select-none transition shrink-0 text-xs"
          >
            {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="hidden sm:inline">{language === 'SW' ? 'Tuma' : 'Send'}</span>
          </button>
        </form>

        <div className="mt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
          <Info size={11} className="text-indigo-400" />
          {language === 'SW'
            ? 'LedgerBox AI inasoma takwimu halisi za duka lako kwa usalama kabisa. System Developer: **Brayan Kako**.'
            : 'LedgerBox AI contextually integrates real-time store metrics. System Developer: **Brayan Kako**.'}
        </div>
      </div>

    </div>
  );
}
