/* ============================================================================
   script.js — Split layout + details panel + media viewer
   Perf pass: lazy work, rAF throttling, fewer reflows, lighter listeners
   ============================================================================ */

(() => {
  'use strict';

  /* ──────────────────────────────────────────────────────────────────────────
     CONFIG / GLOBAL STATE
     ────────────────────────────────────────────────────────────────────────── */
  const CFG = {
    PROFILE_URL: 'profile.html',
    INDEX_URL: 'index.html',
    DEFAULT_AVATAR: 'pngs/default-avatar.png',
    FALLBACK_MEDIA: 'pngs/cazzaResidence.png',
    AVATAR_SIZE: 'h-10 w-10',
    SCROLL_TOL_DOWN: 12,
    SCROLL_TOL_UP: 12,

    // Lazy-load Pannellum only if needed (uses global if already present)
    PANNELLUM_JS: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js',
    PANNELLUM_CSS: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
  };

  const STATE = {
    sessionGuardTimer: null,
    isProfilePage: false,
    activeCard: null,
    panoInstance: null,
    panelResizeObs: null,
    filtersObs: null,
    authHydrating: false,
    clicksBound: false,
    roomsRendered: false,
    lastFilter: { type: 'all', avail: false },
  };

  // DOM buckets (populated in collectDOM)
  const DOM = { nav: {}, auth: {}, roomsUi: {}, panel: {}, misc: {} };

  /* ──────────────────────────────────────────────────────────────────────────
     SMALL UTILS
     ────────────────────────────────────────────────────────────────────────── */

  // ===== Single-active-session helpers =====
  const SESSION_KEY_K = 'authSessionKey';
  const getSessKey = () => localStorage.getItem(SESSION_KEY_K);
  const setSessKey = (k) => localStorage.setItem(SESSION_KEY_K, k);
  const clearSessKey = () => localStorage.removeItem(SESSION_KEY_K);
  const makeSessKey = () => (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const log = (...a) => console.log('[App]', ...a);
  const warn = (...a) => console.warn('[App]', ...a);

  const getSB = () => window.__supabase || window.supabaseClient || null;
  const AVATAR_IMG_CLASS = `${CFG.AVATAR_SIZE} rounded-full object-cover`;

  const onReady = (cb) =>
    (document.readyState !== 'loading')
      ? cb()
      : document.addEventListener('DOMContentLoaded', cb, { once: true });

  const onIdle = (cb, timeout = 600) =>
  (window.requestIdleCallback
    ? requestIdleCallback(cb, { timeout })
    : setTimeout(cb, timeout));

  // rAF throttle (ensures fn runs at most once per frame)
  const rafThrottle = (fn) => {
    let ticking = false, lastArgs = null;
    return (...args) => {
      lastArgs = args;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; fn(...lastArgs); });
    };
  };

  const isPhoneVal = (s) => (s || '').replace(/\D/g, '').length >= 7;

  function toE164PH(phoneRaw) {
    const d = (phoneRaw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('09') && d.length === 11) return '+63' + d.slice(1);
    if (d.startsWith('9') && d.length === 10) return '+63' + d;
    if (d.startsWith('63')) return '+' + d;
    if (d.startsWith('0') && d.length > 1) return '+63' + d.slice(1);
    if (d.startsWith('+')) return d;
    return '+' + d;
  }

  function wipeSupabaseLocal() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('sb-') || k.startsWith('supabase.auth.token')) {
          localStorage.removeItem(k);
        }
      }
    } catch { }
  }

  const getUser = () => { try { return JSON.parse(localStorage.getItem('authUser')) || null; } catch { return null; } };
  const setUser = (u) => localStorage.setItem('authUser', JSON.stringify(u));
  const clearUser = () => localStorage.removeItem('authUser');

  const absUrl = (src) => new URL(src, document.baseURI).href;
  const isAvailable = (room) => room.occupancy < room.capacity;

  function setFieldError(input, msg) {
    if (!input) return;
    const wrap = input.closest('.input-wrap') || input.parentElement;
    if (!wrap) return;
    wrap.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    let errEl = qs('.field-error', wrap);
    if (!errEl) { errEl = document.createElement('div'); errEl.className = 'field-error'; wrap.appendChild(errEl); }
    errEl.textContent = msg || 'This field is required.';
  }
  function clearFieldError(input) {
    if (!input) return;
    const wrap = input.closest('.input-wrap') || input.parentElement;
    if (!wrap) return;
    wrap.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    const errEl = qs('.field-error', wrap);
    if (errEl) errEl.remove();
  }

  // Media helpers
  function normalizeMedia(m) {
    if (typeof m === 'string') return { kind: 'image', src: m };
    if (m?.kind === 'pano') return { kind: 'pano', src: m.src };
    if (m?.kind === 'tour') return { kind: 'tour', poster: m.poster || getTourPosterFromConfig(m.tour), tour: m.tour };
    return { kind: 'image', src: m?.src || CFG.FALLBACK_MEDIA };
  }
  function getCoverFromFirstMedia(first) {
    const fm = normalizeMedia(first);
    return fm.kind === 'tour' ? (fm.poster || CFG.FALLBACK_MEDIA) : fm.src;
  }
  function getTourPosterFromConfig(cfg) {
    const first = cfg?.default?.firstScene;
    if (first && cfg.scenes?.[first]?.panorama) return cfg.scenes[first].panorama;
    const ids = cfg?.scenes ? Object.keys(cfg.scenes) : [];
    if (ids.length && cfg.scenes[ids[0]]?.panorama) return cfg.scenes[ids[0]].panorama;
    return null;
  }

  async function ensurePannellumLoaded() {
    if (window.pannellum) return;
    // prevent duplicate loads
    if (document.querySelector('script[data-pannellum]')) {
      await new Promise((res) => document.querySelector('script[data-pannellum]')?.addEventListener('load', res, { once: true }));
      return;
    }
    // CSS first (non-blocking)
    if (!document.querySelector('link[data-pannellum-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CFG.PANNELLUM_CSS;
      link.setAttribute('data-pannellum-css', 'true');
      document.head.appendChild(link);
    }
    // JS
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CFG.PANNELLUM_JS;
      s.async = true;
      s.defer = true;
      s.setAttribute('data-pannellum', 'true');
      s.onload = resolve;
      s.onerror = () => { warn('Failed to load Pannellum from CDN.'); resolve(); };
      document.head.appendChild(s);
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DOM COLLECTOR
     ────────────────────────────────────────────────────────────────────────── */
  function collectDOM() {
    STATE.isProfilePage = document.body.classList.contains('page-profile');

    // NAV + sections
    DOM.nav = {
      topNav: qs('#topNav'),
      logoBtn: qs('#logoBtn'),
      homeBtn: qs('#homeBtn'),
      roomBtn: qs('#roomBtn'),
      faqsBtn: qs('#faqsBtn'),
      searchBar: qs('#searchBar'),
      siteFooter: qs('.site-footer'),
      main: qs('#main'),
      homeOnlyIds: ['intro-video', 'building-info', 'testimonials', 'homeVideo'],
      hero: qs('#hero'),
      home: qs('#home'),
      rooms: qs('#rooms'),
      faqs: qs('#faqs'),
      navButtons: qsa('.search-bar button')
    };

    // AUTH + menus + dialogs
    DOM.auth = {
      menuBtn: qs('#menuBtn'),
      userMenu: qs('#userMenu'),
      menuLogin: qs('#menuLogin'),
      menuLogout: qs('#menuLogout'),
      menuRegister: qs('#menuRegister'),
      userStatus: qs('#userStatus'),
      menuProfile: qs('#menuProfile'),
      menuHome: qs('#menuHome'),
      authDialog: qs('#authDialog'),
      authForm: qs('#authForm'),
      authEmailInp: qs('#authEmail'),
      authPhoneInp: qs('#authPhone'),
      authPassInp: qs('#authPass'),
      authCloseBtn: qs('#authDialog .dialog-close'),
      loginToRegister: qs('#registerBtn') || qs('#loginToRegister'),
      registerDialog: qs('#registerDialog'),
      regName: qs('#regName'),
      regForm: qs('#regForm'),
      regPhone: qs('#regPhone'),
      regCode: qs('#regCode'),
      regPass: qs('#regPass'),
      regPass2: qs('#regPass2'),
      regSend: qs('#regSend'),
      regToLoginBtn: qs('#regToLogin'),
      regCloseBtn: qs('#registerDialog .dialog-close'),
    };

    // Rooms / filters / split layout
    DOM.roomsUi = {
      splitWrap: qs('.filters-and-rooms'),
      roomListEl: qs('#roomList'),
      unitTypeSelect: qs('#unitType'),
      availabilityToggle: qs('#availabilityToggle'),
      availabilityLabel: qs('#availabilityLabel')
    };

    // Details panel
    const panel = qs('#roomPanel');
    DOM.panel = {
      panel,
      panelTitle: panel?.querySelector('.room-title'),
      heroImg: panel?.querySelector('.hero-img'),
      kv: panel?.querySelector('.kv'),
      descEl: panel?.querySelector('.desc'),
      advEl: panel?.querySelector('.adv'),
      thumbsNav: panel?.querySelector('.thumbs'),
      closeBtn: panel?.querySelector('.room-close'),
      panoBox: qs('#panoViewer')
    };

    // Misc
    DOM.misc = {
      body: document.body,
      headerMuteBtn: qs('#headerMuteBtn'),
      heroMuteBtn: qs('#heroMuteBtn'),
      heroVideo: qs('#heroVideo'),
      navIcons: qs('.nav-icons')
    };

    // a11y for avatar (if div)
    if (DOM.auth.userStatus) {
      DOM.auth.userStatus.tabIndex = DOM.auth.userStatus.tabIndex || 0;
      DOM.auth.userStatus.setAttribute('role', DOM.auth.userStatus.getAttribute('role') || 'button');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     AUTH (unchanged behavior; kept compact)
     ────────────────────────────────────────────────────────────────────────── */

  async function startSessionGuard() {
    const sb = getSB();
    if (!sb?.auth) return;

    const { data: { user } = {} } = await sb.auth.getUser();
    if (!user) return;

    const remote = user.user_metadata?.session_key || null;
    let local = getSessKey();

    // First load on this device: adopt remote key or publish our local key
    if (!local && remote) setSessKey(remote);
    if (!local && !remote) {
      const k = makeSessKey();
      setSessKey(k);
      try { await sb.auth.updateUser({ data: { session_key: k, sk_t: Date.now() } }); } catch { }
      local = k;
    }

    // If someone else has a newer key, this device signs out
    if (remote && local && remote !== local) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch { }
      clearUser(); clearSessKey();
      location.replace(CFG.INDEX_URL + '#session-kicked');
      return;
    }

    // Poll occasionally to catch changes quickly (15s is fine)
    if (!STATE.sessionGuardTimer) {
      STATE.sessionGuardTimer = setInterval(async () => {
        const { data: { user } = {} } = await sb.auth.getUser();
        const r = user?.user_metadata?.session_key;
        const l = getSessKey();
        if (r && l && r !== l) {
          try { await sb.auth.signOut({ scope: 'local' }); } catch { }
          clearUser(); clearSessKey();
          location.replace(CFG.INDEX_URL + '#session-kicked');
        }
      }, 15000);
    }
  }

  function refreshAvatarFromUser(u = getUser()) {
    const { userStatus } = DOM.auth;
    const loggedIn = !!u;
    const name = u?.name || u?.full_name || u?.email || u?.phone || (loggedIn ? 'User' : 'Guest');
    const avatarUrl = u?.avatar_url || u?.avatarUrl || u?.picture || u?.photoURL || null;

    if (userStatus) {
      if (!loggedIn) userStatus.innerHTML = `<img src="${CFG.DEFAULT_AVATAR}" alt="User avatar" class="${AVATAR_IMG_CLASS}" />`;
      else if (avatarUrl) userStatus.innerHTML = `<img src="${avatarUrl}" alt="User avatar" class="${AVATAR_IMG_CLASS}" />`;
      else userStatus.textContent = (name?.trim()?.[0] || 'U').toUpperCase();

      userStatus.title = `User: ${name}`;
      userStatus.setAttribute('aria-label', `User: ${name}`);
    }

    qsa('.profile-circle, .page-profile .avatar-lg').forEach(el => {
      const src = !loggedIn ? CFG.DEFAULT_AVATAR : (avatarUrl || null);
      if (src) el.innerHTML = `<img src="${src}" alt="User avatar" class="${AVATAR_IMG_CLASS}" />`;
      else el.textContent = (name?.trim()?.[0] || 'U').toUpperCase();
    });
  }

  function updateAuthUI() {
    const u = getUser();
    const loggedIn = !!u;
    const { menuLogin, menuRegister, menuLogout, menuProfile } = DOM.auth;
    if (menuLogin) menuLogin.hidden = loggedIn;
    if (menuRegister) menuRegister.hidden = loggedIn;
    if (menuLogout) menuLogout.hidden = !loggedIn;
    if (menuProfile) menuProfile.hidden = STATE.isProfilePage || !loggedIn;
    refreshAvatarFromUser(u);
  }

  async function ensureProfileRow(fullName) {
    const sb = getSB();
    if (!sb) return;
    const { data, error: gErr } = await sb.auth.getUser();
    if (gErr || !data?.user) return;
    const user = data.user;
    const { error } = await sb
      .from('profiles')
      .upsert({ id: user.id, full_name: (fullName || '').trim() || null, email: user.email ?? null }, { onConflict: 'id' });
    if (error) warn('profiles upsert failed:', error);
  }

  async function hydrateUserFromProfile() {
    const sb = getSB();
    if (!sb) return;
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return;
    const { data: row, error: rErr } = await sb.from('profiles').select('full_name, email').eq('id', user.id).single();
    if (!rErr && row) {
      setUser({ name: row.full_name || 'Guest', email: row.email || '', phone: '' });
      refreshAvatarFromUser();
      updateAuthUI();
    }
  }

  async function checkSessionAndSync() {
    const sb = getSB();
    if (!sb?.auth?.getSession) { updateAuthUI(); return; }

    let session = null;
    try {
      const res = await sb.auth.getSession();
      session = res?.data?.session ?? null;

      if (!session && getUser()) {
        const t0 = Date.now();
        while (Date.now() - t0 < 900) {
          const r2 = await sb.auth.getSession();
          session = r2?.data?.session ?? null;
          if (session) break;
          await new Promise(r => setTimeout(r, 120));
        }
      }

      if (session) {
        if (!getUser()?.name) await hydrateUserFromProfile();
      } else { }
    } catch { }

    updateAuthUI();
  }

  function setLoginLoading(isLoading) {
    const { authForm } = DOM.auth;
    const authSubmitBtn = authForm?.querySelector('button[type="submit"], .btn.primary.block');
    if (!authSubmitBtn) return;
    authSubmitBtn.disabled = !!isLoading;
    authSubmitBtn.classList.toggle('loading', !!isLoading);
    if (isLoading) {
      authSubmitBtn.dataset._label = authSubmitBtn.textContent || 'Login';
      authSubmitBtn.innerHTML = '';
      authSubmitBtn.setAttribute('aria-busy', 'true');
      authSubmitBtn.appendChild(Object.assign(document.createElement('div'), { className: 'spinner' }));
    } else {
      authSubmitBtn.innerHTML = authSubmitBtn.dataset._label || 'Login';
      authSubmitBtn.removeAttribute('aria-busy');
    }
  }

  function attachSupabaseAuthListener() {
    const sb = getSB();
    if (!sb?.auth?.onAuthStateChange) {
      setTimeout(attachSupabaseAuthListener, 100);
      return;
    }
    sb.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (STATE.authHydrating) return;
        STATE.authHydrating = true;
        await startSessionGuard?.();
        try {
          await ensureProfileRow?.();
          await hydrateUserFromProfile?.();
          await updateAuthUI?.();
        } finally { STATE.authHydrating = false; }
      }
      if (event === 'SIGNED_OUT') {
        clearUser();
        await updateAuthUI?.();
      }
    });
  }

  function wireAuthUi() {
    const A = DOM.auth;

    // Dialog reset when opened
    if (A.authDialog) {
      try {
        const mo = new MutationObserver(() => {
          if (A.authDialog.open) {
            try { setLoginLoading(false); } catch { }
            try {
              const { authPhoneInp, authPassInp } = A;
              [authPhoneInp, authPassInp].forEach(el => el && clearFieldError(el));
            } catch { }
          }
        });
        mo.observe(A.authDialog, { attributes: true, attributeFilter: ['open'] });
      } catch { }
    }

    // Menu toggle
    function toggleMenu(show) {
      const isOpen = show ?? A.userMenu.hidden;
      if (isOpen) {
        A.userMenu.hidden = false;
        A.menuBtn.setAttribute('aria-expanded', 'true');
        ([A.menuLogin, A.menuRegister, A.menuLogout].find(el => el && !el.hidden))?.focus();
      } else {
        A.userMenu.hidden = true;
        A.menuBtn.setAttribute('aria-expanded', 'false');
      }
    }
    A.menuBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(A.userMenu.hidden); });
    document.addEventListener('click', (e) => {
      const onBtn = A.menuBtn && A.menuBtn.contains(e.target);
      const inside = A.userMenu && A.userMenu.contains(e.target);
      if (!A.userMenu.hidden && !onBtn && !inside) toggleMenu(false);
    }, { passive: true });
    A.menuBtn?.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); toggleMenu(true); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

    // Actions
    const handleMenuAction = async (action) => {
      toggleMenu(false);
      switch (action) {
        case 'login': {
          A.authPhoneInp && (A.authPhoneInp.value = '');
          A.authEmailInp && (A.authEmailInp.value = '');
          A.authPassInp && (A.authPassInp.value = '');
          A.authDialog?.showModal();
          (A.authPhoneInp || A.authEmailInp)?.focus();
          break;
        }
        case 'register': {
          ['regName', 'regPhone', 'regCode', 'regPass', 'regPass2'].forEach(id => A[id] && (A[id].value = ''));
          A.registerDialog?.showModal(); A.regPhone?.focus(); break;
        }
        case 'logout': {
          const sb = getSB();
          try { await sb?.auth?.signOut?.({ scope: 'global' }); } catch { }

          wipeSupabaseLocal();
          clearUser();
          clearSessKey();

          try {
            const t0 = Date.now();
            while (Date.now() - t0 < 1000) {
              const { data: { session } = { session: null } } = await sb.auth.getSession();
              if (!session) break;
              await new Promise(r => setTimeout(r, 100));
            }
          } catch { }

          sessionStorage.setItem('justSignedOut', '1');
          location.replace(CFG.INDEX_URL + '#signedout');
          break;
        }
        case 'profile': {
          if (getUser()) {
            window.location.href = CFG.PROFILE_URL;
          } else {
            A.authDialog?.showModal();
            (A.authPhoneInp || A.authEmailInp)?.focus();
          }
          break;
        }
        case 'home': window.location.href = CFG.INDEX_URL; break;
      }
    };
    A.menuLogin?.addEventListener('click', () => handleMenuAction('login'));
    A.menuRegister?.addEventListener('click', () => handleMenuAction('register'));
    A.menuLogout?.addEventListener('click', () => handleMenuAction('logout'));
    A.menuHome?.addEventListener('click', () => handleMenuAction('home'));
    A.menuProfile?.addEventListener('click', () => handleMenuAction('profile'));

    // Close buttons + reg→login
    A.authCloseBtn?.addEventListener('click', () => A.authDialog?.close());
    A.regCloseBtn?.addEventListener('click', () => A.registerDialog?.close());
    A.regToLoginBtn?.addEventListener('click', (e) => {
      e.preventDefault(); A.registerDialog?.close(); A.authDialog?.showModal(); (A.authPhoneInp || A.authEmailInp)?.focus();
    });

    // Avatar click → profile or login
    const goToProfileOrLogin = () => getUser() ? (window.location.href = CFG.PROFILE_URL) : (A.authDialog?.showModal(), (A.authPhoneInp || A.authEmailInp)?.focus());
    A.userStatus?.addEventListener('click', goToProfileOrLogin);
    A.userStatus?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProfileOrLogin(); } });

    // Login form (same UX, compact)
    function validateLoginField(input) {
      if (!input) return true;
      const v = (input.value || '').trim();
      let ok = true, msg = '';
      if (input === A.authPhoneInp) {
        if (/\S+@\S+\.\S+/.test(v)) { ok = /^\S+@\S+\.\S+$/.test(v); msg = 'Please enter a valid email.'; }
        else { ok = isPhoneVal(v); msg = 'Please enter a valid phone number.'; }
      } else if (input === A.authPassInp) { ok = v.length > 0; msg = 'Please enter your password.'; }
      if (!ok) setFieldError(input, msg); else clearFieldError(input);
      return ok;
    }
    function validateLoginForm() {
      const fields = [A.authPhoneInp || A.authEmailInp, A.authPassInp].filter(Boolean);
      let firstBad = null;
      const okAll = fields.every(f => { const ok = validateLoginField(f); if (!ok && !firstBad) firstBad = f; return ok; });
      if (!okAll && firstBad) firstBad.focus();
      return okAll;
    }

    A.authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateLoginForm()) return;
      try {
        setLoginLoading(true);
        const raw = (A.authPhoneInp?.value || A.authEmailInp?.value || '').trim();
        const password = A.authPassInp?.value || '';
        const isEmail = /@/.test(raw);
        const phone = isEmail ? null : toE164PH(raw);
        const creds = isEmail ? { email: raw, password } : { phone, password };
        const sb = getSB();
        if (!sb?.auth?.signInWithPassword) { setFieldError(A.authPassInp, 'Auth service unavailable on this page.'); return; }
        const { data, error } = await sb.auth.signInWithPassword(creds);
        if (error) { setFieldError(A.authPassInp, error.message || 'Login failed'); return; }
        if (isEmail && !data?.user?.email_confirmed_at) { setFieldError(A.authEmailInp, 'Please verify your email before logging in.'); return; }

        // wait for session to persist (short)
        try {
          const t0 = Date.now();
          while (Date.now() - t0 < 3000) {
            const { data: s } = await sb.auth.getSession();
            if (s?.session) break;
            await new Promise(r => setTimeout(r, 120));
          }
        } catch { }

        try { await ensureProfileRow?.(); } catch { }
        try {
          const { data: { user } } = await sb.auth.getUser();
          if (user?.id) {
            const { data: row } = await sb.from('profiles').select('full_name, email').eq('id', user.id).single();
            if (row) {
              const name = row.full_name || (isEmail ? (raw.split('@')[0] || 'User') : `User ${raw.replace(/\D/g, '').slice(-4) || ''}`.trim());
              setUser({ name, email: row.email || (isEmail ? raw : ''), phone: isEmail ? '' : raw });
              refreshAvatarFromUser?.();
            }
          }
        } catch { }

        await checkSessionAndSync();
        A.authDialog?.close?.();

        const k = makeSessKey();
        setSessKey(k);
        try { await getSB().auth.updateUser({ data: { session_key: k, sk_t: Date.now() } }); } catch { }
        startSessionGuard();

      } finally { setLoginLoading(false); }
    });

    // Register mini-OTP countdown (unchanged)
    let regCountdown = null, regTimeLeft = 0;
    const startOtpCountdown = (seconds = 60) => {
      regTimeLeft = seconds; A.regSend.disabled = true; A.regSend.textContent = `${regTimeLeft}s`;
      regCountdown = setInterval(() => {
        regTimeLeft -= 1; A.regSend.textContent = `${regTimeLeft}s`;
        if (regTimeLeft <= 0) { clearInterval(regCountdown); regCountdown = null; A.regSend.disabled = false; A.regSend.textContent = 'Send'; }
      }, 1000);
    };
    A.regSend?.addEventListener('click', () => {
      const raw = (A.regPhone?.value || '').trim();
      if (!isPhoneVal(raw)) { setFieldError(A.regPhone, 'Enter a valid phone number before sending a code.'); A.regPhone?.focus(); return; }
      clearFieldError(A.regPhone); startOtpCountdown(60);
    });

    function validateRegisterField(input) {
      if (!input) return true;
      const v = (input.value || '').trim();
      let ok = true, msg = '';
      if (input === A.regName) ok = v.length >= 2, msg = 'Please enter your name.';
      else if (input === A.regPhone) ok = isPhoneVal(v), msg = 'Please enter a valid phone number.';
      else if (input === A.regCode) ok = v.length > 0, msg = 'Please enter the verification code.';
      else if (input === A.regPass) ok = v.length >= 4, msg = 'Password must be at least 4 characters.';
      else if (input === A.regPass2) {
        ok = v.length >= 4 && v === (A.regPass?.value || '');
        msg = v.length < 4 ? 'Password must be at least 4 characters.' : 'Passwords do not match.';
      }
      if (!ok) setFieldError(input, msg); else clearFieldError(input);
      return ok;
    }
    [A.regName, A.regPhone, A.regCode, A.regPass, A.regPass2].forEach(el => {
      el?.addEventListener('input', () => { validateRegisterField(el); if (el === A.regPass || el === A.regPass2) A.regPass2 && validateRegisterField(A.regPass2); });
      el?.addEventListener('blur', () => validateRegisterField(el));
    });

    A.regForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = [A.regName, A.regPhone, A.regCode, A.regPass, A.regPass2].filter(Boolean);
      let firstBad = null;
      const okAll = fields.every(f => { const ok = validateRegisterField(f); if (!ok && !firstBad) firstBad = f; return ok; });
      if (!okAll && firstBad) { firstBad.focus(); return; }
      const name = (A.regName?.value || 'User').trim();
      const phone = (A.regPhone?.value || '').trim();
      setUser({ name, phone }); updateAuthUI(); A.registerDialog?.close();
    });

    // Initial auth hydration
    onReady(async () => {
      try {
        const sb = getSB();
        const { data: { session } = { session: null } } = sb?.auth?.getSession ? await sb.auth.getSession() : { data: { session: null } };
        if (session) { await hydrateUserFromProfile?.(); await updateAuthUI?.(); }
      } catch { }
    });

    attachSupabaseAuthListener();
    if (!getSB()?.auth) warn('[Auth] Supabase client missing or not initialized.');
  }

  /* ──────────────────────────────────────────────────────────────────────────
     NAV / SECTIONS (lazy-render rooms)
     ────────────────────────────────────────────────────────────────────────── */
  function showSection(section) {
    const { hero, home, rooms, faqs, siteFooter } = DOM.nav;
    if (!hero || !home || !rooms || !faqs) return;
    if (!['home', 'rooms', 'faqs'].includes(section)) return;

    if (section !== 'rooms') closePanel();

    hero.style.display = section === 'home' ? 'block' : 'none';
    home.style.display = section === 'home' ? 'block' : 'none';
    rooms.style.display = section === 'rooms' ? 'block' : 'none';
    faqs.style.display = section === 'faqs' ? 'block' : 'none';
    if (siteFooter) siteFooter.style.display = section === 'home' ? 'block' : 'none';

    toggleHomeOnly(section === 'home');

    // Lazy-render rooms the first time Rooms is shown
    if (section === 'rooms' && !STATE.roomsRendered) {
      renderRooms(roomsData); // first draw
      STATE.roomsRendered = true;
    }
  }
  function setActiveButton(btn) { DOM.nav.navButtons.forEach(b => b.classList.remove('active')); btn?.classList.add('active'); }
  function toggleHomeOnly(visible) {
    DOM.nav.homeOnlyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = visible ? '' : 'none'; el.setAttribute('aria-hidden', visible ? 'false' : 'true'); }
    });
  }

  const UNDERLINE_SCALE = 0.8;
  function wireNav() {
    const N = DOM.nav;
    const HAS_VT = typeof document.startViewTransition === 'function';
    document.documentElement.classList.toggle('vt', HAS_VT);

    const scrollToTabs = () => {
      const headerH = N.topNav ? N.topNav.getBoundingClientRect().height : 0;
      const top = (N.searchBar?.getBoundingClientRect().top || 0) + window.scrollY - headerH - 6;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    // Track current section + order so we can pick slide direction
    STATE.currentSection = STATE.currentSection || 'home';
    const ORDER = ['home', 'rooms', 'faqs'];

    const navTo = (to, btn) => {
      if (!ORDER.includes(to)) return;

      const from = STATE.currentSection;
      if (from === to) { setActiveButton(btn); return; }

      if (N.topNav) N.topNav.style.setProperty('view-transition-name', 'none');

      const main = N.main;
      const fromIdx = ORDER.indexOf(from);
      const toIdx = ORDER.indexOf(to);
      const forward = toIdx > fromIdx;

      const outClass = forward ? 'exit-left' : 'exit-right';
      const inClass = forward ? 'enter-from-right' : 'enter-from-left';

      main.classList.add(outClass);

      const finishOut = () => {
        main.removeEventListener('transitionend', finishOut);
        showSection(to);
        setActiveButton(btn);
        N.searchBar?.dispatchEvent(new CustomEvent('tabchange', { detail: { from, to } }));
        main.classList.remove(outClass);
        main.classList.add(inClass);
        void main.offsetWidth;
        main.classList.remove(inClass);
        STATE.currentSection = to;
        scrollToTabs();
      };

      if (getComputedStyle(main).transitionDuration === '0s') {
        showSection(to);
        setActiveButton(btn);
        STATE.currentSection = to;
        N.searchBar?.dispatchEvent(new CustomEvent('tabchange', { detail: { from, to } }));
      } else {
        main.addEventListener('transitionend', finishOut, { once: true });
      }
    };

    // Tabs scaffold once + underline animation
    (function setupTabsUI() {
      if (!N.searchBar) return;

      // Wrap buttons in .tabs-wrap (idempotent)
      let wrap = N.searchBar.querySelector('.tabs-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'tabs-wrap';
        // only direct child buttons
        const btns = Array.from(N.searchBar.querySelectorAll(':scope > button'));
        btns.forEach(b => wrap.appendChild(b));
        N.searchBar.appendChild(wrap);
      }

      // Remove old pill if it exists
      wrap.querySelector('.tab-indicator')?.remove();

      // Create the moving underline (idempotent)
      let ul = wrap.querySelector('.tab-underline');
      if (!ul) {
        ul = document.createElement('span');
        ul.className = 'tab-underline';
        wrap.appendChild(ul);
      }

      const activeBtn = () => wrap.querySelector('button.active') || wrap.querySelector('button');

      const moveUnderline = () => {
  const a = activeBtn();
  if (!a || !ul) return;
  const rb = a.getBoundingClientRect();
  const rw = wrap.getBoundingClientRect();

  const width = Math.max(2, rb.width * UNDERLINE_SCALE);
  const x = (rb.left - rw.left) + (rb.width - width) / 2;

  ul.style.width = `${width}px`;
  ul.style.transform = `translateX(${x}px)`;
};

      const bump = (dir /* 'forward'|'backward' */) => {
        wrap.animate(
          [
            { transform: 'translateX(0)' },
            { transform: `translateX(${dir === 'forward' ? -6 : 6}px)` },
            { transform: 'translateX(0)' }
          ],
          { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' }
        );
      };

      // Reposition on section changes
      N.searchBar.addEventListener('tabchange', (e) => {
        moveUnderline();
        const { from, to } = e.detail || {};
        if (from && to) {
          const dir = ORDER.indexOf(to) > ORDER.indexOf(from) ? 'forward' : 'backward';
          bump(dir);
        }
      });

      // Keep in sync on layout changes / horizontal scroll of the tab row
      window.addEventListener('resize', moveUnderline, { passive: true });
      N.searchBar.addEventListener('scroll', moveUnderline, { passive: true });
      window.addEventListener('load', moveUnderline, { once: true });

      // Font swaps / button width changes — light RO
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(moveUnderline);
        ro.observe(wrap);
        wrap.querySelectorAll('button').forEach(b => ro.observe(b));
      }

      // First paint
      requestAnimationFrame(moveUnderline);
    })();

    // Logo → SPA Home
    N.logoBtn?.addEventListener('click', (e) => {
      if (STATE.isProfilePage || !N.hero || !N.home || !N.rooms || !N.faqs) return;
      e.preventDefault();
      showSection('home'); setActiveButton(N.homeBtn); toggleHomeOnly(true);
      STATE.currentSection = 'home';
      N.searchBar?.dispatchEvent(new CustomEvent('tabchange', { detail: { from: 'home', to: 'home' } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Button wiring
    N.homeBtn?.addEventListener('click', () => navTo('home', N.homeBtn));
    N.roomBtn?.addEventListener('click', () => navTo('rooms', N.roomBtn));
    N.faqsBtn?.addEventListener('click', () => navTo('faqs', N.faqsBtn));

    // Initial
    showSection('home'); setActiveButton(N.homeBtn); toggleHomeOnly(true); STATE.currentSection = 'home';
    N.searchBar?.dispatchEvent(new CustomEvent('tabchange', { detail: { from: 'home', to: 'home' } }));

    // Auto-hide tabs on scroll
    const tabs = N.searchBar, header = N.topNav;
    if (header && tabs) {
      const setOffset = () => document.documentElement.style.setProperty('--sticky-offset', `${header.getBoundingClientRect().height}px`);
      const onScroll = rafThrottle(() => {
        if (document.body.classList.contains('details-open')) return;
        const y = window.scrollY || 0;
        const dy = onScroll._lastY === undefined ? 0 : y - onScroll._lastY;
        if (y < 10) tabs.classList.remove('tab-hidden');
        else if (dy > CFG.SCROLL_TOL_DOWN) tabs.classList.add('tab-hidden');
        else if (-dy > CFG.SCROLL_TOL_UP) tabs.classList.remove('tab-hidden');
        onScroll._lastY = y;
      });

      setOffset();
      window.addEventListener('resize', rafThrottle(setOffset), { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', (e) => { if (e.deltaY < -8) tabs.classList.remove('tab-hidden'); }, { passive: true });
    }

    // --- Swipe-to-switch sections (left/right) ---
    (function setupSwipeNav() {
      const el = N.main; if (!el) return;
      const getIdx = (id) => Math.max(0, ORDER.indexOf(id));
      let pointerId = null, startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, t0 = 0;
      const H_THRESHOLD = 90, V_CANCEL = 14, VEL_TRIGGER = 0.45;
      const clearInline = () => { el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; };
      const snapBack = () => { el.style.transition = 'transform .28s ease, opacity .28s ease'; el.style.transform = 'translateX(0)'; el.style.opacity = '1'; setTimeout(clearInline, 300); };
      const onPointerDown = (e) => {
        if (document.body.classList.contains('details-open')) return; if (e.pointerType === 'mouse' && e.buttons !== 1) return;
        pointerId = e.pointerId; startX = e.clientX; startY = e.clientY; dx = dy = 0; t0 = performance.now(); dragging = false;
        el.classList.remove('exit-left', 'exit-right', 'enter-from-left', 'enter-from-right'); el.classList.add('dragging'); el.setPointerCapture(pointerId);
      };
      const onPointerMove = (e) => {
        if (e.pointerId !== pointerId) return; dx = e.clientX - startX; dy = e.clientY - startY;
        if (!dragging) {
          if (Math.abs(dy) > V_CANCEL && Math.abs(dy) > Math.abs(dx)) { onPointerUp(e); return; }
          if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return; dragging = true;
        }
        e.preventDefault(); const x = dx * 0.9; el.style.transform = `translateX(${x}px)`; el.style.opacity = String(Math.max(0.6, 1 - Math.abs(x) / 300));
      };
      const onPointerUp = (e) => {
        if (e.pointerId !== pointerId) return; el.releasePointerCapture(pointerId); el.classList.remove('dragging');
        if (!dragging) { clearInline(); pointerId = null; return; }
        const dt = Math.max(1, performance.now() - t0); const v = dx / dt; const passed = Math.abs(dx) > H_THRESHOLD || Math.abs(v) > VEL_TRIGGER;
        if (passed) {
          const swipeLeft = dx < 0; const cur = STATE.currentSection || 'home'; const i = getIdx(cur);
          const target = ORDER[Math.min(ORDER.length - 1, Math.max(0, i + (swipeLeft ? 1 : -1)))];
          clearInline(); if (target && target !== cur) { const btn = (target === 'home' ? N.homeBtn : target === 'rooms' ? N.roomBtn : N.faqsBtn); navTo(target, btn); } else { snapBack(); }
        }
        else { snapBack(); }
        dragging = false; pointerId = null;
      };
      el.addEventListener('pointerdown', onPointerDown, { passive: true });
      el.addEventListener('pointermove', onPointerMove, { passive: false });
      el.addEventListener('pointerup', onPointerUp, { passive: true });
      el.addEventListener('pointercancel', onPointerUp, { passive: true });
    })();
  }

  function wireHeaderAutoHide() {
  onReady(() => {
    const header = DOM.nav.topNav;
    if (!header) return;

    let navH = header.getBoundingClientRect().height;
    let shown = true;

    const setOffset = () =>
      document.documentElement.style.setProperty('--sticky-offset', `${navH}px`);

    // Create FAB once
    let toTop = document.getElementById('toTopBtn');
    if (!toTop) {
      toTop = document.createElement('button');
      toTop.id = 'toTopBtn';
      toTop.type = 'button';
      toTop.setAttribute('aria-label', 'Back to top');
      toTop.setAttribute('aria-hidden', 'true');
      toTop.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7.5l-6 6h4v4h4v-4h4z" fill="currentColor"/>
        </svg>`;
      document.body.appendChild(toTop);

      toTop.addEventListener('click', () => {
        const sec = STATE.currentSection || 'home';
        const { topNav, rooms, faqs } = DOM.nav;
        const headerH = topNav ? topNav.getBoundingClientRect().height : 0;
        const targetEl = sec === 'rooms' ? rooms : sec === 'faqs' ? faqs : document.body;
        const rectTop = targetEl?.getBoundingClientRect?.().top ?? 0;
        const top = Math.max(0, rectTop + window.scrollY - headerH - 6);
        window.scrollTo({ top, behavior: 'smooth' });
      });
    }

    const fabShow = () => { toTop?.classList.add('is-visible'); toTop?.setAttribute('aria-hidden','false'); };
    const fabHide = () => { toTop?.classList.remove('is-visible'); toTop?.setAttribute('aria-hidden','true'); };

    const show = () => {
      if (shown) return;
      header.classList.remove('nav-hidden');
      document.body.classList.add('header-shown');
      document.body.classList.remove('header-hidden');
      setOffset();                    // keep sticky offset stable
      shown = true;
      fabHide();                      // hide FAB when header shown
    };

    const hide = () => {
      if (!shown) return;
      header.classList.add('nav-hidden');
      document.body.classList.add('header-hidden');
      document.body.classList.remove('header-shown');
      // Do NOT zero --sticky-offset here (prevents twitch)
      shown = false;
      fabShow();                      // show FAB when header hidden
    };

    // Initial state
    setOffset();
    document.body.classList.add('header-shown');
    fabHide();

    const handleScroll = rafThrottle(() => {
      const y = window.scrollY || 0;
      const dy = handleScroll._lastY === undefined ? 0 : y - handleScroll._lastY;
      if (y <= navH) show();
      else if (dy > 10) hide();
      else if (-dy > 10) show();
      handleScroll._lastY = y;
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', (e) => {
      if (e.deltaY < -8) show();
      else if (e.deltaY > 8) hide();
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      wireHeaderAutoHide._touchY = e.touches?.[0]?.clientY ?? 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      const start = wireHeaderAutoHide._touchY ?? 0;
      const y = e.touches?.[0]?.clientY ?? start;
      const dy = y - start;
      if (dy > 12) show();
      else if (dy < -12) hide();
    }, { passive: true });

    window.addEventListener('resize', rafThrottle(() => {
      navH = header.getBoundingClientRect().height;
      if (shown) setOffset();
    }), { passive: true });
  });
}

  /* ──────────────────────────────────────────────────────────────────────────
     ROOMS LIST (memoized HTML + O(1) lookup)
     ────────────────────────────────────────────────────────────────────────── */
  const ROOMS_BY_ID = new Map();
  const ROOM_HTML = new Map();

  function roomCardHTML(room) {
    const statusClass = isAvailable(room) ? 'available' : 'occupied';
    const statusLabel = isAvailable(room) ? 'Available' : 'Occupied';
    const cover = (room.images && room.images[0]) ? getCoverFromFirstMedia(room.images[0]) : 'placeholder.jpg';
    const occText = `${room.occupancy} / ${room.capacity} 👥`;
    const typeLabel = room.type === 'dorm' ? 'Dorm Type' : 'Studio Type';
    return `
      <div class="room-card" role="button" tabindex="0" aria-label="${room.name} details"
           data-id="${room.id}" data-type="${room.type}" data-name="${room.name}"
           data-price="${room.price}" data-occupancy="${room.occupancy}" data-capacity="${room.capacity}"
           data-description="${room.description || ''}" data-advance="${room.advance || ''}">
        <img src="${cover}" alt="${room.type} image" loading="lazy" decoding="async">
        <div class="room-card-content">
          <p><span class="highlight">${typeLabel}</span> &nbsp;&nbsp; ${room.name}</p>
          <p><span class="highlight">Monthly</span> &nbsp;&nbsp; ₱${room.price.toLocaleString()}</p>
          <p><span class="highlight">Occupancy</span> &nbsp;&nbsp; ${occText}</p>
          <p class="status ${statusClass}">${statusLabel}</p>
        </div>
      </div>`;
  }
  function getRoomHTML(room) {
    if (ROOM_HTML.has(room.id)) return ROOM_HTML.get(room.id);
    const html = roomCardHTML(room);
    ROOM_HTML.set(room.id, html);
    return html;
  }

  function renderRooms(list) {
    const { roomListEl } = DOM.roomsUi;
    if (!roomListEl) return;
    // Build in one shot (fast path)
    roomListEl.innerHTML = list.map(getRoomHTML).join('');
    attachRoomCardClicks(); // delegate once
  }

  function filterRooms() {
    const { unitTypeSelect, availabilityToggle } = DOM.roomsUi;
    const nextType = unitTypeSelect?.value || 'all';
    const nextAvail = !!availabilityToggle?.checked;

    // No-op if unchanged
    if (STATE.lastFilter.type === nextType && STATE.lastFilter.avail === nextAvail) return;
    STATE.lastFilter = { type: nextType, avail: nextAvail };

    const filtered = roomsData.filter(room => {
      const matchesType = nextType === 'all' || room.type === nextType;
      const matchesAvail = !nextAvail || isAvailable(room);
      return matchesType && matchesAvail;
    });
    renderRooms(filtered);
  }

  function attachRoomCardClicks() {
    if (STATE.clicksBound) return;
    const { roomListEl } = DOM.roomsUi;
    if (!roomListEl) return;
    STATE.clicksBound = true;

    // Delegated: 1 listener only
    roomListEl.addEventListener('click', (ev) => {
      const card = ev.target.closest('.room-card');
      if (!card) return;

      qsa('.room-card.is-active').forEach(c => c.classList.remove('is-active'));
      STATE.activeCard = card;
      STATE.activeCard.classList.add('is-active');

      const id = card.dataset.id;
      const room = ROOMS_BY_ID.get(id) || {
        id,
        type: card.dataset.type,
        name: card.dataset.name,
        price: Number(card.dataset.price),
        occupancy: Number(card.dataset.occupancy),
        capacity: Number(card.dataset.capacity),
        description: card.dataset.description,
        advance: card.dataset.advance,
        images: (card.dataset.images || '').split(',').filter(Boolean)
      };
      openPanel(room, card);
    });

    roomListEl.addEventListener('keydown', (e) => {
      const card = e.target.closest('.room-card');
      if (!card) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DETAILS PANEL + MEDIA (delegated thumbs, rAF resize)
     ────────────────────────────────────────────────────────────────────────── */
  function destroyPano() {
    if (!STATE.panoInstance) return;
    try { STATE.panoInstance.destroy(); } catch { }
    STATE.panoInstance = null;
  }

  function showImage(src) {
    destroyPano();
    const { panoBox, heroImg } = DOM.panel;
    panoBox?.classList.remove('is-on');
    panoBox?.setAttribute('aria-hidden', 'true');
    if (heroImg) { heroImg.style.display = 'block'; heroImg.src = src; }
  }

  async function showPano(src) {
    await ensurePannellumLoaded();
    if (typeof pannellum === 'undefined') { warn('Pannellum not available; showing still image.'); return showImage(src); }
    const { panoBox, heroImg } = DOM.panel;
    const url = absUrl(src);
    if (heroImg) heroImg.style.display = 'none';
    panoBox?.classList.add('is-on');
    panoBox?.setAttribute('aria-hidden', 'false');
    destroyPano();
    STATE.panoInstance = pannellum.viewer('panoViewer', {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      showZoomCtrl: true,
      hfov: 100,
      crossOrigin: 'anonymous'
    });
  }

  async function showTour(config) {
    await ensurePannellumLoaded();
    if (typeof pannellum === 'undefined') {
      warn('Pannellum not available; showing poster if any.');
      const poster = getTourPosterFromConfig(config);
      return poster ? showImage(poster) : showImage(CFG.FALLBACK_MEDIA);
    }
    const { panoBox, heroImg } = DOM.panel;
    const cfg = { ...config, basePath: new URL('.', document.baseURI).href, crossOrigin: 'anonymous' };
    if (heroImg) heroImg.style.display = 'none';
    panoBox?.classList.add('is-on');
    panoBox?.setAttribute('aria-hidden', 'false');
    destroyPano();
    STATE.panoInstance = pannellum.viewer('panoViewer', cfg);
  }

  const onResizePanel = rafThrottle(() => { recalcSplitVars(); syncSplitHeights(); });

  function recalcSplitVars() {
    const { splitWrap } = DOM.roomsUi;
    const { topNav } = DOM.nav;
    if (!splitWrap) return;
    // read once per frame
    const headerH = topNav ? Math.round(topNav.getBoundingClientRect().height) : 0;
    splitWrap.style.setProperty('--sticky-offset', `${headerH}px`);
    const filtersEl = splitWrap.querySelector('.room-filters');
    if (filtersEl) {
      const h = Math.round(filtersEl.getBoundingClientRect().height);
      splitWrap.style.setProperty('--filters-h', `${h}px`);
    }
  }

  function syncSplitHeights() {
    const { splitWrap } = DOM.roomsUi;
    const { panel } = DOM.panel;
    if (!splitWrap || !panel) return;
    const cs = getComputedStyle(splitWrap);
    const sticky = parseInt(cs.getPropertyValue('--sticky-offset')) || 0;
    const filtersH = parseInt(cs.getPropertyValue('--filters-h')) || 0;

    const panelRect = panel.getBoundingClientRect();
    const panelVisible = Math.min(window.innerHeight - sticky, Math.round(panelRect.height));
    const targetH = Math.max(0, panelVisible - filtersH);

    const listEl = splitWrap.querySelector('.room-list');
    if (listEl) {
      listEl.style.height = targetH + 'px';
      listEl.style.overflowY = 'auto';
    }
  }

  function exitSplitLayout() {
    const { splitWrap } = DOM.roomsUi;
    const { searchBar } = DOM.nav;
    DOM.misc.body.classList.remove('details-open');

    window.removeEventListener('resize', onResizePanel);

    try { STATE.panelResizeObs?.disconnect(); } catch { }
    try { STATE.filtersObs?.disconnect(); } catch { }
    STATE.panelResizeObs = null;
    STATE.filtersObs = null;

    if (splitWrap) {
      splitWrap.classList.remove('is-split');
      splitWrap.style.removeProperty('--sticky-offset');
      splitWrap.style.removeProperty('--filters-h');
    }
    if (searchBar) searchBar.style.display = '';

    const listEl = qs('.filters-and-rooms .room-list');
    if (listEl) {
      listEl.style.removeProperty('height');
      listEl.style.removeProperty('overflow');
      listEl.style.removeProperty('overflow-y');
      void listEl.offsetHeight; // reflow
    }
  }

  function openPanel(room, clickSourceEl) {
    const P = DOM.panel;
    const R = DOM.roomsUi;
    if (!P.panel) return;

    // Clear old observers/listeners
    window.removeEventListener('resize', onResizePanel);
    try { STATE.panelResizeObs?.disconnect(); } catch { }
    try { STATE.filtersObs?.disconnect(); } catch { }
    STATE.panelResizeObs = null; STATE.filtersObs = null;

    // Title + info
    if (P.panelTitle) P.panelTitle.textContent = room.name;

    const infoCard = qs('.room-info', P.panel) || P.panel;
    const typeLabel = room.type === 'dorm' ? 'Dorm' : 'Studio';
    const occ = Number(room.occupancy) || 0;
    const cap = Math.max(1, Number(room.capacity) || 1);
    const occPct = Math.max(0, Math.min(100, Math.round((occ / cap) * 100)));

    let head = qs('.card-head', infoCard);
    if (!head) {
      head = document.createElement('div');
      head.className = 'card-head';
      const h = qs('.unit-title, h3, h2, h4', infoCard) || (() => { const _h = document.createElement('h3'); _h.className = 'unit-title'; _h.textContent = 'Unit Details'; return _h; })();
      head.appendChild(h); infoCard.prepend(head);
    }
    let pill = qs('.type-pill', head);
    if (!pill) { pill = document.createElement('span'); pill.className = 'type-pill'; head.appendChild(pill); }
    pill.textContent = typeLabel;

    if (P.kv) {
      P.kv.innerHTML = `
        <div class="kv-row kv-price">
          <dt>Price</dt>
          <dd><span class="muted">Monthly</span><span class="price">₱${room.price.toLocaleString()}</span></dd>
        </div>
        <div class="kv-row kv-occ-row">
          <dt>Occupancy</dt>
          <dd class="kv-occ">
            <div class="occ-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${occ}">
              <span style="width:${occPct}%"></span>
            </div>
            <span class="occ-numbers">${occ} / ${cap}</span>
          </dd>
        </div>`;
    }
    if (P.descEl) P.descEl.innerHTML = `<strong class="field-title">Description</strong><div class="field-body">${room.description || '—'}</div>`;
    if (P.advEl) P.advEl.innerHTML = `<strong class="field-title">Advance details</strong><div class="field-body"><span class="dot"></span>${room.advance || '—'}</div>`;

    // CTA
    const remaining = Math.max(0, cap - occ);
    const isFull = remaining === 0;
    let btn = qs('.btn-inquire', infoCard);
    let cta = qs('.cta-row', infoCard);
    if (!cta) { cta = document.createElement('div'); cta.className = 'cta-row'; btn?.after(cta); }
    if (btn && btn.parentElement !== cta) cta.prepend(btn);
    if (btn) {
      btn.disabled = isFull; btn.setAttribute('aria-disabled', String(isFull));
      btn.classList.toggle('is-full', isFull);
      btn.textContent = isFull ? 'Full' : 'Inquire';
      btn.title = isFull ? 'This unit is fully occupied' : 'Send an inquiry';
      btn.onclick = (e) => { e.preventDefault(); if (!btn.disabled) openInquire(room); };
    }
    P.kv?.querySelector('.occ-bar')?.classList.toggle('is-full', isFull);

    // Media (build once; delegate clicks)
    const mediaList = (room.images?.length ? room.images : [CFG.FALLBACK_MEDIA]).map(normalizeMedia);
    const displayMedia = async (item) => {
      if (item.kind === 'tour') await showTour(item.tour);
      else if (item.kind === 'pano') await showPano(item.src);
      else showImage(item.src);
    };

    // First media
    displayMedia(mediaList[0] || { kind: 'image', src: CFG.FALLBACK_MEDIA });

    // Thumbs (one delegated listener)
    if (P.thumbsNav) {
      P.thumbsNav.innerHTML = mediaList.map((m, i) => {
        const thumbSrc = (m.kind === 'tour') ? (m.poster || CFG.FALLBACK_MEDIA) : m.src;
        const label = (m.kind === 'tour') ? 'Tour' : (m.kind === 'pano') ? '360°' : '';
        return `
          <button class="thumb ${i === 0 ? 'is-active' : ''}" data-idx="${i}" aria-label="Media ${i + 1}${label ? ' - ' + label : ''}">
            <img src="${thumbSrc}" alt="" loading="lazy" decoding="async">
            ${label ? `<span class="tag-360">${label}</span>` : ''}
          </button>`;
      }).join('');

      // Delegate
      const onThumbClick = async (e) => {
        const btnEl = e.target.closest('.thumb');
        if (!btnEl) return;
        const idx = +btnEl.dataset.idx;
        const item = mediaList[idx];
        await displayMedia(item);
        P.thumbsNav.querySelectorAll('.thumb').forEach(b => b.classList.remove('is-active'));
        btnEl.classList.add('is-active');
      };
      // Remove previous (if any) to avoid stacking
      P.thumbsNav.replaceWith(P.thumbsNav.cloneNode(true));
      DOM.panel.thumbsNav = qs('.thumbs', P.panel);
      DOM.panel.thumbsNav?.addEventListener('click', onThumbClick);
    }

    // Grow animation origin
    if (clickSourceEl) {
      const r = clickSourceEl.getBoundingClientRect();
      const root = document.documentElement.getBoundingClientRect();
      const x = ((r.left + r.width / 2) - root.left) / root.width * 100;
      const y = ((r.top + r.height / 2) - root.top) / root.height * 100;
      P.panel.style.setProperty('--grow-x', x + '%');
      P.panel.style.setProperty('--grow-y', y + '%');
    }

    // Enter split layout
    P.panel.classList.add('is-open');
    P.panel.setAttribute('aria-hidden', 'false');
    DOM.misc.body.classList.add('details-open');
    R.splitWrap?.classList.add('is-split');
    if (DOM.nav.searchBar) DOM.nav.searchBar.style.display = 'none';

    // Measure/layout only once per frame
    recalcSplitVars();
    syncSplitHeights();

    window.addEventListener('resize', onResizePanel, { passive: true });

    if ('ResizeObserver' in window) {
      try { STATE.panelResizeObs = new ResizeObserver(rafThrottle(syncSplitHeights)); STATE.panelResizeObs.observe(P.panel); } catch { }
      try {
        const filtersEl = R?.splitWrap?.querySelector('.room-filters');
        if (filtersEl) { STATE.filtersObs = new ResizeObserver(rafThrottle(recalcSplitVars)); STATE.filtersObs.observe(filtersEl); }
      } catch { }
    }

    // Focus and orient
    DOM.panel.closeBtn?.focus();
    P.panel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  function closePanel() {
    const P = DOM.panel;
    if (!P.panel || !P.panel.classList.contains('is-open')) { exitSplitLayout(); return; }
    P.panel.classList.remove('is-open');
    P.panel.setAttribute('aria-hidden', 'true');
    P.panel.style.removeProperty('--grow-x');
    P.panel.style.removeProperty('--grow-y');

    destroyPano();
    if (P.panoBox) { P.panoBox.classList.remove('is-on'); P.panoBox.setAttribute('aria-hidden', 'true'); }
    if (P.heroImg) P.heroImg.style.display = 'block';

    const toFocus = STATE.activeCard;
    STATE.activeCard?.classList.remove('is-active');
    STATE.activeCard = null;

    exitSplitLayout();
    toFocus?.focus?.();
    qs('#rooms')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  function wirePanel() {
    DOM.panel.closeBtn?.addEventListener('click', closePanel);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     INQUIRE (same UX)
     ────────────────────────────────────────────────────────────────────────── */
  function openInquire(room) {
    const A = DOM.auth;
    const u = getUser();
    if (!u) { A.authDialog?.showModal(); (A.authPhoneInp || A.authEmailInp)?.focus(); return; }
    const inqEmail = qs('#inqEmail'), inqName = qs('#inqName'), inqPhone = qs('#inqPhone'), inqDate = qs('#inqDate'), inqRoomId = qs('#inqRoomId'), inquireDialog = qs('#inquireDialog');
    if (inqDate) inqDate.min = new Date().toISOString().slice(0, 10);
    if (inqEmail) inqEmail.value = u.email || '';
    if (inqName) inqName.value = u.name || '';
    if (inqPhone) inqPhone.value = u.phone || '';
    if (inqDate) inqDate.value = '';
    if (inqRoomId) inqRoomId.value = room.id;
    [inqPhone, inqEmail, inqName, inqDate].forEach(clearFieldError);
    inquireDialog?.showModal(); inqPhone?.focus();
  }

  function wireInquire() {
    const inquireDialog = qs('#inquireDialog');
    const inquireCloseBtn = qs('#inquireDialog .dialog-close');
    const inquireForm = qs('#inquireForm');
    const inqPhone = qs('#inqPhone'), inqEmail = qs('#inqEmail'), inqName = qs('#inqName'), inqDate = qs('#inqDate'), inqRoomId = qs('#inqRoomId');

    inquireCloseBtn?.addEventListener('click', () => inquireDialog?.close());

    function validateField(input) {
      const v = (input.value || '').trim();
      let ok = true, msg = '';
      switch (input.id) {
        case 'inqPhone': ok = isPhoneVal(v), msg = 'Please enter your contact number.'; break;
        case 'inqEmail': ok = /^\S+@\S+\.\S+$/.test(v), msg = 'Please enter a valid email address.'; break;
        case 'inqName': ok = v.length >= 2, msg = 'Please enter your name.'; break;
        case 'inqDate': {
          ok = !!v; msg = 'Please pick a date.';
          if (ok && inqDate.min) ok = v >= inqDate.min;
          if (!ok && v) msg = 'Please pick a valid future date.';
          break;
        }
      }
      if (!ok) setFieldError(input, msg); else clearFieldError(input);
      return ok;
    }
    const validateForm = () => {
      const fields = [inqPhone, inqEmail, inqName, inqDate].filter(Boolean);
      let firstBad = null;
      const allOk = fields.every((el) => { const ok = validateField(el); if (!ok && !firstBad) firstBad = el; return ok; });
      if (!allOk && firstBad) firstBad.focus();
      return allOk;
    };

    [inqPhone, inqEmail, inqName, inqDate].forEach((el) => {
      el?.addEventListener('input', () => validateField(el));
      el?.addEventListener('blur', () => validateField(el));
      el?.addEventListener('change', () => validateField(el));
    });

    inquireForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm()) return;
      const payload = {
        roomId: inqRoomId.value,
        phone: inqPhone.value.trim(),
        email: inqEmail.value.trim(),
        name: inqName.value.trim(),
        date: inqDate.value
      };
      log('Inquiry submitted:', payload);
      inquireDialog.close();
      alert('Request sent! We’ll be in touch shortly.');
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     EFFECTS / REVEAL (one-time IOs)
     ────────────────────────────────────────────────────────────────────────── */
  function wireReveals() {
    onReady(() => {
      const toReveal = qsa('#building-info .reveal');
      if (toReveal.length) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); } });
        }, { threshold: 0.15 });
        toReveal.forEach(el => io.observe(el));
      }

      const items = qsa('.reveal, .reveal-up, .reveal-left, .reveal-right');
      if (!items.length) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { items.forEach(el => el.classList.add('is-visible')); return; }
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const idx = Number(el.getAttribute('data-rv-idx') || 0);
          el.style.transitionDelay = `${Math.min(idx * 0.06, 0.36)}s`;
          el.classList.add('is-visible');
          io2.unobserve(el);
        });
      }, { threshold: 0.15 });
      items.forEach((el, i) => { el.setAttribute('data-rv-idx', i % 8); io2.observe(el); });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     HERO VIDEO (unchanged UX; small tidy)
     ────────────────────────────────────────────────────────────────────────── */
  function wireHeroVideo() {
    onReady(() => {
      const v = DOM.misc.heroVideo;
      const heroBtn = DOM.misc.heroMuteBtn;
      const headerBtn = DOM.misc.headerMuteBtn;
      if (!v) return;

      v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.controls = false;

      const tryPlay = () => { const p = v.play?.(); if (p && typeof p.catch === 'function') p.catch(() => { }); };
      const syncButtons = () => { const pressed = v.muted ? 'true' : 'false'; heroBtn?.setAttribute('aria-pressed', pressed); headerBtn?.setAttribute('aria-pressed', pressed); };
      const toggleMute = () => { v.muted = !v.muted; syncButtons(); tryPlay(); };

      heroBtn?.addEventListener('click', toggleMute);
      headerBtn?.addEventListener('click', toggleMute);

      v.addEventListener('volumechange', syncButtons);
      v.addEventListener('pause', tryPlay);
      v.addEventListener('loadeddata', tryPlay);
      v.addEventListener('canplay', tryPlay);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });

      tryPlay();
      ['click', 'touchstart', 'scroll'].forEach(evt => window.addEventListener(evt, tryPlay, { once: true, passive: true }));
      syncButtons();

      // Move header mute beside right icons once
      const icons = DOM.misc.navIcons;
      if (headerBtn && icons && !icons.contains(headerBtn)) icons.appendChild(headerBtn);
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DEMO DATA (same)
     ────────────────────────────────────────────────────────────────────────── */
  const roomsData = [
    {
      id: 'R001',
      type: 'dorm',
      name: 'Room 001',
      price: 4000,
      occupancy: 2,
      capacity: 4,
      description: 'Male Unit',
      advance: 'No animal allowed',
      images: [
        {
          kind: 'tour', poster: 'pngs/TourA.png',
          tour: {
            default: { firstScene: 'hall', autoLoad: true, showZoomCtrl: true, hfov: 100 },
            scenes: {
              hall: {
                title: 'Hall', panorama: 'pngs/TourA.png',
                hotSpots: [
                  { pitch: 0, yaw: 290, type: 'scene', text: 'Go to Sala', sceneId: 'sala' },
                  { pitch: 0, yaw: 95, type: 'scene', text: 'Go to Kitchen', sceneId: 'kitchen' }
                ]
              },
              sala: { title: 'Sala', panorama: 'pngs/TourAC.png', hotSpots: [{ pitch: 2, yaw: 85, type: 'scene', text: 'Back to Hall', sceneId: 'hall' }] },
              kitchen: { title: 'Kitchen', panorama: 'pngs/TourAB.png', hotSpots: [{ pitch: 2, yaw: 120, type: 'scene', text: 'Back to Hall', sceneId: 'hall' }] }
            }
          }
        },
        'pngs/roomSample.png', 'pngs/roomSample.png', 'pngs/cazzaResidence.png', 'pngs/roomSample.png'
      ]
    },
    {
      id: 'R002',
      type: 'dorm',
      name: 'Room 002',
      price: 4000,
      occupancy: 4,
      capacity: 4,
      description: 'Male Unit',
      advance: 'No animal allowed',
      images: [{ src: 'pngs/SamplePano1.jpg', kind: 'pano' }, 'pngs/roomSample.png', 'pngs/roomSample.png', 'pngs/cazzaResidence.png']
    },
    {
      id: 'S101',
      type: 'studio',
      name: 'Room 101',
      price: 5000,
      occupancy: 0,
      capacity: 1,
      description: 'Male Unit',
      advance: 'No animal allowed',
      images: ['pngs/roomSample.png', 'pngs/roomSample.png', 'pngs/cazzaResidence.png']
    },
    {
      id: 'S102',
      type: 'studio',
      name: 'Room 102',
      price: 5000,
      occupancy: 1,
      capacity: 1,
      description: 'Male Unit',
      advance: 'No animal allowed',
      images: ['pngs/roomSample.png', 'pngs/roomSample.png', 'pngs/cazzaResidence.png']
    }
  ];
  // Build fast lookup + memo HTML
  roomsData.forEach(r => ROOMS_BY_ID.set(r.id, r));

  /* ──────────────────────────────────────────────────────────────────────────
     BOOT
     ────────────────────────────────────────────────────────────────────────── */
  async function boot() {
    collectDOM();
    const justOut = sessionStorage.getItem('justSignedOut') === '1';
    if (justOut) {
      clearUser();
      updateAuthUI();
      sessionStorage.removeItem('justSignedOut');
    }
    await checkSessionAndSync();
    await startSessionGuard();
    wireAuthUi();
    if (!STATE.isProfilePage && (location.hash === '#signedout' || location.hash === '#login')) {
      const sb = getSB();
      const { data: { session } = { session: null } } =
        sb?.auth?.getSession ? await sb.auth.getSession() : { data: { session: null } };
      if (!session) {
        DOM.auth.authDialog?.showModal();
        (DOM.auth.authPhoneInp || DOM.auth.authEmailInp)?.focus();
      }
    }
    wireNav();
    wirePanel();
    wireInquire();
    wireReveals();
    wireHeaderAutoHide();
    wireHeroVideo();

    // Profile page shortcut
    if (STATE.isProfilePage) {
      const u = getUser?.();
      if (!u) {
        window.location.href = `${CFG.INDEX_URL}#login`;
      } else {
        const card = qs('.profile-card');
        if (card) {
          card.innerHTML = `
            <div class="acct-row">
              <div class="avatar-lg">${(u.name || 'U').trim().charAt(0).toUpperCase()}</div>
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
      return; // profile page: no rooms/home wiring
    }

    // Filters label
    const { availabilityLabel, availabilityToggle, unitTypeSelect } = DOM.roomsUi;
    if (availabilityLabel && availabilityToggle) {
      availabilityLabel.textContent = availabilityToggle.checked ? 'Available Only' : 'Show All';
      availabilityLabel.title = availabilityLabel.textContent;
    }

    // Wire filters (lazy-render will draw on first switch to Rooms)
    unitTypeSelect?.addEventListener('change', filterRooms);
    availabilityToggle?.addEventListener('change', () => {
      availabilityLabel.textContent = availabilityToggle.checked ? 'Available Only' : 'Show All';
      availabilityLabel.title = availabilityLabel.textContent;
      filterRooms();
    });
    availabilityLabel?.addEventListener('click', () => {
      availabilityToggle.checked = !availabilityToggle.checked;
      availabilityToggle.dispatchEvent(new Event('change'));
    });

    // If user never enters Rooms, render list later during idle so HTML is ready without blocking first paint
    onIdle(() => {
      if (!STATE.roomsRendered) {
        renderRooms(roomsData);
        STATE.roomsRendered = true;
      }
    }, 1200);
  }

  boot();
  window.addEventListener('pageshow', () => {
    checkSessionAndSync();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkSessionAndSync();
  });
})();
