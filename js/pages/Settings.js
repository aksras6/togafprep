import { settings as settingsStore, resetAll, streak, user } from '../store.js';

export async function Settings() {
  const s    = settingsStore.get();
  const u    = user.get();
  const strk = streak.get();

  return `
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Customise your study experience.</p>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Appearance</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Dark Mode</div>
          <div class="settings-desc">Switch between dark and light theme</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-theme" ${s.theme === 'dark' ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Study Preferences</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Show Rationale Immediately</div>
          <div class="settings-desc">Display answer explanation right after each question</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-rationale" ${s.showRationaleImmediately ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Timer Enabled</div>
          <div class="settings-desc">Show countdown timer during practice sessions</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-timer" ${s.timerEnabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Exam Mode</div>
          <div class="settings-desc">Strict mode: no hints until session end</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-exam" ${s.examMode ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Your Stats</div>
      <div class="settings-row">
        <div class="settings-label">Name</div>
        <span class="text-mono text-accent" style="font-size:.85rem;">${u.name}</span>
      </div>
      <div class="settings-row">
        <div class="settings-label">Current Streak</div>
        <span class="text-mono" style="color:var(--warning);">🔥 ${strk.currentStreak} days</span>
      </div>
      <div class="settings-row">
        <div class="settings-label">Total Study Days</div>
        <span class="text-mono text-secondary">${strk.totalStudyDays}</span>
      </div>
      <div class="settings-row">
        <div class="settings-label">Started</div>
        <span class="text-mono text-secondary">${u.startDate}</span>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Data Management</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Reset All Progress</div>
          <div class="settings-desc">Clears quiz history, progress, streaks. Cannot be undone.</div>
        </div>
        <button class="btn btn-danger btn-sm" id="btn-reset">Reset</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Export Data</div>
          <div class="settings-desc">Download your study data as JSON</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-export">Export</button>
      </div>
    </div>

    <div style="margin-top:24px;font-size:.72rem;color:var(--text-muted);font-family:var(--font-mono);">
      TOGAF Prep v1.0.0 · Phase 1 · 100% offline · localStorage persisted
    </div>

    <script>
      (function() {
        // Theme toggle
        document.getElementById('toggle-theme').addEventListener('change', function() {
          var theme = this.checked ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', theme);
          try {
            var s = JSON.parse(localStorage.getItem('togaf_settings') || '{}');
            s.theme = theme;
            localStorage.setItem('togaf_settings', JSON.stringify(s));
          } catch(e) {}
        });

        // Rationale toggle
        document.getElementById('toggle-rationale').addEventListener('change', function() {
          try {
            var s = JSON.parse(localStorage.getItem('togaf_settings') || '{}');
            s.showRationaleImmediately = this.checked;
            localStorage.setItem('togaf_settings', JSON.stringify(s));
          } catch(e) {}
        });

        // Timer toggle
        document.getElementById('toggle-timer').addEventListener('change', function() {
          try {
            var s = JSON.parse(localStorage.getItem('togaf_settings') || '{}');
            s.timerEnabled = this.checked;
            localStorage.setItem('togaf_settings', JSON.stringify(s));
          } catch(e) {}
        });

        // Exam mode toggle
        document.getElementById('toggle-exam').addEventListener('change', function() {
          try {
            var s = JSON.parse(localStorage.getItem('togaf_settings') || '{}');
            s.examMode = this.checked;
            localStorage.setItem('togaf_settings', JSON.stringify(s));
          } catch(e) {}
        });

        // Reset
        document.getElementById('btn-reset').addEventListener('click', function() {
          if (confirm('Reset ALL progress, history, and streaks? This cannot be undone.')) {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.startsWith('togaf_')) keys.push(k);
            }
            keys.forEach(function(k) { localStorage.removeItem(k); });
            if (window.__app) window.__app.refreshStreakUI();
            location.hash = '#/';
          }
        });

        // Export
        document.getElementById('btn-export').addEventListener('click', function() {
          var data = {};
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.startsWith('togaf_')) {
              try { data[k] = JSON.parse(localStorage.getItem(k)); }
              catch(e) { data[k] = localStorage.getItem(k); }
            }
          }
          var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
          var url  = URL.createObjectURL(blob);
          var a    = document.createElement('a');
          a.href = url; a.download = 'togaf-prep-data.json'; a.click();
          URL.revokeObjectURL(url);
        });
      })();
    <\/script>`;
}
