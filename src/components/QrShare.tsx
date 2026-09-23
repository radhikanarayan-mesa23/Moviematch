"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QrShareProps {
  url: string;
}

export function QrShare({ url }: QrShareProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current?.querySelector("canvas") ?? null;
  }

  async function shareQrImage() {
    const canvas = getCanvas();
    if (!canvas) return;

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      const file = new File([blob], "tonight-qr.png", { type: "image/png" });
      const shareData = { files: [file], title: "Tonight", text: `Join me on Tonight: ${url}` };
      if (typeof navigator !== "undefined" && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // user cancelled or share failed — fall through to link share
        }
      }
    }
    await shareLink();
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Tonight", text: "Pick tonight's watch with me", url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op — url is still visible on screen
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div ref={canvasRef} className="rounded-[var(--radius-lg)] bg-white p-5">
        <QRCodeCanvas value={url} size={220} level="M" />
      </div>
      <p className="break-all text-center text-xs text-[var(--text-faint)]">{url}</p>
      <div className="flex w-full flex-col gap-3">
        <button type="button" className="btn-primary w-full" onClick={shareQrImage}>
          Share QR code
        </button>
        <button type="button" className="btn-secondary w-full" onClick={shareLink}>
          {copied ? "Link copied!" : "Share link instead"}
        </button>
      </div>
    </div>
  );
}
