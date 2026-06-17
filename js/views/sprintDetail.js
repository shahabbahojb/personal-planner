const SprintDetailView = (() => {
  const CAT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
  let _activeCatFilter = null;
  let _currentView = 'all';
  let _selectedDay = null;
  let _notesDebounce = null;

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
        ${sprint.won ? `<div class="win-banner"><div class="win-banner__icon">🏆</div><div class="win-banner__title">Sprint Complete!</div><div class="win-banner__sub">${score} pts — target reached</div></div>` : ''}
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
          <div class="stat-item"><span class="stat-value font-mono">${completedCount}</span><span class="stat-label">Completed</span></div>
          <div class="stat-item"><span class="stat-value font-mono">${remaining}</span><span class="stat-label">Remaining</span></div>
          <div class="stat-item"><span class="stat-value font-mono">${pct}%</span><span class="stat-label">Progress</span></div>
        </div>
        <div class="divider"></div>
        <div style="font-size:12px;color:var(--text-muted)">
          📅 ${Utils.formatDateRange(sprint.startDate, sprint.endDate)}
          &nbsp;·&nbsp;
          <span class="badge badge--${status}" style="vertical-align:middle">${{ active: 'Active', won: 'Won ✓', expired: 'Ended' }[status]}</span>
        </div>
        <button class="btn btn--ghost btn--sm" style="width:100%;margin-top:4px" data-action="edit-sprint" data-sprint-id="${sprint.id}">Edit Sprint</button>
      </div>`;

    /* Timeline */
    const timelineDate = _selectedDay || Utils.today();
    const timelineHtml = Timeline.render(tasks, { selectedDate: timelineDate, categories: sprint.categories });

    /* Category Panel */
    const activeCat = _activeCatFilter;
    const catChips = sprint.categories.map(c =>
      CategoryChip.render(c, { active: activeCat === c.id, showDelete: true, sprintId })
    ).join('');

    const catPanelHtml = `
      <div class="category-panel" id="category-panel">
        <span class="label-caps" style="margin-right:4px;flex-shrink:0">Filter:</span>
        <span class="category-chip${!activeCat ? ' active' : ''}" style="--chip-color:#6366f1"
          data-action="filter-category" data-cat-id="" data-sprint-id="${sprint.id}">All</span>
        ${catChips}
        <button class="btn btn--ghost btn--sm" data-action="add-category" data-sprint-id="${sprint.id}" style="margin-left:auto;flex-shrink:0">+ Category</button>
      </div>`;

    /* View toggle */
    const viewToggleHtml = `
      <div class="view-toggle" style="margin-bottom:var(--sp-4)">
        <button class="view-toggle__btn ${_currentView === 'all' ? 'view-toggle__btn--active' : ''}"
          data-action="switch-view" data-view="all">All Tasks</button>
        <button class="view-toggle__btn ${_currentView === 'day' ? 'view-toggle__btn--active' : ''}"
          data-action="switch-view" data-view="day">Day View</button>
      </div>`;

    /* Task list content */
    const filteredTasks = activeCat ? tasks.filter(t => t.categoryId === activeCat) : tasks;
    let taskContentHtml;

    if (_currentView === 'day') {
      taskContentHtml = _renderDayView(filteredTasks, sprint);
    } else {
      taskContentHtml = filteredTasks.length > 0
        ? `<div class="task-list" id="task-list">${filteredTasks.map(t => TaskItem.render(t, sprint)).join('')}</div>`
        : `<div class="empty-state" style="padding:var(--sp-8)">
            <div class="empty-state__icon">📝</div>
            <p class="empty-state__sub">${activeCat ? 'No tasks in this category.' : 'No tasks yet. Add one to get started!'}</p>
          </div>`;
    }

    return `
      <div style="margin-bottom:var(--sp-6);display:flex;align-items:center;gap:var(--sp-3)">
        <button class="btn btn--ghost btn--sm" data-action="back-to-dashboard">← Dashboard</button>
        <h2 class="page-title" style="flex:1;min-width:0" title="${Utils.escHtml(sprint.name)}">${Utils.escHtml(sprint.name)}</h2>
      </div>

      <div class="sprint-detail-layout">
        <div class="sprint-detail-main">
          ${catPanelHtml}
          <div style="margin-top:var(--sp-5)">
            <div class="section-header">
              <span class="section-title">Tasks (${tasks.length})</span>
              <div style="display:flex;gap:var(--sp-2)">
                ${viewToggleHtml}
                <button class="btn btn--primary btn--sm" data-action="add-task" data-sprint-id="${sprint.id}">+ Add Task</button>
              </div>
            </div>
            ${taskContentHtml}
          </div>
        </div>
        <div class="sprint-detail-sidebar">
          ${scorePanelHtml}
          ${timelineHtml}
        </div>
      </div>`;
  }

  function _renderDayView(tasks, sprint) {
    const byDay = {};
    tasks.forEach(t => {
      const key = t.dayDate || '__unscheduled__';
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(t);
    });

    const days = Object.keys(byDay)
      .filter(k => k !== '__unscheduled__')
      .sort();

    if ('__unscheduled__' in byDay) days.push('__unscheduled__');

    if (!days.length) {
      return `<div class="empty-state" style="padding:var(--sp-8)">
        <div class="empty-state__icon">📅</div>
        <p class="empty-state__sub">No tasks yet. Add tasks and assign them to days.</p>
      </div>`;
    }

    return days.map(day => {
      const dayTasks = byDay[day];
      const isUnscheduled = day === '__unscheduled__';
      const dayScore = dayTasks.filter(t => t.completed).reduce((s, t) => s + (t.score || 0), 0);
      const isSelected = !isUnscheduled && day === (_selectedDay || Utils.today());

      const header = isUnscheduled
        ? `<span class="day-group__title" style="color:var(--text-muted)">📌 Unscheduled</span>`
        : `<span class="day-group__title" style="cursor:pointer;${isSelected ? 'color:var(--accent)' : ''}"
            data-action="select-day" data-day="${day}">
            ${Utils.formatDayHeader(day)}
          </span>
          <span class="day-group__meta">${dayTasks.length} task${dayTasks.length !== 1 ? 's' : ''} · ${dayScore} pts</span>`;

      const taskRows = dayTasks.map(t => TaskItem.render(t, sprint)).join('');

      return `<div class="day-group">
        <div class="day-group__header">${header}</div>
        <div class="task-list day-task-list" data-day="${day}">${taskRows}</div>
      </div>`;
    }).join('');
  }

  /* ── Category Modal ─────────────────────────── */
  function openAddCategoryModal(sprintId) {
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

    const hasTime = !!(t.startTime);
    const hasPomo = !!(t.pomodoro);
    const p = t.pomodoro || {};

    Modal.open({
      title: isEdit ? 'Edit Task' : 'New Task',
      body: `
        <div class="form-group">
          <label class="form-label">Task title *</label>
          <input class="form-input" name="taskTitle" type="text" placeholder="What needs to be done?" maxlength="120" value="${Utils.escHtml(t.title || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Schedule to day</label>
          <input class="form-input" name="taskDay" type="date"
            min="${sprint.startDate}" max="${sprint.endDate}"
            value="${t.dayDate || ''}">
          <span class="form-hint">Leave blank for unscheduled</span>
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
        <div class="divider" style="margin:4px 0"></div>
        <div class="form-group" style="flex-direction:row;align-items:center;gap:8px">
          <input type="checkbox" id="chk-time" name="enableTime" ${hasTime ? 'checked' : ''} style="width:16px;height:16px">
          <label for="chk-time" style="font-size:13px;font-weight:600;cursor:pointer">⏱ Schedule a time</label>
        </div>
        <div id="time-section" style="display:${hasTime ? '' : 'none'};padding-left:24px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="form-group">
              <label class="form-label">Start time</label>
              <input class="form-input" name="startTime" type="time" value="${t.startTime || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Duration (min)</label>
              <input class="form-input" name="duration" type="number" min="1" value="${t.duration || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Break after (min)</label>
              <input class="form-input" name="breakAfter" type="number" min="0" value="${t.breakAfter || ''}">
            </div>
          </div>
        </div>
        <div class="form-group" style="flex-direction:row;align-items:center;gap:8px">
          <input type="checkbox" id="chk-pomo" name="enablePomodoro" ${hasPomo ? 'checked' : ''} style="width:16px;height:16px">
          <label for="chk-pomo" style="font-size:13px;font-weight:600;cursor:pointer">🍅 Pomodoro</label>
        </div>
        <div id="pomo-section" style="display:${hasPomo ? '' : 'none'};padding-left:24px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="form-group">
              <label class="form-label">Sessions</label>
              <input class="form-input" name="pomoSessions" type="number" min="1" max="12" value="${p.sessions || 4}">
            </div>
            <div class="form-group">
              <label class="form-label">Focus (min)</label>
              <input class="form-input" name="pomoFocus" type="number" min="1" value="${p.focusDuration || 25}">
            </div>
            <div class="form-group">
              <label class="form-label">Short break (min)</label>
              <input class="form-input" name="pomoShort" type="number" min="1" value="${p.shortBreak || 5}">
            </div>
            <div class="form-group">
              <label class="form-label">Long break (min)</label>
              <input class="form-input" name="pomoLong" type="number" min="1" value="${p.longBreak || 15}">
            </div>
          </div>
        </div>`,
      confirmLabel: isEdit ? 'Save Task' : 'Add Task',
      onConfirm: () => _submitTaskModal(sprintId, isEdit ? t.id : null, t)
    });

    setTimeout(() => {
      const chkTime = document.getElementById('chk-time');
      const timeSection = document.getElementById('time-section');
      chkTime?.addEventListener('change', () => {
        timeSection.style.display = chkTime.checked ? '' : 'none';
      });
      const chkPomo = document.getElementById('chk-pomo');
      const pomoSection = document.getElementById('pomo-section');
      chkPomo?.addEventListener('change', () => {
        pomoSection.style.display = chkPomo.checked ? '' : 'none';
      });
    }, 20);
  }

  function _submitTaskModal(sprintId, editId, existingTask) {
    const title = Modal.getValue('taskTitle');
    if (!title) { Toast.show('Task title is required', 'error'); return; }

    const categoryId = Modal.getValue('taskCat') || null;
    const priority = Modal.getValue('taskPriority') || 'medium';
    const score = Number(Modal.getValue('taskScore')) || 5;
    const dayDate = Modal.getValue('taskDay') || null;

    const enableTime = document.querySelector('[name="enableTime"]')?.checked;
    const startTime = enableTime ? (Modal.getValue('startTime') || null) : null;
    const duration = enableTime ? (Number(Modal.getValue('duration')) || null) : null;
    const breakAfter = enableTime ? (Number(Modal.getValue('breakAfter')) || null) : null;

    const enablePomo = document.querySelector('[name="enablePomodoro"]')?.checked;
    let pomodoro = null;
    if (enablePomo) {
      const existP = existingTask && existingTask.pomodoro;
      pomodoro = {
        sessions: Number(Modal.getValue('pomoSessions')) || 4,
        focusDuration: Number(Modal.getValue('pomoFocus')) || 25,
        shortBreak: Number(Modal.getValue('pomoShort')) || 5,
        longBreak: Number(Modal.getValue('pomoLong')) || 15,
        completedSessions: existP ? (existP.completedSessions || 0) : 0
      };
    }

    const patch = { title, categoryId, priority, score, dayDate, startTime, duration, breakAfter, pomodoro };

    if (editId) {
      Store.updateTask(sprintId, editId, patch);
      Toast.show('Task updated', 'success');
    } else {
      Store.createTask(sprintId, { ...patch, notes: '' });
      Toast.show('Task added!', 'success');
    }

    Modal.close();
    Router.renderCurrent();
  }

  /* ── Notes Modal ────────────────────────────── */
  function openNotesModal(sprintId, taskId) {
    const sprint = Store.getSprint(sprintId);
    if (!sprint) return;
    const task = sprint.tasks.find(t => t.id === taskId);
    if (!task) return;

    const rawNotes = task.notes || '';

    Modal.open({
      title: Utils.escHtml(task.title),
      body: `
        <div class="tab-bar">
          <button class="tab-btn tab-btn--active" id="tab-edit" data-action="notes-tab" data-tab="edit">✎ Edit</button>
          <button class="tab-btn" id="tab-preview" data-action="notes-tab" data-tab="preview">👁 Preview</button>
        </div>
        <div id="notes-edit-pane">
          <textarea class="form-textarea notes-editor" name="notesContent" placeholder="Write your notes in Markdown...">${Utils.escHtml(rawNotes)}</textarea>
        </div>
        <div id="notes-preview-pane" class="markdown-preview hidden"></div>`,
      confirmLabel: 'Done',
      cancelLabel: '',
      size: 'large',
      onConfirm: () => {
        _saveNotes(sprintId, taskId);
        Modal.close();
        Router.renderCurrent();
      }
    });

    setTimeout(() => {
      const modal = document.getElementById('modal');
      const textarea = modal?.querySelector('[name="notesContent"]');
      if (textarea) {
        textarea.addEventListener('input', () => {
          clearTimeout(_notesDebounce);
          _notesDebounce = setTimeout(() => {
            Store.updateTask(sprintId, taskId, { notes: textarea.value });
            const preview = document.getElementById('notes-preview-pane');
            if (preview && !preview.classList.contains('hidden')) {
              preview.innerHTML = Markdown.render(textarea.value);
            }
          }, 500);
        });
      }
    }, 20);
  }

  function switchNotesTab(tab) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    const editPane = document.getElementById('notes-edit-pane');
    const previewPane = document.getElementById('notes-preview-pane');
    const tabEdit = document.getElementById('tab-edit');
    const tabPreview = document.getElementById('tab-preview');

    if (tab === 'preview') {
      const textarea = modal.querySelector('[name="notesContent"]');
      if (previewPane && textarea) {
        previewPane.innerHTML = Markdown.render(textarea.value);
      }
      editPane?.classList.add('hidden');
      previewPane?.classList.remove('hidden');
      tabEdit?.classList.remove('tab-btn--active');
      tabPreview?.classList.add('tab-btn--active');
    } else {
      editPane?.classList.remove('hidden');
      previewPane?.classList.add('hidden');
      tabEdit?.classList.add('tab-btn--active');
      tabPreview?.classList.remove('tab-btn--active');
    }
  }

  function _saveNotes(sprintId, taskId) {
    const textarea = document.querySelector('[name="notesContent"]');
    if (textarea) Store.updateTask(sprintId, taskId, { notes: textarea.value });
  }

  /* ── View switching ─────────────────────────── */
  function switchView(view) {
    _currentView = view;
    Router.renderCurrent();
  }

  function selectDay(day) {
    _selectedDay = day;
    Router.renderCurrent();
  }

  /* ── Filter ─────────────────────────────────── */
  function filterByCategory(catId) {
    _activeCatFilter = catId || null;
    Router.renderCurrent();
  }

  /* ── After render hook ──────────────────────── */
  function afterRender(sprintId) {
    if (!sprintId) return;
    if (_currentView === 'all') {
      Utils.initDragDrop('#task-list', (orderedIds) => {
        Store.reorderTasks(sprintId, orderedIds);
        Router.renderCurrent();
      });
    } else {
      document.querySelectorAll('.day-task-list').forEach(list => {
        Utils.initDragDrop(`[data-day="${list.dataset.day}"]`, (orderedIds) => {
          Store.reorderTasks(sprintId, orderedIds);
          Router.renderCurrent();
        });
      });
    }
  }

  function _updateBreadcrumb(text) {
    const el = document.getElementById('nav-breadcrumb');
    if (el) el.textContent = text;
  }

  return {
    render, afterRender,
    openAddCategoryModal,
    openAddTaskModal, openEditTaskModal,
    openNotesModal, switchNotesTab,
    switchView, selectDay,
    filterByCategory
  };
})();
