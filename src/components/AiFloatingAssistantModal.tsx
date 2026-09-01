import { useState, useMemo, useRef, useEffect } from 'react';
import { DbState } from '../types';
import { 
  Brain, Send, Loader2, Copy, Check, X, Store, Zap, Sparkles, Volume2
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { generateOfflineAdvice } from '../lib/offlineAdvisor';
import { calculateTanzaniaTax } from '../lib/taxEngine';

interface AiFloatingAssistantModalProps {
  state: DbState;
  isOpen: boolean;
  onClose: () => void;
}

export default function AiFloatingAssistantModal({ state, isOpen, onClose }: AiFloatingAssistantModalProps) {
  const { language } = useLanguage();
  const { transactions, products, customers, settings } = state;

  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; text: string; timestamp: string }[]>([
    {
      role: 'assistant',
      text: language === 'SW'
        ? `Habari! Mimi ni **LedgerBox AI**, Msaidizi Wako wa Akili Mnemba aliyetengenezwa na **Brayan Kako**.\n\nNina uwezo wa **kumjibu user maswali YOTE** atakayoniuliza! Unahitaji msaada gani leo?`
        : `Hello! I am **LedgerBox AI**, your Smart AI Assistant built by **Brayan Kako**.\n\nI am equipped to **answer ALL questions** you ask me! How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiLoading, isOpen]);

  const storeSummary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalSales = 0;
    let totalCost = 0;

    transactions.forEach(tx => {
      totalSales += tx.total;
      tx.items.forEach(it => {
        totalCost += (it.product?.costPrice || 0) * it.quantity;
      });
    });

    const totalProfit = Math.max(0, totalSales - totalCost);
    const totalDebts = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

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
        todaySales: totalSales,
        totalProfit,
        monthlyProfit: totalProfit,
        todayProfit: totalProfit,
        totalCapitalInvested: products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0),
        totalCustomerDebts: totalDebts,
        allTimeLoss: 0,
        monthlyLoss: 0,
        todayLoss: 0,
        totalReceipts: transactions.length,
      },
      lowStockProducts: products.filter(p => p.stock <= p.minStock).slice(0, 5).map(p => ({
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

  if (!isOpen) return null;

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
      }, 400);
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
        const offlineText = generateOfflineAdvice(promptToSend, storeSummary, language);
        setAiMessages(prev => [
          ...prev,
          { role: 'assistant', text: offlineText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    } catch (err) {
      const offlineText = generateOfflineAdvice(promptToSend, storeSummary, language);
      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', text: offlineText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-2 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full sm:w-[460px] h-[85vh] sm:h-[600px] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
              <Brain size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                LedgerBox AI
                <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              </h3>
              <p className="text-[10px] text-slate-400">
                {language === 'SW' ? 'Inajibu maswali yote ya duka na jumla' : 'Answers all store & general queries'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none uppercase ${
                isOfflineMode 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isOfflineMode ? 'Offline' : 'Online'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-900 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* QUICK PROMPTS CHIPS */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] shrink-0">
          {[
            { q: "Nieleze jinsi ya kutumia mfumo huu wa LedgerBox", label: "📖 Mwongozo" },
            { q: "Jinsi ya kufanya mauzo na kutoa risiti", label: "🛒 Mauzo & Risiti" },
            { q: "Jinsi ya kuongeza bidhaa stoo", label: "📦 Stoo" },
            { q: "Jinsi ya kusajili mteja anayekopa offline", label: "👥 Wateja & Madeni" },
            { q: "Tathmini duka langu na faida", label: "📊 Uchambuzi" },
            { q: "Namba ya simu ya msanidi ni ipi?", label: "📞 Namba ya Simu" },
            { q: "Ushauri wa kodi ya TRA", label: "🇹🇿 TRA Tax" },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.q)}
              disabled={isAiLoading}
              className="bg-slate-900 hover:bg-indigo-900 text-slate-300 hover:text-white border border-slate-800 rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition cursor-pointer select-none shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* MESSAGES BODY */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-900 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {aiMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm leading-relaxed text-[12px] relative ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none font-medium'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.text.split('\n').map((line, lIdx) => {
                      let formattedLine = line;
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      formattedLine = formattedLine.replace(boldRegex, '<strong class="text-white font-extrabold">$1</strong>');
                      return (
                        <p key={lIdx} className="my-0.5" dangerouslySetInnerHTML={{ __html: formattedLine }} />
                      );
                    })}
                  </div>

                  {!isUser && (
                    <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-end gap-2 text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 flex items-center gap-1 transition cursor-pointer select-none"
                      >
                        {copiedIndex === idx ? <><Check size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
                      </button>

                      {'speechSynthesis' in window && (
                        <button
                          type="button"
                          onClick={() => handleSpeakText(msg.text, idx)}
                          className={`px-2 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer select-none ${
                            speakingIndex === idx 
                              ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse' 
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                        >
                          <Volume2 size={10} />
                          {speakingIndex === idx ? 'Reading...' : 'Read'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAiLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2 text-slate-400 text-xs font-bold">
                <Loader2 size={14} className="text-indigo-400 animate-spin" />
                <span>LedgerBox AI is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FOOTER */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isAiLoading}
            placeholder={language === 'SW' ? "Uliza swali lolote..." : "Ask any question..."}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />

          <button
            type="submit"
            disabled={!userInput.trim() || isAiLoading}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition shadow-sm"
          >
            <Send size={15} />
          </button>
        </form>

      </div>
    </div>
  );
}
