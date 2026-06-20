const PomodoroWidget = (() => {
  const PHASE_COLORS = { focus: 'var(--brand-red)', shortBreak: 'var(--brand-green)', longBreak: 'var(--brand-blue)' };
  const PHASE_LABELS = { focus: '🍅 FOCUS', shortBreak: '☕ SHORT BREAK', longBreak: '🌿 LONG BREAK', idle: '' };

  function show() {
    const w = document.getElementById('pomodoro-widget');
    if (w) w.classList.remove('hidden');
  }

  function hide() {
    const w = document.getElementById('pomodoro-widget');
    if (w) { w.classList.add('hidden'); w.innerHTML = ''; }
  }

  function update(state) {
    const w = document.getElementById('pomodoro-widget');
    if (!w) return;

    if (state.phase === 'idle') { hide(); return; }
    show();

    const dots = Array.from({ length: state.totalSessions }, (_, i) =>
      `<span class="pomo-dot ${i < state.sessionIndex ? 'pomo-dot--done' : 'pomo-dot--pending'}"></span>`
    ).join('');

    const baseColor = PHASE_COLORS[state.phase] || 'var(--accent)';
    const color = state.isOvertime ? 'var(--brand-orange, #f59e0b)' : baseColor;
    const baseLabel = PHASE_LABELS[state.phase] || '';
    const label = state.isOvertime ? baseLabel + ' <span style="font-size:10px;opacity:.8">(overtime)</span>' : baseLabel;
    const time = Pomodoro.formatTime(state.secondsLeft);
    const title = state.taskTitle ? Utils.escHtml(state.taskTitle) : '';
    const isPaused = !state.isRunning;

    w.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)">
        <span class="pomo-phase" style="color:${color}">${label}</span>
        <span style="font-size:11px;color:var(--text-muted)">${state.sessionIndex}/${state.totalSessions}</span>
      </div>
      <div class="pomo-dots">${dots}</div>
      <div style="font-size:12px;color:var(--text-secondary);text-align:center;margin:var(--sp-1) 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${title}">${title}</div>
      <div class="pomo-timer" style="color:${color}">${time}</div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3)">
        <button class="btn btn--ghost btn--sm" style="flex:1" data-action="pomodoro-pause">${isPaused ? '▶ Resume' : '⏸ Pause'}</button>
        <button class="btn btn--ghost btn--sm" data-action="pomodoro-skip" title="Skip phase">⏭</button>
        <button class="btn btn--ghost btn--sm" style="color:var(--brand-red)" data-action="pomodoro-stop" title="Stop">✕</button>
      </div>`;
  }

  return { show, hide, update };
})();
