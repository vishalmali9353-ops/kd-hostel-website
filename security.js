const V_KEY='kdh_sec_visitors_v1', P_KEY='kdh_sec_passes_v1', I_KEY='kdh_sec_incidents_v1', C_KEY='kdh_sec_cameras_v1';

function switchTab(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
}
function timeNow(){ return new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
function loadJSON(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) || fallback; }catch(e){ return fallback; } }
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// ---- Visitors ----
let visitors = loadJSON(V_KEY, []);
function logVisitor(){
  const name = document.getElementById('v-name').value.trim();
  const student = document.getElementById('v-student').value.trim();
  const purpose = document.getElementById('v-purpose').value.trim() || '—';
  const idType = document.getElementById('v-id').value;
  if(!name || !student){ alert('Enter visitor name and the student being visited.'); return; }
  visitors.unshift({ id:'V'+Date.now().toString().slice(-6), name, student, purpose, idType, inTime: timeNow(), outTime:null });
  saveJSON(V_KEY, visitors);
  document.getElementById('v-name').value=''; document.getElementById('v-student').value=''; document.getElementById('v-purpose').value='';
  renderVisitors();
}
function markExit(id){
  const v = visitors.find(x=>x.id===id);
  if(v){ v.outTime = timeNow(); saveJSON(V_KEY, visitors); renderVisitors(); }
}
function renderVisitors(){
  document.getElementById('v-count').textContent = visitors.length;
  document.getElementById('visitor-list').innerHTML = visitors.length===0
    ? '<div style="font-size:13px;color:var(--cream-dim);font-style:italic;">No visitors logged yet.</div>'
    : visitors.map(v=>`
      <div class="entry">
        <div class="entry-top"><b>${v.name}</b><span class="badge ${v.outTime?'out':'in'}">${v.outTime?'checked out':'inside'}</span></div>
        <div class="meta">Visiting ${v.student} · ${v.purpose} · ID: ${v.idType}</div>
        <div class="meta">In: ${v.inTime}${v.outTime ? ' · Out: '+v.outTime : ''}</div>
        ${!v.outTime ? `<div class="actions"><button class="small" onclick="markExit('${v.id}')">Mark exit</button></div>` : ''}
      </div>`).join('');
}

// ---- Gate passes ----
let passes = loadJSON(P_KEY, []);
function requestPass(){
  const name = document.getElementById('p-name').value.trim();
  const room = document.getElementById('p-room').value.trim() || '—';
  const reason = document.getElementById('p-reason').value.trim() || '—';
  const ret = document.getElementById('p-return').value;
  if(!name){ alert('Enter the student name.'); return; }
  passes.unshift({ id:'P'+Date.now().toString().slice(-6), name, room, reason, ret, status:'pending' });
  saveJSON(P_KEY, passes);
  document.getElementById('p-name').value=''; document.getElementById('p-reason').value=''; document.getElementById('p-return').value='';
  renderPasses();
}
function decidePass(id, decision){
  const p = passes.find(x=>x.id===id);
  if(p){ p.status = decision; saveJSON(P_KEY, passes); renderPasses(); }
}
function renderPasses(){
  document.getElementById('p-count').textContent = passes.length;
  document.getElementById('pass-list').innerHTML = passes.length===0
    ? '<div style="font-size:13px;color:var(--cream-dim);font-style:italic;">No pass requests yet.</div>'
    : passes.map(p=>`
      <div class="entry">
        <div class="entry-top"><b>${p.name} · Room ${p.room}</b><span class="badge ${p.status}">${p.status}</span></div>
        <div class="meta">Reason: ${p.reason}</div>
        <div class="meta">Expected return: ${p.ret ? new Date(p.ret).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
        ${p.status==='pending' ? `<div class="actions"><button class="small" onclick="decidePass('${p.id}','approved')">Approve</button><button class="small ghost" onclick="decidePass('${p.id}','denied')">Deny</button></div>` : ''}
      </div>`).join('');
}

// ---- Incidents ----
let incidents = loadJSON(I_KEY, []);
function reportIncident(){
  const loc = document.getElementById('i-loc').value.trim();
  const sev = document.getElementById('i-sev').value;
  const desc = document.getElementById('i-desc').value.trim();
  if(!loc || !desc){ alert('Enter location and description.'); return; }
  incidents.unshift({ id:'I'+Date.now().toString().slice(-6), loc, sev, desc, status:'open', time: timeNow() });
  saveJSON(I_KEY, incidents);
  document.getElementById('i-loc').value=''; document.getElementById('i-desc').value='';
  renderIncidents();
}
function closeIncident(id){
  const i = incidents.find(x=>x.id===id);
  if(i){ i.status='resolved'; saveJSON(I_KEY, incidents); renderIncidents(); }
}
function renderIncidents(){
  document.getElementById('i-count').textContent = incidents.length;
  document.getElementById('incident-list').innerHTML = incidents.length===0
    ? '<div style="font-size:13px;color:var(--cream-dim);font-style:italic;">No incidents reported.</div>'
    : incidents.map(i=>`
      <div class="entry">
        <div class="entry-top"><b>${i.loc}</b><span class="badge ${i.sev}">${i.sev}</span></div>
        <div class="meta">Reported ${i.time} · Status: ${i.status}</div>
        <div class="meta" style="color:var(--cream);font-family:'Inter',sans-serif;">${i.desc}</div>
        ${i.status==='open' ? `<div class="actions"><button class="small" onclick="closeIncident('${i.id}')">Mark resolved</button></div>` : ''}
      </div>`).join('');
}

// ---- Cameras ----
function defaultCams(){
  return [
    {zone:'Main Gate', online:true}, {zone:'Block A Corridor', online:true},
    {zone:'Block B Corridor', online:true}, {zone:'Mess Hall', online:true},
    {zone:'Parking Area', online:false}, {zone:'Rear Gate', online:true},
    {zone:'Common Room', online:true}, {zone:'Block A Stairwell', online:false},
  ];
}
let cams = loadJSON(C_KEY, null) || defaultCams();
saveJSON(C_KEY, cams);
function toggleCam(idx){
  cams[idx].online = !cams[idx].online;
  saveJSON(C_KEY, cams);
  renderCams();
}
function renderCams(){
  document.getElementById('cam-grid').innerHTML = cams.map((c,idx)=>`
    <div class="cam">
      <div class="cam-top"><b>${c.zone}</b></div>
      <div class="cam-status"><span class="dot ${c.online?'online':'offline'}"></span>${c.online?'Online · recording':'Offline'}</div>
      <div class="actions"><button class="small ghost" onclick="toggleCam(${idx})">${c.online?'Simulate offline':'Bring online'}</button></div>
    </div>`).join('');
}

function renderStats(){
  const onlineCams = cams.filter(c=>c.online).length;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><b>${visitors.filter(v=>!v.outTime).length}</b><span>Visitors inside</span></div>
    <div class="stat"><b>${passes.filter(p=>p.status==='pending').length}</b><span>Pending passes</span></div>
    <div class="stat"><b>${incidents.filter(i=>i.status==='open').length}</b><span>Open incidents</span></div>
    <div class="stat"><b>${onlineCams}/${cams.length}</b><span>Cameras online</span></div>
  `;
}

function renderAll(){
  renderVisitors(); renderPasses(); renderIncidents(); renderCams(); renderStats();
}
renderAll();
// refresh stats whenever any sub-render happens
const origFns = [renderVisitors, renderPasses, renderIncidents, renderCams];
renderVisitors = function(){ origFns[0](); renderStats(); };
renderPasses = function(){ origFns[1](); renderStats(); };
renderIncidents = function(){ origFns[2](); renderStats(); };
renderCams = function(){ origFns[3](); renderStats(); };
