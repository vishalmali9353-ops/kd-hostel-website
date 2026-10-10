/* Security & Surveillance - frontend only (sample data, koi real camera feed nahi) */
(function () {
  "use strict";

  var STORE_KEY = "kd_security_v1";
  var CURFEW_HOUR = 22; // raat 10 baje ke baad late entry

  var DEFAULT_CAMS = [
    { id: 1, name: "Main Gate", online: true },
    { id: 2, name: "Boys Block Entrance", online: true },
    { id: 3, name: "Girls Block Entrance", online: true },
    { id: 4, name: "Mess Hall", online: true },
    { id: 5, name: "Corridor - Floor 1", online: true },
    { id: 6, name: "Parking Area", online: false }
  ];

  var DEFAULT_LOG = [
    { name: "Rahul Patel", type: "Student", note: "Room B001", dir: "IN", time: "18:42" },
    { name: "Mr. Suresh Shah", type: "Visitor", note: "Meeting: Jay S. (B002)", dir: "IN", time: "17:15" },
    { name: "Mr. Suresh Shah", type: "Visitor", note: "Meeting: Jay S. (B002)", dir: "OUT", time: "17:50" }
  ];

  var state = { cams: [], log: [], alerts: [] };

  function load() {
    state.cams = JSON.parse(JSON.stringify(DEFAULT_CAMS));
    state.log = JSON.parse(JSON.stringify(DEFAULT_LOG));
    state.alerts = [
      { lvl: "high", text: "Parking Area camera offline", time: "Aaj" },
      { lvl: "info", text: "Main Gate camera check complete", time: "Aaj" }
    ];
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.cams && p.log && p.alerts) { state = p; }
      }
    } catch (e) { /* ignore */ }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }

  // ---- Stats ----
  function renderStats() {
    var inside = 0, visitors = 0;
    var seen = {};
    state.log.slice().reverse().forEach(function (l) {
      var key = l.type + "|" + l.name;
      if (seen[key]) return;
      seen[key] = l.dir;
    });
    Object.keys(seen).forEach(function (k) {
      if (seen[k] === "IN") { if (k.indexOf("Visitor|") === 0) visitors++; else inside++; }
    });
    $("stCams").textContent = state.cams.filter(function (c) { return c.online; }).length + "/" + state.cams.length;
    $("stInside").textContent = inside;
    $("stVisitors").textContent = visitors;
    $("stAlerts").textContent = state.alerts.filter(function (a) { return a.lvl !== "info"; }).length;
  }

  // ---- Cameras ----
  function renderCams() {
    var grid = $("camGrid");
    grid.innerHTML = "";
    state.cams.forEach(function (c) {
      var div = document.createElement("div");
      div.className = "cam " + (c.online ? "online" : "offline");
      div.innerHTML =
        '<div class="cam-view"><span class="rec"><i></i>' + (c.online ? "LIVE" : "OFF") + "</span>" +
        '<span class="time" data-clock>' + nowHM() + "</span>" +
        '<span class="off-msg">No signal</span></div>' +
        '<div class="cam-body"><div><div class="nm">' + esc(c.name) + '</div><div class="st">' + (c.online ? "Online" : "Offline") + "</div></div>" +
        '<button class="btn-sc-sm" data-cam="' + c.id + '">' + (c.online ? "Turn off" : "Turn on") + "</button></div>";
      grid.appendChild(div);
    });
    grid.querySelectorAll("button[data-cam]").forEach(function (b) {
      b.addEventListener("click", function () { toggleCam(Number(b.getAttribute("data-cam"))); });
    });
  }

  function toggleCam(id) {
    var c = state.cams.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    c.online = !c.online;
    addAlert(c.online ? "info" : "high", c.name + (c.online ? " camera back online" : " camera offline"));
    save();
    renderAll();
  }

  // ---- Alerts ----
  function addAlert(lvl, text) {
    state.alerts.unshift({ lvl: lvl, text: text, time: nowHM() });
    state.alerts = state.alerts.slice(0, 8);
  }
  function renderAlerts() {
    var ul = $("alertList");
    ul.innerHTML = "";
    state.alerts.forEach(function (a) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="lvl ' + a.lvl + '">' + (a.lvl === "high" ? "Alert" : a.lvl === "med" ? "Warning" : "Info") + "</span>" + esc(a.text) + "<small>" + esc(a.time) + "</small>";
      ul.appendChild(li);
    });
  }

  // ---- Gate log ----
  function renderLog() {
    var body = $("logBody");
    body.innerHTML = "";
    state.log.slice().reverse().slice(0, 10).forEach(function (l) {
      var late = l.late ? ' <span class="badge-late">Late</span>' : "";
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(l.time) + "</td><td>" + esc(l.name) + "</td><td>" + esc(l.type) + "</td><td>" + esc(l.note || "-") + "</td>" +
        '<td><span class="' + (l.dir === "IN" ? "badge-in" : "badge-out") + '">' + l.dir + "</span>" + late + "</td>";
      body.appendChild(tr);
    });
  }

  function msg(text, ok) {
    var m = $("formMsg");
    m.textContent = text;
    m.className = "sc-msg show " + (ok ? "ok" : "err");
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = e.target;
    var name = f.pname.value.trim();
    if (!name) { msg("Naam likhna zaroori hai.", false); return; }
    var type = f.ptype.value;
    var dir = f.pdir.value;
    var note = f.pnote.value.trim();
    var hour = new Date().getHours();
    var late = type === "Student" && dir === "IN" && (hour >= CURFEW_HOUR || hour < 5);

    state.log.push({ name: name, type: type, note: note, dir: dir, time: nowHM(), late: late });
    if (late) addAlert("med", name + " ne curfew ke baad entry ki (" + nowHM() + ")");
    save();
    renderAll();
    msg(name + " ki " + dir + " entry save ho gayi." + (late ? " Late entry flag ki gayi." : ""), true);
    f.reset();
  }

  function renderAll() { renderStats(); renderCams(); renderAlerts(); renderLog(); }

  function init() {
    load();
    renderAll();
    $("gateForm").addEventListener("submit", onSubmit);
    $("resetBtn").addEventListener("click", function () {
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      load(); renderAll(); $("formMsg").className = "sc-msg";
    });
    // Camera timestamps har 30 sec me update
    setInterval(function () {
      document.querySelectorAll("[data-clock]").forEach(function (el) { el.textContent = nowHM(); });
    }, 30000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
