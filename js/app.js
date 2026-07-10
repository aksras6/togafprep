/**
 * app.js — application bootstrap
 */

import { start, register, onNotFound } from './router.js';
import { initStore, streak } from './store.js';

import { Dashboard }  from './pages/Dashboard.js';
import { Modules }    from './pages/Modules.js';
import { ModuleView } from './pages/ModuleView.js';
import { Practice }   from './pages/Practice.js';
import { Exams }      from './pages/Exams.js';
import { Glossary }   from './pages/Glossary.js';
import { Settings }   from './pages/Settings.js';

initStore();
refreshStreakUI();

function mount(pageFn) {
  return async (params) => {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="loading-state">
        <div class="loader-ring"></div>
        <p>Loading…</p>
      </div>`;
    try {
      container.innerHTML = await pageFn(params);
    } catch (err) {
      console.error('[page error]', err);
      container.innerHTML = `
        <div class="placeholder-page">
          <div class="placeholder-icon">⚠</div>
          <div class="placeholder-title">Error loading page</div>
          <p class="placeholder-text">${err.message}</p>
          <a class="btn btn-secondary mt-16" href="#/">← Dashboard</a>
        </div>`;
    }
  };
}

register('/',                                        mount(Dashboard));
register('/modules',                                 mount(Modules));
register('/modules/:moduleId',                       mount(ModuleView));
register('/modules/:moduleId/lesson/:lessonSlug',    mount(ModuleView));
register('/practice',                                mount(Practice));
register('/exams',                                   mount(Exams));
register('/glossary',                                mount(Glossary));
register('/settings',                                mount(Settings));

onNotFound((path) => {
  document.getElementById('page-container').innerHTML = `
    <div class="placeholder-page">
      <div class="placeholder-icon">◌</div>
      <div class="placeholder-title">404 — Not found</div>
      <p class="placeholder-text">No page matched: <code>${path}</code></p>
      <a class="btn btn-secondary mt-16" href="#/">← Dashboard</a>
    </div>`;
});

// Mobile sidebar
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebar-overlay');
const toggleBtn = document.getElementById('sidebar-toggle');

toggleBtn.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  overlay.classList.toggle('visible', open);
  toggleBtn.setAttribute('aria-expanded', String(open));
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  toggleBtn.setAttribute('aria-expanded', 'false');
});

sidebar.addEventListener('click', (e) => {
  if (e.target.closest('.nav-link') && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }
});

streak.recordActivity();
refreshStreakUI();

start();

function refreshStreakUI() {
  const count = streak.get().currentStreak;
  const el  = document.getElementById('streak-count');
  const mel = document.getElementById('mobile-streak-count');
  if (el)  el.textContent  = count;
  if (mel) mel.textContent = count;
}

window.__app = { refreshStreakUI };
