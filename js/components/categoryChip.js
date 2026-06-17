const CategoryChip = (() => {
  function render(cat, { active = false, showDelete = false, sprintId = '' } = {}) {
    const color = Utils.escHtml(cat.color || '#6366f1');
    const name = Utils.escHtml(cat.name);
    const emoji = cat.emoji ? Utils.escHtml(cat.emoji) + ' ' : '';

    let html = `<span class="category-chip${active ? ' active' : ''}"
      style="--chip-color:${color}"
      data-action="filter-category"
      data-cat-id="${cat.id}"
      data-sprint-id="${sprintId}">
      ${emoji}${name}`;

    if (showDelete) {
      html += ` <button class="btn btn--icon-sm" style="background:none;border:none;color:inherit;padding:0 0 0 4px;font-size:11px;opacity:0.7;cursor:pointer;"
        data-action="delete-category"
        data-cat-id="${cat.id}"
        data-sprint-id="${sprintId}"
        title="Delete category">✕</button>`;
    }

    html += '</span>';
    return html;
  }

  return { render };
})();
