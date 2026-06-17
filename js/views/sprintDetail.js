const SprintDetailView = (() => {
  const CAT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
  let _activeCatFilter = null;

  function render(sprintId) {
    const sprint = Store.getSprint(sprintId);

    if (!sprint) {
      _updateBreadcrumb('Sprint not found');
      return `
        <div class="not-found animate-fade-in">
          <div class="empty-state__icon">😕</div>
          <h2>Sprint not found</h2>
          <p style="margin:8px 0 20px;color:var(--text-secondary)">This sprint may have been deleted.</p>
          <button class="btn btn--primary" data-action="back-to-dashboard">← Back to Dashboard</button>
        </div>`;
    }

    if (_activeCatFilter && !sprint.categories.find(c => c.id === _activeCatFilter)) {
      _activeCatFilter = null;
    }

    _updateBreadcrumb(sprint.name);

    const score = Store.getSprintScore(sprintId);
    const pct = Utils.scorePercent(score, sprint.targetScore);
    const status = Utils.sprintStatus(sprint);
    const tasks = Store.getSortedTasks(sprintId);
    const completedCount = tasks.filter(t => t.completed).length;
    const remaining = tasks.length - completedCount;

    const fillClass = sprint.won ? 'progress-bar__fill--won' : '';

    /* Score Panel */
    const scorePanelHtml = `
      <div class="score-panel">
        ${sprint.won ? `
          <div class="win-banner">
            <div class="win-banner__icon">🏆</div>
            <div class="win-banner__title">Sprint Complete!</div>
            <div class="win-banner__sub">${score} pts — target reached</div>
          </div>` : ''}
        <div>
          <div class="label-caps" style="margin-bottom:8px">Score</div>
          <div class="score-panel__main">
            <span class="score-current" id="score-current">${score}</span>
            <span class="score-target">/ ${sprint.targetScore} pts</span>
          </div>
        </div>
        <div class="progress-bar progress-bar--lg">
          <div class="progress-bar__fill ${fillClass}" style="width:${pct}%"></div>
        </div>
        <div class="score-panel__stats">
          <div class="stat-item">
            <span class="stat-value font-mono">${completedCount}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value font-mono">${remaining}</span>
            <span class="stat-label">Remaining</span>
          </div>
          <div class="stat-item">
            <span class="stat-value font-mono">${pct}%</span>
            <span class="stat-label">Progress</span>
          </div>
        </div>
        <div class="divider"></div>
        <div style="font-size:12px;color:var(--text-muted);">
          📅 ${Utils.formatDateRange(sprint.startDate, sprint.endDate)}
          &nbsp;·&nbsp;
          <span class="badge badge--${status}" style="vertical-align:middle">${{ active: 'Active', won: 'Won ✓', expired: 'Ended' }[status]}</span>
        </div>
        <button class="btn btn--ghost btn--sm" style="width:100%;margin-top:4px;" data-action="edit-sprint" data-sprint-id="${sprint.id}">Edit Sprint</button>
      </div>`;

    /* Category Panel */
    const activeCat = _activeCatFilter;
    const catChips = sprint.categories.map(c =>
      CategoryChip.render(c, { active: activeCat === c.id, showDelete: true, sprintId })
    ).join('');

    const catPanelHtml = `
      <div class="category-panel" id="category-panel">
        <span class="label-caps" style="margin-right:4px;flex-shrink:0">Filter:</span>
        <span class="category-chip${!activeCat ? ' active' : ''}"
          style="--chip-color:#6366f1"
          data-action="filter-category"
          data-cat-id=""
          data-sprint-id="${sprint.id}">All</span>
        ${catChips}
        <button class="btn btn--ghost btn--sm" data-action="add-category" data-sprint-id="${sprint.id}" style="margin-left:auto;flex-shrink:0">+ Category</button>
      </div>`;

    /* Task List */
    const filteredTasks = activeCat
      ? tasks.filter(t => t.categoryId === activeCat)
      : tasks;

    const taskListHtml = filteredTasks.length > 0
      ? filteredTasks.map(t => TaskItem.render(t, sprint)).join('')
      : `<div class="empty-state" style="padding:var(--sp-8)">
          <div class="empty-state__icon">📝</div>
          <p class="empty-state__sub">${activeCat ? 'No tasks in this category.' : 'No tasks yet. Add one to get started!'}</p>
        </div>`;

    return `
      <div style="margin-bottom:var(--sp-6);display:flex;align-items:center;gap:var(--sp-3);">
        <button class="btn btn--ghost btn--sm" data-action="back-to-dashboard">← Dashboard</button>
        <h2 class="page-title" style="flex:1;min-width:0;" title="${Utils.escHtml(sprint.name)}">${Utils.escHtml(sprint.name)}</h2>
      </div>

      <div class="sprint-detail-layout">
        <div class="sprint-detail-main">
          ${catPanelHtml}
          <div style="margin-top:var(--sp-5)">
            <div class="section-header">
              <span class="section-title">Tasks (${tasks.length})</span>
              <button class="btn btn--primary btn--sm" data-action="add-task" data-sprint-id="${sprint.id}">+ Add Task</button>
            </div>
            <div class="task-list" id="task-list">${taskListHtml}</div>
          </div>
        </div>
        <div class="sprint-detail-sidebar">
          ${scorePanelHtml}
        </div>
      </div>`;
  }

  /* ── Category Modal ─────────────────────────── */
  function openAddCategoryModal(sprintId) {
    let selectedColor = CAT_COLORS[0];

    const swatches = CAT_COLORS.map((c, i) =>
      `<span class="color-swatch${i === 0 ? ' selected' : ''}" style="background:${c}" data-color="${c}"></span>`
    ).join('');

    Modal.open({
      title: 'New Category',
      body: `
        <div class="form-group">
          <label class="form-label">Category name *</label>
          <input class="form-input" name="catName" type="text" placeholder="e.g. Work, Study, Health" maxlength="30">
        </div>
        <div class="form-group">
          <label class="form-label">Emoji (optional)</label>
          <input class="form-input" name="catEmoji" type="text" placeholder="e.g. 💼" maxlength="4" style="max-width:100px">
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="color-swatches" id="color-swatches">${swatches}</div>
        </div>`,
      confirmLabel: 'Add Category',
      onConfirm: () => {
        const name = Modal.getValue('catName');
        if (!name) { Toast.show('Category name required', 'error'); return; }
        const emoji = Modal.getValue('catEmoji');
        const color = document.querySelector('.color-swatch.selected')?.dataset.color || CAT_COLORS[0];
        Store.createCategory(sprintId, { name, color, emoji });
        Toast.show('Category added', 'success');
        Modal.close();
        Router.renderCurrent();
      }
    });

    setTimeout(() => {
      const container = document.getElementById('color-swatches');
      if (!container) return;
      container.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch) return;
        container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
    }, 20);
  }

  /* ── Task Modals ────────────────────────────── */
  function openAddTaskModal(sprintId) {
    const sprint = Store.getSprint(sprintId);
    if (!sprint) return;
    _openTaskModal({ sprintId, sprint, mode: 'create' });
  }

  function openEditTaskModal(sprintId, taskId) {
    const sprint = Store.getSprint(sprintId);
    if (!sprint) return;
    const task = sprint.tasks.find(t => t.id === taskId);
    if (!task) return;
    _openTaskModal({ sprintId, sprint, mode: 'edit', task });
  }

  function _openTaskModal({ sprintId, sprint, mode, task }) {
    const isEdit = mode === 'edit';
    const t = task || {};
    const catOptions = sprint.categories.map(c =>
      `<option value="${c.id}" ${t.categoryId === c.id ? 'selected' : ''}>${c.emoji ? c.emoji + ' ' : ''}${Utils.escHtml(c.name)}</option>`
    ).join('');

    Modal.open({
      title: isEdit ? 'Edit Task' : 'New Task',
      body: `
        <div class="form-group">
          <label class="form-label">Task title *</label>
          <input class="form-input" name="taskTitle" type="text" placeholder="What needs to be done?" maxlength="120" value="${Utils.escHtml(t.title || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" name="taskCat">
            <option value="">— None —</option>
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" name="taskPriority">
            <option value="low" ${t.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
            <option value="medium" ${(!t.priority || t.priority === 'medium') ? 'selected' : ''}>🟡 Medium</option>
            <option value="high" ${t.priority === 'high' ? 'selected' : ''}>🔴 High</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Score value (pts on completion)</label>
          <input class="form-input" name="taskScore" type="number" min="0" value="${t.score !== undefined ? t.score : 5}" style="max-width:120px">
        </div>
        <div class="form-group">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-textarea" name="taskNotes" placeholder="Any details, links, or context...">${Utils.escHtml(t.notes || '')}</textarea>
        </div>`,
      confirmLabel: isEdit ? 'Save Task' : 'Add Task',
      onConfirm: () => _submitTaskModal(sprintId, isEdit ? t.id : null)
    });
  }

  function _submitTaskModal(sprintId, editId) {
    const title = Modal.getValue('taskTitle');
    if (!title) { Toast.show('Task title is required', 'error'); return; }

    const categoryId = Modal.getValue('taskCat') || null;
    const priority = Modal.getValue('taskPriority') || 'medium';
    const score = Number(Modal.getValue('taskScore')) || 5;
    const notes = Modal.getValue('taskNotes');

    if (editId) {
      Store.updateTask(sprintId, editId, { title, categoryId, priority, score, notes });
      Toast.show('Task updated', 'success');
    } else {
      Store.createTask(sprintId, { title, categoryId, priority, score, notes });
      Toast.show('Task added!', 'success');
    }

    Modal.close();
    Router.renderCurrent();
  }

  /* ── Filter ─────────────────────────────────── */
  function filterByCategory(catId) {
    _activeCatFilter = catId || null;
    Router.renderCurrent();
  }

  /* ── Notes toggle (no re-render) ────────────── */
  function toggleNotes(taskId) {
    const el = document.getElementById('notes-' + taskId);
    if (el) el.classList.toggle('hidden');
  }

  /* ── After render hook ──────────────────────── */
  function afterRender(sprintId) {
    if (!sprintId) return;
    Utils.initDragDrop('#task-list', (orderedIds) => {
      Store.reorderTasks(sprintId, orderedIds);
      Router.renderCurrent();
    });
  }

  function _updateBreadcrumb(text) {
    const el = document.getElementById('nav-breadcrumb');
    if (el) el.textContent = text;
  }

  return {
    render,
    openAddCategoryModal,
    openAddTaskModal,
    openEditTaskModal,
    filterByCategory,
    toggleNotes,
    afterRender
  };
})();
