
/* ============================================================================
   auth.js — single source of truth for Supabase client + admin redirects
   ============================================================================ */
(function () {
  var SUPABASE_URL = (typeof window.__SUPABASE_URL !== "undefined" && window.__SUPABASE_URL) || "https://wsmazwvwxxxuzakvmtha.supabase.co";
  var SUPABASE_ANON_KEY = (typeof window.__SUPABASE_ANON_KEY !== "undefined" && window.__SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzbWF6d3Z3eHh4dXpha3ZtdGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Njg4MjcsImV4cCI6MjA3MTM0NDgyN30.hBq1VG0NspgkIrhWnqVpRKhHbzo_I-ZlJ_eknVD5kdk";
  var ADMIN_PATH = "administration.html";
  var HOME_PATH  = "index.html";

  if (!window.supabase || !window.supabase.createClient) {
    console.warn("[auth.js] Supabase UMD not loaded yet. Make sure the CDN script tag is before this file.");
    return;
  }

  var existing = window.__supabase || window.supabaseClient || null;
  if (!existing) {
    try {
      existing = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
      });
    } catch (e) {
      console.error("[auth.js] Failed to create Supabase client:", e);
    }
  }

  window.__supabase = existing;
  window.supabaseClient = existing;
  if (!existing) return;
  var sb = existing;

  async function getRole() {
    try {
      var u = await sb.auth.getUser();
      var user = u && u.data ? u.data.user : null;
      if (!user) return null;

      // Prefer role from profiles table
      try {
        var prof = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (prof && prof.data && prof.data.role) return String(prof.data.role).toLowerCase();
      } catch (e) {}

      // Fallback to app_metadata.role if you use that
      var appRole = user.app_metadata && user.app_metadata.role;
      return appRole ? String(appRole).toLowerCase() : null;
    } catch (e) {
      console.warn("[auth.js] getRole failed:", e);
      return null;
    }
  }

  async function redirectIfAdmin(opts) {
    opts = opts || {};
    var adminPath = (opts.adminPath || ADMIN_PATH);
    var role = await getRole();
    if (role === "admin" || role === "staff") {
      var target = new URL(adminPath, location.href).href;
      if (location.href !== target) location.replace(target);
    }
  }

  async function requireAdminOrStaff(opts) {
    opts = opts || {};
    var homePath = (opts.homePath || HOME_PATH);
    var sess = await sb.auth.getSession();
    var session = sess && sess.data ? sess.data.session : null;
    if (!session) return location.replace(new URL(homePath, location.href).href);
    var role = await getRole();
    if (!(role === "admin" || role === "staff")) {
      return location.replace(new URL(homePath, location.href).href);
    }
  }

  function installFrontPageRedirects(opts) {
    opts = opts || {};
    redirectIfAdmin(opts); // run now
    sb.auth.onAuthStateChange(function (evt) {
      if (evt === "INITIAL_SESSION" || evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") {
        redirectIfAdmin(opts);
      }
    });
  }

  function installAdminSignOutBounce(opts) {
    opts = opts || {};
    var homePath = (opts.homePath || HOME_PATH);
    sb.auth.onAuthStateChange(function (evt) {
      if (evt === "SIGNED_OUT") {
        location.replace(new URL(homePath, location.href).href);
      }
    });
  }

  window.auth = {
    getClient: function(){ return sb; },
    getRole,
    redirectIfAdmin,
    requireAdminOrStaff,
    installFrontPageRedirects,
    installAdminSignOutBounce
  };
})();
