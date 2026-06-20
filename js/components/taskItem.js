const TaskItem = (() => {
  function render(task, sprint) {
    const cat = task.categoryId ? sprint.categories.find(c => c.id === task.categoryId) : null;
    const checked = task.completed ? 'checked' : '';
    const completedClass = task.completed ? ' completed' : '';
    const title = Utils.escHtml(task.title);

    let catHtml = '';
    if (cat) {
      catHtml = `<span class="category-chip" style="--chip-color:${Utils.escHtml(cat.color)}">${cat.emoji ? Utils.escHtml(cat.emoji) + ' ' : ''}${Utils.escHtml(cat.name)}</span>`;
    }

    let timeHtml = '';
    if (task.startTime && task.duration) {
      const end = Utils.computeEndTime(task.startTime, task.duration);
      const breakStr = task.breakAfter ? ` · ${Utils.formatDuration(task.breakAfter)} break` : '';
      timeHtml = `<span class="task-time-badge">🕐 ${task.startTime}–${end}${breakStr}</span>`;
    }

    let pomodoroHtml = '';
    if (task.pomodoro) {
      const p = task.pomodoro;
      const done = Math.min(p.completedSessions || 0, p.sessions || 4);
      const total = p.sessions || 4;
      const allDone = done >= total;
      const dots = Array.from({ length: total }, (_, i) =>
        `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${i < done ? 'var(--brand-red)' : 'var(--border-strong)'};margin-right:2px"></span>`
      ).join('');
      const focusMins = p.totalFocusedMinutes || 0;
      const focusStr = focusMins >= 60
        ? `${Math.floor(focusMins / 60)}h ${focusMins % 60}m`
        : focusMins > 0 ? `${focusMins}m` : '';
      const timeLabel = focusStr ? ` · ⏱ ${focusStr}` : '';
      pomodoroHtml = allDone
        ? `<span class="score-badge" style="color:var(--brand-green);border-color:var(--brand-green)">✓ All sessions${timeLabel}</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)">${dots}<span>${done}/${total}${timeLabel}</span></span>`;
    }

    const hasNotes = task.notes && task.notes.trim();

    return `
      <div class="task-item${completedClass}" draggable="true" data-task-id="${task.id}">
        <span class="drag-handle" title="Drag to reorder">⠿</span>
        <div class="task-check-wrap">
          <input type="checkbox" class="task-checkbox"
            data-action="toggle-task"
            data-sprint-id="${sprint.id}"
            data-task-id="${task.id}"
            ${checked}>
        </div>
        <div class="task-body">
          <span class="task-title">${title}</span>
          <div class="task-meta">
            ${catHtml}
            <span class="priority-dot priority-dot--${task.priority}" title="Priority: ${task.priority}"></span>
            <span class="score-badge">+${task.score} pts</span>
            ${timeHtml}
            ${pomodoroHtml}
            <button class="btn btn--ghost btn--sm" data-action="open-notes"
              data-sprint-id="${sprint.id}"
              data-task-id="${task.id}"
              style="padding:1px 6px;font-size:11px;${hasNotes ? 'color:var(--accent)' : ''}">
              ${hasNotes ? '📝 notes' : '+ notes'}
            </button>
          </div>
        </div>
        <div class="task-actions">
          ${task.pomodoro !== null && task.pomodoro !== undefined ? `
          <button class="btn btn--ghost btn--icon-sm"
            data-action="start-pomodoro"
            data-sprint-id="${sprint.id}"
            data-task-id="${task.id}"
            title="Start Pomodoro">🍅</button>` : ''}
          <button class="btn btn--ghost btn--icon-sm"
            data-action="edit-task"
            data-sprint-id="${sprint.id}"
            data-task-id="${task.id}"
            title="Edit task">✎</button>
          <button class="btn btn--ghost btn--icon-sm"
            data-action="delete-task"
            data-sprint-id="${sprint.id}"
            data-task-id="${task.id}"
            title="Delete task"
            style="color:var(--brand-red)">✕</button>
        </div>
      </div>`;
  }

  return { render };
})();
