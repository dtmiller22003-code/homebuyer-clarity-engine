// =============================================================================
// Long public intake — two-step wizard (Phase 2B).
// Step 1 mirrors short form; step 2 adds purchase price, lead source, notes,
// co-borrower & timeline (local-only), and disclaimer acknowledgment.
// =============================================================================

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IntakeInput } from "@/app/actions/intake";
import { submitIntake } from "@/app/actions/intake";
import {
  BUYER_CASH_OPTIONS,
  BUYER_CREDIT_OPTIONS,
  BUYER_EMPLOYMENT_UI_OPTIONS,
  BUYER_INCOME_OPTIONS,
  BUYER_LEAD_SOURCES,
  BUYER_TIMELINE_OPTIONS,
  type BuyerEmploymentUiValue,
  type IntakeBrandColors,
} from "@/components/intake/formOptions";
import {
  NumberField,
  RadioGroup,
  SelectField,
  TextField,
} from "@/components/intake/FormFields";

const textareaClass =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-surface-900 shadow-sm placeholder:text-surface-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[color:var(--brand-secondary)] focus-visible:shadow-[0_0_0_2px_var(--brand-secondary-focus-ring)] border-[color:var(--brand-secondary-border,rgba(100,116,139,0.38))]";

export interface LongIntakeFormProps {
  organizationId: string;
  referrerLoSlug?: string;
  realtorPartnerSlug?: string;
  brandColors: IntakeBrandColors;
}

type CreditValue = (typeof BUYER_CREDIT_OPTIONS)[number]["value"];
type IncomeValue = (typeof BUYER_INCOME_OPTIONS)[number]["value"];
type CashValue = (typeof BUYER_CASH_OPTIONS)[number]["value"];
type LeadSourceValue = (typeof BUYER_LEAD_SOURCES)[number]["value"];
type TimelineValue = (typeof BUYER_TIMELINE_OPTIONS)[number]["value"];

function mapEmploymentToIntake(
  ui: BuyerEmploymentUiValue,
  hasFiledTaxes: boolean | null,
  heavyWriteOffs: boolean | null,
): Pick<IntakeInput, "employmentType" | "hasFiledTaxes" | "heavyWriteOffs"> {
  if (ui === "W2") {
    return {
      employmentType: "W2",
      hasFiledTaxes: undefined,
      heavyWriteOffs: undefined,
    };
  }
  if (ui === "MIXED") {
    return {
      employmentType: "MIXED",
      hasFiledTaxes: undefined,
      heavyWriteOffs: undefined,
    };
  }
  if (ui === "RETIRED") {
    return {
      employmentType: "RETIRED",
      hasFiledTaxes: undefined,
      heavyWriteOffs: undefined,
    };
  }
  if (hasFiledTaxes === false) {
    return {
      employmentType: "SELF_EMPLOYED_NOT_FILED",
      hasFiledTaxes: false,
      heavyWriteOffs: undefined,
    };
  }
  return {
    employmentType: "SELF_EMPLOYED_FILED",
    hasFiledTaxes: true,
    heavyWriteOffs: heavyWriteOffs === true,
  };
}

function validateStep1(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  monthlyDebtPayments: number | "",
  employmentUi: BuyerEmploymentUiValue,
  hasFiledTaxes: boolean | null,
  heavyWriteOffs: boolean | null,
): string | null {
  if (!firstName.trim() || !lastName.trim()) {
    return "Please enter your first and last name.";
  }
  if (!email.trim()) return "Please enter your email.";
  if (!phone.trim() || phone.trim().length < 7) {
    return "Please enter a valid phone number.";
  }
  if (monthlyDebtPayments === "" || monthlyDebtPayments < 0) {
    return "Please enter your monthly debt payments (0 if none).";
  }
  if (employmentUi === "SELF_EMPLOYED") {
    if (hasFiledTaxes === null) {
      return "Please answer whether you have filed taxes.";
    }
    if (hasFiledTaxes === true && heavyWriteOffs === null) {
      return "Please answer whether you have heavy write-offs.";
    }
  }
  return null;
}

export function LongIntakeForm({
  organizationId,
  referrerLoSlug,
  realtorPartnerSlug,
  brandColors,
}: LongIntakeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creditRange, setCreditRange] = useState<CreditValue>(
    BUYER_CREDIT_OPTIONS[0].value,
  );
  const [employmentUi, setEmploymentUi] = useState<BuyerEmploymentUiValue>(
    BUYER_EMPLOYMENT_UI_OPTIONS[0].value,
  );
  const [hasFiledTaxes, setHasFiledTaxes] = useState<boolean | null>(null);
  const [heavyWriteOffs, setHeavyWriteOffs] = useState<boolean | null>(null);
  const [annualGrossIncome, setAnnualGrossIncome] = useState<IncomeValue>(
    BUYER_INCOME_OPTIONS[0].value,
  );
  const [cashAvailable, setCashAvailable] = useState<CashValue>(
    BUYER_CASH_OPTIONS[0].value,
  );
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState<number | "">(
    "",
  );

  const [targetPurchasePrice, setTargetPurchasePrice] = useState<number | "">(
    "",
  );
  const [leadSource, setLeadSource] = useState<LeadSourceValue>(
    BUYER_LEAD_SOURCES[0].value,
  );
  const [coBorrower, setCoBorrower] = useState<"yes" | "no" | null>(null);
  const [timeline, setTimeline] = useState<TimelineValue>(
    BUYER_TIMELINE_OPTIONS[0].value,
  );
  const [notes, setNotes] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (employmentUi !== "SELF_EMPLOYED") {
      setHasFiledTaxes(null);
      setHeavyWriteOffs(null);
    }
  }, [employmentUi]);

  const showSelfEmployedFollowUp = employmentUi === "SELF_EMPLOYED";
  const showWriteOffQuestion =
    showSelfEmployedFollowUp && hasFiledTaxes === true;

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = validateStep1(
      firstName,
      lastName,
      email,
      phone,
      monthlyDebtPayments,
      employmentUi,
      hasFiledTaxes,
      heavyWriteOffs,
    );
    if (err) {
      setFormError(err);
      return;
    }
    setStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const step1Err = validateStep1(
      firstName,
      lastName,
      email,
      phone,
      monthlyDebtPayments,
      employmentUi,
      hasFiledTaxes,
      heavyWriteOffs,
    );
    if (step1Err) {
      setFormError(step1Err);
      setStep(1);
      return;
    }

    if (!disclaimerAccepted) {
      setFormError("Please acknowledge the disclaimer to continue.");
      return;
    }

    if (coBorrower === null) {
      setFormError("Please indicate whether there is a co-borrower.");
      return;
    }

    const emp = mapEmploymentToIntake(
      employmentUi,
      hasFiledTaxes,
      heavyWriteOffs,
    );

    const payload: IntakeInput = {
      organizationId,
      referrerLoSlug: referrerLoSlug?.trim() || undefined,
      realtorPartnerSlug: realtorPartnerSlug?.trim() || undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      creditRange,
      annualGrossIncome,
      monthlyDebtPayments: monthlyDebtPayments as number,
      cashAvailable,
      employmentType: emp.employmentType,
      hasFiledTaxes: emp.hasFiledTaxes,
      heavyWriteOffs: emp.heavyWriteOffs,
      formLength: "long",
      leadSource,
      notes: notes.trim() || undefined,
      targetPurchasePrice:
        targetPurchasePrice === "" ? undefined : targetPurchasePrice,
    };

    startTransition(async () => {
      const result = await submitIntake(payload);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.push(`/apply/result/${result.leadId}`);
    });
  }

  const step1Fields = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="First name"
          name="firstName"
          value={firstName}
          onChange={setFirstName}
          required
          autoComplete="given-name"
        />
        <TextField
          label="Last name"
          name="lastName"
          value={lastName}
          onChange={setLastName}
          required
          autoComplete="family-name"
        />
      </div>
      <TextField
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />
      <TextField
        label="Phone"
        name="phone"
        type="tel"
        value={phone}
        onChange={setPhone}
        required
        autoComplete="tel"
      />
      <SelectField
        label="Credit range"
        name="creditRange"
        value={creditRange}
        onChange={setCreditRange}
        options={BUYER_CREDIT_OPTIONS}
        required
      />
      <SelectField
        label="Employment"
        name="employment"
        value={employmentUi}
        onChange={setEmploymentUi}
        options={BUYER_EMPLOYMENT_UI_OPTIONS}
        required
      />
      {showSelfEmployedFollowUp ? (
        <RadioGroup
          label="Have you filed taxes for your business?"
          name="hasFiledTaxes"
          value={hasFiledTaxes === null ? null : hasFiledTaxes ? "yes" : "no"}
          onChange={(v) => {
            setHasFiledTaxes(v === "yes");
            if (v === "no") setHeavyWriteOffs(null);
          }}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          required
        />
      ) : null}
      {showWriteOffQuestion ? (
        <RadioGroup
          label="Do you have heavy write-offs that reduce taxable income?"
          name="heavyWriteOffs"
          value={heavyWriteOffs === null ? null : heavyWriteOffs ? "yes" : "no"}
          onChange={(v) => setHeavyWriteOffs(v === "yes")}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          required
        />
      ) : null}
      <SelectField
        label="Total household annual gross income before taxes"
        name="annualGrossIncome"
        value={annualGrossIncome}
        onChange={setAnnualGrossIncome}
        options={BUYER_INCOME_OPTIONS}
        helperText="Include income for anyone who will be on the loan application."
        required
      />
      <SelectField
        label="Cash available for down payment and closing"
        name="cashAvailable"
        value={cashAvailable}
        onChange={setCashAvailable}
        options={BUYER_CASH_OPTIONS}
        required
      />
      <NumberField
        label="Monthly debt payments (car, cards, loans — not rent or utilities)"
        name="monthlyDebtPayments"
        value={monthlyDebtPayments}
        onChange={setMonthlyDebtPayments}
        min={0}
        required
      />
    </>
  );

  return (
    <form
      onSubmit={step === 1 ? handleNext : handleSubmit}
      className="max-w-xl mx-auto space-y-4 p-4"
      style={
        {
          "--intake-brand": brandColors.primary,
          "--brand-primary": brandColors.primary,
          "--brand-secondary": brandColors.secondary,
          "--brand-accent": brandColors.accent,
          "--brand-secondary-border": `${brandColors.secondary}60`,
          "--brand-secondary-focus-ring": `${brandColors.secondary}20`,
          "--brand-accent-bg-selected": `${brandColors.accent}15`,
        } as React.CSSProperties
      }
    >
      {step === 1 ? (
        <>
          <p className="text-sm text-surface-600">Step 1 of 2 — basics</p>
          {step1Fields}
          <button
            type="submit"
            className="w-full sm:w-auto rounded-md px-4 py-2.5 text-sm font-semibold shadow transition-[filter] hover:brightness-[0.95]"
            style={{
              backgroundColor: brandColors.primary,
              color: "#ffffff",
            }}
          >
            Next
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-surface-600">Step 2 of 2 — a few more details</p>
          <NumberField
            label="Target purchase price (optional)"
            name="targetPurchasePrice"
            value={targetPurchasePrice}
            onChange={setTargetPurchasePrice}
            min={0}
            step={1000}
          />
          <SelectField
            label="How did you hear about us?"
            name="leadSource"
            value={leadSource}
            onChange={setLeadSource}
            options={BUYER_LEAD_SOURCES}
            required
          />
          <RadioGroup
            label="Is there a co-borrower on the loan?"
            name="coBorrower"
            value={coBorrower}
            onChange={(v) => setCoBorrower(v as "yes" | "no")}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            required
          />
          <SelectField
            label="When are you hoping to buy?"
            name="timeline"
            value={timeline}
            onChange={setTimeline}
            options={BUYER_TIMELINE_OPTIONS}
            required
          />
          <div>
            <label
              htmlFor="intake-notes"
              className="block text-sm font-medium text-surface-800 mb-1"
            >
              Anything else you would like us to know? (optional)
            </label>
            <textarea
              id="intake-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className={textareaClass}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-surface-800 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-surface-300"
            />
            <span>
              I understand this is an educational assessment, not a loan
              pre-approval or commitment to lend. Final loan decisions require a
              full application.
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setStep(1);
              }}
              className="rounded-md border border-surface-300 bg-white px-4 py-2.5 text-sm font-medium text-surface-800"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md px-4 py-2.5 text-sm font-semibold shadow transition-[filter] hover:brightness-[0.95] disabled:opacity-60"
              style={{
                backgroundColor: brandColors.primary,
                color: "#ffffff",
              }}
            >
              {pending ? "Submitting…" : "See my snapshot"}
            </button>
          </div>
        </>
      )}

      {formError ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
