import { settings as settingsStore, resetAll, streak, user } from '../store.js';
import * as cloudSync from '../cloudSync.js';

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
      <div class="settings-section-title">Cloud Sync</div>
      ${cloudSync.isEnabled() ? `
        <div class="settings-row">
          <div>
            <div class="settings-label">Sync Code</div>
            <div class="settings-desc">Enter this same code on your other devices to keep progress in sync</div>
          </div>
          <span class="text-mono text-accent" id="sync-code-display" style="font-size:1.1rem;letter-spacing:2px;cursor:pointer;" title="Click to copy">${cloudSync.getSyncCode()}</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Last Synced</div>
          <span class="text-mono text-secondary" id="sync-last-synced" style="font-size:.8rem;">${cloudSync.getLastSynced() ? new Date(cloudSync.getLastSynced()).toLocaleString() : 'Not yet synced'}</span>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Disable Sync on This Device</div>
            <div class="settings-desc">Stops syncing here. Your data remains in the cloud under this code.</div>
          </div>
          <button class="btn btn-danger btn-sm" id="btn-sync-disable">Disable</button>
        </div>
      ` : `
        <div class="settings-row">
          <div>
            <div class="settings-label">Set Up Cross-Device Sync</div>
            <div class="settings-desc">Generate a new code on your first device, then enter that same code on any other device.</div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-sync-generate">Generate New Code</button>
        </div>
        <div class="settings-row">
          <div style="flex:1;">
            <div class="settings-label">Already Have a Code?</div>
            <div class="settings-desc" style="margin-bottom:8px;">Enter the code from your other device</div>
            <div style="display:flex;gap:8px;">
              <input type="text" id="sync-code-input" placeholder="e.g. 7K9XQ2R4" maxlength="8"
                     style="flex:1;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-primary);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;" />
              <button class="btn btn-secondary btn-sm" id="btn-sync-enter">Connect</button>
            </div>
          </div>
        </div>
      `}
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
        document.getElementById('toggle-theme').addEventListener('change', async function() {
          var theme = this.checked ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', theme);
          try {
            var storeMod = await import('./js/store.js');
            storeMod.settings.update(function(s) { s.theme = theme; return s; });
          } catch(e) {}
        });

        // Rationale toggle
        document.getElementById('toggle-rationale').addEventListener('change', async function() {
          var checked = this.checked;
          try {
            var storeMod = await import('./js/store.js');
            storeMod.settings.update(function(s) { s.showRationaleImmediately = checked; return s; });
          } catch(e) {}
        });

        // Timer toggle
        document.getElementById('toggle-timer').addEventListener('change', async function() {
          var checked = this.checked;
          try {
            var storeMod = await import('./js/store.js');
            storeMod.settings.update(function(s) { s.timerEnabled = checked; return s; });
          } catch(e) {}
        });

        // Exam mode toggle
        document.getElementById('toggle-exam').addEventListener('change', async function() {
          var checked = this.checked;
          try {
            var storeMod = await import('./js/store.js');
            storeMod.settings.update(function(s) { s.examMode = checked; return s; });
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

        // Cloud Sync — generate a new code (first device)
        var genBtn = document.getElementById('btn-sync-generate');
        if (genBtn) {
          genBtn.addEventListener('click', async function() {
            var mod = await import('./js/cloudSync.js');
            var code = mod.generateCode();
            mod.setSyncCode(code);
            alert('Sync code created: ' + code + '\\n\\nEnter this exact code in Settings on your other device(s) to keep them in sync. Write it down — you will need it again.');
            location.reload();
          });
        }

        // Cloud Sync — enter an existing code (second+ device)
        var enterBtn = document.getElementById('btn-sync-enter');
        if (enterBtn) {
          enterBtn.addEventListener('click', async function() {
            var input = document.getElementById('sync-code-input');
            var code = input.value.trim();
            if (!code) { alert('Please enter a sync code first.'); return; }
            var mod = await import('./js/cloudSync.js');
            mod.setSyncCode(code);
            alert('Connecting with code ' + code.toUpperCase() + ' — reloading to sync now.');
            location.reload();
          });
        }

        // Cloud Sync — copy code to clipboard
        var codeDisplay = document.getElementById('sync-code-display');
        if (codeDisplay) {
          codeDisplay.addEventListener('click', function() {
            navigator.clipboard.writeText(codeDisplay.textContent.trim()).then(function() {
              var original = codeDisplay.textContent;
              codeDisplay.textContent = 'Copied!';
              setTimeout(function() { codeDisplay.textContent = original; }, 1200);
            });
          });
        }

        // Cloud Sync — disable on this device
        var disableBtn = document.getElementById('btn-sync-disable');
        if (disableBtn) {
          disableBtn.addEventListener('click', async function() {
            if (confirm('Disable sync on this device? Your data stays safe in the cloud under this code — you can reconnect anytime by entering the same code again.')) {
              var mod = await import('./js/cloudSync.js');
              mod.disableSync();
              location.reload();
            }
          });
        }
      })();
    <\/script>`;
}
