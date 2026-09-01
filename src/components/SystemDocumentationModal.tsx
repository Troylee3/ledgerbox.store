import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, Download, X, CheckCircle2, ShieldCheck, ShoppingCart, Package, 
  Users, TrendingUp, Brain, Smartphone, Lock, Award, WifiOff, FileCheck
} from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface SystemDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LEDGERBOX_FEATURES = [
  {
    category: "1. Mfumo wa Mauzo na Risiti (Point of Sale - POS)",
    icon: ShoppingCart,
    items: [
      {
        name: "Mauzo ya Haraka (Fast Checkout)",
        desc: "Uwezo wa kuteua bidhaa haraka kupitia orodha au skana ya Barcode/QR code na kumaliza mauzo kwa sekunde chache."
      },
      {
        name: "Njia Mbalimbali za Malipo (Multiple Payment Gateways)",
        desc: "Inasapoti malipo ya Pesa Taslimu (Cash), Vodacom M-Pesa, Tigo Pesa, Airtel Money, Kadi za Benki (EFT Card), na Mauzo ya Mkopo (Credit)."
      },
      {
        name: "Risiti za Kielektroniki (Print & Download Receipt Vouchers)",
        desc: "Inatengeneza risiti rasmi za kielektroniki zenye namba ya kipekee (Mfano: PM-892341) zinazoweza kuchapishwa au kupakuliwa."
      },
      {
        name: "Punguzo la Bei (Discount & Pricing Engine)",
        desc: "Uwezo wa kuweka punguzo la bei wakati wa mauzo kwa urahisi na uhakika wa mahesabu."
      }
    ]
  },
  {
    category: "2. Usimamizi wa Stoo na Bidhaa (Inventory & Stock Management)",
    icon: Package,
    items: [
      {
        name: "Katalogi ya Bidhaa (Product Catalog)",
        desc: "Usajili wa bidhaa zenye jina, SKU/Barcode, kundi (category), bei ya mtaji, bei ya kuuza na idadi iliyopo stoo."
      },
      {
        name: "Tahadhari ya Stoo Ndogo (Low Stock & Out of Stock Alerts)",
        desc: "Mfumo unakupa taarifa mapema za bidhaa zinazokaribia kuisha au zilizokwisha ili kuzuia kukwama kwa mauzo."
      },
      {
        name: "Uchambuzi wa Thamani ya Stoo (Stock Valuation)",
        desc: "Inaonyesha jumla ya thamani ya bidhaa zako zote zilizopo stoo kwa bei ya mtaji na bei ya kuuza."
      },
      {
        name: "Uainishaji wa Makundi (Categories)",
        desc: "Uwezo wa kuweka bidhaa kwenye makundi (k.m. Vinywaji, Vifaa vya Shule, Chakula) kwa urahisi wa utafutaji."
      }
    ]
  },
  {
    category: "3. Usimamizi wa Wateja na Madeni (Customer & Debt Tracker)",
    icon: Users,
    items: [
      {
        name: "Usajili wa Wateja (Customer Profiles)",
        desc: "Kutunza majina, namba za simu, na anwani za wateja wako wa mara kwa mara."
      },
      {
        name: "Kumbukumbu ya Madeni (Automatic Debt Logging)",
        desc: "Mauzo yote ya mkopo yanaingizwa kiotomatiki kwenye akaunti ya mteja husika na kuonyesha jumla ya deni lake."
      },
      {
        name: "Kurekodi Marejesho (Debt Payment Vouchers)",
        desc: "Uwezo wa kupokea malipo ya deni kidogo kidogo au lote, na kutoa stakabadhi rasmi ya mrejesho wa deni."
      },
      {
        name: "Vikumbusho vya SMS/WhatsApp (Automated Debt Alerts)",
        desc: "Uwezo wa kumtumia mteja muhtasari wa deni lake moja kwa moja kupitia WhatsApp au SMS."
      }
    ]
  },
  {
    category: "4. History ya Risiti na Kughairi Mauzo (Receipt Logs & Void Sales)",
    icon: FileCheck,
    items: [
      {
        name: "Kumbukumbu ya Miamala Yote (Transaction Logs)",
        desc: "Kuhifadhi kila risiti iliyotolewa ikiwa na tarehe, saa, jina la keshia, njia ya malipo, na orodha ya bidhaa."
      },
      {
        name: "Kughairi Mauzo (Void Transaction & Auto-Restock)",
        desc: "Uwezo wa kufuta mauzo yaliyofanyika kwa kosa, ambapo mfumo unarudisha bidhaa stoo na kurekebisha hesabu za siku."
      }
    ]
  },
  {
    category: "5. Ripoti na Uchambuzi wa Kifedha (Financial Analytics & Reports)",
    icon: TrendingUp,
    items: [
      {
        name: "Ripoti ya Faida na Hasara (Real Net Profit/Loss)",
        desc: "Uchambuzi wa faida halisi ya siku, mwezi, na muda wote baada ya kutoa bei ya mtaji."
      },
      {
        name: "Uchambuzi wa Mauzo ya Wafanyakazi (Cashier Ledger)",
        desc: "Ripoti inayoeleza 'Nani ameuza nini?' ili kufuatilia ufanisi na uwazi wa kila keshia au mfanyakazi."
      },
      {
        name: "Injin ya Kodi ya TRA (Income & Presumptive Tax Engine)",
        desc: "Hesabu kamili za kodi za TRA (Presumptive na Corporate Tax) kulingana na sheria za kodi za Tanzania kwa ajili ya usawazishaji wa hesabu."
      },
      {
        name: "Hali ya Kifedha ya Mwaka & Mizania (Statement of Financial Position)",
        desc: "Jedwali kamili la rasilimali zote (Assets), dhima (Liabilities), mtaji wa mzunguko (Working Capital), thamani halisi (Net Worth), na mwenendo wa miezi 12 ya mwaka."
      },
      {
        name: "Taarifa ya Faida au Hasara kwa Mwaka Ulioishia (Statement of Profit or Loss)",
        desc: "Hesabu rasmi za mapato (Revenue), gharama za mauzo (COGS), faida ghafi, gharama za uendeshaji (OPEX), kodi ya TRA na faida halisi ya mwaka (PAT)."
      }
    ]
  },
  {
    category: "6. Msaidizi wa Akili Mbandikizo (LedgerBox AI & Offline Advisor)",
    icon: Brain,
    items: [
      {
        name: "Msaidizi wa Biashara wa Nje ya Mtandao (100% Offline AI)",
        desc: "Inajibu maswali ya mauzo, mahesabu, na mbinu za biashara hata kama duka halina intaneti."
      },
      {
        name: "Uchambuzi wa Kiotomatiki (Smart Business Consulting)",
        desc: "Inakupa ushauri wa kitaalamu wa bidhaa zinazoongozwa kwa mauzo na jinsi ya kuongeza faida."
      },
      {
        name: "Taarifa za Msanidi (Brayan Kako - +255623864700)",
        desc: "Ina taarifa sahihi za msanidi mkuu na namba yake ya simu kwa ajili ya msaada wowote wa kiufundi."
      }
    ]
  },
  {
    category: "7. Ujumbe na Otomatiki ya WhatsApp (WhatsApp & SMS Automation)",
    icon: Smartphone,
    items: [
      {
        name: "Kutuma Risiti kwa WhatsApp (WhatsApp Digital Receipts)",
        desc: "Uwezo wa kumtumia mteja risiti ya mauzo yake kwa mfumo wa ujumbe wa WhatsApp kwa mbofyo mmoja."
      },
      {
        name: "Mawasiliano ya Wateja (Customer Engagement)",
        desc: "Zana ya kutuma ujumbe wa matangazo au vikumbusho kwa wateja waliokusudiwa."
      }
    ]
  },
  {
    category: "8. Usimamizi wa Wafanyakazi na Haki (Staff Roles & Security)",
    icon: Lock,
    items: [
      {
        name: "Akaunti za Wafanyakazi (Admin, Cashier, Storekeeper)",
        desc: "Kugawa majukumu kwa kila mfanyakazi kulingana na nafasi yake."
      },
      {
        name: "Kuzuia Taarifa za Siri (Cost Price Protection)",
        desc: "Keshia hawezi kuona bei ya mtaji wala faida ya duka; anaona tu bei ya kuuza."
      },
      {
        name: "Ulinzi wa PIN (4-Digit Quick PIN Access)",
        desc: "Kila mfanyakazi ana ingia kwa kutumia PIN ya tarakimu 4 badala ya neno la siri refu."
      }
    ]
  },
  {
    category: "9. Usajili, Leseni & Usalama wa Nje ya Mtandao (Offline & PWA)",
    icon: WifiOff,
    items: [
      {
        name: "Kufanya Kazi 100% Offline (Zero Internet Dependency)",
        desc: "Mfumo mzima wa LedgerBox unafanya kazi kikamilifu bila kutegemea intaneti wala Google AI Studio."
      },
      {
        name: "App Inayosakinishwa (Progressive Web App - PWA)",
        desc: "Inaweza kusakinishwa kwenye Laptop au Simu yako kama programu huru na kufunguka mara moja."
      },
      {
        name: "Mfumo wa Leseni na Nambari za Usajili (License Activation System)",
        desc: "Inasapoti siku za majaribio (Trial) na usajili wa Leseni kupitia susbkripsheni au ufunguo rasmi."
      }
    ]
  }
];

export default function SystemDocumentationModal({ isOpen, onClose }: SystemDocumentationModalProps) {
  const { language } = useLanguage();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Title Banner Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('LEDGERBOX POS & STORE MANAGEMENT ENGINE', 14, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('MWONGOZO RASMI WA VIPENGELE VYA MFUMO NA KAZI ZAKE (SYSTEM FEATURES SPECIFICATION)', 14, 24);
      doc.text(`Tarehe ya Ripoti: ${new Date().toLocaleDateString('sw-TZ')} | Developer: Brayan Kako (+255 623 864 700)`, 14, 30);

      y = 45;

      // Loop through categories
      LEDGERBOX_FEATURES.forEach((cat, idx) => {
        // Check page overflow
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Category Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(14, y - 5, pageWidth - 28, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(cat.category, 16, y);
        y += 10;

        cat.items.forEach((item) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          // Feature Name
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(79, 70, 229); // indigo-600
          doc.text(`• ${item.name}`, 18, y);
          y += 5;

          // Feature Description wrapped text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85); // slate-700
          
          const splitText = doc.splitTextToSize(item.desc, pageWidth - 42);
          doc.text(splitText, 22, y);
          y += (splitText.length * 4.5) + 3;
        });

        y += 4;
      });

      // Footer notice on final page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('MAWASILIANO NA MSAADA WA KIUFUNDI (TECHNICAL SUPPORT):', 14, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Msanidi Mkuu: Brayan Kako | Simu/WhatsApp: +255 623 864 700', 14, y);
      y += 4;
      doc.text('LedgerBox Architecture: 100% Offline Progressive Web App for Tanzanian & Global Retailers', 14, y);

      doc.save('LedgerBox_POS_Mwongozo_na_Vipengele.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Imeshindwa kutengeneza PDF. Tafadhali jaribu tena.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden font-sans flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm md:text-lg text-white tracking-tight truncate">
                {language === 'SW' ? 'Mwongozo na Vipengele vyote vya LedgerBox' : 'LedgerBox Complete System Feature Specifications'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'SW' ? 'Msanidi: Brayan Kako (+255623864700)' : 'Developer: Brayan Kako (+255623864700)'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Inatengeneza...' : (language === 'SW' ? 'Pakua PDF Rasmi' : 'Download PDF')}</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 md:p-7 overflow-y-auto space-y-6 text-slate-800 text-xs">
          
          {/* Quick Summary Banner */}
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
            <Award size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider">
                {language === 'SW' ? 'Kuhusu Mfumo wa LedgerBox POS' : 'About LedgerBox POS System'}
              </h4>
              <p className="text-slate-600 leading-relaxed">
                LedgerBox ni mfumo wa kisasa wa utunzaji wa hesabu za maduka, usimamizi wa stoo, kutoa risiti za kielektroniki, na uchambuzi wa faida halisi. Umetengenezwa mahususi na msanidi **Brayan Kako (+255623864700)** kufanya kazi **100% Offline (Nje ya Mtandao)** bila kutegemea bando la intaneti wala mifumo ya nje.
              </p>
            </div>
          </div>

          {/* Feature Categories List */}
          <div className="space-y-6">
            {LEDGERBOX_FEATURES.map((cat, idx) => {
              const IconComp = cat.icon;
              return (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-3">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <IconComp size={16} />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      {cat.category}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {cat.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                          <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                          <span>{item.name}</span>
                        </div>
                        <p className="text-slate-600 leading-normal pl-4.5 text-[11px]">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>LedgerBox Version 3.0 | Built by Brayan Kako (+255623864700)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Inatengeneza...' : 'Pakua Ripoti ya PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
            >
              Funga
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
