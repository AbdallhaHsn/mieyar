// ==========================================================================
// Portfolio & CV Application - Client Logic & Bilingual Engine
// ==========================================================================

const i18n = {
  ar: {
    'nav.about': 'نبذة عني',
    'nav.projects': 'الأنظمة والمشاريع',
    'nav.experience': 'المسيرة المهنية',
    'nav.skills': 'المهارات التقنية',
    'nav.contact': 'تواصل معي',
    'nav.menu': 'القائمة',
    'hero.greeting': 'مرحباً، أنا',
    'hero.btnProjects': 'استكشف الأنظمة والمشاريع',
    'hero.btnContact': 'تواصل معي مباشرة',
    'hero.btnCv': 'تحميل السيرة الذاتية (CV)',
    'hero.badgePhase2': 'المرحلة الثانية معتمدة',
    'projects.tag': 'معرض الأنظمة والمشاريع',
    'projects.title': 'أنظمة سحابية متكاملة بنيت بأعلى المعايير',
    'projects.desc': 'تصفح أبرز المنصات والمشاريع التي قمت بهندستها وتطويرها، متضمنة روابط حية ومباشرة للأنظمة الجاهزة للاستخدام.',
    'projects.filterAll': 'جميع الأنظمة',
    'projects.filterErp': 'أنظمة ERP والمحاسبة',
    'projects.filterWeb': 'تطبيقات الويب',
    'projects.filterApi': 'الربط والـ APIs',
    'projects.liveDemo': 'معاينة النظام الحي',
    'experience.tag': 'المسيرة المهنية',
    'experience.title': 'خبرات قيادية في هندسة وتطوير النظم',
    'experience.desc': 'محطات عملية متخصصة في قيادة المعماريات التقنية وتطوير برمجيات الأعمال الكبيرة.',
    'skills.tag': 'المهارات التقنية',
    'skills.title': 'التقنيات وحزم الأدوات المتقنة',
    'skills.desc': 'معايير برمجية حديثة تشمل الواجهات، قواعد البيانات، البنى السحابية والتشفير الحكومي.',
    'contact.tag': 'تواصل مباشر',
    'contact.title': 'هل لديك مشروع أو فرصة تعاون؟',
    'contact.desc': 'أنا جاهز دائماً لمناقشة المشاريع الجديدة، هندسة الحلول المحاسبية، وتطوير الأنظمة السحابية.',
    'contact.email': 'البريد الإلكتروني',
    'contact.whatsapp': 'محادثة واتساب مباشرة',
    'contact.location': 'الموقع',
    'contact.formName': 'الاسم الكامل',
    'contact.formEmail': 'البريد الإلكتروني أو الهاتف',
    'contact.formMessage': 'تفاصيل المشروع أو الاستفسار',
    'contact.formSubmit': 'إرسال الرسالة فوراً',
    'contact.successTitle': 'تم إرسال رسالتك بنجاح!',
    'contact.successText': 'شكراً لتواصلك معي، سأقوم بالرد عليك في أقرب وقت ممكن.',
    'footer.toTop': 'للأعلى',
    'admin.title': 'لوحة التحكم السريعة بالمحتوى (CMS)',
    'admin.lockTitle': 'أدخل رمز الأمان (PIN) لتسجيل الدخول',
    'admin.lockDesc': 'هذه اللوحة مخصصة لمالك الموقع لإدارة وتحديث المشاريع والبيانات الشخصية بسهولة.',
    'admin.unlock': 'فتح لوحة التحكم',
    'admin.tabProfile': 'البيانات الشخصية',
    'admin.tabProjects': 'المشاريع والروابط',
    'admin.tabExp': 'الخبرات المهنية',
    'admin.tabSecurity': 'تغيير الـ PIN'
  },
  en: {
    'nav.about': 'About Me',
    'nav.projects': 'Systems & Projects',
    'nav.experience': 'Experience',
    'nav.skills': 'Technical Skills',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'hero.greeting': "Hello, I'm",
    'hero.btnProjects': 'Explore Systems & Demos',
    'hero.btnContact': 'Get in Touch',
    'hero.btnCv': 'Download CV',
    'hero.badgePhase2': 'Phase 2 Certified',
    'projects.tag': 'Systems Showcase',
    'projects.title': 'Production-Grade Enterprise Systems',
    'projects.desc': 'Explore live enterprise platforms and full-stack systems engineered with cutting-edge architectures and compliance standards.',
    'projects.filterAll': 'All Systems',
    'projects.filterErp': 'ERP & FinTech',
    'projects.filterWeb': 'Web Apps',
    'projects.filterApi': 'APIs & Services',
    'projects.liveDemo': 'Open Live Demo',
    'experience.tag': 'Career Journey',
    'experience.title': 'Leadership in Software & System Architecture',
    'experience.desc': 'Professional milestones driving full-stack delivery and mission-critical enterprise systems.',
    'skills.tag': 'Tech Stack & Skills',
    'skills.title': 'Core Competencies & Frameworks',
    'skills.desc': 'State-of-the-art technologies across backend engines, frontend design, cloud infrastructure, and regulatory cryptography.',
    'contact.tag': 'Direct Contact',
    'contact.title': 'Have a Project or Collaboration in Mind?',
    'contact.desc': "I am always open to discussing new enterprise projects, ERP consultancy, and cloud architectures.",
    'contact.email': 'Email Address',
    'contact.whatsapp': 'Direct WhatsApp Chat',
    'contact.location': 'Location',
    'contact.formName': 'Full Name',
    'contact.formEmail': 'Email or Phone',
    'contact.formMessage': 'Project Details or Inquiry',
    'contact.formSubmit': 'Send Message Now',
    'contact.successTitle': 'Message Sent Successfully!',
    'contact.successText': 'Thank you for reaching out! I will respond to your message shortly.',
    'footer.toTop': 'Back to top',
    'admin.title': 'Content Management System (CMS)',
    'admin.lockTitle': 'Enter Admin Security PIN',
    'admin.lockDesc': 'This secured panel allows updating projects, live links, and profile details instantly.',
    'admin.unlock': 'Unlock Admin Panel',
    'admin.tabProfile': 'Personal Profile',
    'admin.tabProjects': 'Projects & Links',
    'admin.tabExp': 'Work Experience',
    'admin.tabSecurity': 'Security PIN'
  }
};

let currentLang = localStorage.getItem('portfolio_lang') || 'ar';
let currentTheme = localStorage.getItem('portfolio_theme') || 'dark';
let portfolioData = null;
let currentProjectFilter = 'all';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  applyLanguage(currentLang);
  fetchPortfolioData();
  setupEventListeners();
});

// Setup UI Listeners
function setupEventListeners() {
  // Lang Toggle
  document.getElementById('btn-lang-toggle').addEventListener('click', () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('portfolio_lang', currentLang);
    applyLanguage(currentLang);
    if (portfolioData) renderAll();
  });

  // Theme Toggle
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('portfolio_theme', currentTheme);
    applyTheme(currentTheme);
  });

  // Mobile Drawer
  const mobileDrawer = document.getElementById('mobile-drawer');
  document.getElementById('btn-mobile-menu').addEventListener('click', () => {
    mobileDrawer.classList.add('open');
  });
  document.getElementById('btn-mobile-close').addEventListener('click', () => {
    mobileDrawer.classList.remove('open');
  });
  document.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
  });

  // Project Category Filters
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentProjectFilter = e.target.getAttribute('data-category');
      renderProjects();
    });
  });

  // Contact Form Submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('msg-name').value;
      const contact = document.getElementById('msg-contact').value;
      const body = document.getElementById('msg-body').value;

      Swal.fire({
        icon: 'success',
        title: currentLang === 'ar' ? i18n.ar['contact.successTitle'] : i18n.en['contact.successTitle'],
        text: currentLang === 'ar' ? i18n.ar['contact.successText'] : i18n.en['contact.successText'],
        confirmButtonColor: '#059669',
        confirmButtonText: currentLang === 'ar' ? 'حسناً' : 'OK'
      });

      contactForm.reset();
    });
  }
}

// Apply Theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon';
  }
}

// Apply Language
function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Toggle button label
  document.getElementById('lang-label').textContent = lang === 'ar' ? 'EN' : 'عربي';

  // Translate static UI tags
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });

  // Document Title
  const isAr = lang === 'ar';
  document.getElementById('page-title').textContent = isAr 
    ? 'عبدالله الصويعي | مهندس برمجيات ونظم مؤسسات ERP' 
    : 'Abdalla Al-Swe | Enterprise ERP Architect';
}

// Fetch Portfolio Data from API
async function fetchPortfolioData() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error('Failed to load portfolio');
    portfolioData = await res.json();
    renderAll();
  } catch (err) {
    console.error('Error fetching portfolio data:', err);
  }
}

// Render All Sections
function renderAll() {
  if (!portfolioData) return;
  const isAr = currentLang === 'ar';
  const p = portfolioData.profile;

  // Header & Hero Profile
  document.getElementById('nav-brand-name').textContent = isAr ? p.nameAr : p.nameEn;
  document.getElementById('nav-brand-tag').textContent = isAr ? 'معمارية ERP' : 'ERP Architect';
  document.getElementById('hero-name').textContent = isAr ? p.nameAr : p.nameEn;
  document.getElementById('hero-title-text').textContent = isAr ? p.titleAr : p.titleEn;
  document.getElementById('hero-bio-text').textContent = isAr ? p.bioAr : p.bioEn;
  document.getElementById('hero-status-text').textContent = isAr ? p.statusBadgeAr : p.statusBadgeEn;
  document.getElementById('footer-name').textContent = isAr ? p.nameAr : p.nameEn;

  // Avatar
  const avatar = document.getElementById('hero-avatar');
  if (avatar && p.avatarUrl) {
    avatar.src = p.avatarUrl;
  }

  // Links
  if (p.resumeUrl) document.getElementById('hero-cv-btn').href = p.resumeUrl;
  if (p.githubUrl) document.getElementById('social-github').href = p.githubUrl;
  if (p.linkedinUrl) document.getElementById('social-linkedin').href = p.linkedinUrl;
  if (p.whatsappUrl) {
    document.getElementById('social-whatsapp').href = p.whatsappUrl;
    document.getElementById('contact-link-whatsapp').href = p.whatsappUrl;
    document.getElementById('contact-whatsapp-val').textContent = p.phone || '+966 50 000 0000';
  }
  if (p.email) {
    document.getElementById('social-email').href = `mailto:${p.email}`;
    document.getElementById('contact-link-email').href = `mailto:${p.email}`;
    document.getElementById('contact-email-val').textContent = p.email;
  }
  document.getElementById('contact-location-val').textContent = isAr ? p.locationAr : p.locationEn;

  renderStats();
  renderProjects();
  renderExperiences();
  renderSkills();
}

// Render Stats
function renderStats() {
  const container = document.getElementById('stats-grid');
  if (!container || !portfolioData.stats) return;
  const isAr = currentLang === 'ar';

  container.innerHTML = portfolioData.stats.map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${isAr ? s.labelAr : s.labelEn}</div>
    </div>
  `).join('');
}

// Render Projects
function renderProjects() {
  const container = document.getElementById('projects-grid');
  if (!container || !portfolioData.projects) return;
  const isAr = currentLang === 'ar';

  let list = portfolioData.projects;
  if (currentProjectFilter !== 'all') {
    list = list.filter(p => p.category === currentProjectFilter);
  }

  container.innerHTML = list.map(p => {
    const title = isAr ? p.titleAr : p.titleEn;
    const desc = isAr ? p.descriptionAr : p.descriptionEn;
    const badge = isAr ? p.badgeAr : p.badgeEn;
    const liveText = isAr ? i18n.ar['projects.liveDemo'] : i18n.en['projects.liveDemo'];

    return `
      <div class="project-card ${p.featured ? 'featured' : ''}">
        <div class="project-top-meta">
          <div class="project-icon-box">
            <i class="pi ${p.icon || 'pi-box'}"></i>
          </div>
          ${badge ? `<span class="project-badge">${badge}</span>` : ''}
        </div>
        <h3 class="project-title">${title}</h3>
        <p class="project-desc">${desc}</p>
        <div class="project-tags">
          ${(p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('')}
        </div>
        <div class="project-actions">
          ${p.liveUrl ? `
            <a href="${p.liveUrl}" target="_blank" class="btn-live">
              <i class="pi pi-external-link"></i>
              <span>${liveText}</span>
            </a>
          ` : ''}
          ${p.repoUrl ? `
            <a href="${p.repoUrl}" target="_blank" class="btn-icon" title="Source Code">
              <i class="pi pi-github"></i>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Render Experiences
function renderExperiences() {
  const container = document.getElementById('timeline-container');
  if (!container || !portfolioData.experiences) return;
  const isAr = currentLang === 'ar';

  container.innerHTML = portfolioData.experiences.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-meta">
          <h4 class="timeline-role">${isAr ? e.roleAr : e.roleEn}</h4>
          <span class="timeline-period">${isAr ? e.periodAr : e.periodEn}</span>
        </div>
        <div class="timeline-company">
          <i class="pi pi-building"></i>
          <span>${isAr ? e.companyAr : e.companyEn}</span>
        </div>
        <p class="timeline-desc">${isAr ? e.responsibilitiesAr : e.responsibilitiesEn}</p>
      </div>
    </div>
  `).join('');
}

// Render Skills
function renderSkills() {
  const container = document.getElementById('skills-grid');
  if (!container || !portfolioData.skills) return;
  const isAr = currentLang === 'ar';

  container.innerHTML = portfolioData.skills.map(cat => `
    <div class="skill-category-card">
      <h4 class="skill-cat-title">
        <i class="pi pi-check-circle"></i>
        <span>${isAr ? cat.categoryAr : cat.categoryEn}</span>
      </h4>
      <div class="skill-chips">
        ${(cat.items || []).map(item => `<span class="skill-chip">${item}</span>`).join('')}
      </div>
    </div>
  `).join('');
}
