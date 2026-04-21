// =============================================================================
// Reusable intake field primitives (Phase 2B). Client-only.
// Focus ring uses CSS variable --intake-brand (set by parent layout / form).
// =============================================================================

"use client";

import { useId } from "react";

const fieldClass =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-surface-900 shadow-sm placeholder:text-surface-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[color:var(--brand-secondary)] focus-visible:shadow-[0_0_0_2px_var(--brand-secondary-focus-ring)] border-[color:var(--brand-secondary-border,rgba(100,116,139,0.38))]";

const labelClass = "block text-sm font-medium text-surface-800 mb-1";
const errorClass = "mt-1 text-xs text-red-700";

export function TextField(props: {
  label: string;
  name: string;
  type?: "text" | "email" | "tel";
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string | null;
  autoComplete?: string;
}) {
  const id = useId();
  const inputId = `${props.name}-${id}`;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass}>
        {props.label}
        {props.required ? " *" : ""}
      </label>
      <input
        id={inputId}
        name={props.name}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        autoComplete={props.autoComplete}
        className={fieldClass}
      />
      {props.error ? <p className={errorClass}>{props.error}</p> : null}
    </div>
  );
}

export function SelectField<T extends string>(props: {
  label: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  required?: boolean;
  error?: string | null;
}) {
  const id = useId();
  const inputId = `${props.name}-${id}`;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass}>
        {props.label}
        {props.required ? " *" : ""}
      </label>
      <select
        id={inputId}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        required={props.required}
        className={fieldClass}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {props.error ? <p className={errorClass}>{props.error}</p> : null}
    </div>
  );
}

export function RadioGroup<T extends string>(props: {
  label: string;
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  required?: boolean;
  error?: string | null;
}) {
  const id = useId();
  const groupName = `${props.name}-${id}`;
  return (
    <fieldset>
      <legend className={labelClass}>
        {props.label}
        {props.required ? " *" : ""}
      </legend>
      <div className="space-y-2 mt-1">
        {props.options.map((o) => {
          const inputId = `${groupName}-${o.value}`;
          const selected = props.value === o.value;
          return (
            <label
              key={o.value}
              htmlFor={inputId}
              className={
                selected
                  ? "flex items-center gap-2 text-sm text-surface-800 cursor-pointer rounded-md border border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-bg-selected)] px-2 py-1.5 -mx-2"
                  : "flex items-center gap-2 text-sm text-surface-800 cursor-pointer rounded-md border border-transparent px-2 py-1.5 -mx-2"
              }
            >
              <input
                id={inputId}
                type="radio"
                name={groupName}
                value={o.value}
                checked={selected}
                onChange={() => props.onChange(o.value)}
                className="h-4 w-4 shrink-0 border-surface-300 text-[color:var(--intake-brand,#1e40af)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--intake-brand,#1e40af)]"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {props.error ? <p className={errorClass}>{props.error}</p> : null}
    </fieldset>
  );
}

export function NumberField(props: {
  label: string;
  name: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  step?: number;
  required?: boolean;
  error?: string | null;
}) {
  const id = useId();
  const inputId = `${props.name}-${id}`;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass}>
        {props.label}
        {props.required ? " *" : ""}
      </label>
      <input
        id={inputId}
        name={props.name}
        type="number"
        value={props.value === "" ? "" : props.value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            props.onChange("");
            return;
          }
          const n = Number(raw);
          props.onChange(Number.isNaN(n) ? "" : n);
        }}
        min={props.min}
        step={props.step ?? 1}
        required={props.required}
        className={fieldClass}
      />
      {props.error ? <p className={errorClass}>{props.error}</p> : null}
    </div>
  );
}
