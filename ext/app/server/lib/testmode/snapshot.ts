// Save the in-page sql.js DB to sessionStorage on pagehide, so the next
// page in this tab can use it as the seed. Pairs with the restore in
// bootstrap.js. Test-mode only: gated by the caller, since for big docs
// the export-and-encode cost is significant and a CDN/Puter consumer
// gets nothing useful out of it.
//
// Contract: sessionStorage['grist-static-snap-' + docId] = btoa(<bytes>).

import { exportMainDb } from 'app/server/lib/SqliteJs';

const SNAP_KEY_PREFIX = 'grist-static-snap-';

let installed = false;

export function installSnapshotOnPagehide(): void {
  if (installed || typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  installed = true;
  // Read docId at unload time so doc-switches within a tab save under
  // the right key.
  window.addEventListener('pagehide', () => {
    const cfg: any = window.gristConfig;
    const docId = cfg && cfg.assignmentId;
    if (docId) { saveSnapshot(docId); }
  });
}

function saveSnapshot(docId: string): void {
  try {
    const bytes = exportMainDb();
    if (!bytes) { return; }
    sessionStorage.setItem(SNAP_KEY_PREFIX + docId, encodeBytes(bytes));
  } catch (e) {
    const err = e as Error;
    const msg = `snapshot save failed: ${String(err?.message || err).substring(0, 200)}`;
    (window.__staticErrors = window.__staticErrors || []).push({
      t: Math.round(performance.now()), msg,
    });
    console.error('[grist-static] ' + msg);
  }
}

// Chunked fromCharCode.apply, then a single join. The naive `s +=
// fromCharCode(b)` form is O(n^2) on engines that don't rope strings
// and OOMs on >~10MB docs.
function encodeBytes(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return btoa(parts.join(''));
}
