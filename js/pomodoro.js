const Pomodoro = (() => {
  const _STORAGE_KEY = 'pomodoro-active-v1';

  let _state = {
    taskId: null, sprintId: null, taskTitle: null,
    phase: 'idle',
    sessionIndex: 0, totalSessions: 4,
    focusDuration: 25, shortBreak: 5, longBreak: 15,
    secondsLeft: 0, isRunning: false, isOvertime: false,
    _interval: null
  };

  let _overtimeFired = false;
  let _onTickCb = null;
  let _onSessionCompleteCb = null;
  let _onBreakCompleteCb = null;

  function _phaseDuration() {
    if (_state.phase === 'focus')      return _state.focusDuration * 60;
    if (_state.phase === 'shortBreak') return _state.shortBreak * 60;
    if (_state.phase === 'longBreak')  return _state.longBreak * 60;
    return 0;
  }

  function _nextPhase() {
    const plannedSec = _phaseDuration();
    const actualSeconds = plannedSec + Math.max(0, -_state.secondsLeft);

    if (_state.phase === 'focus') {
      if (_onSessionCompleteCb) _onSessionCompleteCb({ ..._state, actualSeconds });
      _state.sessionIndex++;
      _state.phase = _state.sessionIndex >= _state.totalSessions ? 'longBreak' : 'shortBreak';
    } else if (_state.phase === 'shortBreak') {
      if (_onBreakCompleteCb) _onBreakCompleteCb({ ..._state, actualSeconds });
      _state.phase = 'focus';
    } else if (_state.phase === 'longBreak') {
      if (_onBreakCompleteCb) _onBreakCompleteCb({ ..._state, actualSeconds });
      stop();
      return;
    }

    _state.isOvertime = false;
    _overtimeFired = false;
    _state.secondsLeft = _phaseDuration();
    _beep();
    _notify();
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function _tick() {
    if (!_state.isRunning) return;
    _state.secondsLeft--;
    document.title = _formatTime(_state.secondsLeft) + ' — Planner';

    // Enter overtime: notify once, then keep running
    if (_state.secondsLeft < 0 && !_overtimeFired) {
      _state.isOvertime = true;
      _overtimeFired = true;
      _beep();
      _notify();
    }

    _saveToLocalStorage();
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function _formatTime(s) {
    const abs = Math.abs(s);
    const m = Math.floor(abs / 60);
    const sec = abs % 60;
    const str = String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    return s < 0 ? '+' + str : str;
  }

  function _beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  function _notify() {
    const labels = {
      focus:      'Focus session complete! Take a break.',
      shortBreak: 'Short break done — focus time!',
      longBreak:  'All sessions complete! Great work! 🎉'
    };
    const msg = labels[_state.phase] || 'Timer done';
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('⚡ Planner', { body: msg, icon: '' });
    }
    if (typeof Toast !== 'undefined') Toast.show(msg, 'success', 4000);
  }

  function _saveToLocalStorage() {
    try {
      localStorage.setItem(_STORAGE_KEY, JSON.stringify({
        taskId: _state.taskId, sprintId: _state.sprintId, taskTitle: _state.taskTitle,
        phase: _state.phase,
        sessionIndex: _state.sessionIndex, totalSessions: _state.totalSessions,
        focusDuration: _state.focusDuration, shortBreak: _state.shortBreak, longBreak: _state.longBreak,
        secondsLeft: _state.secondsLeft,
        isRunning: _state.isRunning,
        isOvertime: _state.isOvertime,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function start(task, sprintId) {
    stop();
    try { localStorage.removeItem(_STORAGE_KEY); } catch (e) {}
    const cfg = task.pomodoro || {};
    _state = {
      taskId: task.id, sprintId,
      taskTitle: task.title,
      phase: 'focus',
      sessionIndex: 0,
      totalSessions: cfg.sessions || 4,
      focusDuration: cfg.focusDuration || 25,
      shortBreak: cfg.shortBreak || 5,
      longBreak: cfg.longBreak || 15,
      secondsLeft: (cfg.focusDuration || 25) * 60,
      isRunning: true,
      isOvertime: false,
      _interval: null
    };
    _overtimeFired = false;
    _state._interval = setInterval(_tick, 1000);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function pause() {
    if (!_state.isRunning) return;
    _state.isRunning = false;
    clearInterval(_state._interval);
    _state._interval = null;
    _saveToLocalStorage();
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function resume() {
    if (_state.isRunning || _state.phase === 'idle') return;
    _state.isRunning = true;
    _state._interval = setInterval(_tick, 1000);
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function skip() {
    if (_state.phase === 'idle') return;
    _nextPhase();
  }

  function stop() {
    clearInterval(_state._interval);
    _state.isRunning = false;
    _state.phase = 'idle';
    _state.taskId = null;
    _state.isOvertime = false;
    _state._interval = null;
    _overtimeFired = false;
    try { localStorage.removeItem(_STORAGE_KEY); } catch (e) {}
    document.title = 'Planner — Smart Sprint Tracker';
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function restore(savedData) {
    clearInterval(_state._interval);
    const elapsedSeconds = Math.floor((Date.now() - savedData.savedAt) / 1000);
    const secondsLeft = savedData.secondsLeft - elapsedSeconds;
    _state = {
      taskId:       savedData.taskId,
      sprintId:     savedData.sprintId,
      taskTitle:    savedData.taskTitle,
      phase:        savedData.phase,
      sessionIndex: savedData.sessionIndex,
      totalSessions: savedData.totalSessions,
      focusDuration: savedData.focusDuration,
      shortBreak:   savedData.shortBreak,
      longBreak:    savedData.longBreak,
      secondsLeft,
      isRunning:    false,
      isOvertime:   secondsLeft < 0,
      _interval:    null
    };
    _overtimeFired = secondsLeft < 0; // don't re-fire the overtime notification
    if (savedData.isRunning) {
      resume();
    } else {
      if (_onTickCb) _onTickCb({ ..._state });
    }
  }

  function getState() { return { ..._state }; }

  function onTick(cb)            { _onTickCb = cb; }
  function onSessionComplete(cb) { _onSessionCompleteCb = cb; }
  function onBreakComplete(cb)   { _onBreakCompleteCb = cb; }

  function formatTime(s) { return _formatTime(s); }

  return { start, pause, resume, skip, stop, restore, getState, onTick, onSessionComplete, onBreakComplete, formatTime };
})();
