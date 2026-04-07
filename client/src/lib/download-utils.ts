/**
 * Cross-platform file download utility.
 *
 * Strategy — anchor-click with a blob URL (works everywhere):
 *
 *  - iOS Safari 14.5+  : supports `download` attribute on blob: URLs → file saves
 *                        to the Files app / Downloads.
 *  - Android Chrome    : standard blob-URL anchor-click download.
 *  - Desktop browsers  : standard blob-URL anchor-click download.
 *
 * Why NOT Web Share API?
 *   navigator.share() requires a direct user-activation token. Because our Excel
 *   generation uses `await import('xlsx')`, the user-activation window has already
 *   expired before we can call share(). The browser silently rejects the call on
 *   iOS and Android, so nothing happens. Anchor-click downloads do NOT need
 *   user-activation and work reliably in async handlers.
 *
 * iOS < 14.5 fallback:
 *   The `download` attribute is ignored in very old Safari. We detect this and
 *   open the blob URL in a new tab instead, where iOS QuickLook lets the user
 *   tap "Share → Save to Files".
 */

/** True if the browser is Safari on iOS/iPadOS (but not Chrome on iOS). */
function isOldIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (!isIOS) return false;

  // iOS Safari ships WebKit; Chrome on iOS includes "CriOS"
  const isSafari = /^((?!CriOS|FxiOS|OPiOS|EdgiOS).)*Safari/.test(ua);
  if (!isSafari) return false;

  // iOS 14.5 introduced blob-URL download support (Safari 14.1).
  // Parse the OS version from the UA string.
  const match = ua.match(/OS (\d+)_(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  // Consider "old" if < 14.5
  return major < 14 || (major === 14 && minor < 5);
}

/**
 * Download any Blob as a named file.
 * Works on iOS 14.5+, Android, and all desktop browsers.
 *
 * @param blob     The file data (correct MIME type already set).
 * @param filename Suggested file name, e.g. "Report_April_2026.xlsx".
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  if (isOldIOSSafari()) {
    // Old iOS Safari: open blob URL in a new tab.
    // The user will see a QuickLook preview with a Share button to save to Files.
    const tab = window.open(url, '_blank');
    if (!tab) {
      // If popups are blocked, navigate in same tab as last resort.
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  // Standard anchor-click — works on all modern browsers including iOS 14.5+.
  // This does NOT require user-activation (unlike navigator.share or window.open).
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.cssText = 'position:fixed;top:-1px;left:-1px;opacity:0;';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Download a plain-text string (JSON, CSV, …) as a file.
 */
export function downloadText(
  text: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Download a JSON-serialisable value as a .json file.
 */
export function downloadJSON(data: unknown, filename: string): void {
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json');
}

/**
 * XLSX drop-in replacement for `XLSX.writeFile(workbook, filename)`.
 *
 * The workbook must already be built before calling this function.
 * All modern platforms (iOS 14.5+, Android, Desktop) are supported.
 *
 * @param workbook  A SheetJS workbook object.
 * @param filename  File name including .xlsx extension.
 */
export async function downloadXLSX(workbook: any, filename: string): Promise<void> {
  const XLSX = await import('xlsx');

  // Write to Uint8Array — works in every browser without file-system access.
  const buf: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, filename);
}
