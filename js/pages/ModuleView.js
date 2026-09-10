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

  if (lessonSlug) {
    return renderLessonView(mod, lessonSlug);
  }

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

  const lessons = mod.lessons ?? [];
  const currentIdx = lessons.findIndex(l => l.slug === slug);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;

  const renderedContent = renderLesson(lesson);

  return `
    <!-- BREADCRUMB -->
    <div class="lesson-breadcrumb no-print">
      <a href="#/modules" style="color:var(--text-muted);text-decoration:none;">Modules</a>
      <span style="color:var(--text-muted);margin:0 6px;">›</span>
      <a href="#/modules/${mod.id}" style="color:var(--text-muted);text-decoration:none;">${mod.title}</a>
      <span style="color:var(--text-muted);margin:0 6px;">›</span>
      <span style="color:var(--text-secondary);">${lesson.title}</span>
    </div>

    <!-- LESSON HEADER -->
    <div class="lesson-header">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <span class="module-num part${mod.part}" style="font-size:.7rem;">Part ${mod.part}</span>
        <span style="font-size:.75rem;font-family:var(--font-mono);color:var(--text-muted);">${lesson.estimatedMinutes} min read</span>
        ${isDone ? `<span class="badge badge-complete">✓ completed</span>` : ''}
        <button id="btn-export-pdf" class="btn btn-secondary btn-sm no-print" style="margin-left:auto;">📄 Export as PDF</button>
      </div>
      <h1 class="lesson-title" id="lesson-title-print">${lesson.title}</h1>
    </div>

    <!-- LESSON CONTENT -->
    <div class="lesson-body" id="lesson-body" data-lesson-id="${lesson.id}">
      ${renderedContent}
    </div>

    <!-- FLOATING "+ NOTE" BUTTON (hidden until a selection is made) -->
    <button id="note-float-btn" class="note-float-btn no-print" style="display:none;">+ Note</button>

    <!-- NOTE POPUP (for adding/editing/viewing a note) -->
    <div id="note-popup" class="note-popup no-print" style="display:none;">
      <div class="note-popup-quote" id="note-popup-quote"></div>
      <textarea id="note-popup-textarea" class="note-popup-textarea" placeholder="Write your note…"></textarea>
      <div class="note-popup-actions">
        <button id="note-popup-delete" class="btn btn-danger btn-sm" style="display:none;">Delete</button>
        <div style="flex:1;"></div>
        <button id="note-popup-cancel" class="btn btn-secondary btn-sm">Cancel</button>
        <button id="note-popup-save" class="btn btn-primary btn-sm">Save</button>
      </div>
    </div>

    <!-- MY NOTES SECTION -->
    <div class="my-notes-section no-print" id="my-notes-section">
      <div class="my-notes-header" id="my-notes-toggle">
        <span>📝 My Notes (<span id="my-notes-count">0</span>)</span>
        <span class="my-notes-chevron" id="my-notes-chevron">▾</span>
      </div>
      <div class="my-notes-list" id="my-notes-list" style="display:none;"></div>
    </div>

    <!-- END OF LESSON ACTIONS -->
    <div class="lesson-end-actions no-print" id="lesson-end-actions">
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
    <div class="lesson-nav no-print">
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

    <!-- PRINT STYLESHEET — for the Export as PDF button (native browser print-to-PDF) -->
    <style>
      @media print {
        #sidebar, #sidebar-toggle, #sidebar-overlay, .no-print { display: none !important; }
        body, #page-container, .lesson-body, .lesson-header { background: #ffffff !important; }
        .lesson-body, .lesson-body *, .lesson-title, .lesson-header * {
          color: #000000 !important;
          background: transparent !important;
        }
        .lesson-body table, .lesson-body .callout, .lesson-body .list-block, .lesson-body img {
          page-break-inside: avoid;
        }
        .lesson-body a { color: #000000 !important; text-decoration: underline !important; }
        mark.user-highlight { background: #f0e6c8 !important; border-bottom: 1px solid #999 !important; }
        #page-container { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
      }
    </style>

    <!-- MARK COMPLETE LOGIC -->
    <script>
    (function() {
      var btn = document.getElementById('btn-mark-complete');
      if (!btn) return;
      btn.addEventListener('click', async function() {
        var lessonId  = btn.dataset.lessonId;
        var modId     = btn.dataset.modId;
        var lessonCount = parseInt(btn.dataset.lessonCount, 10) || 1;

        try {
          var storeMod = await import('./js/store.js');

          storeMod.progress.markLessonComplete(lessonId);

          var prog = storeMod.progress.get();
          var doneLessons = Object.values(prog.lessons).filter(function(l) { return l.status === 'complete'; }).length;
          var pct = Math.min(100, Math.round((doneLessons / lessonCount) * 100));
          prog.modules[modId] = {
            status: pct >= 100 ? 'complete' : 'in_progress',
            percentComplete: pct
          };
          storeMod.progress.set(prog);
        } catch(e) { console.warn('progress save failed', e); }

        btn.textContent = '✓ Completed';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.disabled = true;

        var card = document.querySelector('.lesson-end-card');
        if (card) {
          card.style.borderColor = 'var(--success)';
          setTimeout(function() { card.style.borderColor = ''; }, 1500);
        }
      });
    })();
    <\/script>

    <!-- EXPORT AS PDF LOGIC (native browser print-to-PDF, works fully offline) -->
    <script>
    (function() {
      var exportBtn = document.getElementById('btn-export-pdf');
      if (!exportBtn) return;
      exportBtn.addEventListener('click', function() {
        window.print();
      });
    })();
    <\/script>

    <!-- NOTES FEATURE — styles -->
    <style>
      .user-highlight {
        background: rgba(255, 213, 79, 0.25);
        border-bottom: 2px solid rgba(255, 213, 79, 0.7);
        cursor: pointer;
        border-radius: 2px;
        padding: 0 1px;
      }
      .user-highlight:hover { background: rgba(255, 213, 79, 0.4); }

      .note-float-btn {
        position: fixed;
        z-index: 1000;
        padding: 6px 14px;
        background: var(--accent);
        color: var(--bg-base);
        border: none;
        border-radius: var(--radius);
        font-size: .78rem;
        font-weight: bold;
        font-family: var(--font-mono);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.3);
      }
      .note-float-btn:hover { opacity: .9; }

      .note-popup {
        position: fixed;
        z-index: 1001;
        width: min(340px, 90vw);
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,.4);
      }
      .note-popup-quote {
        font-size: .78rem;
        color: var(--text-muted);
        font-style: italic;
        border-left: 3px solid var(--accent);
        padding-left: 8px;
        margin-bottom: 10px;
        max-height: 60px;
        overflow-y: auto;
      }
      .note-popup-textarea {
        width: 100%;
        min-height: 80px;
        padding: 8px 10px;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        color: var(--text-primary);
        font-family: inherit;
        font-size: .85rem;
        resize: vertical;
        box-sizing: border-box;
      }
      .note-popup-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        align-items: center;
      }

      .my-notes-section {
        margin-top: 20px;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--bg-surface);
        overflow: hidden;
      }
      .my-notes-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: .85rem;
        color: var(--text-secondary);
        user-select: none;
      }
      .my-notes-header:hover { color: var(--text-primary); }
      .my-notes-list {
        padding: 0 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .my-note-item {
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        padding: 10px 12px;
      }
      .my-note-quote {
        font-size: .76rem;
        color: var(--text-muted);
        font-style: italic;
        border-left: 2px solid var(--accent);
        padding-left: 8px;
        margin-bottom: 6px;
      }
      .my-note-text {
        font-size: .85rem;
        color: var(--text-primary);
        line-height: 1.4;
        white-space: pre-wrap;
      }
      .my-note-actions {
        display: flex;
        gap: 10px;
        margin-top: 8px;
      }
      .my-note-actions button {
        font-size: .72rem;
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        font-family: var(--font-mono);
      }
      .my-note-actions button:hover { color: var(--accent); }
      .my-notes-empty {
        font-size: .8rem;
        color: var(--text-muted);
        text-align: center;
        padding: 12px 0;
      }
    </style>

    <!-- NOTES FEATURE — logic -->
    <script>
    (async function() {
      var lessonBody = document.getElementById('lesson-body');
      var lessonId = lessonBody ? lessonBody.dataset.lessonId : null;
      if (!lessonBody || !lessonId) return;

      var storeMod = await import('./js/store.js');
      var floatBtn  = document.getElementById('note-float-btn');
      var popup     = document.getElementById('note-popup');
      var popupQuote = document.getElementById('note-popup-quote');
      var popupText  = document.getElementById('note-popup-textarea');
      var popupSave   = document.getElementById('note-popup-save');
      var popupCancel = document.getElementById('note-popup-cancel');
      var popupDelete = document.getElementById('note-popup-delete');

      var pendingSelectionText = null;
      var editingNoteId = null;

      function escHtml(s) {
        return String(s == null ? '' : s)
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      }

      function hidePopup() {
        popup.style.display = 'none';
        popup.style.visibility = 'visible';
        popup.style.transform = '';
        floatBtn.style.display = 'none';
        pendingSelectionText = null;
        editingNoteId = null;
      }

      function positionPopupNear(rect) {
        var margin = 10;
        popup.style.transform = '';
        popup.style.visibility = 'hidden';
        popup.style.display = 'block';
        popup.style.left = margin + 'px';
        popup.style.top  = margin + 'px';

        var popupRect = popup.getBoundingClientRect();
        var popupW = popupRect.width;
        var popupH = popupRect.height;

        var left = Math.max(margin, Math.min(rect.left, window.innerWidth - popupW - margin));

        var spaceBelow = window.innerHeight - rect.bottom;
        var spaceAbove = rect.top;
        var top;
        if (spaceBelow >= popupH + margin) {
          top = rect.bottom + margin;
        } else if (spaceAbove >= popupH + margin) {
          top = rect.top - popupH - margin;
        } else {
          top = Math.max(margin, window.innerHeight - popupH - margin);
        }

        popup.style.left = left + 'px';
        popup.style.top  = top + 'px';
        popup.style.visibility = 'visible';
      }

      lessonBody.addEventListener('mouseup', function() {
        setTimeout(function() {
          var sel = window.getSelection();
          var text = sel ? sel.toString().trim() : '';
          if (!text || text.length < 3) { floatBtn.style.display = 'none'; return; }

          var anchor = sel.anchorNode;
          if (!anchor || !lessonBody.contains(anchor)) { floatBtn.style.display = 'none'; return; }

          var range = sel.getRangeAt(0);
          var rect = range.getBoundingClientRect();
          floatBtn.style.left = Math.max(8, rect.left) + 'px';
          floatBtn.style.top  = (rect.top - 38) + 'px';
          floatBtn.style.display = 'block';
          floatBtn.dataset.selectedText = text;
        }, 10);
      });

      floatBtn.addEventListener('click', function() {
        pendingSelectionText = floatBtn.dataset.selectedText;
        editingNoteId = null;
        popupQuote.textContent = '"' + pendingSelectionText + '"';
        popupText.value = '';
        popupDelete.style.display = 'none';

        var btnRect = floatBtn.getBoundingClientRect();
        floatBtn.style.display = 'none';
        positionPopupNear(btnRect);
        popupText.focus();
      });

      popupCancel.addEventListener('click', hidePopup);

      popupSave.addEventListener('click', function() {
        var text = popupText.value.trim();
        if (!text) return;

        var saved = false;
        if (editingNoteId) {
          storeMod.notes.update(lessonId, editingNoteId, text);
          saved = true;
        } else if (pendingSelectionText) {
          storeMod.notes.add(lessonId, pendingSelectionText, text);
          saved = true;
        }

        if (!saved) {
          console.warn('[notes] Save produced no write — both editingNoteId and pendingSelectionText were falsy at save time.');
          alert('Something went wrong saving this note — please try selecting the text again.');
          return;
        }

        hidePopup();
        applyHighlights();
        renderNotesList();
      });

      popupDelete.addEventListener('click', function() {
        if (editingNoteId) {
          storeMod.notes.remove(lessonId, editingNoteId);
        }
        hidePopup();
        applyHighlights();
        renderNotesList();
      });

      document.addEventListener('mousedown', function(e) {
        if (popup.style.display === 'block' && !popup.contains(e.target) && e.target !== floatBtn) {
          hidePopup();
        }
      });

      function applyHighlights() {
        lessonBody.querySelectorAll('mark.user-highlight').forEach(function(mark) {
          var parent = mark.parentNode;
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        });

        var lessonNotes = storeMod.notes.getForLesson(lessonId);
        lessonNotes.forEach(function(note) {
          highlightFirstMatch(note.selectedText, note.id);
        });
      }

      function highlightFirstMatch(searchText, noteId) {
        if (!searchText) return;
        var walker = document.createTreeWalker(lessonBody, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          var idx = node.nodeValue.indexOf(searchText);
          if (idx === -1) continue;

          var range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);

          var mark = document.createElement('mark');
          mark.className = 'user-highlight';
          mark.dataset.noteId = noteId;
          try {
            range.surroundContents(mark);
          } catch (e) { continue; }
          return;
        }
      }

      lessonBody.addEventListener('click', function(e) {
        var mark = e.target.closest('mark.user-highlight');
        if (!mark) return;
        var noteId = mark.dataset.noteId;
        var lessonNotes = storeMod.notes.getForLesson(lessonId);
        var note = lessonNotes.find(function(n) { return n.id === noteId; });
        if (!note) return;

        editingNoteId = noteId;
        pendingSelectionText = null;
        popupQuote.textContent = '"' + note.selectedText + '"';
        popupText.value = note.noteText;
        popupDelete.style.display = 'inline-block';

        var rect = mark.getBoundingClientRect();
        positionPopupNear(rect);
        popupText.focus();
      });

      function renderNotesList() {
        var lessonNotes = storeMod.notes.getForLesson(lessonId);
        var countEl = document.getElementById('my-notes-count');
        var listEl  = document.getElementById('my-notes-list');
        if (countEl) countEl.textContent = lessonNotes.length;
        if (!listEl) return;

        if (lessonNotes.length === 0) {
          listEl.innerHTML = '<div class="my-notes-empty">No notes yet — highlight any text above and click "+ Note" to add one.</div>';
          return;
        }

        listEl.innerHTML = lessonNotes.map(function(n) {
          return '<div class="my-note-item" data-note-id="' + n.id + '">' +
            '<div class="my-note-quote">"' + escHtml(n.selectedText) + '"</div>' +
            '<div class="my-note-text">' + escHtml(n.noteText) + '</div>' +
            '<div class="my-note-actions">' +
              '<button class="my-note-edit">Edit</button>' +
              '<button class="my-note-delete">Delete</button>' +
            '</div>' +
          '</div>';
        }).join('');

        listEl.querySelectorAll('.my-note-edit').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var item = btn.closest('.my-note-item');
            var noteId = item.dataset.noteId;
            var note = lessonNotes.find(function(n) { return n.id === noteId; });
            if (!note) return;
            editingNoteId = noteId;
            pendingSelectionText = null;
            popupQuote.textContent = '"' + note.selectedText + '"';
            popupText.value = note.noteText;
            popupDelete.style.display = 'inline-block';
            positionPopupNear(btn.getBoundingClientRect());
            popupText.focus();
          });
        });

        listEl.querySelectorAll('.my-note-delete').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var item = btn.closest('.my-note-item');
            var noteId = item.dataset.noteId;
            storeMod.notes.remove(lessonId, noteId);
            applyHighlights();
            renderNotesList();
          });
        });
      }

      var toggleHeader = document.getElementById('my-notes-toggle');
      var chevron = document.getElementById('my-notes-chevron');
      if (toggleHeader) {
        toggleHeader.addEventListener('click', function() {
          var list = document.getElementById('my-notes-list');
          var open = list.style.display !== 'none';
          list.style.display = open ? 'none' : 'flex';
          chevron.textContent = open ? '▾' : '▴';
        });
      }

      applyHighlights();
      renderNotesList();
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
