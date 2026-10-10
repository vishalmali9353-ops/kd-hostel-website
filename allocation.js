/* Smart Room Allocation - backend connected version
 * Data ab Render backend (MongoDB) se aata hai.
 * Room allot / vacate / reset aur student details ke liye Faculty login zaroori hai.
 * allocation.html aur allocation.css me koi change nahi chahiye.
 */
(function () {
  "use strict";

  /* ================= CONFIG ================= */
  var API = "https://kd-hostel-backend.onrender.com";
  var LOGIN_URL = API + "/login";

  var state = {
    stats: null, rooms: [], log: [], waitlist: [],
    faculty: false, tab: "Boys", floor: "all", search: "", selected: null
  };

  /* ================= HELPERS ================= */
  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function floorName(f) { return f === 0 ? "Ground" : f === 1 ? "1st" : "2nd"; }
  function timeText(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function findRoom(no) { return state.rooms.filter(function (r) { return r.room_no === no; })[0]; }
  function loginLink(text) { return '<a href="' + LOGIN_URL + '">' + text + "</a>"; }

  /* ================= API LAYER ================= */
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: "include", headers: {} };
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return fetch(API + path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function loadAll(flashId) {
    return Promise.all([
      api("/api/room-stats"),
      api("/api/rooms"),
      api("/api/allocations/recent?limit=8"),
      api("/api/waiting")
    ]).then(function (r) {
      if (!r[0].ok || !r[1].ok) throw new Error("server");
      state.stats = r[0].data;
      state.rooms = r[1].data.rooms || [];
      state.faculty = r[2].status !== 401;
      state.log = r[2].ok ? (r[2].data.allocations || []) : [];
      state.waitlist = r[3].ok ? (r[3].data.waiting || []) : [];
      renderAll(flashId);
    }).catch(showLoadError);
  }

  /* ================= RENDER ================= */
  function renderStats() {
    var s = state.stats;
    if (!s) return;
    $("stTotal").textContent = s.total_beds;
    $("stTaken").textContent = s.occupied;
    $("stFree").textContent = s.available;
    $("stWait").textContent = s.waiting;
    ["Boys", "Girls"].forEach(function (b) {
      var d = (s.blocks && s.blocks[b]) || { total: 0, occupied: 0, percent: 0 };
      $("occ" + b + "Txt").textContent = d.occupied + " / " + d.total + " beds (" + d.percent + "%)";
      var bar = $("occ" + b + "Bar");
      bar.firstElementChild.style.width = d.percent + "%";
      bar.className = "occ-bar" + (d.percent >= 90 ? " high" : "");
      bar.setAttribute("aria-valuenow", d.percent);
      bar.setAttribute("aria-valuemin", 0);
      bar.setAttribute("aria-valuemax", 100);
    });
  }

  function matchesSearch(r) {
    var q = state.search.toLowerCase();
    if (!q) return false;
    return r.room_no.toLowerCase().indexOf(q) !== -1 ||
      (r.students || []).some(function (o) { return (o.name || "").toLowerCase().indexOf(q) !== -1; });
  }

  function renderRooms(flashId) {
    var grid = $("roomGrid");
    grid.innerHTML = "";
    var rooms = state.rooms.filter(function (r) {
      return r.block === state.tab && (state.floor === "all" || String(r.floor) === state.floor);
    });
    if (!rooms.length) {
      grid.innerHTML = '<p class="text-muted mb-0">Is filter me koi room nahi hai.</p>';
      return;
    }

    rooms.forEach(function (r) {
      var closed = r.status === "Under Maintenance";
      var full = r.free <= 0;
      var m = matchesSearch(r);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room" + (full || closed ? " full" : "") + (r.room_no === flashId ? " flash" : "") +
        (r.room_no === state.selected ? " selected" : "") +
        (state.search ? (m ? " match" : " dim") : "");
      var beds = "";
      for (var i = 0; i < r.capacity; i++) beds += '<span class="bed' + (i < r.occupied ? " taken" : "") + '"></span>';
      btn.innerHTML =
        '<span class="tag ' + (full || closed ? "full" : "ok") + '">' + (closed ? "Closed" : full ? "FULL" : r.free + " free") + "</span>" +
        '<div class="no">' + esc(r.room_no) + "</div>" +
        '<div class="meta">' + floorName(r.floor) + " floor · " + r.capacity + "-seater</div>" +
        '<div class="beds" aria-hidden="true">' + beds + "</div>";
      btn.setAttribute("aria-label", "Room " + r.room_no + ", " + r.occupied + " of " + r.capacity + " beds occupied");
      btn.addEventListener("click", function () {
        state.selected = state.selected === r.room_no ? null : r.room_no;
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
    var html = '<div class="box"><h4>Room ' + esc(r.room_no) + " · " + esc(r.block) + " block · " + floorName(r.floor) + " floor</h4>";
    if (!state.faculty) {
      html += '<p class="mb-0">' + r.occupied + " / " + r.capacity + " beds bhare hain. Student details dekhne ke liye " + loginLink("Faculty login") + " karein.</p>";
    } else if (!r.students.length) {
      html += '<p class="text-muted mb-0">Yeh room abhi khali hai.</p>';
    } else {
      r.students.forEach(function (o) {
        html += '<div class="occupant"><div><b>' + esc(o.name) + "</b><small>" + esc(o.course) + " · Year " + esc(o.year) +
          '</small></div><button type="button" class="btn-vacate" data-id="' + esc(o.id) + '">Vacate</button></div>';
      });
    }
    html += "</div>";
    box.innerHTML = html;
    box.querySelectorAll(".btn-vacate").forEach(function (b) {
      b.addEventListener("click", function () { vacate(b.getAttribute("data-id")); });
    });
  }

  function renderLog() {
    var body = $("logBody");
    body.innerHTML = "";
    if (!state.faculty) {
      body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Allocation list dekhne ke liye ' + loginLink("Faculty login") + " karein.</td></tr>";
      return;
    }
    if (!state.log.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Abhi tak koi allocation nahi hua. Left form se room allot karein.</td></tr>';
      return;
    }
    state.log.forEach(function (l) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + esc(l.name) + "</td><td>" + esc(l.course) + " (Yr " + esc(l.year) + ")</td><td><b>" +
        esc(l.room_no) + "</b></td><td>" + esc(l.block) + "</td><td>" + esc(timeText(l.time)) + "</td>";
      body.appendChild(tr);
    });
  }

  function renderWait() {
    var ul = $("waitList");
    ul.innerHTML = "";
    if (!state.faculty) {
      ul.innerHTML = '<li class="text-muted">Waiting list dekhne ke liye ' + loginLink("Faculty login") + " karein.</li>";
      return;
    }
    if (!state.waitlist.length) { ul.innerHTML = '<li class="text-muted">Waiting list khali hai.</li>'; return; }
    state.waitlist.forEach(function (w, i) {
      var li = document.createElement("li");
      li.innerHTML = "<b>" + (i + 1) + ". " + esc(w.name) + "</b><small>" + esc(w.block) + " block · " + esc(w.course) + " · Year " + esc(w.year) + "</small>";
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

  function needLogin(soft) {
    showResult(
      "<b>Faculty login zaroori hai.</b> Room allot / vacate karne aur student details dekhne ke liye pehle " +
      loginLink("login") + " karein, fir is page par wapas aayein.",
      soft ? "" : "error"
    );
  }

  function netError() {
    showResult("<b>Server se connect nahi ho paya.</b> Thodi der baad dobara try karein.", "error");
  }

  function showLoadError() {
    $("roomGrid").innerHTML =
      '<p class="text-muted mb-2">Server se connect nahi ho paya.</p>' +
      '<button type="button" class="btn-al" id="retryBtn">Dobara try karein</button>';
    $("retryBtn").addEventListener("click", function () {
      $("roomGrid").innerHTML = '<p class="text-muted mb-0">Rooms load ho rahe hain...</p>';
      loadAll();
    });
  }

  /* ================= ACTIONS ================= */
  function vacate(allocId) {
    if (!allocId || !confirm("Is student ko room se khali karein?")) return;
    api("/api/allocations/" + encodeURIComponent(allocId), { method: "DELETE" }).then(function (r) {
      if (r.status === 401) { state.faculty = false; needLogin(); return; }
      if (!r.ok) { showResult("<b>" + esc(r.data.message || "Room khali nahi ho paya.") + "</b>", "error"); return; }
      showResult("<h4>" + esc(r.data.message) + "</h4>");
      return loadAll();
    }).catch(netError);
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var s = {
      name: $("name").value.trim(), enroll: $("enroll").value.trim(), gender: $("gender").value,
      course: $("course").value, year: $("year").value, floor: $("floor").value, ground: $("ground").checked
    };
    if (!s.name || !s.enroll || !s.gender || !s.course || !s.year) {
      showResult("<b>Form adhura hai.</b> Name, enrollment no., block, course aur year bharna zaroori hai.", "error");
      return;
    }
    if (!/^\d{11}$/.test(s.enroll)) {
      showResult("<b>Enrollment no. 11 digit ka hona chahiye.</b>", "error");
      return;
    }

    var btn = form.querySelector(".btn-al");
    btn.disabled = true;

    api("/api/allocate", {
      method: "POST",
      body: {
        name: s.name, roll_no: s.enroll, block: s.gender, course: s.course,
        year: s.year, floor: s.floor, ground_needed: s.ground
      }
    }).then(function (r) {
      if (r.status === 401) { state.faculty = false; needLogin(); return; }
      if (!r.ok) { showResult("<b>" + esc(r.data.message || "Room allot nahi ho paya.") + "</b>", "error"); return; }

      if (r.data.status === "waiting") {
        return loadAll().then(function () {
          showResult(
            "<h4>" + esc(s.gender) + " block full hai</h4>" + esc(s.name) +
            " ko waiting list me add kiya gaya (number " + state.waitlist.length +
            "). Room khali hote hi automatic allot hoga.", "error"
          );
          form.reset();
        });
      }

      var roomNo = r.data.room_no;
      state.tab = s.gender;
      state.selected = roomNo;
      syncTabs();
      return loadAll(roomNo).then(function () {
        var room = findRoom(roomNo);
        var mates = room ? room.students.slice(0, -1).map(function (o) { return o.name; }) : [];
        showResult(
          "<h4>Room allot ho gaya: " + esc(roomNo) + "</h4><dl>" +
          "<dt>Student</dt><dd>" + esc(s.name) + " (" + esc(s.enroll) + ")</dd>" +
          "<dt>Block / Floor</dt><dd>" + esc(s.gender) + " · " + (room ? floorName(room.floor) : "") + " floor</dd>" +
          "<dt>Room type</dt><dd>" + (room ? room.capacity : 3) + "-seater</dd>" +
          "<dt>Roommates</dt><dd>" + (mates.length ? esc(mates.join(", ")) : "Abhi koi nahi") + "</dd></dl>"
        );
        form.reset();
      });
    }).catch(netError).then(function () { btn.disabled = false; });
  }

  function onReset() {
    if (!confirm("Saara allocation data reset ho jayega. Pakka?")) return;
    api("/api/reset-demo", { method: "POST" }).then(function (r) {
      if (r.status === 401) { state.faculty = false; needLogin(); return; }
      if (!r.ok) { showResult("<b>" + esc(r.data.message || "Reset nahi ho paya.") + "</b>", "error"); return; }
      state.selected = null;
      showResult("<h4>" + esc(r.data.message) + "</h4>");
      return loadAll();
    }).catch(netError);
  }

  /* ================= INIT ================= */
  function init() {
    // Enrollment no.: sirf 11 digit
    var enroll = $("enroll");
    enroll.setAttribute("maxlength", "11");
    enroll.setAttribute("inputmode", "numeric");

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
    $("resetBtn").addEventListener("click", onReset);

    syncTabs();
    $("roomGrid").innerHTML = '<p class="text-muted mb-0">Rooms load ho rahe hain... (server pehli baar jaagne me 30-60 second le sakta hai)</p>';
    loadAll().then(function () {
      if (state.stats && !state.faculty) needLogin(true);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
