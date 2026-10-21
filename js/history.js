/* ==== History page — dynasty timeline ====
 * The timeline slider swaps one approximate territory outline at a time.
 * Outlines are stored as lon/lat rings and projected with the same formula
 * used by the maps elsewhere on the site, so everything lines up.
 */
(function () {
  "use strict";

  var layer = document.getElementById("history-era-layer");
  var range = document.querySelector(".timeline-range");
  if (!layer || !range) return;

  var NS = "http://www.w3.org/2000/svg";
  var project = function (lon, lat) {
    return [
      Math.round((517 + (lon - 75.99) * 10.096) * 10) / 10,
      Math.round((399 + (39.9 - lat) * 12.28) * 10) / 10
    ];
  };

  var ERAS = [
    /* Shang — core of the North China Plain */
    { rings: [[[110.3,34.0],[110.8,35.9],[112.4,37.6],[114.6,38.4],[117.4,38.2],[119.6,36.9],[119.2,35.0],[117.6,33.4],[115.0,32.8],[112.6,33.1]]] },
    /* Zhou — Yellow River and Yangtze, down to the southeast coast */
    { rings: [[[106.5,34.2],[107.6,37.6],[110.5,39.6],[114.0,40.6],[117.6,40.0],[120.2,38.6],[122.4,37.0],[121.0,34.6],[119.0,33.0],[117.0,31.4],[114.0,30.4],[111.0,29.4],[108.0,30.0],[105.6,32.0]]] },
    /* Qin — first unified empire, including the Sichuan basin */
    { rings: [[[103.4,34.2],[103.6,30.4],[105.6,29.0],[108.2,29.4],[111.0,29.5],[113.6,30.2],[116.2,31.8],[118.6,33.2],[120.6,35.2],[121.6,37.6],[119.4,40.0],[116.0,41.0],[112.0,40.8],[108.4,39.4],[106.0,37.4],[104.4,35.8]]] },
    /* Han — China proper plus the Hexi corridor and Tarim oases */
    { rings: [
      [[99.0,40.5],[103.0,42.0],[108.0,42.6],[112.0,43.6],[116.0,45.0],[120.0,46.0],[124.0,45.0],[127.0,43.0],[126.0,40.5],[122.0,40.0],[121.0,37.4],[120.0,34.8],[119.4,33.0],[118.0,31.0],[116.0,29.0],[113.6,27.4],[111.0,25.6],[109.2,23.6],[108.0,21.4],[105.8,21.2],[104.6,22.6],[105.2,24.6],[107.0,25.6],[108.6,27.2],[107.0,29.0],[104.0,29.6],[102.0,31.0],[100.4,33.0],[98.0,36.0],[97.4,38.6]],
      [[76.0,40.5],[80.0,42.0],[85.0,44.0],[90.0,44.0],[94.0,43.0],[96.0,41.0],[93.0,39.0],[88.0,38.0],[83.0,37.0],[79.0,37.6],[76.0,39.0]]
    ] },
    /* Tang — Silk Road, Mongolia and the northeast */
    { rings: [[[76.0,40.0],[80.0,44.0],[85.0,47.0],[90.0,49.0],[95.0,50.0],[100.0,50.0],[105.0,49.4],[110.0,48.4],[115.0,47.4],[120.0,49.0],[125.0,52.0],[130.0,49.0],[134.0,46.0],[131.0,42.0],[126.0,40.0],[122.0,40.0],[121.0,36.0],[119.0,33.0],[117.0,30.4],[114.0,28.0],[111.0,25.6],[108.0,22.2],[106.0,21.6],[104.0,23.0],[106.0,27.0],[103.0,30.0],[100.0,32.0],[97.0,34.0],[92.0,36.0],[88.0,37.0],[84.0,37.4],[80.0,38.0]]] },
    /* Song — the north is lost; the south is the economic heartland */
    { rings: [[[103.0,34.0],[104.0,37.0],[107.0,39.0],[110.0,40.0],[114.0,40.4],[118.0,40.0],[121.0,39.0],[122.0,36.6],[120.0,34.0],[118.0,32.0],[116.0,30.0],[113.0,28.0],[110.0,26.0],[108.0,23.0],[106.0,21.6],[104.0,23.0],[105.0,26.0],[104.0,29.0],[102.0,31.0],[102.0,33.0]]] },
    /* Yuan — the Mongol realm, including Mongolia, Tibet and Yunnan */
    { rings: [[[76.0,40.0],[80.0,44.0],[85.0,47.0],[90.0,49.0],[95.0,50.0],[100.0,50.4],[105.0,50.0],[110.0,49.0],[115.0,48.0],[120.0,50.0],[125.0,53.0],[130.0,50.0],[134.0,48.0],[135.0,45.0],[130.0,42.0],[126.0,41.0],[122.0,41.0],[121.0,37.0],[120.0,34.4],[118.0,31.4],[115.0,29.0],[112.0,26.0],[109.0,23.0],[106.0,21.6],[104.0,22.6],[102.0,25.0],[99.0,28.0],[96.0,31.0],[92.0,34.0],[88.0,36.0],[84.0,37.0],[80.0,38.4]]] },
    /* Ming — the Great Wall line plus Manchuria and Yunnan */
    { rings: [[[97.0,40.0],[102.0,42.0],[107.0,42.6],[112.0,42.6],[117.0,42.0],[121.0,41.0],[125.0,43.0],[130.0,45.4],[133.0,47.0],[135.0,45.0],[131.0,42.0],[127.0,41.0],[124.0,39.6],[122.0,40.0],[121.0,37.0],[120.0,34.0],[118.0,31.4],[116.0,29.0],[113.4,27.0],[111.0,25.0],[108.8,22.4],[107.0,21.6],[105.0,23.0],[105.6,25.4],[103.0,27.0],[101.0,29.0],[99.0,31.0],[97.0,33.0],[95.0,36.0],[96.0,38.4]]] },
    /* Qing — the greatest extent, with Taiwan */
    { rings: [
      [[76.0,40.0],[80.0,44.0],[85.0,47.0],[90.0,49.0],[95.0,50.4],[100.0,50.4],[105.0,50.0],[110.0,49.4],[115.0,48.4],[120.0,50.0],[125.0,53.0],[130.0,50.0],[134.0,48.0],[135.0,45.0],[131.0,42.0],[127.0,41.0],[124.0,40.0],[122.0,39.6],[121.0,37.0],[120.0,34.0],[118.0,31.0],[116.0,29.0],[113.0,27.0],[110.0,24.0],[108.0,21.4],[106.0,21.4],[104.0,23.0],[105.0,26.0],[102.0,29.0],[99.0,32.0],[96.0,34.0],[92.0,36.0],[88.0,37.0],[84.0,37.4],[80.0,38.4]],
      [[120.0,25.3],[121.9,25.3],[122.0,24.0],[120.5,22.0],[120.0,23.0]]
    ] },
    /* Modern — reuse the site's surveyed silhouette */
    { useBase: true }
  ];

  function ringToPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) {
      var p = project(ring[i][0], ring[i][1]);
      d += (i === 0 ? "M" : "L") + p[0] + " " + p[1];
    }
    return d + "Z";
  }

  var basePath = document.querySelector(".history-map .map-base");
  ERAS.forEach(function (era, i) {
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "era-territory" + (i === 0 ? " active" : ""));
    g.setAttribute("data-era", String(i));
    g.setAttribute("aria-hidden", "true");
    if (era.useBase && basePath) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("class", "era-shape era-shape-modern");
      p.setAttribute("d", basePath.getAttribute("d"));
      g.appendChild(p);
    } else {
      era.rings.forEach(function (ring) {
        var path = document.createElementNS(NS, "path");
        path.setAttribute("class", "era-shape");
        path.setAttribute("d", ringToPath(ring));
        g.appendChild(path);
      });
    }
    layer.appendChild(g);
  });

  var ticks = Array.prototype.slice.call(document.querySelectorAll(".era-tick"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".era-card"));
  var labels = Array.prototype.slice.call(document.querySelectorAll(".era-map-label"));
  var shapes = Array.prototype.slice.call(layer.querySelectorAll(".era-territory"));
  var last = ERAS.length - 1;

  function setEra(value) {
    var i = Math.max(0, Math.min(last, parseInt(value, 10) || 0));
    range.value = String(i);
    ticks.forEach(function (t) {
      var on = Number(t.getAttribute("data-era")) === i;
      t.classList.toggle("active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    cards.forEach(function (c) {
      c.classList.toggle("active", Number(c.getAttribute("data-era")) === i);
    });
    labels.forEach(function (l) {
      l.classList.toggle("active", Number(l.getAttribute("data-era")) === i);
    });
    shapes.forEach(function (s) {
      s.classList.toggle("active", Number(s.getAttribute("data-era")) === i);
    });
  }

  range.addEventListener("input", function () { setEra(range.value); });
  ticks.forEach(function (t) {
    t.addEventListener("click", function () { setEra(t.getAttribute("data-era")); });
  });

  setEra(0);
})();
