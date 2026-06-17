/* Bootstrap */
(async function () {
  /* Load store from API */
  await Store.load();

  /* Apply saved theme */
  if (Store.getState().theme === 'dark') {
    document.documentElement.classList.add('dark');
  }

  /* Win callback */
  Store.onWin((sprint) => {
    Confetti.burst();
    Toast.show('Sprint won! Target reached! 🎉', 'success', 5000);
  });

  /* Pomodoro callbacks */
  Pomodoro.onTick((state) => {
    PomodoroWidget.update(state);
  });

  Pomodoro.onSessionComplete((state) => {
    const today = Utils.today();
    const sprint = Store.getSprint(state.sprintId);
    const task = sprint && sprint.tasks.find(t => t.id === state.taskId);
    if (task && task.pomodoro) {
      const completed = Math.min((task.pomodoro.completedSessions || 0) + 1, task.pomodoro.sessions);
      Store.updateTask(state.sprintId, state.taskId, {
        pomodoro: { ...task.pomodoro, completedSessions: completed }
      });
    }
    Store.logAnalytics(today, { focusedMinutes: state.focusDuration, completedSessions: 1 });
  });

  /* ── Global click delegation ──────────────── */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const sprintId = el.dataset.sprintId || Router.getCurrentSprintId();
    const taskId = el.dataset.taskId;
    const catId = el.dataset.catId;

    switch (action) {
      /* Navigation */
      case 'open-sprint':
        e.preventDefault();
        Router.navigate('#sprint/' + el.dataset.sprintId);
        break;

      case 'back-to-dashboard':
        e.preventDefault();
        Router.navigate('#dashboard');
        break;

      /* Theme */
      case 'toggle-theme': {
        const isDark = document.documentElement.classList.toggle('dark');
        Store.setTheme(isDark ? 'dark' : 'light');
        const icon = document.querySelector('.theme-icon');
        if (icon) icon.textContent = isDark ? '☽' : '☀';
        break;
      }

      /* Modal */
      case 'close-modal':
        Modal.close();
        break;

      case 'close-modal-backdrop':
        if (e.target === el) Modal.close();
        break;

      case 'modal-confirm':
        e.preventDefault();
        Modal.confirm();
        break;

      /* Sprint actions */
      case 'add-sprint':
        DashboardView.openCreateModal();
        break;

      case 'edit-sprint': {
        const sid = el.dataset.sprintId;
        if (!sid) break;
        DashboardView.openEditModal(sid);
        break;
      }

      case 'delete-sprint': {
        const sid = el.dataset.sprintId;
        if (!sid) break;
        const sprint = Store.getSprint(sid);
        if (!sprint) break;
        Modal.open({
          title: 'Delete Sprint',
          body: `<p>Delete <strong>${Utils.escHtml(sprint.name)}</strong>? This will remove all tasks inside it. This cannot be undone.</p>`,
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          danger: true,
          onConfirm: () => {
            Store.deleteSprint(sid);
            Modal.close();
            if (Router.getCurrentSprintId() === sid) {
              Router.navigate('#dashboard');
            } else {
              Router.renderCurrent();
            }
            Toast.show('Sprint deleted', 'info');
          }
        });
        break;
      }

      /* Task actions */
      case 'add-task':
        SprintDetailView.openAddTaskModal(sprintId);
        break;

      case 'edit-task':
        SprintDetailView.openEditTaskModal(sprintId, taskId);
        break;

      case 'delete-task': {
        const sprint = Store.getSprint(sprintId);
        const task = sprint && sprint.tasks.find(t => t.id === taskId);
        if (!task) break;
        Modal.open({
          title: 'Delete Task',
          body: `<p>Delete "<strong>${Utils.escHtml(task.title)}</strong>"? This cannot be undone.</p>`,
          confirmLabel: 'Delete',
          danger: true,
          onConfirm: () => {
            Store.deleteTask(sprintId, taskId);
            Modal.close();
            Router.renderCurrent();
            Toast.show('Task deleted', 'info');
          }
        });
        break;
      }

      case 'toggle-task': {
        const checkbox = el;
        const isCompleted = checkbox.checked;
        Store.updateTask(sprintId, taskId, { completed: isCompleted });
        // Animate the score label
        const scoreEl = document.getElementById('score-current');
        if (scoreEl) {
          scoreEl.classList.remove('animate-pulse');
          void scoreEl.offsetWidth; // reflow
          scoreEl.textContent = Store.getSprintScore(sprintId);
          scoreEl.classList.add('animate-pulse');
        }
        // Delay re-render slightly so checkbox animation is visible
        setTimeout(() => Router.renderCurrent(), 200);
        break;
      }

      case 'open-notes':
        SprintDetailView.openNotesModal(sprintId, taskId);
        break;

      case 'notes-tab':
        SprintDetailView.switchNotesTab(el.dataset.tab);
        break;

      case 'switch-view':
        SprintDetailView.switchView(el.dataset.view);
        break;

      case 'select-day':
        SprintDetailView.selectDay(el.dataset.day);
        break;

      case 'open-analytics':
        e.preventDefault();
        Router.navigate('#analytics');
        break;

      case 'start-pomodoro': {
        const sprint = Store.getSprint(sprintId);
        const task = sprint && sprint.tasks.find(t => t.id === taskId);
        if (!task) break;
        Pomodoro.start(task, sprintId);
        PomodoroWidget.update(Pomodoro.getState());
        break;
      }

      case 'pomodoro-pause': {
        const st = Pomodoro.getState();
        if (st.isRunning) Pomodoro.pause(); else Pomodoro.resume();
        PomodoroWidget.update(Pomodoro.getState());
        break;
      }

      case 'pomodoro-skip':
        Pomodoro.skip();
        PomodoroWidget.update(Pomodoro.getState());
        break;

      case 'pomodoro-stop':
        Pomodoro.stop();
        PomodoroWidget.hide();
        break;

      /* Category actions */
      case 'add-category':
        SprintDetailView.openAddCategoryModal(sprintId);
        break;

      case 'delete-category': {
        const sprint = Store.getSprint(sprintId);
        const cat = sprint && sprint.categories.find(c => c.id === catId);
        if (!cat) break;
        Modal.open({
          title: 'Delete Category',
          body: `<p>Delete category "<strong>${Utils.escHtml(cat.name)}</strong>"? Tasks in this category will become uncategorized.</p>`,
          confirmLabel: 'Delete',
          danger: true,
          onConfirm: () => {
            Store.deleteCategory(sprintId, catId);
            Modal.close();
            Router.renderCurrent();
            Toast.show('Category deleted', 'info');
          }
        });
        break;
      }

      case 'filter-category':
        SprintDetailView.filterByCategory(catId || null);
        break;
    }
  });

  /* ── Update theme icon on load ────────────── */
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = Store.getState().theme === 'dark' ? '☽' : '☀';

  /* Initial render — replaces the window load listener removed from router.js */
  Router.renderCurrent();
})();
