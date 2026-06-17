const Store = (() => {
  const DEFAULT_STATE = {
    version: 2,
    theme: 'light',
    sprints: [],
    analytics: {
      totalFocusedMinutes: 0,
      totalSessions: 0,
      dailyLog: {}
    }
  };

  let state = null;
  let onWinCallback = null;
  let _saveTimer = null;

  function _migrateTask(task) {
    if (!('dayDate' in task))      task.dayDate = null;
    if (!('startTime' in task))    task.startTime = null;
    if (!('duration' in task))     task.duration = null;
    if (!('breakAfter' in task))   task.breakAfter = null;
    if (!('pomodoro' in task))     task.pomodoro = null;
    return task;
  }

  function _saveImmediate() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(err => console.error('[Store] save failed:', err));
  }

  function _save() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { _saveTimer = null; _saveImmediate(); }, 300);
  }

  async function load() {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('API error ' + res.status);
      const parsed = await res.json();

      if (!parsed.version || parsed.version < 1) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      } else {
        state = parsed;
        if (state.version < 2) {
          state.version = 2;
          if (!state.analytics) {
            state.analytics = { totalFocusedMinutes: 0, totalSessions: 0, dailyLog: {} };
          }
          state.sprints.forEach(s => s.tasks.forEach(t => _migrateTask(t)));
          _saveImmediate();
        }
      }

      // One-time migration: if server has empty state but localStorage has data, migrate it
      if ((!state.sprints || !state.sprints.length) && !Object.keys(state.analytics.dailyLog || {}).length) {
        const legacy = localStorage.getItem('planner-v1');
        if (legacy) {
          try {
            const legacyState = JSON.parse(legacy);
            if (legacyState.sprints && legacyState.sprints.length) {
              state = legacyState;
              _saveImmediate();
              localStorage.removeItem('planner-v1');
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error('[Store] load failed, using default state:', e);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function getState() { return state; }

  /* ── Sprint ─────────────────────────────────── */
  function createSprint(data) {
    const dates = data.type !== 'custom'
      ? Utils.computeSprintDates(data.type, data.startDate)
      : { startDate: data.startDate, endDate: data.endDate };

    const sprint = {
      id: Utils.generateId('spr'),
      name: data.name,
      type: data.type || 'week',
      startDate: dates.startDate,
      endDate: dates.endDate,
      targetScore: Number(data.targetScore) || 50,
      categories: [],
      tasks: [],
      won: false,
      createdAt: Date.now()
    };
    state.sprints.unshift(sprint);
    _save();
    return sprint;
  }

  function updateSprint(id, patch) {
    const sprint = _getSprint(id);
    if (!sprint) return;
    if (patch.targetScore !== undefined) patch.targetScore = Number(patch.targetScore) || sprint.targetScore;
    Object.assign(sprint, patch);
    if (patch.type && patch.type !== 'custom') {
      const dates = Utils.computeSprintDates(patch.type, sprint.startDate);
      sprint.startDate = dates.startDate;
      sprint.endDate = dates.endDate;
    }
    _save();
  }

  function deleteSprint(id) {
    state.sprints = state.sprints.filter(s => s.id !== id);
    _save();
  }

  function getSprint(id) {
    return state.sprints.find(s => s.id === id) || null;
  }

  /* ── Category ───────────────────────────────── */
  function createCategory(sprintId, data) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return null;
    const cat = {
      id: Utils.generateId('cat'),
      name: data.name,
      color: data.color || '#6366f1',
      emoji: data.emoji || ''
    };
    sprint.categories.push(cat);
    _save();
    return cat;
  }

  function updateCategory(sprintId, catId, patch) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return;
    const cat = sprint.categories.find(c => c.id === catId);
    if (cat) Object.assign(cat, patch);
    _save();
  }

  function deleteCategory(sprintId, catId) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return;
    sprint.categories = sprint.categories.filter(c => c.id !== catId);
    sprint.tasks.forEach(t => { if (t.categoryId === catId) t.categoryId = null; });
    _save();
  }

  /* ── Task ───────────────────────────────────── */
  function createTask(sprintId, data) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return null;
    const maxOrder = sprint.tasks.reduce((m, t) => Math.max(m, t.order || 0), -1);
    const task = {
      id: Utils.generateId('tsk'),
      title: data.title,
      categoryId: data.categoryId || null,
      priority: data.priority || 'medium',
      score: Number(data.score) || 5,
      completed: false,
      notes: data.notes || '',
      order: maxOrder + 1,
      createdAt: Date.now(),
      dayDate: data.dayDate || null,
      startTime: data.startTime || null,
      duration: data.duration ? Number(data.duration) : null,
      breakAfter: data.breakAfter ? Number(data.breakAfter) : null,
      pomodoro: data.pomodoro || null
    };
    sprint.tasks.push(task);
    _save();
    return task;
  }

  function updateTask(sprintId, taskId, patch) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return;
    const task = sprint.tasks.find(t => t.id === taskId);
    if (!task) return;

    const wasCompleted = task.completed;
    Object.assign(task, patch);

    if ('completed' in patch) {
      if (patch.completed && !wasCompleted) {
        logAnalytics(Utils.today(), { completedTasks: 1, score: task.score || 0 });
      }
      const current = getSprintScore(sprintId);
      if (!sprint.won && current >= sprint.targetScore) {
        sprint.won = true;
        if (onWinCallback) onWinCallback(sprint);
      }
    }

    _save();
  }

  function deleteTask(sprintId, taskId) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return;
    sprint.tasks = sprint.tasks.filter(t => t.id !== taskId);
    _save();
  }

  function reorderTasks(sprintId, orderedIds) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return;
    orderedIds.forEach((id, idx) => {
      const task = sprint.tasks.find(t => t.id === id);
      if (task) task.order = idx;
    });
    _save();
  }

  /* ── Analytics ──────────────────────────────── */
  function logAnalytics(date, data) {
    if (!state.analytics) state.analytics = { totalFocusedMinutes: 0, totalSessions: 0, dailyLog: {} };
    if (!state.analytics.dailyLog[date]) {
      state.analytics.dailyLog[date] = { focusedMinutes: 0, completedSessions: 0, completedTasks: 0, score: 0 };
    }
    const log = state.analytics.dailyLog[date];
    if (data.focusedMinutes)   { log.focusedMinutes   += data.focusedMinutes;   state.analytics.totalFocusedMinutes += data.focusedMinutes; }
    if (data.completedSessions){ log.completedSessions += data.completedSessions; state.analytics.totalSessions       += data.completedSessions; }
    if (data.completedTasks)   { log.completedTasks   += data.completedTasks; }
    if (data.score)            { log.score            += data.score; }
    _save();
  }

  /* ── Computed ───────────────────────────────── */
  function getSprintScore(sprintId) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return 0;
    return sprint.tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.score || 0), 0);
  }

  function getSortedTasks(sprintId) {
    const sprint = _getSprint(sprintId);
    if (!sprint) return [];
    return [...sprint.tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  function getAllTimeCompletedTasks() {
    return state.sprints.reduce((sum, s) => sum + s.tasks.filter(t => t.completed).length, 0);
  }

  /* ── Theme ──────────────────────────────────── */
  function setTheme(theme) {
    state.theme = theme;
    _save();
  }

  /* ── Internal ───────────────────────────────── */
  function _getSprint(id) {
    return state.sprints.find(s => s.id === id) || null;
  }

  function onWin(cb) { onWinCallback = cb; }

  // Flush pending save when tab is hidden or closed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _saveTimer !== null) _saveImmediate();
  });
  window.addEventListener('pagehide', () => {
    if (_saveTimer !== null) _saveImmediate();
  });

  return {
    load, getState, getSprint,
    createSprint, updateSprint, deleteSprint,
    createCategory, updateCategory, deleteCategory,
    createTask, updateTask, deleteTask, reorderTasks,
    getSprintScore, getSortedTasks, getAllTimeCompletedTasks,
    logAnalytics, setTheme, onWin
  };
})();
