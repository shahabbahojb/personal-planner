const DashboardView = (() => {
  const CAT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

  function render() {
    const { sprints } = Store.getState();
    _updateBreadcrumb('Dashboard');

    if (!sprints.length) {
      return `
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-title">Your Sprints</h1>
            <p class="page-sub">Create a sprint to start planning your time.</p>
          </div>
          <button class="btn btn--primary" data-action="add-sprint">+ New Sprint</button>
        </div>
        <div class="empty-state animate-fade-in">
          <div class="empty-state__icon">🚀</div>
          <h2 class="empty-state__title">No sprints yet</h2>
          <p class="empty-state__sub">A sprint is a focused time block — a week to study, a month to build something. Start one!</p>
          <button class="btn btn--primary" data-action="add-sprint">+ Create your first sprint</button>
        </div>`;
    }

    const cards = sprints.map(s => SprintCard.render(s)).join('');

    return `
      <div class="page-header">
        <div class="page-header__left">
          <h1 class="page-title">Your Sprints</h1>
          <p class="page-sub">${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn--primary" data-action="add-sprint">+ New Sprint</button>
      </div>
      <div class="sprint-grid">${cards}</div>`;
  }

  /* ── Create/Edit Sprint Modal ───────────────── */
  function openCreateModal() {
    const today = Utils.today();
    _openSprintModal({ mode: 'create', today });
  }

  function openEditModal(sprintId) {
    const sprint = Store.getSprint(sprintId);
    if (!sprint) return;
    _openSprintModal({ mode: 'edit', sprint });
  }

  function _openSprintModal({ mode, sprint, today }) {
    const isEdit = mode === 'edit';
    const s = sprint || {};
    const startVal = s.startDate || (today || Utils.today());
    const endVal = s.endDate || '';
    const typeVal = s.type || 'week';

    const body = `
      <div class="form-group">
        <label class="form-label">Sprint name *</label>
        <input class="form-input" name="name" type="text" placeholder="e.g. Exam Week, June Build" maxlength="60" value="${Utils.escHtml(s.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Duration type</label>
        <div class="radio-group">
          ${['day', 'week', 'month', 'custom'].map(t => `
            <div class="radio-option">
              <input type="radio" name="type" id="type-${t}" value="${t}" ${typeVal === t ? 'checked' : ''}>
              <label for="type-${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</label>
            </div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Start date</label>
        <input class="form-input" name="startDate" type="date" value="${startVal}">
      </div>
      <div class="form-group" id="end-date-group" style="display:${typeVal === 'custom' ? '' : 'none'}">
        <label class="form-label">End date</label>
        <input class="form-input" name="endDate" type="date" value="${endVal}">
      </div>
      <div class="form-group">
        <label class="form-label">Target score (pts to win)</label>
        <input class="form-input" name="targetScore" type="number" min="1" value="${s.targetScore || 50}" placeholder="50">
        <span class="form-hint">Each completed task gives its score value. Reach this to win the sprint!</span>
      </div>`;

    Modal.open({
      title: isEdit ? 'Edit Sprint' : 'New Sprint',
      body,
      confirmLabel: isEdit ? 'Save changes' : 'Create Sprint',
      onConfirm: () => _submitSprintModal(isEdit ? s.id : null)
    });

    // Wire type radio → show/hide end date
    setTimeout(() => {
      const radios = document.querySelectorAll('[name="type"]');
      const endGroup = document.getElementById('end-date-group');
      radios.forEach(r => r.addEventListener('change', () => {
        if (endGroup) endGroup.style.display = r.value === 'custom' ? '' : 'none';
      }));
    }, 20);
  }

  function _submitSprintModal(editId) {
    const name = Modal.getValue('name');
    if (!name) { Toast.show('Sprint name is required', 'error'); return; }

    const type = Modal.getValue('type') || 'week';
    const startDate = Modal.getValue('startDate') || Utils.today();
    const endDate = Modal.getValue('endDate');
    const targetScore = Number(Modal.getValue('targetScore')) || 50;

    if (type === 'custom' && !endDate) {
      Toast.show('End date is required for custom sprints', 'error');
      return;
    }

    if (type === 'custom' && endDate < startDate) {
      Toast.show('End date must be after start date', 'error');
      return;
    }

    if (editId) {
      Store.updateSprint(editId, { name, type, startDate, endDate: type === 'custom' ? endDate : undefined, targetScore });
      Toast.show('Sprint updated', 'success');
    } else {
      Store.createSprint({ name, type, startDate, endDate: type === 'custom' ? endDate : undefined, targetScore });
      Toast.show('Sprint created!', 'success');
    }

    Modal.close();
    Router.renderCurrent();
  }

  function _updateBreadcrumb(text) {
    const el = document.getElementById('nav-breadcrumb');
    if (el) el.textContent = text;
  }

  return { render, openCreateModal, openEditModal };
})();
