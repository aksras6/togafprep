/**
 * ModuleView.js
 * Shows module overview + lesson list, and renders individual lessons.
 * Routes: #/modules/:moduleId  → module overview
 *         #/modules/:moduleId/lesson/:slug → lesson reader
 */

import { getData, getLesson } from '../data.js';
import { progress } from '../store.js';
import { renderLesson } from '../contentRenderer.js';

export async function ModuleView({ moduleId, lessonSlug }) {
  const modules = await getData('modules');
  const mod = modules.find(m => m.id === moduleId);

  if (!mod) return notFound();

  // If a lesson slug is present, render the lesson reader
  if (lessonSlug) {
    return renderLessonView(mod, lessonSlug);
  }

  // Otherwise render the module overview
  return renderModuleOverview(mod);
}

// ── MODULE OVERVIEW ─────────────────────────────────────────────

async function renderModuleOverview(mod) {
  const prog     = progress.get();
  const lessons  = mod.lessons ?? [];
  const pct      = prog.modules[mod.id]?.percentComplete ?? 0;
  const doneLessons = lessons.filter(l => prog.lessons[l.id]?.status === 'complete').length;

  return `
    <div style="margin-bottom:16px;">
      <a href="#/modules" style="color:var(--text-secondary);text-decoration:none;font-size:.85rem;">← All Modules</a>
    </div>

    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span class="module-num part${mod.part}">MOD-${String(mod.order).padStart(3,'0')}</span>
        <span class="badge" style="border-color:var(--part${mod.part}-color);color:var(--part${mod.part}-color);">Part ${mod.part}</span>
      </div>
      <h1 class="page-title">${mod.title}</h1>
      <p class="page-subtitle">${mod.description}</p>
    </div>

    <div class="card card-sm" style="margin-bottom:24px;">
      <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:.82rem;align-items:center;">
        <div><span class="text-muted text-xs text-mono">EST. TIME</span><br><span class="text-mono">${mod.estimatedMinutes} min</span></div>
        <div><span class="text-muted text-xs text-mono">LESSONS</span><br><span class="text-mono">${doneLessons}/${lessons.length} done</span></div>
        <div><span class="text-muted text-xs text-mono">PROGRESS</span><br><span class="text-mono">${pct}%</span></div>
        <div style="flex:1;min-width:140px;">
          <div class="progress-bar-wrap"><div class="progress-bar-fill ${mod.part === 2 ? 'purple' : ''}" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>

    ${mod.tags?.length ? `
      <div style="margin-bottom:24px;display:flex;flex-wrap:wrap;gap:6px;">
        ${mod.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>` : ''}

    <div class="section-header">
      <span class="section-title">Lessons in this Module</span>
      <div class="section-line"></div>
    </div>

    ${lessons.length === 0 ? `
      <div class="placeholder-page" style="min-height:160px;border:1px dashed var(--border);border-radius:var(--radius-lg);">
        <div class="placeholder-icon" style="font-size:1.8rem;">◫</div>
        <p class="placeholder-text">Lessons coming soon for this module.</p>
      </div>
    ` : `
      <div class="module-list">
        ${lessons.map((l, i) => {
          const ls = prog.lessons[l.id]?.status ?? 'new';
          const isDone = ls === 'complete';
          return `
            <a href="#/modules/${mod.id}/lesson/${l.slug}"
               class="module-card"
               aria-label="Open lesson: ${l.title}">
              <div class="module-num ${isDone ? '' : ''}" style="min-width:32px;text-align:center;font-size:.8rem;">
                ${isDone ? '<span style="color:var(--success)">✓</span>' : (i + 1)}
              </div>
              <div class="module-info">
                <div class="module-title">${l.title}</div>
                <div class="module-desc" style="margin-top:2px;">
                  ${isDone ? 'Completed' : 'Click to read this lesson'}
                </div>
              </div>
              <div class="module-meta">
                <span class="module-time">${l.estimatedMinutes} min</span>
                <span class="badge badge-${isDone ? 'complete' : 'new'}">${isDone ? '✓ done' : 'new'}</span>
              </div>
            </a>`;
        }).join('')}
      </div>
    `}

    <div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap;">
      <a href="#/practice" class="btn btn-primary">Practice Questions →</a>
      <a href="#/modules"  class="btn btn-secondary">← All Modules</a>
    </div>
  `;
}

// ── LESSON READER ────────────────────────────────────────────────

async function renderLessonView(mod, slug) {
  let lesson;
  try {
    lesson = await getLesson(slug);
  } catch (e) {
    return `
      <div style="margin-bottom:16px;">
        <a href="#/modules/${mod.id}" style="color:var(--text-secondary);text-decoration:none;font-size:.85rem;">← ${mod.title}</a>
      </div>
      <div class="placeholder-page">
        <div class="placeholder-icon">◌</div>
        <div class="placeholder-title">Lesson not found</div>
        <p class="placeholder-text">${e.message}</p>
      </div>`;
  }

  const prog    = progress.get();
  const lessonStatus = prog.lessons[lesson.id]?.status ?? 'new';
  const isDone  = lessonStatus === 'complete';

  // Find prev/next lesson within module
  const lessons = mod.lessons ?? [];
  const currentIdx = lessons.findIndex(l => l.slug === slug);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;

  const renderedContent = renderLesson(lesson);

  return `
    <!-- BREADCRUMB -->
    <div class="lesson-breadcrumb">
      <a href="#/modules" style="color:var(--text-muted);text-decoration:none;">Modules</a>
      <span style="color:var(--text-muted);margin:0 6px;">›</span>
      <a href="#/modules/${mod.id}" style="color:var(--text-muted);text-decoration:none;">${mod.title}</a>
      <span style="color:var(--text-muted);margin:0 6px;">›</span>
      <span style="color:var(--text-secondary);">${lesson.title}</span>
    </div>

    <!-- LESSON HEADER -->
    <div class="lesson-header">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span class="module-num part${mod.part}" style="font-size:.7rem;">Part ${mod.part}</span>
        <span style="font-size:.75rem;font-family:var(--font-mono);color:var(--text-muted);">${lesson.estimatedMinutes} min read</span>
        ${isDone ? `<span class="badge badge-complete">✓ completed</span>` : ''}
      </div>
      <h1 class="lesson-title">${lesson.title}</h1>
    </div>

    <!-- LESSON CONTENT -->
    <div class="lesson-body" id="lesson-body">
      ${renderedContent}
    </div>

    <!-- END OF LESSON ACTIONS -->
    <div class="lesson-end-actions" id="lesson-end-actions">
      <div class="lesson-end-card">
        <div class="lesson-end-title">Finished reading?</div>
        <div class="lesson-end-sub">Lock in what you learned — mark complete, then test yourself.</div>
        <div class="lesson-end-buttons">
          <button
            class="btn ${isDone ? 'btn-secondary' : 'btn-primary'}"
            id="btn-mark-complete"
            data-lesson-id="${lesson.id}"
            data-mod-id="${mod.id}"
            data-lesson-count="${lessons.length}"
          >
            ${isDone ? '✓ Completed' : 'Mark as Complete'}
          </button>
          <a href="#/practice" class="btn btn-secondary">Quick Practice →</a>
          <a href="#/exams"    class="btn btn-secondary">Mini Exam →</a>
        </div>
      </div>
    </div>

    <!-- NAV: PREV / NEXT -->
    <div class="lesson-nav">
      <div>
        ${prevLesson ? `
          <a href="#/modules/${mod.id}/lesson/${prevLesson.slug}" class="lesson-nav-btn">
            <span class="lesson-nav-dir">← Previous</span>
            <span class="lesson-nav-label">${prevLesson.title}</span>
          </a>` : `<div></div>`}
      </div>
      <div>
        ${nextLesson ? `
          <a href="#/modules/${mod.id}/lesson/${nextLesson.slug}" class="lesson-nav-btn lesson-nav-btn-right">
            <span class="lesson-nav-dir">Next →</span>
            <span class="lesson-nav-label">${nextLesson.title}</span>
          </a>` : `
          <a href="#/modules/${mod.id}" class="lesson-nav-btn lesson-nav-btn-right">
            <span class="lesson-nav-dir">← Back to Module</span>
            <span class="lesson-nav-label">${mod.title}</span>
          </a>`}
      </div>
    </div>

    <!-- MARK COMPLETE LOGIC -->
    <script>
    (function() {
      var btn = document.getElementById('btn-mark-complete');
      if (!btn) return;
      btn.addEventListener('click', function() {
        var lessonId  = btn.dataset.lessonId;
        var modId     = btn.dataset.modId;
        var lessonCount = parseInt(btn.dataset.lessonCount, 10) || 1;

        // Update progress in localStorage
        try {
          var raw  = localStorage.getItem('togaf_progress');
          var prog = raw ? JSON.parse(raw) : { lessons: {}, modules: {} };
          if (!prog.lessons) prog.lessons = {};
          if (!prog.modules) prog.modules = {};

          prog.lessons[lessonId] = {
            status: 'complete',
            completedAt: new Date().toISOString(),
            timeSpentSeconds: prog.lessons[lessonId]?.timeSpentSeconds ?? 0
          };

          // Recalculate module percent
          // We can only count lessons we know about from data — use lessonCount
          var doneLessons = Object.values(prog.lessons).filter(function(l) { return l.status === 'complete'; }).length;
          var pct = Math.min(100, Math.round((doneLessons / lessonCount) * 100));
          prog.modules[modId] = {
            status: pct >= 100 ? 'complete' : 'in_progress',
            percentComplete: pct
          };

          localStorage.setItem('togaf_progress', JSON.stringify(prog));
        } catch(e) { console.warn('progress save failed', e); }

        // Update button UI
        btn.textContent = '✓ Completed';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.disabled = true;

        // Flash success
        var card = document.querySelector('.lesson-end-card');
        if (card) {
          card.style.borderColor = 'var(--success)';
          setTimeout(function() { card.style.borderColor = ''; }, 1500);
        }
      });
    })();
    <\/script>
  `;
}

function notFound() {
  return `
    <div class="placeholder-page">
      <div class="placeholder-icon">◌</div>
      <div class="placeholder-title">Module not found</div>
      <a class="btn btn-secondary mt-16" href="#/modules">← Back to Modules</a>
    </div>`;
}
