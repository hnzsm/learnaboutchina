// Navigation: add scrolled class, mobile toggle, active link
(function () {
  const nav = document.querySelector(".nav");
  if (nav) {
    window.addEventListener("scroll", () => {
      nav.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  // Mark active nav link by path
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });
})();

// Footer contact e-mail: click to copy, with a localized confirmation note
(function () {
  const link = document.querySelector(".footer-contact a");
  if (!link) return;

  const mail =
    (link.getAttribute("href") || "").replace(/^mailto:/i, "") ||
    "easytestapi@qq.com";

  const MSG = {
    "en": "Copied!",
    "zh-CN": "已复制",
    "es": "Copiado",
    "pt": "Copiado",
    "fr": "Copié",
    "de": "Kopiert",
    "ru": "Скопировано",
    "ja": "コピーしました",
    "ko": "복사되었습니다",
    "ar": "تم النسخ"
  };

  const tip = document.createElement("span");
  tip.className = "copy-tip";
  tip.setAttribute("aria-live", "polite");
  link.parentNode.insertBefore(tip, link.nextSibling);

  let timer;
  const feedback = () => {
    const code =
      (window.LAC_I18N && window.LAC_I18N.current && window.LAC_I18N.current()) ||
      "en";
    tip.textContent = MSG[code] || MSG.en;
    tip.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => tip.classList.remove("show"), 1600);
  };

  // execCommand fallback for non-secure contexts / older browsers
  const legacyCopy = () => {
    const ta = document.createElement("textarea");
    ta.value = mail;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  };

  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mail).then(feedback, () => {
        if (legacyCopy()) feedback();
        else window.location.href = "mailto:" + mail;
      });
    } else if (legacyCopy()) {
      feedback();
    } else {
      window.location.href = "mailto:" + mail;
    }
  });
})();
