const Router = (() => {
  let _currentSprintId = null;

  function parseHash() {
    const hash = location.hash.slice(1) || 'dashboard';
    const parts = hash.split('/');
    return { view: parts[0], param: parts[1] || null };
  }

  function navigate(path) {
    location.hash = path;
  }

  function render() {
    const { view, param } = parseHash();
    const app = document.getElementById('app');
    if (!app) return;

    if (view === 'sprint' && param) {
      _currentSprintId = param;
      app.innerHTML = SprintDetailView.render(param);
      SprintDetailView.afterRender(param);
    } else {
      _currentSprintId = null;
      app.innerHTML = DashboardView.render();
    }
  }

  function renderCurrent() {
    render();
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('load', render);

  return { navigate, render, renderCurrent, getCurrentSprintId: () => _currentSprintId };
})();
