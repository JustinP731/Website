/* ============================================================================
   script.js — Split layout + details panel + media viewer (clean & labeled)
   ============================================================================ */
(() => {
  /* ========================================================================
     SECTION A — DOM HOOKS (AUTH, MENUS, DIALOGS)
     ======================================================================== */
  // — User menu / auth
  const menuBtn       = document.getElementById("menuBtn");
  const userMenu      = document.getElementById("userMenu");
  const menuLogin     = document.getElementById("menuLogin");
  const menuLogout    = document.getElementById("menuLogout");
  const menuRegister  = document.getElementById("menuRegister");
  const userStatus    = document.getElementById("userStatus");

  // — Login dialog
  const authDialog    = document.getElementById("authDialog");
  const authForm      = document.getElementById("authForm");
  const authEmailInp  = document.getElementById("authEmail");
  const authPassInp   = document.getElementById("authPass");
  const authCloseBtn  = authDialog?.querySelector(".dialog-close");
  const loginToRegister =
    document.getElementById("registerBtn") || document.getElementById("loginToRegister");

  // — Register dialog
  const registerDialog = document.getElementById("registerDialog");
  const regForm        = document.getElementById("regForm");
  const regEmail       = document.getElementById("regEmail");
  const regCode        = document.getElementById("regCode");
  const regPass        = document.getElementById("regPass");
  const regPass2       = document.getElementById("regPass2");
  const regSend        = document.getElementById("regSend");
  const regToLoginBtn  = document.getElementById("regToLogin"); // “Already have an account? Login”
  const regCloseBtn    = registerDialog?.querySelector(".dialog-close");

  // — Inquire dialog
  const inquireDialog   = document.getElementById("inquireDialog");
  const inquireForm     = document.getElementById("inquireForm");
  const inqPhone        = document.getElementById("inqPhone");
  const inqEmail        = document.getElementById("inqEmail");
  const inqName         = document.getElementById("inqName");
  const inqDate         = document.getElementById("inqDate");
  const inqRoomId       = document.getElementById("inqRoomId");
  const inquireCloseBtn = inquireDialog?.querySelector(".dialog-close");

  /* ========================================================================
     SECTION B — DOM HOOKS (NAV + ROOMS)
     ======================================================================== */
  // — Nav section toggles
  const homeBtn  = document.getElementById("homeBtn");
  const logoBtn  = document.getElementById("logoBtn");
  const roomBtn  = document.getElementById("roomBtn");
  const faqsBtn  = document.getElementById("faqsBtn");

  const hero     = document.getElementById("hero");
  const home     = document.getElementById("home");
  const rooms    = document.getElementById("rooms");
  const faqs     = document.getElementById("faqs");
  const searchBar= document.getElementById("searchBar");

  // — Filters + list + split layout container
  const splitWrap          = document.querySelector(".filters-and-rooms");
  const topNav             = document.getElementById("topNav");
  const roomListEl         = document.getElementById("roomList");
  const unitTypeSelect     = document.getElementById("unitType");
  const availabilityToggle = document.getElementById("availabilityToggle");
  const availabilityLabel  = document.getElementById("availabilityLabel");

  // — Details panel + media
  const panel      = document.getElementById("roomPanel");
  const panelTitle = panel.querySelector(".room-title");
  const heroImg    = panel.querySelector(".hero-img");
  const kv         = panel.querySelector(".kv");
  const descEl     = panel.querySelector(".desc");
  const advEl      = panel.querySelector(".adv");
  const thumbsNav  = panel.querySelector(".thumbs");
  const closeBtn   = panel.querySelector(".room-close");

  // — 360 viewer
  const panoBox    = document.getElementById("panoViewer");
  let   panoInstance = null;

  /* ========================================================================
     SECTION C — STATE + CONSTANTS
     ======================================================================== */
  const body = document.body;
  const SUPPORTS_VIEW_TRANSITIONS = typeof document.startViewTransition === "function";

  let panelResizeObs = null;
  let filtersObs     = null;
  let activeCard     = null;
  let clicksBound    = false;

  /* ========================================================================
     SECTION D — UTILS
     ======================================================================== */
  // — Auth mock (localStorage)
  const getUser  = () => { try { return JSON.parse(localStorage.getItem("authUser")) || null; } catch { return null; } };
  const setUser  = (u) => localStorage.setItem("authUser", JSON.stringify(u));
  const clearUser= () => localStorage.removeItem("authUser");

  // — URL resolver for pano images
  const absUrl = (src) => new URL(src, document.baseURI).href;

  // — Availability helper
  const isAvailable = (room) => room.occupancy < room.capacity;

  // — Cards
  const roomCardHTML = (room) => {
    const statusClass = isAvailable(room) ? "available" : "occupied";
    const statusLabel = isAvailable(room) ? "Available" : "Occupied";
    const cover = (room.images && room.images[0])
      ? getCoverFromFirstMedia(room.images[0])
      : "placeholder.jpg";
    const occText   = `${room.occupancy} / ${room.capacity} 👥`;
    const typeLabel = room.type === "dorm" ? "Dorm Type" : "Studio Type";

    return `
      <div class="room-card" role="button" tabindex="0" aria-label="${room.name} details"
           data-id="${room.id}" data-type="${room.type}" data-name="${room.name}"
           data-price="${room.price}" data-occupancy="${room.occupancy}" data-capacity="${room.capacity}"
           data-description="${room.description || ""}" data-advance="${room.advance || ""}">
        <img src="${cover}" alt="${room.type} image" loading="lazy" decoding="async">
        <div class="room-card-content">
          <p><span class="highlight">${typeLabel}</span> &nbsp;&nbsp; ${room.name}</p>
          <p><span class="highlight">Monthly</span> &nbsp;&nbsp; ₱${room.price.toLocaleString()}</p>
          <p><span class="highlight">Occupancy</span> &nbsp;&nbsp; ${occText}</p>
          <p class="status ${statusClass}">${statusLabel}</p>
        </div>
      </div>
    `;
  };

  // — Media normalizers
  function normalizeMedia(m) {
    if (typeof m === "string") return { kind: "image", src: m };
    if (m?.kind === "pano")   return { kind: "pano",  src: m.src };
    if (m?.kind === "tour")   return { kind: "tour",  poster: m.poster || getTourPosterFromConfig(m.tour), tour: m.tour };
    return { kind: "image", src: m?.src || "pngs/cazzaResidence.png" };
  }
  function getCoverFromFirstMedia(first) {
    const fm = normalizeMedia(first);
    if (fm.kind === "tour") return fm.poster || "pngs/cazzaResidence.png";
    return fm.src;
  }
  function getTourPosterFromConfig(cfg) {
    const first = cfg?.default?.firstScene;
    if (first && cfg.scenes?.[first]?.panorama) return cfg.scenes[first].panorama;
    const ids = cfg?.scenes ? Object.keys(cfg.scenes) : [];
    if (ids.length && cfg.scenes[ids[0]]?.panorama) return cfg.scenes[ids[0]].panorama;
    return null;
  }

  /* ========================================================================
     SECTION E — AUTH / MENU BEHAVIOR
     ======================================================================== */
  // Custom validation: show errors after first failed submit
['inquireForm','authForm','regForm'].forEach(id => {
  const form = document.getElementById(id);
  if (!form) return;

  form.addEventListener('submit', (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();               // keep dialog open
      form.classList.add('was-validated');
    }
  });

  // live feedback once we've shown errors
  form.addEventListener('input', (e) => {
    if (!form.classList.contains('was-validated')) return;
    const el = e.target;
    if (el.matches('input, select, textarea')) {
      el.setAttribute('aria-invalid', String(!el.checkValidity()));
    }
  });
});

  
     function updateAuthUI() {
    const u = getUser();
    const loggedIn = !!u;

    if (menuLogin)    menuLogin.hidden    = loggedIn;
    if (menuRegister) menuRegister.hidden = loggedIn;
    if (menuLogout)   menuLogout.hidden   = !loggedIn;

    if (userStatus) {
      const letter = loggedIn && u?.name ? u.name.trim().charAt(0).toUpperCase() : "G";
      userStatus.textContent = letter;
      userStatus.title = loggedIn ? u.name : "Guest";
      userStatus.setAttribute("aria-label", loggedIn ? `User: ${u.name}` : "User: Guest");
    }
  }

  function toggleMenu(show) {
    const isOpen = show ?? userMenu.hidden;
    if (isOpen) {
      userMenu.hidden = false;
      menuBtn.setAttribute("aria-expanded", "true");
      const first = [menuLogin, menuRegister, menuLogout].find(el => el && !el.hidden);
      first?.focus();
    } else {
      userMenu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  }

  // — Menu + dialogs
  menuBtn?.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(userMenu.hidden); });
  document.addEventListener("click", (e) => {
    if (!userMenu.hidden && !userMenu.contains(e.target) && e.target !== menuBtn) toggleMenu(false);
  });
  menuBtn?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); toggleMenu(true); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });

  menuLogin?.addEventListener("click", () => {
    toggleMenu(false);
    if (authEmailInp) authEmailInp.value = "";
    if (authPassInp)  authPassInp.value  = "";
    authDialog?.showModal();
    authEmailInp?.focus();
  });
  menuRegister?.addEventListener("click", () => {
    toggleMenu(false);
    if (regEmail) regEmail.value = "";
    if (regCode)  regCode.value  = "";
    if (regPass)  regPass.value  = "";
    if (regPass2) regPass2.value = "";
    registerDialog?.showModal();
    regEmail?.focus();
  });
  menuLogout?.addEventListener("click", () => { clearUser(); updateAuthUI(); toggleMenu(false); });

  // — Close buttons
  authCloseBtn?.addEventListener("click", () => authDialog?.close());
  regCloseBtn?.addEventListener("click",  () => registerDialog?.close());
  inquireCloseBtn?.addEventListener("click", () => inquireDialog?.close());

  // — Login → Register
  loginToRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    authDialog?.close();
    regEmail && (regEmail.value = "");
    regCode && (regCode.value = "");
    regPass && (regPass.value = "");
    regPass2 && (regPass2.value = "");
    registerDialog?.showModal();
    regEmail?.focus();
  });

  // — Register → Login
  regToLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    registerDialog?.close();
    authDialog?.showModal();
    authEmailInp?.focus();
  });

  // — Login: validators + live + submit
function validateLoginField(input) {
  const v = (input.value || "").trim();
  let ok = true, msg = "";
  if (input === authEmailInp) {
    ok = /^\S+@\S+\.\S+$/.test(v);
    msg = "Please enter a valid email.";
  } else if (input === authPassInp) {
    ok = v.length > 0;
    msg = "Please enter your password.";
  }
  if (!ok) setFieldError(input, msg); else clearFieldError(input);
  return ok;
}
function validateLoginForm() {
  const fields = [authEmailInp, authPassInp].filter(Boolean);
  let firstBad = null;
  const okAll = fields.every(f => {
    const ok = validateLoginField(f);
    if (!ok && !firstBad) firstBad = f;
    return ok;
  });
  if (!okAll && firstBad) firstBad.focus();
  return okAll;
}
// live validation for login
[authEmailInp, authPassInp].forEach(el => {
  el?.addEventListener("input", () => validateLoginField(el));
  el?.addEventListener("blur",  () => validateLoginField(el));
});
// submit
authForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateLoginForm()) return;

  const email = authEmailInp.value.trim().toLowerCase();
  const pass  = authPassInp.value.trim();

  const base = (email.split("@")[0] || "User");
  const display = base.charAt(0).toUpperCase() + base.slice(1);
  setUser({ name: display, email });
  updateAuthUI();
  authDialog?.close();
});


  // — Register: OTP resend countdown
let regCountdown = null, regTimeLeft = 0;
function startOtpCountdown(seconds = 60) {
  regTimeLeft = seconds;
  regSend.disabled = true;
  regSend.textContent = `${regTimeLeft}s`;
  regCountdown = setInterval(() => {
    regTimeLeft -= 1;
    regSend.textContent = `${regTimeLeft}s`;
    if (regTimeLeft <= 0) {
      clearInterval(regCountdown);
      regCountdown = null;
      regSend.disabled = false;
      regSend.textContent = "Send";
    }
  }, 1000);
}

// clicking “Send” should also surface inline error if email is bad
regSend?.addEventListener("click", () => {
  const email = (regEmail?.value || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    setFieldError(regEmail, "Please enter a valid email before sending a code.");
    regEmail?.focus();
    return;
  }
  clearFieldError(regEmail);
  startOtpCountdown(60); // TODO: backend call
});

// — Register: validators + live + submit
function validateRegisterField(input) {
  const v = (input.value || "").trim();
  let ok = true, msg = "";
  if (input === regEmail) {
    ok = /^\S+@\S+\.\S+$/.test(v);
    msg = "Please enter a valid email.";
  } else if (input === regCode) {
    ok = v.length > 0;
    msg = "Please enter the verification code.";
  } else if (input === regPass) {
    ok = v.length >= 4;
    msg = "Password must be at least 4 characters.";
  } else if (input === regPass2) {
    ok = v.length >= 4 && v === (regPass?.value || "");
    msg = v.length < 4 ? "Password must be at least 4 characters."
                       : "Passwords do not match.";
  }
  if (!ok) setFieldError(input, msg); else clearFieldError(input);
  return ok;
}
function validateRegisterForm() {
  const fields = [regEmail, regCode, regPass, regPass2].filter(Boolean);
  let firstBad = null;
  const okAll = fields.every(f => {
    const ok = validateRegisterField(f);
    if (!ok && !firstBad) firstBad = f;
    return ok;
  });
  if (!okAll && firstBad) firstBad.focus();
  return okAll;
}
// live validation for register
[regEmail, regCode, regPass, regPass2].forEach(el => {
  el?.addEventListener("input", () => {
    validateRegisterField(el);
    if (el === regPass || el === regPass2) {
      regPass2 && validateRegisterField(regPass2); // keep match msg fresh
    }
  });
  el?.addEventListener("blur", () => validateRegisterField(el));
});
// submit
regForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateRegisterForm()) return;

  const email = regEmail.value.trim().toLowerCase();
  const base  = email.split("@")[0] || "User";
  const display = base.charAt(0).toUpperCase() + base.slice(1);

  setUser({ name: display, email });
  updateAuthUI();
  registerDialog?.close();
});

  // — Inquire dialog open (gated by auth)
  function openInquire(room) {
  const u = getUser();
  if (!u) {            // guests must log in first
    authDialog.showModal();
    authEmailInp?.focus();
    return;
  }

  // min date = today (prevents past dates)
  if (inqDate) inqDate.min = new Date().toISOString().slice(0, 10);

  // prefill
  inqEmail.value = u.email || "";
  inqName.value  = u.name  || "";
  inqPhone.value = u.phone || "";
  inqDate.value  = "";
  inqRoomId.value = room.id;

  // clear previous errors
  [inqPhone, inqEmail, inqName, inqDate].forEach(clearFieldError);

  inquireDialog.showModal();
  inqPhone.focus();
}

// Close button
inquireCloseBtn?.addEventListener("click", () => inquireDialog.close());

// ---- Validation helpers ----
function setFieldError(input, msg) {
  const wrap = input.closest(".input-wrap") || input.parentElement;
  if (!wrap) return;

  wrap.classList.add("invalid");
  input.setAttribute("aria-invalid", "true");

  let err = wrap.querySelector(".field-error");
  if (!err) {
    err = document.createElement("div");
    err.className = "field-error";
    wrap.appendChild(err);
  }
  err.textContent = msg || "This field is required.";
}

function clearFieldError(input) {
  const wrap = input.closest(".input-wrap") || input.parentElement;
  if (!wrap) return;

  wrap.classList.remove("invalid");
  input.removeAttribute("aria-invalid");

  const err = wrap.querySelector(".field-error");
  if (err) err.remove();
}

function validateField(input) {
  const v = (input.value || "").trim();
  let ok = true, msg = "";

  switch (input.id) {
    case "inqPhone": {
      const digits = v.replace(/\D/g, "");
      ok = digits.length >= 7;               // minimal sanity check
      msg = "Please enter your contact number.";
      break;
    }
    case "inqEmail": {
      ok = /^\S+@\S+\.\S+$/.test(v);
      msg = "Please enter a valid email address.";
      break;
    }
    case "inqName": {
      ok = v.length >= 2;
      msg = "Please enter your name.";
      break;
    }
    case "inqDate": {
      ok = !!v;
      msg = "Please pick a date.";
      // optional: prevent past dates more strictly
      if (ok && inqDate.min) ok = v >= inqDate.min;
      if (!ok && v) msg = "Please pick a valid future date.";
      break;
    }
  }

  if (!ok) setFieldError(input, msg);
  else     clearFieldError(input);

  return ok;
}

function validateForm() {
  const fields = [inqPhone, inqEmail, inqName, inqDate].filter(Boolean);
  let firstBad = null;
  const allOk = fields.every((el) => {
    const ok = validateField(el);
    if (!ok && !firstBad) firstBad = el;
    return ok;
  });
  if (!allOk && firstBad) firstBad.focus();
  return allOk;
}

// Live validation while typing/changing
[inqPhone, inqEmail, inqName, inqDate].forEach((el) => {
  el?.addEventListener("input", () => validateField(el));
  el?.addEventListener("blur",  () => validateField(el));
  el?.addEventListener("change",() => validateField(el));
});

// Submit
inquireForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    roomId: inqRoomId.value,
    phone : inqPhone.value.trim(),
    email : inqEmail.value.trim(),
    name  : inqName.value.trim(),
    date  : inqDate.value
  };

  // TODO: replace with real POST
  console.log("Inquiry submitted:", payload);
  inquireDialog.close();
  alert("Request sent! We’ll be in touch shortly.");
});

  /* ========================================================================
     SECTION F — NAV / SECTIONS
     ======================================================================== */
  function showSection(section) {
    if (!["home", "rooms", "faqs"].includes(section)) return;

    // Fully reset split state if leaving Rooms
    if (section !== "rooms") closePanel();

    hero.style.display  = section === "home"  ? "block" : "none";
    home.style.display  = section === "home"  ? "block" : "none";
    rooms.style.display = section === "rooms" ? "block" : "none";
    faqs.style.display  = section === "faqs"  ? "block" : "none";
  }
  const navButtons = document.querySelectorAll(".search-bar button");
  const setActiveButton = (btn) => { navButtons.forEach(b => b.classList.remove("active")); btn.classList.add("active"); };

  homeBtn?.addEventListener("click", () => { showSection("home");  setActiveButton(homeBtn); });
  logoBtn?.addEventListener("click", () => { showSection("home");  setActiveButton(homeBtn); });
  roomBtn?.addEventListener("click", () => { showSection("rooms"); setActiveButton(roomBtn); });
  faqsBtn?.addEventListener("click", () => { showSection("faqs");  setActiveButton(faqsBtn); });

  // Hide tab bar on scroll (unless details panel is open)
  let lastScrollTop = 0;
  window.addEventListener("scroll", () => {
    if (body.classList.contains("details-open")) return;
    const current = window.pageYOffset || document.documentElement.scrollTop;
    searchBar.style.transform = current > lastScrollTop ? "translateY(-100%)" : "translateY(0)";
    lastScrollTop = Math.max(current, 0);
  });

  /* ========================================================================
     SECTION G — ROOMS: RENDER + FILTER
     ======================================================================== */
  function renderRooms(list) {
    roomListEl.innerHTML = list.map(roomCardHTML).join("");
    attachRoomCardClicks(); // delegate once
  }
  function filterRooms() {
    const selectedType  = unitTypeSelect.value;        // all | studio | dorm
    const onlyAvailable = availabilityToggle.checked;  // boolean
    const filtered = roomsData.filter(room => {
      const matchesType = selectedType === "all" || room.type === selectedType;
      const matchesAvail = !onlyAvailable || isAvailable(room);
      return matchesType && matchesAvail;
    });
    renderRooms(filtered);
  }

  /* ========================================================================
     SECTION H — DETAILS PANEL + MEDIA VIEWER
     ======================================================================== */
  function destroyPano() {
    if (!panoInstance) return;
    try { panoInstance.destroy(); } catch {}
    panoInstance = null;
  }
  function showImage(src) {
    destroyPano();
    panoBox?.classList.remove("is-on");
    panoBox?.setAttribute("aria-hidden", "true");
    heroImg.style.display = "block";
    heroImg.src = src;
  }
  function showPano(src) {
    if (typeof pannellum === "undefined") {
      console.warn("Pannellum not loaded—showing still image instead.");
      return showImage(src);
    }
    const url = absUrl(src);
    heroImg.style.display = "none";
    panoBox.classList.add("is-on");
    panoBox.setAttribute("aria-hidden", "false");
    destroyPano();
    panoInstance = pannellum.viewer("panoViewer", {
      type: "equirectangular",
      panorama: url,
      autoLoad: true,
      showZoomCtrl: true,
      hfov: 100,
      crossOrigin: "anonymous"
    });
  }
  function showTour(config) {
    if (typeof pannellum === "undefined") {
      console.warn("Pannellum not loaded—cannot show tour; showing poster if available.");
      const poster = getTourPosterFromConfig(config);
      return poster ? showImage(poster) : showImage("pngs/cazzaResidence.png");
    }
    const cfg = { ...config, basePath: new URL(".", document.baseURI).href, crossOrigin: "anonymous" };
    heroImg.style.display = "none";
    panoBox.classList.add("is-on");
    panoBox.setAttribute("aria-hidden", "false");
    destroyPano();
    panoInstance = pannellum.viewer("panoViewer", cfg);
  }

  // — Split layout measurements
  function recalcSplitVars() {
    if (!splitWrap) return;
    const headerH = topNav ? topNav.offsetHeight : 0;
    splitWrap.style.setProperty("--sticky-offset", `${headerH}px`);
    const filtersEl = splitWrap.querySelector(".room-filters");
    if (filtersEl) {
      const h = Math.round(filtersEl.getBoundingClientRect().height);
      splitWrap.style.setProperty("--filters-h", `${h}px`);
    }
  }
  function syncSplitHeights() {
    if (!splitWrap || !panel) return;
    const cs       = getComputedStyle(splitWrap);
    const sticky   = parseInt(cs.getPropertyValue("--sticky-offset")) || 0;
    const filtersH = parseInt(cs.getPropertyValue("--filters-h"))     || 0;

    const panelRect    = panel.getBoundingClientRect();
    const panelVisible = Math.min(window.innerHeight - sticky, Math.round(panelRect.height));
    const targetH      = Math.max(0, panelVisible - filtersH);

    const listEl = splitWrap.querySelector(".room-list");
    if (listEl) {
      listEl.style.height    = targetH + "px";
      listEl.style.overflowY = "auto";
    }
  }
  function exitSplitLayout() {
    body.classList.remove("details-open");

    window.removeEventListener("resize", syncSplitHeights);
    window.removeEventListener("resize", recalcSplitVars);

    try { panelResizeObs?.disconnect(); } catch {}
    try { filtersObs?.disconnect(); } catch {}
    panelResizeObs = null;
    filtersObs = null;

    if (splitWrap) {
      splitWrap.classList.remove("is-split");
      splitWrap.style.removeProperty("--sticky-offset");
      splitWrap.style.removeProperty("--filters-h");
    }
    if (searchBar) searchBar.style.display = "";

    const listEl = document.querySelector(".filters-and-rooms .room-list");
    if (listEl) {
      listEl.style.removeProperty("height");
      listEl.style.removeProperty("overflow");
      listEl.style.removeProperty("overflow-y");
      void listEl.offsetHeight; // reflow
    }
  }

  function openPanel(room, clickSourceEl) {
    // — Prevent stacked listeners when re-opening quickly
    window.removeEventListener("resize", syncSplitHeights);
    window.removeEventListener("resize", recalcSplitVars);
    try { panelResizeObs?.disconnect(); } catch {}
    try { filtersObs?.disconnect(); } catch {}
    panelResizeObs = null;
    filtersObs = null;

    // — Left card content (matches mock)
    panelTitle.textContent = room.name;

    const infoCard = panel.querySelector(".room-info");
    const typeLabel = room.type === "dorm" ? "Dorm" : "Studio";
    const occ = Number(room.occupancy) || 0;
    const cap = Math.max(1, Number(room.capacity) || 1);
    const occPct = Math.max(0, Math.min(100, Math.round((occ / cap) * 100)));

    // Header row (title + pill)
    let head = infoCard.querySelector(".card-head");
    if (!head) {
      head = document.createElement("div");
      head.className = "card-head";
      const titleEl =
        infoCard.querySelector(".unit-title, h3, h2, h4") ||
        (() => {
          const h = document.createElement("h3");
          h.className = "unit-title";
          h.textContent = "Unit Details";
          return h;
        })();
      head.appendChild(titleEl);
      infoCard.prepend(head);
    }
    let pill = head.querySelector(".type-pill");
    if (!pill) {
      pill = document.createElement("span");
      pill.className = "type-pill";
      head.appendChild(pill);
    }
    pill.textContent = typeLabel;

    // KV grid (price + occupancy with bar)
    kv.innerHTML = `
      <div class="kv-row">
        <dt>Price</dt>
        <dd>
          <span class="muted">Monthly</span>
          <span class="price">₱${room.price.toLocaleString()}</span>
        </dd>
      </div>
      <div class="kv-row">
        <dt>Occupancy</dt>
        <dd>
          ${occ} / ${cap}
          <div class="occ-bar" role="progressbar"
               aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${occ}">
            <span style="width:${occPct}%"></span>
          </div>
        </dd>
      </div>
    `;

    // In-card sections
    descEl.innerHTML = `
      <strong class="field-title">Description</strong>
      <div class="field-body">${room.description || "—"}</div>
    `;
    advEl.innerHTML = `
      <strong class="field-title">Advance details</strong>
      <div class="field-body"><span class="dot"></span>${room.advance || "—"}</div>
    `;

    // CTA button (disable + red “Full” when no availability)
    const remaining = Math.max(0, cap - occ);
    const isFull = remaining === 0;

    let btn = infoCard.querySelector(".btn-inquire");
    let cta = infoCard.querySelector(".cta-row");
    if (!cta) {
      cta = document.createElement("div");
      cta.className = "cta-row";
      btn?.after(cta);
    }
    if (btn && btn.parentElement !== cta) cta.prepend(btn);

    if (btn) {
      btn.disabled = isFull;
      btn.setAttribute("aria-disabled", String(isFull));
      btn.classList.toggle("is-full", isFull);
      btn.textContent = isFull ? "Full" : "Inquire";
      btn.title = isFull ? "This unit is fully occupied" : "Send an inquiry";
      btn.onclick = (e) => { e.preventDefault(); if (!btn.disabled) openInquire(room); };
    }

    const occBar = kv.querySelector(".occ-bar");
    if (occBar) occBar.classList.toggle("is-full", isFull);

    // — Media
    const mediaListRaw = (room.images && room.images.length ? room.images : ["pngs/cazzaResidence.png"]);
    const mediaList = mediaListRaw.map(normalizeMedia);
    const first = mediaList[0] || { kind: "image", src: "pngs/cazzaResidence.png" };
    if (first.kind === "tour")      showTour(first.tour);
    else if (first.kind === "pano") showPano(first.src);
    else                            showImage(first.src);

    // Thumbs
    thumbsNav.innerHTML = mediaList.map((m, i) => {
      const thumbSrc = (m.kind === "tour") ? (m.poster || "pngs/cazzaResidence.png") : m.src;
      const label = (m.kind === "tour") ? "Tour" : (m.kind === "pano") ? "360°" : "";
      return `
        <button class="thumb ${i === 0 ? "is-active" : ""}"
                data-kind="${m.kind}" data-src="${m.src || ""}" data-idx="${i}"
                aria-label="Media ${i + 1}${label ? " - " + label : ""}">
          <img src="${thumbSrc}" alt="">
          ${label ? `<span class="tag-360">${label}</span>` : ""}
        </button>
      `;
    }).join("");

    thumbsNav.querySelectorAll(".thumb").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx  = +btn.dataset.idx;
        const item = mediaList[idx];
        if (item.kind === "tour")      showTour(item.tour);
        else if (item.kind === "pano") showPano(item.src);
        else                            showImage(item.src);
        thumbsNav.querySelectorAll(".thumb").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    // — Grow animation origin
    if (clickSourceEl) {
      const r    = clickSourceEl.getBoundingClientRect();
      const root = document.documentElement.getBoundingClientRect();
      const x = ((r.left + r.width / 2) - root.left) / root.width * 100;
      const y = ((r.top + r.height / 2) - root.top) / root.height * 100;
      panel.style.setProperty("--grow-x", x + "%");
      panel.style.setProperty("--grow-y", y + "%");
    }

    // — Show panel + enter split layout
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    body.classList.add("details-open");
    splitWrap?.classList.add("is-split");
    if (searchBar) searchBar.style.display = "none";

    recalcSplitVars();
    syncSplitHeights();
    window.addEventListener("resize", recalcSplitVars);
    window.addEventListener("resize", syncSplitHeights);

    if ("ResizeObserver" in window) {
      try {
        panelResizeObs = new ResizeObserver(syncSplitHeights);
        panelResizeObs.observe(panel);
      } catch {}
      try {
        const filtersEl = splitWrap?.querySelector(".room-filters");
        if (filtersEl) {
          filtersObs = new ResizeObserver(recalcSplitVars);
          filtersObs.observe(filtersEl);
        }
      } catch {}
    }

    // A11y: move focus into panel
    closeBtn?.focus();

    panel.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function closePanel() {
    if (!panel.classList.contains("is-open")) { exitSplitLayout(); return; }

    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panel.style.removeProperty("--grow-x");
    panel.style.removeProperty("--grow-y");

    destroyPano();
    if (panoBox) {
      panoBox.classList.remove("is-on");
      panoBox.setAttribute("aria-hidden", "true");
    }
    heroImg.style.display = "block";

    const toFocus = activeCard;
    activeCard?.classList.remove("is-active");
    activeCard = null;

    exitSplitLayout();

    // Restore focus to the opening card if possible
    toFocus?.focus?.();

    // Keep user oriented
    document.getElementById("rooms")?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  closeBtn?.addEventListener("click", closePanel);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  // — Delegate clicks (bind once)
  function attachRoomCardClicks() {
    if (clicksBound) return;
    clicksBound = true;

    roomListEl.addEventListener("click", (ev) => {
      const card = ev.target.closest(".room-card");
      if (!card) return;

      document.querySelectorAll(".room-card.is-active").forEach(c => c.classList.remove("is-active"));
      activeCard = card;
      activeCard.classList.add("is-active");

      const id   = card.dataset.id;
      const room = roomsData.find(r => r.id === id) || {
        id,
        type: card.dataset.type,
        name: card.dataset.name,
        price: Number(card.dataset.price),
        occupancy: Number(card.dataset.occupancy),
        capacity: Number(card.dataset.capacity),
        description: card.dataset.description,
        advance: card.dataset.advance,
        images: (card.dataset.images || "").split(",").filter(Boolean)
      };

      if (SUPPORTS_VIEW_TRANSITIONS) {
        document.startViewTransition(() => openPanel(room, card));
      } else {
        openPanel(room, card);
      }
    });

    roomListEl.addEventListener("keydown", (e) => {
      const card = e.target.closest(".room-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });
  }

  /* ========================================================================
     SECTION I — DATA (DEMO)
     ======================================================================== */
  const roomsData = [
    {
      id: "R001",
      type: "dorm",
      name: "Room 001",
      price: 4000,
      occupancy: 2,
      capacity: 4,
      description: "Male Unit",
      advance: "No animal allowed",
      images: [
        {
          kind: "tour", poster: "pngs/TourA.png",
          tour: {
            default: { firstScene: "hall", autoLoad: true, showZoomCtrl: true, hfov: 100 },
            scenes: {
              hall: {
                title: "Hall", panorama: "pngs/TourA.png",
                hotSpots: [
                  { pitch: 0, yaw: 290, type: "scene", text: "Go to Sala", sceneId: "sala" },
                  { pitch: 0, yaw: 95, type: "scene", text: "Go to Kitchen", sceneId: "kitchen" }
                ]
              },
              sala: {
                title: "Sala", panorama: "pngs/TourAC.png",
                hotSpots: [{ pitch: 2, yaw: 85, type: "scene", text: "Back to Hall", sceneId: "hall" }]
              },
              kitchen: {
                title: "Kitchen", panorama: "pngs/TourAB.png",
                hotSpots: [{ pitch: 2, yaw: 120, type: "scene", text: "Back to Hall", sceneId: "hall" }]
              }
            }
          }
        },
        "pngs/roomSample.png", "pngs/roomSample.png", "pngs/cazzaResidence.png", "pngs/roomSample.png"
      ]
    },
    {
      id: "R002",
      type: "dorm",
      name: "Room 002",
      price: 4000,
      occupancy: 4,
      capacity: 4,
      description: "Male Unit",
      advance: "No animal allowed",
      images: [{ src: "pngs/SamplePano1.jpg", kind: "pano" }, "pngs/roomSample.png", "pngs/roomSample.png", "pngs/cazzaResidence.png"]
    },
    {
      id: "S101",
      type: "studio",
      name: "Room 101",
      price: 5000,
      occupancy: 0,
      capacity: 1,
      description: "Male Unit",
      advance: "No animal allowed",
      images: ["pngs/roomSample.png", "pngs/roomSample.png", "pngs/cazzaResidence.png"]
    },
    {
      id: "S102",
      type: "studio",
      name: "Room 102",
      price: 5000,
      occupancy: 1,
      capacity: 1,
      description: "Male Unit",
      advance: "No animal allowed",
      images: ["pngs/roomSample.png", "pngs/roomSample.png", "pngs/cazzaResidence.png"]
    }
  ];

  /* ========================================================================
     SECTION J — BOOT
     ======================================================================== */
  function boot() {
    // Filters: initial label (prevents layout shift)
    if (availabilityLabel) {
      availabilityLabel.textContent = availabilityToggle.checked ? "Available Only" : "Show All";
      availabilityLabel.title = availabilityLabel.textContent;
    }

    // Initial render (all rooms)
    renderRooms(roomsData);

    // Filter interactions
    unitTypeSelect?.addEventListener("change", filterRooms);
    availabilityToggle?.addEventListener("change", () => {
      availabilityLabel.textContent = availabilityToggle.checked ? "Available Only" : "Show All";
      availabilityLabel.title = availabilityLabel.textContent;
      filterRooms();
    });
    availabilityLabel?.addEventListener("click", () => {
      availabilityToggle.checked = !availabilityToggle.checked;
      availabilityToggle.dispatchEvent(new Event("change"));
    });

    // Default section
    showSection("home");
  }

  updateAuthUI();
  boot();
})();
