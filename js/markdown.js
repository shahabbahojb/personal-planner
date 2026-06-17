const Markdown = (() => {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) => {
        const safe = /^(https?:\/\/|mailto:)/.test(url) ? esc(url) : '#';
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
      });
  }

  function render(raw) {
    if (!raw || !raw.trim()) return '<p class="text-muted" style="font-style:italic">No notes yet.</p>';

    const codeBlocks = [];
    const withPlaceholders = raw.replace(/```([^\n]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const langAttr = lang.trim() ? ` class="language-${esc(lang.trim())}"` : '';
      codeBlocks.push(`<pre><code${langAttr}>${esc(code.replace(/\n$/, ''))}</code></pre>`);
      return `\x00CB${codeBlocks.length - 1}\x00`;
    });

    const lines = withPlaceholders.split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.includes('\x00CB')) {
        const m = line.match(/\x00CB(\d+)\x00/);
        if (m) out.push(codeBlocks[parseInt(m[1])]);
        i++;
        continue;
      }

      const hm = line.match(/^(#{1,3})\s+(.*)/);
      if (hm) {
        const lvl = hm[1].length;
        out.push(`<h${lvl}>${inline(esc(hm[2]))}</h${lvl}>`);
        i++;
        continue;
      }

      if (/^>\s/.test(line)) {
        const qLines = [];
        while (i < lines.length && /^>\s/.test(lines[i])) {
          qLines.push(inline(esc(lines[i].replace(/^>\s/, ''))));
          i++;
        }
        out.push(`<blockquote>${qLines.join('<br>')}</blockquote>`);
        continue;
      }

      if (/^[-*]\s+\[([ xX])\]/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+\[([ xX])\]/.test(lines[i])) {
          const tm = lines[i].match(/^[-*]\s+\[([ xX])\]\s*(.*)/);
          const ch = tm[1].toLowerCase() === 'x' ? ' checked' : '';
          items.push(`<li><input type="checkbox"${ch} disabled> ${inline(esc(tm[2]))}</li>`);
          i++;
        }
        out.push(`<ul class="task-list" style="list-style:none;padding-left:4px">${items.join('')}</ul>`);
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i]) && !/^[-*]\s+\[/.test(lines[i])) {
          items.push(`<li>${inline(esc(lines[i].replace(/^[-*]\s+/, '')))}</li>`);
          i++;
        }
        out.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          items.push(`<li>${inline(esc(lines[i].replace(/^\d+\.\s+/, '')))}</li>`);
          i++;
        }
        out.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      if (/^[-*_]{3,}$/.test(line.trim())) {
        out.push('<hr>');
        i++;
        continue;
      }

      if (line.trim() === '') { i++; continue; }

      const paraLines = [];
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '' || /^#{1,3}\s/.test(l) || /^[>*-]\s/.test(l) || /^\d+\.\s/.test(l) || l.includes('\x00CB')) break;
        paraLines.push(inline(esc(l)));
        i++;
      }
      if (paraLines.length) out.push(`<p>${paraLines.join('<br>')}</p>`);
    }

    return out.join('\n') || '<p class="text-muted" style="font-style:italic">No notes yet.</p>';
  }

  return { render };
})();
