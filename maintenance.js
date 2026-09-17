const R_KEY='kdh_maint_requests_v1', A_KEY='kdh_maint_assets_v1';
let ok=true; try{localStorage.setItem('_t','1');localStorage.removeItem('_t');}catch(e){ok=false;}
const load=(k,f)=>{ if(!ok) return f; try{ return JSON.parse(localStorage.getItem(k))||f; }catch(e){ return f; } };
const save=(k,v)=>{ if(ok) try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ ok=false; } };
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

function switchTab(n){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===n));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  $('panel-'+n).classList.add('active');
}

/* ---- Repair requests ---- */
let requests=load(R_KEY,[]);
function addRequest(){
  const name=$('r-name').value.trim(), desc=$('r-desc').value.trim(), m=$('r-msg');
  if(!name||!desc){ m.textContent='Enter who is reporting it and what needs fixing.'; m.className='msg err'; return; }
  requests.unshift({id:'R'+Date.now().toString().slice(-6),name,room:$('r-room').value.trim()||'—',
    cat:$('r-cat').value,pri:$('r-pri').value,desc,status:'open',date:today()});
  save(R_KEY,requests);
  $('r-name').value=$('r-room').value=$('r-desc').value='';
  m.textContent='Request logged for '+name+'.'; m.className='msg';
  renderRequests(); renderStats();
}
function resolveRequest(id){ const r=requests.find(x=>x.id===id); if(r){ r.status='resolved'; save(R_KEY,requests); renderRequests(); renderStats(); } }
function deleteRequest(id){ requests=requests.filter(x=>x.id!==id); save(R_KEY,requests); renderRequests(); renderStats(); }
function renderRequests(){
  $('r-count').textContent=requests.length;
  $('request-list').innerHTML = requests.length ? requests.map(r=>`
    <div class="entry">
      <div class="entry-top"><b>${esc(r.cat)} · Room ${esc(r.room)}</b>
        <span><span class="badge ${r.pri}">${r.pri}</span> <span class="badge ${r.status}">${r.status}</span></span></div>
      <div class="meta">By ${esc(r.name)} · ${r.date} · #${r.id}</div>
      <div class="desc">${esc(r.desc)}</div>
      <div class="actions">${r.status==='open'?`<button class="small" onclick="resolveRequest('${r.id}')">Mark resolved</button>`:''}
        <button class="small ghost" onclick="deleteRequest('${r.id}')">Delete</button></div>
    </div>`).join('') : '<div class="empty">No maintenance requests yet.</div>';
}

/* ---- Prediction (same model as app.py) ---- */
const predictDays=(age,use,serv,occ)=>Math.round(Math.max(1,Math.min(400,400-3.5*age-8*use-0.6*serv-10*occ))*10)/10;
const urgencyOf=d=>d<=15?'URGENT':d<=45?'SOON':'OK';

function readInputs(){
  const asset=$('m-asset').value.trim(), room=$('m-room').value.trim()||'—';
  const [age,usage,serv,occ]=['m-age','m-usage','m-service','m-occ'].map(i=>parseFloat($(i).value));
  const box=$('predict-result');
  if(!asset||[age,usage,serv,occ].some(isNaN)){
    box.className='result';
    box.innerHTML='<div class="msg err" style="margin:0;">Enter the asset name and all four numbers.</div>';
    return null;
  }
  const days=predictDays(age,usage,serv,occ);
  return {asset,room,age,usage,serv,occ,days,urgency:urgencyOf(days)};
}
function showPrediction(p){
  const c=p.urgency.toLowerCase(), box=$('predict-result');
  const tip={URGENT:'Schedule a service immediately.',SOON:'Plan a service within the next few weeks.',OK:'No action needed right now — keep monitoring.'}[p.urgency];
  box.className='result '+c;
  box.innerHTML=`<h3>${esc(p.asset)} · Room ${esc(p.room)}</h3><span class="big">${p.days} days</span>
    <span class="badge ${c}">${p.urgency}</span>
    <div class="bar"><span class="${c}" style="width:${Math.min(100,Math.round(p.days/2))}%"></span></div>
    <div class="meta">Age ${p.age} mo · ${p.usage} hrs/day · ${p.serv} days since service · ${p.occ} occupants</div>
    <div class="desc">${tip}</div>`;
}
function predictMaintenance(){ const p=readInputs(); if(p) showPrediction(p); }

/* ---- Asset register ---- */
let assets=load(A_KEY,[]);
function saveAsset(){
  const p=readInputs(); if(!p) return;
  showPrediction(p);
  assets.unshift({id:'A'+Date.now().toString().slice(-6),...p,date:today()});
  save(A_KEY,assets); renderAssets(); renderStats();
}
function removeAsset(id){ assets=assets.filter(a=>a.id!==id); save(A_KEY,assets); renderAssets(); renderStats(); }
function resetAssets(){ if(confirm('Clear the whole asset register?')){ assets=[]; save(A_KEY,assets); renderAssets(); renderStats(); } }
function renderAssets(){
  $('a-count').textContent=assets.length;
  const f=$('a-filter').value, list=assets.filter(a=>f==='all'||a.urgency===f);
  $('asset-list').innerHTML = list.length ? list.map(a=>`
    <div class="entry">
      <div class="entry-top"><b>${esc(a.asset)} · Room ${esc(a.room)}</b><span class="badge ${a.urgency.toLowerCase()}">${a.urgency}</span></div>
      <div class="meta">${a.days} days left · age ${a.age} mo · ${a.usage} hrs/day · added ${a.date}</div>
      <div class="actions"><button class="small ghost" onclick="removeAsset('${a.id}')">Remove</button></div>
    </div>`).join('') : '<div class="empty">No assets tracked — run a prediction and add it.</div>';
}

/* ---- Stats ---- */
function renderStats(){
  const open=requests.filter(r=>r.status==='open');
  $('stats').innerHTML=[[open.length,'Open requests'],[open.filter(r=>r.pri==='high').length,'High priority'],
    [assets.length,'Assets tracked'],[assets.filter(a=>a.urgency==='URGENT').length,'Need urgent service']]
    .map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
}
renderRequests(); renderAssets(); renderStats();