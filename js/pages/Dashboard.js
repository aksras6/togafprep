import { getData } from '../data.js';
import { progress, streak, quizHistory, examHistory } from '../store.js';

export async function Dashboard() {
  const modules = await getData('modules');
  const prog    = progress.get();
  const strk    = streak.get();
  const qhist   = quizHistory.get();
  const ehist   = examHistory.get();

  const allAnswers = qhist.flatMap(s => s.answers ?? []);
  const accuracy   = allAnswers.length
    ? Math.round((allAnswers.filter(a => a.correct).length / allAnswers.length) * 100)
    : 0;

  const part1Mods = modules.filter(m => m.part === 1 || m.part === "foundation");
  const part2Mods = modules.filter(m => m.part === 2 || m.part === "practitioner");
  const part1Done = part1Mods.filter(m => prog.modules[m.id]?.status === 'complete').length;
  const part2Done = part2Mods.filter(m => prog.modules[m.id]?.status === 'complete').length;
  const part1Pct  = part1Mods.length ? Math.round((part1Done / part1Mods.length) * 100) : 0;
  const part2Pct  = part2Mods.length ? Math.round((part2Done / part2Mods.length) * 100) : 0;

  const recentExam = ehist[0];

  const todayTasks = [
    { icon: '◫', label: 'Continue: Foundation Concepts', tag: 'LEARN', href: '#/modules' },
    { icon: '◎', label: '10 Part 1 Practice Questions',  tag: 'QUIZ',  href: '#/practice' },
    { icon: '◷', label: 'Review 5 Glossary Terms',       tag: 'FLASH', href: '#/glossary' },
  ];

  return `
    <div class="page-header">
      <div class="page-title-row">
        <h1 class="page-title">Dashboard</h1>
        <span class="badge badge-new text-mono">Week 1</span>
      </div>
      <p class="page-subtitle">Welcome back, Akshat — let's keep the momentum going.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card accent-blue">
        <div class="stat-label">Part 1 Progress</div>
        <div class="stat-value blue">${part1Pct}<small style="font-size:1rem">%</small></div>
        <div class="stat-sub">${part1Done} / ${part1Mods.length} modules</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${part1Pct}%"></div>
        </div>
      </div>
      <div class="stat-card accent-purple">
        <div class="stat-label">Part 2 Progress</div>
        <div class="stat-value purple">${part2Pct}<small style="font-size:1rem">%</small></div>
        <div class="stat-sub">${part2Done} / ${part2Mods.length} modules</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill purple" style="width:${part2Pct}%"></div>
        </div>
      </div>
      <div class="stat-card accent-green">
        <div class="stat-label">Quiz Accuracy</div>
        <div class="stat-value green">${accuracy}<small style="font-size:1rem">%</small></div>
        <div class="stat-sub">${allAnswers.length} questions answered</div>
      </div>
      <div class="stat-card accent-orange">
        <div class="stat-label">Study Streak</div>
        <div class="stat-value orange">${strk.currentStreak}</div>
        <div class="stat-sub">${strk.totalStudyDays} total days · best ${strk.longestStreak}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-title">Today's Plan</div>
        <div class="today-tasks">
          ${todayTasks.map(t => `
            <a href="${t.href}" class="today-task" style="text-decoration:none;color:inherit;">
              <div class="today-task-icon">${t.icon}</div>
              <div class="today-task-text">${t.label}</div>
              <span class="today-task-badge">${t.tag}</span>
            </a>`).join('')}
        </div>
        <div class="quick-actions mt-12">
          <a href="#/practice" class="btn btn-primary btn-sm">Start Practice →</a>
          <a href="#/exams"    class="btn btn-secondary btn-sm">Mock Exam</a>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Recent Activity</div>
        ${recentExam ? `
          <div style="font-size:.83rem;color:var(--text-secondary);line-height:1.7;">
            <p>Last exam: <span class="text-mono text-accent">Part ${recentExam.part}</span></p>
            <p>Score: <span class="text-mono">${recentExam.score}/${recentExam.total}</span>
               — ${recentExam.passed ? '<span class="text-success">PASS ✓</span>' : '<span class="text-danger">FAIL ✗</span>'}</p>
            <p>Date: ${new Date(recentExam.timestamp).toLocaleDateString()}</p>
          </div>
        ` : `
          <p style="font-size:.83rem;color:var(--text-muted);line-height:1.7;">
            No exam sessions yet.<br>Complete a mock exam to see results here.
          </p>
          <a href="#/exams" class="btn btn-secondary btn-sm mt-12">Go to Exams →</a>
        `}
      </div>

      <div class="card full-width">
        <div class="card-title">Modules Overview</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          ${modules.slice(0, 4).map(m => {
            const pct    = prog.modules[m.id]?.percentComplete ?? 0;
            const status = prog.modules[m.id]?.status ?? 'new';
            return `
              <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
                <div>
                  <a href="#/modules/${m.id}" style="font-size:.85rem;color:var(--text-primary);font-weight:bold;text-decoration:none;">
                    ${m.title}
                  </a>
                  <div class="progress-bar-wrap" style="margin-top:4px;">
                    <div class="progress-bar-fill ${m.part === 2 || m.part === 'practitioner' ? 'purple' : ''}" style="width:${pct}%"></div>
                  </div>
                </div>
                <span class="badge badge-${status === 'complete' ? 'complete' : status === 'in_progress' ? 'progress' : 'new'}">
                  ${status === 'complete' ? 'done' : status === 'in_progress' ? 'in progress' : 'new'}
                </span>
              </div>`;
          }).join('')}
          ${modules.length > 4 ? `<a href="#/modules" class="text-accent text-sm" style="margin-top:4px;">+ ${modules.length - 4} more →</a>` : ''}
        </div>
      </div>
    </div>`;
}
