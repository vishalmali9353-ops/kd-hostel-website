/* Smart Room Allocation - frontend only (sample data, backend se baad me connect karna) */
(function () {
  "use strict";

  var STORE_KEY = "kd_allocation_v1";

  // Sample rooms: block, floor, type (capacity), occupants (course-year)
  function buildRooms() {
    var rooms = [];
    var boys = { block: "Boys", prefix: "B" };
    var girls = { block: "Girls", prefix: "G" };
    [boys, girls].forEach(function (b) {
      for (var floor = 0; floor < 3; floor++) {
        for (var n = 1; n <= 6; n++) {
          var cap = n % 3 === 0 ? 3 : 2;
          rooms.push({
            id: b.prefix + floor + "0" + n,
            block: b.block,
            floor: floor,
            capacity: cap,
            occupants: []
          });
        }
      }
    });
    // Starting occupancy so the page looks alive
    var seed = [
      ["B001", "Rahul P.", "Diploma Computer", "1"],
      ["B002", "Jay S.", "Diploma Civil", "2"],
      ["B002", "Dhruv M.", "Diploma Civil", "2"],
      ["B101", "Karan T.", "Diploma Computer", "2"],
      ["B103", "Het R.", "Diploma Mechanical", "3"],
      ["B103", "Om V.", "Diploma Mechanical", "3"],
      ["B103", "Yash D.", "Diploma Mechanical", "3"],
      ["G001", "Priya S.", "Diploma Computer", "1"],
      ["G002", "Neha P.", "Diploma Electrical", "2"],
      ["G002", "Riya M.", "Diploma Electrical", "2"],
      ["G101", "Kinjal B.", "Diploma Civil", "1"]
    ];
    seed.forEach(function (s) {
      var r = rooms.filter(function (x) { return x.id === s[0]; })[0];
      if (r) r.occupants.push({ name: s[1], course: s[2], year: s[3] });
    });
    return rooms;
  }

  var state = { rooms: buildRooms(), log: [], tab: "Boys" };

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.rooms && parsed.log) {
          state.rooms = parsed.rooms;
          state.log = parsed.log;
        }
      }
    } catch (e) { /* storage unavailable - sample data chalega */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ rooms: state.rooms, log: state.log })); }
    catch (e) { /* ignore */ }
  }

  function floorName(f) { return f === 0 ? "Ground" : f === 1 ? "1st" : "2nd"; }

  // ---- Scoring: preference + roommate compatibility ----
  function score(room, s) {
    var pts = 0, why = [];
    var free = room.capacity - room.occupants.length;
    if (free <= 0) return null;

    if (s.floor !== "any" && String(room.floor) === s.floor) { pts += 30; why.push("preferred floor"); }
    if (s.seater !== "any" && String(room.capacity) === s.seater) { pts += 25; why.push(room.capacity + "-seater as requested"); }

    var sameCourse = room.occupants.filter(function (o) { return o.course === s.course; }).length;
    var sameYear = room.occupants.filter(function (o) { return o.year === s.year; }).length;
    if (sameCourse) { pts += 15 * sameCourse; why.push("roommate(s) from same course"); }
    if (sameYear) { pts += 10 * sameYear; why.push("same year roommate(s)"); }

    // Fill partly-occupied rooms first so empty rooms stay available for later
    if (room.occupants.length > 0) { pts += 8; why.push("fills a partly occupied room"); }
    // Ground floor for students who need it
    if (s.ground && room.floor === 0) { pts += 40; why.push("ground floor (special need)"); }
    return { pts: pts, why: why, room: room };
  }

  function allocate(s) {
    var candidates = state.rooms
      .filter(function (r) { return r.block === s.gender; })
      .map(function (r) { return score(r, s); })
      .filter(Boolean)
      .sort(function (a, b) { return b.pts - a.pts; });
    return candidates[0] || null;
  }

  // ---- Rendering ----
  function $(id) { return document.getElementById(id); }

  function renderStats() {
    var total = 0, taken = 0;
    state.rooms.forEach(function (r) { total += r.capacity; taken += r.occupants.length; });
    $("stTotal").textContent = total;
    $("stTaken").textContent = taken;
    $("stFree").textContent = total - taken;
    $("stRooms").textContent = state.rooms.filter(function (r) { return r.occupants.length < r.capacity; }).length;
  }

  function renderRooms(flashId) {
    var grid = $("roomGrid");
    grid.innerHTML = "";
    state.rooms.filter(function (r) { return r.block === state.tab; }).forEach(function (r) {
      var full = r.occupants.length >= r.capacity;
      var div = document.createElement("div");
      div.className = "room" + (full ? " full" : "") + (r.id === flashId ? " flash" : "");
      var beds = "";
      for (var i = 0; i < r.capacity; i++) {
        beds += '<span class="bed' + (i < r.occupants.length ? " taken" : "") + '"></span>';
      }
      div.innerHTML =
        '<span class="tag ' + (full ? "full" : "ok") + '">' + (full ? "FULL" : (r.capacity - r.occupants.length) + " free") + "</span>" +
        '<div class="no">' + r.id + "</div>" +
        '<div class="meta">' + floorName(r.floor) + " floor · " + r.capacity + "-seater</div>" +
        '<div class="beds" aria-hidden="true">' + beds + "</div>";
      div.title = r.occupants.map(function (o) { return o.name; }).join(", ") || "Empty room";
      grid.appendChild(div);
    });
  }

  function renderLog() {
    var body = $("logBody");
    body.innerHTML = "";
    if (!state.log.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Abhi tak koi allocation nahi hua. Left form se room allot karein.</td></tr>';
      return;
    }
    state.log.slice().reverse().slice(0, 8).forEach(function (l) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + esc(l.name) + "</td><td>" + esc(l.course) + " (Yr " + esc(l.year) + ")</td><td><b>" + l.room + "</b></td><td>" + l.block + "</td><td>" + esc(l.time) + "</td>";
      body.appendChild(tr);
    });
  }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showResult(html, isError) {
    var box = $("result");
    box.className = "al-result show" + (isError ? " error" : "");
    box.innerHTML = html;
  }

  // ---- Events ----
  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var s = {
      name: form.name.value.trim(),
      gender: form.gender.value,
      course: form.course.value,
      year: form.year.value,
      floor: form.floor.value,
      seater: form.seater.value,
      ground: form.ground.checked
    };
    if (!s.name || !s.gender || !s.course || !s.year) {
      showResult("<b>Form adhura hai.</b> Name, gender, course aur year bharna zaroori hai.", true);
      return;
    }
    var best = allocate(s);
    if (!best) {
      showResult("<b>" + s.gender + " block me koi room khali nahi hai.</b> Warden se waiting list ke liye sampark karein.", true);
      return;
    }
    var room = best.room;
    var mates = room.occupants.map(function (o) { return o.name; });
    room.occupants.push({ name: s.name, course: s.course, year: s.year });
    state.log.push({
      name: s.name, course: s.course, year: s.year, room: room.id, block: room.block,
      time: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    });
    save();

    state.tab = room.block;
    syncTabs();
    renderStats();
    renderRooms(room.id);
    renderLog();

    showResult(
      "<h4>Room allot ho gaya: " + room.id + "</h4><dl>" +
      "<dt>Student</dt><dd>" + esc(s.name) + "</dd>" +
      "<dt>Block / Floor</dt><dd>" + room.block + " · " + floorName(room.floor) + " floor</dd>" +
      "<dt>Room type</dt><dd>" + room.capacity + "-seater</dd>" +
      "<dt>Roommates</dt><dd>" + (mates.length ? esc(mates.join(", ")) : "Abhi koi nahi") + "</dd></dl>" +
      '<div class="al-why">Kyun yeh room: ' + (best.why.length ? best.why.join(", ") : "sabse best available option") + ".</div>"
    );
    form.reset();
  }

  function syncTabs() {
    document.querySelectorAll(".al-tab").forEach(function (t) {
      var on = t.getAttribute("data-tab") === state.tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function init() {
    load();
    document.querySelectorAll(".al-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        state.tab = t.getAttribute("data-tab");
        syncTabs();
        renderRooms();
      });
    });
    $("allocForm").addEventListener("submit", onSubmit);
    $("resetBtn").addEventListener("click", function () {
      state.rooms = buildRooms();
      state.log = [];
      save();
      $("result").className = "al-result";
      renderStats(); renderRooms(); renderLog();
    });
    syncTabs();
    renderStats();
    renderRooms();
    renderLog();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
