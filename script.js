/* script.js — split-layout + panel + media viewer (cleaned) */
(() => {
  /* ===========================
     SECTION 1 — AUTH / USER MENU
     =========================== */
  const menuBtn = document.getElementById("menuBtn");
  const userMenu = document.getElementById("userMenu");
  const menuLogin = document.getElementById("menuLogin");
  const menuLogout = document.getElementById("menuLogout");
  const menuRegister = document.getElementById("menuRegister");

  const authDialog = document.getElementById("authDialog");
  const authForm = document.getElementById("authForm");
  const authEmailInp = document.getElementById("authEmail");
  const authPassInp = document.getElementById("authPass");
  const authCloseBtn = document.querySelector("#authDialog .dialog-close");

  const registerDialog = document.getElementById("registerDialog");
  const regForm = document.getElementById("regForm");
  const regEmail = document.getElementById("regEmail");
  const regCode = document.getElementById("regCode");
  const regPass = document.getElementById("regPass");
  const regPass2 = document.getElementById("regPass2");
  const regSend = document.getElementById("regSend");
  const regToLogin = document.getElementById("regToLogin");
  const regCloseBtn = registerDialog?.querySelector(".dialog-close");

  const userStatus = document.getElementById("userStatus");

  // simple localStorage auth demo
  const getUser = () => { try { return JSON.parse(localStorage.getItem("authUser")) || null; } catch { return null; } };
  const setUser = (u) => localStorage.setItem("authUser", JSON.stringify(u));
  const clearUser = () => localStorage.removeItem("authUser");

  function updateAuthUI() {
    const u = getUser();
    const loggedIn = !!u;

    if (menuLogin) menuLogin.hidden = loggedIn;
    if (menuRegister) menuRegister.hidden = loggedIn;
    if (menuLogout) menuLogout.hidden = !loggedIn;

    if (userStatus) {
      const letter = loggedIn && u?.name ? u.name.trim().charAt(0).toUpperCase() : "G";
      userStatus.textContent = letter;
      userStatus.title = loggedIn ? u.name : "Guest";
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

  // menu interactions
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(userMenu.hidden); });
  document.addEventListener("click", (e) => { if (!userMenu.hidden && !userMenu.contains(e.target) && e.target !== menuBtn) toggleMenu(false); });
  menuBtn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); toggleMenu(true); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });

  menuLogin?.addEventListener("click", () => {
    toggleMenu(false);
    authEmailInp && (authEmailInp.value = "");
    authPassInp && (authPassInp.value = "");
    authDialog.showModal();
    authEmailInp?.focus();
  });

  menuRegister?.addEventListener("click", () => {
    toggleMenu(false);
    regEmail && (regEmail.value = "");
    regCode && (regCode.value = "");
    regPass && (regPass.value = "");
    regPass2 && (regPass2.value = "");
    registerDialog.showModal();
    regEmail?.focus();
  });

  menuLogout?.addEventListener("click", () => { clearUser(); updateAuthUI(); toggleMenu(false); });

  authCloseBtn?.addEventListener("click", () => authDialog.close());
  regCloseBtn?.addEventListener("click", () => registerDialog.close());
  regToLogin?.addEventListener("click", () => { registerDialog.close(); authDialog.showModal(); });

  // auth form submits (optional-chained for resilience)
  authForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (authEmailInp?.value || "").trim().toLowerCase();
    const pass = (authPassInp?.value || "").trim();
    if (!email || !pass) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) { alert("Please enter a valid email."); return; }
    const display = (email.split("@")[0] || "User");
    setUser({ name: display.charAt(0).toUpperCase() + display.slice(1), email });
    updateAuthUI();
    authDialog.close();
  });

  // register (demo) + OTP countdown
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

  regSend?.addEventListener("click", () => {
    const email = (regEmail?.value || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { alert("Please enter a valid email first."); regEmail?.focus(); return; }
    startOtpCountdown(60);
  });

  regForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (regEmail?.value || "").trim().toLowerCase();
    const code = (regCode?.value || "").trim();
    const p1 = regPass?.value || "";
    const p2 = regPass2?.value || "";
    if (!/^\S+@\S+\.\S+$/.test(email)) { alert("Please enter a valid email."); return; }
    if (!code) { alert("Please enter the verification code."); return; }
    if (!p1 || !p2) return;
    if (p1.length < 4) { alert("Password must be at least 4 characters."); return; }
    if (p1 !== p2) { alert("Passwords do not match."); return; }

    const base = email.split("@")[0] || "User";
    const display = base.charAt(0).toUpperCase() + base.slice(1);
    setUser({ name: display, email });
    updateAuthUI();
    registerDialog.close();
  });


  /* ==============================
     SECTION 2 — NAV / PAGE SECTIONS
     ============================== */
  const homeBtn = document.getElementById("homeBtn");
  const logoBtn = document.getElementById("logoBtn");
  const roomBtn = document.getElementById("roomBtn");
  const faqsBtn = document.getElementById("faqsBtn");

  const hero = document.getElementById("hero");
  const home = document.getElementById("home");
  const rooms = document.getElementById("rooms");
  const faqs = document.getElementById("faqs");
  const searchBar = document.getElementById("searchBar");

  const body = document.body;

  function showSection(section) {
    if (!["home", "rooms", "faqs"].includes(section)) return;
    if (section !== "rooms") closePanel(); // fully reset split state if leaving rooms
    hero.style.display = section === "home" ? "block" : "none";
    home.style.display = section === "home" ? "block" : "none";
    rooms.style.display = section === "rooms" ? "block" : "none";
    faqs.style.display = section === "faqs" ? "block" : "none";
  }

  const navButtons = document.querySelectorAll(".search-bar button");
  const setActiveButton = (btn) => { navButtons.forEach(b => b.classList.remove("active")); btn.classList.add("active"); };

  homeBtn.addEventListener("click", () => { showSection("home"); setActiveButton(homeBtn); });
  logoBtn.addEventListener("click", () => { showSection("home"); setActiveButton(homeBtn); });
  roomBtn.addEventListener("click", () => { showSection("rooms"); setActiveButton(roomBtn); });
  faqsBtn.addEventListener("click", () => { showSection("faqs"); setActiveButton(faqsBtn); });

  // hide tabs row on scroll (but not while panel is open)
  let lastScrollTop = 0;
  window.addEventListener("scroll", () => {
    if (body.classList.contains("details-open")) return;
    const current = window.pageYOffset || document.documentElement.scrollTop;
    searchBar.style.transform = current > lastScrollTop ? "translateY(-100%)" : "translateY(0)";
    lastScrollTop = Math.max(current, 0);
  });


  /* ======================================
     SECTION 3 — ROOMS LIST / FILTER CONTROLS
     ====================================== */
  const splitWrap = document.querySelector(".filters-and-rooms");
  const topNav = document.getElementById("topNav");

  const roomListEl = document.getElementById("roomList");
  const unitTypeSelect = document.getElementById("unitType");
  const availabilityToggle = document.getElementById("availabilityToggle");
  const availabilityLabel = document.getElementById("availabilityLabel");

  const SUPPORTS_VIEW_TRANSITIONS = typeof document.startViewTransition === "function";

  const isAvailable = (room) => room.occupancy < room.capacity;

  const roomCardHTML = (room) => {
    const statusClass = isAvailable(room) ? "available" : "occupied";
    const statusLabel = isAvailable(room) ? "Available" : "Occupied";
    const cover = (room.images && room.images[0]) ? getCoverFromFirstMedia(room.images[0]) : "placeholder.jpg";
    const occText = `${room.occupancy} / ${room.capacity} 👥`;
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

  function renderRooms(list) {
    roomListEl.innerHTML = list.map(roomCardHTML).join("");
    attachRoomCardClicks(); // bind once (delegated)
  }

  function filterRooms() {
    const selectedType = unitTypeSelect.value;        // "all" | "studio" | "dorm"
    const onlyAvailable = availabilityToggle.checked;  // true | false
    const filtered = roomsData.filter(room => {
      const matchesType = selectedType === "all" || room.type === selectedType;
      const matchesAvail = !onlyAvailable || isAvailable(room);
      return matchesType && matchesAvail;
    });
    renderRooms(filtered);
  }


  /* ===============================
     SECTION 4 — DETAILS PANEL + MEDIA
     =============================== */
  const panel = document.getElementById("roomPanel");
  const panelTitle = panel.querySelector(".room-title");
  const heroImg = panel.querySelector(".hero-img");
  const kv = panel.querySelector(".kv");
  const descEl = panel.querySelector(".desc");
  const advEl = panel.querySelector(".adv");
  const thumbsNav = panel.querySelector(".thumbs");
  const closeBtn = panel.querySelector(".room-close");

  const panoBox = document.getElementById("panoViewer");
  let panoInstance = null;

  let panelResizeObs = null;
  let filtersObs = null;
  let activeCard = null;
  let clicksBound = false;

  function absUrl(src) { return new URL(src, document.baseURI).href; }

  function destroyPano() {
    if (!panoInstance) return;
    try { panoInstance.destroy(); } catch { }
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

  function getTourPosterFromConfig(cfg) {
    const first = cfg?.default?.firstScene;
    if (first && cfg.scenes?.[first]?.panorama) return cfg.scenes[first].panorama;
    const ids = cfg?.scenes ? Object.keys(cfg.scenes) : [];
    if (ids.length && cfg.scenes[ids[0]]?.panorama) return cfg.scenes[ids[0]].panorama;
    return null;
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

  // unify media structure
  function normalizeMedia(m) {
    if (typeof m === "string") return { kind: "image", src: m };
    if (m?.kind === "pano") return { kind: "pano", src: m.src };
    if (m?.kind === "tour") return { kind: "tour", poster: m.poster || getTourPosterFromConfig(m.tour), tour: m.tour };
    return { kind: "image", src: m?.src || "pngs/cazzaResidence.png" };
  }
  function getCoverFromFirstMedia(first) {
    const fm = normalizeMedia(first);
    if (fm.kind === "tour") return fm.poster || "pngs/cazzaResidence.png";
    return fm.src;
  }

  // layout sync: measure offsets and match heights
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
    const cs = getComputedStyle(splitWrap);
    const sticky = parseInt(cs.getPropertyValue("--sticky-offset")) || 0;
    const filtersH = parseInt(cs.getPropertyValue("--filters-h")) || 0;

    const panelRect = panel.getBoundingClientRect();
    const panelVisible = Math.min(window.innerHeight - sticky, Math.round(panelRect.height));
    const targetH = Math.max(0, panelVisible - filtersH);

    const listEl = splitWrap.querySelector(".room-list");
    if (listEl) {
      listEl.style.height = targetH + "px";
      listEl.style.overflowY = "auto";
    }
  }

  function exitSplitLayout() {
    document.body.classList.remove("details-open");

    window.removeEventListener("resize", syncSplitHeights);
    window.removeEventListener("resize", recalcSplitVars);

    try { panelResizeObs?.disconnect(); } catch { }
    try { filtersObs?.disconnect(); } catch { }
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
    // prevent stacked listeners if user re-opens quickly
    window.removeEventListener("resize", syncSplitHeights);
    window.removeEventListener("resize", recalcSplitVars);
    try { panelResizeObs?.disconnect(); } catch { }
    try { filtersObs?.disconnect(); } catch { }
    panelResizeObs = null;
    filtersObs = null;

    // content
    panelTitle.textContent = room.name;
    kv.innerHTML = `
      <div><dt>Unit Type</dt><dd>${room.type === "dorm" ? "Dorm" : "Studio"}</dd></div>
      <div><dt>Price</dt><dd><span style="color:#6b7280">Monthly</span> ₱${room.price.toLocaleString()}</dd></div>
      <div><dt>Number of Roommate</dt><dd>${room.occupancy}</dd></div>
      <div><dt>Capacity</dt><dd>${room.capacity}</dd></div>
    `;
    descEl.textContent = room.description || "—";
    advEl.textContent = room.advance || "—";

    // media
    const mediaListRaw = (room.images && room.images.length ? room.images : ["pngs/cazzaResidence.png"]);
    const mediaList = mediaListRaw.map(normalizeMedia);
    const first = mediaList[0] || { kind: "image", src: "pngs/cazzaResidence.png" };
    if (first.kind === "tour") showTour(first.tour);
    else if (first.kind === "pano") showPano(first.src);
    else showImage(first.src);

    // thumbnails
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
        const idx = +btn.dataset.idx;
        const item = mediaList[idx];
        if (item.kind === "tour") showTour(item.tour);
        else if (item.kind === "pano") showPano(item.src);
        else showImage(item.src);
        thumbsNav.querySelectorAll(".thumb").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    // grow animation origin
    if (clickSourceEl) {
      const r = clickSourceEl.getBoundingClientRect();
      const root = document.documentElement.getBoundingClientRect();
      const x = ((r.left + r.width / 2) - root.left) / root.width * 100;
      const y = ((r.top + r.height / 2) - root.top) / root.height * 100;
      panel.style.setProperty("--grow-x", x + "%");
      panel.style.setProperty("--grow-y", y + "%");
    }

    // show panel + enter split layout
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("details-open");
    splitWrap?.classList.add("is-split");
    if (searchBar) searchBar.style.display = "none";

    // measure sticky offsets + keep bottoms aligned
    recalcSplitVars();
    syncSplitHeights();
    window.addEventListener("resize", recalcSplitVars);
    window.addEventListener("resize", syncSplitHeights);

    if ("ResizeObserver" in window) {
      try {
        panelResizeObs = new ResizeObserver(syncSplitHeights);
        panelResizeObs.observe(panel);
      } catch { }
      try {
        const filtersEl = splitWrap?.querySelector(".room-filters");
        if (filtersEl) {
          filtersObs = new ResizeObserver(recalcSplitVars);
          filtersObs.observe(filtersEl);
        }
      } catch { }
    }

    // a11y: move focus into panel
    closeBtn?.focus();

    panel.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function closePanel() {
    // if already closed, just ensure layout is reset
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

    // keep reference to restore focus after layout reset
    const toFocus = activeCard;

    // clear active highlight
    activeCard?.classList.remove("is-active");
    activeCard = null;

    // leave split layout
    exitSplitLayout();

    // a11y: put focus back on the card that opened the panel (if still in DOM)
    toFocus?.focus?.();

    // optional: keep user oriented
    document.getElementById("rooms")?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  closeBtn?.addEventListener("click", closePanel);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  // delegate room-card clicks (bind once)
  function attachRoomCardClicks() {
    if (clicksBound) return;
    clicksBound = true;

    roomListEl.addEventListener("click", (ev) => {
      const card = ev.target.closest(".room-card");
      if (!card) return;

      document.querySelectorAll(".room-card.is-active").forEach(c => c.classList.remove("is-active"));
      activeCard = card;
      activeCard.classList.add("is-active");

      const id = card.dataset.id;
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


  /* =====================
     SECTION 5 — ROOM DATA
     ===================== */
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


  /* ====================
     SECTION 6 — BOOTSTRAP
     ==================== */
  function boot() {
    // set initial label + title (prevents layout shift)
    if (availabilityLabel) {
      availabilityLabel.textContent = availabilityToggle.checked ? "Available Only" : "Show All";
      availabilityLabel.title = availabilityLabel.textContent;
    }

    // initial render (all rooms)
    renderRooms(roomsData);

    // filters
    unitTypeSelect.addEventListener("change", filterRooms);
    availabilityToggle.addEventListener("change", () => {
      availabilityLabel.textContent = availabilityToggle.checked ? "Available Only" : "Show All";
      availabilityLabel.title = availabilityLabel.textContent;
      filterRooms();
    });
    availabilityLabel.addEventListener("click", () => {
      availabilityToggle.checked = !availabilityToggle.checked;
      availabilityToggle.dispatchEvent(new Event("change"));
    });

    // default to Home
    showSection("home");
  }

  updateAuthUI();
  boot();
})();
