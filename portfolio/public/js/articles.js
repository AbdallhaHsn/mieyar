(() => {
  let all = [];
  const state = { q: '', cat: 'all', sort: 'new' };
  const $ = (s) => document.querySelector(s);

  function chrome() {
    Pub.mountChrome('articles', draw);
    document.title = (Pub.isAr ? 'المقالات | عبدالله الصويعي' : 'Articles | Abdalla Al-Swe');
    $('#hero-tag').textContent = Pub.t('articles');
    $('#hero-title').textContent = Pub.isAr ? 'مقالات في هندسة أنظمة المؤسسات' : 'Writing on Enterprise Systems Engineering';
    $('#hero-desc').textContent = Pub.isAr
      ? 'تجارب عملية ودروس مستفادة من بناء منصات ERP والفوترة الإلكترونية والمعماريات الحديثة.'
      : 'Hands-on lessons from building ERP platforms, e-invoicing engines and modern architectures.';
    $('#q').placeholder = Pub.t('search');
    $('#sort').innerHTML = `<option value="new">${Pub.t('newest')}</option><option value="pop">${Pub.t('popular')}</option>`;
    $('#sort').value = state.sort;
  }

  function draw() {
    chrome();
    const cats = ['all', ...new Set(all.map(a => a.category))];
    $('#cats').innerHTML = cats.map(c => `<button class="chip ${state.cat === c ? 'active' : ''}" data-c="${Pub.esc(c)}">${c === 'all' ? Pub.t('all') : Pub.esc(Pub.cat(c))}</button>`).join('');
    document.querySelectorAll('.chip').forEach(b => b.onclick = () => { state.cat = b.dataset.c; draw(); });

    let list = all.filter(a => state.cat === 'all' || a.category === state.cat);
    const q = state.q.trim().toLowerCase();
    if (q) list = list.filter(a => [a.titleAr, a.titleEn, a.excerptAr, a.excerptEn, (a.tags || []).join(' ')].join(' ').toLowerCase().includes(q));
    list.sort((a, b) => state.sort === 'pop' ? (b.views || 0) - (a.views || 0) : new Date(b.createdAt) - new Date(a.createdAt));

    const showFeatured = !q && state.cat === 'all' && state.sort === 'new';
    $('#grid').innerHTML = list.length
      ? list.map((a, i) => Pub.card(a, showFeatured && i === 0 && a.featured)).join('')
      : `<div class="empty-state"><i class="pi pi-search"></i>${Pub.t('none')}</div>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    chrome();
    $('#grid').innerHTML = '<div class="skeleton"></div>'.repeat(3);
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; const pos = e.target.selectionStart; draw(); const q = $('#q'); q.value = state.q; q.focus(); q.setSelectionRange(pos, pos); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; draw(); });
    Pub.trackVisit();
    try { all = await Pub.json('/api/articles'); } catch { all = []; }
    draw();
  });
})();
