const Timeline = (() => {
  const CX = 110, CY = 110, OR = 88, IR = 60;

  function polarToXY(r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function arcPath(outerR, innerR, startDeg, endDeg) {
    const span = endDeg - startDeg;
    const large = span > 180 ? 1 : 0;
    const o1 = polarToXY(outerR, startDeg);
    const o2 = polarToXY(outerR, endDeg);
    const i1 = polarToXY(innerR, endDeg);
    const i2 = polarToXY(innerR, startDeg);
    const f = n => n.toFixed(3);
    return `M ${f(o1.x)} ${f(o1.y)} A ${outerR} ${outerR} 0 ${large} 1 ${f(o2.x)} ${f(o2.y)} L ${f(i1.x)} ${f(i1.y)} A ${innerR} ${innerR} 0 ${large} 0 ${f(i2.x)} ${f(i2.y)} Z`;
  }

  function minutesToDeg(mins) {
    return (mins / 1440) * 360;
  }

  function render(tasks, { selectedDate, categories } = {}) {
    const today = selectedDate || Utils.today();
    const scheduled = tasks.filter(t => t.startTime && t.duration && t.dayDate === today);

    let totalMins = 0;
    const paths = [];

    scheduled.forEach(t => {
      const cat = categories && t.categoryId ? categories.find(c => c.id === t.categoryId) : null;
      const color = cat ? cat.color : 'var(--accent)';
      const startMins = Utils.timeToMinutes(t.startTime);
      const endMins = startMins + Number(t.duration);
      totalMins += Number(t.duration);

      const startDeg = minutesToDeg(startMins);
      const endDeg = minutesToDeg(Math.min(endMins, 1440));
      const minSpan = 4;
      const finalEndDeg = Math.max(endDeg, startDeg + minSpan);

      const label = Utils.escHtml(t.title) + ' ' + t.startTime + '–' + Utils.computeEndTime(t.startTime, t.duration);
      const completedOp = t.completed ? '0.5' : '1';

      paths.push(`<path d="${arcPath(OR, IR, startDeg, finalEndDeg)}"
        fill="${color}" opacity="${completedOp}"
        style="cursor:pointer;transition:opacity 0.15s"
        onmouseenter="this.style.opacity='1'"
        onmouseleave="this.style.opacity='${completedOp}'"
        data-action="timeline-task" data-task-id="${t.id}">
        <title>${label}</title>
      </path>`);

      if (t.breakAfter) {
        const breakStart = minutesToDeg(endMins);
        const breakEnd = minutesToDeg(Math.min(endMins + Number(t.breakAfter), 1440));
        if (breakEnd > breakStart) {
          paths.push(`<path d="${arcPath(OR, IR, breakStart, Math.max(breakEnd, breakStart + 2))}"
            fill="${color}" opacity="0.2">
            <title>Break: ${Utils.formatDuration(t.breakAfter)}</title>
          </path>`);
        }
      }
    });

    const ticks = Array.from({ length: 24 }, (_, h) => {
      const deg = (h / 24) * 360;
      const isMajor = h % 6 === 0;
      const tickOR = isMajor ? OR + 8 : OR + 5;
      const p1 = polarToXY(OR + 1, deg);
      const p2 = polarToXY(tickOR, deg);
      return `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="var(--border-strong)" stroke-width="${isMajor ? 1.5 : 0.8}" opacity="0.6"/>`;
    }).join('');

    const hourLabels = [0, 6, 12, 18].map(h => {
      const deg = (h / 24) * 360;
      const pos = polarToXY(OR + 16, deg);
      return `<text x="${pos.x.toFixed(2)}" y="${pos.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="var(--text-muted)" font-family="var(--font-mono)">${h === 0 ? '24' : h}h</text>`;
    }).join('');

    const centerText = totalMins > 0
      ? `<text x="${CX}" y="${CY - 6}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="var(--text-primary)" font-family="var(--font-mono)">${Utils.formatDuration(totalMins)}</text>
         <text x="${CX}" y="${CY + 10}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="var(--text-muted)">planned</text>`
      : `<text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--text-muted)">No schedule</text>`;

    const dayLabel = `<text x="${CX}" y="208" text-anchor="middle" font-size="9" fill="var(--text-muted)">${Utils.formatDate(today)}</text>`;

    return `
      <div class="timeline-card">
        <div class="timeline-card__title">Day Timeline</div>
        <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-label="Daily timeline">
          <circle cx="${CX}" cy="${CY}" r="${(OR + IR) / 2}" fill="none" stroke="var(--surface-2)" stroke-width="${OR - IR}"/>
          ${paths.join('')}
          ${ticks}
          ${hourLabels}
          ${centerText}
          ${dayLabel}
        </svg>
        ${scheduled.length === 0 ? '<p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:4px">Schedule tasks with start times to see them here.</p>' : ''}
      </div>`;
  }

  return { render };
})();
