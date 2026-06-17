const Pomodoro = (() => {
  let _state = {
    taskId: null, sprintId: null,
    phase: 'idle',
    sessionIndex: 0, totalSessions: 4,
    focusDuration: 25, shortBreak: 5, longBreak: 15,
    secondsLeft: 0, isRunning: false, _interval: null
  };

  let _onTickCb = null;
  let _onSessionCompleteCb = null;

  function _phaseDuration() {
    if (_state.phase === 'focus') return _state.focusDuration * 60;
    if (_state.phase === 'shortBreak') return _state.shortBreak * 60;
    if (_state.phase === 'longBreak') return _state.longBreak * 60;
    return 0;
  }

  function _nextPhase() {
    if (_state.phase === 'focus') {
      if (_onSessionCompleteCb) _onSessionCompleteCb({ ..._state });
      _state.sessionIndex++;
      if (_state.sessionIndex >= _state.totalSessions) {
        _state.phase = 'longBreak';
      } else {
        _state.phase = 'shortBreak';
      }
    } else if (_state.phase === 'shortBreak') {
      _state.phase = 'focus';
    } else if (_state.phase === 'longBreak') {
      stop();
      return;
    }
    _state.secondsLeft = _phaseDuration();
    _beep();
    _notify();
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function _tick() {
    if (!_state.isRunning) return;
    _state.secondsLeft--;
    document.title = _formatTime(_state.secondsLeft) + ' — Planner';
    if (_state.secondsLeft <= 0) {
      _nextPhase();
    } else {
      if (_onTickCb) _onTickCb({ ..._state });
    }
  }

  function _formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
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
    const labels = { focus: 'Focus session complete!', shortBreak: 'Short break done — focus time!', longBreak: 'All sessions complete! Great work! 🎉' };
    const msg = labels[_state.phase] || 'Timer done';
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('⚡ Planner', { body: msg, icon: '' });
    }
    if (typeof Toast !== 'undefined') Toast.show(msg, 'success', 4000);
  }

  function start(task, sprintId) {
    stop();
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
      _interval: null
    };
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
    _state._interval = null;
    document.title = 'Planner — Smart Sprint Tracker';
    if (_onTickCb) _onTickCb({ ..._state });
  }

  function getState() { return { ..._state }; }

  function onTick(cb) { _onTickCb = cb; }
  function onSessionComplete(cb) { _onSessionCompleteCb = cb; }

  function formatTime(s) { return _formatTime(s); }

  return { start, pause, resume, skip, stop, getState, onTick, onSessionComplete, formatTime };
})();
