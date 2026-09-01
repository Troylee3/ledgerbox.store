/**
 * TAX EXPLANATION ENGINE (TANZANIA - TRA)
 * Language: TypeScript (React/Node.js compatible)
 * 
 * Moduli hii inakokotoa kodi za Tanzania kiotomatiki, kutoa maelezo ya Kiswahili
 * yenye namba halisi za mfanyabiashara, na kutoa vifungu sahihi vya sheria (TRA).
 */

export interface TaxEngineInput {
  annualTurnover: number; // Mauzo Ghafi ya Mwaka (Gross Turnover)
  annualExpenses: number; // Matumizi ya Mwaka (Operating Expenses)
  keepsRecords: boolean;  // Je, anamiliki na kutunza kumbukumbu za hesabu?
  isVatRegistered?: boolean; // VAT imeondolewa kwenye mfumo
}

export interface TaxComponentResult {
  amount: number;
  explanation: string;
  legalReference: string;
}

export interface TaxEngineOutput {
  turnover: number;
  expenses: number;
  netProfit: number;
  vat: TaxComponentResult;
  presumptiveTax: TaxComponentResult;
  corporateTax: TaxComponentResult;
  totalTaxLiability: number;
  recommendedTaxRegime: string; // Ushauri wa TRA
}

/**
 * Kokotoa na ueleze kodi kulingana na sheria za TRA (Tanzania Revenue Authority)
 * 
 * @param input Data za kodi za mfanyabiashara
 * @returns Matokeo ya kikokotoo yakiwa na maelezo ya Kiswahili na vifungu vya sheria
 */
export function calculateTanzaniaTax(input: TaxEngineInput): TaxEngineOutput {
  const { annualTurnover, annualExpenses, keepsRecords } = input;
  const netProfit = Math.max(0, annualTurnover - annualExpenses);

  // 1. VAT (Kodi ya Ongezeko la Thamani imeondolewa)
  const vatResult: TaxComponentResult = {
    amount: 0,
    explanation: `Kodi ya VAT imeondolewa kwenye mfumo huu. Hakuna kodi ya VAT inayotozwa au kukusanywa kwenye mauzo haya.`,
    legalReference: 'Kodi ya Mapato (Income Tax Act [CAP 332])'
  };

  // 2. KOKOTOA PRESUMPTIVE TAX (Kodi ya Makadirio)
  // Inatumika kwa mauzo ya chini ya TZS 200,000,000 kwa mwaka.
  // Kiwango kipya: 4.0% kwa mauzo yanayozidi TZS 11,000,000 kwa mwaka
  let presumptiveAmount = 0;
  let presumptiveExplanation = '';

  if (annualTurnover > 200000000) {
    presumptiveExplanation = `Mauzo yako ya mwaka ya TZS ${annualTurnover.toLocaleString()} yamezidi kikomo cha chini cha Kodi ya Makadirio (Presumptive Tax Limit) ambacho ni TZS 200,000,000. Hivyo, haulipi kodi ya makadirio, bali unalazimika kisheria kuandaa hesabu zilizokaguliwa (Audited Financial Statements) na kulipa kodi ya kampuni ya 30% ya Faida Halisi.`;
  } else {
    // Mabano ya Kodi ya Makadirio (TRA Presumptive Tax Bands)
    if (annualTurnover <= 4000000) {
      presumptiveAmount = 0;
      presumptiveExplanation = `Mauzo yako ya TZS ${annualTurnover.toLocaleString()} yapo chini ya kiwango cha chini cha kuanza kutoza kodi ya makadirio (TZS 4,000,000). Hivyo, kodi yako ya makadirio ya mwaka ni TZS 0. Unahimizwa kuendelea kutunza kumbukumbu vizuri.`;
    } 
    else if (annualTurnover > 4000000 && annualTurnover <= 7000000) {
      if (keepsRecords) {
        // 3% of turnover above 4M
        presumptiveAmount = (annualTurnover - 4000000) * 0.03;
        presumptiveExplanation = `Kwa kuwa unamiliki na kutunza kumbukumbu za duka na mauzo yako ni TZS ${annualTurnover.toLocaleString()} (yapo kati ya milioni 4 hadi 7), unatozwa 3% tu ya kiasi kinachozidi milioni 4: 3% × (TZS ${annualTurnover.toLocaleString()} - TZS 4,000,000) = TZS ${presumptiveAmount.toLocaleString()}. Hongera kwa kutunza kumbukumbu!`;
      } else {
        presumptiveAmount = 100000;
        presumptiveExplanation = `Kwa kuwa hautunzi kumbukumbu rasmi za duka na mauzo yako ni TZS ${annualTurnover.toLocaleString()} (kati ya milioni 4 hadi 7), unatozwa kiwango maalum cha kudumu cha TZS 100,000 kwa mwaka. Tunakushauri uanze kutunza vitabu vya hesabu ili upunguziwe kodi hii.`;
      }
    } 
    else if (annualTurnover > 7000000 && annualTurnover <= 11000000) {
      if (keepsRecords) {
        // TZS 90,000 + 3% of turnover above 7M
        presumptiveAmount = 90000 + (annualTurnover - 7000000) * 0.03;
        presumptiveExplanation = `Mauzo yako ni TZS ${annualTurnover.toLocaleString()} (kati ya milioni 7 hadi 11) na unamiliki vitabu vya kumbukumbu. Unatozwa kodi ya msingi ya TZS 90,000 pamoja na 3% ya mauzo yanayozidi milioni 7: TZS 90,000 + 3% × (TZS ${annualTurnover.toLocaleString()} - TZS 7,000,000) = TZS ${presumptiveAmount.toLocaleString()}.`;
      } else {
        presumptiveAmount = 250000;
        presumptiveExplanation = `Mauzo yako ni TZS ${annualTurnover.toLocaleString()} (kati ya milioni 7 hadi 11) na hautunzi kumbukumbu za hesabu. Unalazimika kulipa kodi ya makadirio ya kiwango cha juu cha kudumu cha TZS 250,000 kwa mwaka kulingana na miongozo ya TRA.`;
      }
    } 
    else {
      // Zaidi ya TZS 11,000,000 hadi 200,000,000
      // Kiwango kipya ni 4.0% kwa mauzo yanayozidi TZS 11,000,000 kwa mwaka
      const taxableOver = annualTurnover - 11000000;
      presumptiveAmount = taxableOver * 0.04;
      presumptiveExplanation = `Mauzo yako ya TZS ${annualTurnover.toLocaleString()} yamevuka kiwango cha TZS 11,000,000 kwa mwaka. Kulingana na sheria mpya za kodi nchini Tanzania, unatozwa kodi ya makadirio ya kiwango cha 4.0% kwa kiasi cha mauzo kinachozidi TZS 11,000,000: 4% × (TZS ${annualTurnover.toLocaleString()} - TZS 11,000,000) = TZS ${presumptiveAmount.toLocaleString()}.`;
    }
  }

  const presumptiveResult: TaxComponentResult = {
    amount: presumptiveAmount,
    explanation: presumptiveExplanation,
    legalReference: 'First Schedule (Ibara ya Kwanza), Income Tax Act [CAP 332]'
  };

  // 3. KOKOTOA CORPORATE TAX (Kodi ya Mapato ya Kampuni)
  // Corporate Tax: 30% ya Faida Halisi (Net Profit = Mauzo - Matumizi) kwa makampuni (Section 4(1)(a))
  let corporateAmount = 0;
  let corporateExplanation = '';

  if (netProfit <= 0) {
    corporateExplanation = `Biashara yako haijaingiza faida yoyote ya mwaka (Mauzo ya TZS ${annualTurnover.toLocaleString()} dhidi ya Matumizi ya TZS ${annualExpenses.toLocaleString()}). Kwa kuwa hakuna faida halisi (Net Profit ni TZS 0), kodi yako ya mapato ya kampuni ni TZS 0. Kodi hii inatozwa tu kwenye faida, sio kwenye hasara.`;
  } else {
    corporateAmount = netProfit * 0.30;
    corporateExplanation = `Biashara yako imepata faida halisi (Net Profit) ya TZS ${netProfit.toLocaleString()} (baada ya kutoa matumizi ya TZS ${annualExpenses.toLocaleString()} kutoka kwenye mauzo ya TZS ${annualTurnover.toLocaleString()}). Kulingana na sheria, kiwango cha kodi ya kampuni ni 30% ya faida hiyo halisi: 30% × TZS ${netProfit.toLocaleString()} = TZS ${corporateAmount.toLocaleString()}.`;
  }

  const corporateResult: TaxComponentResult = {
    amount: corporateAmount,
    explanation: corporateExplanation,
    legalReference: 'Section 4(1)(a) read together with the Third Schedule, Income Tax Act [CAP 332]'
  };

  // Jumla ya kodi inategemea mfumo anaoingia (Recommended Tax Regime)
  // Kama mauzo > 200M, lazima afuate Corporate Tax + VAT (kama amesajiliwa)
  // Kama mauzo <= 200M, kwa kawaida TRA wana mpa Presumptive Tax kama mtu binafsi au kampuni changa
  let totalTaxLiability = 0;
  let recommendedTaxRegime = '';

  if (annualTurnover > 200000000) {
    totalTaxLiability = corporateAmount;
    recommendedTaxRegime = 'CORPORATE_TAX_REGIME';
  } else {
    // Kwa biashara ndogo na za kati, Presumptive Tax ndio muundo mkuu wa kodi wa mwaka
    totalTaxLiability = presumptiveAmount;
    recommendedTaxRegime = 'PRESUMPTIVE_TAX_REGIME';
  }

  return {
    turnover: annualTurnover,
    expenses: annualExpenses,
    netProfit,
    vat: vatResult,
    presumptiveTax: presumptiveResult,
    corporateTax: corporateResult,
    totalTaxLiability,
    recommendedTaxRegime
  };
}
