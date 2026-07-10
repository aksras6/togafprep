import { getData } from '../data.js';
import { progress } from '../store.js';

export async function Modules() {
  const modules = await getData('modules');
  const prog    = progress.get();

  const part1 = modules.filter(m => m.part === 1).sort((a, b) => a.order - b.order);
  const part2 = modules.filter(m => m.part === 2).sort((a, b) => a.order - b.order);

  function renderModule(m) {
    const pct    = prog.modules[m.id]?.percentComplete ?? 0;
    const status = prog.modules[m.id]?.status ?? 'new';
    const isP2   = m.part === 2;
    const badge  = status === 'complete'
      ? '<span class="badge badge-complete">✓ complete</span>'
      : status === 'in_progress'
      ? '<span class="badge badge-progress">in progress</span>'
      : '<span class="badge badge-new">new</span>';

    return `
      <a href="#/modules/${m.id}" class="module-card">
        <div class="module-num ${isP2 ? 'part2' : 'part1'}">L${String(m.order).padStart(2,'0')}</div>
        <div class="module-info">
          <div class="module-title">${m.title}</div>
          <div class="module-desc">${m.description ?? ''}</div>
          <div class="progress-bar-wrap" style="margin-top:6px;max-width:280px;">
            <div class="progress-bar-fill ${isP2 ? 'purple' : ''}" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="module-meta">
          <span class="module-time">${m.estimatedMinutes ?? 30} min</span>
          ${badge}
        </div>
      </a>`;
  }

  return `
    <div class="page-header">
      <h1 class="page-title">Modules</h1>
      <p class="page-subtitle">${modules.length} lessons · TOGAF Mastery Programme (source-verified)</p>
    </div>

    <div class="section-header">
      <span class="section-title" style="color:var(--part1-color);">Part 1 — Foundation</span>
      <div class="section-line"></div>
      <span class="text-xs text-mono text-muted">${part1.length} lessons</span>
    </div>

    <div class="module-list">${part1.map(renderModule).join('')}</div>

    ${part2.length ? `
      <div class="section-header" style="margin-top:32px;">
        <span class="section-title" style="color:var(--part2-color);">Part 2 — Practitioner</span>
        <div class="section-line"></div>
        <span class="text-xs text-mono text-muted">${part2.length} lessons</span>
      </div>
      <div class="module-list">${part2.map(renderModule).join('')}</div>
    ` : ''}`;
}
