// =============================================================================
// Decision Engine — pure functions, no side effects, no framework dependencies.
// This entire file lifts to the backend in Phase 2 with ZERO changes.
//
// Rules encoded here are from the business-logic spec:
//   - Credit: 580+ FHA, <580 needs 10% down, 620+ for Non-QM
//   - Income: gross-income midpoints, existing debts + rough mortgage for total DTI snapshot
//   - Cash: QM 3.5% baseline, Non-QM 10-20% down + 2% closing
//   - Readiness: 3/3 = ideal, 2/3 = workable, <=1 = not ready
// =============================================================================

import type {
  CashRange,
  CreditRange,
  EmploymentType,
  IncomeRange,
  Lead,
  LeadDecision,
  LeadInputs,
  LoanPath,
  PillarAnalysis,
  PillarScore,
  ReadinessLevel,
  Recommendation,
} from "./types";

// -----------------------------------------------------------------------------
// Range → number conversions (midpoints for rough calculations)
// -----------------------------------------------------------------------------
const incomeMidpoint: Record<IncomeRange, number> = {
  UNDER_40K: 30000,
  "40K_60K": 50000,
  "60K_90K": 75000,
  "90K_150K": 120000,
  "150K_PLUS": 220000,
};

const cashMidpoint: Record<CashRange, number> = {
  UNDER_5K: 2500,
  "5K_15K": 10000,
  "15K_30K": 22500,
  "30K_60K": 45000,
  "60K_PLUS": 80000,
};

const creditMidpoint: Record<CreditRange, number> = {
  BELOW_580: 560,
  "580_619": 600,
  "620_679": 650,
  "680_739": 710,
  "740_PLUS": 760,
};

// -----------------------------------------------------------------------------
// Income / debt helpers — mortgage-realistic DTI snapshot (not underwriting).
// -----------------------------------------------------------------------------
export function getEstimatedMonthlyGrossIncome(inputs: LeadInputs): number {
  const annual = incomeMidpoint[inputs.annualGrossIncome];
  return annual / 12;
}

/** Rough mortgage payment: ~1% of target price per month (placeholder when unknown). */
export function getEstimatedMortgagePayment(inputs: LeadInputs): number {
  const price = inputs.targetPurchasePrice ?? 300000;
  return price * 0.01;
}

/**
 * Existing debt payments as % of gross monthly income (no mortgage payment).
 */
export function getExistingDebtRatio(inputs: LeadInputs): number {
  const mg = getEstimatedMonthlyGrossIncome(inputs);
  if (mg <= 0) return 100;
  return (inputs.monthlyDebtPayments / mg) * 100;
}

/**
 * Estimated total DTI % = (existing monthly debts + estimated mortgage) / monthly gross.
 */
export function getEstimatedTotalDti(inputs: LeadInputs): number {
  const mg = getEstimatedMonthlyGrossIncome(inputs);
  if (mg <= 0) return 100;
  const mortgage = getEstimatedMortgagePayment(inputs);
  return ((inputs.monthlyDebtPayments + mortgage) / mg) * 100;
}

// Investment property — buyer-facing wording only (cash + explanation). No scoring impact.
type InvestmentIncomeDocTone = "traditional" | "writeoffs" | "neutral";

function investmentIncomeDocTone(inputs: LeadInputs): InvestmentIncomeDocTone {
  if (
    inputs.employmentType === "SELF_EMPLOYED_FILED" &&
    inputs.heavyWriteOffs === true
  ) {
    return "writeoffs";
  }
  if (
    inputs.employmentType === "W2" ||
    (inputs.employmentType === "SELF_EMPLOYED_FILED" &&
      inputs.heavyWriteOffs !== true)
  ) {
    return "traditional";
  }
  return "neutral";
}

function investmentStructureLine(): string {
  return "Investment properties are structured differently than primary homes, so loan structure may matter more here — review with your loan officer.";
}

function investmentIncomePathLine(tone: InvestmentIncomeDocTone): string {
  if (tone === "traditional") {
    return "A traditional or conventional loan path may be available depending on how the file is structured — review with your loan officer.";
  }
  if (tone === "writeoffs") {
    return "Non-QM may be a better fit depending on how the file is structured — review with your loan officer.";
  }
  return "Depending on how income is documented, there may be a path forward with the right structure — review with your loan officer.";
}

/** For the likely Non-QM branch (unfiled vs heavy write-offs). Wording only. */
function investmentLikelyNonQmDocLine(inputs: LeadInputs): string {
  if (inputs.employmentType === "SELF_EMPLOYED_NOT_FILED") {
    return "Depending on how income is documented, there may be several paths worth exploring depending on how the file is structured — review with your loan officer.";
  }
  return investmentIncomePathLine("writeoffs");
}

/** Primary / QM / 580+ FHA path only: keep 5K–15K bucket from scoring weak. */
function shouldFloor5k15kPrimaryQmCashToModerate(
  inputs: LeadInputs,
  likelyNonQM: boolean,
  isInvestment: boolean,
): boolean {
  if (isInvestment) return false;
  if (inputs.cashAvailable !== "5K_15K") return false;
  if (likelyNonQM) return false;
  if (inputs.creditRange === "BELOW_580") return false;
  return true;
}

const CASH_5K_15K_PRIMARY_MODERATE_OVERRIDE: PillarAnalysis = {
  score: "moderate",
  headline: "Room to grow",
  detail:
    "You may not have all the cash needed yet, but this may still be workable with seller concessions, lender credits, or down payment assistance depending on the loan program and property.",
  factors: [
    "Primary home purchase",
    "Cash available is in the $5,000–$15,000 range",
    "Seller concessions may help cover some closing costs",
    "Down payment assistance may be available depending on eligibility",
  ],
};

// -----------------------------------------------------------------------------
// CREDIT PILLAR
// -----------------------------------------------------------------------------
export function scoreCredit(inputs: LeadInputs): PillarAnalysis {
  const score = creditMidpoint[inputs.creditRange];
  const factors: string[] = [];

  if (score >= 740) {
    factors.push("Top-tier credit — strong positioning for pricing and options");
    factors.push("There may be a stronger path depending on goals — review with your loan officer");
    return {
      score: "strong",
      headline: "Excellent credit",
      detail:
        "Credit is in a strong position with flexibility and access to a wide range of loan options based on how the file is structured. There may be a stronger path for your situation — review with your loan officer.",
      factors,
    };
  }

  if (score >= 680) {
    factors.push("Solid credit — FHA and conventional paths are typically in play");
    factors.push("Based on how the file is structured, there may be a stronger path — review with your loan officer");
    return {
      score: "strong",
      headline: "Solid credit",
      detail:
        "Credit supports strong positioning for FHA, conventional, and many specialty programs. Flexibility and pricing often look favorable; your loan officer can confirm the best fit based on how the file is structured.",
      factors,
    };
  }

  if (score >= 620) {
    factors.push("Down payment assistance (DPA) may be available depending on program and area");
    factors.push("There may be a stronger path based on how the file is structured — review with your loan officer");
    return {
      score: "moderate",
      headline: "Workable credit",
      detail:
        "Credit is in a workable range where FHA and many paths stay on the table. DPA may be possible where programs allow, and there may be a stronger path depending on income, cash, and how the file is structured — review with your loan officer.",
      factors,
    };
  }

  if (score >= 580) {
    factors.push("FHA is possible for many borrowers in this range with a reasonable path forward");
    factors.push("Based on how the file is structured, there may be a stronger path — review with your loan officer");
    return {
      score: "moderate",
      headline: "FHA is possible",
      detail:
        "This range often supports an FHA path with a reasonable down payment and closing picture, based on how the file is structured. There may be a stronger path as credit strengthens — review with your loan officer.",
      factors,
    };
  }

  // Below 580
  factors.push("Not right now for the strongest conventional snapshot — improvement path is clear");
  factors.push("Focus on payment history and balances; review timing with your loan officer");
  return {
    score: "weak",
    headline: "Not right now — room to strengthen",
    detail:
      "This snapshot isn’t showing the strongest credit position yet. That’s not a final word — it’s a not-right-now moment with a clear improvement path (for example, moving toward 580+ often opens more options). There may be a stronger path after a few steps; review with your loan officer on what to prioritize.",
    factors,
  };
}

// -----------------------------------------------------------------------------
// INCOME PILLAR (estimated total DTI + existing debt ratio vs gross income)
// -----------------------------------------------------------------------------
export function scoreIncome(inputs: LeadInputs): PillarAnalysis {
  const factors: string[] = [];

  // Self-employed special handling
  if (inputs.employmentType === "SELF_EMPLOYED_NOT_FILED") {
    factors.push("Self-employed, has not filed taxes");
    factors.push(
      "Traditional tax-return documentation isn’t in place yet — there may be a stronger path with the right doc package",
    );
    factors.push(
      "Non-QM bank-statement path may fit based on how the file is structured — review with your loan officer",
    );
    return {
      score: "weak",
      headline: "Unfiled taxes — a Non-QM path may fit",
      detail:
        "Without filed tax returns, many traditional QM loans lean on tax returns to document income. Based on how the file is structured, a Non-QM bank statement approach may be worth exploring; many programs look for roughly 620+ credit and about 10–20% down. Review with your loan officer.",
      factors,
    };
  }

  if (
    inputs.employmentType === "SELF_EMPLOYED_FILED" &&
    inputs.heavyWriteOffs === true
  ) {
    factors.push("Self-employed with heavy write-offs");
    factors.push(
      "Reported taxable income may be on the low side for some traditional paths — review with your loan officer",
    );
    factors.push("Consider bank statement loan (Non-QM)");
    return {
      score: "weak",
      headline: "Write-offs may reduce taxable income on paper",
      detail:
        "Heavy write-offs reduce reported income. QM lenders often lean on reported income in the file, so there may be a stronger path based on how the file is structured. A Non-QM bank statement loan may show true cash flow better — review with your loan officer.",
      factors,
    };
  }

  const annualGross = incomeMidpoint[inputs.annualGrossIncome];
  const totalDti = getEstimatedTotalDti(inputs);
  const existingRatio = getExistingDebtRatio(inputs);

  factors.push(
    `Estimated gross income ~$${annualGross.toLocaleString()}/yr (midpoint of selected range)`,
  );
  factors.push(`Estimated total DTI (rough): ${totalDti.toFixed(1)}%`);
  factors.push(`Existing monthly debts vs gross income: ${existingRatio.toFixed(1)}%`);
  factors.push(
    "Estimated mortgage payment is based on approximately 1% of the target purchase price (or a $300k placeholder when no price is entered).",
  );
  factors.push(
    "Final DTI depends on taxes, insurance, HOA dues, interest rate, and verified liabilities.",
  );
  factors.push(
    "AUS findings and lender overlays may allow or restrict higher DTI.",
  );

  if (totalDti <= 43 && existingRatio <= 30) {
    return {
      score: "strong",
      headline: "Manageable for mortgage review",
      detail:
        "Based on your estimated income, your debt load appears manageable for a mortgage review.",
      factors,
    };
  }

  if (totalDti <= 50) {
    return {
      score: "moderate",
      headline: "Income may support a mortgage",
      detail:
        "Your income may still support a mortgage, but the final approval will depend on the full payment, taxes, insurance, and debts.",
      factors,
    };
  }

  if (totalDti <= 56) {
    return {
      score: "moderate",
      headline: "Stretch — higher DTI may still qualify",
      detail:
        "This may be a stretch, but some programs may still allow higher DTI with strong compensating factors.",
      factors,
    };
  }

  return {
    score: "weak",
    headline: "Debt load may challenge approval",
    detail:
      "Your current debt load may make approval difficult unless debts are reduced, income increases, or a co-borrower is added.",
    factors,
  };
}

// -----------------------------------------------------------------------------
// CASH PILLAR
// -----------------------------------------------------------------------------
export function scoreCash(inputs: LeadInputs): PillarAnalysis {
  const cash = cashMidpoint[inputs.cashAvailable];
  const credit = creditMidpoint[inputs.creditRange];
  const factors: string[] = [];
  const isInvestment = inputs.occupancyIntent === "INVESTMENT_PROPERTY";
  const invTone = investmentIncomeDocTone(inputs);

  const totalDtiCash = getEstimatedTotalDti(inputs);
  const existingRatioCash = getExistingDebtRatio(inputs);
  const highDebtPressure =
    totalDtiCash > 50 || existingRatioCash > 45;

  const selfEmployedHeavyWriteOffs =
    inputs.employmentType === "SELF_EMPLOYED_FILED" &&
    inputs.heavyWriteOffs === true;

  const highCashNeed =
    isInvestment ||
    inputs.creditRange === "BELOW_580" ||
    selfEmployedHeavyWriteOffs ||
    highDebtPressure;

  // Stricter bar for "strong" when liquidity demand is elevated
  const nonQmStrongMult = highCashNeed ? 1.55 : 1.25;
  const fhaStrongMult = highCashNeed ? 1.85 : 1.5;

  if (highCashNeed) {
    factors.push("Higher cash need scenario — reserves matter more");
  }
  if (isInvestment) {
    factors.push(
      "Investment purchases usually require more cash up front for down payment, closing, and reserves",
    );
  }

  // Determine which loan path is realistic to decide the cash benchmark
  const likelyNonQM =
    inputs.employmentType === "SELF_EMPLOYED_NOT_FILED" ||
    (inputs.employmentType === "SELF_EMPLOYED_FILED" &&
      inputs.heavyWriteOffs === true);

  // Target purchase price — if not provided, assume a modest benchmark
  const assumedPrice = inputs.targetPurchasePrice ?? 300000;

  if (likelyNonQM) {
    // Non-QM: self-employed + heavy write-offs → ~15% down + closing (midpoint of 10–20%); unfiled → low end
    let needed = assumedPrice * (selfEmployedHeavyWriteOffs ? 0.17 : 0.12);
    if (isInvestment) {
      needed = Math.max(needed, assumedPrice * 0.22); // ~20% down + ~2% closing
    }
    if (highDebtPressure) {
      needed *= 1.1;
      factors.push(
        "Higher debt load vs income — extra cash may be needed for paydown and closing",
      );
    }
    factors.push(
      `Non-QM path: ~$${needed.toLocaleString()} needed at $${assumedPrice.toLocaleString()} price`,
    );
    factors.push(`Available: ~$${cash.toLocaleString()}`);

    if (cash >= needed * nonQmStrongMult) {
      factors.push("Healthy reserves beyond the typical Non-QM cash need — stronger file");
      return {
        score: "strong",
        headline: "Cash lines up with this Non-QM path",
        detail: isInvestment
          ? `Cash comfortably exceeds a typical investment-property benchmark (often around 20% down plus closing), with reserves that strengthen your position. Your loan officer can validate the exact target. ${investmentStructureLine()} ${investmentLikelyNonQmDocLine(inputs)}`
          : "Available cash exceeds the 10%+ down and closing costs typical for Non-QM, with reserves to spare. Your loan officer can confirm the exact structure.",
        factors,
      };
    }
    if (cash >= needed) {
      return {
        score: "moderate",
        headline: "Within range for a typical Non-QM scenario",
        detail: isInvestment
          ? `For investment scenarios, higher cash-to-close is common. Your current cash is in range for that higher benchmark, though reserve planning still matters — review with your loan officer. ${investmentStructureLine()} ${investmentLikelyNonQmDocLine(inputs)}`
          : "Available cash aligns with what many Non-QM scenarios need, with modest cushion for reserves. Worth reviewing with your loan officer.",
        factors,
      };
    }
    factors.push("Not quite there yet for the typical Non-QM cash cushion");
    factors.push("Down payment assistance is often limited on Non-QM — your loan officer can walk through options");
    return {
      score: "weak",
      headline: "This scenario may require more cash to move forward",
      detail: isInvestment
        ? `Investment purchases usually require more cash up front — often around 20% down plus closing and reserves. Building cash or adjusting timing can help, and your loan officer can map practical next steps. ${investmentStructureLine()} ${investmentLikelyNonQmDocLine(inputs)}`
        : "Non-QM paths often use roughly 10–20% down plus closing costs. Building cash or adjusting timing can help — your loan officer can map the best next steps.",
      factors,
    };
  }

  // QM path: FHA 3.5% baseline, assistance possible
  if (credit < 580) {
    // ~10% down + closing (FHA below 580)
    let needed = assumedPrice * 0.12;
    if (isInvestment) {
      needed = Math.max(needed, assumedPrice * 0.22); // ~20% down + ~2% closing
    }
    if (highDebtPressure) {
      needed *= 1.1;
      factors.push(
        "Higher debt load vs income — budgeting extra for paydown strengthens the cash picture",
      );
    }
    if (isInvestment) {
      factors.push(
        "Investment property — plan for higher cash-to-close than many primary-home benchmarks",
      );
    } else {
      factors.push(`Credit below 580 — FHA needs ~10% down + closing`);
    }
    factors.push(`Needed: ~$${needed.toLocaleString()}, Available: ~$${cash.toLocaleString()}`);

    const moderateFloor = highCashNeed ? needed * 1.05 : needed;
    if (cash >= moderateFloor) {
      return {
        score: "moderate",
        headline: isInvestment
          ? "In range for this investment-property cash benchmark"
          : "In range for the ~10% down + closing estimate",
        detail: isInvestment
          ? `For investment scenarios, higher cash-to-close is common. Your current cash is in range for that higher benchmark, though reserve planning still matters — review with your loan officer. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)}`
          : "With credit below 580, FHA often uses a higher down payment. Your cash lines up with that ballpark, though reserves may still be tight — confirm with your loan officer.",
        factors,
      };
    }
    return {
      score: "weak",
      headline: isInvestment
        ? "Not yet in range for this investment-property cash benchmark"
        : "Not quite there yet on the ~10% down + closing estimate",
      detail: isInvestment
        ? `Investment purchases usually require more cash up front — often around 20% down plus closing and reserves. Building cash or adjusting timing can help, and your loan officer can map practical next steps. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)}`
        : "Below 580, many FHA scenarios look for roughly 10% down plus closing. A stronger cash position would help — your loan officer can review what’s realistic for you.",
      factors,
    };
  }

  // FHA 3.5% baseline
  let fhaMinimum = assumedPrice * 0.055; // 3.5% down + ~2% closing
  if (isInvestment) {
    fhaMinimum = Math.max(fhaMinimum, assumedPrice * 0.22); // ~20% down + ~2% closing
  }
  if (highDebtPressure) {
    fhaMinimum *= 1.1;
    factors.push(
      "Higher debt load vs income — treating cash-to-close need as higher until debt is paid down",
    );
  }
  if (isInvestment) {
    factors.push(
      `Investment cash benchmark: ~$${fhaMinimum.toLocaleString()} at $${assumedPrice.toLocaleString()} price`,
    );
  } else {
    factors.push(
      `FHA baseline: ~$${fhaMinimum.toLocaleString()} at $${assumedPrice.toLocaleString()} price`,
    );
  }
  factors.push(`Available: ~$${cash.toLocaleString()}`);

  if (cash >= fhaMinimum * fhaStrongMult) {
    factors.push(
      isInvestment
        ? "Healthy reserves beyond the typical investment-property cash benchmark in this snapshot"
        : "Healthy reserves beyond the typical FHA cash-to-close estimate",
    );
    return {
      score: "strong",
      headline: "Strong cash position",
      detail: isInvestment
        ? `Cash comfortably exceeds a typical investment-property benchmark (often around 20% down plus closing), with reserves that strengthen your position. Your loan officer can validate the exact target. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)}`
        : "Cash comfortably exceeds a typical FHA 3.5% down and closing-cost estimate, with reserves that strengthen the file. Your loan officer can validate against your exact scenario.",
      factors,
    };
  }
  if (cash >= fhaMinimum) {
    factors.push(
      isInvestment
        ? "Some assistance programs may be limited on investment purchases — review with your loan officer"
        : "Assistance programs may extend purchase power",
    );
    return {
      score: "moderate",
      headline: isInvestment
        ? "Within range for this investment-property cash benchmark"
        : "Within range for a typical FHA cash-to-close estimate",
      detail: isInvestment
        ? `For investment scenarios, higher cash-to-close is common. Your current cash is in range for that higher benchmark, though reserve planning still matters — review with your loan officer. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)}`
        : "Cash aligns with a common FHA 3.5% down + closing picture. Down payment assistance and seller concessions may stretch this further — worth reviewing with your loan officer.",
      factors,
    };
  }
  if (isInvestment) {
    factors.push(
      "Seller concessions or other strategies may help in some cases, depending on structure — review with your loan officer",
    );
  } else {
    factors.push("Down payment assistance may be available");
    factors.push("Seller concessions can reduce cash-to-close");
  }
  if (shouldFloor5k15kPrimaryQmCashToModerate(inputs, likelyNonQM, isInvestment)) {
    return CASH_5K_15K_PRIMARY_MODERATE_OVERRIDE;
  }
  return {
    score: "weak",
    headline: isInvestment
      ? "Not quite there yet for this investment-property cash benchmark"
      : "Not quite there yet for the typical FHA cash-to-close estimate",
    detail: isInvestment
      ? `Investment purchases usually require more cash up front — often around 20% down plus closing and reserves. Building cash or adjusting timing can help, and your loan officer can map practical next steps. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)}`
      : "Compared to a common 3.5% + closing benchmark, there’s room to build cash or use assistance. A stronger cash position would help — your loan officer can outline options that still fit your goals.",
    factors,
  };
}

// -----------------------------------------------------------------------------
// LOAN PATH
// -----------------------------------------------------------------------------
export function determineLoanPath(inputs: LeadInputs): LoanPath {
  const credit = creditMidpoint[inputs.creditRange];

  // Self-employed without filed taxes → Non-QM
  if (inputs.employmentType === "SELF_EMPLOYED_NOT_FILED") {
    return credit >= 620 ? "NON_QM" : "UNDETERMINED";
  }

  // Self-employed with heavy write-offs → Non-QM lane
  if (
    inputs.employmentType === "SELF_EMPLOYED_FILED" &&
    inputs.heavyWriteOffs === true &&
    credit >= 620
  ) {
    return "NON_QM";
  }

  // Below 580 — still QM (FHA with 10% down), but limited
  if (credit >= 580) return "QM";

  // Below 580 — FHA still possible with 10% down
  return "QM";
}

// -----------------------------------------------------------------------------
// READINESS (2-of-3 rule)
// -----------------------------------------------------------------------------
export function determineReadiness(
  credit: PillarAnalysis,
  income: PillarAnalysis,
  cash: PillarAnalysis,
): { readiness: ReadinessLevel; strongCount: 0 | 1 | 2 | 3 } {
  const pillars = [credit, income, cash];
  const strongCount = pillars.filter((p) => p.score === "strong").length as
    | 0
    | 1
    | 2
    | 3;
  const weakCount = pillars.filter((p) => p.score === "weak").length;
  const moderateCount = pillars.filter((p) => p.score === "moderate").length;

  // 3 strong = ideal client
  if (strongCount === 3) return { readiness: "READY_NOW", strongCount };

  // 2 strong = workable, ready now
  if (strongCount >= 2) return { readiness: "READY_NOW", strongCount };

  // 1 strong + 2 moderate, or 3 moderate = fixable / close
  if (strongCount === 1 && weakCount === 0)
    return { readiness: "NEARLY_READY", strongCount };
  if (strongCount === 0 && moderateCount === 3)
    return { readiness: "NEARLY_READY", strongCount };
  if (strongCount === 1 && weakCount === 1)
    return { readiness: "NEARLY_READY", strongCount };

  // Everything else = not ready
  return { readiness: "NOT_READY_YET", strongCount };
}

// -----------------------------------------------------------------------------
// READINESS BLOCKERS (business rules — wording only affects explanation via readiness)
// NOT_READY_YET is only allowed when at least one blocker is true.
// -----------------------------------------------------------------------------
function hasReadinessBlocker(inputs: LeadInputs): boolean {
  if (inputs.creditRange === "BELOW_580") return true;

  if (inputs.occupancyIntent === "INVESTMENT_PROPERTY") {
    const lowCashForInvestment =
      inputs.cashAvailable === "UNDER_5K" ||
      inputs.cashAvailable === "5K_15K" ||
      inputs.cashAvailable === "15K_30K";
    if (lowCashForInvestment) return true;
  }

  if (getEstimatedTotalDti(inputs) > 56) return true;

  return false;
}

function applyReadinessBlockerGate(
  readiness: ReadinessLevel,
  inputs: LeadInputs,
): ReadinessLevel {
  if (readiness === "NOT_READY_YET" && !hasReadinessBlocker(inputs)) {
    return "NEARLY_READY";
  }
  return readiness;
}

// -----------------------------------------------------------------------------
// COMPENSATING FACTORS
// -----------------------------------------------------------------------------
function findCompensatingFactors(
  inputs: LeadInputs,
  credit: PillarAnalysis,
  income: PillarAnalysis,
  cash: PillarAnalysis,
): string[] {
  const factors: string[] = [];

  if (cash.score === "strong" && (credit.score !== "strong" || income.score !== "strong")) {
    factors.push("Strong cash reserves offset weaker areas");
  }
  if (credit.score === "strong" && cash.score === "weak") {
    factors.push("Excellent credit opens up low-down-payment programs");
  }
  if (income.score === "strong" && cash.score === "weak") {
    factors.push(
      "High income may open gift funds or assistance programs depending on the program — review with your loan officer",
    );
  }
  if (creditMidpoint[inputs.creditRange] >= 740) {
    factors.push(
      "740+ credit often positions well for best-tier pricing — there may be a stronger path based on how the file is structured",
    );
  }

  return factors;
}

// -----------------------------------------------------------------------------
// RECOMMENDATIONS
// -----------------------------------------------------------------------------
function buildRecommendations(
  inputs: LeadInputs,
  credit: PillarAnalysis,
  income: PillarAnalysis,
  cash: PillarAnalysis,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (credit.score === "weak") {
    recs.push({
      id: "credit-repair",
      title: "Credit improvement plan",
      description:
        "Moving toward 580+ often opens more FHA options; around 620+ there may be a stronger path for Non-QM and conventional pricing depending on the file. Building this area can improve your options — review with your loan officer.",
      impact: "high",
      category: "credit",
    });
  }

  const totalDtiRec = getEstimatedTotalDti(inputs);
  const existingRatioRec = getExistingDebtRatio(inputs);

  const suggestPayDownDebt =
    totalDtiRec > 50 || existingRatioRec > 45;

  const incomeBelow60k =
    inputs.annualGrossIncome === "UNDER_40K" ||
    inputs.annualGrossIncome === "40K_60K";
  const coBorrowerFromLowIncomeDebt =
    incomeBelow60k && inputs.monthlyDebtPayments > 500;
  const coBorrowerFromHighTotalDti = totalDtiRec > 56;

  if (suggestPayDownDebt) {
    recs.push({
      id: "pay-down-debt",
      title: "Pay down revolving debt",
      description:
        "Reducing monthly debt payments can improve how the file is structured and create more room for a housing payment. Paying down revolving balances is often the highest-impact first move — your loan officer can help map out the best approach.",
      impact: "high",
      category: "debt",
    });
  }

  if (coBorrowerFromHighTotalDti || coBorrowerFromLowIncomeDebt) {
    recs.push({
      id: "co-borrower",
      title: "Consider adding a co-borrower",
      description:
        "Adding a co-borrower can strengthen the income side of the file and open up more flexibility depending on how everything is structured. This is worth reviewing with your loan officer to see if it creates a stronger path.",
      impact: "high",
      category: "structure",
    });
  }

  if (cash.score === "weak") {
    recs.push({
      id: "assistance-programs",
      title: "Explore down payment assistance",
      description:
        "State and local DPA programs sometimes cover part or all of the down payment when program rules fit — there may be a stronger path here; review with your loan officer.",
      impact: "high",
      category: "cash",
    });
    recs.push({
      id: "seller-concessions",
      title: "Negotiate seller concessions",
      description:
        "Seller-paid closing costs reduce cash-to-close and are commonly negotiable, especially in buyer-favorable markets.",
      impact: "medium",
      category: "cash",
    });
  }

  if (inputs.employmentType === "SELF_EMPLOYED_NOT_FILED") {
    recs.push({
      id: "file-taxes",
      title: "File tax returns if possible",
      description:
        "Filing taxes can make traditional QM documentation easier and there may be a stronger path on down payment and rate than some Non-QM alternatives — review with your loan officer based on how the file is structured.",
      impact: "high",
      category: "income",
    });
  }

  return recs;
}

// -----------------------------------------------------------------------------
// EXPLANATION (plain English)
// -----------------------------------------------------------------------------
function buildExplanation(
  inputs: LeadInputs,
  readiness: ReadinessLevel,
  loanPath: LoanPath,
  credit: PillarAnalysis,
  income: PillarAnalysis,
  cash: PillarAnalysis,
): string {
  const name = inputs.firstName;
  const isInvestment = inputs.occupancyIntent === "INVESTMENT_PROPERTY";
  const invTone = investmentIncomeDocTone(inputs);
  const pathLabel = loanPath === "NON_QM" ? "Non-QM" : "conventional or FHA";

  if (readiness === "READY_NOW") {
    if (isInvestment) {
      return `${name} is in a strong position to move forward. Credit, income, and cash line up in this snapshot for an investment property. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)} There may be a stronger path depending on goals — review with your loan officer; they can confirm next steps and documentation.`;
    }
    return `${name} is in a strong position to move forward. Credit, income, and cash line up with a ${pathLabel} loan path in this snapshot. There may be a stronger path depending on goals — review with your loan officer; they can confirm next steps and documentation.`;
  }

  if (readiness === "NEARLY_READY") {
    const weakest = [
      { label: "credit", analysis: credit },
      { label: "income-to-debt", analysis: income },
      { label: "cash-to-close", analysis: cash },
    ].find((p) => p.analysis.score === "weak" || p.analysis.score === "moderate");

    if (isInvestment) {
      return `${name} is making progress — this may not be the strongest moment to move forward yet, but there may be a path with the right structure. One helpful focus is ${weakest?.label ?? "one pillar"} based on how the file is structured. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)} Seller concessions or other strategies may help in some cases for investment purchases, depending on structure — review with your loan officer. Building this area can improve your options over the next few months; review with your loan officer.`;
    }
    return `${name} is making progress — this may not be the strongest moment to move forward yet, but there may be a path with the right structure. One helpful focus is ${weakest?.label ?? "one pillar"} based on how the file is structured. Programs like down payment assistance or seller concessions may help bridge this gap. Building this area can improve your options over the next few months; review with your loan officer.`;
  }

  if (isInvestment) {
    return `Right now, this snapshot shows a few areas that may need strengthening — that’s guidance, not a final word. ${investmentStructureLine()} ${investmentIncomePathLine(invTone)} More than one area may need attention; there may be a stronger path once a few pieces are strengthened. Review with your loan officer on timing and priorities. The recommendations below outline high-impact ideas to discuss.`;
  }

  return `Right now, this snapshot shows a few areas that may need strengthening — that’s guidance, not a final word. This may not be the strongest moment to move forward yet — but there may be a path with the right structure. More than one area may need attention; there may be a stronger path once a few pieces are strengthened. Review with your loan officer on timing and priorities. The recommendations below outline high-impact ideas to discuss.`;
}

// -----------------------------------------------------------------------------
// MAIN: evaluate a lead
// -----------------------------------------------------------------------------
export function evaluateLead(inputs: LeadInputs): LeadDecision {
  const credit = scoreCredit(inputs);
  const income = scoreIncome(inputs);
  const cash = scoreCash(inputs);

  const pillarReadiness = determineReadiness(credit, income, cash);
  const readiness = applyReadinessBlockerGate(pillarReadiness.readiness, inputs);
  const { strongCount } = pillarReadiness;
  const loanPath = determineLoanPath(inputs);

  const weakestPillars: Array<"credit" | "income" | "cash"> = [];
  if (credit.score === "weak") weakestPillars.push("credit");
  if (income.score === "weak") weakestPillars.push("income");
  if (cash.score === "weak") weakestPillars.push("cash");

  const compensatingFactors = findCompensatingFactors(inputs, credit, income, cash);
  const recommendations = buildRecommendations(inputs, credit, income, cash);
  const explanation = buildExplanation(inputs, readiness, loanPath, credit, income, cash);

  return {
    readiness,
    loanPath,
    credit,
    income,
    cash,
    strongPillarCount: strongCount,
    weakestPillars,
    compensatingFactors,
    explanation,
    recommendations,
  };
}

// Convenience: enrich a lead's inputs with its decision
export function enrichLead(inputs: LeadInputs): Lead {
  return { ...inputs, decision: evaluateLead(inputs) };
}
