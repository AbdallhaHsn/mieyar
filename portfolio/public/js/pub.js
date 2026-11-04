// ==========================================================================
// Public shared helpers: language, header/footer for sub pages, article card
// ==========================================================================
(function (global) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const S = {
    ar: {
      home: 'الرئيسية', articles: 'المقالات', about: 'نبذة عني', projects: 'المشاريع', contact: 'تواصل معي',
      read: 'اقرأ المقال', min: 'د قراءة', views: 'قراءة', likes: 'إعجاب', comments: 'تعليق', all: 'الكل',
      search: 'ابحث في المقالات…', none: 'لا توجد مقالات مطابقة', featured: 'مقال مميز', latest: 'أحدث المقالات',
      like: 'أعجبني', liked: 'أعجبك', share: 'مشاركة', copy: 'نسخ الرابط', copied: 'تم نسخ الرابط',
      toc: 'محتويات المقال', related: 'مقالات ذات صلة', back: 'كل المقالات',
      commentsTitle: 'التعليقات', yourName: 'اسمك', yourComment: 'اكتب تعليقك…', send: 'إرسال التعليق',
      noComments: 'كن أول من يعلّق على هذا المقال', thanks: 'شكراً! تم نشر تعليقك', notFound: 'المقال غير موجود',
      notFoundText: 'ربما تم حذفه أو نقله.', footer: 'جميع الحقوق محفوظة', ok: 'حسناً', needBoth: 'الاسم والتعليق مطلوبان',
      error: 'حدث خطأ، حاول مجدداً', top: 'للأعلى', updated: 'آخر تحديث', by: 'بقلم', sort: 'الترتيب',
      newest: 'الأحدث', popular: 'الأكثر قراءة', moreArticles: 'عرض كل المقالات'
    },
    en: {
      home: 'Home', articles: 'Articles', about: 'About', projects: 'Projects', contact: 'Contact',
      read: 'Read article', min: 'min read', views: 'views', likes: 'likes', comments: 'comments', all: 'All',
      search: 'Search articles…', none: 'No matching articles', featured: 'Featured', latest: 'Latest articles',
      like: 'Like', liked: 'Liked', share: 'Share', copy: 'Copy link', copied: 'Link copied',
      toc: 'Table of contents', related: 'Related articles', back: 'All articles',
      commentsTitle: 'Comments', yourName: 'Your name', yourComment: 'Write your comment…', send: 'Post comment',
      noComments: 'Be the first to comment on this article', thanks: 'Thanks! Your comment is live', notFound: 'Article not found',
      notFoundText: 'It may have been removed or moved.', footer: 'All rights reserved', ok: 'OK', needBoth: 'Name and comment are required',
      error: 'Something went wrong, please try again', top: 'Back to top', updated: 'Updated', by: 'By', sort: 'Sort',
      newest: 'Newest', popular: 'Most read', moreArticles: 'View all articles'
    }
  };

  const CATS = {
    ar: { erp: 'أنظمة ERP', architecture: 'معمارية البرمجيات', web: 'تطوير الويب', devops: 'DevOps', general: 'عام' },
    en: { erp: 'ERP Systems', architecture: 'Software Architecture', web: 'Web Development', devops: 'DevOps', general: 'General' }
  };

  const Pub = {
    esc,
    get lang() { return localStorage.getItem('portfolio_lang') || 'ar'; },
    get isAr() { return this.lang === 'ar'; },
    t(k) { return S[this.lang][k] || k; },
    cat(c) { return CATS[this.lang][c] || c; },
    pick(o, base) { const ar = o[base + 'Ar'], en = o[base + 'En']; return this.isAr ? (ar || en || '') : (en || ar || ''); },
    fmtDate(iso) {
      return iso ? new Date(iso).toLocaleDateString(this.isAr ? 'ar-SA-u-nu-latn' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    },
    num(n) { return Number(n || 0).toLocaleString('en-US'); },

    cover(a) {
      return a.coverUrl
        ? `<img src="${esc(a.coverUrl)}" alt="${esc(this.pick(a, 'title'))}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ac-ph',innerHTML:'<i class=&quot;pi pi-book&quot;></i>'}))">`
        : '<div class="ac-ph"><i class="pi pi-book"></i></div>';
    },

    card(a, featured = false) {
      return `
      <article class="article-card ${featured ? 'is-featured' : ''}">
        <a href="/article/${esc(a.slug)}" class="ac-cover">${this.cover(a)}<span class="ac-cat">${esc(this.cat(a.category))}</span></a>
        <div class="ac-body">
          <div class="ac-meta"><span><i class="pi pi-calendar"></i>${this.fmtDate(a.createdAt)}</span><span><i class="pi pi-clock"></i>${a.readMinutes} ${this.t('min')}</span></div>
          <h3 class="ac-title"><a href="/article/${esc(a.slug)}">${esc(this.pick(a, 'title'))}</a></h3>
          <p class="ac-excerpt">${esc(this.pick(a, 'excerpt'))}</p>
          <div class="ac-tags">${(a.tags || []).slice(0, 3).map(t => `<span>#${esc(t)}</span>`).join('')}</div>
          <div class="ac-foot">
            <div class="ac-stats"><span><i class="pi pi-eye"></i>${this.num(a.views)}</span><span><i class="pi pi-heart"></i>${this.num(a.likes)}</span><span><i class="pi pi-comment"></i>${this.num(a.commentCount)}</span></div>
            <a href="/article/${esc(a.slug)}" class="ac-read">${this.t('read')} <i class="pi pi-arrow-${this.isAr ? 'left' : 'right'}"></i></a>
          </div>
        </div>
      </article>`;
    },

    applyDir() {
      document.documentElement.lang = this.lang;
      document.documentElement.dir = this.isAr ? 'rtl' : 'ltr';
      document.body.dir = this.isAr ? 'rtl' : 'ltr';
    },

    // Shared header + footer for sub pages
    mountChrome(active, onLangChange) {
      this.applyDir();
      const h = document.getElementById('site-header');
      if (h) {
        h.innerHTML = `
        <header class="navbar"><div class="container nav-container">
          <a href="/" class="nav-brand"><div class="brand-avatar-mini"><span class="avatar-initials">AS</span><span class="status-dot"></span></div>
            <div class="brand-text"><span class="brand-name" id="chrome-name">${this.isAr ? 'عبدالله الصويعي' : 'Abdalla Al-Swe'}</span><span class="brand-tag">${this.isAr ? 'معمارية ERP' : 'ERP Architect'}</span></div></a>
          <nav class="nav-links">
            <a href="/" class="nav-link">${this.t('home')}</a>
            <a href="/#projects" class="nav-link">${this.t('projects')}</a>
            <a href="/articles" class="nav-link ${active === 'articles' ? 'active' : ''}">${this.t('articles')}</a>
            <a href="/#contact" class="nav-link">${this.t('contact')}</a>
          </nav>
          <div class="nav-actions"><button id="chrome-lang" class="btn-icon"><i class="pi pi-globe"></i><span>${this.isAr ? 'EN' : 'عربي'}</span></button></div>
        </div></header>`;
        document.getElementById('chrome-lang').onclick = () => {
          localStorage.setItem('portfolio_lang', this.isAr ? 'en' : 'ar');
          this.mountChrome(active, onLangChange);
          if (onLangChange) onLangChange();
        };
      }
      const f = document.getElementById('site-footer');
      if (f) {
        f.innerHTML = `<footer class="footer"><div class="container footer-container">
          <div class="footer-left"><span class="footer-brand">${this.isAr ? 'عبدالله الصويعي' : 'Abdalla Al-Swe'}</span><span class="footer-copy">© 2026 ${this.t('footer')}</span></div>
          <div class="footer-right"><a href="#" class="footer-link" onclick="window.scrollTo({top:0,behavior:'smooth'});return false"><i class="pi pi-arrow-up"></i> ${this.t('top')}</a></div>
        </div></footer>`;
      }
    },

    async json(url, opts) {
      const r = await fetch(url, opts);
      if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
      return r.json();
    },

    trackVisit() {
      if (sessionStorage.getItem('visit_tracked')) return;
      sessionStorage.setItem('visit_tracked', '1');
      fetch('/api/track', { method: 'POST' }).catch(() => { });
    }
  };

  global.Pub = Pub;
})(window);
