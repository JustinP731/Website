/* script.js — cleaned & organized */
(() => {
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
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
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
      filterRooms();
    });
    availabilityLabel.addEventListener("click", () => {
      availabilityToggle.checked = !availabilityToggle.checked;
      availabilityToggle.dispatchEvent(new Event("change"));
    });

    // default section
    showSection("home");
  }

  // ===== Simulate login badge (kept from your code) =====
  (function updateUserBadge() {
    const userStatus = document.getElementById("userStatus");
    const isLoggedIn = false; // flip to true for tenant
    if (isLoggedIn) {
      userStatus.textContent = "T";
      userStatus.title = "Tenant";
    } else {
      userStatus.textContent = "G";
      userStatus.title = "Guest";
    }
  })();

  // go!
  boot();
})();
