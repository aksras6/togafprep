import { getData } from '../data.js';

export async function Glossary() {
  const terms  = await getData('glossary');
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term));

  function renderTerm(t) {
    const tags = (t.tags ?? []).map(tag => `<span class="tag">${tag}</span>`).join('');
    const partColor = t.part === 1 ? 'var(--part1-color)' : t.part === 2 ? 'var(--part2-color)' : 'var(--part2-color)';
    const partLabel = t.part === 'both' ? 'P1+P2' : `P${t.part}`;
    return `
      <div class="glossary-item" data-search="${(t.term + ' ' + t.definition + ' ' + (t.tags||[]).join(' ')).toLowerCase()}">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
          <div class="glossary-term">${t.term}</div>
          <span class="badge" style="border-color:${partColor};color:${partColor};font-size:.6rem;">${partLabel}</span>
        </div>
        <div class="glossary-def">${t.definition}</div>
        ${t.adm_phases?.length ? `<div style="margin-top:6px;font-size:.72rem;color:var(--text-muted);"><span class="text-mono">ADM:</span> ${t.adm_phases.join(', ')}</div>` : ''}
        ${tags ? `<div class="glossary-tags">${tags}</div>` : ''}
      </div>`;
  }

  return `
    <div class="page-header">
      <h1 class="page-title">Glossary</h1>
      <p class="page-subtitle">${terms.length} TOGAF terms — searchable reference.</p>
    </div>
    <div class="glossary-search-wrap">
      <span class="glossary-search-icon">⌕</span>
      <input type="search" id="glossary-search" class="glossary-search"
        placeholder="Search terms, definitions, tags…" autocomplete="off" />
    </div>
    <div class="glossary-count" id="glossary-count">${sorted.length} terms</div>
    <div class="glossary-list" id="glossary-list">
      ${sorted.map(renderTerm).join('')}
    </div>
    <script>
      (function() {
        var input   = document.getElementById('glossary-search');
        var counter = document.getElementById('glossary-count');
        var items   = document.querySelectorAll('#glossary-list .glossary-item');
        var total   = items.length;
        input.addEventListener('input', function() {
          var q = input.value.trim().toLowerCase();
          var visible = 0;
          items.forEach(function(item) {
            var show = !q || item.dataset.search.includes(q);
            item.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          counter.textContent = q ? (visible + ' of ' + total + ' terms') : (total + ' terms');
        });
        input.focus();
      })();
    <\/script>`;
}
