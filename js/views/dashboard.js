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
        <div style="display:flex;gap:var(--sp-2)">
          <button class="btn btn--ghost btn--sm" data-action="open-analytics">📊 Analytics</button>
          <button class="btn btn--primary" data-action="add-sprint">+ New Sprint</button>
        </div>
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
        <div class="form-group">
          <label class="form-label">Start date</label>
          <div class="input-icon-wrap">
            <span class="input-icon-wrap__icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </span>
            <input class="form-input" name="startDate" type="date" value="${startVal}" style="cursor:pointer">
            <span class="input-icon-wrap__trigger">
              <svg width="12" height="12" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
          </div>
        </div>
        <div class="form-group" id="end-date-group" style="display:${typeVal === 'custom' ? '' : 'none'}">
          <label class="form-label">End date</label>
          <div class="input-icon-wrap">
            <span class="input-icon-wrap__icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </span>
            <input class="form-input" name="endDate" type="date" value="${endVal}" style="cursor:pointer">
            <span class="input-icon-wrap__trigger">
              <svg width="12" height="12" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Target score (pts to win)</label>
        <div class="input-with-suffix" style="max-width:180px">
          <input class="form-input" name="targetScore" type="number" min="1" value="${s.targetScore || 50}" placeholder="50">
          <span class="input-suffix">pts</span>
        </div>
        <span class="form-hint">ℹ Each completed task gives its score value. Reach this to win!</span>
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
