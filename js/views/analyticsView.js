const AnalyticsView = (() => {
  function render() {
    const { analytics, sprints } = Store.getState();
    const an = analytics || { totalFocusedMinutes: 0, totalSessions: 0, dailyLog: {} };
    const log = an.dailyLog || {};
    const days = Utils.getLast7Days();
    const streak = Utils.computeStreak(log);
    const totalTasks = Store.getAllTimeCompletedTasks();

    const totalH = Math.floor(an.totalFocusedMinutes / 60);
    const totalM = an.totalFocusedMinutes % 60;
    const focusStr = totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`;

    _updateBreadcrumb('Analytics');

    const statCards = [
      { value: an.totalFocusedMinutes > 0 ? focusStr : '0m', label: 'Total Focus Time', icon: '⏱' },
      { value: an.totalSessions, label: 'Pomodoro Sessions', icon: '🍅' },
      { value: totalTasks, label: 'Tasks Completed', icon: '✓' },
      { value: streak + (streak === 1 ? ' day' : ' days'), label: 'Current Streak', icon: '🔥' }
    ].map(s => `
      <div class="stat-card animate-slide-up">
        <div style="font-size:20px;margin-bottom:var(--sp-2)">${s.icon}</div>
        <div class="stat-card__value">${s.value}</div>
        <div class="stat-card__label">${s.label}</div>
      </div>`).join('');

    const barChart = _renderBarChart(log, days);
    const sprintTable = _renderSprintTable(sprints);

    return `
      <div class="page-header">
        <div class="page-header__left">
          <h1 class="page-title">Analytics</h1>
          <p class="page-sub">Your productivity at a glance</p>
        </div>
        <button class="btn btn--ghost btn--sm" data-action="back-to-dashboard">← Dashboard</button>
      </div>

      <div class="analytics-grid animate-fade-in">${statCards}</div>

      <div class="chart-card animate-slide-up" style="margin-bottom:var(--sp-6)">
        <h3 style="margin-bottom:var(--sp-4);font-size:14px;color:var(--text-secondary)">Focus Minutes — Last 7 Days</h3>
        ${barChart}
      </div>

      <div class="chart-card animate-slide-up">
        <h3 style="margin-bottom:var(--sp-4);font-size:14px;color:var(--text-secondary)">Sprint Progress</h3>
        ${sprintTable}
      </div>`;
  }

  function _renderBarChart(log, days) {
    const vals = days.map(d => (log[d] && log[d].focusedMinutes) || 0);
    const maxVal = Math.max(...vals, 1);
    const W = 280, H = 110, barW = 28, gap = 12;
    const totalW = days.length * (barW + gap) - gap;
    const offsetX = (W - totalW) / 2;

    const bars = days.map((d, i) => {
      const mins = vals[i];
      const barH = Math.round((mins / maxVal) * 80);
      const x = offsetX + i * (barW + gap);
      const y = 90 - barH;
      const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = d === Utils.today();
      const barColor = isToday ? 'var(--accent)' : 'var(--brand-purple-dim)';
      const textColor = isToday ? 'var(--accent)' : 'var(--text-muted)';

      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 2)}" rx="4" fill="${barColor}" opacity="${mins > 0 ? 1 : 0.3}"/>
        ${mins > 0 ? `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="8" fill="var(--text-secondary)" font-family="var(--font-mono)">${Utils.formatDuration(mins)}</text>` : ''}
        <text x="${x + barW / 2}" y="105" text-anchor="middle" font-size="9" fill="${textColor}" font-weight="${isToday ? '700' : '400'}">${dayName}</text>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block;margin:0 auto">
      <line x1="${offsetX - 4}" y1="90" x2="${W - offsetX + 4}" y2="90" stroke="var(--border)" stroke-width="1"/>
      ${bars}
    </svg>`;
  }

  function _renderSprintTable(sprints) {
    if (!sprints.length) return '<p class="text-muted">No sprints yet.</p>';

    const rows = sprints.map(s => {
      const done = s.tasks.filter(t => t.completed).length;
      const score = Store.getSprintScore(s.id);
      const status = Utils.sprintStatus(s);
      const statusLabels = { active: '🟢 Active', won: '🏆 Won', expired: '⬜ Ended' };
      return `<tr>
        <td style="padding:10px 12px;font-weight:600;color:var(--text-primary)">${Utils.escHtml(s.name)}</td>
        <td style="padding:10px 12px;text-align:center;font-family:var(--font-mono);color:var(--text-secondary)">${done}/${s.tasks.length}</td>
        <td style="padding:10px 12px;text-align:center;font-family:var(--font-mono);font-weight:600;color:var(--accent)">${score}/${s.targetScore}</td>
        <td style="padding:10px 12px">${statusLabels[status] || status}</td>
      </tr>`;
    }).join('');

    return `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600">Sprint</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600">Tasks</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600">Score</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
  }

  function _updateBreadcrumb(text) {
    const el = document.getElementById('nav-breadcrumb');
    if (el) el.textContent = text;
  }

  return { render };
})();
