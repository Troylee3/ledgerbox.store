import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  FileText, 
  CheckCircle2, 
  Download, 
  Printer, 
  ExternalLink, 
  Server, 
  Globe, 
  UserCheck, 
  Key, 
  AlertCircle, 
  ArrowLeft,
  Search,
  BookOpen,
  Scale,
  Building,
  Mail,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface PrivacyPolicyViewProps {
  onClose?: () => void;
}

export default function PrivacyPolicyView({ onClose }: PrivacyPolicyViewProps) {
  const { language, setLanguage } = useLanguage();
  const [activeLang, setActiveLang] = useState<'SW' | 'EN'>(language === 'SW' ? 'SW' : 'EN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const effectiveDate = "January 15, 2026";
  const effectiveDateSw = "15 Januari 2026";
  const lastUpdated = "February 24, 2026";
  const lastUpdatedSw = "24 Februari 2026";

  const handlePrint = () => {
    window.print();
  };

  const isSw = activeLang === 'SW';

  return (
    <div id="privacy-policy-view" className="min-h-full bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* TOP COMPACT HEADER / ACTIONS BAR */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title={isSw ? "Rudi nyuma" : "Go Back"}
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{isSw ? "Rudi Nyuma" : "Back"}</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield size={18} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">
                {isSw ? "Sera ya Faragha na Usalama wa Data" : "Privacy Policy & Data Protection"}
              </h1>
              <p className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} className="inline" />
                {isSw ? "Google Verification Compliant • Sheria ya Data TZ 2022" : "Google Verification Compliant • GDPR & TZ Data Act 2022"}
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (Language Switcher, Search, Print) */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLang('SW')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'SW' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kiswahili
            </button>
            <button
              onClick={() => setActiveLang('EN')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'EN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={isSw ? "Chapa au Pakua PDF ya Sera ya Faragha" : "Print or Save as PDF"}
          >
            <Printer size={14} className="text-indigo-400" />
            <span className="hidden md:inline">{isSw ? "Chapa / PDF" : "Print / PDF"}</span>
          </button>
        </div>
      </header>

      {/* MAIN DOCUMENT BODY */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* BANNER / VERIFICATION DISCLOSURE BADGE */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                <Shield size={12} />
                <span>{isSw ? "Ilani Rasmi ya Kisheria" : "Official Legal Disclosure"}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {isSw ? "Ulinzi wa Faragha, Data za Biashara na Huduma za Google" : "Privacy Protection, Business Data & Google API Services"}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {isSw 
                  ? "LedgerBox imejengwa kwa misingi ya Ulinzi wa Data wa Hali ya Juu (Privacy-by-Design). Taarifa zako za mauzo, wateja, bidhaa na fedha ziko chini ya umiliki wako pekee na zinalindwa kulingana na miongozo ya Google API Services User Data Policy, Sheria ya Ulinzi wa Taarifa Binafsi ya Tanzania Na. 11 ya 2022, na GDPR."
                  : "LedgerBox operates under a strict Privacy-by-Design architecture. Your retail sales, inventory, accounting books, customer records, and credentials remain solely under your control and comply with Google API Services User Data Policy, Tanzania Personal Data Protection Act 2022, and GDPR standards."}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shrink-0 text-[11px] space-y-1 text-slate-400 w-full md:w-auto">
              <div><strong className="text-slate-200">{isSw ? "Tarehe ya Kuanza:" : "Effective Date:"}</strong> {isSw ? effectiveDateSw : effectiveDate}</div>
              <div><strong className="text-slate-200">{isSw ? "Marekebisho ya Mwisho:" : "Last Updated:"}</strong> {isSw ? lastUpdatedSw : lastUpdated}</div>
              <div><strong className="text-slate-200">{isSw ? "Toleo:" : "Policy Version:"}</strong> <span className="font-mono text-emerald-400 font-bold">2.4.0</span></div>
            </div>
          </div>
        </div>

        {/* CLAUSE NAVIGATION PILLS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'all', label: isSw ? 'Vipengele Vyote' : 'All Sections' },
            { id: 'google_api', label: isSw ? '1. Google API & OAuth' : '1. Google API & OAuth' },
            { id: 'data_collected', label: isSw ? '2. Data Tunazokusanya' : '2. Data Collected' },
            { id: 'data_usage', label: isSw ? '3. Matumizi ya Data' : '3. Data Usage' },
            { id: 'offline_security', label: isSw ? '4. Hifadhi ya Kifaa & Ulinzi' : '4. Local Storage & Security' },
            { id: 'user_rights', label: isSw ? '5. Haki za Mtumiaji' : '5. User Rights & Deletion' },
            { id: 'contact', label: isSw ? '6. Mawasiliano ya DPO' : '6. Contact & DPO' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedSection(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                selectedSection === p.id 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: GOOGLE API & OAUTH VERIFICATION COMPLIANCE (CRITICAL FOR GOOGLE AUDIT) */}
        {(selectedSection === 'all' || selectedSection === 'google_api') && (
          <section id="section-google-api" className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black">
                1
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>{isSw ? "Sera ya Huduma za Google na Uthibitishaji (Google API Services & OAuth)" : "Google API Services & Google OAuth Verification"}</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">Google Compliant</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Utekelezaji thabiti wa Miongozo ya Google ya Data ya Watumiaji (Google API Services User Data Policy)" : "Strict adherence to Google API Services User Data Policy, including the Limited Use requirements."}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed font-sans">
              <p>
                {isSw ? (
                  <>
                    Programu ya <strong>LedgerBox Store & POS</strong> inaweza kutumia huduma za Google OAuth kwa madhumuni mawili tu yaliyoidhinishwa na mtumiaji kwa uwazi:
                  </>
                ) : (
                  <>
                    The <strong>LedgerBox Store & POS</strong> application may utilize Google OAuth services exclusively for two user-authorized functions:
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <UserCheck size={14} />
                    <span>{isSw ? "A. Kuingia Salama (Google Sign-In)" : "A. Secure Google Sign-In"}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-400">
                    {isSw 
                      ? "Kuthibitisha utambulisho wa mmiliki wa duka kwa usalama bila kuhifadhi nenosiri la siri kwenye seva zetu. Tunatumia anwani ya barua pepe (Email) na Jina pekee."
                      : "Verifying store owner identity securely without storing sensitive master passwords. We only access your basic email address and display profile name."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Server size={14} />
                    <span>{isSw ? "B. Nakala Salama (Google Sheets / Drive Backup)" : "B. Optional Google Sheets Cloud Backup"}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-400">
                    {isSw 
                      ? "Kuwezesha mtumiaji anapoomba kuhamisha stakabadhi na ripoti za mauzo moja kwa moja kwenye lahajedwali (Google Spreadsheet) ya akaunti yake binafsi ya Google Drive."
                      : "Allowing users to selectively export, append, or synchronize their itemized transactions into their own private Google Spreadsheet on Google Drive."}
                  </p>
                </div>
              </div>

              {/* LIMITED USE CLAUSE */}
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl space-y-2 mt-3">
                <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale size={14} />
                  <span>{isSw ? "TAMKO LA MATUMIZI YA KIPEKEE (LIMITED USE REQUIREMENTS)" : "GOOGLE LIMITED USE DISCLOSURE"}</span>
                </h4>
                <p className="text-[11.5px] text-slate-200">
                  {isSw ? (
                    <>
                      Matumizi na uhamishaji wa taarifa zilizopokelewa kutoka kwa Google APIs hadi kwenye programu nyingine yoyote kutoka LedgerBox yatafuata{' '}
                      <strong className="text-indigo-300">Google API Services User Data Policy</strong>, ikiwemo masharti ya <em>Limited Use</em>. Hatutumii taarifa hizi kutoa au kufundisha mifumo mikubwa ya akili bandia (AI/ML models) au kuziuza kwa mawakala wa matangazo ya kibiashara.
                    </>
                  ) : (
                    <>
                      LedgerBox's use and transfer to any other app of information received from Google APIs will adhere to{' '}
                      <strong className="text-indigo-300">Google API Services User Data Policy</strong>, including the <em>Limited Use</em> requirements. We do not use Google user data to serve targeted advertisements or train third-party artificial intelligence / machine learning models.
                    </>
                  )}
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11.5px]">
                <li>{isSw ? "Upeo wa ruhusa (Scopes) unaoombwa unatumika tu kuandika kwenye spreadsheet iliyoteuliwa na mtumiaji." : "Requested OAuth scopes (e.g. Google Sheets API) are restricted strictly to spreadsheets designated by the user."}</li>
                <li>{isSw ? "Hakuna mtu yeyote au seva ya nje inayosoma maudhui ya faili zako binafsi za Google Drive." : "No human or automated third party reads or inspects your private personal files."}</li>
                <li>{isSw ? "Mtumiaji anaweza kufuta ruhusa ya Google wakati wowote kupitia Mipangilio ya Akaunti ya Google au ndani ya LedgerBox." : "Users may revoke Google access at any moment via Google Security Account Settings or within LedgerBox."}</li>
              </ul>
            </div>
          </section>
        )}

        {/* SECTION 2: DATA WE COLLECT */}
        {(selectedSection === 'all' || selectedSection === 'data_collected') && (
          <section id="section-data-collected" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black">
                2
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isSw ? "Aina za Data Tunazokusanya (Information We Collect)" : "Information and Categories of Data Collected"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Taarifa zinazohitajika kuendesha duka na mfumo wa stoo" : "Operational data strictly needed to operate your store inventory and accounting"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-200 block text-[12px]">{isSw ? "1. Taarifa za Duka & Akaunti" : "1. Account & Store Identity"}</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isSw 
                    ? "Jina la Duka, Simu, Barua Pepe, Anwani ya Duka, Nembo (Logo), na majina ya keshia/watumiaji wa mfumo."
                    : "Store Name, business phone, store email address, location address, store logo, and cashier staff PIN profiles."}
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-200 block text-[12px]">{isSw ? "2. Miamala na Bidhaa" : "2. Inventory & Sales Logs"}</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isSw 
                    ? "Orodha ya bidhaa, bei ya ununuzi na mauzo, idadi ya stoo, risiti za mauzo zilizotolewa, njia za malipo (Cash, M-Pesa, Kadi, Deni)."
                    : "Product SKUs, barcodes, unit cost and selling prices, inventory stock balances, sales receipts, and payment method choices."}
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-200 block text-[12px]">{isSw ? "3. Kitabu cha Madeni ya Wateja" : "3. Customer Debts Ledger"}</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isSw 
                    ? "Majina ya wateja wa maduka, namba zao za simu, salio la deni, na kumbukumbu za marejesho yaliyofanywa."
                    : "Customer names, contact numbers, outstanding debt amounts, due dates, and repayment transaction records."}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: PURPOSE OF DATA PROCESSING */}
        {(selectedSection === 'all' || selectedSection === 'data_usage') && (
          <section id="section-data-usage" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                3
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isSw ? "Madhumuni ya Kuchakata Data (How We Use Your Data)" : "Purposes of Data Processing"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Uendeshaji wa kihasibu, risiti, na kodi bila matumizi yasiyoidhinishwa" : "Store accounting, receipt issuance, tax estimates, without unauthorized usage"}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-sans">
              <p>
                {isSw ? "Tunatumia taarifa zako kwa madhumuni yafuatayo pekee:" : "We process and utilize your information strictly for the following operational purposes:"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  {
                    title: isSw ? "Kutoa Stakabadhi & Risiti" : "Issuing Receipts & Invoices",
                    desc: isSw ? "Kutengeneza risiti halali za mauzo kwa wateja (WhatsApp, SMS, na Print)." : "Generating branded sales vouchers and receipts for store customers."
                  },
                  {
                    title: isSw ? "Hesabu za Faida na Kodi (TRA)" : "Financial Reports & Tax Estimates",
                    desc: isSw ? "Kukokotoa faida halisi, hasara, thamani ya stoo na makadirio ya kodi ya mapato." : "Calculating net profits, inventory valuation, and presumptive tax brackets."
                  },
                  {
                    title: isSw ? "Usimamizi wa Madeni" : "Credit & Debt Reconciliation",
                    desc: isSw ? "Kuhakikisha mauzo ya mkopo yanatenganishwa na fedha halisi hadi yatakapolipwa." : "Ensuring credit sales are decoupled from cash flow until payment is received."
                  },
                  {
                    title: isSw ? "Hifadhi ya Nje ya Mtandao (Offline)" : "Offline-First Data Reliability",
                    desc: isSw ? "Kuhakikisha duka linaendelea kufanya kazi hata bila mtandao wa intaneti." : "Ensuring continuous cashier operations even during network dropouts."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-200 block text-[11.5px]">{item.title}</strong>
                      <span className="text-[10.5px] text-slate-400 leading-snug">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: OFFLINE-FIRST STORAGE & ENCRYPTION */}
        {(selectedSection === 'all' || selectedSection === 'offline_security') && (
          <section id="section-security" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-black">
                4
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isSw ? "Hifadhi ya Ndani ya Kifaa na Ulinzi wa Taarifa (Local Storage & Security)" : "Local Storage Architecture & Security Protocols"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Ulinzi wa hali ya juu ndani ya kivinjari chako (Sandbox Security)" : "Browser-sandboxed encrypted data persistence with optional cloud sync"}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Lock size={15} />
                  <span>{isSw ? "Muundo wa Zero-Knowledge na Faragha ya Kifaa" : "Device-First & Zero-Knowledge Architecture"}</span>
                </div>
                <p className="text-slate-300 text-[11.5px]">
                  {isSw 
                    ? "Data zote za duka (Database) huhifadhiwa kwanza moja kwa moja kwenye kifaa unachotumia (Local Browser Storage / IndexedDB). Hakuna wahudumu au wavamizi wa mtandaoni wanaoweza kufikia data zako bila ufunguo wa akaunti yako."
                    : "Your store transactions, customer books, and inventory are saved locally in encrypted browser containers (Local Storage & IndexedDB). Unless you explicitly activate cloud synchronization or Google Sheets sync, your business data never leaves your device."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <strong className="text-slate-200 block mb-1">{isSw ? "Uhamishaji Salama (TLS 1.3)" : "Encrypted Transit (TLS 1.3)"}</strong>
                  <span className="text-[11px] text-slate-400">
                    {isSw ? "Mawasiliano yote na Google au Wingu yanasimbwa kwa teknolojia ya HTTPS/TLS 1.3." : "All network requests to Google or cloud backends enforce HTTPS/TLS 1.3 encryption."}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <strong className="text-slate-200 block mb-1">{isSw ? "PIN na Ulinzi wa Wafanyakazi" : "Staff Access Controls & PINs"}</strong>
                  <span className="text-[11px] text-slate-400">
                    {isSw ? "Kila keshia ana uwezo wa kuweka PIN yake na ruhusa maalum (Permissions) za kuzuia kuona ripoti au kubadili bei." : "Role-based access control (RBAC) allows store owners to restrict cashier permissions and audit trail logs."}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: USER RIGHTS, DATA EXPORT & PERMANENT DELETION */}
        {(selectedSection === 'all' || selectedSection === 'user_rights') && (
          <section id="section-rights" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-black">
                5
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isSw ? "Haki za Mtumiaji, Uhamishaji na Ufutaji wa Data (Your Rights & Deletion)" : "User Rights, Data Portability & Complete Deletion"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Haki yako kamili ya kupakua, kubadili au kufuta kabisa data zako" : "Your right to access, export, rectify, or permanently wipe your business records"}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <p>
                {isSw 
                  ? "Chini ya sheria za ulinzi wa data za Tanzania na kimataifa, una haki zifuatazo zinazotekelezwa moja kwa moja ndani ya LedgerBox:"
                  : "Under applicable data protection laws, you retain full ownership and governance over your data:"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 block text-[11.5px]">{isSw ? "A. Haki ya Kupakua (Portability)" : "A. Data Export (Portability)"}</strong>
                  <p className="text-slate-400 text-[10.5px]">
                    {isSw 
                      ? "Unaweza kupakua ripoti zote kama faili la PDF, Excel (CSV), au nakala kamili ya JSON wakati wowote."
                      : "Export all sales records, inventory lists, and financial reports as PDF, CSV spreadsheets, or full JSON backups."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-blue-400 block text-[11.5px]">{isSw ? "B. Haki ya Kurekebisha (Rectification)" : "B. Right to Rectify"}</strong>
                  <p className="text-slate-400 text-[10.5px]">
                    {isSw 
                      ? "Unaweza kubadilisha taarifa yoyote ya bidhaa, jina la duka, au kurekebisha hesabu za stoo."
                      : "Update or modify any product descriptions, prices, store identity, or accounting logs directly in settings."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-rose-400 block text-[11.5px]">{isSw ? "C. Haki ya Kufuta Kabisa (Erasure)" : "C. Right to Permanent Erasure"}</strong>
                  <p className="text-slate-400 text-[10.5px]">
                    {isSw 
                      ? "Ndani ya Mipangilio (Settings), una kitufe cha 'Futa Data Zote (Reset Database)' kinachofuta taarifa zote mara moja bila kubaki popote."
                      : "Permanently delete all store data, accounts, and transaction records in one click via 'Reset Database' in settings."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 6: CONTACT & DATA PROTECTION OFFICER (DPO) */}
        {(selectedSection === 'all' || selectedSection === 'contact') && (
          <section id="section-contact" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-black">
                6
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isSw ? "Mawasiliano na Afisa wa Ulinzi wa Data (Contact & DPO)" : "Contact & Data Protection Officer (DPO)"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSw ? "Wasiliana nasi kwa maswali yoyote kuhusu sera hii au uthibitishaji wa Google" : "Direct inquiries regarding this Privacy Policy, Google verification, or data deletion requests"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Building size={15} className="text-indigo-400" />
                  <span>LedgerBox Data & Compliance Office</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isSw 
                    ? "Ikiwa una swali lolote la kisheria, ombi la kufuta data, au ukaguzi wa uthibitishaji wa Google API, tafadhali wasiliana na idara yetu ya faragha:"
                    : "For inquiries regarding Google API verification compliance, GDPR compliance, or data subject requests, reach out directly:"}
                </p>
                <div className="pt-1 space-y-1 text-slate-300 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-indigo-400" />
                    <span className="font-mono text-indigo-300 font-bold">privacy@ledgerbox.app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-indigo-400" />
                    <span className="font-mono text-indigo-300">dpo@ledgerbox.app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-emerald-400" />
                    <span>Dar es Salaam, Tanzania • Africa / Global Support</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2 mb-1">
                    <Shield size={15} className="text-emerald-400" />
                    <span>{isSw ? "Haki Miliki na Marekebisho" : "Ownership & Amendments"}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {isSw 
                      ? "Sera hii inakaguliwa mara kwa mara kulingana na mabadiliko ya kisheria na teknolojia ya mifumo ya Google. Marekebisho yote yatawekwa wazi kwenye ukurasa huu."
                      : "This policy is reviewed periodically to adhere to evolving data regulations and Google platform policy updates. All revisions will be posted openly on this URL."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10.5px] text-slate-500">
                  © 2026 LedgerBox Store & POS. {isSw ? "Haki zote zimehifadhiwa." : "All rights reserved."}
                </div>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <p>
          {isSw 
            ? "LedgerBox Store & POS • Mfumo Salama wa Mauzo, Stoo na Uhasibu wa Maduka"
            : "LedgerBox Store & POS • Secure Retail Store & Inventory Management Platform"}
        </p>
      </footer>

    </div>
  );
}
