import { getData } from '../data.js';
import { examHistory } from '../store.js';

/* ── utilities ───────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function scoreColor(pts, max) {
  if (pts === max) return 'var(--success)';
  if (pts >= max * 0.5) return 'var(--warning)';
  return 'var(--danger)';
}

/* ── shared state ────────────────────────────────────────── */
let _allScenarios = [];
let _p2State = null;
let _p2Timer = null;

/* ═══════════════════════ DRILL MODE ═══════════════════════ */

window._p2StartDrill = function (mode) {
  // mode: 'sequential' | 'random' | single scenario id
  let pool;
  if (mode === 'random') pool = shuffle(_allScenarios);
  else pool = [..._allScenarios];

  _p2State = {
    type: 'drill',
    pool,
    idx: 0,
    selected: null,
    revealed: false,
    results: [],
  };
  document.getElementById('p2-launcher').style.display = 'none';
  document.getElementById('p2-runner').style.display = 'block';
  _renderDrillScenario();
};

window._p2JumpTo = function (scenarioId) {
  const s = _allScenarios.find(x => x.id === scenarioId);
  if (!s) return;
  _p2State = { type: 'drill', pool: [s], idx: 0, selected: null, revealed: false, results: [] };
  document.getElementById('p2-launcher').style.display = 'none';
  document.getElementById('p2-runner').style.display = 'block';
  _renderDrillScenario();
};

function _renderDrillScenario() {
  const s = _p2State.pool[_p2State.idx];
  _p2State.selected = null;
  _p2State.revealed = false;

  const optsHtml = shuffle(s.options).map(o => `
    <div class="p2-opt" data-letter="${o.letter}" onclick="window._p2Select('${o.letter}')">
      <span class="p2-opt-letter">${o.letter}</span>
      <span class="p2-opt-text">${esc(o.action)}</span>
    </div>`).join('');

  document.getElementById('p2-runner').innerHTML = `
    <div class="p2-progress">
      <button class="p2-exit-btn" onclick="window._p2ExitConfirm()">← Exit to Menu</button>
      <span class="p2-prog-txt">Scenario ${_p2State.idx + 1} / ${_p2State.pool.length}</span>
      <span class="p2-prog-lesson">${esc(s.lessonTitle)}</span>
    </div>
    <div class="p2-scenario-card">
      <div class="p2-scenario-text">${esc(s.scenario)}</div>
      <div class="p2-options">${optsHtml}</div>
      <div id="p2-rationale"></div>
      <div class="p2-actions">
        <button class="p2-btn" onclick="window._p2SkipDrill()">Skip</button>
        <button class="p2-btn p2-btn-primary" id="p2-next-btn" onclick="window._p2NextDrill()" style="display:none">Next →</button>
      </div>
    </div>`;
}

window._p2Select = function (letter) {
  if (_p2State.revealed) return;
  _p2State.selected = letter;
  _p2State.revealed = true;

  const s = _p2State.pool[_p2State.idx];
  const chosen = s.options.find(o => o.letter === letter);
  _p2State.results.push({ scenarioId: s.id, letter, points: chosen.points, maxScore: s.maxScore });

  document.querySelectorAll('.p2-opt').forEach(el => {
    el.classList.add('disabled');
    const opt = s.options.find(o => o.letter === el.dataset.letter);
    const pct = opt.points / s.maxScore;
    el.style.borderColor = pct === 1 ? 'var(--success)' : pct >= 0.5 ? 'var(--warning)' : 'var(--danger)';
    if (el.dataset.letter === letter) el.classList.add('selected');
  });

  const ratHtml = `
    <div class="p2-rationale-box">
      <div class="p2-rat-header" style="color:${scoreColor(chosen.points, s.maxScore)}">
        Your answer (${letter}) scored ${chosen.points}/${s.maxScore} points
      </div>
      <div class="p2-rat-all">
        ${s.options.slice().sort((a,b) => b.points - a.points).map(o => `
          <div class="p2-rat-row ${o.letter === letter ? 'p2-rat-yours' : ''}">
            <span class="p2-rat-score" style="color:${scoreColor(o.points, s.maxScore)}">${o.letter} — ${o.points}pt${o.points===1?'':'s'}</span>
            <span class="p2-rat-text">${esc(o.action)} <span class="p2-rat-verdict">${esc(o.rationale)}</span>${o.letter === letter ? ' <em>(your choice)</em>' : ''}</span>
          </div>`).join('')}
      </div>
      <div class="p2-source-tag">${s.tier === 'source' ? 'Source-based · ' + esc(s.sourceRef) : 'TOGAF-reasoning'} · ${esc(s.lessonTitle)}</div>
    </div>`;
  document.getElementById('p2-rationale').innerHTML = ratHtml;

  const nb = document.getElementById('p2-next-btn');
  nb.style.display = 'inline-block';
  nb.textContent = _p2State.idx + 1 >= _p2State.pool.length ? 'Finish' : 'Next →';
};

window._p2SkipDrill = function () {
  const s = _p2State.pool[_p2State.idx];
  _p2State.results.push({ scenarioId: s.id, letter: null, points: 0, maxScore: s.maxScore, skipped: true });
  _p2State.idx++;
  if (_p2State.idx >= _p2State.pool.length) _renderDrillSummary();
  else _renderDrillScenario();
};

window._p2NextDrill = function () {
  if (!_p2State.revealed) return;
  _p2State.idx++;
  if (_p2State.idx >= _p2State.pool.length) _renderDrillSummary();
  else _renderDrillScenario();
};

function _renderDrillSummary() {
  const results = _p2State.results;
  const totalPts = results.reduce((sum, r) => sum + r.points, 0);
  const maxPts   = results.reduce((sum, r) => sum + r.maxScore, 0);
  const pct = maxPts ? Math.round(totalPts / maxPts * 100) : 0;
  const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

  const rows = results.map(r => {
    const s = _allScenarios.find(x => x.id === r.scenarioId);
    return `<div class="p2-hist-row">
      <span class="p2-hist-lesson">${esc(s.lessonTitle)}</span>
      <span style="color:${scoreColor(r.points, r.maxScore)}">${r.skipped ? 'Skipped' : r.points + '/' + r.maxScore}</span>
    </div>`;
  }).join('');

  document.getElementById('p2-runner').innerHTML = `
    <div class="p2-summary">
      <div class="p2-sum-score" style="color:${color}">${pct}%</div>
      <div class="p2-sum-sub">${totalPts}/${maxPts} points across ${results.length} scenario${results.length===1?'':'s'}</div>
      <div class="p2-hist-list">${rows}</div>
      <div class="p2-sum-actions">
        <button class="p2-btn p2-btn-primary" onclick="window._p2Restart()">Back to Practice Menu</button>
      </div>
    </div>`;
}

/* ═══════════════════════ MOCK EXAM MODE ═══════════════════════ */

window._p2StartMock = function () {
  const pool = shuffle(_allScenarios).slice(0, 8);
  _p2State = {
    type: 'mock',
    pool,
    idx: 0,
    selected: null,
    revealed: false,
    results: [],
    startTime: Date.now(),
  };
  document.getElementById('p2-launcher').style.display = 'none';
  document.getElementById('p2-runner').style.display = 'block';
  _startMockTimer(90 * 60);
  _renderMockScenario();
};

function _startMockTimer(seconds) {
  let remaining = seconds;
  clearInterval(_p2Timer);
  _p2Timer = setInterval(() => {
    remaining--;
    const el = document.getElementById('p2-mock-timer');
    if (!el) { clearInterval(_p2Timer); return; }
    const m = Math.floor(remaining / 60), s = remaining % 60;
    el.textContent = `${m}:${String(s).padStart(2,'0')}`;
    if (remaining <= 600) el.classList.add('p2-timer-warn');
    if (remaining <= 120) el.classList.add('p2-timer-danger');
    if (remaining <= 0) { clearInterval(_p2Timer); _finishMock(); }
  }, 1000);
}

function _renderMockScenario() {
  const s = _p2State.pool[_p2State.idx];
  _p2State.selected = null;

  const optsHtml = shuffle(s.options).map(o => `
    <div class="p2-opt" data-letter="${o.letter}" onclick="window._p2SelectMock('${o.letter}')">
      <span class="p2-opt-letter">${o.letter}</span>
      <span class="p2-opt-text">${esc(o.action)}</span>
    </div>`).join('');

  document.getElementById('p2-runner').innerHTML = `
    <div class="p2-mock-header">
      <button class="p2-exit-btn" onclick="window._p2ExitConfirm()">← Exit to Menu</button>
      <span class="p2-prog-txt">Scenario ${_p2State.idx + 1} / 8</span>
      <span id="p2-mock-timer" class="p2-mock-timer">90:00</span>
    </div>
    <div class="p2-scenario-card">
      <div class="p2-scenario-text">${esc(s.scenario)}</div>
      <div class="p2-options">${optsHtml}</div>
      <div class="p2-actions">
        <button class="p2-btn p2-btn-primary" id="p2-mock-next" onclick="window._p2NextMock()" disabled>
          ${_p2State.idx + 1 >= 8 ? 'Finish Exam' : 'Next Scenario →'}
        </button>
      </div>
    </div>`;
}

window._p2SelectMock = function (letter) {
  _p2State.selected = letter;
  document.querySelectorAll('.p2-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.letter === letter));
  document.getElementById('p2-mock-next').disabled = false;
};

window._p2NextMock = function () {
  const s = _p2State.pool[_p2State.idx];
  const chosen = s.options.find(o => o.letter === _p2State.selected);
  _p2State.results.push({ scenarioId: s.id, letter: _p2State.selected, points: chosen.points, maxScore: s.maxScore, lessonTitle: s.lessonTitle });
  _p2State.idx++;
  if (_p2State.idx >= 8) _finishMock();
  else _renderMockScenario();
};

function _finishMock() {
  clearInterval(_p2Timer);
  const results = _p2State.results;
  const totalPts = results.reduce((sum, r) => sum + r.points, 0);
  const maxPts   = results.reduce((sum, r) => sum + r.maxScore, 0);
  const pct = maxPts ? Math.round(totalPts / maxPts * 100) : 0;
  const duration = Math.round((Date.now() - _p2State.startTime) / 1000);
  const color = pct >= 60 ? 'var(--success)' : 'var(--danger)';

  // find weakest scenario (lowest % score)
  const withPct = results.map(r => ({ ...r, pct: r.points / r.maxScore }));
  const weakest = withPct.reduce((min, r) => r.pct < min.pct ? r : min, withPct[0]);

  try {
    examHistory.add({
      part: 2, score: totalPts, total: maxPts, passed: pct >= 60,
      timestamp: new Date().toISOString(), duration,
    });
  } catch (e) {}

  const rows = results.map(r => `
    <div class="p2-hist-row">
      <span class="p2-hist-lesson">${esc(r.lessonTitle)}${r.scenarioId === weakest.scenarioId ? ' <span class="p2-weak-tag">weakest</span>' : ''}</span>
      <span style="color:${scoreColor(r.points, r.maxScore)}">${r.points}/${r.maxScore}</span>
    </div>`).join('');

  document.getElementById('p2-runner').innerHTML = `
    <div class="p2-summary">
      <div class="p2-sum-score" style="color:${color}">${pct}%</div>
      <div class="p2-sum-sub">${totalPts}/${maxPts} points · ${Math.floor(duration/60)}m ${duration%60}s · ${pct >= 60 ? 'Above 60% overall threshold' : 'Below 60% overall threshold'}</div>
      <div class="p2-note-box">
        Note: the real OGEA-102 also requires a minimum score on <em>every</em> individual scenario, not just an overall average. Your source material confirms this requirement exists but does not state the exact per-scenario cutoff — so treat any single low-scoring scenario below as a real weak spot to revisit, not just a statistic.
      </div>
      <div class="p2-hist-list">${rows}</div>
      <div class="p2-sum-actions">
        <button class="p2-btn p2-btn-primary" onclick="window._p2Restart()">Back to Practice Menu</button>
      </div>
    </div>`;
}

window._p2ExitConfirm = function () {
  if (_p2State && _p2State.type === 'mock') {
    if (!confirm('Exit the mock exam? Your progress on this attempt will not be saved.')) return;
  }
  window._p2Restart();
};

window._p2Restart = function () {
  clearInterval(_p2Timer);
  _p2State = null;
  document.getElementById('p2-runner').style.display = 'none';
  document.getElementById('p2-runner').innerHTML = '';
  document.getElementById('p2-launcher').style.display = 'block';
};

/* ═══════════════════════ PAGE ENTRY ═══════════════════════ */

export async function Exams() {
  _allScenarios = await getData('scenarios_part2');
  const history = examHistory.get();

  const scenarioListHtml = _allScenarios.map(s => `
    <div class="p2-list-item" onclick="window._p2JumpTo('${s.id}')">
      <span class="p2-list-title">${esc(s.lessonTitle)}</span>
      <span class="p2-list-go">Drill this scenario →</span>
    </div>`).join('');

  return `
<div class="page-header">
  <h1 class="page-title">Exams</h1>
  <p class="page-subtitle">Full timed mock exams simulating the real TOGAF certification format.</p>
</div>

<div class="dashboard-grid" style="margin-bottom:28px;">
  <div class="card" style="border-top:3px solid var(--part1-color);">
    <div class="card-title" style="color:var(--part1-color);">Part 1 — Foundation</div>
    <div style="font-size:.85rem;color:var(--text-secondary);line-height:1.8;margin-bottom:16px;">
      Timed mock exam mode — coming in the Part 1 practice expansion.
    </div>
    <div class="placeholder-page" style="min-height:100px;border:1px dashed var(--border);border-radius:var(--radius-lg);">
      <div class="placeholder-icon" style="font-size:1.8rem;">◉</div>
      <p class="placeholder-text" style="font-size:.75rem;">Use the Practice page for Part 1 questions today.</p>
    </div>
  </div>
  <div class="card" style="border-top:3px solid var(--part2-color);">
    <div class="card-title" style="color:var(--part2-color);">Part 2 — Practitioner</div>
    <div style="font-size:.85rem;color:var(--text-secondary);line-height:1.8;margin-bottom:16px;">
      ${_allScenarios.length} scenarios · Gradient scored (0/1/3/5) · Overall pass: 60%
    </div>
    <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:12px;">
      Per-scenario minimum also required by the real exam — exact cutoff not published in source material.
    </div>
  </div>
</div>

<div class="card" id="p2-launcher">
  <div class="card-title">Part 2 Scenario Practice</div>
  <div class="p2-mode-grid">
    <div class="p2-mode-card">
      <div class="p2-mode-title">Drill — Sequential</div>
      <div class="p2-mode-desc">Work through all ${_allScenarios.length} scenarios in lesson order, one at a time, with full rationale after each.</div>
      <button class="btn-primary" onclick="window._p2StartDrill('sequential')">Start →</button>
    </div>
    <div class="p2-mode-card">
      <div class="p2-mode-title">Drill — Random</div>
      <div class="p2-mode-desc">Same as above, but scenarios are shuffled — better for testing recall rather than sequence memory.</div>
      <button class="btn-primary" onclick="window._p2StartDrill('random')">Start →</button>
    </div>
    <div class="p2-mode-card p2-mode-mock">
      <div class="p2-mode-title">Mock Exam</div>
      <div class="p2-mode-desc">8 random scenarios, 90-minute timer, no rationale shown until the end — matches the real OGEA-102 format from Lesson 27.</div>
      <button class="btn-primary" onclick="window._p2StartMock()">Start Mock Exam →</button>
    </div>
  </div>

  <div class="section-header" style="margin-top:24px;">
    <span class="section-title">Jump to a Specific Scenario</span>
    <div class="section-line"></div>
  </div>
  <div class="p2-list">${scenarioListHtml}</div>
</div>

<div id="p2-runner" style="display:none;"></div>

${history.length ? `
<div class="card" style="margin-top:20px;">
  <div class="card-title">Exam History</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
    ${history.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-elevated);border-radius:var(--radius);font-size:.82rem;">
        <span class="badge" style="border-color:var(--part${e.part}-color);color:var(--part${e.part}-color);">P${e.part}</span>
        <span class="text-mono">${e.score}/${e.total}</span>
        <span class="${e.passed ? 'text-success' : 'text-danger'}">${e.passed ? '✓ PASS' : '✗ FAIL'}</span>
        <span class="text-muted" style="margin-left:auto;">${new Date(e.timestamp).toLocaleDateString()}</span>
      </div>`).join('')}
  </div>
</div>` : ''}

<style>
.p2-mode-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:700px){.p2-mode-grid{grid-template-columns:1fr;}}
.p2-mode-card{padding:16px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-elevated);display:flex;flex-direction:column;gap:10px;}
.p2-mode-mock{border-color:var(--part2-color);}
.p2-mode-title{font-weight:bold;font-size:.92rem;color:var(--text-primary);}
.p2-mode-desc{font-size:.78rem;color:var(--text-secondary);line-height:1.5;flex:1;}
.p2-list{display:flex;flex-direction:column;gap:6px;margin-top:10px;}
.p2-list-item{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--bg-elevated);transition:var(--transition);font-size:.82rem;}
.p2-list-item:hover{border-color:var(--accent);background:var(--accent-glow);}
.p2-list-go{color:var(--accent);font-size:.75rem;font-family:var(--font-mono);}
.p2-progress{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:.8rem;}
.p2-prog-txt{font-family:var(--font-mono);color:var(--text-muted);}
.p2-prog-lesson{color:var(--text-secondary);}
.p2-mock-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;} .p2-exit-btn{padding:5px 12px;font-size:.74rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-muted);cursor:pointer;font-family:var(--font-mono);} .p2-exit-btn:hover{border-color:var(--danger);color:var(--danger);}
.p2-mock-timer{font-family:var(--font-mono);font-size:1.1rem;font-weight:bold;padding:6px 14px;border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);}
.p2-timer-warn{color:var(--warning);border-color:var(--warning);}
.p2-timer-danger{color:var(--danger);border-color:var(--danger);animation:p2blink .8s step-end infinite;}
@keyframes p2blink{50%{opacity:.4;}}
.p2-scenario-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px;}
.p2-scenario-text{font-size:.92rem;color:var(--text-primary);line-height:1.6;margin-bottom:18px;padding:14px;background:var(--bg-base);border-left:3px solid var(--part2-color);border-radius:var(--radius);}
.p2-options{display:flex;flex-direction:column;gap:8px;}
.p2-opt{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--bg-elevated);transition:var(--transition);}
.p2-opt:hover:not(.disabled){border-color:var(--part2-color);background:var(--accent-glow);}
.p2-opt.selected{border-color:var(--part2-color);background:var(--accent-glow);}
.p2-opt.disabled{cursor:default;}
.p2-opt-letter{font-family:var(--font-mono);font-weight:bold;color:var(--part2-color);flex-shrink:0;min-width:16px;}
.p2-opt-text{font-size:.85rem;color:var(--text-primary);line-height:1.45;}
.p2-actions{display:flex;gap:10px;margin-top:16px;justify-content:flex-end;}
.p2-btn{padding:8px 18px;border-radius:var(--radius);font-size:.83rem;cursor:pointer;font-family:var(--font-mono);border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-secondary);}
.p2-btn:disabled{opacity:.4;cursor:not-allowed;}
.p2-btn-primary{background:var(--part2-color);border-color:var(--part2-color);color:var(--bg-base);font-weight:bold;}
.p2-rationale-box{margin-top:16px;padding:16px;background:var(--bg-base);border:1px solid var(--border-subtle);border-radius:var(--radius);}
.p2-rat-header{font-size:.85rem;font-weight:bold;margin-bottom:12px;}
.p2-rat-all{display:flex;flex-direction:column;gap:8px;}
.p2-rat-row{display:flex;gap:10px;padding:8px 10px;border-radius:var(--radius);background:var(--bg-elevated);font-size:.8rem;}
.p2-rat-yours{border:1px solid var(--part2-color);}
.p2-rat-score{font-family:var(--font-mono);font-weight:bold;flex-shrink:0;min-width:60px;}
.p2-rat-text{color:var(--text-secondary);line-height:1.4;} .p2-rat-verdict{display:block;margin-top:4px;font-style:italic;color:var(--text-muted);}
.p2-source-tag{margin-top:10px;font-size:.7rem;color:var(--text-muted);font-family:var(--font-mono);}
.p2-summary{background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;text-align:center;}
.p2-sum-score{font-size:3rem;font-weight:bold;font-family:var(--font-mono);}
.p2-sum-sub{font-size:.85rem;color:var(--text-muted);margin:6px 0 18px;}
.p2-note-box{font-size:.78rem;color:var(--text-secondary);background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:12px 16px;text-align:left;margin-bottom:18px;line-height:1.5;}
.p2-hist-list{display:flex;flex-direction:column;gap:6px;text-align:left;margin-bottom:20px;}
.p2-hist-row{display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg-elevated);border-radius:var(--radius);font-size:.82rem;}
.p2-hist-lesson{color:var(--text-secondary);}
.p2-weak-tag{font-size:.68rem;color:var(--danger);border:1px solid var(--danger);padding:1px 6px;border-radius:99px;margin-left:6px;}
.p2-sum-actions{display:flex;justify-content:center;}
</style>`;
}
