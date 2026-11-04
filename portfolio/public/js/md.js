// ==========================================================================
// Tiny, safe Markdown renderer (headings, bold/italic, links, images, lists,
// quotes, code blocks). All user text is HTML-escaped first.
// ==========================================================================
(function (global) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const safeUrl = (u) => /^(https?:\/\/|\/|#|mailto:)/i.test(u) ? u : '#';

  function inline(text) {
    return esc(text)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
        `<img src="${safeUrl(url.replace(/&amp;/g, '&'))}" alt="${alt}" loading="lazy" class="md-img" data-zoom="1">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, url) =>
        `<a href="${safeUrl(url.replace(/&amp;/g, '&'))}" target="_blank" rel="noopener">${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function render(src) {
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = [];
    const toc = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (/^```/.test(line)) {
        const lang = line.replace(/^```/, '').trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre class="md-code" data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }

      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length + 1; // # => h2
        const text = h[2].trim();
        const id = 'h-' + toc.length;
        toc.push({ id, text, level });
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
        i++; continue;
      }

      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
        out.push(`<ul>${buf.join('')}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        out.push(`<ol>${buf.join('')}</ol>`);
        continue;
      }

      if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
        const m = line.match(/!\[([^\]]*)\]\(([^)\s]+)\)/);
        out.push(`<figure><img src="${safeUrl(m[2])}" alt="${esc(m[1])}" loading="lazy" class="md-img" data-zoom="1">${m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : ''}</figure>`);
        i++; continue;
      }

      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (!line.trim()) { i++; continue; }

      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|```|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(lines[i]) && !/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
    return { html: out.join('\n'), toc };
  }

  global.MD = { render, esc };
})(window);
