const SprintCard = (() => {
  function render(sprint) {
    const score = Store.getSprintScore(sprint.id);
    const pct = Utils.scorePercent(score, sprint.targetScore);
    const status = Utils.sprintStatus(sprint);
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter(t => t.completed).length;
    const remaining = totalTasks - completedTasks;

    const statusLabels = { active: 'Active', won: 'Won ✓', expired: 'Ended' };
    const statusLabel = statusLabels[status] || 'Active';
    const fillClass = sprint.won ? ' progress-bar__fill--won' : (pct >= 80 ? '' : '');

    return `
      <div class="card sprint-card" data-action="open-sprint" data-sprint-id="${sprint.id}">
        <div class="sprint-card__top">
          <div class="sprint-card__badges">
            <span class="badge badge--${sprint.type}">${sprint.type.charAt(0).toUpperCase() + sprint.type.slice(1)}</span>
            <span class="badge badge--${status}">${statusLabel}</span>
          </div>
          <div class="sprint-card__menu">
            <button class="btn btn--ghost btn--icon-sm"
              data-action="edit-sprint"
              data-sprint-id="${sprint.id}"
              title="Edit sprint">✎</button>
            <button class="btn btn--ghost btn--icon-sm"
              data-action="delete-sprint"
              data-sprint-id="${sprint.id}"
              title="Delete sprint"
              style="color:var(--brand-red)">✕</button>
          </div>
        </div>
        <h3 class="sprint-card__title truncate">${Utils.escHtml(sprint.name)}</h3>
        <div class="sprint-card__dates">
          <span>📅</span>
          <span>${Utils.formatDateRange(sprint.startDate, sprint.endDate)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill${fillClass}" style="width:${pct}%"></div>
        </div>
        <div class="sprint-card__score">
          <span class="sprint-card__score-val">${score} / ${sprint.targetScore} pts</span>
          <span class="sprint-card__task-count">${remaining > 0 ? remaining + ' left' : (totalTasks > 0 ? 'All done!' : 'No tasks')}</span>
        </div>
      </div>`;
  }

  return { render };
})();
