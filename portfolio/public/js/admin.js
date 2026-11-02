// ==========================================================================
// Secret Admin CMS Panel - Management Logic
// ==========================================================================

let adminPin = localStorage.getItem('portfolio_admin_pin') || '';

document.addEventListener('DOMContentLoaded', () => {
  setupAdminListeners();
});

function setupAdminListeners() {
  const modal = document.getElementById('admin-modal');
  const openBtn = document.getElementById('btn-admin-open');
  const closeBtn = document.getElementById('admin-close-btn');
  const backdrop = document.getElementById('admin-backdrop');
  const pinForm = document.getElementById('admin-pin-form');
  const lockScreen = document.getElementById('admin-lock-screen');
  const contentView = document.getElementById('admin-content-view');

  // Open Modal
  openBtn.addEventListener('click', () => {
    modal.classList.add('open');
    if (adminPin) {
      verifyAdminPin(adminPin);
    } else {
      lockScreen.style.display = 'block';
      contentView.style.display = 'none';
      document.getElementById('admin-pin-input').value = '';
    }
  });

  // Close Modal
  const closeModal = () => modal.classList.remove('open');
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  // PIN Form Submit
  pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = document.getElementById('admin-pin-input').value.trim();
    verifyAdminPin(pin);
  });

  // Admin Tab Switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
      
      const targetTab = e.currentTarget.getAttribute('data-tab');
      e.currentTarget.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');
    });
  });

  // Profile Form Submit
  const profileForm = document.getElementById('form-admin-profile');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfileChanges();
    });
  }

  // Change PIN Form Submit
  const pinChangeForm = document.getElementById('form-change-pin');
  if (pinChangeForm) {
    pinChangeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPin = document.getElementById('adm-new-pin').value.trim();
      await changeAdminPin(newPin);
    });
  }

  // Add Project Button
  document.getElementById('btn-add-new-project').addEventListener('click', () => {
    openProjectFormModal();
  });

  // Add Experience Button
  document.getElementById('btn-add-new-exp').addEventListener('click', () => {
    openExperienceFormModal();
  });
}

// Verify PIN with Server
async function verifyAdminPin(pin) {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      adminPin = pin;
      localStorage.setItem('portfolio_admin_pin', pin);
      document.getElementById('admin-lock-screen').style.display = 'none';
      document.getElementById('admin-content-view').style.display = 'flex';
      populateAdminData();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'رمز غير صحيح',
        text: 'رمز الأمان الذي أدخلته غير مطابق.',
        confirmButtonColor: '#ef4444'
      });
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}

// Populate Admin Fields
function populateAdminData() {
  if (!portfolioData) return;
  const p = portfolioData.profile;

  document.getElementById('adm-nameAr').value = p.nameAr || '';
  document.getElementById('adm-nameEn').value = p.nameEn || '';
  document.getElementById('adm-titleAr').value = p.titleAr || '';
  document.getElementById('adm-titleEn').value = p.titleEn || '';
  document.getElementById('adm-bioAr').value = p.bioAr || '';
  document.getElementById('adm-bioEn').value = p.bioEn || '';
  document.getElementById('adm-email').value = p.email || '';
  document.getElementById('adm-phone').value = p.phone || '';
  document.getElementById('adm-github').value = p.githubUrl || '';
  document.getElementById('adm-linkedin').value = p.linkedinUrl || '';
  document.getElementById('adm-resumeUrl').value = p.resumeUrl || '';
  document.getElementById('adm-avatarUrl').value = p.avatarUrl || '';

  renderAdminProjectsList();
  renderAdminExperiencesList();
}

// Save Profile Changes
async function saveProfileChanges() {
  // Check if file upload was selected
  const fileInput = document.getElementById('adm-avatarFile');
  if (fileInput.files.length > 0) {
    const formData = new FormData();
    formData.append('avatar', fileInput.files[0]);

    try {
      const uploadRes = await fetch('/api/admin/upload-avatar', {
        method: 'POST',
        headers: { 'x-admin-pin': adminPin },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.avatarUrl) {
        document.getElementById('adm-avatarUrl').value = uploadData.avatarUrl;
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  }

  const payload = {
    nameAr: document.getElementById('adm-nameAr').value,
    nameEn: document.getElementById('adm-nameEn').value,
    titleAr: document.getElementById('adm-titleAr').value,
    titleEn: document.getElementById('adm-titleEn').value,
    bioAr: document.getElementById('adm-bioAr').value,
    bioEn: document.getElementById('adm-bioEn').value,
    email: document.getElementById('adm-email').value,
    phone: document.getElementById('adm-phone').value,
    githubUrl: document.getElementById('adm-github').value,
    linkedinUrl: document.getElementById('adm-linkedin').value,
    resumeUrl: document.getElementById('adm-resumeUrl').value,
    avatarUrl: document.getElementById('adm-avatarUrl').value
  };

  try {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      Swal.fire({
        icon: 'success',
        title: 'تم الحفظ بنجاح',
        text: 'تم تحديث البيانات الشخصية وصورة البروفايل فوراً.',
        confirmButtonColor: '#059669'
      });
      fetchPortfolioData();
    }
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

// Render Admin Projects List
function renderAdminProjectsList() {
  const container = document.getElementById('admin-projects-list');
  if (!container || !portfolioData.projects) return;

  container.innerHTML = portfolioData.projects.map(p => `
    <div class="admin-item-row">
      <div class="admin-item-info">
        <h5>${p.titleAr} (${p.titleEn})</h5>
        <p>الرابط المباشر: ${p.liveUrl || 'لا يوجد'} | التصنيف: ${p.category}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="openProjectFormModal('${p.id}')"><i class="pi pi-pencil"></i> تعديل</button>
        <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteProject('${p.id}')"><i class="pi pi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

// Open Project Form Modal (SweetAlert2 Custom HTML)
window.openProjectFormModal = function(id = null) {
  const existing = id ? portfolioData.projects.find(p => p.id === id) : null;
  const isEdit = !!existing;

  Swal.fire({
    title: isEdit ? 'تعديل بيانات المشروع' : 'إضافة مشروع جديد',
    html: `
      <div style="text-align: right; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
        <div>
          <label style="font-weight: 700;">عنوان المشروع (بالعربية):</label>
          <input id="swal-titleAr" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.titleAr : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">Project Title (English):</label>
          <input id="swal-titleEn" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.titleEn : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">الوصف (عربي):</label>
          <textarea id="swal-descAr" class="swal2-textarea" style="width: 100%; margin: 5px 0;" rows="2">${existing ? existing.descriptionAr : ''}</textarea>
        </div>
        <div>
          <label style="font-weight: 700;">Description (English):</label>
          <textarea id="swal-descEn" class="swal2-textarea" style="width: 100%; margin: 5px 0;" rows="2">${existing ? existing.descriptionEn : ''}</textarea>
        </div>
        <div>
          <label style="font-weight: 700;">الرابط الحي المباشر (Live URL):</label>
          <input id="swal-liveUrl" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.liveUrl : 'https://erp.abdallaswe.tech'}">
        </div>
        <div>
          <label style="font-weight: 700;">التقنيات (مفصولة بفاصلة ,):</label>
          <input id="swal-tags" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? (existing.tags || []).join(', ') : '.NET 8, Angular 19, Docker'}">
        </div>
        <div>
          <label style="font-weight: 700;">التصنيف:</label>
          <select id="swal-category" class="swal2-select" style="width: 100%; margin: 5px 0;">
            <option value="erp" ${existing && existing.category === 'erp' ? 'selected' : ''}>أنظمة ERP ومحاسبة</option>
            <option value="web" ${existing && existing.category === 'web' ? 'selected' : ''}>تطبيقات الويب</option>
            <option value="api" ${existing && existing.category === 'api' ? 'selected' : ''}>خدمات APIs</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'حفظ المشروع',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const titleAr = document.getElementById('swal-titleAr').value.trim();
      const titleEn = document.getElementById('swal-titleEn').value.trim();
      if (!titleAr || !titleEn) {
        Swal.showValidationMessage('يرجى ملء عنوان المشروع بالعربية والإنجليزية');
        return false;
      }
      return {
        titleAr,
        titleEn,
        descriptionAr: document.getElementById('swal-descAr').value.trim(),
        descriptionEn: document.getElementById('swal-descEn').value.trim(),
        liveUrl: document.getElementById('swal-liveUrl').value.trim(),
        tags: document.getElementById('swal-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        category: document.getElementById('swal-category').value,
        featured: true
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const payload = result.value;
      const url = isEdit ? `/api/admin/projects/${id}` : '/api/admin/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم تحديث قائمة المشاريع بنجاح', confirmButtonColor: '#059669' });
        await fetchPortfolioData();
        renderAdminProjectsList();
      }
    }
  });
};

// Delete Project
window.deleteProject = async function(id) {
  const result = await Swal.fire({
    title: 'هل أنت متأكد من الحذف؟',
    text: 'سيتم حذف هذا المشروع من المعرض مباشرة.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'تراجع',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (result.isConfirmed) {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': adminPin }
    });

    if (res.ok) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', confirmButtonColor: '#059669' });
      await fetchPortfolioData();
      renderAdminProjectsList();
    }
  }
};

// Render Admin Experiences
function renderAdminExperiencesList() {
  const container = document.getElementById('admin-exp-list');
  if (!container || !portfolioData.experiences) return;

  container.innerHTML = portfolioData.experiences.map(e => `
    <div class="admin-item-row">
      <div class="admin-item-info">
        <h5>${e.roleAr} (${e.companyAr})</h5>
        <p>الفترة: ${e.periodAr}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="openExperienceFormModal('${e.id}')"><i class="pi pi-pencil"></i> تعديل</button>
        <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteExperience('${e.id}')"><i class="pi pi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

// Open Experience Form Modal
window.openExperienceFormModal = function(id = null) {
  const existing = id ? portfolioData.experiences.find(e => e.id === id) : null;
  const isEdit = !!existing;

  Swal.fire({
    title: isEdit ? 'تعديل الخبرة المهنية' : 'إضافة خبرة جديدة',
    html: `
      <div style="text-align: right; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
        <div>
          <label style="font-weight: 700;">المسمى الوظيفي (عربي):</label>
          <input id="swal-exp-roleAr" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.roleAr : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">Job Role (English):</label>
          <input id="swal-exp-roleEn" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.roleEn : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">اسم الشركة / الجهة (عربي):</label>
          <input id="swal-exp-compAr" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.companyAr : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">Company Name (English):</label>
          <input id="swal-exp-compEn" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.companyEn : ''}" required>
        </div>
        <div>
          <label style="font-weight: 700;">الفترة الزمنية (مثال: 2023 - حتى الآن):</label>
          <input id="swal-exp-periodAr" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.periodAr : ''}">
        </div>
        <div>
          <label style="font-weight: 700;">Period (English):</label>
          <input id="swal-exp-periodEn" class="swal2-input" style="width: 100%; margin: 5px 0;" value="${existing ? existing.periodEn : ''}">
        </div>
        <div>
          <label style="font-weight: 700;">المهام والإنجازات (عربي):</label>
          <textarea id="swal-exp-descAr" class="swal2-textarea" style="width: 100%; margin: 5px 0;" rows="2">${existing ? existing.responsibilitiesAr : ''}</textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'حفظ الخبرة',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const roleAr = document.getElementById('swal-exp-roleAr').value.trim();
      const compAr = document.getElementById('swal-exp-compAr').value.trim();
      if (!roleAr || !compAr) {
        Swal.showValidationMessage('يرجى كتابة المسمى الوظيفي واسم الشركة');
        return false;
      }
      return {
        roleAr,
        roleEn: document.getElementById('swal-exp-roleEn').value.trim(),
        companyAr: compAr,
        companyEn: document.getElementById('swal-exp-compEn').value.trim(),
        periodAr: document.getElementById('swal-exp-periodAr').value.trim(),
        periodEn: document.getElementById('swal-exp-periodEn').value.trim(),
        responsibilitiesAr: document.getElementById('swal-exp-descAr').value.trim()
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const url = isEdit ? `/api/admin/experiences/${id}` : '/api/admin/experiences';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify(result.value)
      });

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم تحديث سجل الخبرات بنجاح', confirmButtonColor: '#059669' });
        await fetchPortfolioData();
        renderAdminExperiencesList();
      }
    }
  });
};

// Delete Experience
window.deleteExperience = async function(id) {
  const result = await Swal.fire({
    title: 'هل تريد حذف هذه الخبرة؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'تراجع',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b'
  });

  if (result.isConfirmed) {
    const res = await fetch(`/api/admin/experiences/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': adminPin }
    });

    if (res.ok) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', confirmButtonColor: '#059669' });
      await fetchPortfolioData();
      renderAdminExperiencesList();
    }
  }
};

// Change Admin PIN
async function changeAdminPin(newPin) {
  try {
    const res = await fetch('/api/admin/pin', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin
      },
      body: JSON.stringify({ newPin })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      adminPin = newPin;
      localStorage.setItem('portfolio_admin_pin', newPin);
      Swal.fire({
        icon: 'success',
        title: 'تم بنجاح',
        text: 'تم تغيير رمز الأمان بنجاح. تذكر الرمز الجديد عند تسجيل الدخول القادم.',
        confirmButtonColor: '#059669'
      });
      document.getElementById('adm-new-pin').value = '';
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: data.error || 'تعذر تغيير الرمز' });
    }
  } catch (err) {
    console.error('Error changing pin:', err);
  }
}
