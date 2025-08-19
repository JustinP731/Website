/* script.js — cleaned & organized */
(() => {
  // === Auth/menu refs
  const menuBtn = document.getElementById("menuBtn");
  const userMenu = document.getElementById("userMenu");
  const menuLogin = document.getElementById("menuLogin");
  const menuLogout = document.getElementById("menuLogout");
  const menuRegister = document.getElementById("menuRegister"); // may not exist, ok
  const authDialog = document.getElementById("authDialog");
  const authForm = document.getElementById("authForm");
  const authEmailInp = document.getElementById("authEmail");
  const authPassInp = document.getElementById("authPass");
  const authCloseBtn = document.querySelector("#authDialog .dialog-close");
  const registerBtn = document.getElementById("registerBtn");
  const userStatus = document.getElementById("userStatus"); // your yellow circle
  const registerDialog = document.getElementById("registerDialog");
  const regForm = document.getElementById("regForm");
  const regEmail = document.getElementById("regEmail");
  const regCode = document.getElementById("regCode");
  const regPass = document.getElementById("regPass");
  const regPass2 = document.getElementById("regPass2");
  const regSend = document.getElementById("regSend");
  const regToLogin = document.getElementById("regToLogin");
  const regCloseBtn = registerDialog?.querySelector(".dialog-close");


  // ===== DOM: core nav/sections =====
  const homeBtn = document.getElementById("homeBtn");
  const logoBtn = document.getElementById("logoBtn");
  const roomBtn = document.getElementById("roomBtn");
  const faqsBtn = document.getElementById("faqsBtn");

  const hero = document.getElementById("hero");
  const home = document.getElementById("home");
  const rooms = document.getElementById("rooms");
  const faqs = document.getElementById("faqs");
  const searchBar = document.getElementById("searchBar");

  // ===== DOM: rooms / filters / panel =====
  const body = document.body;
  const splitWrap = document.querySelector('.filters-and-rooms');
  const topNav = document.getElementById('topNav');               // fixed green header
  const roomListEl = document.getElementById("roomList");
  const unitTypeSelect = document.getElementById("unitType");
  const availabilityToggle = document.getElementById("availabilityToggle");
  const availabilityLabel = document.getElementById("availabilityLabel");

  const panel = document.getElementById("roomPanel");
  const panelTitle = panel.querySelector(".room-title");
  const heroImg = panel.querySelector(".hero-img");
  const kv = panel.querySelector(".kv");
  const descEl = panel.querySelector(".desc");
  const advEl = panel.querySelector(".adv");
  const thumbsNav = panel.querySelector(".thumbs");
  const closeBtn = panel.querySelector(".room-close");

  // 360° / TOUR viewer bits
  const panoBox = document.getElementById('panoViewer');
  let panoInstance = null;

  // add near the top, under your other helpers
  function absUrl(src) {
    // robustly resolve "pngs/..." to "http://127.0.0.1:5500/public/pngs/..."
    return new URL(src, document.baseURI).href;
  }

  // Persist a simple "logged in" state using localStorage
  function getUser() {
    try { return JSON.parse(localStorage.getItem("authUser")) || null; }
    catch { return null; }
  }
  function setUser(u) { localStorage.setItem("authUser", JSON.stringify(u)); }
  function clearUser() { localStorage.removeItem("authUser"); }

  function updateAuthUI() {
    const u = getUser();
    const loggedIn = !!u;

    // Hide Login + Register when logged in; show Logout only then
    if (menuLogin) menuLogin.hidden = loggedIn;
    if (menuRegister) menuRegister.hidden = loggedIn;
    if (menuLogout) menuLogout.hidden = !loggedIn;

    // Avatar letter / tooltip
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
      const firstVisible = [menuLogin, menuRegister, menuLogout].find(el => el && !el.hidden);
      firstVisible?.focus();
    } else {
      userMenu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  }

  // Open/close on button
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(userMenu.hidden); // toggle
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!userMenu.hidden && !userMenu.contains(e.target) && e.target !== menuBtn) {
      toggleMenu(false);
    }
  });

  // Keyboard: Esc closes, ArrowDown focuses first item
  menuBtn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); toggleMenu(true); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
  });

  // Menu actions
  menuLogin.addEventListener("click", () => {
    toggleMenu(false);
    if (authEmailInp) authEmailInp.value = "";
    if (authPassInp) authPassInp.value = "";
    authDialog.showModal();
    authEmailInp?.focus();
  });

  menuLogout.addEventListener("click", () => {
    clearUser();
    updateAuthUI();
    toggleMenu(false);
  });

  authCloseBtn?.addEventListener("click", () => authDialog.close());
  registerBtn?.addEventListener("click", () => {
    authDialog.close();
    regEmail && (regEmail.value = "");
    regCode && (regCode.value = "");
    regPass && (regPass.value = "");
    regPass2 && (regPass2.value = "");
    registerDialog.showModal();
    regEmail?.focus();
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

  regCloseBtn?.addEventListener("click", () => registerDialog.close());

  regToLogin?.addEventListener("click", () => {
    registerDialog.close();
    authDialog.showModal();
  });

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
    const okEmail = /^\S+@\S+\.\S+$/.test(email);
    if (!okEmail) { alert("Please enter a valid email first."); regEmail?.focus(); return; }

    // TODO: call your backend to send a code to the email.
    // For now, just start a 60s resend countdown.
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
    if (!p1 || !p2) { return; }
    if (p1.length < 4) { alert("Password must be at least 4 characters."); return; }
    if (p1 !== p2) { alert("Passwords do not match."); return; }

    // TODO: verify code/password server-side; for now we just “succeed”
    const base = email.split("@")[0];
    const display = base ? base.charAt(0).toUpperCase() + base.slice(1) : "User";
    setUser({ name: display, email });

    updateAuthUI();
    registerDialog.close();
  });

  // Handle dialog submit
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (authEmailInp?.value || "").trim().toLowerCase();
    const pass = (authPassInp?.value || "").trim();
    if (!email || !pass) return;

    // very light email check for UX (server-side validation still recommended)
    const okEmail = /^\S+@\S+\.\S+$/.test(email);
    if (!okEmail) { alert("Please enter a valid email."); return; }

    // Demo auth: accept any non-empty email/password.
    // Derive a display name from the part before @
    const base = email.split("@")[0];
    const display = base ? base.charAt(0).toUpperCase() + base.slice(1) : "User";

    setUser({ name: display, email });
    updateAuthUI();
    authDialog.close();
  });


  // HEIGHT SYNC — make .room-list match the panel's actual rendered height
  let panelResizeObs = null;

  function getStickyOffsetPx() {
    // We already set --sticky-offset on splitWrap in openPanel(); fallback to topNav if missing
    const v = splitWrap && getComputedStyle(splitWrap).getPropertyValue('--sticky-offset');
    const n = v ? parseInt(v, 10) : (topNav ? topNav.offsetHeight : 0);
    return isNaN(n) ? 0 : n;
  }

  function syncSplitHeights() {
    if (!splitWrap || !panel) return;
    const stickyOffset = getStickyOffsetPx();
    const viewportAvail = window.innerHeight - stickyOffset;

    // The panel can be shorter than the available viewport.
    // We want the list to match the panel's *visible* height, not vice versa.
    const panelRect = panel.getBoundingClientRect();
    const panelVisible = Math.min(viewportAvail, Math.round(panelRect.height));

    // Apply to the left list only; panel remains natural/sticky.
    const listEl = document.querySelector('.filters-and-rooms .room-list');
    if (listEl) {
      listEl.style.height = panelVisible + 'px';
      listEl.style.overflowY = 'auto';
    }
  }


  function destroyPano() {
    if (panoInstance) { try { panoInstance.destroy(); } catch (e) { } panoInstance = null; }
  }

  function showImage(src) {
    destroyPano();
    if (panoBox) { panoBox.classList.remove('is-on'); panoBox.setAttribute('aria-hidden', 'true'); }
    heroImg.style.display = 'block';
    heroImg.src = src;
  }

  // replace your current showPano with this:
  function showPano(src) {
    if (typeof pannellum === 'undefined') {
      console.warn('Pannellum not loaded—showing still image instead.');
      return showImage(src);
    }
    const url = absUrl(src);
    heroImg.style.display = 'none';
    panoBox.classList.add('is-on');
    panoBox.setAttribute('aria-hidden', 'false');
    destroyPano();
    panoInstance = pannellum.viewer('panoViewer', {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      showZoomCtrl: true,
      hfov: 100,
      crossOrigin: 'anonymous'
    });
  }


  // replace your current showTour with this:
  function showTour(config) {
    if (typeof pannellum === 'undefined') {
      console.warn('Pannellum not loaded—cannot show tour; showing poster if available.');
      const poster = getTourPosterFromConfig(config);
      return poster ? showImage(poster) : showImage('pngs/cazzaResidence.png');
    }
    // make a shallow copy and set a basePath so scene panoramas resolve correctly
    const cfg = { ...config, basePath: new URL('.', document.baseURI).href, crossOrigin: 'anonymous' };

    heroImg.style.display = 'none';
    panoBox.classList.add('is-on');
    panoBox.setAttribute('aria-hidden', 'false');
    destroyPano();
    panoInstance = pannellum.viewer('panoViewer', cfg);
  }


  function getTourPosterFromConfig(cfg) {
    // Try to find first scene’s panorama as a poster fallback
    const first = cfg?.default?.firstScene;
    if (first && cfg.scenes?.[first]?.panorama) return cfg.scenes[first].panorama;
    // Otherwise try any scene
    const ids = cfg?.scenes ? Object.keys(cfg.scenes) : [];
    if (ids.length && cfg.scenes[ids[0]]?.panorama) return cfg.scenes[ids[0]].panorama;
    return null;
  }

  // Normalizer so thumbnails & display logic are simple
  function normalizeMedia(m) {
    if (typeof m === 'string') return { kind: 'image', src: m };
    if (m?.kind === 'pano') return { kind: 'pano', src: m.src };
    if (m?.kind === 'tour') return { kind: 'tour', poster: m.poster || getTourPosterFromConfig(m.tour), tour: m.tour };
    return { kind: 'image', src: m?.src || 'pngs/cazzaResidence.png' };
  }

  function getCoverFromFirstMedia(first) {
    const fm = normalizeMedia(first);
    if (fm.kind === 'image') return fm.src;
    if (fm.kind === 'pano') return fm.src;
    if (fm.kind === 'tour') return fm.poster || 'pngs/cazzaResidence.png';
    return 'pngs/cazzaResidence.png';
  }


  // ===== Data =====
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
                title: "Hall",
                panorama: "pngs/TourA.png",
                hotSpots: [
                  { pitch: 0, yaw: 290, type: "scene", text: "Go to Sala", sceneId: "sala" },
                  { pitch: 0, yaw: 95, type: "scene", text: "Go to Kitchen", sceneId: "kitchen" }
                ]
              },
              sala: {
                title: "Sala",
                panorama: "pngs/TourAC.png",
                hotSpots: [
                  { pitch: 2, yaw: 85, type: "scene", text: "Back to Hall", sceneId: "hall" }
                ]
              },
              kitchen: {
                title: "Kitchen",
                panorama: "pngs/TourAB.png",
                hotSpots: [
                  { pitch: 2, yaw: 120, type: "scene", text: "Back to Hall", sceneId: "hall" }
                ]
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

  // ===== Utils =====
  const SUPPORTS_VIEW_TRANSITIONS = typeof document.startViewTransition === "function";

  const isAvailable = (room) => room.occupancy < room.capacity;

  const roomCardHTML = (room) => {
    const statusClass = isAvailable(room) ? "available" : "occupied";
    const statusLabel = isAvailable(room) ? "Available" : "Occupied";
    const cover = (room.images && room.images[0]) ? getCoverFromFirstMedia(room.images[0]) : "placeholder.jpg";


    const occText = `${room.occupancy} / ${room.capacity} 👥`;
    const typeLabel = room.type === "dorm" ? "Dorm Type" : "Studio Type";

    return `
      <div 
        class="room-card"
        role="button"
        tabindex="0"
        aria-label="${room.name} details"
        data-id="${room.id}"
        data-type="${room.type}"
        data-name="${room.name}"
        data-price="${room.price}"
        data-occupancy="${room.occupancy}"
        data-capacity="${room.capacity}"
        data-description="${room.description || ""}"
        data-advance="${room.advance || ""}"
      >
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

  function showSection(section) {
    if (!["home", "rooms", "faqs"].includes(section)) return;

    hero.style.display = section === "home" ? "block" : "none";
    home.style.display = section === "home" ? "block" : "none";
    rooms.style.display = section === "rooms" ? "block" : "none";
    faqs.style.display = section === "faqs" ? "block" : "none";

    // close details panel if leaving Rooms
    if (section !== "rooms") closePanel();
  }

  // ===== Navigation (top buttons) =====
  const navButtons = document.querySelectorAll(".search-bar button");
  function setActiveButton(clickedBtn) {
    navButtons.forEach((btn) => btn.classList.remove("active"));
    clickedBtn.classList.add("active");
  }

  homeBtn.addEventListener("click", () => {
    showSection("home");
    setActiveButton(homeBtn);
  });
  logoBtn.addEventListener("click", () => {
    showSection("home");
    setActiveButton(homeBtn);
  });
  roomBtn.addEventListener("click", () => {
    showSection("rooms");
    setActiveButton(roomBtn);
  });
  faqsBtn.addEventListener("click", () => {
    showSection("faqs");
    setActiveButton(faqsBtn);
  });

  // ===== Search bar hide-on-scroll =====
  let lastScrollTop = 0;
  window.addEventListener("scroll", () => {
    if (body.classList.contains("details-open")) return;

    const current = window.pageYOffset || document.documentElement.scrollTop;
    searchBar.style.transform = current > lastScrollTop ? "translateY(-100%)" : "translateY(0)";
    lastScrollTop = current <= 0 ? 0 : current;
  });

  // ===== Filtering + render =====
  function renderRooms(list) {
    roomListEl.innerHTML = list.map(roomCardHTML).join("");
    attachRoomCardClicks(); // delegate (binds once)
  }

  function filterRooms() {
    const selectedType = unitTypeSelect.value;        // "all" | "studio" | "dorm"
    const onlyAvailable = availabilityToggle.checked; // true | false

    const filtered = roomsData.filter((room) => {
      const matchesType = selectedType === "all" || room.type === selectedType;
      const matchesAvailability = !onlyAvailable || isAvailable(room);
      return matchesType && matchesAvailability;
    });

    renderRooms(filtered);
  }

  // ===== Details panel (inline section) =====
  let activeCard = null;
  let clicksBound = false;

  function openPanel(room, clickSourceEl) {
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

    // media list (now supports 'image' | 'pano' | 'tour')
    const mediaListRaw = (room.images && room.images.length ? room.images : ['pngs/cazzaResidence.png']);
    const mediaList = mediaListRaw.map(normalizeMedia);

    // show first media
    const first = mediaList[0] || { kind: 'image', src: 'pngs/cazzaResidence.png' };
    if (first.kind === 'tour') showTour(first.tour);
    else if (first.kind === 'pano') showPano(first.src);
    else showImage(first.src);

    // thumbnails (one per media item)
    // For 'tour' we render a single thumb with a "Tour" badge
    thumbsNav.innerHTML = mediaList.map((m, i) => {
      const thumbSrc = (m.kind === 'tour') ? (m.poster || 'pngs/cazzaResidence.png') : m.src;
      const label = (m.kind === 'tour') ? 'Tour' : (m.kind === 'pano') ? '360°' : '';
      return `
    <button class="thumb ${i === 0 ? 'is-active' : ''}" 
            data-kind="${m.kind}" 
            data-src="${m.src || ''}"
            data-idx="${i}" 
            aria-label="Media ${i + 1}${label ? ' - ' + label : ''}">
      <img src="${thumbSrc}" alt="">
      ${label ? `<span class="tag-360">${label}</span>` : ''}
    </button>
  `;
    }).join('');

    thumbsNav.querySelectorAll('.thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        const item = mediaList[idx];
        // switch media
        if (item.kind === 'tour') showTour(item.tour);
        else if (item.kind === 'pano') showPano(item.src);
        else showImage(item.src);

        // update selected
        thumbsNav.querySelectorAll('.thumb').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    // grow animation origin from clicked card
    if (clickSourceEl) {
      const r = clickSourceEl.getBoundingClientRect();
      const root = document.documentElement.getBoundingClientRect();
      const x = ((r.left + r.width / 2) - root.left) / root.width * 100;
      const y = ((r.top + r.height / 2) - root.top) / root.height * 100;
      panel.style.setProperty("--grow-x", x + "%");
      panel.style.setProperty("--grow-y", y + "%");
    }

    // show
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    // INSERT B — enter split layout; equal heights; hide tabs row
    body.classList.add("details-open");            // state flag for CSS
    if (splitWrap) {
      splitWrap.classList.add("is-split");
      // use real header height so left/right bottoms line up
      const headerH = topNav ? topNav.offsetHeight : 0;
      splitWrap.style.setProperty("--sticky-offset", `${headerH}px`);
    }
    if (searchBar) searchBar.style.display = "none"; // hide "Home / Room Available / FAQs"
    // Start syncing heights to the panel
    syncSplitHeights();
    panelResizeObs = new ResizeObserver(syncSplitHeights);
    panelResizeObs.observe(panel);
    window.addEventListener('resize', syncSplitHeights);

    panel.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panel.style.removeProperty("--grow-x");
    panel.style.removeProperty("--grow-y");

    // NEW: destroy pano and restore hero image
    destroyPano();
    if (panoBox) {
      panoBox.classList.remove('is-on');
      panoBox.setAttribute('aria-hidden', 'true');
    }
    heroImg.style.display = 'block';

    if (activeCard) {
      activeCard.classList.remove("is-active");
      activeCard = null;
    }

    // INSERT C — leave split layout; restore UI
    body.classList.remove("details-open");
    if (splitWrap) {
      splitWrap.classList.remove("is-split");
      splitWrap.style.removeProperty("--sticky-offset");
    }
    if (searchBar) searchBar.style.display = "";   // back to CSS default
    // Stop syncing and clear inline height
    if (panelResizeObs) {
      panelResizeObs.disconnect();
      panelResizeObs = null;
    }
    const listEl = document.querySelector('.filters-and-rooms .room-list');
    if (listEl) listEl.style.removeProperty('height');

    window.removeEventListener('resize', syncSplitHeights);

  }

  closeBtn.addEventListener("click", closePanel);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  // Delegate clicks from the list (bind once)
  function attachRoomCardClicks() {
    if (clicksBound) return;
    clicksBound = true;

    // mouse/touch
    roomListEl.addEventListener("click", (ev) => {
      const card = ev.target.closest(".room-card");
      if (!card) return;

      // active hint
      document
        .querySelectorAll(".room-card.is-active")
        .forEach((c) => c.classList.remove("is-active"));
      activeCard = card;
      activeCard.classList.add("is-active");

      // get room data (from source data if possible)
      const id = card.dataset.id;
      const room =
        roomsData.find((r) => r.id === id) || {
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

    // keyboard (Enter / Space)
    roomListEl.addEventListener("keydown", (e) => {
      const card = e.target.closest(".room-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  }

  // ===== Boot sequence =====
  function boot() {
    // label text
    if (availabilityLabel) {
      availabilityLabel.textContent = availabilityToggle.checked ? "Available Only" : "Show All";
    }

    // initial render (all rooms)
    renderRooms(roomsData);

    // filter events
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

    // default section
    showSection("home");
  }

  // go!
  updateAuthUI();
  boot();
})();
