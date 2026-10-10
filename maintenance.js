/* Maintenance Prediction - frontend only (sample data) */
(function () {
  "use strict";

  var STORE_KEY = "kd_maintenance_v1";
  var DAY = 86400000;

  // daysSince = last service kitne din pehle hui, interval = kitne din me service honi chahiye
  var DEFAULT_ASSETS = [
    { id: 1, name: "Ceiling fans", where: "Boys Block · Floor 1", type: "Electrical", daysSince: 210, interval: 180, issues: 4, age: 6 },
    { id: 2, name: "Water cooler", where: "Girls Block · Ground", type: "Plumbing", daysSince: 95, interval: 90, issues: 2, age: 3 },
    { id: 3, name: "Geyser", where: "Boys Block · Bathroom 2", type: "Electrical", daysSince: 150, interval: 120, issues: 3, age: 5 },
    { id: 4, name: "Water tank & pump", where: "Terrace", type: "Plumbing", daysSince: 60, interval: 90, issues: 0, age: 4 },
    { id: 5, name: "Wi-Fi routers", where: "Common Room", type: "Network", daysSince: 40, interval: 120, issues: 1, age: 2 },
    { id: 6, name: "Corridor lights", where: "Girls Block · Floor 2", type: "Electrical", daysSince: 130, interval: 150, issues: 2, age: 3 },
    { id: 7, name: "Mess kitchen exhaust", where: "Mess", type: "Mechanical", daysSince: 175, interval: 120, issues: 3, age: 7 },
    { id: 8, name: "Bathroom taps & pipes", where: "Boys Block · Floor 2", type: "Plumbing", daysSince: 110, interval: 100, issues: 5, age: 8 }
  ];

  var state = { assets: [], filter: "All", scheduled: [] };

  function load() {
    state.assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.assets) { state.assets = p.assets; state.scheduled = p.scheduled || []; }
      }
    } catch (e) { /* ignore */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ assets: state.assets, scheduled: state.scheduled })); }
    catch (e) { /* ignore */ }
  }

  // ---- Risk model (simple, explainable) ----
  // Overdue ratio (50%) + recent issues (30%) + age (20%) => 0-100
  function risk(a) {
    var overdue = Math.min(a.daysSince / a.interval, 1.6) / 1.6;   // 0..1
    var issues = Math.min(a.issues, 5) / 5;                          // 0..1
    var age = Math.min(a.age, 10) / 10;                              // 0..1
    return Math.round((overdue * 50 + issues * 30 + age * 20));
  }
  function level(score) { return score >= 65 ? "high" : score >= 40 ? "med" : "low"; }
  function levelText(l) { return l === "high" ? "High risk" : l === "med" ? "Medium risk" : "Low risk"; }

  function dueText(a) {
    var left = a.interval - a.daysSince;
    if (left < 0) return "Service " + Math.abs(left) + " din se pending";
    if (left === 0) return "Aaj service due hai";
    return left + " din me service due";
  }

  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderStats() {
    var c = { high: 0, med: 0, low: 0 };
    state.assets.forEach(function (a) { c[level(risk(a))]++; });
    $("stAll").textContent = state.assets.length;
    $("stHigh").textContent = c.high;
    $("stMed").textContent = c.med;
    $("stLow").textContent = c.low;
  }

  function renderAssets() {
    var list = $("assetList");
    list.innerHTML = "";
    var items = state.assets
      .map(function (a) { return { a: a, s: risk(a) }; })
      .filter(function (x) { return state.filter === "All" || x.a.type === state.filter; })
      .sort(function (x, y) { return y.s - x.s; });

    if (!items.length) {
      list.innerHTML = '<p class="text-muted mb-0">Is category me koi asset nahi hai.</p>';
      return;
    }
    items.forEach(function (x) {
      var a = x.a, l = level(x.s);
      var row = document.createElement("div");
      row.className = "asset";
      row.innerHTML =
        '<div><div class="name">' + esc(a.name) + '</div><div class="where">' + esc(a.where) + " · " + esc(a.type) + "</div></div>" +
        '<div class="info">' + dueText(a) + "<br>" + a.issues + " complaint(s) pichle 90 din me</div>" +
        '<div class="risk-' + l + '"><div class="risk-bar" role="img" aria-label="Risk ' + x.s + ' out of 100"><i style="width:' + x.s + '%"></i></div>' +
        '<div class="risk-label">' + levelText(l) + " · " + x.s + "/100</div></div>" +
        '<button class="btn-mt" data-id="' + a.id + '">Schedule service</button>';
      list.appendChild(row);
    });
    list.querySelectorAll("button[data-id]").forEach(function (b) {
      b.addEventListener("click", function () { schedule(Number(b.getAttribute("data-id"))); });
    });
  }

  function renderUpcoming() {
    var ul = $("upcoming");
    ul.innerHTML = "";
    var top = state.assets
      .map(function (a) { return { a: a, s: risk(a) }; })
      .filter(function (x) { return x.s >= 40; })
      .sort(function (x, y) { return y.s - x.s; })
      .slice(0, 4);
    if (!top.length) {
      ul.innerHTML = '<li class="text-muted">Abhi koi urgent maintenance prediction nahi hai.</li>';
    }
    top.forEach(function (x) {
      var li = document.createElement("li");
      li.innerHTML = "<b>" + esc(x.a.name) + "</b><small>" + esc(x.a.where) + " · " + dueText(x.a) + "</small>";
      ul.appendChild(li);
    });

    var done = $("scheduled");
    done.innerHTML = "";
    if (!state.scheduled.length) {
      done.innerHTML = '<li class="text-muted">Abhi koi service schedule nahi hui.</li>';
    }
    state.scheduled.slice().reverse().slice(0, 5).forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML = "<b>" + esc(s.name) + "</b><small>Service book hui: " + esc(s.date) + "</small>";
      done.appendChild(li);
    });
  }

  function schedule(id) {
    var a = state.assets.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    // Demo: service ho gayi maan ke counters reset
    a.daysSince = 0;
    a.issues = 0;
    state.scheduled.push({ name: a.name, date: new Date(Date.now() + 2 * DAY).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) });
    save();
    renderAll();
  }

  function renderAll() { renderStats(); renderAssets(); renderUpcoming(); }

  function init() {
    load();
    document.querySelectorAll(".mt-filter").forEach(function (f) {
      f.addEventListener("click", function () {
        state.filter = f.getAttribute("data-f");
        document.querySelectorAll(".mt-filter").forEach(function (o) {
          o.classList.toggle("active", o === f);
        });
        renderAssets();
      });
    });
    $("resetBtn").addEventListener("click", function () {
      state.assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
      state.scheduled = [];
      save();
      renderAll();
    });
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
