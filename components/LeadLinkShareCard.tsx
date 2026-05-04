"use client";

async function copyToClipboard(text: string): Promise<
  { ok: true } | { ok: false }
> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(el);
    if (copied) return { ok: true };
  } catch {
    /* fall through */
  }
  return { ok: false };
}

export interface LeadLinkShareCardProps {
  title: string;
  helperText: string;
  /** Full URL; null renders unavailable hint instead of copy/open actions */
  linkUrl: string | null;
  unavailableHint?: string;
  onToast: (type: "success" | "error", message: string) => void;
  /** Extra classes on the outer section (e.g. `mb-0` when nested in a tight layout) */
  className?: string;
}

export function LeadLinkShareCard({
  title,
  helperText,
  linkUrl,
  unavailableHint = "This link is not available yet.",
  onToast,
  className = "",
}: LeadLinkShareCardProps) {
  const handleCopy = async () => {
    if (!linkUrl) return;
    const result = await copyToClipboard(linkUrl);
    if (result.ok) {
      onToast("success", "Link copied");
    } else {
      onToast(
        "error",
        "Could not copy — select the link and copy manually.",
      );
    }
  };

  const handleOpen = () => {
    if (!linkUrl) return;
    window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className={`rounded-lg border border-surface-200 bg-white p-4 shadow-sm mb-6 ${className}`.trim()}
    >
      <h2 className="text-sm font-semibold text-surface-900">{title}</h2>
      <p className="text-xs text-surface-600 mt-1 mb-3">{helperText}</p>

      {linkUrl ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
          <input
            readOnly
            value={linkUrl}
            className="flex-1 min-w-0 text-sm px-3 py-2 rounded border border-surface-300 bg-surface-50 text-surface-800 font-mono truncate"
            aria-label="Lead link URL"
            onFocus={(e) => e.target.select()}
          />
          <div className="flex gap-2 shrink-0 justify-end sm:justify-start sm:items-stretch">
            <button
              type="button"
              onClick={handleCopy}
              className="text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-md px-4 py-2 whitespace-nowrap"
            >
              Copy Link
            </button>
            <button
              type="button"
              onClick={handleOpen}
              className="text-sm font-medium text-surface-800 border border-surface-300 rounded-md px-4 py-2 hover:bg-surface-50 whitespace-nowrap"
            >
              Open Link
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          {unavailableHint}
        </p>
      )}
    </section>
  );
}
