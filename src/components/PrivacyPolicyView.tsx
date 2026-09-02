import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowLeft,
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Globe, 
  KeyRound, 
  FileText,
  UserCheck,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface PrivacyPolicyViewProps {
  onClose?: () => void;
}

export default function PrivacyPolicyView({ onClose }: PrivacyPolicyViewProps) {
  const { language } = useLanguage();
  const [activeLang, setActiveLang] = useState<'EN' | 'SW'>(language === 'SW' ? 'SW' : 'EN');
  const [copied, setCopied] = useState(false);

  const isSw = activeLang === 'SW';

  const handlePrint = () => {
    window.print();
  };

  const rawPolicyEn = `# Privacy Policy for Ledgerbox

Last updated: September 2, 2026

At Ledgerbox (accessible from https://ledgerbox.store), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Ledgerbox and how we use it.

## 1. Information We Collect (Google OAuth)
When you log in or sign up using "Sign in with Google", we collect and access your Google profile information, specifically:
- Your primary Google email address
- Your full name and profile picture

## 2. How We Use Your Information
We use the information we collect from Google OAuth solely to:
- Create and authenticate your Ledgerbox POS account.
- Personalize your dashboard experience.
- Send important system notifications regarding your POS account.

We DO NOT sell, trade, or rent your personal identification information to third parties.

## 3. Data Protection and Security
We implement strict security measures to protect your data. Your Google account credentials are secured through Google's own authentication layers, and we only store essential profile data required to operate the POS software.

## 4. Contact Us
If you have any questions about this Privacy Policy, please contact us at info@ledgerbox.store.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawPolicyEn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="privacy-policy-view" className="min-h-full bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* TOP HEADER / ACTION BAR */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg print:hidden">
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
                {isSw ? "Sera ya Faragha ya Ledgerbox" : "Privacy Policy for Ledgerbox"}
              </h1>
              <p className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} className="inline" />
                <span>https://ledgerbox.store • info@ledgerbox.store</span>
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (Language Switcher, Copy, Print) */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLang('EN')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'EN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang('SW')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'SW' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kiswahili
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={isSw ? "Nakili Maandishi" : "Copy Policy Text"}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-300" />}
            <span className="hidden sm:inline">{copied ? (isSw ? "Imenakiliwa!" : "Copied!") : (isSw ? "Nakili" : "Copy")}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            title={isSw ? "Chapa / Pakua PDF" : "Print or Save as PDF"}
          >
            <Printer size={14} />
            <span className="hidden md:inline">{isSw ? "Chapa / PDF" : "Print / PDF"}</span>
          </button>
        </div>
      </header>

      {/* MAIN DOCUMENT BODY */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
        
        {/* DOCUMENT CARD */}
        <article className="bg-slate-950 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          
          {/* HEADER AREA */}
          <div className="border-b border-slate-800/80 pb-6 space-y-3 print:border-gray-200">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold print:border-gray-300 print:text-gray-800">
              <ShieldCheck size={14} />
              <span>{isSw ? "Sera Rasmi ya Faragha" : "Official Privacy Policy"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight print:text-black">
              {isSw ? "Sera ya Faragha ya Ledgerbox" : "Privacy Policy for Ledgerbox"}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium print:text-gray-600">
              <div>
                <strong className="text-slate-200 print:text-black">{isSw ? "Ilisasishwa Mwisho:" : "Last updated:"}</strong>{' '}
                <span className="font-mono text-emerald-400 font-bold print:text-gray-900">{isSw ? "2 Septemba 2026" : "September 2, 2026"}</span>
              </div>
              <span className="text-slate-600 print:hidden">•</span>
              <div>
                <strong className="text-slate-200 print:text-black">{isSw ? "Tovuti Rasmi:" : "Accessible from:"}</strong>{' '}
                <a 
                  href="https://ledgerbox.store" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline font-mono inline-flex items-center gap-1 print:text-black"
                >
                  https://ledgerbox.store
                  <ExternalLink size={11} className="print:hidden" />
                </a>
              </div>
            </div>
          </div>

          {/* INTRODUCTORY PARAGRAPH */}
          <div className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal bg-slate-900/60 p-5 rounded-2xl border border-slate-800/70 print:bg-transparent print:border-none print:p-0 print:text-gray-800">
            {isSw ? (
              <p>
                Katika <strong>Ledgerbox</strong> (inayopatikana kupitia{' '}
                <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">
                  https://ledgerbox.store
                </a>
                ), moja ya vipaumbele vyetu vikuu ni faragha ya wageni wetu. Hati hii ya Sera ya Faragha ina aina za taarifa zinazokusanywa na kurekodiwa na Ledgerbox na jinsi tunavyozitumia.
              </p>
            ) : (
              <p>
                At <strong>Ledgerbox</strong> (accessible from{' '}
                <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">
                  https://ledgerbox.store
                </a>
                ), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Ledgerbox and how we use it.
              </p>
            )}
          </div>

          {/* SECTION 1: INFORMATION WE COLLECT (GOOGLE OAUTH) */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/30 shrink-0 print:border-gray-400 print:text-black">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "1. Taarifa Tunazokusanya (Google OAuth)" : "1. Information We Collect (Google OAuth)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? 'Unapoingia au kujisajili kwa kutumia "Sign in with Google", tunakusanya na kufikia taarifa za wasifu wako wa Google, hasa:'
                  : 'When you log in or sign up using "Sign in with Google", we collect and access your Google profile information, specifically:'}
              </p>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5 print:text-black">
                    <Mail size={16} />
                  </div>
                  <div>
                    <strong className="text-slate-100 text-sm block print:text-black">
                      {isSw ? "Anwani yako kuu ya barua pepe ya Google (Primary Google email address)" : "Your primary Google email address"}
                    </strong>
                    <span className="text-xs text-slate-400 print:text-gray-600">
                      {isSw ? "Inatumika kwa utambulisho na kuingia salama kwenye akaunti yako." : "Used for account identification, secure login, and communication."}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 flex items-start gap-3 print:border-gray-200">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 print:text-black">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <strong className="text-slate-100 text-sm block print:text-black">
                      {isSw ? "Jina lako kamili na picha ya wasifu (Full name and profile picture)" : "Your full name and profile picture"}
                    </strong>
                    <span className="text-xs text-slate-400 print:text-gray-600">
                      {isSw ? "Inatumika kubinafsisha kiolesura na kukuonyesha wewe na biashara yako." : "Used to personalize your dashboard interface and cashier profile."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: HOW WE USE YOUR INFORMATION */}
          <section className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/30 shrink-0 print:border-gray-400 print:text-black">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "2. Jinsi Tunavyotumia Taarifa Zako" : "2. How We Use Your Information"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunatumia taarifa tunazokusanya kutoka kwa Google OAuth kwa madhumuni haya pekee:" 
                  : "We use the information we collect from Google OAuth solely to:"}
              </p>

              <ul className="space-y-2.5">
                {[
                  isSw ? "Kutengeneza na kuthibitisha akaunti yako ya Ledgerbox POS." : "Create and authenticate your Ledgerbox POS account.",
                  isSw ? "Kubinafsisha uzoefu wako wa dashibodi (dashboard experience)." : "Personalize your dashboard experience.",
                  isSw ? "Kutuma arifa muhimu za mfumo kuhusu akaunti yako ya POS." : "Send important system notifications regarding your POS account."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 font-medium print:text-black">{item}</span>
                  </li>
                ))}
              </ul>

              {/* NON-DISCLOSURE GUARANTEE CALLOUT */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1 text-xs print:bg-gray-50 print:border-gray-400">
                <div className="font-extrabold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5 print:text-black">
                  <ShieldCheck size={15} />
                  <span>{isSw ? "AHADI YETU YA FARAGHA" : "PRIVACY GUARANTEE"}</span>
                </div>
                <p className="text-slate-200 font-semibold leading-relaxed print:text-gray-900">
                  {isSw 
                    ? "HATUUZI, hatufanyi biashara, wala hatukodishi taarifa zako binafsi za utambulisho kwa wahusika wengine (third parties)."
                    : "We DO NOT sell, trade, or rent your personal identification information to third parties."}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: DATA PROTECTION AND SECURITY */}
          <section className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-sm border border-purple-500/30 shrink-0 print:border-gray-400 print:text-black">
                3
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "3. Ulinzi na Usalama wa Data" : "3. Data Protection and Security"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunatekeleza hatua madhubuti za kiusalama kulinda data zako. Vitambulisho na nenosiri la akaunti yako ya Google vinalindwa kupitia mifumo ya usalama ya Google yenyewe, na tunahifadhi tu data muhimu za wasifu zinazohitajika kuendesha programu ya POS."
                  : "We implement strict security measures to protect your data. Your Google account credentials are secured through Google's own authentication layers, and we only store essential profile data required to operate the POS software."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs print:text-black">
                    <Lock size={14} />
                    <span>{isSw ? "Mifumo ya Google ya Ulinzi" : "Google Authentication Layers"}</span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {isSw ? "Nenosiri halifikiwi wala kuhifadhiwa kwenye seva zetu." : "Master passwords are never accessed or stored on our servers."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs print:text-black">
                    <KeyRound size={14} />
                    <span>{isSw ? "Data Muhimu Pekee" : "Minimal Essential Data"}</span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {isSw ? "Ni taarifa za msingi tu zinazohitajika kuendesha stoo na mauzo." : "Strictly the minimum data required to manage your store."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: CONTACT US */}
          <section className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center font-black text-sm border border-teal-500/30 shrink-0 print:border-gray-400 print:text-black">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "4. Wasiliana Nasi" : "4. Contact Us"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Ikiwa una maswali yoyote kuhusu Sera hii ya Faragha, tafadhali wasiliana nasi kupitia info@ledgerbox.store."
                  : "If you have any questions about this Privacy Policy, please contact us at info@ledgerbox.store."}
              </p>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 print:text-black">
                    <Mail size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium print:text-gray-600">
                      {isSw ? "Barua Pepe Rasmi ya Faragha:" : "Official Contact Email:"}
                    </span>
                    <a 
                      href="mailto:info@ledgerbox.store" 
                      className="text-base font-bold text-indigo-300 hover:text-indigo-200 font-mono underline"
                    >
                      info@ledgerbox.store
                    </a>
                  </div>
                </div>

                <a 
                  href="mailto:info@ledgerbox.store?subject=Privacy%20Policy%20Inquiry%20-%20Ledgerbox" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs print:hidden"
                >
                  <Mail size={14} />
                  <span>{isSw ? "Tuma Barua Pepe" : "Send Email"}</span>
                </a>
              </div>
            </div>
          </section>

          {/* FOOTER DETAILS */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 print:text-gray-600">
            <div>
              © 2026 <strong>Ledgerbox</strong> (https://ledgerbox.store). {isSw ? "Haki zote zimehifadhiwa." : "All rights reserved."}
            </div>
            <div className="font-mono">
              Version: 2026.09.02
            </div>
          </div>

        </article>

      </div>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          Ledgerbox Store & POS • <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">https://ledgerbox.store</a> • <a href="mailto:info@ledgerbox.store" className="text-indigo-400 hover:underline">info@ledgerbox.store</a>
        </p>
      </footer>

    </div>
  );
}
