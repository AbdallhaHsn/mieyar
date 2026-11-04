// ==========================================================================
// Admin Dashboard — SPA logic
// ==========================================================================
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = MD.esc;
  const C = { ok: '#059669', danger: '#dc2626', info: '#0284c7', cancel: '#64748b' };

  const state = { token: sessionStorage.getItem('adm_token') || '', data: null, view: 'overview', articleFilter: 'all', articleQuery: '', activeMsg: null };

  const VIEWS = {
    overview: ['نظرة عامة', 'ملخص نشاط موقعك وتفاعل الزوار'],
    articles: ['المقالات', 'اكتب وانشر وأدر مقالاتك المدعومة بالصور'],
    comments: ['التعليقات', 'راجع تعليقات الزوار وأخفِ أو احذف غير المناسب'],
    messages: ['صندوق الرسائل', 'رسائل نموذج التواصل من الزوار'],
    projects: ['المشاريع', 'الأنظمة والمشاريع المعروضة في الموقع'],
    experience: ['الخبرات', 'المسيرة المهنية الظاهرة في الموقع'],
    skills: ['المهارات', 'فئات المهارات التقنية وعناصرها'],
    stats: ['أرقام الإنجاز', 'الأرقام المعروضة أسفل الواجهة الرئيسية'],
    profile: ['البيانات الشخصية', 'الاسم والنبذة والصورة وروابط التواصل'],
    security: ['الأمان', 'تغيير رمز الدخول وإدارة الجلسة']
  };

  // ------------------------------------------------------------ helpers
  const toast = (title, icon = 'success') => Swal.fire({ toast: true, position: 'top-start', icon, title, showConfirmButton: false, timer: 2200, timerProgressBar: true });
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const num = (n) => Number(n || 0).toLocaleString('en-US');

  async function api(url, method = 'GET', body) {
    const opts = { method, headers: { Authorization: `Bearer ${state.token}` } };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(url, opts);
    if (res.status === 401) { logout(true); throw new Error('unauthorized'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'حدث خطأ غير متوقع');
    return data;
  }

  async function confirmBox(title, text, confirmText = 'نعم، احذف') {
    const r = await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: 'تراجع', confirmButtonColor: C.danger, cancelButtonColor: C.cancel });
    return r.isConfirmed;
  }
  const fail = (e) => { if (e.message !== 'unauthorized') Swal.fire({ icon: 'error', title: 'خطأ', text: e.message, confirmButtonColor: C.info, confirmButtonText: 'حسناً' }); };

  async function uploadImage() {
    return new Promise((resolve) => {
      const input = $('#hidden-file');
      input.value = '';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return resolve(null);
        const fd = new FormData();
        fd.append('image', file);
        try {
          Swal.fire({ title: 'جارٍ رفع الصورة…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          const r = await api('/api/admin/upload', 'POST', fd);
          Swal.close();
          resolve(r.url);
        } catch (e) { Swal.close(); fail(e); resolve(null); }
      };
      input.click();
    });
  }

  async function refresh() { state.data = await api('/api/admin/data'); updateCounts(); }

  function updateCounts() {
    const d = state.data;
    $('#cnt-articles').textContent = d.articles.length;
    const comments = d.articles.reduce((n, a) => n + (a.comments || []).length, 0);
    $('#cnt-comments').textContent = comments;
    const unread = d.messages.filter(m => !m.read).length;
    const pill = $('#cnt-messages');
    pill.textContent = unread;
    pill.dataset.zero = unread === 0 ? '1' : '0';
    $('#side-owner').textContent = d.profile.nameAr || 'Admin';
  }

  // ------------------------------------------------------------ auth
  async function login(pin) {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || 'رمز غير صحيح');
    state.token = data.token;
    sessionStorage.setItem('adm_token', data.token);
  }

  function logout(expired = false) {
    if (state.token && !expired) fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${state.token}` } }).catch(() => { });
    state.token = '';
    sessionStorage.removeItem('adm_token');
    $('#app-shell').hidden = true;
    $('#login-view').hidden = false;
    $('#login-pin').value = '';
    if (expired) toast('انتهت الجلسة، سجّل الدخول مجدداً', 'info');
  }

  async function boot() {
    try {
      await refresh();
      $('#login-view').hidden = true;
      $('#app-shell').hidden = false;
      route();
    } catch { $('#login-view').hidden = false; }
  }

  // ------------------------------------------------------------ routing
  function route() {
    const hash = (location.hash || '#overview').slice(1).split('/');
    const view = VIEWS[hash[0]] ? hash[0] : 'overview';
    state.view = view;
    $$('.side-link[data-view]').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    $('#view-title').textContent = VIEWS[view][0];
    $('#view-sub').textContent = VIEWS[view][1];
    $('#topbar-actions').innerHTML = '';
    closeSidebar();
    const c = $('#view-container');
    c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
    const fn = R[view];
    if (view === 'articles' && hash[1]) return R.editor(hash[1] === 'new' ? null : hash[1]);
    fn();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => state.token && route());

  const closeSidebar = () => { $('#sidebar').classList.remove('open'); $('#sidebar-overlay').classList.remove('open'); };
  const setActions = (html) => { $('#topbar-actions').innerHTML = html; };

  // ------------------------------------------------------------ views
  const R = {};

  // ===== Overview
  R.overview = () => {
    const d = state.data;
    const totalViews = d.articles.reduce((n, a) => n + (a.views || 0), 0);
    const totalLikes = d.articles.reduce((n, a) => n + (a.likes || 0), 0);
    const totalComments = d.articles.reduce((n, a) => n + (a.comments || []).length, 0);
    const unread = d.messages.filter(m => !m.read).length;

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      days.push({ key, label: key.slice(8), v: d.analytics.visits[key] || 0 });
    }
    const max = Math.max(1, ...days.map(x => x.v));
    const totalVisits = Object.values(d.analytics.visits).reduce((a, b) => a + b, 0);
    const last7 = days.slice(7).reduce((a, b) => a + b.v, 0);

    const top = [...d.articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const recentMsgs = d.messages.slice(0, 4);

    $('#view-container').innerHTML = `
      <div class="kpi-grid">
        <div class="card kpi"><div class="kpi-icon green"><i class="pi pi-eye"></i></div><div><div class="kpi-value">${num(totalVisits)}</div><div class="kpi-label">زيارات الموقع</div><div class="kpi-sub">${num(last7)} خلال آخر 7 أيام</div></div></div>
        <div class="card kpi"><div class="kpi-icon blue"><i class="pi pi-book"></i></div><div><div class="kpi-value">${num(totalViews)}</div><div class="kpi-label">قراءات المقالات</div><div class="kpi-sub">${d.articles.filter(a => a.status === 'published').length} منشور · ${d.articles.filter(a => a.status === 'draft').length} مسودة</div></div></div>
        <div class="card kpi"><div class="kpi-icon amber"><i class="pi pi-heart-fill"></i></div><div><div class="kpi-value">${num(totalLikes)}</div><div class="kpi-label">الإعجابات</div><div class="kpi-sub">${num(totalComments)} تعليق</div></div></div>
        <div class="card kpi"><div class="kpi-icon violet"><i class="pi pi-inbox"></i></div><div><div class="kpi-value">${num(d.messages.length)}</div><div class="kpi-label">الرسائل الواردة</div><div class="kpi-sub">${unread} غير مقروءة</div></div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h3>الزيارات — آخر 14 يوماً</h3><small>إجمالي ${num(days.reduce((a, b) => a + b.v, 0))}</small></div>
          <div class="card-body"><div class="chart">${days.map(x => `
            <div class="bar-col"><div class="bar" style="height:${Math.max(3, (x.v / max) * 100)}%" data-val="${x.v}"></div><span class="bar-label">${x.label}</span></div>`).join('')}</div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>الأكثر قراءة</h3><a href="#articles" class="btn btn-ghost btn-sm">الكل</a></div>
          <div class="list">${top.length ? top.map((a, i) => `
            <a class="list-item" href="#articles/${a.id}"><span class="rank">${i + 1}</span>
              <div class="grow"><div class="list-title">${esc(a.titleAr || a.titleEn)}</div>
              <div class="list-meta"><span><i class="pi pi-eye"></i>${num(a.views)}</span><span><i class="pi pi-heart"></i>${num(a.likes)}</span><span><i class="pi pi-comment"></i>${(a.comments || []).length}</span></div></div>
            </a>`).join('') : '<div class="empty"><i class="pi pi-book"></i>لا توجد مقالات بعد</div>'}</div>
        </div>
      </div>

      <div class="grid-2 even" style="margin-top:20px">
        <div class="card">
          <div class="card-head"><h3>أحدث الرسائل</h3><a href="#messages" class="btn btn-ghost btn-sm">فتح الصندوق</a></div>
          <div class="list">${recentMsgs.length ? recentMsgs.map(m => `
            <a class="list-item" href="#messages"><div class="avatar">${esc((m.name || '?')[0])}</div>
              <div class="grow"><div class="list-title">${esc(m.name)} ${m.read ? '' : '<span class="badge green">جديدة</span>'}</div>
              <div class="msg-preview">${esc(m.body)}</div></div><small class="muted">${fmtDate(m.createdAt)}</small></a>`).join('') : '<div class="empty"><i class="pi pi-inbox"></i>لا توجد رسائل</div>'}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>إجراءات سريعة</h3></div>
          <div class="card-body" style="display:grid;gap:10px">
            <a href="#articles/new" class="btn btn-primary"><i class="pi pi-plus"></i> كتابة مقال جديد</a>
            <a href="#projects" class="btn btn-ghost"><i class="pi pi-th-large"></i> إدارة المشاريع</a>
            <a href="#profile" class="btn btn-ghost"><i class="pi pi-user"></i> تحديث البيانات الشخصية</a>
            <a href="/articles" target="_blank" class="btn btn-ghost"><i class="pi pi-external-link"></i> معاينة صفحة المقالات</a>
          </div>
        </div>
      </div>`;
  };

  // ===== Articles list
  R.articles = () => {
    setActions(`<a href="#articles/new" class="btn btn-primary"><i class="pi pi-plus"></i> مقال جديد</a>`);
    const draw = () => {
      let list = [...state.data.articles];
      if (state.articleFilter !== 'all') list = list.filter(a => a.status === state.articleFilter);
      const q = state.articleQuery.trim().toLowerCase();
      if (q) list = list.filter(a => (a.titleAr + a.titleEn + (a.tags || []).join(' ')).toLowerCase().includes(q));
      $('#articles-list').innerHTML = list.length ? list.map(a => `
        <div class="list-item">
          ${a.coverUrl ? `<img class="thumb" src="${esc(a.coverUrl)}" alt="" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>'}
          <a class="grow" href="#articles/${a.id}">
            <div class="list-title">${esc(a.titleAr || a.titleEn)} ${a.featured ? '<span class="badge amber"><i class="pi pi-star-fill"></i> مميز</span>' : ''}</div>
            <div class="list-meta">
              <span class="badge ${a.status === 'published' ? 'green' : 'gray'}">${a.status === 'published' ? 'منشور' : 'مسودة'}</span>
              <span><i class="pi pi-calendar"></i>${fmtDate(a.createdAt)}</span>
              <span><i class="pi pi-eye"></i>${num(a.views)}</span><span><i class="pi pi-heart"></i>${num(a.likes)}</span>
              <span><i class="pi pi-comment"></i>${(a.comments || []).length}</span>
              ${(a.tags || []).slice(0, 3).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}
            </div>
          </a>
          <a class="icon-btn" href="/article/${esc(a.slug)}" target="_blank" title="عرض"><i class="pi pi-external-link"></i></a>
          <a class="icon-btn" href="#articles/${a.id}" title="تعديل"><i class="pi pi-pencil"></i></a>
          <button class="icon-btn danger" data-del="${a.id}" title="حذف"><i class="pi pi-trash"></i></button>
        </div>`).join('') : '<div class="empty"><i class="pi pi-book"></i>لا توجد مقالات مطابقة</div>';
      $$('[data-del]').forEach(b => b.onclick = async () => {
        if (!(await confirmBox('حذف المقال؟', 'سيتم حذف المقال وتعليقاته نهائياً.'))) return;
        try { await api(`/api/admin/articles/${b.dataset.del}`, 'DELETE'); await refresh(); toast('تم حذف المقال'); draw(); } catch (e) { fail(e); }
      });
    };
    $('#view-container').innerHTML = `
      <div class="toolbar">
        <div class="search-box"><i class="pi pi-search"></i><input class="input" id="art-search" placeholder="ابحث في المقالات…" value="${esc(state.articleQuery)}"></div>
        <div class="seg" id="art-seg">
          <button data-f="all">الكل</button><button data-f="published">منشور</button><button data-f="draft">مسودات</button>
        </div>
      </div>
      <div class="card"><div class="list" id="articles-list"></div></div>`;
    $$('#art-seg button').forEach(b => {
      b.classList.toggle('active', b.dataset.f === state.articleFilter);
      b.onclick = () => { state.articleFilter = b.dataset.f; $$('#art-seg button').forEach(x => x.classList.toggle('active', x === b)); draw(); };
    });
    $('#art-search').oninput = (e) => { state.articleQuery = e.target.value; draw(); };
    draw();
  };

  // ===== Article editor
  R.editor = (id) => {
    const existing = id ? state.data.articles.find(a => a.id === id) : null;
    if (id && !existing) { location.hash = '#articles'; return; }
    const a = existing ? JSON.parse(JSON.stringify(existing)) : {
      titleAr: '', titleEn: '', excerptAr: '', excerptEn: '', contentAr: '', contentEn: '', coverUrl: '', category: 'erp',
      tags: [], status: 'draft', featured: false, slug: ''
    };
    let lang = 'ar', preview = false, dirty = false;
    $('#view-title').textContent = existing ? 'تحرير المقال' : 'مقال جديد';
    $('#view-sub').textContent = existing ? `آخر تحديث ${fmtTime(a.updatedAt)}` : 'اكتب بالعربية والإنجليزية وأضف صوراً بسهولة';
    setActions(`<a href="#articles" class="btn btn-ghost"><i class="pi pi-arrow-right"></i> رجوع</a>
      <button class="btn btn-ghost" id="save-draft"><i class="pi pi-save"></i> حفظ كمسودة</button>
      <button class="btn btn-primary" id="save-publish"><i class="pi pi-send"></i> ${existing && a.status === 'published' ? 'تحديث' : 'نشر'}</button>`);

    const L = (k) => k + (lang === 'ar' ? 'Ar' : 'En');

    const paint = () => {
      $('#view-container').innerHTML = `
      <div class="editor-layout">
        <div class="card">
          <div class="lang-tabs"><button data-l="ar" class="${lang === 'ar' ? 'active' : ''}">العربية</button><button data-l="en" class="${lang === 'en' ? 'active' : ''}">English</button></div>
          <div class="card-body">
            <div class="field"><input class="input title-input" id="f-title" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" placeholder="${lang === 'ar' ? 'عنوان المقال…' : 'Article title…'}" value="${esc(a[L('title')])}"></div>
            <div class="field"><label>${lang === 'ar' ? 'ملخص قصير يظهر في البطاقة' : 'Short excerpt shown on the card'}</label>
              <textarea class="textarea" id="f-excerpt" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" rows="2" maxlength="400">${esc(a[L('excerpt')])}</textarea></div>
            <div class="field"><label>${lang === 'ar' ? 'محتوى المقال' : 'Article content'}</label>
              <div class="md-toolbar">
                <button type="button" data-md="h2" title="عنوان">H2</button><button type="button" data-md="h3" title="عنوان فرعي">H3</button>
                <span class="sep"></span>
                <button type="button" data-md="bold" title="غامق"><i class="pi pi-bold"></i></button><button type="button" data-md="italic" title="مائل"><i class="pi pi-italic"></i></button>
                <button type="button" data-md="link" title="رابط"><i class="pi pi-link"></i></button>
                <span class="sep"></span>
                <button type="button" data-md="ul" title="قائمة"><i class="pi pi-list"></i></button><button type="button" data-md="ol" title="قائمة مرقمة">1.</button>
                <button type="button" data-md="quote" title="اقتباس"><i class="pi pi-comment"></i></button><button type="button" data-md="code" title="كود"><i class="pi pi-code"></i></button>
                <span class="sep"></span>
                <button type="button" data-md="image" title="إدراج صورة" style="color:var(--primary)"><i class="pi pi-image"></i> صورة</button>
                <span class="spacer"></span>
                <button type="button" id="toggle-preview"><i class="pi ${preview ? 'pi-pencil' : 'pi-eye'}"></i> ${preview ? 'تحرير' : 'معاينة'}</button>
              </div>
              ${preview
          ? `<div class="md-preview" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${MD.render(a[L('content')]).html || '<p class="muted">لا يوجد محتوى بعد…</p>'}</div>`
          : `<textarea class="textarea md-area" id="f-content" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" placeholder="${lang === 'ar' ? 'اكتب هنا… استخدم ## للعناوين و ![وصف](رابط) للصور' : 'Write here… use ## for headings and ![alt](url) for images'}">${esc(a[L('content')])}</textarea>`}
              <div class="word-count" id="wc"></div>
            </div>
          </div>
        </div>

        <div class="editor-side">
          <div class="card"><div class="card-head"><h3>النشر</h3><span class="badge ${a.status === 'published' ? 'green' : 'gray'}" id="status-badge">${a.status === 'published' ? 'منشور' : 'مسودة'}</span></div>
            <div class="card-body">
              <label class="switch"><span>مقال مميز (يظهر في الواجهة)</span><input type="checkbox" id="f-featured" ${a.featured ? 'checked' : ''}></label>
              <label class="switch"><span>منشور للعامة</span><input type="checkbox" id="f-published" ${a.status === 'published' ? 'checked' : ''}></label>
            </div></div>
          <div class="card"><div class="card-head"><h3>صورة الغلاف</h3></div>
            <div class="card-body">
              <div class="cover-box" id="cover-box">${a.coverUrl ? `<img src="${esc(a.coverUrl)}" alt=""><div class="cover-actions"><button type="button" id="cover-remove" title="إزالة"><i class="pi pi-trash"></i></button></div>` : '<div><i class="pi pi-image" style="font-size:2rem"></i><div style="margin-top:6px;font-size:.85rem">اضغط لرفع صورة الغلاف</div></div>'}</div>
              <div class="field" style="margin:12px 0 0"><input class="input ltr" id="f-cover" dir="ltr" placeholder="أو الصق رابط الصورة https://…" value="${esc(a.coverUrl)}"></div>
            </div></div>
          <div class="card"><div class="card-head"><h3>التصنيف والوسوم</h3></div>
            <div class="card-body">
              <div class="field"><label>التصنيف</label>
                <select class="select" id="f-category">${[['erp', 'أنظمة ERP'], ['architecture', 'معمارية البرمجيات'], ['web', 'تطوير الويب'], ['devops', 'DevOps'], ['general', 'عام']].map(([v, t]) => `<option value="${v}" ${a.category === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="field"><label>الوسوم (اضغط Enter للإضافة)</label>
                <div class="tags-input" id="tags-box">${(a.tags || []).map(t => `<span class="tag-chip">${esc(t)}<button type="button" data-rm="${esc(t)}"><i class="pi pi-times"></i></button></span>`).join('')}<input id="tag-input" placeholder="وسم جديد…"></div></div>
              <div class="field" style="margin-bottom:0"><label>الرابط المختصر (Slug)</label><input class="input ltr" id="f-slug" dir="ltr" placeholder="auto-generated" value="${esc(a.slug)}"><span class="hint">أحرف إنجليزية وأرقام وشرطات فقط</span></div>
            </div></div>
        </div>
      </div>`;
      bind();
      updateWc();
    };

    const updateWc = () => {
      const t = a[L('content')] || '';
      const words = t.trim() ? t.trim().split(/\s+/).length : 0;
      const el = $('#wc');
      if (el) el.textContent = `${words} كلمة · ~${Math.max(1, Math.round(words / 200))} دقيقة قراءة`;
    };

    const wrapSel = (ta, before, after = before, ph = 'نص') => {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
      ta.setRangeText(before + sel + after, s, e, 'select');
      ta.focus(); ta.dispatchEvent(new Event('input'));
    };
    const linePrefix = (ta, prefix) => {
      const s = ta.selectionStart;
      const ls = ta.value.lastIndexOf('\n', s - 1) + 1;
      ta.setRangeText(prefix, ls, ls, 'end');
      ta.focus(); ta.dispatchEvent(new Event('input'));
    };

    const bind = () => {
      $$('.lang-tabs button').forEach(b => b.onclick = () => { collect(); lang = b.dataset.l; paint(); });
      const markDirty = () => { dirty = true; };
      $('#f-title').oninput = (e) => { a[L('title')] = e.target.value; markDirty(); };
      $('#f-excerpt').oninput = (e) => { a[L('excerpt')] = e.target.value; markDirty(); };
      const ta = $('#f-content');
      if (ta) ta.oninput = (e) => { a[L('content')] = e.target.value; markDirty(); updateWc(); };
      $('#toggle-preview').onclick = () => { collect(); preview = !preview; paint(); };

      $$('[data-md]').forEach(b => b.onclick = async () => {
        const t = $('#f-content');
        if (!t) { preview = false; paint(); return; }
        switch (b.dataset.md) {
          case 'h2': linePrefix(t, '## '); break;
          case 'h3': linePrefix(t, '### '); break;
          case 'bold': wrapSel(t, '**'); break;
          case 'italic': wrapSel(t, '*'); break;
          case 'ul': linePrefix(t, '- '); break;
          case 'ol': linePrefix(t, '1. '); break;
          case 'quote': linePrefix(t, '> '); break;
          case 'code': wrapSel(t, '\n```\n', '\n```\n', 'code'); break;
          case 'link': {
            const r = await Swal.fire({ title: 'إدراج رابط', input: 'url', inputPlaceholder: 'https://…', showCancelButton: true, confirmButtonText: 'إدراج', cancelButtonText: 'إلغاء', confirmButtonColor: C.ok });
            if (r.value) wrapSel(t, '[', `](${r.value})`, 'نص الرابط');
            break;
          }
          case 'image': {
            const url = await uploadImage();
            if (url) {
              const s = t.selectionStart;
              t.setRangeText(`\n\n![وصف الصورة](${url})\n\n`, s, s, 'end');
              t.dispatchEvent(new Event('input')); toast('تم إدراج الصورة داخل المقال');
            }
            break;
          }
        }
      });

      $('#f-featured').onchange = (e) => { a.featured = e.target.checked; dirty = true; };
      $('#f-published').onchange = (e) => { a.status = e.target.checked ? 'published' : 'draft'; const b = $('#status-badge'); b.textContent = e.target.checked ? 'منشور' : 'مسودة'; b.className = `badge ${e.target.checked ? 'green' : 'gray'}`; dirty = true; };
      $('#f-category').onchange = (e) => { a.category = e.target.value; dirty = true; };
      $('#f-slug').oninput = (e) => { a.slug = e.target.value; dirty = true; };
      $('#f-cover').onchange = (e) => { a.coverUrl = e.target.value.trim(); dirty = true; collect(); paint(); };
      $('#cover-box').onclick = async (e) => {
        if (e.target.closest('#cover-remove')) { a.coverUrl = ''; dirty = true; collect(); paint(); return; }
        const url = await uploadImage();
        if (url) { a.coverUrl = url; dirty = true; collect(); paint(); }
      };
      const tagInput = $('#tag-input');
      tagInput.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const v = tagInput.value.trim().replace(/,$/, '');
          if (v && !a.tags.includes(v) && a.tags.length < 8) { a.tags.push(v); dirty = true; collect(); paint(); $('#tag-input').focus(); }
        }
      };
      $$('[data-rm]').forEach(b => b.onclick = () => { a.tags = a.tags.filter(t => t !== b.dataset.rm); dirty = true; collect(); paint(); });
    };

    const collect = () => {
      const t = $('#f-title'); if (t) a[L('title')] = t.value;
      const x = $('#f-excerpt'); if (x) a[L('excerpt')] = x.value;
      const c = $('#f-content'); if (c) a[L('content')] = c.value;
    };

    const save = async (forceStatus) => {
      collect();
      if (forceStatus) a.status = forceStatus;
      if (!a.titleAr.trim() && !a.titleEn.trim()) {
        return Swal.fire({ icon: 'warning', title: 'العنوان مطلوب', text: 'اكتب عنواناً للمقال بإحدى اللغتين على الأقل.', confirmButtonColor: C.info, confirmButtonText: 'حسناً' });
      }
      const payload = { ...a };
      delete payload.comments; delete payload.views; delete payload.likes;
      try {
        const r = existing ? await api(`/api/admin/articles/${existing.id}`, 'PUT', payload) : await api('/api/admin/articles', 'POST', payload);
        await refresh();
        dirty = false;
        await Swal.fire({ icon: 'success', title: r.article.status === 'published' ? 'تم النشر بنجاح' : 'تم حفظ المسودة', confirmButtonColor: C.ok, confirmButtonText: 'حسناً', timer: 1800 });
        location.hash = '#articles';
      } catch (e) { fail(e); }
    };

    paint();
    $('#save-draft').onclick = () => save('draft');
    $('#save-publish').onclick = () => save('published');
  };

  // ===== Comments moderation
  R.comments = () => {
    const rows = [];
    state.data.articles.forEach(a => (a.comments || []).forEach(c => rows.push({ a, c })));
    rows.sort((x, y) => new Date(y.c.createdAt) - new Date(x.c.createdAt));
    $('#view-container').innerHTML = `<div class="card"><div class="list">${rows.length ? rows.map(({ a, c }) => `
      <div class="list-item" style="align-items:flex-start">
        <div class="avatar">${esc((c.name || '?')[0])}</div>
        <div class="grow">
          <div class="list-title" style="white-space:normal">${esc(c.name)} ${c.hidden ? '<span class="badge gray">مخفي</span>' : ''}</div>
          <div style="margin:4px 0;line-height:1.8">${esc(c.text)}</div>
          <div class="list-meta"><span><i class="pi pi-book"></i>${esc(a.titleAr || a.titleEn)}</span><span><i class="pi pi-clock"></i>${fmtTime(c.createdAt)}</span></div>
        </div>
        <button class="icon-btn" data-toggle="${a.id}|${c.id}|${c.hidden ? 0 : 1}" title="${c.hidden ? 'إظهار' : 'إخفاء'}"><i class="pi ${c.hidden ? 'pi-eye' : 'pi-eye-slash'}"></i></button>
        <button class="icon-btn danger" data-delc="${a.id}|${c.id}" title="حذف"><i class="pi pi-trash"></i></button>
      </div>`).join('') : '<div class="empty"><i class="pi pi-comments"></i>لا توجد تعليقات حتى الآن</div>'}</div></div>`;
    $$('[data-toggle]').forEach(b => b.onclick = async () => {
      const [aid, cid, hide] = b.dataset.toggle.split('|');
      try { await api(`/api/admin/articles/${aid}/comments/${cid}`, 'PUT', { hidden: hide === '1' }); await refresh(); R.comments(); } catch (e) { fail(e); }
    });
    $$('[data-delc]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('حذف التعليق؟', 'لا يمكن التراجع عن هذا الإجراء.'))) return;
      const [aid, cid] = b.dataset.delc.split('|');
      try { await api(`/api/admin/articles/${aid}/comments/${cid}`, 'DELETE'); await refresh(); toast('تم حذف التعليق'); R.comments(); } catch (e) { fail(e); }
    });
  };

  // ===== Messages
  R.messages = () => {
    const msgs = state.data.messages;
    if (!msgs.length) { $('#view-container').innerHTML = '<div class="card"><div class="empty"><i class="pi pi-inbox"></i>صندوق الرسائل فارغ</div></div>'; return; }
    if (!state.activeMsg || !msgs.find(m => m.id === state.activeMsg)) state.activeMsg = msgs[0].id;
    const cur = msgs.find(m => m.id === state.activeMsg);
    $('#view-container').innerHTML = `<div class="card"><div class="msg-layout">
      <div class="msg-list">${msgs.map(m => `
        <div class="msg-row ${m.read ? '' : 'unread'} ${m.id === state.activeMsg ? 'active' : ''}" data-open="${m.id}">
          <div class="avatar">${esc((m.name || '?')[0])}</div>
          <div class="grow" style="min-width:0"><div class="list-title">${esc(m.name)}</div><div class="msg-preview">${esc(m.body)}</div></div>
          <small class="muted">${fmtDate(m.createdAt)}</small></div>`).join('')}</div>
      <div class="msg-detail">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><h3>${esc(cur.name)}</h3><div class="muted ltr" style="text-align:start">${esc(cur.contact)}</div><div class="muted" style="font-size:.8rem;margin-top:4px">${fmtTime(cur.createdAt)}</div></div>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" id="m-unread" title="تعليم كغير مقروءة"><i class="pi pi-envelope"></i></button>
            <button class="icon-btn danger" id="m-del" title="حذف"><i class="pi pi-trash"></i></button>
          </div>
        </div>
        <div class="msg-body">${esc(cur.body)}</div>
        <div style="margin-top:16px;display:flex;gap:10px">
          ${/@/.test(cur.contact) ? `<a class="btn btn-primary" href="mailto:${esc(cur.contact)}"><i class="pi pi-reply"></i> رد بالبريد</a>` : ''}
          ${/[\d+]{7,}/.test(cur.contact.replace(/\s/g, '')) ? `<a class="btn btn-primary" target="_blank" href="https://wa.me/${cur.contact.replace(/[^\d]/g, '')}"><i class="pi pi-whatsapp"></i> رد عبر واتساب</a>` : ''}
        </div>
      </div></div></div>`;
    $$('[data-open]').forEach(r => r.onclick = async () => {
      state.activeMsg = r.dataset.open;
      const m = msgs.find(x => x.id === state.activeMsg);
      if (!m.read) { try { await api(`/api/admin/messages/${m.id}`, 'PUT', { read: true }); await refresh(); } catch (e) { fail(e); } }
      R.messages();
    });
    if (!cur.read) api(`/api/admin/messages/${cur.id}`, 'PUT', { read: true }).then(refresh).catch(() => { });
    $('#m-unread').onclick = async () => { await api(`/api/admin/messages/${cur.id}`, 'PUT', { read: false }); await refresh(); toast('تم التعليم كغير مقروءة'); R.messages(); };
    $('#m-del').onclick = async () => {
      if (!(await confirmBox('حذف الرسالة؟', 'سيتم حذفها نهائياً.'))) return;
      try { await api(`/api/admin/messages/${cur.id}`, 'DELETE'); state.activeMsg = null; await refresh(); toast('تم حذف الرسالة'); R.messages(); } catch (e) { fail(e); }
    };
  };

  // ------------------------------------------------------------ modal form builder
  function formModal(title, fields, values = {}) {
    return new Promise((resolve) => {
      const modal = $('#modal'), form = $('#modal-form');
      $('#modal-title').textContent = title;
      form.innerHTML = fields.map(f => {
        if (f.row) return `<div class="row">${f.row.map(fieldHtml).join('')}</div>`;
        return fieldHtml(f);
      }).join('');
      function fieldHtml(f) {
        const v = values[f.name] !== undefined ? values[f.name] : (f.default || '');
        const val = Array.isArray(v) ? v.join(', ') : v;
        const dir = f.ltr ? 'dir="ltr"' : '';
        let input;
        if (f.type === 'textarea') input = `<textarea class="textarea" name="${f.name}" rows="${f.rows || 3}" ${dir}>${esc(val)}</textarea>`;
        else if (f.type === 'select') input = `<select class="select" name="${f.name}">${f.options.map(([k, t]) => `<option value="${k}" ${String(val) === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
        else if (f.type === 'checkbox') return `<div class="field"><label class="switch"><span>${f.label}</span><input type="checkbox" name="${f.name}" ${values[f.name] !== undefined ? (values[f.name] ? 'checked' : '') : (f.default ? 'checked' : '')}></label></div>`;
        else input = `<input class="input" name="${f.name}" ${dir} value="${esc(val)}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">`;
        return `<div class="field"><label>${f.label}</label>${input}${f.hint ? `<span class="hint">${f.hint}</span>` : ''}</div>`;
      }
      const close = (val) => { modal.hidden = true; form.onsubmit = null; $$('[data-close]', modal).forEach(b => b.onclick = null); resolve(val); };
      $$('[data-close]', modal).forEach(b => b.onclick = () => close(null));
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form), out = {};
        fields.flatMap(f => f.row || [f]).forEach(f => {
          if (f.type === 'checkbox') out[f.name] = form.elements[f.name].checked;
          else out[f.name] = String(fd.get(f.name) || '').trim();
          if (f.csv) out[f.name] = out[f.name].split(',').map(s => s.trim()).filter(Boolean);
        });
        close(out);
      };
      modal.hidden = false;
      setTimeout(() => form.querySelector('input,textarea,select')?.focus(), 50);
    });
  }

  // ===== Projects
  const PROJECT_FIELDS = [
    { row: [{ name: 'titleAr', label: 'العنوان (عربي)', required: true }, { name: 'titleEn', label: 'Title (English)', ltr: true, required: true }] },
    { row: [{ name: 'descriptionAr', label: 'الوصف (عربي)', type: 'textarea' }, { name: 'descriptionEn', label: 'Description (English)', type: 'textarea', ltr: true }] },
    { row: [{ name: 'liveUrl', label: 'الرابط الحي', ltr: true, default: 'https://' }, { name: 'repoUrl', label: 'رابط الكود المصدري', ltr: true }] },
    { name: 'tags', label: 'التقنيات (مفصولة بفاصلة)', csv: true, ltr: true },
    { row: [{ name: 'category', label: 'التصنيف', type: 'select', options: [['erp', 'أنظمة ERP ومحاسبة'], ['web', 'تطبيقات الويب'], ['api', 'خدمات APIs']] }, { name: 'icon', label: 'أيقونة PrimeIcons', ltr: true, default: 'pi-box', hint: 'مثال: pi-box, pi-chart-line' }] },
    { row: [{ name: 'badgeAr', label: 'شارة (عربي)' }, { name: 'badgeEn', label: 'Badge (English)', ltr: true }] },
    { name: 'featured', label: 'مشروع مميز', type: 'checkbox', default: true }
  ];

  R.projects = () => {
    setActions(`<button class="btn btn-primary" id="add-project"><i class="pi pi-plus"></i> مشروع جديد</button>`);
    const list = state.data.projects;
    $('#view-container').innerHTML = list.length ? `<div class="cards-grid">${list.map(p => `
      <div class="card item-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div class="kpi-icon green"><i class="pi ${esc(p.icon || 'pi-box')}"></i></div>
          <div class="chips">${p.featured ? '<span class="badge amber"><i class="pi pi-star-fill"></i> مميز</span>' : ''}<span class="badge blue">${esc(p.category)}</span></div>
        </div>
        <h4>${esc(p.titleAr)}</h4><p>${esc(p.descriptionAr)}</p>
        <div class="chips">${(p.tags || []).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}"><i class="pi pi-pencil"></i> تعديل</button>
          ${p.liveUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(p.liveUrl)}" target="_blank"><i class="pi pi-external-link"></i></a>` : ''}
          <button class="btn btn-danger-ghost btn-sm" data-del="${p.id}" style="margin-inline-start:auto"><i class="pi pi-trash"></i></button>
        </div>
      </div>`).join('')}</div>` : '<div class="card"><div class="empty"><i class="pi pi-th-large"></i>لا توجد مشاريع</div></div>';

    const edit = async (id) => {
      const existing = id ? list.find(p => p.id === id) : null;
      const v = await formModal(existing ? 'تعديل المشروع' : 'مشروع جديد', PROJECT_FIELDS, existing || {});
      if (!v) return;
      try { existing ? await api(`/api/admin/projects/${id}`, 'PUT', v) : await api('/api/admin/projects', 'POST', v); await refresh(); toast('تم حفظ المشروع'); R.projects(); } catch (e) { fail(e); }
    };
    $('#add-project').onclick = () => edit(null);
    $$('[data-edit]').forEach(b => b.onclick = () => edit(b.dataset.edit));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('حذف المشروع؟', 'سيُزال من المعرض مباشرة.'))) return;
      try { await api(`/api/admin/projects/${b.dataset.del}`, 'DELETE'); await refresh(); toast('تم الحذف'); R.projects(); } catch (e) { fail(e); }
    });
  };

  // ===== Experience
  const EXP_FIELDS = [
    { row: [{ name: 'roleAr', label: 'المسمى الوظيفي (عربي)', required: true }, { name: 'roleEn', label: 'Role (English)', ltr: true }] },
    { row: [{ name: 'companyAr', label: 'الجهة (عربي)', required: true }, { name: 'companyEn', label: 'Company (English)', ltr: true }] },
    { row: [{ name: 'periodAr', label: 'الفترة (عربي)', placeholder: '2023 - حتى الآن' }, { name: 'periodEn', label: 'Period (English)', ltr: true, placeholder: '2023 - Present' }] },
    { name: 'responsibilitiesAr', label: 'المهام والإنجازات (عربي)', type: 'textarea', rows: 4 },
    { name: 'responsibilitiesEn', label: 'Responsibilities (English)', type: 'textarea', rows: 4, ltr: true }
  ];
  R.experience = () => {
    setActions(`<button class="btn btn-primary" id="add-exp"><i class="pi pi-plus"></i> خبرة جديدة</button>`);
    const list = state.data.experiences;
    $('#view-container').innerHTML = `<div class="card"><div class="list">${list.length ? list.map(e => `
      <div class="list-item"><div class="kpi-icon blue"><i class="pi pi-briefcase"></i></div>
        <div class="grow"><div class="list-title">${esc(e.roleAr)}</div><div class="list-meta"><span><i class="pi pi-building"></i>${esc(e.companyAr)}</span><span><i class="pi pi-calendar"></i>${esc(e.periodAr)}</span></div></div>
        <button class="icon-btn" data-edit="${e.id}"><i class="pi pi-pencil"></i></button>
        <button class="icon-btn danger" data-del="${e.id}"><i class="pi pi-trash"></i></button></div>`).join('') : '<div class="empty"><i class="pi pi-briefcase"></i>لا توجد خبرات</div>'}</div></div>`;
    const edit = async (id) => {
      const existing = id ? list.find(e => e.id === id) : null;
      const v = await formModal(existing ? 'تعديل الخبرة' : 'خبرة جديدة', EXP_FIELDS, existing || {});
      if (!v) return;
      try { existing ? await api(`/api/admin/experiences/${id}`, 'PUT', v) : await api('/api/admin/experiences', 'POST', v); await refresh(); toast('تم حفظ الخبرة'); R.experience(); } catch (e) { fail(e); }
    };
    $('#add-exp').onclick = () => edit(null);
    $$('[data-edit]').forEach(b => b.onclick = () => edit(b.dataset.edit));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('حذف الخبرة؟', 'لا يمكن التراجع.'))) return;
      try { await api(`/api/admin/experiences/${b.dataset.del}`, 'DELETE'); await refresh(); toast('تم الحذف'); R.experience(); } catch (e) { fail(e); }
    });
  };

  // ===== Skills
  R.skills = () => {
    let skills = JSON.parse(JSON.stringify(state.data.skills));
    setActions(`<button class="btn btn-ghost" id="add-skill"><i class="pi pi-plus"></i> فئة جديدة</button><button class="btn btn-primary" id="save-skills"><i class="pi pi-check"></i> حفظ</button>`);
    const paint = () => {
      $('#view-container').innerHTML = skills.map((s, i) => `
        <div class="skill-edit" style="position:relative">
          <button class="icon-btn danger remove" data-rm="${i}" title="حذف الفئة"><i class="pi pi-trash"></i></button>
          <div class="row"><div class="field"><label>اسم الفئة (عربي)</label><input class="input" data-k="categoryAr" data-i="${i}" value="${esc(s.categoryAr)}"></div>
          <div class="field"><label>Category (English)</label><input class="input" dir="ltr" data-k="categoryEn" data-i="${i}" value="${esc(s.categoryEn)}"></div></div>
          <div class="field" style="margin:0"><label>العناصر (مفصولة بفاصلة)</label><textarea class="textarea" dir="ltr" rows="2" data-k="items" data-i="${i}">${esc((s.items || []).join(', '))}</textarea></div>
        </div>`).join('') || '<div class="card"><div class="empty"><i class="pi pi-bolt"></i>لا توجد فئات</div></div>';
      $$('[data-k]').forEach(el => el.oninput = () => {
        const s = skills[el.dataset.i];
        s[el.dataset.k] = el.dataset.k === 'items' ? el.value.split(',').map(x => x.trim()).filter(Boolean) : el.value;
      });
      $$('[data-rm]').forEach(b => b.onclick = () => { skills.splice(b.dataset.rm, 1); paint(); });
    };
    paint();
    $('#add-skill').onclick = () => { skills.push({ categoryAr: '', categoryEn: '', items: [] }); paint(); };
    $('#save-skills').onclick = async () => {
      try { await api('/api/admin/skills', 'PUT', { skills: skills.filter(s => s.categoryAr || s.categoryEn) }); await refresh(); toast('تم حفظ المهارات'); } catch (e) { fail(e); }
    };
  };

  // ===== Stats
  R.stats = () => {
    const stats = JSON.parse(JSON.stringify(state.data.stats));
    setActions(`<button class="btn btn-primary" id="save-stats"><i class="pi pi-check"></i> حفظ</button>`);
    $('#view-container').innerHTML = `<div class="stat-edit-grid">${stats.map((s, i) => `
      <div class="stat-edit">
        <div class="field"><label>القيمة</label><input class="input ltr" data-i="${i}" data-k="value" value="${esc(s.value)}"></div>
        <div class="field"><label>الوصف (عربي)</label><input class="input" data-i="${i}" data-k="labelAr" value="${esc(s.labelAr)}"></div>
        <div class="field" style="margin:0"><label>Label (English)</label><input class="input ltr" data-i="${i}" data-k="labelEn" value="${esc(s.labelEn)}"></div>
      </div>`).join('')}</div>`;
    $$('[data-k]').forEach(el => el.oninput = () => { stats[el.dataset.i][el.dataset.k] = el.value; });
    $('#save-stats').onclick = async () => { try { await api('/api/admin/stats', 'PUT', { stats }); await refresh(); toast('تم حفظ الأرقام'); } catch (e) { fail(e); } };
  };

  // ===== Profile
  R.profile = () => {
    const p = state.data.profile;
    $('#view-container').innerHTML = `
    <form class="card" id="profile-form"><div class="card-body">
      <div class="avatar-uploader">
        <img id="p-avatar" src="${esc(p.avatarUrl || '')}" alt="" onerror="this.style.opacity=.3">
        <div><button type="button" class="btn btn-ghost" id="p-upload"><i class="pi pi-upload"></i> رفع صورة جديدة</button>
        <div class="hint" style="margin-top:6px">PNG / JPG / WEBP حتى 8MB</div>
        <input type="hidden" name="avatarUrl" value="${esc(p.avatarUrl || '')}"></div>
      </div>
      <div class="section-label">الهوية</div>
      <div class="row"><div class="field"><label>الاسم (عربي)</label><input class="input" name="nameAr" value="${esc(p.nameAr)}" required></div>
        <div class="field"><label>Name (English)</label><input class="input ltr" name="nameEn" value="${esc(p.nameEn)}" required></div></div>
      <div class="row"><div class="field"><label>المسمى الوظيفي (عربي)</label><input class="input" name="titleAr" value="${esc(p.titleAr)}"></div>
        <div class="field"><label>Professional Title (English)</label><input class="input ltr" name="titleEn" value="${esc(p.titleEn)}"></div></div>
      <div class="row"><div class="field"><label>النبذة (عربي)</label><textarea class="textarea" name="bioAr" rows="4">${esc(p.bioAr)}</textarea></div>
        <div class="field"><label>Bio (English)</label><textarea class="textarea ltr" name="bioEn" rows="4">${esc(p.bioEn)}</textarea></div></div>
      <div class="row"><div class="field"><label>شارة الحالة (عربي)</label><input class="input" name="statusBadgeAr" value="${esc(p.statusBadgeAr)}"></div>
        <div class="field"><label>Status Badge (English)</label><input class="input ltr" name="statusBadgeEn" value="${esc(p.statusBadgeEn)}"></div></div>
      <div class="section-label">التواصل والروابط</div>
      <div class="row"><div class="field"><label>البريد الإلكتروني</label><input class="input ltr" type="email" name="email" value="${esc(p.email)}"></div>
        <div class="field"><label>رقم الهاتف</label><input class="input ltr" name="phone" value="${esc(p.phone)}"></div></div>
      <div class="row"><div class="field"><label>رابط واتساب</label><input class="input ltr" name="whatsappUrl" value="${esc(p.whatsappUrl)}" placeholder="https://wa.me/9665…"></div>
        <div class="field"><label>رابط السيرة الذاتية (CV)</label><input class="input ltr" name="resumeUrl" value="${esc(p.resumeUrl)}"></div></div>
      <div class="row"><div class="field"><label>GitHub</label><input class="input ltr" name="githubUrl" value="${esc(p.githubUrl)}"></div>
        <div class="field"><label>LinkedIn</label><input class="input ltr" name="linkedinUrl" value="${esc(p.linkedinUrl)}"></div></div>
      <div class="row"><div class="field"><label>الموقع (عربي)</label><input class="input" name="locationAr" value="${esc(p.locationAr)}"></div>
        <div class="field"><label>Location (English)</label><input class="input ltr" name="locationEn" value="${esc(p.locationEn)}"></div></div>
      <div class="sticky-save"><button class="btn btn-primary" type="submit"><i class="pi pi-check"></i> حفظ التعديلات</button></div>
    </div></form>`;
    const form = $('#profile-form');
    $('#p-upload').onclick = async () => {
      const url = await uploadImage();
      if (url) { form.elements.avatarUrl.value = url; $('#p-avatar').src = url; $('#p-avatar').style.opacity = 1; }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      try { await api('/api/admin/profile', 'PUT', payload); await refresh(); toast('تم حفظ البيانات الشخصية'); } catch (err) { fail(err); }
    };
  };

  // ===== Security
  R.security = () => {
    $('#view-container').innerHTML = `
    <div class="grid-2 even">
      <form class="card" id="pin-form"><div class="card-head"><h3><i class="pi pi-key"></i> تغيير رمز الدخول</h3></div><div class="card-body">
        <div class="field"><label>الرمز الحالي</label><input class="input" type="password" name="currentPin" required autocomplete="current-password"></div>
        <div class="field"><label>الرمز الجديد (4 أحرف على الأقل، يُفضّل 6+)</label><input class="input" type="password" name="newPin" minlength="4" required autocomplete="new-password"></div>
        <div class="field"><label>تأكيد الرمز الجديد</label><input class="input" type="password" name="confirm" minlength="4" required autocomplete="new-password"></div>
        <button class="btn btn-primary" type="submit"><i class="pi pi-lock"></i> حفظ الرمز</button>
        <p class="hint" style="margin-top:10px">سيتم إنهاء جميع الجلسات بعد التغيير وتحتاج لتسجيل الدخول مجدداً.</p>
      </div></form>
      <div class="card"><div class="card-head"><h3><i class="pi pi-shield"></i> حماية اللوحة</h3></div><div class="card-body" style="display:grid;gap:12px;font-size:.9rem">
        <div class="list-item" style="padding:8px 0"><i class="pi pi-check-circle" style="color:var(--primary)"></i><span>الرمز محفوظ مُشفَّراً (scrypt + salt)</span></div>
        <div class="list-item" style="padding:8px 0"><i class="pi pi-check-circle" style="color:var(--primary)"></i><span>حد 8 محاولات دخول كل 15 دقيقة</span></div>
        <div class="list-item" style="padding:8px 0"><i class="pi pi-check-circle" style="color:var(--primary)"></i><span>جلسة مؤقتة (12 ساعة) تُحذف عند إغلاق المتصفح</span></div>
        <div class="list-item" style="padding:8px 0"><i class="pi pi-check-circle" style="color:var(--primary)"></i><span>رفع الصور مقيّد بأنواع الصور فقط</span></div>
        <button class="btn btn-danger-ghost" id="logout-all"><i class="pi pi-sign-out"></i> تسجيل الخروج من هذه الجلسة</button>
      </div></div>
    </div>`;
    $('#logout-all').onclick = () => logout();
    $('#pin-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target.elements;
      if (f.newPin.value !== f.confirm.value) return Swal.fire({ icon: 'warning', title: 'غير متطابق', text: 'تأكيد الرمز لا يطابق الرمز الجديد.', confirmButtonColor: C.info, confirmButtonText: 'حسناً' });
      try {
        await api('/api/admin/pin', 'PUT', { currentPin: f.currentPin.value, newPin: f.newPin.value });
        await Swal.fire({ icon: 'success', title: 'تم تغيير الرمز', text: 'سجّل الدخول بالرمز الجديد.', confirmButtonColor: C.ok, confirmButtonText: 'حسناً' });
        logout(true);
      } catch (err) { fail(err); }
    };
  };

  // ------------------------------------------------------------ init
  document.addEventListener('DOMContentLoaded', () => {
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#login-btn'), pin = $('#login-pin').value.trim();
      btn.disabled = true;
      try { await login(pin); await boot(); }
      catch (err) {
        const card = $('.login-card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        Swal.fire({ icon: 'error', title: 'تعذر تسجيل الدخول', text: err.message, confirmButtonColor: C.danger, confirmButtonText: 'حسناً' });
      } finally { btn.disabled = false; }
    });
    $('#logout-btn').onclick = () => logout();
    $('#menu-toggle').onclick = () => { $('#sidebar').classList.add('open'); $('#sidebar-overlay').classList.add('open'); };
    $('#sidebar-overlay').onclick = closeSidebar;
    window.addEventListener('beforeunload', (e) => { if (state.view === 'articles' && location.hash.includes('/')) { /* editor open */ } });
    if (state.token) boot();
  });
})();
