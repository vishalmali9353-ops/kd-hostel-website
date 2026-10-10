/* Smart Room Allocation - FINAL frontend 
 * Sirf frontend: data browser ke localStorage me save hota hai.
 * Backend baad me jodna ho to sirf neeche "DATA LAYER" section badalna hai
 * (load/save ko fetch() calls se replace karein). Baaki UI code wahi rahega.
 */
(function () {
  "use strict";

  /* ================= CONFIG ================= */
  // Boys 32 rooms (96 beds), Girls 28 rooms (84 beds), sab 3-seater.
  // Floor-wise split sample hai - apne hostel ke hisaab se badal lein.
  var HOSTEL = [
    { block: "Boys",  prefix: "B", perFloor: [11, 11, 10] },
    { block: "Girls", prefix: "G", perFloor: [10, 9, 9] }
  ];
  var SEATS_PER_ROOM = 3;

  /* ================= DATA LAYER (backend yahan jodna) ================= */
  var STORE_KEY = "kd_allocation_final_v1";

  var Data = {
    // Baad me: return fetch("/api/allocation").then(r => r.json());
    load: function () {
      try {
        var p = JSON.parse(localStorage.getItem(STORE_KEY));
        if (p && p.rooms && p.log && p.waitlist) return p;
      } catch (e) { /* storage unavailable */ }
      return null;
    },
    // Baad me: fetch("/api/allocation", { method: "POST", body: JSON.stringify(state) })
    save: function (st) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ rooms: st.rooms, log: st.log, waitlist: st.waitlist }));
      } catch (e) { /* ignore */ }
    }
  };

  /* ================= SEED (demo data) ================= */
  function buildRooms() {
    var rooms = [];
    HOSTEL.forEach(function (b) {
      b.perFloor.forEach(function (count, floor) {
        for (var n = 1; n <= count; n++) {
          rooms.push({
            id: b.prefix + floor + (n < 10 ? "0" + n : "" + n),
            block: b.block, floor: floor, capacity: SEATS_PER_ROOM, occupants: []
          });
        }
      });
    });
    var seed = [
      ["B001", "Rahul Patel", "DEMO101", "Diploma Computer", "1"],
      ["B002", "Jay Shah", "DEMO102", "Diploma Civil", "2"],
      ["B002", "Dhruv Mehta", "DEMO103", "Diploma Civil", "2"],
      ["B101", "Karan Thakkar", "DEMO104", "Diploma Computer", "2"],
      ["B103", "Het Raval", "DEMO105", "Diploma Mechanical", "3"],
      ["B103", "Om Vyas", "DEMO106", "Diploma Mechanical", "3"],
      ["B103", "Yash Desai", "DEMO107", "Diploma Mechanical", "3"],
      ["G001", "Priya Solanki", "DEMO201", "Diploma Computer", "1"],
      ["G002", "Neha Parmar", "DEMO202", "Diploma Electrical", "2"],
      ["G002", "Riya Modi", "DEMO203", "Diploma Electrical", "2"],
      ["G101", "Kinjal Brahmbhatt", "DEMO204", "Diploma Civil", "1"]
    ];
    seed.forEach(function (s) {
      var r = rooms.filter(function (x) { return x.id === s[0]; })[0];
      if (r) r.occupants.push({ name: s[1], enroll: s[2], course: s[3], year: s[4] });
    });
    return rooms;
  }

  var state = { rooms: [], log: [], waitlist: [], tab: "Boys", floor: "all", search: "", selected: null };

  function resetState() {
    state.rooms = buildRooms();
    state.log = [];
    state.waitlist = [];
    state.selected = null;
  }

  /* ================= HELPERS ================= */
  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function floorName(f) { return f === 0 ? "Ground" : f === 1 ? "1st" : "2nd"; }
  function nowText() {
    return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function findRoom(id) { return state.rooms.filter(function (r) { return r.id === id; })[0]; }
  function exists(enroll) {
    var e = enroll.toLowerCase();
    var inRoom = state.rooms.some(function (r) {
      return r.occupants.some(function (o) { return o.enroll.toLowerCase() === e; });
    });
    var inWait = state.waitlist.some(function (w) { return w.enroll.toLowerCase() === e; });
    return inRoom || inWait;
  }

  /* ================= ALLOCATION LOGIC ================= */
  function score(room, s) {
    var free = room.capacity - room.occupants.length;
    if (free <= 0) return null;
    var pts = 0, why = [];
    if (s.floor !== "any" && String(room.floor) === s.floor) { pts += 30; why.push("preferred floor"); }
    var sameCourse = room.occupants.filter(function (o) { return o.course === s.course; }).length;
    var sameYear = room.occupants.filter(function (o) { return o.year === s.year; }).length;
    if (sameCourse) { pts += 15 * sameCourse; why.push("roommate(s) from same course"); }
    if (sameYear) { pts += 10 * sameYear; why.push("same year roommate(s)"); }
    if (room.occupants.length > 0) { pts += 8; why.push("fills a partly occupied room"); }
    if (s.ground && room.floor === 0) { pts += 40; why.push("ground floor (special need)"); }
    return { pts: pts, why: why, room: room };
  }

  function bestRoom(s) {
    var list = state.rooms
      .filter(function (r) { return r.block === s.gender; })
      .map(function (r) { return score(r, s); })
      .filter(Boolean)
      .sort(function (a, b) { return b.pts - a.pts; });
    return list[0] || null;
  }

  function place(s, best) {
    var room = best.room;
    var mates = room.occupants.map(function (o) { return o.name; });
    room.occupants.push({ name: s.name, enroll: s.enroll, course: s.course, year: s.year });
    state.log.push({ name: s.name, course: s.course, year: s.year, room: room.id, block: room.block, time: nowText() });
    return mates;
  }

  // Room khali hone par usi block ke waiting students ko auto allot
  function promoteWaitlist(block) {
    var promoted = [];
    var i = 0;
    while (i < state.waitlist.length) {
      var w = state.waitlist[i];
      if (w.gender === block) {
        var best = bestRoom(w);
        if (best) {
          place(w, best);
          promoted.push(w.name + " → " + best.room.id);
          state.waitlist.splice(i, 1);
          continue;
        }
      }
      i++;
    }
    return promoted;
  }

  /* ================= RENDER ================= */
  function renderStats() {
    var total = 0, taken = 0, byBlock = { Boys: [0, 0], Girls: [0, 0] };
    state.rooms.forEach(function (r) {
      total += r.capacity; taken += r.occupants.length;
      byBlock[r.block][0] += r.capacity; byBlock[r.block][1] += r.occupants.length;
    });
    $("stTotal").textContent = total;
    $("stTaken").textContent = taken;
    $("stFree").textContent = total - taken;
    $("stWait").textContent = state.waitlist.length;
    ["Boys", "Girls"].forEach(function (b) {
      var cap = byBlock[b][0], used = byBlock[b][1], pct = cap ? Math.round(used * 100 / cap) : 0;
      $("occ" + b + "Txt").textContent = used + " / " + cap + " beds (" + pct + "%)";
      var bar = $("occ" + b + "Bar");
      bar.firstElementChild.style.width = pct + "%";
      bar.className = "occ-bar" + (pct >= 90 ? " high" : "");
      bar.setAttribute("aria-valuenow", pct);
      bar.setAttribute("aria-valuemin", 0);
      bar.setAttribute("aria-valuemax", 100);
    });
  }

  function matchesSearch(r) {
    var q = state.search.toLowerCase();
    if (!q) return false;
    return r.id.toLowerCase().indexOf(q) !== -1 ||
      r.occupants.some(function (o) {
        return o.name.toLowerCase().indexOf(q) !== -1 || o.enroll.toLowerCase().indexOf(q) !== -1;
      });
  }

  function renderRooms(flashId) {
    var grid = $("roomGrid");
    grid.innerHTML = "";
    var rooms = state.rooms.filter(function (r) {
      return r.block === state.tab && (state.floor === "all" || String(r.floor) === state.floor);
    });
    if (!rooms.length) { grid.innerHTML = '<p class="text-muted mb-0">Is filter me koi room nahi hai.</p>'; return; }

    rooms.forEach(function (r) {
      var full = r.occupants.length >= r.capacity;
      var m = matchesSearch(r);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room" + (full ? " full" : "") + (r.id === flashId ? " flash" : "") +
        (r.id === state.selected ? " selected" : "") +
        (state.search ? (m ? " match" : " dim") : "");
      var beds = "";
      for (var i = 0; i < r.capacity; i++) beds += '<span class="bed' + (i < r.occupants.length ? " taken" : "") + '"></span>';
      btn.innerHTML =
        '<span class="tag ' + (full ? "full" : "ok") + '">' + (full ? "FULL" : (r.capacity - r.occupants.length) + " free") + "</span>" +
        '<div class="no">' + r.id + "</div>" +
        '<div class="meta">' + floorName(r.floor) + " floor · " + r.capacity + "-seater</div>" +
        '<div class="beds" aria-hidden="true">' + beds + "</div>";
      btn.setAttribute("aria-label", "Room " + r.id + ", " + r.occupants.length + " of " + r.capacity + " beds occupied");
      btn.addEventListener("click", function () {
        state.selected = state.selected === r.id ? null : r.id;
        renderRooms(); renderDetail();
      });
      grid.appendChild(btn);
    });
  }

  function renderDetail() {
    var box = $("roomDetail");
    box.innerHTML = "";
    var r = state.selected ? findRoom(state.selected) : null;
    if (!r) return;
    var html = '<div class="box"><h4>Room ' + r.id + " · " + r.block + " block · " + floorName(r.floor) + " floor</h4>";
    if (!r.occupants.length) {
      html += '<p class="text-muted mb-0">Yeh room abhi khali hai.</p>';
    } else {
      r.occupants.forEach(function (o, i) {
        html += '<div class="occupant"><div><b>' + esc(o.name) + "</b><small>" + esc(o.enroll) + " · " + esc(o.course) + " · Year " + esc(o.year) +
          '</small></div><button type="button" class="btn-vacate" data-i="' + i + '">Vacate</button></div>';
      });
    }
    html += "</div>";
    box.innerHTML = html;
    box.querySelectorAll(".btn-vacate").forEach(function (b) {
      b.addEventListener("click", function () { vacate(r.id, Number(b.getAttribute("data-i"))); });
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

  function renderWait() {
    var ul = $("waitList");
    ul.innerHTML = "";
    if (!state.waitlist.length) { ul.innerHTML = '<li class="text-muted">Waiting list khali hai.</li>'; return; }
    state.waitlist.forEach(function (w, i) {
      var li = document.createElement("li");
      li.innerHTML = "<b>" + (i + 1) + ". " + esc(w.name) + "</b><small>" + w.gender + " block · " + esc(w.course) + " · Year " + esc(w.year) + "</small>";
      ul.appendChild(li);
    });
  }

  function renderAll(flashId) {
    renderStats(); renderRooms(flashId); renderDetail(); renderLog(); renderWait();
  }

  function syncTabs() {
    document.querySelectorAll(".al-tab").forEach(function (t) {
      var on = t.getAttribute("data-tab") === state.tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function showResult(html, kind) {
    var box = $("result");
    box.className = "al-result show" + (kind === "error" ? " error" : "");
    box.innerHTML = html;
  }

  /* ================= ACTIONS ================= */
  function vacate(roomId, idx) {
    var r = findRoom(roomId);
    if (!r || !r.occupants[idx]) return;
    var gone = r.occupants.splice(idx, 1)[0];
    var promoted = promoteWaitlist(r.block);
    save();
    renderAll();
    showResult(
      "<h4>" + esc(gone.name) + " ne room " + r.id + " khali kiya</h4>" +
      (promoted.length ? '<div class="al-why">Waiting list se allot: ' + esc(promoted.join(", ")) + ".</div>" : '<div class="al-why">Ab ek bed available hai.</div>')
    );
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = e.target;
    var s = {
      name: f.name.value.trim(), enroll: f.enroll.value.trim(), gender: f.gender.value,
      course: f.course.value, year: f.year.value, floor: f.floor.value, ground: f.ground.checked
    };
    if (!s.name || !s.enroll || !s.gender || !s.course || !s.year) {
      showResult("<b>Form adhura hai.</b> Name, enrollment no., block, course aur year bharna zaroori hai.", "error");
      return;
    }
    if (exists(s.enroll)) {
      showResult("<b>Yeh enrollment no. pehle se allot ya waiting list me hai.</b> Duplicate allotment nahi ho sakta.", "error");
      return;
    }
    var best = bestRoom(s);
    if (!best) {
      state.waitlist.push(s);
      save(); renderAll();
      showResult("<h4>" + s.gender + " block full hai</h4>" + esc(s.name) + " ko waiting list me add kiya gaya (number " + state.waitlist.length + "). Room khali hote hi automatic allot hoga.", "error");
      f.reset();
      return;
    }
    var mates = place(s, best);
    var room = best.room;
    state.tab = room.block;
    state.selected = room.id;
    save();
    syncTabs();
    renderAll(room.id);
    showResult(
      "<h4>Room allot ho gaya: " + room.id + "</h4><dl>" +
      "<dt>Student</dt><dd>" + esc(s.name) + " (" + esc(s.enroll) + ")</dd>" +
      "<dt>Block / Floor</dt><dd>" + room.block + " · " + floorName(room.floor) + " floor</dd>" +
      "<dt>Room type</dt><dd>" + room.capacity + "-seater</dd>" +
      "<dt>Roommates</dt><dd>" + (mates.length ? esc(mates.join(", ")) : "Abhi koi nahi") + "</dd></dl>" +
      '<div class="al-why">Kyun yeh room: ' + (best.why.length ? best.why.join(", ") : "sabse best available option") + ".</div>"
    );
    f.reset();
  }

  function save() { Data.save(state); }

  /* ================= INIT ================= */
  function init() {
    var saved = Data.load();
    if (saved) { state.rooms = saved.rooms; state.log = saved.log; state.waitlist = saved.waitlist; }
    else { resetState(); }

    document.querySelectorAll(".al-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        state.tab = t.getAttribute("data-tab");
        state.selected = null;
        syncTabs(); renderRooms(); renderDetail();
      });
    });
    $("floorFilter").addEventListener("change", function (e) { state.floor = e.target.value; renderRooms(); });
    $("searchBox").addEventListener("input", function (e) {
      state.search = e.target.value.trim();
      // Search match kisi aur block me ho to wahan switch karo
      if (state.search) {
        var hit = state.rooms.filter(matchesSearch)[0];
        if (hit && hit.block !== state.tab) { state.tab = hit.block; syncTabs(); }
      }
      renderRooms();
    });
    $("allocForm").addEventListener("submit", onSubmit);
    $("resetBtn").addEventListener("click", function () {
      resetState(); save();
      $("result").className = "al-result";
      renderAll();
    });

    syncTabs();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
