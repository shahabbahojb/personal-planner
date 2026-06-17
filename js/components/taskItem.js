const TaskItem = (() => {
  function render(task, sprint) {
    const cat = task.categoryId ? sprint.categories.find(c => c.id === task.categoryId) : null;
    const checked = task.completed ? 'checked' : '';
    const completedClass = task.completed ? ' completed' : '';
    const title = Utils.escHtml(task.title);
    const notes = Utils.escHtml(task.notes || '');

    let catHtml = '';
    if (cat) {
      catHtml = `<span class="category-chip" style="--chip-color:${Utils.escHtml(cat.color)}">${cat.emoji ? Utils.escHtml(cat.emoji) + ' ' : ''}${Utils.escHtml(cat.name)}</span>`;
    }

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
            ${task.notes ? `<button class="btn btn--ghost btn--sm" data-action="toggle-notes" data-task-id="${task.id}" style="padding:1px 6px;font-size:11px;">notes</button>` : ''}
          </div>
          ${task.notes ? `<div class="task-notes-area hidden" id="notes-${task.id}">${notes}</div>` : ''}
        </div>
        <div class="task-actions">
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
