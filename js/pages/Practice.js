import { getData } from '../data.js';
import { quizHistory } from '../store.js';

/* ─── utilities ─────────────────────────────────────────── */
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
function diffBadge(d) {
  const n = Number(d);
  if (n <= 1) return ['diff-1', 'Intro'];
  if (n === 2) return ['diff-2', 'Easy'];
  if (n === 3) return ['diff-3', 'Medium'];
  if (n === 4) return ['diff-4', 'Hard'];
  return ['diff-5', 'Expert'];
}

/* ─── shared state ──────────────────────────────────────── */
let _allQ = [];
let _state = null;
let _timerInt = null;

function getPool() {
  const c = window._pqCfg || { count: 10, domain: '', diff: '', mode: 'practice' };
  let pool = _allQ.slice();
  if (c.domain) pool = pool.filter(q => q.domainTag === c.domain);
  if (c.diff)   pool = pool.filter(q => String(q.difficulty) === String(c.diff));
  if (c.mode === 'weak') {
    try {
      const hist = JSON.parse(localStorage.getItem('togaf_quiz_history') || '[]');
      const wrong = {};
      hist.flatMap(s => s.answers || []).filter(a => !a.correct)
          .forEach(a => (a.tags || []).forEach(t => { wrong[t] = (wrong[t] || 0) + 1; }));
      const weakTags = Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
      if (weakTags.length) pool = pool.filter(q => (q.tags || []).some(t => weakTags.includes(t)));
    } catch (_) {}
  }
  return shuffle(pool);
}

function updateCount() {
  const el = document.getElementById('pq-pool-count');
  if (!el) return;
  const pool = getPool();
  const c = window._pqCfg || {};
  const ask = c.count === 'all' ? pool.length : Math.min(Number(c.count) || 10, pool.length);
  el.textContent = pool.length + ' questions match · ' + ask + ' will be asked';
}

/* ─── quiz engine (attached to window so inline onclick works) ─ */
window._pqCfg = { count: 10, domain: '', diff: '', mode: 'practice' };

window._pqStart = function () {
  const pool = getPool();
  if (!pool.length) { alert('No questions match your filters — try different settings.'); return; }
  const c = window._pqCfg;
  const ask = c.count === 'all' ? pool.length : Math.min(Number(c.count) || 10, pool.length);
  _state = {
    pool: pool.slice(0, ask),
    idx: 0, answers: [],
    revealed: false, selectedKey: null,
    timed: c.mode === 'timed',
    start: Date.now(), qStart: Date.now(),
  };
  document.getElementById('pq-launcher').style.display = 'none';
  document.getElementById('pq-runner').style.display = 'block';
  _renderQ();
};

window._pqSelect = function (key) {
  if (!_state || _state.revealed) return;
  _state.selectedKey = key;
  document.querySelectorAll('.pq-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.key === key));
  const rb = document.getElementById('pq-reveal-btn');
  if (rb) rb.style.display = 'inline-block';
};

window._pqReveal = function () {
  if (!_state || _state.revealed) return;
  clearInterval(_timerInt);
  _state.revealed = true;
  const q = _state.pool[_state.idx];
  const chosen = _state.selectedKey;
  const ok = chosen === q.correctKey;
  _state.answers.push({
    questionId: q.id, chosen, correct: ok,
    correctKey: q.correctKey, tags: q.tags || [],
    timeSpent: Math.round((Date.now() - _state.qStart) / 1000),
  });
  document.querySelectorAll('.pq-opt').forEach(el => {
    el.classList.add('disabled');
    if (el.dataset.key === q.correctKey) el.classList.add('correct');
    else if (el.dataset.key === chosen) el.classList.add('wrong');
  });
  const exp = q.explanation || {};
  const ra = document.getElementById('pq-rat');
  if (ra) ra.innerHTML = `
<div class="pq-rationale ${ok ? 'pq-rat-correct' : 'pq-rat-wrong'}">
  <div class="pq-rat-verdict" style="color:${ok ? 'var(--success)' : 'var(--danger)'}">
    ${ok ? '✓ Correct' : `✗ Incorrect — correct answer: ${esc(q.correctKey)}`}
  </div>
  ${exp.whyCorrect ? `<div class="pq-rat-sec"><div class="pq-rat-lbl">Why correct</div><div class="pq-rat-body">${esc(exp.whyCorrect)}</div></div>` : ''}
  ${exp.whyOthersWrong ? `<div class="pq-rat-sec"><div class="pq-rat-lbl">Why others are wrong</div><div class="pq-rat-body">${esc(exp.whyOthersWrong)}</div></div>` : (q.rationale ? `<div class="pq-rat-sec"><div class="pq-rat-lbl">Rationale</div><div class="pq-rat-body">${esc(q.rationale)}</div></div>` : '')}
  ${exp.examTip ? `<div class="pq-rat-tip"><div class="pq-rat-lbl">💡 Exam Tip</div><div class="pq-rat-body">${esc(exp.examTip)}</div></div>` : ''}
</div>`;
  const rb = document.getElementById('pq-reveal-btn');
  const nb = document.getElementById('pq-next-btn');
  if (rb) rb.style.display = 'none';
  if (nb) { nb.style.display = 'inline-block'; nb.textContent = _state.idx + 1 >= _state.pool.length ? 'Finish' : 'Next →'; }
};

window._pqSkip = function () {
  if (!_state) return;
  clearInterval(_timerInt);
  if (!_state.revealed) {
    const q = _state.pool[_state.idx];
    _state.answers.push({ questionId: q.id, chosen: null, correct: false, correctKey: q.correctKey, tags: q.tags || [], timeSpent: 0, skipped: true });
  }
  _state.idx++;
  _state.idx >= _state.pool.length ? _renderSummary() : _renderQ();
};

window._pqNext = function () {
  if (!_state) return;
  clearInterval(_timerInt);
  if (!_state.revealed) { window._pqReveal(); return; }
  _state.idx++;
  _state.idx >= _state.pool.length ? _renderSummary() : _renderQ();
};

window._pqRestart = function () {
  clearInterval(_timerInt);
  _state = null;
  document.getElementById('pq-runner').style.display = 'none';
  document.getElementById('pq-runner').innerHTML = '';
  document.getElementById('pq-launcher').style.display = 'block';
  updateCount();
};

window._pqRetryWrong = function () {
  if (!_state) return;
  const wrongIds = new Set(_state.answers.filter(a => !a.correct).map(a => a.questionId));
  const wrongPool = _state.pool.filter(q => wrongIds.has(q.id));
  if (!wrongPool.length) { alert('No wrong answers to retry!'); return; }
  _state = { pool: shuffle(wrongPool), idx: 0, answers: [], revealed: false, selectedKey: null, timed: _state.timed, start: Date.now(), qStart: Date.now() };
  _renderQ();
};

function _startTimer(sec) {
  let rem = sec;
  const el = document.getElementById('pq-timer');
  if (!el) return;
  el.textContent = rem;
  _timerInt = setInterval(() => {
    rem--;
    const t = document.getElementById('pq-timer');
    if (!t) { clearInterval(_timerInt); return; }
    t.textContent = rem;
    t.className = 'pq-timer' + (rem <= 10 ? ' pq-t-danger' : rem <= 20 ? ' pq-t-warn' : '');
    if (rem <= 0) { clearInterval(_timerInt); if (_state && !_state.revealed) window._pqReveal(); }
  }, 1000);
}

function _renderQ() {
  clearInterval(_timerInt);
  _state.revealed = false;
  _state.selectedKey = null;
  _state.qStart = Date.now();
  const q = _state.pool[_state.idx];
  const pct = Math.round((_state.idx / _state.pool.length) * 100);
  const [dcls, dlbl] = diffBadge(q.difficulty);
  document.getElementById('pq-runner').innerHTML = `
<div class="pq-progress">
  <div class="pq-prog-bar"><div class="pq-prog-fill" style="width:${pct}%"></div></div>
  <span class="pq-prog-txt">${_state.idx + 1} / ${_state.pool.length}</span>
</div>
<div class="pq-q-card">
  <div class="pq-q-hd">
    <div class="pq-q-meta">
      <span class="pq-q-num">Q${_state.idx + 1}</span>
      ${q.domainTag ? `<span class="pq-q-domain">${esc(q.domainTag)}</span>` : ''}
      <span class="pq-diff-badge ${dcls}">${dlbl}</span>
    </div>
    ${_state.timed ? `<div class="pq-timer" id="pq-timer">60</div>` : ''}
  </div>
  <div class="pq-stem">${esc(q.stem)}</div>
  <div class="pq-options" id="pq-opts">
    ${q.options.map(o => `
    <div class="pq-opt" data-key="${o.key}" onclick="window._pqSelect('${o.key}')">
      <span class="pq-opt-key">${o.key}.</span>
      <span class="pq-opt-text">${esc(o.text)}</span>
    </div>`).join('')}
  </div>
  <div id="pq-rat"></div>
  <div class="pq-actions">
    <button class="pq-btn" onclick="window._pqSkip()">Skip</button>
    <button class="pq-btn pq-btn-primary" id="pq-reveal-btn" onclick="window._pqReveal()" style="display:none">Show Answer</button>
    <button class="pq-btn pq-btn-primary" id="pq-next-btn" onclick="window._pqNext()" style="display:none">Next →</button>
  </div>
</div>`;
  if (_state.timed) _startTimer(60);
}

function _renderSummary() {
  clearInterval(_timerInt);
  const ans = _state.answers;
  const correct = ans.filter(a => a.correct).length;
  const total = ans.length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const dur = Math.round((Date.now() - _state.start) / 1000);
  const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
  /* save session */
  try {
    const hist = JSON.parse(localStorage.getItem('togaf_quiz_history') || '[]');
    hist.unshift({ sessionId: 'sess-' + Date.now(), timestamp: new Date().toISOString(), config: window._pqCfg, answers: ans, score: pct, duration: dur });
    localStorage.setItem('togaf_quiz_history', JSON.stringify(hist.slice(0, 100)));
  } catch (_) {}
  /* streak */
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let sk = JSON.parse(localStorage.getItem('togaf_streak') || '{}');
    if (sk.lastActivityDate !== today) {
      const cont = sk.lastActivityDate === yest;
      const ns = cont ? (sk.currentStreak || 0) + 1 : 1;
      sk = { currentStreak: ns, longestStreak: Math.max(sk.longestStreak || 0, ns), lastActivityDate: today, totalStudyDays: (sk.totalStudyDays || 0) + 1 };
      localStorage.setItem('togaf_streak', JSON.stringify(sk));
    }
  } catch (_) {}
  const items = [...ans.filter(a => !a.correct), ...ans.filter(a => a.correct)].map(a => {
    const q = _state.pool.find(x => x.id === a.questionId);
    if (!q) return '';
    const stem = q.stem.length > 100 ? q.stem.slice(0, 100) + '…' : q.stem;
    return `<div class="pq-rev-item ${a.correct ? 'pq-rev-pass' : 'pq-rev-fail'}">
      <span class="pq-rev-icon">${a.correct ? '✓' : (a.skipped ? '—' : '✗')}</span>
      <div>
        <div class="pq-rev-q">${esc(stem)}</div>
        <div class="pq-rev-ans">${a.skipped ? 'Skipped' : `You: ${esc(a.chosen || '—')} · Correct: ${esc(a.correctKey)}`}</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('pq-runner').innerHTML = `
<div class="pq-summary">
  <div class="pq-sum-hd">
    <div class="pq-sum-score" style="color:${color}">${pct}%</div>
    <div class="pq-sum-sub">${correct} of ${total} correct · ${Math.floor(dur / 60)}m ${dur % 60}s</div>
    <div style="margin-top:8px;font-size:1.1rem">${pct >= 70 ? '🎯 Great work!' : pct >= 50 ? '📚 Keep studying!' : '💪 Review and retry!'}</div>
  </div>
  <div class="pq-sum-stats">
    <div class="pq-sum-stat"><div class="pq-sum-val" style="color:var(--success)">${correct}</div><div class="pq-sum-lbl">Correct</div></div>
    <div class="pq-sum-stat"><div class="pq-sum-val" style="color:var(--danger)">${total - correct}</div><div class="pq-sum-lbl">Wrong</div></div>
    <div class="pq-sum-stat"><div class="pq-sum-val">${Math.floor(dur / 60)}m ${dur % 60}s</div><div class="pq-sum-lbl">Time</div></div>
  </div>
  <div class="pq-rev-list">${items}</div>
  <div class="pq-sum-actions">
    <button class="pq-btn pq-btn-primary" onclick="window._pqRestart()">New Quiz</button>
    <button class="pq-btn" onclick="window._pqRetryWrong()">Retry Wrong Only</button>
  </div>
</div>`;
}

/* ─── page render ────────────────────────────────────────── */
export async function Practice() {
  _allQ = await getData('questions_part1');
  const history = quizHistory.get();
  const allAns  = history.flatMap(s => s.answers ?? []);
  const accuracy = allAns.length ? Math.round(allAns.filter(a => a.correct).length / allAns.length * 100) : 0;
  const domains = [...new Set(_allQ.map(q => q.domainTag).filter(Boolean))].sort();

  /* weak areas */
  const tagWrong = {};
  allAns.filter(a => !a.correct).forEach(a => (a.tags || []).forEach(t => { tagWrong[t] = (tagWrong[t] || 0) + 1; }));
  const weakTop = Object.entries(tagWrong).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const weakHtml = weakTop.length ? `
<div class="pq-weak">
  <div class="pq-weak-lbl">⚠ Weak Areas (from incorrect answers)</div>
  <div class="pq-weak-tags">${weakTop.map(([t, n]) => `<span class="pq-weak-tag">${esc(t)} <span class="pq-wc">${n}✗</span></span>`).join('')}</div>
</div>` : '';

  const historyHtml = history.length ? `
<div class="card" style="margin-top:20px;">
  <div class="card-title">Recent Sessions</div>
  ${history.slice(0, 5).map(s => {
    const c = (s.answers || []).filter(a => a.correct).length;
    const t = (s.answers || []).length;
    const p = t ? Math.round(c / t * 100) : 0;
    const col = p >= 70 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)';
    return `<div class="pq-hist-row">
      <span class="pq-hist-date">${new Date(s.timestamp).toLocaleDateString()}</span>
      <span class="pq-hist-domain">${esc(s.config?.domainTag || 'All Domains')}</span>
      <span class="pq-hist-score" style="color:${col}">${c}/${t} — ${p}%</span>
    </div>`;
  }).join('')}
</div>` : '';

  /* reset config chip state */
  window._pqCfg = { count: 10, domain: '', diff: '', mode: 'practice' };

  const html = `
<div class="page-header">
  <h1 class="page-title">Practice</h1>
  <p class="page-subtitle">Sharpen your knowledge with targeted question drills.</p>
</div>

<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card accent-blue">
    <div class="stat-label">Questions in Bank</div>
    <div class="stat-value blue">${_allQ.length}</div>
    <div class="stat-sub">Part 1 Foundation</div>
  </div>
  <div class="stat-card accent-green">
    <div class="stat-label">Overall Accuracy</div>
    <div class="stat-value green">${accuracy}<small style="font-size:1rem">%</small></div>
    <div class="stat-sub">${allAns.length} answered</div>
  </div>
  <div class="stat-card accent-orange">
    <div class="stat-label">Sessions</div>
    <div class="stat-value orange">${history.length}</div>
    <div class="stat-sub">quiz sessions</div>
  </div>
</div>

<div class="card" id="pq-launcher">
  <div class="card-title">Quiz Engine</div>
  <div class="pq-cfg-grid">
    <div class="pq-cfg-item">
      <div class="pq-lbl">Questions per session</div>
      <div class="pq-chips" id="pq-count-row">
        ${[5, 10, 20, 40].map(n => `<button class="pq-chip${n === 10 ? ' active' : ''}" data-count="${n}" onclick="window._pqSetCount(${n})">${n}</button>`).join('')}
        <button class="pq-chip" data-count="all" onclick="window._pqSetCount('all')">All (${_allQ.length})</button>
      </div>
    </div>
    <div class="pq-cfg-item">
      <div class="pq-lbl">Domain filter</div>
      <select class="pq-select" onchange="window._pqSetDomain(this.value)">
        <option value="">All Domains</option>
        ${domains.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
      </select>
    </div>
    <div class="pq-cfg-item">
      <div class="pq-lbl">Difficulty</div>
      <select class="pq-select" onchange="window._pqSetDiff(this.value)">
        <option value="">All Levels</option>
        <option value="2">Easy (2)</option>
        <option value="3">Medium (3)</option>
        <option value="4">Hard (4)</option>
        <option value="5">Expert (5)</option>
      </select>
    </div>
    <div class="pq-cfg-item">
      <div class="pq-lbl">Mode</div>
      <div class="pq-chips" id="pq-mode-row">
        <button class="pq-chip active" onclick="window._pqSetMode('practice',this)">Practice</button>
        <button class="pq-chip" onclick="window._pqSetMode('timed',this)">Timed (60s)</button>
        <button class="pq-chip" onclick="window._pqSetMode('weak',this)">Weak Areas</button>
      </div>
    </div>
  </div>
  ${weakHtml}
  <div class="pq-start-row">
    <span id="pq-pool-count" class="pq-pool-count">${_allQ.length} questions match · 10 will be asked</span>
    <button class="btn-primary" onclick="window._pqStart()" style="padding:9px 24px;font-size:.88rem;">Start Quiz →</button>
  </div>
</div>

<div id="pq-runner" style="display:none;"></div>

${historyHtml}

<style>
/* ── Quiz Engine ────────────────────────────────────── */
.pq-cfg-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}
@media(max-width:560px){.pq-cfg-grid{grid-template-columns:1fr}}
.pq-cfg-item{display:flex;flex-direction:column;gap:8px}
.pq-lbl{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);font-family:var(--font-mono)}
.pq-chips{display:flex;flex-wrap:wrap;gap:6px}
.pq-chip{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-secondary);font-size:.78rem;cursor:pointer;transition:var(--transition);font-family:var(--font-mono)}
.pq-chip:hover{border-color:var(--accent);color:var(--accent)}
.pq-chip.active{border-color:var(--accent);background:var(--accent-dim);color:var(--accent)}
.pq-select{padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:.82rem;font-family:var(--font-mono)}
.pq-weak{background:var(--warning-dim);border:1px solid var(--warning);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px}
.pq-weak-lbl{font-size:.72rem;font-family:var(--font-mono);color:var(--warning);margin-bottom:8px}
.pq-weak-tags{display:flex;flex-wrap:wrap;gap:6px}
.pq-weak-tag{font-size:.74rem;padding:3px 8px;border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-secondary);border:1px solid var(--border)}
.pq-wc{color:var(--danger);font-weight:bold}
.pq-start-row{display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--border-subtle);flex-wrap:wrap;gap:8px}
.pq-pool-count{font-size:.8rem;color:var(--text-muted);font-family:var(--font-mono)}
/* question card */
.pq-progress{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.pq-prog-bar{flex:1;height:5px;background:var(--bg-elevated);border-radius:99px;overflow:hidden}
.pq-prog-fill{height:100%;background:var(--accent);border-radius:99px;transition:width .3s ease}
.pq-prog-txt{font-size:.74rem;font-family:var(--font-mono);color:var(--text-muted);flex-shrink:0}
.pq-q-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px;margin-bottom:14px}
.pq-q-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px}
.pq-q-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pq-q-num{font-size:.74rem;font-family:var(--font-mono);color:var(--text-muted)}
.pq-q-domain{font-size:.71rem;padding:3px 8px;border-radius:var(--radius);background:var(--accent-dim);color:var(--accent);font-family:var(--font-mono)}
.pq-diff-badge{font-size:.7rem;padding:3px 8px;border-radius:var(--radius);font-family:var(--font-mono);font-weight:bold}
.diff-2{background:var(--success-dim);color:var(--success)}
.diff-3{background:var(--warning-dim);color:var(--warning)}
.diff-4{background:var(--danger-dim);color:var(--danger)}
.diff-5{background:#1a0a2e;color:#bc8cff}
.pq-timer{font-size:.8rem;font-family:var(--font-mono);color:var(--text-secondary);padding:4px 10px;border:1px solid var(--border);border-radius:var(--radius);min-width:44px;text-align:center;transition:color var(--transition),border-color var(--transition)}
.pq-t-warn{color:var(--warning)!important;border-color:var(--warning)!important}
.pq-t-danger{color:var(--danger)!important;border-color:var(--danger)!important;animation:pblink .8s step-end infinite}
@keyframes pblink{50%{opacity:.35}}
.pq-stem{font-size:.94rem;font-weight:bold;color:var(--text-primary);line-height:1.55;margin-bottom:16px}
.pq-options{display:flex;flex-direction:column;gap:8px}
.pq-opt{display:flex;gap:12px;align-items:flex-start;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--bg-elevated);transition:border-color var(--transition),background var(--transition)}
.pq-opt:hover:not(.disabled){border-color:var(--accent);background:var(--accent-glow)}
.pq-opt.selected{border-color:var(--accent);background:var(--accent-glow)}
.pq-opt.correct{border-color:var(--success)!important;background:var(--success-dim)!important}
.pq-opt.wrong{border-color:var(--danger)!important;background:var(--danger-dim)!important}
.pq-opt.disabled{cursor:default}
.pq-opt-key{font-family:var(--font-mono);font-weight:bold;font-size:.82rem;color:var(--accent);flex-shrink:0;min-width:18px}
.pq-opt-text{font-size:.86rem;color:var(--text-primary);line-height:1.4}
.pq-actions{display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap}
.pq-btn{padding:8px 18px;border-radius:var(--radius);font-size:.83rem;cursor:pointer;font-family:var(--font-mono);border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-secondary);transition:var(--transition)}
.pq-btn:hover{border-color:var(--accent);color:var(--accent)}
.pq-btn-primary{background:var(--accent);border-color:var(--accent);color:var(--bg-base);font-weight:bold}
.pq-btn-primary:hover{opacity:.85}
/* rationale */
.pq-rationale{margin-top:14px;padding:14px;background:var(--bg-base);border:1px solid var(--border-subtle);border-radius:var(--radius)}
.pq-rat-correct{border-left:3px solid var(--success)}
.pq-rat-wrong{border-left:3px solid var(--danger)}
.pq-rat-verdict{font-size:.82rem;font-weight:bold;font-family:var(--font-mono);margin-bottom:10px}
.pq-rat-sec{margin-bottom:8px}
.pq-rat-lbl{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:3px}
.pq-rat-body{font-size:.82rem;color:var(--text-secondary);line-height:1.5}
.pq-rat-tip{margin-top:10px;padding:8px 12px;background:var(--accent-glow);border-radius:var(--radius);border:1px solid var(--accent-dim)}
.pq-rat-tip .pq-rat-lbl{color:var(--accent)}
.pq-rat-tip .pq-rat-body{color:var(--text-primary)}
/* summary */
.pq-summary{background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px}
.pq-sum-hd{text-align:center;margin-bottom:24px}
.pq-sum-score{font-size:3.5rem;font-weight:bold;font-family:var(--font-mono)}
.pq-sum-sub{font-size:.84rem;color:var(--text-muted);margin-top:4px}
.pq-sum-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.pq-sum-stat{text-align:center;padding:14px;background:var(--bg-elevated);border-radius:var(--radius)}
.pq-sum-val{font-size:1.5rem;font-weight:bold;font-family:var(--font-mono)}
.pq-sum-lbl{font-size:.71rem;color:var(--text-muted);margin-top:4px}
.pq-rev-list{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;max-height:400px;overflow-y:auto}
.pq-rev-item{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--radius);font-size:.82rem}
.pq-rev-pass{background:var(--success-dim);border:1px solid var(--success)}
.pq-rev-fail{background:var(--danger-dim);border:1px solid var(--danger)}
.pq-rev-icon{flex-shrink:0;font-size:.95rem;padding-top:1px}
.pq-rev-q{color:var(--text-primary);margin-bottom:3px;line-height:1.4}
.pq-rev-ans{font-size:.76rem;color:var(--text-muted);font-family:var(--font-mono)}
.pq-sum-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
/* history */
.pq-hist-row{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:.82rem;flex-wrap:wrap}
.pq-hist-row:last-child{border-bottom:none}
.pq-hist-date{color:var(--text-muted);font-family:var(--font-mono);flex-shrink:0}
.pq-hist-domain{color:var(--text-secondary);flex:1}
.pq-hist-score{font-family:var(--font-mono);font-weight:bold;flex-shrink:0}
</style>`;

  /* re-attach config helpers every render */
  setTimeout(() => {
    window._pqSetCount = function (n) {
      window._pqCfg.count = n;
      document.querySelectorAll('#pq-count-row .pq-chip').forEach(c =>
        c.classList.toggle('active', String(c.dataset.count) === String(n)));
      updateCount();
    };
    window._pqSetDomain = function (v) { window._pqCfg.domain = v; updateCount(); };
    window._pqSetDiff   = function (v) { window._pqCfg.diff   = v; updateCount(); };
    window._pqSetMode   = function (mode, btn) {
      window._pqCfg.mode = mode;
      document.querySelectorAll('#pq-mode-row .pq-chip').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
      updateCount();
    };
    updateCount();
  }, 0);

  return html;
}
