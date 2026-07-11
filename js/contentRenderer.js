/**
 * contentRenderer.js
 * Converts a lesson's block array into an HTML string.
 * All user-facing text is escaped to prevent XSS.
 * Inline SVG is passed through as-is (authored, not user input).
 *
 * Supported block types:
 *   heading, paragraph, list, callout, table, checklist,
 *   hook, realWorldScenario, examFocus, mistakes, diagram, divider
 */

// ── ESCAPE UTILITY ──────────────────────────────────────────────
function esc(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Inline markdown-lite: **bold**, `code`, _italic_
 * Safe: runs AFTER escaping.
 */
function inline(str) {
  return esc(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

// ── BLOCK RENDERERS ─────────────────────────────────────────────

function renderHeading(block) {
  const level = Math.min(Math.max(block.level ?? 2, 2), 4);
  const tag   = `h${level}`;
  const cls   = level === 2 ? 'lesson-h2' : level === 3 ? 'lesson-h3' : 'lesson-h4';
  return `<${tag} class="${cls}">${inline(block.text)}</${tag}>`;
}

function renderParagraph(block) {
  return `<p class="lesson-p">${inline(block.text)}</p>`;
}

function renderList(block) {
  const ordered = block.ordered ?? false;
  const tag     = ordered ? 'ol' : 'ul';
  const items   = (block.items ?? [])
    .map(item => `<li class="lesson-li">${inline(item)}</li>`)
    .join('');
  return `<${tag} class="lesson-list ${ordered ? 'lesson-ol' : 'lesson-ul'}">${items}</${tag}>`;
}

function renderCallout(block) {
  // variant: tip | trap | note | info
  const variant = block.variant ?? 'note';
  const icons   = { tip: '💡', trap: '⚠️', note: '📌', info: 'ℹ️' };
  const labels  = { tip: 'TIP', trap: 'COMMON TRAP', note: 'NOTE', info: 'INFO' };
  const icon    = icons[variant]  ?? '📌';
  const label   = labels[variant] ?? 'NOTE';
  const body    = (block.items ?? [block.text ?? ''])
    .map(t => `<p class="callout-line">${inline(t)}</p>`)
    .join('');
  return `
    <div class="callout callout-${variant}">
      <div class="callout-header">
        <span class="callout-icon">${icon}</span>
        <span class="callout-label">${label}</span>
      </div>
      <div class="callout-body">${body}</div>
    </div>`;
}

function renderTable(block) {
  const headers = (block.headers ?? [])
    .map(h => `<th class="lesson-th">${inline(h)}</th>`)
    .join('');
  const rows = (block.rows ?? [])
    .map(row => {
      const cells = (row ?? [])
        .map(c => `<td class="lesson-td">${inline(c)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `
    <div class="lesson-table-wrap">
      <table class="lesson-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderChecklist(block) {
  const items = (block.items ?? [])
    .map((item, i) => {
      const id = `cl-${Math.random().toString(36).slice(2)}-${i}`;
      return `
        <li class="checklist-item">
          <label class="checklist-label">
            <input type="checkbox" class="checklist-cb" id="${id}" />
            <span class="checklist-box"></span>
            <span class="checklist-text">${inline(item)}</span>
          </label>
        </li>`;
    })
    .join('');
  return `
    <ul class="lesson-checklist" aria-label="${esc(block.title ?? 'Checklist')}">
      ${block.title ? `<div class="checklist-title">${inline(block.title)}</div>` : ''}
      ${items}
    </ul>`;
}

function renderHook(block) {
  return `
    <div class="lesson-hook">
      <div class="hook-eyebrow">WHY THIS MATTERS</div>
      <div class="hook-text">${inline(block.text)}</div>
      ${block.stat ? `<div class="hook-stat">${inline(block.stat)}</div>` : ''}
    </div>`;
}

function renderRealWorldScenario(block) {
  const steps = (block.steps ?? [])
    .map(s => `<li class="scenario-step">${inline(s)}</li>`)
    .join('');
  return `
    <div class="lesson-scenario">
      <div class="scenario-eyebrow">REAL-WORLD SCENARIO</div>
      <div class="scenario-title">${inline(block.title ?? '')}</div>
      <p class="scenario-context">${inline(block.context ?? '')}</p>
      ${steps ? `<ol class="scenario-steps">${steps}</ol>` : ''}
      ${block.outcome ? `<div class="scenario-outcome"><span class="outcome-label">Outcome:</span> ${inline(block.outcome)}</div>` : ''}
    </div>`;
}

function renderExamFocus(block) {
  const points = (block.points ?? [])
    .map(p => `<li class="examfocus-point">${inline(p)}</li>`)
    .join('');
  return `
    <div class="lesson-examfocus">
      <div class="examfocus-header">
        <span class="examfocus-icon">🎯</span>
        <span class="examfocus-title">EXAM FOCUS</span>
      </div>
      <ul class="examfocus-list">${points}</ul>
    </div>`;
}

function renderMistakes(block) {
  const items = (block.items ?? [])
    .map(item => `
      <div class="mistake-item">
        <div class="mistake-wrong">✗ ${inline(item.wrong ?? '')}</div>
        <div class="mistake-right">✓ ${inline(item.right ?? '')}</div>
      </div>`)
    .join('');
  return `
    <div class="lesson-mistakes">
      <div class="mistakes-header">Common Mistakes to Avoid</div>
      <div class="mistakes-body">${items}</div>
    </div>`;
}

function renderDiagram(block) {
  // block.svg must be an inline SVG string (trusted authored content)
  // block.caption is escaped
  return `
    <div class="lesson-diagram">
      ${block.caption ? `<div class="diagram-caption">${esc(block.caption)}</div>` : ''}
      <div class="diagram-svg-wrap" role="img" aria-label="${esc(block.caption ?? 'Diagram')}">
        ${block.svg ?? ''}
      </div>
    </div>`;
}

function renderDivider() {
  return `<hr class="lesson-divider" />`;
}

// ── MAIN RENDERER ────────────────────────────────────────────────

const RENDERERS = {
  heading:           renderHeading,
  paragraph:         renderParagraph,
  list:              renderList,
  callout:           renderCallout,
  table:             renderTable,
  checklist:         renderChecklist,
  hook:              renderHook,
  realWorldScenario: renderRealWorldScenario,
  examFocus:         renderExamFocus,
  mistakes:          renderMistakes,
  diagram:           renderDiagram,
  divider:           renderDivider,
};

/**
 * Render an array of blocks → HTML string.
 * Unknown block types are skipped with a console warning.
 */
export function renderBlocks(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map(block => {
      const renderer = RENDERERS[block.type];
      if (!renderer) {
        console.warn(`[contentRenderer] unknown block type: "${block.type}"`);
        return '';
      }
      return renderer(block);
    })
    .join('\n');
}

/**
 * Render a complete lesson object → structured HTML string.
 * Handles the top-level special sections then the blocks array.
 */
export function renderLesson(lesson) {
  const parts = [];

  // 1. Hook
  if (lesson.hook) {
    parts.push(renderHook({ type: 'hook', ...lesson.hook }));
  }

  // 2. Real-world scenario
  if (lesson.realWorldScenario) {
    parts.push(renderRealWorldScenario({ type: 'realWorldScenario', ...lesson.realWorldScenario }));
  }

  // 3. Exam focus
  if (lesson.examFocus) {
    parts.push(renderExamFocus({ type: 'examFocus', ...lesson.examFocus }));
  }

  // 4. Diagram
  if (lesson.diagram) {
    parts.push(renderDiagram({ type: 'diagram', ...lesson.diagram }));
  }

  // 5. Mistakes
  if (lesson.mistakes) {
    parts.push(renderMistakes({ type: 'mistakes', ...lesson.mistakes }));
  }

  // 6. Main content blocks
  if (Array.isArray(lesson.blocks)) {
    parts.push(`<div class="lesson-content-blocks">`);
    parts.push(renderBlocks(lesson.blocks));
    parts.push(`</div>`);
  }

  return parts.join('\n');
}
