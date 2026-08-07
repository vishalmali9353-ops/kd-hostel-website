const STORE_KEY = 'kdh_room_allocation_v1';

function defaultData(){
  const blocks = [];
  // Block A (Female), Block B (Male) - gender segregated blocks, mix of 2 & 3 seaters
  const blockDefs = [
    {id:'A1', gender:'F', floor:1, cap:2},
    {id:'A2', gender:'F', floor:1, cap:2},
    {id:'A3', gender:'F', floor:1, cap:3},
    {id:'A4', gender:'F', floor:2, cap:3},
    {id:'B1', gender:'M', floor:1, cap:2},
    {id:'B2', gender:'M', floor:1, cap:3},
    {id:'B3', gender:'M', floor:2, cap:2},
    {id:'B4', gender:'M', floor:2, cap:3},
  ];
  blockDefs.forEach(b=>blocks.push({...b, occupants:[]}));
  return { rooms: blocks, queue: [] };
}

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) { const d = defaultData(); save(d); return d; }
    return JSON.parse(raw);
  }catch(e){ const d = defaultData(); save(d); return d; }
}
function save(d){ localStorage.setItem(STORE_KEY, JSON.stringify(d)); }

let data = load();

function addStudent(){
  const name = document.getElementById('s-name').value.trim();
  const gender = document.getElementById('s-gender').value;
  const year = document.getElementById('s-year').value.trim() || '—';
  const pref = document.getElementById('s-pref').value;
  const msg = document.getElementById('add-msg');
  if(!name){ msg.textContent = 'Enter a student name first.'; msg.className='msg err'; return; }
  data.queue.push({ id: 'q'+Date.now()+Math.random().toString(36).slice(2,6), name, gender, year, pref });
  save(data);
  document.getElementById('s-name').value='';
  msg.textContent = name + ' added to queue.';
  msg.className='msg';
  render();
}

function bestRoomFor(student){
  // gender match, then prefer matching room-type pref, then most-empty room first (balance), fallback any capacity
  const candidates = data.rooms.filter(r => r.gender === student.gender && r.occupants.length < r.cap);
  if(candidates.length === 0) return null;
  let pool = candidates;
  if(student.pref !== 'any'){
    const prefMatch = candidates.filter(r => String(r.cap) === student.pref);
    if(prefMatch.length) pool = prefMatch;
  }
  pool.sort((a,b) => (a.cap - a.occupants.length) < (b.cap - b.occupants.length) ? 1 : -1); // most free slots first for balance... actually prefer filling rooms already partially filled
  pool.sort((a,b) => a.occupants.length === 0 && b.occupants.length !== 0 ? 1 : (a.occupants.length !== 0 && b.occupants.length === 0 ? -1 : 0));
  return pool[0];
}

function allocateStudent(qid){
  const idx = data.queue.findIndex(s=>s.id===qid);
  if(idx<0) return;
  const student = data.queue[idx];
  const room = bestRoomFor(student);
  if(!room){
    const msg = document.getElementById('add-msg');
    msg.textContent = 'No available ' + (student.gender==='F'?'female':'male') + ' room right now for ' + student.name + '.';
    msg.className = 'msg err';
    return;
  }
  room.occupants.push({ name: student.name, year: student.year, gender: student.gender });
  data.queue.splice(idx,1);
  save(data);
  render();
}

function autoAllocateAll(){
  const ids = data.queue.map(s=>s.id);
  let allocated = 0;
  ids.forEach(id=>{
    const before = data.queue.length;
    allocateStudent(id);
    if(data.queue.length < before) allocated++;
  });
  const msg = document.getElementById('add-msg');
  msg.textContent = allocated + ' student(s) auto-allocated.';
  msg.className = 'msg';
}

function vacate(roomId, occIdx){
  const room = data.rooms.find(r=>r.id===roomId);
  if(!room) return;
  room.occupants.splice(occIdx,1);
  save(data);
  render();
}

function resetAll(){
  if(!confirm('Reset all rooms and queue to demo defaults?')) return;
  data = defaultData();
  save(data);
  render();
}

function render(){
  // stats
  const totalCap = data.rooms.reduce((s,r)=>s+r.cap,0);
  const totalOcc = data.rooms.reduce((s,r)=>s+r.occupants.length,0);
  const full = data.rooms.filter(r=>r.occupants.length>=r.cap).length;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><b>${data.rooms.length}</b><span>Total rooms</span></div>
    <div class="stat"><b>${totalOcc}/${totalCap}</b><span>Beds filled</span></div>
    <div class="stat"><b>${full}</b><span>Full rooms</span></div>
    <div class="stat"><b>${data.queue.length}</b><span>In queue</span></div>
  `;

  // queue
  document.getElementById('queue-count').textContent = data.queue.length;
  const ql = document.getElementById('queue-list');
  ql.innerHTML = data.queue.length === 0
    ? '<div class="empty-slot">Queue is empty — add a student above.</div>'
    : data.queue.map(s=>`
      <div class="queue-item">
        <span><span class="tag ${s.gender==='F'?'f':'m'}">${s.gender==='F'?'F':'M'}</span>&nbsp; ${s.name} · ${s.year} · pref ${s.pref==='any'?'any':s.pref+'-seater'}</span>
        <button class="small" onclick="allocateStudent('${s.id}')">Allocate</button>
      </div>`).join('');

  // block filter options
  const blockFilter = document.getElementById('block-filter');
  const blocks = [...new Set(data.rooms.map(r=>r.id[0]))];
  const currentVal = blockFilter.value;
  blockFilter.innerHTML = '<option value="all">All blocks</option>' + blocks.map(b=>`<option value="${b}">Block ${b}</option>`).join('');
  blockFilter.value = currentVal || 'all';

  // rooms grid
  const filterVal = blockFilter.value;
  const rooms = data.rooms.filter(r => filterVal==='all' || r.id[0]===filterVal);
  document.getElementById('room-grid').innerHTML = rooms.map(r=>{
    const pct = Math.round((r.occupants.length/r.cap)*100);
    const occHtml = r.occupants.length
      ? r.occupants.map((o,i)=>`<div class="occupant"><span>${o.name} · ${o.year}</span><button class="small ghost" onclick="vacate('${r.id}',${i})">Vacate</button></div>`).join('')
      : '<div class="empty-slot">No occupants yet</div>';
    return `<div class="room">
      <div class="room-head"><b>Room ${r.id}</b><span>${r.gender==='F'?'Female':'Male'} · Floor ${r.floor} · ${r.cap}-seater</span></div>
      <div class="occ-bar"><div class="occ-fill ${pct>=100?'full':''}" style="width:${pct}%"></div></div>
      ${occHtml}
    </div>`;
  }).join('');
}

render();
