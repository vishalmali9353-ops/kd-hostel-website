/* 24/7 Student Support - frontend only (chat bot scripted hai, tickets browser me save hote hain) */
(function () {
  "use strict";

  var STORE_KEY = "kd_support_tickets_v1";

  // Chat bot ke answers - apne hostel ke hisaab se edit karein
  var ANSWERS = [
    { keys: ["mess", "food", "khana", "menu"], text: "Mess ka menu aur timing Mess Management page par milega. Khane ki complaint ke liye neeche ticket raise karein." },
    { keys: ["fee", "payment", "pay", "receipt"], text: "Fee dues aur receipt Fee Management page par dekh sakte hain. Payment problem ho to ticket me 'Fee' category chunein." },
    { keys: ["room", "allot", "allocation", "shift"], text: "Room allotment Smart Room Allocation page se hota hai. Room change ke liye ticket me 'Room' category chunein." },
    { keys: ["wifi", "internet", "net"], text: "Wi-Fi issue ke liye router restart check karein. Phir bhi problem ho to 'Maintenance' category me ticket raise karein." },
    { keys: ["visitor", "guest", "mehman"], text: "Visitor entry gate par register hoti hai. Details Visitor Management page par hain." },
    { keys: ["emergency", "medical", "doctor", "fire", "urgent"], text: "Emergency me turant warden ko call karein ya 112 dial karein. Upar emergency numbers diye gaye hain." },
    { keys: ["hello", "hi", "hey", "namaste"], text: "Namaste! Mess, fee, room, Wi-Fi ya visitor ke baare me pooch sakte hain." }
  ];
  var FALLBACK = "Yeh sawal mujhe samajh nahi aaya. Neeche ticket raise karein - warden team 24 ghante ke andar reply karegi.";

  var tickets = [];

  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadTickets() {
    try { tickets = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { tickets = []; }
  }
  function saveTickets() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tickets)); } catch (e) { /* ignore */ }
  }

  // ---- Chat ----
  function addBubble(text, who) {
    var box = $("chatBox");
    var d = document.createElement("div");
    d.className = "bubble " + who;
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  function reply(q) {
    var s = q.toLowerCase();
    var hit = ANSWERS.filter(function (a) {
      return a.keys.some(function (k) { return s.indexOf(k) !== -1; });
    })[0];
    return hit ? hit.text : FALLBACK;
  }

  function ask(q) {
    q = q.trim();
    if (!q) return;
    addBubble(q, "me");
    setTimeout(function () { addBubble(reply(q), "bot"); }, 350);
  }

  // ---- Tickets ----
  function renderTickets() {
    var box = $("ticketList");
    box.innerHTML = "";
    if (!tickets.length) {
      box.innerHTML = '<p class="text-muted mb-0">Abhi koi ticket nahi hai. Upar form se naya ticket raise karein.</p>';
      return;
    }
    tickets.slice().reverse().slice(0, 6).forEach(function (t) {
      var d = document.createElement("div");
      d.className = "ticket";
      d.innerHTML = "<b>#" + t.id + " · " + esc(t.category) + '</b><span class="status">Open</span>' +
        "<div>" + esc(t.message) + "</div><small>" + esc(t.name) + " · Room " + esc(t.room || "-") + " · " + esc(t.time) + "</small>";
      box.appendChild(d);
    });
  }

  function showMsg(text, ok) {
    var m = $("ticketMsg");
    m.textContent = text;
    m.className = "sp-msg show " + (ok ? "ok" : "err");
  }

  function onTicket(e) {
    e.preventDefault();
    var f = e.target;
    var name = f.sname.value.trim();
    var msg = f.smessage.value.trim();
    if (!name || !msg) { showMsg("Naam aur problem ki details likhna zaroori hai.", false); return; }
    var id = 1001 + tickets.length;
    tickets.push({
      id: id,
      name: name,
      room: f.sroom.value.trim(),
      category: f.scategory.value,
      priority: f.spriority.value,
      message: msg,
      time: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    });
    saveTickets();
    renderTickets();
    showMsg("Ticket #" + id + " raise ho gaya. Warden team jald reply karegi.", true);
    f.reset();
  }

  function init() {
    loadTickets();
    renderTickets();
    addBubble("Namaste! Main K.D. Hostel helper hoon. Mess, fee, room, Wi-Fi ya visitor ke baare me pooch sakte hain.", "bot");

    $("chatForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = $("chatInput");
      ask(inp.value);
      inp.value = "";
    });
    document.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () { ask(c.getAttribute("data-q")); });
    });
    $("ticketForm").addEventListener("submit", onTicket);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
