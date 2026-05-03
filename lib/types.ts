// =============================================================================
// Core types for the Homebuyer Clarity Engine.
// These contracts are shared between UI, decision engine, and (future) backend.
//
// DESIGN NOTE: Every buyer-facing field here is intake-form compatible.
// When Phase 2+ adds a public intake form, it populates LeadInputs directly.
// The team fields (assignedTo, createdBy, leadSource) get set server-side.
// =============================================================================

export type PillarScore = "strong" | "moderate" | "weak";

export type ReadinessLevel = "READY_NOW" | "NEARLY_READY" | "NOT_READY_YET";

export type LoanPath = "QM" | "NON_QM" | "UNDETERMINED";

export type EmploymentType =
  | "W2"
  | "SELF_EMPLOYED_FILED"
  | "SELF_EMPLOYED_NOT_FILED"
  | "MIXED"
  | "RETIRED";

export type OccupancyIntent = "PRIMARY_HOME" | "INVESTMENT_PROPERTY";

export type CreditRange =
  | "BELOW_580"
  | "580_619"
  | "620_679"
  | "680_739"
  | "740_PLUS";

export type IncomeRange =
  | "UNDER_40K"
  | "40K_60K"
  | "60K_90K"
  | "90K_150K"
  | "150K_PLUS";

export type CashRange =
  | "UNDER_5K"
  | "5K_15K"
  | "15K_30K"
  | "30K_60K"
  | "60K_PLUS";

export type LeadSource =
  | "WEBSITE_FORM"
  | "REFERRAL_AGENT"
  | "REFERRAL_PAST_CLIENT"
  | "SOCIAL_MEDIA"
  | "PAID_AD"
  | "MANUAL_ENTRY"
  | "OPEN_HOUSE"
  | "OTHER";

export type LeadStatus =
  | "new"
  | "reviewed"
  | "approved"
  | "archived"
  | "sent_to_crm";

// =============================================================================
// Lead — the raw inputs captured from a borrower.
// =============================================================================
export interface LeadInputs {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Team / ops fields (set internally; intake form never touches these)
  createdAt: string;
  lastUpdated: string;
  createdBy: string;
  assignedTo: string;
  leadSource: LeadSource;

  // --- Buyer-provided fields (map directly to an intake form) ---
  creditRange: CreditRange;
  annualGrossIncome: IncomeRange;
  monthlyDebtPayments: number;
  cashAvailable: CashRange;

  employmentType: EmploymentType;
  occupancyIntent?: OccupancyIntent;
  hasFiledTaxes?: boolean;
  heavyWriteOffs?: boolean;

  targetPurchasePrice?: number;
  // --- end buyer-provided fields ---

  notes?: string;
  status: LeadStatus;

  /** Present when the lead came in via a realtor partner link. */
  realtorPartnerId?: string | null;
}

// =============================================================================
// Decision — what the engine produces for a lead.
// =============================================================================
export interface PillarAnalysis {
  score: PillarScore;
  headline: string;
  detail: string;
  factors: string[];
}

export interface LeadDecision {
  readiness: ReadinessLevel;
  loanPath: LoanPath;

  credit: PillarAnalysis;
  income: PillarAnalysis;
  cash: PillarAnalysis;

  strongPillarCount: 0 | 1 | 2 | 3;
  weakestPillars: Array<"credit" | "income" | "cash">;

  compensatingFactors: string[];
  explanation: string;
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "credit" | "debt" | "income" | "cash" | "structure";
}

export interface Lead extends LeadInputs {
  decision: LeadDecision;
}

// =============================================================================
// Display helpers — keep label strings centralized.
// =============================================================================
export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  READY_NOW: "Ready Now",
  NEARLY_READY: "Almost Ready",
  NOT_READY_YET: "Not Ready",
};

export const LOAN_PATH_LABELS: Record<LoanPath, string> = {
  QM: "QM",
  NON_QM: "Non-QM",
  UNDETERMINED: "Undetermined",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE_FORM: "Website Form",
  REFERRAL_AGENT: "Agent Referral",
  REFERRAL_PAST_CLIENT: "Past Client Referral",
  SOCIAL_MEDIA: "Social Media",
  PAID_AD: "Paid Ad",
  MANUAL_ENTRY: "Manual Entry",
  OPEN_HOUSE: "Open House",
  OTHER: "Other",
};

export const CREDIT_RANGE_LABELS: Record<CreditRange, string> = {
  BELOW_580: "Below 580",
  "580_619": "580–619",
  "620_679": "620–679",
  "680_739": "680–739",
  "740_PLUS": "740+",
};

export const INCOME_RANGE_LABELS: Record<IncomeRange, string> = {
  UNDER_40K: "Under $40k",
  "40K_60K": "$40k–$60k",
  "60K_90K": "$60k–$90k",
  "90K_150K": "$90k–$150k",
  "150K_PLUS": "$150k+",
};

export const CASH_RANGE_LABELS: Record<CashRange, string> = {
  UNDER_5K: "Under $5k",
  "5K_15K": "$5k–$15k",
  "15K_30K": "$15k–$30k",
  "30K_60K": "$30k–$60k",
  "60K_PLUS": "$60k+",
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  W2: "W-2 Employee",
  SELF_EMPLOYED_FILED: "Self-Employed (Filed Taxes)",
  SELF_EMPLOYED_NOT_FILED: "Self-Employed (Unfiled)",
  MIXED: "Mixed Income",
  RETIRED: "Retired",
};

export const OCCUPANCY_INTENT_LABELS: Record<OccupancyIntent, string> = {
  PRIMARY_HOME: "Primary Home",
  INVESTMENT_PROPERTY: "Investment Property",
};
