// =============================================================================
// Short public intake — 8 fields, one screen (Phase 2B).
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
  type BuyerEmploymentUiValue,
  type IntakeBrandColors,
} from "@/components/intake/formOptions";
import {
  NumberField,
  RadioGroup,
  SelectField,
  TextField,
} from "@/components/intake/FormFields";

export interface ShortIntakeFormProps {
  organizationId: string;
  referrerLoSlug?: string;
  /** From `/apply/realtor/[slug]` or `?partner=` — stored on the lead when valid. */
  realtorPartnerSlug?: string;
  brandColors: IntakeBrandColors;
}

type CreditValue = (typeof BUYER_CREDIT_OPTIONS)[number]["value"];
type IncomeValue = (typeof BUYER_INCOME_OPTIONS)[number]["value"];
type CashValue = (typeof BUYER_CASH_OPTIONS)[number]["value"];
type OccupancyIntent = "PRIMARY_HOME" | "INVESTMENT_PROPERTY";

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

export function ShortIntakeForm({
  organizationId,
  referrerLoSlug,
  realtorPartnerSlug,
  brandColors,
}: ShortIntakeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
  const [occupancyIntent, setOccupancyIntent] =
    useState<OccupancyIntent>("PRIMARY_HOME");

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

  function validateClient(): string | null {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const clientErr = validateClient();
    if (clientErr) {
      setFormError(clientErr);
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
      occupancyIntent,
      hasFiledTaxes: emp.hasFiledTaxes,
      heavyWriteOffs: emp.heavyWriteOffs,
      formLength: "short",
      leadSource: "WEBSITE_FORM",
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

  return (
    <form
      onSubmit={handleSubmit}
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
      <RadioGroup
        label="Property use"
        name="occupancyIntent"
        value={occupancyIntent}
        onChange={setOccupancyIntent}
        options={[
          { value: "PRIMARY_HOME", label: "Primary home" },
          { value: "INVESTMENT_PROPERTY", label: "Investment property" },
        ]}
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
        label="Annual gross income (before taxes)"
        name="annualGrossIncome"
        value={annualGrossIncome}
        onChange={setAnnualGrossIncome}
        options={BUYER_INCOME_OPTIONS}
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

      {formError ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto rounded-md px-4 py-2.5 text-sm font-semibold shadow transition-[filter] hover:brightness-[0.95] disabled:opacity-60"
        style={{
          backgroundColor: brandColors.primary,
          color: "#ffffff",
        }}
      >
        {pending ? "Submitting…" : "See my snapshot"}
      </button>
    </form>
  );
}
