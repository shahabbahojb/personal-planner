const Modal = (() => {
  let _confirmCb = null;

  function open({ title, body, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    _confirmCb = onConfirm || null;

    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');

    let html = `
      <div class="modal__header">
        <span class="modal__title"></span>
        <button class="modal__close" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="modal__body">${body}</div>
      <div class="modal__footer">
        <button class="btn btn--ghost" data-action="close-modal">${cancelLabel}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="modal-confirm">${confirmLabel}</button>
      </div>
    `;

    modal.innerHTML = html;
    modal.querySelector('.modal__title').textContent = title;
    overlay.classList.remove('hidden');

    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  function close() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    _confirmCb = null;
  }

  function confirm() {
    if (_confirmCb) _confirmCb();
  }

  function getField(name) {
    const modal = document.getElementById('modal');
    if (!modal) return null;
    return modal.querySelector(`[name="${name}"]`);
  }

  function getValue(name) {
    const modal = document.getElementById('modal');
    if (!modal) return '';
    const radio = modal.querySelector(`[name="${name}"]:checked`);
    if (radio && radio.type === 'radio') return radio.value;
    const el = modal.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  }

  return { open, close, confirm, getField, getValue };
})();
