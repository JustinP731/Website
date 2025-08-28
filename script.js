/* ============================================================================
   Cazza Admin — cleaned script (single source of truth)
   - Nav switching
   - Applicant list + details with room preview
   - Create Tenant form with applicant autofill + room preview
   - Tenant list rendering
   - List Management (add room, gallery, modal viewer)
   - Overview counters keep in sync
   ============================================================================ */
(() => {
  // ---------- DATA ------------------------------------------------------------
  const APPLICANTS = {
    "Applicant 1": {
      name: "Jake Rivera",
      email: "jakerivera@example.com",
      contact: "+63 912 345 6789",
      date: "2025-09-01",
      room: "101"
    },
    "Applicant 2": {
      name: "Lorenzo Deguzman",
      email: "enzodeguzzman@example.com",
      contact: "+63 923 456 7890",
      date: "2025-10-15",
      room: "201"
    }
  };
  const ROOM_IMAGES = {
    "101": "pngs/rooms/101.jpg",
    "102": "pngs/rooms/102.jpg",
    "201": "pngs/rooms/201.jpg",
    "202": "pngs/rooms/202.jpg",
    "301": "pngs/rooms/301.jpg",
    "302": "pngs/rooms/302.jpg"
  };
  window.APPLICANTS = APPLICANTS;

  // ---------- HELPERS ---------------------------------------------------------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const sanitizeContact = (raw='') => raw.replace(/^\s*\+?63\s*/, '').replace(/\D/g, '');
  const normRoom = (v) => String(v || '').toLowerCase().replace(/\s+/g, '').replace(/^room/, '');

  function showSection(id) {
    $$('.content-section').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      // replay stagger animations inside the newly visible section
      el.querySelectorAll('.stagger-list').forEach(list => {
        list.classList.remove('stagger-list');
        void list.offsetWidth;           // force reflow
        list.classList.add('stagger-list');
      });
    }
  }

  function setActiveNav(targetId) {
    $$('.nav-link').forEach(a => a.classList.remove('active', 'bg-[#2c4e3a]'));
    const link = document.querySelector(`.nav-link[data-target="${targetId}"]`);
    if (link) link.classList.add('active', 'bg-[#2c4e3a]');
  }

  function updateOverviewCounts() {
    const reqEl = document.getElementById('overview-request-count');
    const pendEl = document.getElementById('overview-pending-count');
    if (!reqEl || !pendEl) return;
    const container = document.getElementById('applicant-content');
    const allApplicants = container ? container.querySelectorAll('.applicant-card') : [];
    const pendingApplicants = container ? container.querySelectorAll('.applicant-card.pending, .applicant-card[data-status="pending"]') : [];
    reqEl.textContent = allApplicants.length;
    pendEl.textContent = pendingApplicants.length;
  }

  function updateRoomPreview(roomValue) {
    const img = document.getElementById('room-preview-img');
    const cap = document.getElementById('room-preview-caption');
    if (!img || !cap) return;
    const r = String(roomValue || '').trim();
    if (!r) {
      img.src = '';
      img.alt = 'No room selected';
      cap.textContent = 'Select an applicant to preview the room.';
      return;
    }
    const src = ROOM_IMAGES[r] || `https://picsum.photos/seed/room${encodeURIComponent(r)}/960/540`;
    img.src = src;
    img.alt = `Room ${r}`;
    cap.textContent = `Room ${r}`;
  }

  function updateApplicantRoomPreview(roomValue) {
    const img = document.getElementById('ad-room-img');
    const cap = document.getElementById('ad-room-cap');
    if (!img || !cap) return;
    const raw = String(roomValue || '').trim();
    if (!raw) {
      img.src = '';
      img.alt = 'No room selected';
      cap.textContent = '';
      return;
    }
    const key = normRoom(raw).replace(/^0+/, '') || raw;
    const src = ROOM_IMAGES[key] || ROOM_IMAGES[raw] || `https://picsum.photos/seed/room${encodeURIComponent(key)}/960/540`;
    img.src = src;
    img.alt = `Room ${key}`;
    cap.textContent = `Room ${key}`;
  }

  function setRoomSelect(roomValue) {
    const roomSelect =
      document.getElementById('room') ||
      document.getElementById('roomNumber') ||
      document.querySelector('select[name="room"], select[name="roomNumber"]');
    if (!roomSelect || !roomValue) return;
    const target = normRoom(roomValue);
    let found = false;
    Array.from(roomSelect.options).forEach(opt => {
      const normValue = normRoom(opt.value || '');
      const normText = normRoom(opt.textContent || '');
      if (normValue === target || normText === target) {
        roomSelect.value = opt.value;
        found = true;
      }
    });
    if (!found) {
      const opt = document.createElement('option');
      opt.value = target;
      opt.textContent = `Room ${target}`;
      roomSelect.appendChild(opt);
      roomSelect.value = opt.value;
    }
    roomSelect.dispatchEvent(new Event('change'));
  }

  function lockFields(lock) {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const contactInput = document.getElementById('contact');
    const roomSelect =
      document.getElementById('room') ||
      document.getElementById('roomNumber') ||
      document.querySelector('select[name="room"], select[name="roomNumber"]');
    if (nameInput) nameInput.readOnly = !!lock;
    if (emailInput) emailInput.readOnly = !!lock;
    if (contactInput) contactInput.readOnly = !!lock;
    if (roomSelect) roomSelect.disabled = !!lock;
  }

  function prefillFromApplicant(app) {
    if (!app) return;
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const contactInput = document.getElementById('contact');
    if (nameInput) nameInput.value = app.name || '';
    if (emailInput) emailInput.value = app.email || '';
    if (contactInput) contactInput.value = sanitizeContact(app.contact || '');
    const chosenRoom = app.room || app.roomNumber || app.selectedRoom || app.preferredRoom;
    setRoomSelect(chosenRoom);
    updateRoomPreview(chosenRoom);
    lockFields(true);
  }

  function renderTenants(list, tenants) {
    if (!list) return;
    list.innerHTML = '';
    tenants.forEach(tenant => {
      const card = document.createElement('div');
      card.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm';
      card.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
            ${tenant.name?.charAt(0) || '?'}
          </div>
          <span class="text-gray-800 font-medium">${tenant.name || ''}</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors duration-200" title="View">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z"/>
            </svg>
          </button>
          <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors duration-200" title="More">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>`;
      list.appendChild(card);
    });
  }

  function hydrateApplicantCards() {
    $$('.applicant-card').forEach(card => {
      const key = card.getAttribute('data-key');
      const data = APPLICANTS[key];
      if (!data) return;
      const nameEl = card.querySelector('.applicant-label');
      const emailEl = card.querySelector('.applicant-email');
      const avatar = card.querySelector('.avatar') || card.querySelector('div.w-10');
      if (nameEl) nameEl.textContent = data.name;
      if (emailEl) emailEl.textContent = data.email;
      if (avatar) avatar.textContent = (data.name?.trim()?.[0] || 'A').toUpperCase();
    });
  }

  function fillDetails(key) {
    const data = APPLICANTS[key] || Object.values(APPLICANTS)[0];
    if (!data) return;
    const hName = document.getElementById('ad-name');
    const hInit = document.getElementById('ad-name-initial');
    if (hName) hName.textContent = data.name;
    if (hInit) hInit.textContent = (data.name?.trim()?.[0] || 'A').toUpperCase();
    const nameField = document.getElementById('ad-name-field');
    const emailField = document.getElementById('ad-email-field');
    const contactField = document.getElementById('ad-contact-field');
    const dateField = document.getElementById('ad-date-field');
    const roomField = document.getElementById('ad-room-field');
    if (nameField) { nameField.value = data.name; nameField.readOnly = true; }
    if (emailField) { emailField.value = data.email; emailField.readOnly = true; }
    if (contactField) { contactField.value = data.contact; contactField.readOnly = true; }
    if (dateField) { dateField.value = data.date; }
    if (roomField) { roomField.value = data.room ? `Room ${data.room}` : ''; }
    updateApplicantRoomPreview(data.room);
    const toField = document.getElementById('ad-to');
    const msg = document.getElementById('ad-message');
    if (toField) toField.value = data.email;
    if (msg) {
      msg.value = `Dear ${data.name},

We are pleased to inform you that your request for residency at Cazza Zamora Residences has been reviewed and approved.

To finalize the next steps in your application process, kindly proceed to our office during business hours where our team will assist you with the necessary documentation and further details.

Sincerely,
The Management Team
Cazza Zamora Residences`;
    }
    showSection('applicant-details-content');
  }
  window.fillDetails = fillDetails;

  // ---------- MAIN ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // Nav
    $$('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        if (target) {
          showSection(target);
          setActiveNav(target);
        }
      });
    });

    // Applicant list -> details (capture to stop legacy listeners)
    document.getElementById('applicant-content')?.addEventListener('click', (e) => {
      const card = e.target.closest('.applicant-card');
      if (!card) return;
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      const key = card.dataset.key || card.querySelector('.applicant-label')?.textContent?.trim();
      if (key) fillDetails(key);
    }, true);

    // Back buttons
    document.getElementById('back-to-applicants')?.addEventListener('click', () => {
      showSection('applicant-content');
      setActiveNav('applicant-content');
    });
    document.getElementById('add-room-btn')?.addEventListener('click', () => showSection('add-room-content'));
    document.getElementById('back-to-list')?.addEventListener('click', () => showSection('list-management-content'));

    // Create Tenant nav
    document.getElementById('create-tenant-btn')?.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-target') || 'create-tenant-content';
      showSection(target);
    });
    document.getElementById('back-to-tenants')?.addEventListener('click', () => showSection('tenant-content'));

    // Applicant picker + inputs
    const applicantPicker = document.getElementById('applicant-picker');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const contactInput = document.getElementById('contact');
    const roomSelect =
      document.getElementById('room') ||
      document.getElementById('roomNumber') ||
      document.querySelector('select[name="room"], select[name="roomNumber"]');

    const APPLICANTS_BY_NAME = Object.values(APPLICANTS).reduce((acc, a) => {
      if (a && a.name) acc[a.name.trim().toLowerCase()] = a;
      return acc;
    }, {});

    // Populate applicant dropdown
    if (applicantPicker) {
      applicantPicker.innerHTML = '<option value="">— Pick an applicant —</option>';
      Object.values(APPLICANTS).forEach(a => {
        if (!a?.name) return;
        const opt = document.createElement('option');
        opt.value = a.name;
        opt.textContent = a.name;
        applicantPicker.appendChild(opt);
      });
      applicantPicker.addEventListener('change', () => {
        const key = applicantPicker.value.trim().toLowerCase();
        prefillFromApplicant(APPLICANTS_BY_NAME[key]);
      });
    }

    // Name change -> try autofill
    nameInput?.addEventListener('change', () => {
      const key = nameInput.value.trim().toLowerCase();
      prefillFromApplicant(APPLICANTS_BY_NAME[key]);
    });

    // Keep room preview in sync
    roomSelect?.addEventListener('change', (e) => updateRoomPreview(e.target.value));

    // Tenants list + form submit
    const tenants = [];
    const tenantList = document.getElementById('tenant-list');
    const createTenantForm = document.getElementById('create-tenant-form');
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const closeModalButton = document.getElementById('close-modal');

    function showMessage(txt) {
      if (!messageModal || !messageText) return;
      messageText.textContent = txt || '';
      messageModal.classList.remove('hidden');
    }
    function hideMessage() {
      messageModal?.classList.add('hidden');
    }
    closeModalButton?.addEventListener('click', hideMessage);

    createTenantForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const newTenant = {
        name: nameInput?.value || '',
        email: emailInput?.value || '',
        contact: contactInput?.value || '',
        room: roomSelect?.value || ''
      };
      tenants.push(newTenant);
      renderTenants(tenantList, tenants);
      showMessage(`Tenant "${newTenant.name}" has been added successfully.`);
      createTenantForm.reset();
      lockFields(false);
      updateRoomPreview('');
      showSection('tenant-content');
    });

    // Image gallery (Add Room)
    const imagesInput = document.getElementById('room-images');
    const gallery = document.getElementById('room-gallery');
    const imagesModal = document.getElementById('images-modal');
    const imagesModalGrid = document.getElementById('images-modal-grid');
    let selectedImages = []; // { file, url, id }
    let imgId = 0;

    function renderGallery() {
      if (!gallery) return;
      gallery.innerHTML = '';
      if (selectedImages.length === 0) {
        gallery.innerHTML = '<div class="col-span-full text-center text-gray-400 text-sm py-8">No images selected</div>';
        return;
      }
      selectedImages.forEach(({ url, id }) => {
        const item = document.createElement('div');
        item.className = 'relative group';
        item.innerHTML = `
          <img src="${url}" class="w-full h-28 object-cover rounded-lg shadow-sm" alt="preview">
          <button data-remove="${id}" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 hover:bg-white border border-gray-200 rounded-full p-1 shadow" aria-label="Remove image">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>`;
        gallery.appendChild(item);
      });
    }

    imagesInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((f) => {
        const url = URL.createObjectURL(f);
        selectedImages.push({ file: f, url, id: ++imgId });
      });
      renderGallery();
      imagesInput.value = '';
    });

    gallery?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-remove]');
      if (!btn) return;
      const id = Number(btn.getAttribute('data-remove'));
      selectedImages = selectedImages.filter((im) => {
        if (im.id === id) {
          URL.revokeObjectURL(im.url);
          return false;
        }
        return true;
      });
      renderGallery();
    });

    document.getElementById('save-room')?.addEventListener('click', () => {
      const typeInput = document.getElementById('room-type');
      const priceInput = document.getElementById('room-price');
      const capacityInput = document.getElementById('room-capacity');
      const noPetsInput = document.getElementById('no-animals');

      const markInvalid = el => el && el.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      const clearInvalid = el => el && el.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');

      [typeInput, priceInput, capacityInput].forEach(el => el?.addEventListener('input', () => clearInvalid(el)));

      const type = (typeInput?.value || '').trim();
      const priceRaw = (priceInput?.value || '').trim();
      const price = Number(priceRaw);
      const capRaw = (capacityInput?.value || '').trim();
      const capacity = Number(capRaw);
      const dormType = (document.querySelector('input[name="dorm-type"]:checked')?.value || '').trim();
      const noPets = !!noPetsInput?.checked;

      [typeInput, priceInput, capacityInput].forEach(clearInvalid);
      if (!type) { markInvalid(typeInput); typeInput?.focus(); return; }
      if (!priceRaw || isNaN(price) || price <= 0) { markInvalid(priceInput); priceInput?.focus(); return; }
      if (!capRaw || isNaN(capacity) || capacity < 1) { markInvalid(capacityInput); capacityInput?.focus(); return; }

      const list = document.getElementById('room-list');
      const card = document.createElement('div');
      card.className = "p-4 bg-gray-50 rounded-lg shadow flex justify-between items-center";
      card.setAttribute('data-room-card', '1');
      card.dataset.images = JSON.stringify(selectedImages.map(im => im.url));
      const badges = [
        dormType ? `<span class="px-2 py-0.5 text-xs rounded-full bg-gray-200">${dormType}</span>` : '',
        noPets ? `<span class="px-2 py-0.5 text-xs rounded-full bg-gray-200">No pets</span>` : ''
      ].filter(Boolean).join(' ');
      card.innerHTML = `
        <div class="space-y-1">
          <h3 class="text-gray-900 font-semibold">${type}</h3>
          <p class="text-sm text-gray-600">₱${price.toLocaleString()} · Capacity: ${capacity}</p>
          <div class="flex gap-2">${badges}</div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm view-images-btn">
            View images (${selectedImages.length})
          </button>
        </div>`;
      list?.appendChild(card);

      // reset
      if (typeInput) typeInput.value = '';
      if (priceInput) priceInput.value = '';
      if (capacityInput) capacityInput.value = '';
      const checked = document.querySelector('input[name="dorm-type"]:checked');
      if (checked) checked.checked = false;
      if (noPetsInput) noPetsInput.checked = false;
      selectedImages.forEach(im => URL.revokeObjectURL(im.url));
      selectedImages = [];
      renderGallery();
      showSection('list-management-content');
    });

    // Images modal open/close
    document.body.addEventListener('click', (e) => {
      if (e.target.closest('#images-modal-close')) {
        imagesModal?.classList.add('hidden');
        return;
      }
      const btn = e.target.closest('.view-images-btn');
      if (!btn) return;
      const card = btn.closest('[data-room-card]');
      if (!card || !imagesModal || !imagesModalGrid) return;
      const imgs = JSON.parse(card.dataset.images || '[]');
      imagesModalGrid.innerHTML = imgs.length
        ? imgs.map(u => `<img src="${u}" class="w-full h-40 object-cover rounded-lg shadow-sm" alt="room">`).join('')
        : '<div class="col-span-full text-center text-gray-400 py-8">No images</div>';
      imagesModal.classList.remove('hidden');
    });
    imagesModal?.addEventListener('click', (e) => { if (e.target === imagesModal) imagesModal.classList.add('hidden'); });

    // Applicant list hydration + counters
    hydrateApplicantCards();
    updateOverviewCounts();
    const applicantContainer = document.getElementById('applicant-list') || document.getElementById('applicant-content');
    if (applicantContainer) {
      const obs = new MutationObserver(updateOverviewCounts);
      obs.observe(applicantContainer, { childList: true, subtree: true });
    }

    // Email submit (demo)
    document.getElementById('ad-submit')?.addEventListener('click', () => alert('Message submitted (demo only).'));
  });
})();