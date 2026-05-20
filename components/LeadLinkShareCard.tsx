"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const COPY_LABEL_RESET_MS = 2000;
const FLASH_MS = 900;
const QR_SIZE = 120;

function buildShareMessage(link: string) {
  return `Hey! If you're thinking about buying a home, start here: ${link}`;
}

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const linkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCopyFlash = useCallback(() => {
    setCopyFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setCopyFlash(false);
      flashTimerRef.current = null;
    }, FLASH_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!linkUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(linkUrl, {
      width: QR_SIZE,
      margin: 1,
      color: { dark: "#18181bff", light: "#ffffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [linkUrl]);

  const handleCopyLink = async () => {
    if (!linkUrl) return;
    const result = await copyToClipboard(linkUrl);
    if (result.ok) {
      setLinkCopied(true);
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      linkTimerRef.current = setTimeout(() => {
        setLinkCopied(false);
        linkTimerRef.current = null;
      }, COPY_LABEL_RESET_MS);
      triggerCopyFlash();
      onToast("success", "Link copied");
    } else {
      onToast(
        "error",
        "Could not copy — select the link and copy manually.",
      );
    }
  };

  const handleCopyMessage = async () => {
    if (!linkUrl) return;
    const text = buildShareMessage(linkUrl);
    const result = await copyToClipboard(text);
    if (result.ok) {
      setMessageCopied(true);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => {
        setMessageCopied(false);
        messageTimerRef.current = null;
      }, COPY_LABEL_RESET_MS);
      triggerCopyFlash();
      onToast("success", "Message copied");
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
      className={`rounded-lg border border-surface-200 bg-white p-4 shadow-sm mb-6 transition-[border-color,box-shadow] duration-200 ${copyFlash ? "animate-lead-link-flash" : ""} ${className}`.trim()}
    >
      <h2 className="text-sm font-semibold text-surface-900">{title}</h2>
      <p className="text-xs text-surface-600 mt-1 mb-3">{helperText}</p>

      {linkUrl ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <input
              readOnly
              value={linkUrl}
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded border border-surface-300 bg-surface-50 text-surface-800 font-mono truncate transition-colors duration-300 data-[flash=1]:bg-emerald-50/80 data-[flash=1]:border-emerald-200/80"
              aria-label="Lead link URL"
              data-flash={copyFlash ? 1 : 0}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex flex-wrap gap-2 shrink-0 justify-end sm:justify-start sm:items-stretch">
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-md px-4 py-2 whitespace-nowrap transition-transform duration-200 active:scale-[0.98]"
              >
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-sm font-medium text-surface-800 border border-surface-300 rounded-md px-4 py-2 hover:bg-surface-50 whitespace-nowrap transition-transform duration-200 active:scale-[0.98]"
              >
                {messageCopied ? "Copied!" : "Copy Message"}
              </button>
              <button
                type="button"
                onClick={handleOpen}
                className="text-sm font-medium text-surface-800 border border-surface-300 rounded-md px-4 py-2 hover:bg-surface-50 whitespace-nowrap transition-transform duration-200 active:scale-[0.98]"
              >
                Open Link
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start pt-1 border-t border-surface-100">
            <div
              className={`shrink-0 rounded-lg border border-surface-200 bg-white p-2 transition-[box-shadow,transform] duration-300 ${copyFlash ? "shadow-md shadow-emerald-900/10 scale-[1.02]" : "shadow-sm"}`}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                <img
                  src={qrDataUrl}
                  alt="QR code for your lead link"
                  width={QR_SIZE}
                  height={QR_SIZE}
                  className="block rounded-sm"
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-sm bg-surface-100 text-[10px] text-surface-500 text-center px-2"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                >
                  Generating QR…
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-surface-700">
                Share in person
              </p>
              <p className="text-xs text-surface-500 leading-relaxed max-w-sm">
                Scan this code on a phone to open your link—handy at open houses
                or events.
              </p>
            </div>
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
