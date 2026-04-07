/**
 * Cross-platform file download utility.
 *
 * Strategy:
 *  - iOS / Android: use Web Share API (navigator.share with files) — triggers
 *    the native share sheet so the user can save to Files, Drive, WhatsApp, etc.
 *    Falls back to opening the blob URL in the current tab if sharing fails.
 *  - Desktop (Chrome / Firefox / Edge / Safari macOS): standard
 *    `<a href=blobUrl download=filename>` click.
 *
 * Why not just <a download> everywhere?
 *   iOS Safari ignores the `download` attribute for blob: URLs and for
 *   cross-origin URLs — the file either opens in the browser or throws an error.
 */

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isAndroid = (): boolean => /Android/i.test(navigator.userAgent);

const isMobile = (): boolean => isIOS() || isAndroid();

/**
 * Primary download function — works on iOS, Android, Chrome, Firefox, Edge, Safari.
 *
 * @param blob     The file data as a Blob (already has the correct MIME type set).
 * @param filename The suggested file name, e.g. "Report_April_2026.xlsx".
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // ── Web Share API (iOS 15+ / Android Chrome 89+) ─────────────────────────
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    typeof navigator.share === 'function'
  ) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return; // success — native share sheet handled it
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user cancelled — do nothing
        // Any other error: fall through to blob-URL approach
      }
    }
  }

  // ── Standard blob-URL approach (Desktop + Android fallback) ──────────────
  const url = URL.createObjectURL(blob);

  if (isMobile() && !isAndroid()) {
    // iOS without Web Share API: navigate to blob URL in same tab.
    // Safari will offer "Open in…" / Quick Look for recognised types.
    window.location.href = url;
    // Revoke after a short delay so the navigation can start.
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } else {
    // Desktop or Android: programmatic anchor click.
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Convenience: download a plain string (JSON, CSV, …) as a text file.
 */
export async function downloadText(
  text: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8'
): Promise<void> {
  const blob = new Blob([text], { type: mimeType });
  await downloadBlob(blob, filename);
}

/**
 * Convenience: download a JSON object as a .json file.
 */
export async function downloadJSON(data: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await downloadText(json, filename, 'application/json');
}

/**
 * XLSX-compatible replacement for `XLSX.writeFile(workbook, filename)`.
 *
 * Usage:
 *   import XLSX from 'xlsx';
 *   import { downloadXLSX } from '@/lib/download-utils';
 *
 *   const wb = XLSX.utils.book_new();
 *   // … build workbook …
 *   await downloadXLSX(wb, 'MyReport.xlsx');
 */
export async function downloadXLSX(
  workbook: any,
  filename: string
): Promise<void> {
  const XLSX = await import('xlsx');

  // Write to ArrayBuffer (works in all browsers, no file-system access needed)
  const buf: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  await downloadBlob(blob, filename);
}
