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

  /* ── Time helpers ──────────────────────────── */
  function timeToMinutes(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function minutesToTime(mins) {
    const total = Math.max(0, mins) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function formatDuration(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  function computeEndTime(startTime, duration) {
    if (!startTime || !duration) return null;
    return minutesToTime(timeToMinutes(startTime) + Number(duration));
  }

  function formatDayHeader(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function getLast7Days() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
  }

  function computeStreak(dailyLog) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      const log = dailyLog[key];
      if (!log || (log.focusedMinutes === 0 && log.completedSessions === 0 && log.completedTasks === 0)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  return { generateId, today, addDays, computeSprintDates, formatDate, formatDateRange, sprintStatus, scorePercent, escHtml, setTextContent, initDragDrop, timeToMinutes, minutesToTime, formatDuration, computeEndTime, formatDayHeader, getLast7Days, computeStreak };
})();
