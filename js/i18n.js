/* ==== Learn About China — i18n engine ====
 * Strategy: the English text already present in the HTML is the canonical
 * source *and* the translation key. The dictionary maps an English string
 * (verbatim, whitespace-normalised) to its translation, so no page markup
 * needs data-i18n attributes, and the site stays fully readable / indexable
 * without JavaScript.
 */
(function () {
  "use strict";

  /* ---------- configuration ---------- */
  var SUPPORTED = [
    { code: "en",    label: "English",    dir: "ltr" },
    { code: "zh-CN", label: "简体中文",    dir: "ltr" },
    { code: "es",    label: "Español",    dir: "ltr" },
    { code: "pt",    label: "Português",  dir: "ltr" },
    { code: "fr",    label: "Français",   dir: "ltr" },
    { code: "de",    label: "Deutsch",    dir: "ltr" },
    { code: "ru",    label: "Русский",    dir: "ltr" },
    { code: "ja",    label: "日本語",      dir: "ltr" },
    { code: "ko",    label: "한국어",      dir: "ltr" },
    { code: "ar",    label: "العربية",    dir: "rtl" }
  ];
  var DEFAULT_LANG = "en";
  var STORE_KEY = "lac-lang";
  var BASE = "js/i18n/";

  /* User config, settable before this script loads:
   *   window.LAC_I18N_CONFIG = { geoip: true, geoipEndpoint: "..." }
   * `geoip` is OFF by default: browser language already carries region info
   * (zh-CN, pt-BR, es-419 ...) and needs no third-party request. */
  var CONFIG = window.LAC_I18N_CONFIG || {};

  /* Translation units. Mirrors the extractor used to build the dictionaries. */
  var SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,summary,td,th,dt,dd," +
    "span.card-tag,span.footer-contact-label,div.feature-label,div.section-label,div.hero-tag," +
    "div.stat-label,div.breadcrumb,div.hero-scroll,div.footer-bottom," +
    "a.card-link,a.btn";

  /* [selector, property, isAttribute] — the English value doubles as the key. */
  var HEAD_FIELDS = [
    [function () { return document.querySelector("title"); }, "textContent", false],
    [function () { return document.querySelector('meta[name="description"]'); }, "content", false],
    [function () { return document.querySelector('meta[property="og:title"]'); }, "content", false],
    [function () { return document.querySelector('meta[property="og:description"]'); }, "content", false],
    [function () { return document.querySelector('meta[property="og:site_name"]'); }, "content", false],
    [function () { return document.querySelector(".nav-toggle"); }, "aria-label", true]
  ];

  var norm = function (s) { return String(s).replace(/\s+/g, " ").trim(); };
  var byCode = {};
  SUPPORTED.forEach(function (l) { byCode[l.code] = l; });

  /* Runs while the document is still parsing (this script lives in <head>),
   * so a returning non-English visitor never sees the English text paint
   * first. Revealed again by reveal() once the dictionary is applied. */
  (function hideIfTranslated() {
    try {
      var m = /[?&]lang=([^&#]+)/.exec(window.location.search);
      var pre = (m && matchLang(decodeURIComponent(m[1]))) ||
                matchLang(window.localStorage.getItem(STORE_KEY));
      if (pre && pre !== DEFAULT_LANG && document.documentElement) {
        document.documentElement.className += " i18n-loading";
      }
    } catch (e) {}
  })();

  /* ---------- language resolution ---------- */

  function matchLang(tag) {
    if (!tag) return null;
    var t = String(tag).toLowerCase();
    var i, l;
    for (i = 0; i < SUPPORTED.length; i++) {
      if (SUPPORTED[i].code.toLowerCase() === t) return SUPPORTED[i].code;
    }
    var base = t.split("-")[0];
    for (i = 0; i < SUPPORTED.length; i++) {
      l = SUPPORTED[i].code.toLowerCase();
      if (l === base) return SUPPORTED[i].code;
    }
    if (base === "zh") return "zh-CN";           // zh-TW / zh-HK / zh
    for (i = 0; i < SUPPORTED.length; i++) {
      if (SUPPORTED[i].code.toLowerCase().split("-")[0] === base) return SUPPORTED[i].code;
    }
    return null;
  }

  function fromUrl() {
    var m = /[?&]lang=([^&#]+)/.exec(window.location.search);
    return m ? matchLang(decodeURIComponent(m[1])) : null;
  }

  function fromStore() {
    try { return matchLang(window.localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language];
    for (var i = 0; i < list.length; i++) {
      var hit = matchLang(list[i]);
      if (hit) return hit;
    }
    return null;
  }

  /* Region-based fallback: only used when CONFIG.geoip is enabled. Two-letter
   * country code -> default language. Kept behind a flag so the site makes no
   * third-party request unless the operator opts in. */
  var GEO_MAP = {
    CN: "zh-CN", TW: "zh-CN", HK: "zh-CN", SG: "zh-CN", MO: "zh-CN",
    ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es",
    BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
    FR: "fr", BE: "fr", CA: "en", SN: "fr", CI: "fr",
    DE: "de", AT: "de", CH: "de",
    IT: "it", RU: "ru", UA: "ru", KZ: "ru", BY: "ru",
    JP: "ja", KR: "ko", KP: "ko",
    SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar", IQ: "ar"
  };

  function geoLookup(cb) {
    if (!CONFIG.geoip || !CONFIG.geoipEndpoint || !window.fetch) return cb(null);
    var done = false;
    var finish = function (v) { if (!done) { done = true; cb(v); } };
    setTimeout(function () { finish(null); }, 1500);   // never block the page
    try {
      window.fetch(CONFIG.geoipEndpoint, { credentials: "omit" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var cc = (d && (d.country_code || d.countryCode || d.country)) || "";
          finish(matchLang(GEO_MAP[String(cc).toUpperCase()] || ""));
        })
        ["catch"](function () { finish(null); });
    } catch (e) { finish(null); }
  }

  /* ---------- translation units ---------- */

  var units = [];
  var headUnits = [];

  function unitFor(el) {
    var kids = el.children;
    if (kids.length === 1 && (kids[0].tagName === "A" || kids[0].tagName === "BUTTON") &&
        norm(el.textContent) === norm(kids[0].textContent)) {
      return kids[0];
    }
    return el;
  }

  function collect() {
    units = [];
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList && el.classList.contains("logo")) continue;
      var t = unitFor(el);
      if (t.__lacSrc === undefined) {
        t.__lacSrc = t.innerHTML;
        t.__lacKey = norm(t.textContent);
      }
      units.push(t);
    }
    headUnits = [];
    HEAD_FIELDS.forEach(function (f) {
      var node = f[0]();
      if (!node) return;
      var prop = f[1], isAttr = f[2];
      var src = isAttr ? node.getAttribute(prop) : node[prop];
      if (src === null || src === undefined) return;
      if (node.__lacHead === undefined) node.__lacHead = src;
      headUnits.push([node, prop, isAttr, node.__lacHead]);
    });
  }

  function apply(dict) {
    var i;
    for (i = 0; i < units.length; i++) {
      var u = units[i];
      var val = dict && Object.prototype.hasOwnProperty.call(dict, u.__lacKey)
        ? dict[u.__lacKey] : u.__lacSrc;
      if (u.innerHTML !== val) u.innerHTML = val;
    }
    for (i = 0; i < headUnits.length; i++) {
      var h = headUnits[i];
      var hv = dict && Object.prototype.hasOwnProperty.call(dict, h[3]) ? dict[h[3]] : h[3];
      if (h[2]) {
        if (h[0].getAttribute(h[1]) !== hv) h[0].setAttribute(h[1], hv);
      } else if (h[0][h[1]] !== hv) {
        h[0][h[1]] = hv;
      }
    }
  }

  /* ---------- dictionary loading ---------- */

  var cache = {};

  function load(code, cb) {
    if (code === DEFAULT_LANG) return cb({});
    if (cache[code]) return cb(cache[code]);
    if (!window.fetch) return cb({});
    window.fetch(BASE + code + ".json", { credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { cache[code] = d; cb(d); })
      ["catch"](function () { cache[code] = null; cb({}); });
  }

  /* ---------- language switcher ---------- */

  function buildSwitcher() {
    var inner = document.querySelector(".nav-inner");
    if (!inner || document.querySelector(".lang-switch")) return;

    var wrap = document.createElement("div");
    wrap.className = "lang-switch";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="lang-globe" aria-hidden="true">🌐</span>' +
      '<span class="lang-current"></span><span class="lang-caret" aria-hidden="true">▾</span>';

    var menu = document.createElement("ul");
    menu.className = "lang-menu";
    menu.setAttribute("role", "menu");

    SUPPORTED.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "menuitem");
      b.setAttribute("data-lang", l.code);
      b.setAttribute("lang", l.code);
      b.textContent = l.label;
      b.addEventListener("click", function () { select(l.code); });
      li.appendChild(b);
      menu.appendChild(li);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);

    var navToggle = inner.querySelector(".nav-toggle");
    if (navToggle) inner.insertBefore(wrap, navToggle);
    else inner.appendChild(wrap);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function syncSwitcher(code) {
    var cur = document.querySelector(".lang-current");
    if (cur) cur.textContent = (byCode[code] || byCode[DEFAULT_LANG]).label;
    var items = document.querySelectorAll(".lang-menu button[data-lang]");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("active", items[i].getAttribute("data-lang") === code);
    }
  }

  var current = DEFAULT_LANG;

  function render(code, done) {
    current = code;
    var meta = byCode[code] || byCode[DEFAULT_LANG];
    var html = document.documentElement;
    html.setAttribute("lang", code);
    html.setAttribute("dir", meta.dir);
    syncSwitcher(code);
    if (code === DEFAULT_LANG) {
      apply(null);
      if (done) done();
    } else {
      /* reveal only once the dictionary is actually applied — otherwise the
       * English source would flash before the translation lands. */
      load(code, function (dict) { apply(dict); if (done) done(); });
    }
  }

  function select(code) {
    if (!byCode[code]) return;
    try { window.localStorage.setItem(STORE_KEY, code); } catch (e) {}
    try {
      var url = window.location.pathname + window.location.search.replace(/([?&])lang=[^&#]*/g, "$1").replace(/[?&]$/, "");
      var sep = url.indexOf("?") === -1 ? "?" : "&";
      if (code !== DEFAULT_LANG) {
        window.history.replaceState(null, "", url + sep + "lang=" + encodeURIComponent(code));
      } else {
        window.history.replaceState(null, "", url);
      }
    } catch (e) {}
    render(code);
  }

  /* ---------- boot ---------- */

  function reveal() {
    document.documentElement.classList.remove("i18n-loading");
  }

  function boot() {
    collect();
    buildSwitcher();

    var preset = fromUrl() || fromStore();
    if (preset) {
      render(preset, reveal);
    } else {
      geoLookup(function (geo) {
        render(geo || fromBrowser() || DEFAULT_LANG, reveal);
      });
    }
    setTimeout(reveal, 2000);   // safety net if anything above stalls
  }

  window.LAC_I18N = {
    languages: SUPPORTED,
    current: function () { return current; },
    set: select,
    /* Refresh after content is injected dynamically. */
    refresh: function () { collect(); render(current); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
