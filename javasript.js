document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const applicantCards = document.querySelectorAll('.applicant-card');
    const contentSections = document.querySelectorAll('.content-section');
    const backButton = document.getElementById('back-to-applicants');

    function showContent(targetId) {
        contentSections.forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            link.classList.add('bg-[#2c4e3a]', 'active');
            showContent(link.dataset.target);
        });
    });

    applicantCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            showContent(card.dataset.target);
        });
    });

    if (backButton) {
        backButton.addEventListener('click', () => {
            showContent('applicant-content');
            document.querySelector('[data-target="applicant-content"]').classList.add('bg-[#2c4e3a]', 'active');
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const applicantCards = document.querySelectorAll('.applicant-card');
    const contentSections = document.querySelectorAll('.content-section');
    const backButton = document.getElementById('back-to-applicants');
    const createTenantForm = document.getElementById('create-tenant-form');
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const closeModalButton = document.getElementById('close-modal');
    const createTenantBtn = document.getElementById('create-tenant-btn');
    const backToTenantsBtn = document.getElementById('back-to-tenants');
    const tenantListContainer = document.getElementById('tenant-list');

    // In-memory array to store tenant data
    let tenants = [];

    // Function to dynamically render the tenant list
    function renderTenants() {
        tenantListContainer.innerHTML = ''; // Clear existing list
        tenants.forEach(tenant => {
            const tenantCard = document.createElement('div');
            tenantCard.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm';
            tenantCard.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <div
                                class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                                ${tenant.name.charAt(0)}
                            </div>
                            <span class="text-gray-800 font-medium">${tenant.name}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button
                                class="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors duration-200">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                                </svg>
                            </button>
                            <button
                                class="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors duration-200">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    `;
            tenantListContainer.appendChild(tenantCard);
        });
    }

    // Function to show a custom message modal
    function showMessage(message) {
        messageText.textContent = message;
        messageModal.classList.remove('hidden');
    }

    // Function to hide a custom message modal
    function hideMessage() {
        messageModal.classList.add('hidden');
    }

    // Event listener to close the modal
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideMessage);
    }

    // Function to show a specific content section and hide others
    function showContent(targetId) {
        contentSections.forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    // Add click listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            link.classList.add('bg-[#2c4e3a]', 'active');
            showContent(link.dataset.target);
        });
    });

    // Add click listeners to applicant cards
    applicantCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // Ignore clicks on the dropdown button
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            showContent(card.dataset.target);
        });
    });

    // Add click listener to the "Back to Applicants" button
    if (backButton) {
        backButton.addEventListener('click', () => {
            showContent('applicant-content');
            // Find and activate the "Applicant" nav link
            const applicantNavLink = document.querySelector('[data-target="applicant-content"]');
            if (applicantNavLink) {
                applicantNavLink.classList.add('bg-[#2c4e3a]', 'active');
            }
        });
    }

    // New listener for the "Create Tenant" button
    if (createTenantBtn) {
        createTenantBtn.addEventListener('click', () => {
            showContent(createTenantBtn.dataset.target);
        });
    }

    // New listener for the "Back to Tenants" button inside the form
    if (backToTenantsBtn) {
        backToTenantsBtn.addEventListener('click', () => {
            showContent('tenant-content');
        });
    }

    // Handle form submission for the new create tenant form
    if (createTenantForm) {
        createTenantForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTenant = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                contact: document.getElementById('contact').value,
                room: document.getElementById('room').value
            };
            tenants.push(newTenant); // Add the new tenant to the array
            renderTenants(); // Re-render the list with the new tenant
            showMessage(`Tenant "${newTenant.name}" has been added successfully.`);
            createTenantForm.reset(); // Reset the form fields
            showContent('tenant-content'); // Navigate back to the tenant list
        });
    }

    // Initial render of tenants on page load
    renderTenants();
});

// --- helper: show only one content section
  function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }

  // nav switching
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('data-target');
      if (target) showSection(target);
      document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active', 'bg-[#2c4e3a]'));
      link.classList.add('active','bg-[#2c4e3a]');
    });
  });

  // Add Room button -> open form
  const addRoomBtn = document.getElementById('add-room-btn');
  if (addRoomBtn) {
    addRoomBtn.addEventListener('click', () => showSection('add-room-content'));
  }

  // Back to list
  const backToListBtn = document.getElementById('back-to-list');
  if (backToListBtn) {
    backToListBtn.addEventListener('click', () => showSection('list-management-content'));
  }

  // Image preview
  const fileInput = document.getElementById('room-image');
  const img = document.getElementById('room-preview');
  const ph = document.getElementById('room-preview-ph');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      img.src = url;
      img.classList.remove('hidden');
      ph.classList.add('hidden');
    });
  }

document.addEventListener('DOMContentLoaded', () => {
  const imagesInput     = document.getElementById('room-images');
  const gallery         = document.getElementById('room-gallery');
  const saveRoomBtn     = document.getElementById('save-room');

  const imagesModal     = document.getElementById('images-modal');
  const imagesModalGrid = document.getElementById('images-modal-grid');

  let selectedImages = []; // { file, url, id }
  let imgId = 0;

  function renderGallery() {
    if (!gallery) return;
    gallery.innerHTML = '';
    if (selectedImages.length === 0) {
      gallery.innerHTML =
        '<div class="col-span-full text-center text-gray-400 text-sm py-8">No images selected</div>';
      return;
    }
    selectedImages.forEach(({ url, id }) => {
      const item = document.createElement('div');
      item.className = 'relative group';
      item.innerHTML = `
        <img src="${url}" class="w-full h-28 object-cover rounded-lg shadow-sm" alt="preview">
        <button data-remove="${id}"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition
                 bg-white/90 hover:bg-white border border-gray-200 rounded-full p-1 shadow">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>`;
      gallery.appendChild(item);
    });
  }

  // pick multiple files
  imagesInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      selectedImages.push({ file: f, url, id: ++imgId });
    });
    renderGallery();
    imagesInput.value = '';
  });

  // remove thumb
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

// ✅ Save Room — validate + append to #room-list (UPDATED)
const saveBtn = document.getElementById('save-room');
if (saveBtn) {
  const typeInput     = document.getElementById('room-type');      // <select>
  const priceInput    = document.getElementById('room-price');     // <input number>
  const capacityInput = document.getElementById('room-capacity');  // <input number>
  const noPetsInput   = document.getElementById('no-animals');     // <checkbox>

  // helpers to mark/clear invalid fields
  const markInvalid  = el => el && el.classList.add('border-red-500','focus:border-red-500','focus:ring-red-500');
  const clearInvalid = el => el && el.classList.remove('border-red-500','focus:border-red-500','focus:ring-red-500');

  [typeInput, priceInput, capacityInput].forEach(el => el?.addEventListener('input', () => clearInvalid(el)));

  saveBtn.addEventListener('click', () => {
    const type      = (typeInput?.value || '').trim();
    const priceRaw  = (priceInput?.value || '').trim();
    const price     = Number(priceRaw);
    const capRaw    = (capacityInput?.value || '').trim();
    const capacity  = Number(capRaw);
    const dormType  = (document.querySelector('input[name="dorm-type"]:checked')?.value || '').trim();
    const noPets    = !!noPetsInput?.checked;

    // reset any previous errors
    [typeInput, priceInput, capacityInput].forEach(clearInvalid);

    // ✋ validations
    if (!type) { markInvalid(typeInput); typeInput?.focus(); return; }
    if (!priceRaw || isNaN(price) || price <= 0) { markInvalid(priceInput); priceInput?.focus(); return; }
    if (!capRaw || isNaN(capacity) || capacity < 1) { markInvalid(capacityInput); capacityInput?.focus(); return; }
    // (optional) enforce dormType:
    // if (!dormType) { alert('Please choose a dorm type.'); return; }

    // build the card (uses your existing selectedImages + renderGallery)
    const list = document.getElementById('room-list');
    const card = document.createElement('div');
    card.className = "p-4 bg-gray-50 rounded-lg shadow flex justify-between items-center";
    card.setAttribute('data-room-card', '1'); // so your modal code finds it
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
      </div>
    `;
    list.appendChild(card);

    // reset form + gallery
    if (typeInput) typeInput.value = '';
    if (priceInput) priceInput.value = '';
    if (capacityInput) capacityInput.value = '';
    const checked = document.querySelector('input[name="dorm-type"]:checked');
    if (checked) checked.checked = false;
    if (noPetsInput) noPetsInput.checked = false;
    selectedImages = [];
    renderGallery();

    // go back to list
    showSection('list-management-content');
  });
}

// ✅ Open images modal (read images from the clicked card)
document.body.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('#images-modal-close');
  if (closeBtn && imagesModal) {
    imagesModal.classList.add('hidden');
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

  // close modal by backdrop click
  imagesModal?.addEventListener('click', (e) => {
    if (e.target === imagesModal) imagesModal.classList.add('hidden');
  });

  renderGallery();
});

// === Overview <-> Applicant counts sync ===
function updateApplicantOverview() {
  const reqEl = document.getElementById('overview-request-count');
  const pendEl = document.getElementById('overview-pending-count');
  if (!reqEl || !pendEl) return;

  const container = document.getElementById('applicant-content');
  if (!container) return;

  const allApplicants = container.querySelectorAll('.applicant-card');
  const pendingApplicants = container.querySelectorAll(
    '.applicant-card.pending, .applicant-card[data-status="pending"]'
  );

  reqEl.textContent = allApplicants.length;
  pendEl.textContent = pendingApplicants.length;
}

// run once after DOM is ready
document.addEventListener('DOMContentLoaded', updateApplicantOverview);

// keep in sync if the Applicant list changes dynamically
const applicantContainer = document.getElementById('applicant-content');
if (applicantContainer) {
  const obs = new MutationObserver(() => updateApplicantOverview());
  obs.observe(applicantContainer, { childList: true, subtree: true });
}

// --- DATA --------------------------------------------------------------
const APPLICANTS = {
  "Applicant 1": {
    name: "Jake Rivera",
    email: "jakerivera@example.com",
    contact: "+63 912 345 6789",
    date: "2025-09-01"
  },
  "Applicant 2": {
    name: "Lorenzo Deguzman",
    email: "enzodeguzzman@example.com",
    contact: "+63 923 456 7890",
    date: "2025-10-15"
  }
};

// --- LIST HYDRATION (updates the visible cards in the list) -----------
(function hydrateApplicantCards() {
  document.querySelectorAll('.applicant-card').forEach(card => {
    const key  = card.getAttribute('data-key');
    const data = APPLICANTS[key];
    if (!data) return;

    const nameEl  = card.querySelector('.applicant-label');
    const emailEl = card.querySelector('.applicant-email');
    // support either .avatar or just the first circle div
    const avatar  = card.querySelector('.avatar') || card.querySelector('div.w-10');

    if (nameEl)  nameEl.textContent  = data.name;
    if (emailEl) emailEl.textContent = data.email;
    if (avatar)  avatar.textContent  = (data.name?.trim()?.[0] || 'A').toUpperCase();
  });
})();

// --- DETAILS FILL (called when a card is clicked) ----------------------
function fillDetails(key) {
  const data = APPLICANTS[key] || Object.values(APPLICANTS)[0];
  if (!data) return;

  // header avatar + name
  const hName = document.getElementById('ad-name');
  const hInit = document.getElementById('ad-name-initial');
  if (hName) hName.textContent = data.name;
  if (hInit) hInit.textContent = (data.name?.trim()?.[0] || 'A').toUpperCase();

  // form fields (name/email/contact locked)
  const nameField    = document.getElementById('ad-name-field');
  const emailField   = document.getElementById('ad-email-field');
  const contactField = document.getElementById('ad-contact-field');
  const dateField    = document.getElementById('ad-date-field'); // make sure there's only ONE element with this id

  if (nameField)    { nameField.value    = data.name;    nameField.readOnly    = true; }
  if (emailField)   { emailField.value   = data.email;   emailField.readOnly   = true; }
  if (contactField) { contactField.value = data.contact; contactField.readOnly  = true; }
  if (dateField)    { dateField.value    = data.date; } // keep editable

  // email composer
  const toField = document.getElementById('ad-to');
  const msg     = document.getElementById('ad-message');
  if (toField) toField.value = data.email;
  if (msg) {
    msg.value = `Dear ${data.name},

We are pleased to inform you that your request for residency at Cazza Zamora Residences has been reviewed and approved.

To finalize the next steps in your application process, kindly proceed to our office during business hours where our team will assist you with the necessary documentation and further details.

Sincerely,
The Management Team
Cazza Zamora Residences`;
  }

  // swap list -> details
  const listView    = document.getElementById('applicant-content');
  const detailsView = document.getElementById('applicant-details-content');
  if (listView && detailsView) {
    listView.classList.add('hidden');
    detailsView.classList.remove('hidden');
  }
}

// expose for inline onclick fallback
window.fillDetails = fillDetails;

// --- CLICK → DETAILS (wins over old handlers) -------------------------
// Use a capturing delegated listener on the applicant content.
// This runs BEFORE your older bubble-phase listeners and stops them.
document.getElementById('applicant-content')?.addEventListener('click', (e) => {
  const card = e.target.closest('.applicant-card');
  if (!card) return;
  if (e.target.closest('button')) return; // ignore inner buttons if any

  // prevent other (older) click handlers from running
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

  const key = card.dataset.key || card.querySelector('.applicant-label')?.textContent?.trim();
  if (key) fillDetails(key);
}, true); // <-- capture = true

// back button
const backBtn = document.getElementById('back-to-applicants');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('applicant-content')?.classList.remove('hidden');
  });
}

// submit (demo)
const submitBtn = document.getElementById('ad-submit');
if (submitBtn) {
  submitBtn.addEventListener('click', () => {
    alert('Message submitted (demo only).');
  });
}