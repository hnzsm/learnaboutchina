/* ==== Learn About China — interactive map + carousel ====
 * Keeps the SVG map markers and the place carousel in sync: clicking a marker
 * opens that place, while the arrows, the dots, a swipe or the keyboard move
 * through all of them. The text itself stays in the HTML so it remains
 * translatable and indexable — this file only handles the interaction.
 * Every `.explorer` block on the page is wired up independently.
 */
(function () {
  "use strict";

  function initExplorer(root) {
    var track = root.querySelector(".slide-track");
    var viewport = root.querySelector(".slide-viewport");
    var dotsBox = root.querySelector(".slide-dots");
    var prevBtn = root.querySelector(".slide-prev");
    var nextBtn = root.querySelector(".slide-next");
    var slides = [].slice.call(root.querySelectorAll(".place-slide"));
    var markers = [].slice.call(root.querySelectorAll(".map-marker"));
    var regions = [].slice.call(root.querySelectorAll(".map-region"));
    if (!track || !viewport || !slides.length) return;

    var index = 0;
    var indexByPlace = {};
    slides.forEach(function (s, i) {
      indexByPlace[s.getAttribute("data-place")] = i;
    });

    /* Aliases let an older anchor (e.g. tourism.html#forbidden-city) open the
     * slide that now covers it, declared as data-aliases="from=to,from=to". */
    var alias = {};
    (root.getAttribute("data-aliases") || "").split(",").forEach(function (pair) {
      var p = pair.split("=");
      if (p.length === 2) alias[p[0].trim()] = p[1].trim();
    });

    function hasPlace(place) {
      return Object.prototype.hasOwnProperty.call(indexByPlace, place);
    }
    function resolve(place) {
      var target = alias[place] || place;
      return hasPlace(target) ? target : place;
    }

    /* --- dots, one per slide --- */
    var dots = slides.map(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slide-dot";
      b.setAttribute("aria-label", s.getAttribute("data-name") || "Item " + (i + 1));
      b.addEventListener("click", function () { show(i, true); });
      if (dotsBox) dotsBox.appendChild(b);
      return b;
    });

    function show(i, updateHash) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-index * 100) + "%)";

      var place = slides[index].getAttribute("data-place");
      slides.forEach(function (s, n) { s.classList.toggle("active", n === index); });
      dots.forEach(function (d, n) {
        d.classList.toggle("active", n === index);
        if (n === index) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      markers.forEach(function (m) {
        m.classList.toggle("active", m.getAttribute("data-place") === place);
      });
      regions.forEach(function (rg) {
        rg.classList.toggle("active", rg.getAttribute("data-place") === place);
      });

      /* SVG paints in document order, so the label of an earlier marker can be
       * hidden under a later marker or region. Lift the open item to the end of
       * its layer: its white name then sits on top of everything drawn so far. */
      markers.forEach(function (m) {
        if (m.classList.contains("active") && m.parentNode) m.parentNode.appendChild(m);
      });
      regions.forEach(function (rg) {
        if (rg.classList.contains("active") && rg.parentNode) rg.parentNode.appendChild(rg);
      });

      if (updateHash) {
        try { window.history.replaceState(null, "", "#" + place); } catch (e) {}
      }
    }

    function scrollToExplorer(smooth) {
      var top = root.getBoundingClientRect().top + window.pageYOffset - 76;
      if (smooth) {
        try { window.scrollTo({ top: top, behavior: "smooth" }); return; } catch (e) {}
        window.scrollTo(0, top);
        return;
      }
      /* the site CSS sets `scroll-behavior: smooth`, which would animate this
       * jump too — switch it off so a deep link lands on the map immediately. */
      var html = document.documentElement;
      var prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, top);
      html.style.scrollBehavior = prev;
    }

    function goByPlace(place, smooth) {
      var target = resolve(place);
      if (!hasPlace(target)) return false;
      show(indexByPlace[target], false);
      scrollToExplorer(smooth);
      return true;
    }

    /* --- map markers --- */
    markers.forEach(function (m) {
      var place = m.getAttribute("data-place");
      m.addEventListener("click", function () { show(indexByPlace[place], true); });
      m.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          show(indexByPlace[place], true);
        }
      });
    });

    /* --- region blocks ---
     * On the food page a whole province is painted as a clickable block.
     * No stopPropagation here: the event has to reach `.map-frame` below so
     * that a tap near a dish pin still resolves to that pin first. */
    regions.forEach(function (rg) {
      var place = rg.getAttribute("data-place");
      rg.addEventListener("click", function () { show(indexByPlace[place], true); });
      rg.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          show(indexByPlace[place], true);
        }
      });
    });

    /* --- tapping the map: nearest-marker resolution ---
     * A marker dot is only ~3px wide once the 660-unit map is squeezed onto a
     * phone, so a tap anywhere near a marker opens the one closest to the
     * finger instead of relying on the tiny circle that is actually painted.
     * The slop is expressed in CSS pixels and converted to map units, so it
     * stays finger-sized at every screen width. */
    var mapFrame = root.querySelector(".map-frame");
    var svg = root.querySelector(".china-map");
    if (mapFrame && svg && svg.getScreenCTM) {
      mapFrame.addEventListener("click", function (e) {
        /* A tap that landed on a region block has already opened that cuisine.
         * The slop below is sized for a finger, so on a phone it reaches far
         * enough to cover a small province and would steal the tap back to a
         * neighbouring dish pin — never let it. */
        for (var n = e.target; n && n !== mapFrame; n = n.parentNode) {
          if (n.classList && n.classList.contains("map-region")) return;
        }

        var box = svg.getBoundingClientRect();
        var vb = svg.viewBox && svg.viewBox.baseVal;
        var ctm = svg.getScreenCTM();
        if (!vb || !vb.width || !box.width || !ctm) return;

        var inv = ctm.inverse();
        var pt = window.DOMPoint
          ? new DOMPoint(e.clientX, e.clientY).matrixTransform(inv)
          : (function () {
              var sp = svg.createSVGPoint();
              sp.x = e.clientX;
              sp.y = e.clientY;
              return sp.matrixTransform(inv);
            })();

        var slop = 24 * (vb.width / box.width);
        var best = null;
        var bestDist = Infinity;
        markers.forEach(function (m) {
          var dot = m.querySelector(".marker-dot");
          if (!dot) return;
          var cx = parseFloat(dot.getAttribute("cx"));
          var cy = parseFloat(dot.getAttribute("cy"));
          if (isNaN(cx) || isNaN(cy)) return;
          var d = Math.sqrt((cx - pt.x) * (cx - pt.x) + (cy - pt.y) * (cy - pt.y));
          if (d < bestDist) { bestDist = d; best = m; }
        });
        if (best && bestDist <= slop) {
          show(indexByPlace[best.getAttribute("data-place")], true);
        }
      });
    }

    /* --- arrows --- */
    if (prevBtn) prevBtn.addEventListener("click", function () { show(index - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { show(index + 1, true); });

    /* --- keyboard on the carousel --- */
    viewport.setAttribute("tabindex", "0");
    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1, true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1, true); }
    });

    /* --- swipe (touch / pen) --- */
    var startX = 0, startY = 0, tracking = false;
    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    viewport.addEventListener("pointerup", function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        show(index + (dx < 0 ? 1 : -1), true);
      }
    });
    viewport.addEventListener("pointercancel", function () { tracking = false; });

    /* --- deep links: tourism.html#great-wall, culture.html#tea ... --- */
    function hashPlace() {
      return (window.location.hash || "").replace(/^#/, "");
    }

    var initial = hashPlace();
    var landed = initial && goByPlace(initial, false);
    if (!landed) show(0, false);
    /* the first jump can fire before the layout has settled — retry once the
     * whole document has loaded, but only if the jump did not take effect. */
    if (landed) {
      window.addEventListener("load", function () {
        if (window.pageYOffset < 4) scrollToExplorer(false);
      });
    }

    window.addEventListener("hashchange", function () {
      var h = hashPlace();
      if (h) goByPlace(h, true);
    });
  }

  [].slice.call(document.querySelectorAll(".explorer")).forEach(initExplorer);
})();
