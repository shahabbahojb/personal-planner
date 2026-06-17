const Utils = (() => {
  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(isoDate, n) {
    const d = new Date(isoDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function lastDayOfMonth(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }

  function computeSprintDates(type, startDate) {
    const start = startDate || today();
    switch (type) {
      case 'day':   return { startDate: start, endDate: start };
      case 'week':  return { startDate: start, endDate: addDays(start, 6) };
      case 'month': return { startDate: start, endDate: lastDayOfMonth(start) };
      default:      return { startDate: start, endDate: addDays(start, 6) };
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateRange(start, end) {
    if (start === end) return formatDate(start);
    return formatDate(start) + ' – ' + formatDate(end);
  }

  function sprintStatus(sprint) {
    if (sprint.won) return 'won';
    const now = today();
    if (sprint.endDate < now) return 'expired';
    return 'active';
  }

  function scorePercent(current, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setTextContent(el, text) {
    if (el) el.textContent = text;
  }

  /* ── Drag and Drop ─────────────────────────── */
  let dragSrc = null;

  function initDragDrop(listSelector, onReorder) {
    const list = document.querySelector(listSelector);
    if (!list) return;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    list.addEventListener('dragend', (e) => {
      const item = e.target.closest('.task-item');
      if (item) item.classList.remove('dragging');
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragSrc = null;
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.task-item');
      if (!target || target === dragSrc) return;
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      target.classList.add('drag-over');
    });

    list.addEventListener('dragleave', (e) => {
      const target = e.target.closest('.task-item');
      if (target) target.classList.remove('drag-over');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.task-item');
      if (!target || !dragSrc || target === dragSrc) return;

      const items = Array.from(list.querySelectorAll('.task-item'));
      const srcIdx = items.indexOf(dragSrc);
      const tgtIdx = items.indexOf(target);

      const orderedIds = items.map(el => el.dataset.taskId);
      orderedIds.splice(srcIdx, 1);
      orderedIds.splice(tgtIdx, 0, dragSrc.dataset.taskId);

      target.classList.remove('drag-over');
      onReorder(orderedIds);
    });
  }

  return { generateId, today, addDays, computeSprintDates, formatDate, formatDateRange, sprintStatus, scorePercent, escHtml, setTextContent, initDragDrop };
})();
