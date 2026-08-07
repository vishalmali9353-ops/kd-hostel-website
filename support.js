const CHAT_KEY='kdh_support_chat_v1';
const TICKET_KEY='kdh_support_tickets_v1';

function switchTab(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
}

// ---------- CHAT ----------
const KB = [
  { kw:['mess','food','menu','dinner','lunch','breakfast'], reply:"Mess timings: Breakfast 7:30–9:00 AM, Lunch 12:30–2:00 PM, Dinner 8:00–9:30 PM. The weekly menu is posted on the mess notice board every Sunday." },
  { kw:['wifi','wi-fi','internet','network'], reply:"For Wi-Fi issues: first try reconnecting to 'KDH-Hostel' network. If it persists, I've logged this as a Wi-Fi complaint — check the Tickets tab, or raise one manually with your room number." },
  { kw:['laundry','washing'], reply:"Laundry pickup is Monday, Wednesday and Friday mornings before 8 AM. Drop bags at the ground-floor laundry counter with your room number tagged." },
  { kw:['warden','contact','call'], reply:"You can reach your block warden directly — check the Emergency Contacts tab for numbers. For urgent night-time issues, the Security Gate Desk is available 24/7." },
  { kw:['complaint','issue','problem','broken','not working','raise'], reply:"I can help you log that. Head to the Tickets tab, choose a category, add your room number and a short description — it'll be tracked until resolved." },
  { kw:['fee','payment','due'], reply:"Hostel fee dues can be checked with the accounts office (ground floor, admin block) between 10 AM–4 PM on weekdays." },
  { kw:['leave','outpass','gate pass','permission'], reply:"Gate passes and outings are managed under the Security & Surveillance module — request an out-pass there and your warden will approve it." },
  { kw:['room change','shift room','reallocation'], reply:"Room change requests go through Smart Room Allocation. Speak with your warden to add you back to the allocation queue." },
  { kw:['water','electricity','power','light'], reply:"For electrical or water supply issues, please raise a complaint under 'Electrical' or 'Plumbing' category in the Tickets tab — maintenance responds same day for urgent issues." },
  { kw:['hi','hello','hey'], reply:"Hey! I'm the KD Hostel assistant. Ask me about mess timing, Wi-Fi, laundry, warden contacts, or say 'raise a complaint' to log an issue." },
];

function botReply(text){
  const t = text.toLowerCase();
  for(const entry of KB){
    if(entry.kw.some(k=>t.includes(k))) return entry.reply;
  }
  return "I didn't quite catch that. Try asking about mess timing, Wi-Fi, laundry, or say 'raise a complaint' — or check the Tickets / Contacts tabs above.";
}

function loadChat(){
  try{ return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; }catch(e){ return []; }
}
function saveChat(msgs){ localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); }

let chatLog = loadChat();
if(chatLog.length===0){
  chatLog.push({from:'bot', text:"Hi, I'm your 24/7 hostel assistant. Ask me anything about mess timing, Wi-Fi, laundry, or raise a complaint."});
  saveChat(chatLog);
}

function renderChat(){
  const win = document.getElementById('chat-window');
  win.innerHTML = chatLog.map(m=>`<div class="bubble ${m.from}">${m.text}</div>`).join('');
  win.scrollTop = win.scrollHeight;
}

function pushMessage(from, text){
  chatLog.push({from, text});
  saveChat(chatLog);
  renderChat();
}

function sendMessage(){
  const inp = document.getElementById('chat-in');
  const val = inp.value.trim();
  if(!val) return;
  pushMessage('user', val);
  inp.value='';
  setTimeout(()=>pushMessage('bot', botReply(val)), 350);
}
function sendQuick(text){
  pushMessage('user', text);
  setTimeout(()=>pushMessage('bot', botReply(text)), 350);
}

// ---------- TICKETS ----------
function loadTickets(){
  try{ return JSON.parse(localStorage.getItem(TICKET_KEY)) || []; }catch(e){ return []; }
}
function saveTickets(t){ localStorage.setItem(TICKET_KEY, JSON.stringify(t)); }
let tickets = loadTickets();

function raiseTicket(){
  const cat = document.getElementById('t-cat').value;
  const room = document.getElementById('t-room').value.trim() || '—';
  const desc = document.getElementById('t-desc').value.trim();
  if(!desc){ alert('Please describe the issue.'); return; }
  tickets.unshift({
    id: 'T'+Date.now().toString().slice(-6),
    cat, room, desc,
    status: 'open',
    date: new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short'})
  });
  saveTickets(tickets);
  document.getElementById('t-desc').value='';
  document.getElementById('t-room').value='';
  renderTickets();
}

function cycleStatus(id){
  const t = tickets.find(x=>x.id===id);
  if(!t) return;
  t.status = t.status==='open' ? 'progress' : (t.status==='progress' ? 'resolved' : 'resolved');
  saveTickets(tickets);
  renderTickets();
}
function deleteTicket(id){
  tickets = tickets.filter(x=>x.id!==id);
  saveTickets(tickets);
  renderTickets();
}

function renderTickets(){
  document.getElementById('t-count').textContent = tickets.length;
  const list = document.getElementById('ticket-list');
  list.innerHTML = tickets.length===0
    ? '<div style="font-size:13px;color:var(--cream-dim);font-style:italic;">No complaints raised yet.</div>'
    : tickets.map(t=>`
      <div class="ticket">
        <div class="ticket-top">
          <b>${t.id} · ${t.cat}</b>
          <span class="status ${t.status}">${t.status==='progress'?'in progress':t.status}</span>
        </div>
        <div class="ticket-meta">Room ${t.room} · Raised ${t.date}</div>
        <div class="ticket-desc">${t.desc}</div>
        <div class="ticket-actions">
          ${t.status!=='resolved' ? `<button class="ghost" onclick="cycleStatus('${t.id}')">Mark ${t.status==='open'?'in progress':'resolved'}</button>` : ''}
          <button class="ghost" onclick="deleteTicket('${t.id}')">Remove</button>
        </div>
      </div>`).join('');
}

renderChat();
renderTickets();
