/**
 * store.js — localStorage state management
 * Thin typed wrappers over localStorage. Single namespace prefix.
 */

import * as cloudSync from './cloudSync.js';

const NS = 'togaf_';

// ── DEFAULT STATE SHAPES ──

const DEFAULTS = {
  user: {
    name: 'Akshat',
    startDate: new Date().toISOString().slice(0, 10),
    targetExamDate: null,
    activePart: 1,
    activePathId: 'PATH-001',
  },
  progress: {
    lessons: {},   // { lessonId: { status, completedAt, timeSpentSeconds } }
    modules: {},   // { moduleId: { status, percentComplete } }
  },
  quiz_history: [],     // [{ sessionId, timestamp, ... }]
  exam_history: [],
  scenario_history: [],
  flashcards: {},       // { cardId: { interval, easeFactor, dueDate, repetitions, lastRating } }
  path_state: {
    activePathId: 'PATH-001',
    currentWeek: 1,
    completedWeeks: [],
    customizations: {},
  },
  settings: {
    theme: 'dark',
    examMode: false,
    showRationaleImmediately: true,
    timerEnabled: true,
    fontSize: 'medium',
  },
  weak_areas: {
    tags: {},
    lastRecalculated: null,
  },
  notes: {},  // { lessonId: [{ id, selectedText, noteText, createdAt }] }
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    totalStudyDays: 0,
  },
};

// ── CORE PRIMITIVES ──

function key(name) {
  return NS + name;
}

export function get(name) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return structuredClone(DEFAULTS[name] ?? null);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULTS[name] ?? null);
  }
}

export function set(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch (e) {
    console.warn('[store] write failed:', e);
  }
  if (cloudSync.isEnabled()) {
    cloudSync.schedulePush(getAllStateSnapshot());
  }
}

function getAllStateSnapshot() {
  const snap = {};
  for (const name of Object.keys(DEFAULTS)) snap[name] = get(name);
  return snap;
}

export function update(name, updater) {
  const current = get(name);
  const next = updater(current);
  set(name, next);
  return next;
}

export function remove(name) {
  localStorage.removeItem(key(name));
}

export function resetAll() {
  Object.keys(DEFAULTS).forEach(name => remove(name));
}

// ── TYPED ACCESSORS ──

export const user = {
  get: ()  => get('user'),
  set: (v) => set('user', v),
  update: (fn) => update('user', fn),
};

export const notes = {
  get:    ()  => get('notes'),
  set:    (v) => set('notes', v),
  getForLesson(lessonId) {
    return get('notes')[lessonId] ?? [];
  },
  add(lessonId, selectedText, noteText) {
    const entry = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      selectedText,
      noteText,
      createdAt: new Date().toISOString(),
    };
    update('notes', (n) => {
      if (!n[lessonId]) n[lessonId] = [];
      n[lessonId].push(entry);
      return n;
    });
    return entry;
  },
  update(lessonId, noteId, newText) {
    update('notes', (n) => {
      const list = n[lessonId] ?? [];
      const found = list.find((x) => x.id === noteId);
      if (found) found.noteText = newText;
      return n;
    });
  },
  remove(lessonId, noteId) {
    update('notes', (n) => {
      n[lessonId] = (n[lessonId] ?? []).filter((x) => x.id !== noteId);
      return n;
    });
  },
};

export const progress = {
  get: ()  => get('progress'),
  set: (v) => set('progress', v),
  markLessonComplete(lessonId) {
    update('progress', (p) => {
      p.lessons[lessonId] = {
        status: 'complete',
        completedAt: new Date().toISOString(),
        timeSpentSeconds: (p.lessons[lessonId]?.timeSpentSeconds ?? 0),
      };
      return p;
    });
  },
  getLessonStatus(lessonId) {
    return get('progress').lessons[lessonId]?.status ?? 'new';
  },
  getModulePercent(moduleId) {
    return get('progress').modules[moduleId]?.percentComplete ?? 0;
  },
};

export const settings = {
  get: ()  => get('settings'),
  set: (v) => set('settings', v),
  update: (fn) => update('settings', fn),
  getTheme: () => (get('settings').theme ?? 'dark'),
  setTheme(theme) {
    update('settings', (s) => ({ ...s, theme }));
    document.documentElement.setAttribute('data-theme', theme);
  },
};

export const streak = {
  get: ()  => get('streak'),
  /**
   * Record activity for today; updates streak.
   */
  recordActivity() {
    update('streak', (s) => {
      const today = new Date().toISOString().slice(0, 10);
      if (s.lastActivityDate === today) return s; // already recorded today

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const continued = s.lastActivityDate === yesterday;

      const newStreak = continued ? s.currentStreak + 1 : 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(s.longestStreak, newStreak),
        lastActivityDate: today,
        totalStudyDays: s.totalStudyDays + 1,
      };
    });
  },
};

export const quizHistory = {
  get: ()  => get('quiz_history'),
  add(session) {
    update('quiz_history', (h) => [session, ...h].slice(0, 100));
  },
};

export const examHistory = {
  get: ()  => get('exam_history'),
  add(session) {
    update('exam_history', (h) => [session, ...h].slice(0, 50));
  },
};

// ── INIT: apply persisted theme, pull cloud data if sync enabled ──
export async function initStore() {
  document.documentElement.setAttribute('data-theme', settings.getTheme());

  if (cloudSync.isEnabled()) {
    const cloudSnap = await cloudSync.pullSnapshot();
    if (cloudSnap) {
      // Direct localStorage writes here (not set()) to avoid an
      // immediate, redundant push of data we just pulled.
      for (const name of Object.keys(DEFAULTS)) {
        if (cloudSnap[name] !== undefined) {
          localStorage.setItem(key(name), JSON.stringify(cloudSnap[name]));
        }
      }
      document.documentElement.setAttribute('data-theme', settings.getTheme());
    }
  }
}
