(() => {
  const slug = decodeURIComponent(location.pathname.split('/').pop());
  const $ = (s, r = document) => r.querySelector(s);
  const esc = Pub.esc;
  let art = null;
  const likedKey = () => `liked:${slug}`;

  const toast = (title, icon = 'success') => Swal.fire({ toast: true, position: 'top', icon, title, showConfirmButton: false, timer: 2000, timerProgressBar: true });

  function colorFor(name) {
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `linear-gradient(135deg, hsl(${h} 65% 45%), hsl(${(h + 50) % 360} 65% 40%))`;
  }

  function commentHtml(c) {
    return `<div class="comment"><div class="c-avatar" style="background:${colorFor(c.name)}">${esc((c.name || '?')[0].toUpperCase())}</div>
      <div class="c-body"><div class="c-head"><strong>${esc(c.name)}</strong><small>${Pub.fmtDate(c.createdAt)}</small></div>
      <div class="c-text">${esc(c.text)}</div></div></div>`;
  }

  function notFound() {
    $('#root').innerHTML = `<div class="empty-state" style="padding:6rem 1rem"><i class="pi pi-file"></i>
      <h2 style="margin-bottom:.4rem">${Pub.t('notFound')}</h2><p>${Pub.t('notFoundText')}</p>
      <a href="/articles" class="btn btn-primary" style="margin-top:1.2rem">${Pub.t('back')}</a></div>`;
  }

  function render() {
    Pub.mountChrome('articles', render);
    if (!art) return;
    const isAr = Pub.isAr;
    const title = Pub.pick(art, 'title');
    const excerpt = Pub.pick(art, 'excerpt');
    const content = Pub.pick(art, 'content');
    const { html, toc } = MD.render(content);
    const liked = localStorage.getItem(likedKey()) === '1';

    document.title = `${title} | ${isAr ? 'عبدالله الصويعي' : 'Abdalla Al-Swe'}`;
    $('#meta-desc').content = excerpt;
    $('#og-title').content = title; $('#og-desc').content = excerpt; $('#og-image').content = art.coverUrl || '';

    const url = location.href;
    $('#root').innerHTML = `
      <nav class="crumbs"><a href="/">${Pub.t('home')}</a><i class="pi pi-angle-${isAr ? 'left' : 'right'}"></i><a href="/articles">${Pub.t('articles')}</a></nav>
      <header class="article-head">
        <span class="cat-pill">${esc(Pub.cat(art.category))}</span>
        <h1>${esc(title)}</h1>
        ${excerpt ? `<p class="lead">${esc(excerpt)}</p>` : ''}
        <div class="article-meta">
          <span><i class="pi pi-calendar"></i>${Pub.fmtDate(art.createdAt)}</span>
          <span><i class="pi pi-clock"></i>${art.readMinutes} ${Pub.t('min')}</span>
          <span><i class="pi pi-eye"></i><b id="m-views">${Pub.num(art.views)}</b> ${Pub.t('views')}</span>
          <span><i class="pi pi-comment"></i><b id="m-comments">${art.comments.length}</b> ${Pub.t('comments')}</span>
        </div>
      </header>
      ${art.coverUrl ? `<div class="article-cover"><img src="${esc(art.coverUrl)}" alt="${esc(title)}" onerror="this.parentNode.remove()"></div>` : ''}

      <div class="article-layout">
        <aside class="react-rail">
          <button class="react-btn ${liked ? 'liked' : ''}" id="like-btn" title="${liked ? Pub.t('liked') : Pub.t('like')}"><i class="pi ${liked ? 'pi-heart-fill' : 'pi-heart'}"></i></button>
          <span class="react-count" id="like-count">${Pub.num(art.likes)}</span>
          <a class="react-btn" href="#comments" title="${Pub.t('comments')}"><i class="pi pi-comment"></i></a>
          <div class="share-pop">
            <button class="react-btn" id="share-btn" title="${Pub.t('share')}"><i class="pi pi-share-alt"></i></button>
            <div class="share-menu" id="share-menu">
              <a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}"><i class="pi pi-whatsapp"></i> WhatsApp</a>
              <a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}"><i class="pi pi-twitter"></i> X / Twitter</a>
              <a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}"><i class="pi pi-linkedin"></i> LinkedIn</a>
              <button id="copy-link"><i class="pi pi-link"></i> ${Pub.t('copy')}</button>
            </div>
          </div>
        </aside>

        <article class="prose" id="prose">${html || ''}
          ${(art.tags || []).length ? `<div class="article-tags">${art.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
        </article>

        <aside class="toc-rail" id="toc" ${toc.length ? '' : 'hidden'}>
          <h4>${Pub.t('toc')}</h4>
          ${toc.map(h => `<a href="#${h.id}" data-id="${h.id}" class="lvl${h.level}">${esc(h.text)}</a>`).join('')}
        </aside>
      </div>

      <section class="comments-box" id="comments">
        <h3><i class="pi pi-comments"></i> ${Pub.t('commentsTitle')} <em id="c-count">${art.comments.length}</em></h3>
        <form class="comment-form" id="comment-form">
          <input name="name" maxlength="60" placeholder="${Pub.t('yourName')}" required value="${esc(localStorage.getItem('commenter') || '')}">
          <textarea name="text" maxlength="1500" placeholder="${Pub.t('yourComment')}" required></textarea>
          <button class="btn btn-primary" type="submit"><i class="pi pi-send"></i> ${Pub.t('send')}</button>
        </form>
        <div id="comment-list">${art.comments.length ? [...art.comments].reverse().map(commentHtml).join('') : `<p class="no-comments">${Pub.t('noComments')}</p>`}</div>
      </section>

      ${art.related.length ? `<section class="related"><h3>${Pub.t('related')}</h3><div class="articles-grid">${art.related.map(a => Pub.card(a)).join('')}</div></section>` : ''}`;

    bind();
  }

  function bind() {
    // Like
    $('#like-btn').onclick = async () => {
      const wasLiked = localStorage.getItem(likedKey()) === '1';
      try {
        const r = await Pub.json(`/api/articles/${encodeURIComponent(slug)}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unlike: wasLiked }) });
        art.likes = r.likes;
        wasLiked ? localStorage.removeItem(likedKey()) : localStorage.setItem(likedKey(), '1');
        const btn = $('#like-btn');
        btn.classList.toggle('liked', !wasLiked);
        btn.innerHTML = `<i class="pi ${!wasLiked ? 'pi-heart-fill' : 'pi-heart'}"></i>`;
        $('#like-count').textContent = Pub.num(r.likes);
      } catch { toast(Pub.t('error'), 'error'); }
    };

    // Share
    const menu = $('#share-menu');
    $('#share-btn').onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
    document.addEventListener('click', () => menu.classList.remove('open'));
    $('#copy-link').onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); } catch { }
      toast(Pub.t('copied'));
    };

    // Comments
    $('#comment-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button');
      const name = f.name.value.trim(), text = f.text.value.trim();
      if (!name || !text) return Swal.fire({ icon: 'warning', title: Pub.t('needBoth'), confirmButtonColor: '#0284c7', confirmButtonText: Pub.t('ok') });
      btn.disabled = true;
      try {
        const r = await Pub.json(`/api/articles/${encodeURIComponent(slug)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, text }) });
        localStorage.setItem('commenter', name);
        art.comments.push(r.comment);
        const list = $('#comment-list');
        if (list.querySelector('.no-comments')) list.innerHTML = '';
        list.insertAdjacentHTML('afterbegin', commentHtml(r.comment));
        $('#c-count').textContent = art.comments.length;
        $('#m-comments').textContent = art.comments.length;
        f.text.value = '';
        toast(Pub.t('thanks'));
      } catch (err) {
        Swal.fire({ icon: 'error', title: Pub.t('error'), text: err.status === 429 ? (Pub.isAr ? 'تعليقات كثيرة، حاول لاحقاً' : 'Too many comments, try later') : '', confirmButtonColor: '#dc2626', confirmButtonText: Pub.t('ok') });
      } finally { btn.disabled = false; }
    };

    // Lightbox
    const lb = $('#lightbox');
    document.querySelectorAll('#prose img[data-zoom]').forEach(img => img.onclick = () => { $('img', lb).src = img.src; lb.classList.add('open'); });
    lb.onclick = () => lb.classList.remove('open');
    document.onkeydown = (e) => { if (e.key === 'Escape') lb.classList.remove('open'); };

    // TOC scroll spy
    const links = [...document.querySelectorAll('#toc a')];
    const heads = links.map(a => document.getElementById(a.dataset.id)).filter(Boolean);
    const spy = () => {
      let cur = null;
      heads.forEach(h => { if (h.getBoundingClientRect().top < 140) cur = h.id; });
      links.forEach(a => a.classList.toggle('active', a.dataset.id === cur));
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // Reading progress
  window.addEventListener('scroll', () => {
    const doc = document.documentElement;
    const p = doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight);
    const bar = document.getElementById('progress');
    if (bar) bar.style.width = Math.min(100, p * 100) + '%';
  }, { passive: true });

  document.addEventListener('DOMContentLoaded', async () => {
    Pub.mountChrome('articles', render);
    Pub.trackVisit();
    try {
      art = await Pub.json(`/api/articles/${encodeURIComponent(slug)}`);
    } catch { return notFound(); }
    render();
    // count one view per session per article
    const vk = `viewed:${slug}`;
    if (!sessionStorage.getItem(vk)) {
      sessionStorage.setItem(vk, '1');
      Pub.json(`/api/articles/${encodeURIComponent(slug)}/view`, { method: 'POST' })
        .then(r => { art.views = r.views; const el = document.getElementById('m-views'); if (el) el.textContent = Pub.num(r.views); }).catch(() => { });
    }
  });
})();
