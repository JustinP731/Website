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
  const menuProfile  = document.getElementById("menuProfile");
  const PROFILE_URL  = "profile.html";


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
  const siteFooter = document.querySelector(".site-footer");


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

  // Page flags
  const IS_PROFILE_PAGE = document.body.classList.contains("page-profile");

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
  function updateAuthUI() {
  const u = getUser();
  const loggedIn = !!u;

  if (menuLogin)    menuLogin.hidden    = loggedIn;
  if (menuRegister) menuRegister.hidden = loggedIn;
  if (menuLogout)   menuLogout.hidden   = !loggedIn;
  if (menuProfile)  menuProfile.hidden  = !loggedIn;

  if (userStatus) {
    const letter = (loggedIn && u?.name) ? u.name.trim().charAt(0).toUpperCase() : "G";
    userStatus.textContent = letter;
    userStatus.title = loggedIn ? (u.name || "User") : "Guest";
    userStatus.setAttribute("aria-label", loggedIn ? `User: ${u.name || "User"}` : "User: Guest");
  }
  try { refreshAvatarFromUser(getUser()); } catch {}
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
  const clickedMenuButton = menuBtn && menuBtn.contains(e.target);
  const clickedInsideMenu = userMenu && userMenu.contains(e.target);
  if (!userMenu.hidden && !clickedMenuButton && !clickedInsideMenu) {
    toggleMenu(false);
  }
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

  // — Profile navigation (avatar + menu item)
  // Make avatar keyboard-accessible even if it's a <div>
  if (userStatus) {
    if (!userStatus.hasAttribute("tabindex")) userStatus.setAttribute("tabindex", "0");
    if (!userStatus.hasAttribute("role")) userStatus.setAttribute("role", "button");
  }

  function goToProfileOrLogin() {
    const u = getUser();
    if (u) {
      window.location.href = PROFILE_URL;
    } else {
      authDialog?.showModal();
      authEmailInp?.focus();
    }
  }

  userStatus?.addEventListener("click", goToProfileOrLogin);
  userStatus?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToProfileOrLogin(); }
  });
  menuProfile?.addEventListener("click", () => { toggleMenu(false); goToProfileOrLogin(); });


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
  // Skip if this page does not have the main sections (e.g., profile.html)
  if (!hero || !home || !rooms || !faqs) return;
  if (!["home", "rooms", "faqs"].includes(section)) return;

  // Fully reset split state if leaving Rooms
  if (section !== "rooms") closePanel();

  hero.style.display  = section === "home"  ? "block" : "none";
  home.style.display  = section === "home"  ? "block" : "none";
  rooms.style.display = section === "rooms" ? "block" : "none";
  faqs.style.display  = section === "faqs"  ? "block" : "none";

  // Show footer only on Home
  if (siteFooter) siteFooter.style.display = section === "home" ? "block" : "none";
}



  // Active tab state (keeps your existing behavior)
const navButtons = document.querySelectorAll(".search-bar button");
const setActiveButton = (btn) => {
  navButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
};

// Mark if View Transitions API is available
const HAS_VT = typeof document.startViewTransition === "function";
document.documentElement.classList.toggle("vt", HAS_VT);

// Smoothly scroll the tabs into view (nice touch on mobile)
const scrollToTabs = () => {
  const headerH = topNav ? topNav.getBoundingClientRect().height : 0;
  const y = (searchBar?.getBoundingClientRect().top || 0) + window.scrollY - headerH - 6;
  window.scrollTo({ top: y, behavior: "smooth" });
};

// Wrapper to animate the section swap
function navTo(section, btn){
  const main = document.getElementById("main");
  const run = () => { showSection(section); setActiveButton(btn); };

  if (HAS_VT) {
    document.startViewTransition(run);
  } else {
    if (main) {
      main.classList.add("fade-out");
      setTimeout(() => { run(); main.classList.remove("fade-out"); }, 180);
    } else {
      run();
    }
  }
  scrollToTabs();
}

// Make all "home-only" parts show/hide together.
// Works whether your file uses showHomeOnly() or toggleHomeOnly().
function syncHomeOnly(isHome) {
  try { showHomeOnly(isHome); } catch {}
  try { toggleHomeOnly(isHome); } catch {}

  // If you’re hiding the footer on non-home, keep it in sync too.
  const siteFooter = document.querySelector(".site-footer");
  if (siteFooter) siteFooter.style.display = isHome ? "block" : "none";
}


// Use the wrapper on clicks
homeBtn?.addEventListener("click", () => {
  showSection("home");
  setActiveButton(homeBtn);
  syncHomeOnly(true);
});

logoBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showSection("home");
  setActiveButton(homeBtn);
  syncHomeOnly(true);
  window.scrollTo({ top: 0, behavior: "smooth" }); // optional
});

roomBtn?.addEventListener("click", () => {
  showSection("rooms");
  setActiveButton(roomBtn);
  syncHomeOnly(false);
});

faqsBtn?.addEventListener("click", () => {
  showSection("faqs");
  setActiveButton(faqsBtn);
  syncHomeOnly(false);
});



// Modern pill-tabs: wrap buttons + add moving indicator
(function setupTabsUI(){
  if (!searchBar) return;
  const wrap = document.createElement("div");
  wrap.className = "tabs-wrap";
  const ind = document.createElement("span");
  ind.className = "tab-indicator";

  // move existing buttons into the wrapper
  const btns = Array.from(searchBar.querySelectorAll("button"));
  btns.forEach(b => wrap.appendChild(b));
  wrap.appendChild(ind);
  searchBar.appendChild(wrap);

  // first paint + keep in sync on resize
  const place = () => {
    const active = document.querySelector(".search-bar button.active") || btns[0];
    if (active) setActiveButton(active);
  };
  place();
  window.addEventListener("resize", place, { passive: true });
})();



// --- Keep header fixed; auto-hide the TAB BAR on scroll ---
document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('topNav');
  const tabs   = document.getElementById('searchBar');
  if (!header || !tabs) return;

  // Make sticky offset match the header height
  const setOffset = () => {
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--sticky-offset', `${h}px`);
  };
  setOffset();
  window.addEventListener('resize', setOffset, { passive: true });

  let lastY = window.scrollY || 0;
  const DOWN_TOL = 12;
  const UP_TOL   = 12;

  const onScroll = () => {
    if (document.body.classList.contains('details-open')) return; // don’t animate while panel is open
    const y  = window.scrollY || 0;
    const dy = y - lastY;

    if (y < 10) {
      tabs.classList.remove('tab-hidden');      // always visible near the very top
    } else if (dy > DOWN_TOL) {
      tabs.classList.add('tab-hidden');         // scrolling down
    } else if (-dy > UP_TOL) {
      tabs.classList.remove('tab-hidden');      // scrolling up
    }
    lastY = y;
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // extra: instant show when user scrolls up quickly with the mouse wheel
  window.addEventListener('wheel', (e) => {
    if (e.deltaY < -8) tabs.classList.remove('tab-hidden');
  }, { passive: true });
});


  /* ========================================================================
     SECTION G — ROOMS: RENDER + FILTER
     ======================================================================== */
  function renderRooms(list) {
    
    if (!roomListEl) return;
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
    if (!roomListEl) return;
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

  if (document.body.classList.contains('page-profile')) {
  const u = getUser?.();
  if (!u) {
    window.location.href = "index.html#login";
  } else {
    const card = document.querySelector('.profile-card');
    if (card) {
      card.innerHTML = `
        <div class="acct-row">
          <div class="avatar-lg">${(u.name||'U').trim().charAt(0).toUpperCase()}</div>
          <div class="acct-cols">
            <h3>${u.name || 'User Name'}</h3>
            <div class="grid-2">
              <div><small>Contact</small><div>${u.phone || '—'}</div></div>
              <div><small>Email</small><div>${u.email || '—'}</div></div>
            </div>
          </div>
        </div>`;
    }
  }
}


  /* ========================================================================
     SECTION J — BOOT
     ======================================================================== */
  function boot() {
    
    // On profile page we don\'t render Rooms/Home sections
    if (typeof IS_PROFILE_PAGE !== "undefined" && IS_PROFILE_PAGE) return;
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



/*----------------------------------*/

// Reveal-on-scroll for Building Info
document.addEventListener('DOMContentLoaded', () => {
  const toReveal = document.querySelectorAll('#building-info .reveal');
  if (!toReveal.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  toReveal.forEach(el => io.observe(el));
});

// ===== Reveal on scroll (with small stagger) =====
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right');
  if (!items.length) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Stagger via inline delay
      const idx = Number(el.getAttribute('data-rv-idx') || 0);
      el.style.transitionDelay = `${Math.min(idx * 0.06, 0.36)}s`;
      el.classList.add('is-visible');
      io.unobserve(el);
    });
  }, { threshold: 0.15 });

  items.forEach((el, i) => {
    el.setAttribute('data-rv-idx', i % 8); // loop 0..7 so delays don’t get too long
    io.observe(el);
  });
});

// Show #building-info only on Home tab
document.addEventListener('DOMContentLoaded', () => {
  const bi      = document.getElementById('building-info');
  const homeBtn = document.getElementById('homeBtn');
  const roomBtn = document.getElementById('roomBtn');
  const faqsBtn = document.getElementById('faqsBtn');

  if (!bi) return;

  const showBI = (show) => {
    bi.style.display = show ? '' : 'none';
    bi.setAttribute('aria-hidden', show ? 'false' : 'true');
  };

  // initial state (Home is active by default)
  showBI(true);

  homeBtn?.addEventListener('click', () => showBI(true));
  roomBtn?.addEventListener('click', () => showBI(false));
  faqsBtn?.addEventListener('click', () => showBI(false));
});

// Show #intro-video and #building-info only on Home tab
document.addEventListener('DOMContentLoaded', () => {
  const ids = ['intro-video', 'building-info'];
  const getEls = () => ids.map(id => document.getElementById(id)).filter(Boolean);

  const showHomeOnly = (show) => {
    getEls().forEach(el => {
      el.style.display = show ? '' : 'none';
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
    });
  };

  // initial state (Home active by default)
  showHomeOnly(true);

  // nav buttons
  const homeBtn = document.getElementById('homeBtn');
  const roomBtn = document.getElementById('roomBtn');
  const faqsBtn = document.getElementById('faqsBtn');

  homeBtn?.addEventListener('click', () => showHomeOnly(true));
  roomBtn?.addEventListener('click', () => showHomeOnly(false));
  faqsBtn?.addEventListener('click', () => showHomeOnly(false));
});

// Put this near your existing nav/tab logic
const HOME_ONLY_SECTIONS = ['building-info', 'testimonials', 'homeVideo']; // add 'homeVideo' if you used the FB video id

function toggleHomeOnly(visible) {
  HOME_ONLY_SECTIONS.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  });
}

// Whenever you switch tabs:
document.getElementById('homeBtn')?.addEventListener('click', ()=>{
  toggleHomeOnly(true);
});
document.getElementById('roomBtn')?.addEventListener('click', ()=>{
  toggleHomeOnly(false);
});
document.getElementById('faqsBtn')?.addEventListener('click', ()=>{
  toggleHomeOnly(false);
});

// Run once on load to match the default active tab
toggleHomeOnly(document.getElementById('homeBtn')?.classList.contains('active'));

document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('topNav');
  if (!header) return;

  let navH   = header.getBoundingClientRect().height;
  let shown  = true;                 // current state
  let lastY  = window.scrollY || 0;
  let ticking = false;

  // thresholds
  const DOWN_TOL = 10;               // px down before hide
  const UP_TOL   = 10;               // px up   before show

  // helpers
  const setOffset = px => {
    document.documentElement.style.setProperty('--sticky-offset', `${px}px`);
  };
  const show = () => {
    if (shown) return;
    header.classList.remove('nav-hidden');
    document.body.classList.add('header-shown');
    document.body.classList.remove('header-hidden');
    setOffset(navH);
    shown = true;
  };
  const hide = () => {
    if (!shown) return;
    header.classList.add('nav-hidden');
    document.body.classList.add('header-hidden');
    document.body.classList.remove('header-shown');
    setOffset(0);
    shown = false;
  };

  // initial
  setOffset(navH);
  document.body.classList.add('header-shown');

  // main scroll handler
  const handleScroll = () => {
    const y  = window.scrollY || 0;
    const dy = y - lastY;

    if (y <= navH) {
      // near top: keep visible
      show();
    } else if (dy > DOWN_TOL) {
      // scrolling down
      hide();
    } else if (-dy > UP_TOL) {
      // scrolling up
      show();
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  // wheel: instant intent (desktop)
  window.addEventListener('wheel', (e) => {
    if (e.deltaY < -8) show();
    else if (e.deltaY > 8) hide();
  }, { passive: true });

  // touch: instant intent (mobile)
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const y = e.touches && e.touches[0] ? e.touches[0].clientY : touchStartY;
    const dy = y - touchStartY;
    if (dy > 12) show();      // swipe down (scroll up)
    else if (dy < -12) hide(); // swipe up (scroll down)
  }, { passive: true });

  // keep offset correct if header height changes (responsive)
  window.addEventListener('resize', () => {
    navH = header.getBoundingClientRect().height;
    if (shown) setOffset(navH);
  }, { passive: true });
});

document.addEventListener('DOMContentLoaded', () => {
  const v         = document.getElementById('heroVideo');
  const heroBtn   = document.getElementById('heroMuteBtn');    // button on the hero
  const headerBtn = document.getElementById('headerMuteBtn');  // button near login (header)
  if (!v) return;

  // Autoplay-safe defaults + no pausing
  v.muted       = true;      // must start muted to autoplay on mobile
  v.loop        = true;
  v.playsInline = true;
  v.autoplay    = true;
  v.controls    = false;

  const tryPlay = () => {
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  // Reflect video.muted → both buttons (aria-pressed="true" means muted)
  const syncButtons = () => {
    const pressed = v.muted ? 'true' : 'false';
    heroBtn?.setAttribute('aria-pressed', pressed);
    headerBtn?.setAttribute('aria-pressed', pressed);
  };

  const toggleMute = () => {
    v.muted = !v.muted;
    syncButtons();
    tryPlay();               // keep it playing after toggle
  };

  // Wire up the two buttons (either one toggles + stays in sync)
  heroBtn?.addEventListener('click', toggleMute);
  headerBtn?.addEventListener('click', toggleMute);

  // Keep icons correct if something else flips volume/mute
  v.addEventListener('volumechange', syncButtons);

  // Make it “unpausable”
  v.addEventListener('pause',      tryPlay);
  v.addEventListener('loadeddata', tryPlay);
  v.addEventListener('canplay',    tryPlay);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlay();
  });

  // Kick off playback ASAP; add one-time fallbacks for browsers that need a gesture
  tryPlay();
  ['click','touchstart','scroll'].forEach(evt => {
    window.addEventListener(evt, tryPlay, { once: true, passive: true });
  });

  // Initial button state (muted)
  syncButtons();
});


// Move header mute button beside the right-side icons
(() => {
  const mute  = document.getElementById('headerMuteBtn');
  const icons = document.querySelector('.nav-icons');
  if (mute && icons && !icons.contains(mute)) icons.appendChild(mute);
})();

const scrollToTabs = () => {}; // no-op; tabs are fixed over the hero now


// === Supabase normalize ===
const supabase = window.supabase || window.__supabase;
if (!supabase) console.warn("[Auth] Supabase client missing. Make sure to set window.supabase in HTML.");
window.supabase = supabase;


// Update avatar initials across header/profile bubbles
function refreshAvatarFromUser(u = getUser()) {
  const letter = u?.name ? String(u.name).trim().charAt(0).toUpperCase() : "G";
  const title  = u?.name || "Guest";
  const userStatus = document.getElementById("userStatus");
  if (userStatus) {
    userStatus.textContent = letter;
    userStatus.title = title;
    userStatus.setAttribute("aria-label", `User: ${title}`);
  }
  document.querySelectorAll(".profile-circle, .page-profile .avatar-lg")
    .forEach(el => { el.textContent = letter; el.title = title; });
}


function toE164PH(phoneRaw) {
  const d = (phoneRaw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("09") && d.length === 11) return "+63" + d.slice(1);
  if (d.startsWith("9")  && d.length === 10) return "+63" + d;
  if (d.startsWith("63")) return "+" + d;
  if (d.startsWith("0")  && d.length > 1) return "+63" + d.slice(1);
  if (d.startsWith("+")) return d;
  return "+" + d;
}


function isPhoneVal(s) {
  const digits = (s || "").replace(/\D/g, "");
  return digits.length >= 7;
}


async function ensureProfileRow(fullName) {
  if (!window.supabase) return console.warn("Supabase not found");
  const { data, error: gErr } = await supabase.auth.getUser();
  if (gErr || !data?.user) { console.warn("No auth user/session yet", gErr); return; }
  const user = data.user;
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, full_name: (fullName || "").trim() || null, email: user.email ?? null },
    { onConflict: "id" }
  );
  if (error) console.error("profiles upsert failed:", error);
}


async function hydrateUserFromProfile() {
  if (!window.supabase) return;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return;
  const { data: row, error: rErr } = await supabase
    .from("profiles").select("full_name, email").eq("id", user.id).single();
  if (!rErr && row) {
    setUser({ name: row.full_name || "Guest", email: row.email || "", phone: "" });
    refreshAvatarFromUser();
    if (typeof updateAuthUI === "function") updateAuthUI();
  }
}


// ========== Auth Dialogs (Supabase) ==========
(function wireAuth() {
  const authDialog = document.getElementById("authDialog");
  const authForm   = document.getElementById("authForm");
  const authEmail  = document.getElementById("authEmail");
  const authPhone  = document.getElementById("authPhone");
  const authPass   = document.getElementById("authPass");

  const registerDialog = document.getElementById("registerDialog");
  const regForm   = document.getElementById("regForm");
  const regName   = document.getElementById("regName");
  const regPhone  = document.getElementById("regPhone");
  const regEmail  = document.getElementById("regEmail");
  const regCode   = document.getElementById("regCode");
  const regPass   = document.getElementById("regPass");
  const regPass2  = document.getElementById("regPass2");
  const regSend   = document.getElementById("regSend");

  // MutationObserver: reset login loading/errors when login dialog opens
  if (authDialog) {
    const mo = new MutationObserver(() => {
      if (authDialog.open) {
        try { setLoginLoading(false); } catch {}
        try { clearLoginErrors?.(); } catch {}
      }
    });
    mo.observe(authDialog, { attributes: true, attributeFilter: ["open"] });
  }

  const authSubmitBtn = authForm?.querySelector('button[type="submit"], .btn.primary.block');
  function setLoginLoading(isLoading, label = "Signing in…") {
    if (!authSubmitBtn) return;
    authSubmitBtn.disabled = !!isLoading;
    authSubmitBtn.classList.toggle("loading", !!isLoading);
    if (isLoading) {
      authSubmitBtn.dataset._label = authSubmitBtn.textContent || "Login";
      authSubmitBtn.textContent = label;
      authSubmitBtn.setAttribute("aria-busy", "true");
    } else {
      authSubmitBtn.textContent = authSubmitBtn.dataset._label || "Login";
      authSubmitBtn.removeAttribute("aria-busy");
    }
  }

  function validateLoginField(input) {
    const v = (input?.value || "").trim();
    let ok = true, msg = "";
    if (input === authPhone) { ok = isPhoneVal(v); msg = "Please enter a valid phone number."; }
    else if (input === authEmail) { ok = /^\S+@\S+\.\S+$/.test(v); msg = "Please enter a valid email."; }
    else if (input === authPass) { ok = v.length > 0; msg = "Please enter your password."; }
    if (!ok) setFieldError(input, msg); else clearFieldError(input);
    return ok;
  }
  function validateLoginForm() {
    const fields = [authPhone || authEmail, authPass].filter(Boolean);
    let firstBad = null;
    const okAll = fields.every(f => { const ok = validateLoginField(f); if (!ok && !firstBad) firstBad = f; return ok; });
    if (!okAll && firstBad) firstBad.focus();
    return okAll;
  }
  ;[authPhone || authEmail, authPass].forEach(el => {
    el?.addEventListener("input", () => validateLoginField(el));
    el?.addEventListener("blur",  () => validateLoginField(el));
  });

  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    try {
      setLoginLoading(true, "Signing in…");
      const raw = (authPhone || authEmail)?.value?.trim() || "";
      const password = authPass?.value || "";
      const isEmail = /@/.test(raw);
      const phone = isEmail ? null : toE164PH(raw);
      const creds = isEmail ? { email: raw, password } : { phone, password };
      const { data, error } = await supabase.auth.signInWithPassword(creds);
      if (error) { setFieldError(authPass, error.message || "Login failed"); return; }

      // wait a moment for session to persist
      const t0 = Date.now();
      while (Date.now() - t0 < 2500) {
        const { data: s } = await supabase.auth.getSession();
        if (s?.session) break;
        await new Promise(r => setTimeout(r, 120));
      }

      await ensureProfileRow?.();
      await hydrateUserFromProfile?.();
      updateAuthUI?.();
      authDialog?.close();
    } catch (err) {
      console.error(err);
      setFieldError(authPass, "Unexpected error logging in.");
    } finally {
      setLoginLoading(false);
    }
  });
  ["close", "cancel"].forEach(ev => authDialog?.addEventListener(ev, () => setLoginLoading(false)));

  // Registration: send code + verify
  let regCountdown = null, regTimeLeft = 0;
  function startOtpCountdown(seconds = 60) {
    regTimeLeft = seconds;
    if (regSend) { regSend.disabled = true; regSend.textContent = `${regTimeLeft}s`; }
    clearInterval(regCountdown);
    regCountdown = setInterval(() => {
      regTimeLeft -= 1;
      if (regSend) regSend.textContent = `${regTimeLeft}s`;
      if (regTimeLeft <= 0) {
        clearInterval(regCountdown);
        regCountdown = null;
        if (regSend) { regSend.disabled = false; regSend.textContent = "Send"; }
      }
    }, 1000);
  }

  regSend?.addEventListener("click", async (e) => {
    e.preventDefault(); e.stopPropagation();
    const val = (regPhone?.value || "").trim();
    if (!isPhoneVal(val)) { setFieldError(regPhone, "Enter a valid phone number"); return; }
    [regPhone, regEmail, regCode, regPass, regPass2, regName].forEach(el => el && clearFieldError(el));
    const phone = toE164PH(val);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) { setFieldError(regPhone, error.message || "Couldn’t send code"); return; }
    startOtpCountdown(60);
  });

  function validateRegisterField(input) {
    const v = (input?.value || "").trim();
    let ok = true, msg = "";
    if (input === regPhone) { ok = isPhoneVal(v); msg = "Please enter a valid phone number."; }
    else if (input === regEmail) { ok = /^\S+@\S+\.\S+$/.test(v); msg = "Please enter a valid email."; }
    else if (input === regName) { ok = v.length >= 2; msg = "Please enter your name."; }
    else if (input === regCode) { ok = v.length > 0; msg = "Please enter the verification code."; }
    else if (input === regPass) { ok = v.length >= 4; msg = "Password must be at least 4 characters."; }
    else if (input === regPass2) { ok = v.length >= 4 && v === (regPass?.value || ""); msg = v.length < 4 ? "Password must be at least 4 characters." : "Passwords do not match."; }
    if (!ok) setFieldError(input, msg); else clearFieldError(input);
    return ok;
  }
  function validateRegisterForm() {
    const fields = [regPhone || regEmail, regCode, regPass, regPass2].filter(Boolean);
    let firstBad = null;
    const okAll = fields.every(f => { const ok = validateRegisterField(f); if (!ok && !firstBad) firstBad = f; return ok; });
    if (!okAll && firstBad) firstBad.focus();
    return okAll;
  }
  ;[regPhone || regEmail, regCode, regPass, regPass2].forEach(el => {
    el?.addEventListener("input", () => {
      validateRegisterField(el);
      if (el === regPass || el === regPass2) regPass2 && validateRegisterField(regPass2);
    });
    el?.addEventListener("blur", () => validateRegisterField(el));
  });

  regForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateRegisterForm()) return;

    const name = (regName?.value || "").trim();
    if (!name) { setFieldError(regName, "Please enter your name."); regName?.focus(); return; }

    const phoneVal = (regPhone?.value || "").trim();
    if (!isPhoneVal(phoneVal)) { setFieldError(regPhone, "Enter a valid phone number"); return; }
    const code = (regCode?.value || "").trim();
    if (!code) { setFieldError(regCode, "Enter the verification code"); return; }

    const phone = toE164PH(phoneVal);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
    if (error) { setFieldError(regCode, error.message || "Invalid or expired code"); return; }

    await ensureProfileRow(name);
    await hydrateUserFromProfile?.();
    updateAuthUI?.();
    registerDialog?.close();
  });

  // Menu bindings
  const menuLogin = document.getElementById("menuLogin");
  const menuRegister = document.getElementById("menuRegister");
  const menuLogout = document.getElementById("menuLogout");
  const menuProfile = document.getElementById("menuProfile");
  const userStatus = document.getElementById("userStatus");
  const PROFILE_URL = "profile.html";

  menuLogin?.addEventListener("click", () => { authDialog?.showModal(); (document.getElementById("authPhone")||document.getElementById("authEmail"))?.focus(); });
  menuRegister?.addEventListener("click", () => { registerDialog?.showModal(); (regPhone||regEmail)?.focus(); });
  menuLogout?.addEventListener("click", async () => { try { await supabase?.auth?.signOut(); } catch {}; clearUser(); updateAuthUI(); });

  if (userStatus) {
    if (!userStatus.hasAttribute("tabindex")) userStatus.setAttribute("tabindex", "0");
    if (!userStatus.hasAttribute("role")) userStatus.setAttribute("role", "button");
    const go = () => { const u = getUser(); if (u) window.location.href = PROFILE_URL; else { authDialog?.showModal(); (document.getElementById("authPhone")||document.getElementById("authEmail"))?.focus(); } };
    userStatus.addEventListener("click", go);
    userStatus.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  }

  // On load: hydrate if session exists
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { await hydrateUserFromProfile?.(); await updateAuthUI?.(); }
      else { updateAuthUI?.(); }
    } catch (e) { console.warn(e); }
  });

  // onAuthStateChange
  let __authHydrating = false;
  if (supabase?.auth?.onAuthStateChange) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (__authHydrating) return;
        __authHydrating = true;
        try { await ensureProfileRow?.(); await hydrateUserFromProfile?.(); await updateAuthUI?.(); }
        finally { __authHydrating = false; }
      }
      if (event === "SIGNED_OUT") { clearUser(); await updateAuthUI?.(); }
    });
  }
})();

// === Hero video mute controls (header + hero buttons) ===
(function wireHeroVideo() {
  const vid = document.getElementById("heroVideo");
  const heroBtn = document.getElementById("heroMuteBtn");
  const headerBtn = document.getElementById("headerMuteBtn");
  if (!vid) return;

  function syncBtns() {
    const muted = vid.muted;
    [heroBtn, headerBtn].forEach(btn => {
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(!muted));
      const icons = btn.querySelectorAll(".icon");
      const [mutedIcon, unmutedIcon] = icons;
      if (mutedIcon && unmutedIcon) {
        mutedIcon.style.display = muted ? "inline" : "none";
        unmutedIcon.style.display = muted ? "none" : "inline";
      }
    });
  }
  function toggle() { vid.muted = !vid.muted; syncBtns(); }
  heroBtn && heroBtn.addEventListener("click", toggle);
  headerBtn && headerBtn.addEventListener("click", toggle);
  vid.addEventListener("volumechange", syncBtns);
  try { vid.muted = true; } catch {}
  syncBtns();
})();
