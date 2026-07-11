/**
 * cloudSync.js — Firebase Firestore cross-device sync
 *
 * Design: one Firestore document per "sync code" (a short random string
 * the person enters on each device they want kept in sync). No login,
 * no auth — anyone with the code can read/write that one document.
 * This is a deliberate simplicity trade-off appropriate for a single
 * person's personal study data, not a multi-user system.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEc1_eZY6mDCHw9fJyzSc-V77O5Y_tBZg",
  authDomain: "togafprep-689715.firebaseapp.com",
  projectId: "togafprep-689715",
  storageBucket: "togafprep-689715.firebasestorage.app",
  messagingSenderId: "929708805045",
  appId: "1:929708805045:web:9256b80aea07e07b5327fc",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Best-effort offline queueing. Wrapped in try/catch because this call
// throws if called twice (e.g. multiple tabs) — safe to ignore if so.
try { enableIndexedDbPersistence(db); } catch (e) { /* ignore */ }

const SYNC_CODE_KEY     = 'togaf_sync_code_v1';
const LAST_SYNCED_KEY   = 'togaf_last_synced_v1';
const LOCAL_UPDATED_KEY = 'togaf_local_updated_v1';
const CODE_ALPHABET     = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — avoids visual ambiguity

// ── Sync code management (local device pairing token) ──────────────

export function getSyncCode() {
  return localStorage.getItem(SYNC_CODE_KEY);
}

export function isEnabled() {
  return !!getSyncCode();
}

export function generateCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function setSyncCode(code) {
  const clean = String(code).trim().toUpperCase().replace(/\s+/g, '');
  localStorage.setItem(SYNC_CODE_KEY, clean);
  return clean;
}

export function disableSync() {
  localStorage.removeItem(SYNC_CODE_KEY);
  localStorage.removeItem(LAST_SYNCED_KEY);
  localStorage.removeItem(LOCAL_UPDATED_KEY);
}

export function getLastSynced() {
  return localStorage.getItem(LAST_SYNCED_KEY);
}

function markSynced() {
  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}

// ── Push (debounced — batches rapid successive local writes) ───────

let pushTimer = null;
let pendingSnapshot = null;
let lastPushError = null;

export function schedulePush(snapshot) {
  if (!isEnabled()) return;
  pendingSnapshot = snapshot;

  // Record the moment of this LOCAL change immediately (not debounced) and
  // persist it to localStorage so it survives a reload. This is what lets
  // pullSnapshot() below detect "local is already newer than the cloud" even
  // if the reload happens before the actual network push completes.
  localStorage.setItem(LOCAL_UPDATED_KEY, new Date().toISOString());

  clearTimeout(pushTimer);
  pushTimer = setTimeout(flushPush, 400);
}

// Best-effort: try to get any pending change out before the page unloads,
// since a reload destroys the debounce timer above without firing it.
// Not guaranteed (async work during unload is never guaranteed by browsers),
// but the timestamp guard in pullSnapshot() is the real safety net —
// this just reduces how often we need to rely on it.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (pendingSnapshot) {
      clearTimeout(pushTimer);
      flushPush();
    }
  });
}

async function flushPush() {
  const code = getSyncCode();
  if (!code || !pendingSnapshot) return;
  try {
    await setDoc(doc(db, 'progress', code), {
      data: pendingSnapshot,
      updatedAt: new Date().toISOString(),
    });
    markSynced();
    lastPushError = null;
  } catch (e) {
    lastPushError = e;
    console.warn('[cloudSync] push failed (will retry on next change):', e);
  }
}

export function getLastPushError() {
  return lastPushError;
}

// ── Pull (called once on app load if sync is enabled) ───────────────

export async function pullSnapshot() {
  const code = getSyncCode();
  if (!code) return null;
  try {
    const snap = await getDoc(doc(db, 'progress', code));
    if (!snap.exists()) return null; // code entered, nothing pushed under it yet — not an error

    const cloudDoc = snap.data();
    const cloudUpdatedAt = cloudDoc.updatedAt ? new Date(cloudDoc.updatedAt).getTime() : 0;
    const localUpdatedAt = (() => {
      const raw = localStorage.getItem(LOCAL_UPDATED_KEY);
      return raw ? new Date(raw).getTime() : 0;
    })();

    if (localUpdatedAt > cloudUpdatedAt) {
      // Local has a change the cloud doesn't know about yet (e.g. a push
      // that was scheduled but never completed before a reload). Applying
      // the cloud snapshot here would silently erase that local change —
      // skip the pull and let the next successful push catch the cloud up
      // instead of the other way around.
      console.info('[cloudSync] local data is newer than cloud — skipping pull to avoid overwriting a recent local change');
      return null;
    }

    markSynced();
    return cloudDoc.data ?? null;
  } catch (e) {
    console.warn('[cloudSync] pull failed, continuing with local data only:', e);
    return null;
  }
}
