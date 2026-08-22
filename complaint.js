/* ---------------- Page navigation ---------------- */
  const pages = document.querySelectorAll('.page');
  const navBtns = document.querySelectorAll('.nav-btn[data-page]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(btn.dataset.page).classList.add('active');
    });
  });

  const $ = (sel) => document.querySelector(sel);
  function escapeHtml(str){
    if(str === undefined || str === null) return '';
    return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  /* Shared student directory (same generation as Visitor / Mess modules) */
  const firstNames = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rohan",
                       "Ananya","Diya","Saanvi","Aadhya","Kiara","Myra","Anika","Navya","Riya","Priya"];
  const lastNames  = ["Patel","Shah","Chaudhary","Thakor","Prajapati","Rajput","Solanki","Rathod",
                       "Desai","Joshi","Vaghela","Parmar","Mehta","Chauhan","Bharwad"];
  const blocks = ["A","B","C","D"];
  const students = [];
  for(let i = 0; i < 50; i++){
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const block = blocks[i % blocks.length];
    const floor = Math.floor(i / blocks.length) % 4 + 1;
    const room = `${block}-${floor}0${(i % 9) + 1}`;
    students.push({ id:`KDP${1001+i}`, name, room });
  }
  const datalist = $('#studentList');
  students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    datalist.appendChild(opt);
  });
  $('#cName').addEventListener('input', () => {
    const val = $('#cName').value.trim().toLowerCase();
    const match = students.find(s => s.name.toLowerCase() === val);
    const msg = $('#verified-cName');
    if(match){
      $('#cRoom').value = match.room;
      $('#cName').classList.add('verified');
      msg.classList.add('show');
    } else {
      $('#cName').classList.remove('verified');
      msg.classList.remove('show');
    }
  });

  /* Priority selector */
  let selectedPriority = '';
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPriority = btn.dataset.val;
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.toggle('selected', b.dataset.val === selectedPriority));
      $('#err-cPriority').classList.remove('show');
    });
  });

  /* Validation */
  const reqIds = ['cName','cRoom','cCategory','cDesc'];
  function clearErrors(){
    reqIds.forEach(id => { $('#'+id).classList.remove('invalid'); $('#err-'+id).classList.remove('show'); });
    $('#err-cPriority').classList.remove('show');
    $('#formBanner').classList.remove('show');
  }
  function validate(){
    let valid = true;
    ['cName','cRoom','cDesc'].forEach(id => {
      const bad = !$('#'+id).value.trim();
      $('#'+id).classList.toggle('invalid', bad);
      $('#err-'+id).classList.toggle('show', bad);
      if(bad) valid = false;
    });
    const cat = $('#cCategory').value;
    $('#cCategory').classList.toggle('invalid', !cat);
    $('#err-cCategory').classList.toggle('show', !cat);
    if(!cat) valid = false;

    const priBad = !selectedPriority;
    $('#err-cPriority').classList.toggle('show', priBad);
    if(priBad) valid = false;

    $('#formBanner').classList.toggle('show', !valid);
    $('#successBanner').classList.remove('show');
    return valid;
  }
  reqIds.forEach(id => {
    $('#'+id).addEventListener('input', () => { if($('#'+id).classList.contains('invalid')) validate(); });
    $('#'+id).addEventListener('change', () => { if($('#'+id).classList.contains('invalid')) validate(); });
  });

  /* Complaint records */
  let complaints = [];
  let nextId = 1;
  let cSearchTerm = '';
  let cStatusFilter = 'all';

  $('#cForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if(!validate()){
      $('#formBanner').scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }
    complaints.unshift({
      id: `CMP${1000 + nextId}`,
      _seq: nextId++,
      student: $('#cName').value.trim(),
      room: $('#cRoom').value.trim(),
      category: $('#cCategory').value,
      priority: selectedPriority,
      desc: $('#cDesc').value.trim(),
      status: 'Pending',
      date: new Date().toISOString().slice(0,10)
    });
    $('#cForm').reset();
    clearErrors();
    selectedPriority = '';
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
    $('#cName').classList.remove('verified');
    $('#verified-cName').classList.remove('show');
    $('#successBanner').classList.add('show');
    setTimeout(() => $('#successBanner').classList.remove('show'), 3000);
    render();
  });
  $('#clearBtn').addEventListener('click', () => {
    setTimeout(() => {
      clearErrors();
      selectedPriority = '';
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
      $('#cName').classList.remove('verified');
      $('#verified-cName').classList.remove('show');
    }, 0);
  });

  function markSolved(seq){
    const c = complaints.find(c => c._seq === seq);
    if(c && c.status === 'Pending'){ c.status = 'Solved'; render(); }
  }
  function removeComplaint(seq){
    complaints = complaints.filter(c => c._seq !== seq);
    render();
  }
  window.markSolved = markSolved;
  window.removeComplaint = removeComplaint;

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      cStatusFilter = chip.dataset.status;
      render();
    });
  });
  $('#cSearch').addEventListener('input', (e) => { cSearchTerm = e.target.value.trim().toLowerCase(); render(); });

  function render(){
    const list = complaints.filter(c => {
      if(cStatusFilter !== 'all' && c.status !== cStatusFilter) return false;
      if(cSearchTerm){
        const hay = `${c.student} ${c.room} ${c.category}`.toLowerCase();
        if(!hay.includes(cSearchTerm)) return false;
      }
      return true;
    });

    $('#cBody').innerHTML = list.map(c => `
      <tr>
        <td data-label="ID" class="mono">${escapeHtml(c.id)}</td>
        <td data-label="Student"><div class="cname">${escapeHtml(c.student)}</div><div class="csub">${escapeHtml(c.desc).slice(0,40)}${c.desc.length>40?'…':''}</div></td>
        <td data-label="Room">${escapeHtml(c.room)}</td>
        <td data-label="Category">${escapeHtml(c.category)}</td>
        <td data-label="Priority"><span class="badge ${c.priority.toLowerCase()}">${escapeHtml(c.priority)}</span></td>
        <td data-label="Status"><span class="badge ${c.status.toLowerCase()}">${escapeHtml(c.status)}</span></td>
        <td data-label="Date" class="mono">${escapeHtml(c.date)}</td>
        <td data-label="Action">
          <div class="row-actions">
            <button class="icon-btn resolve" onclick="markSolved(${c._seq})" ${c.status === 'Solved' ? 'disabled' : ''}>Mark Solved</button>
            <button class="icon-btn remove" onclick="removeComplaint(${c._seq})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    $('#cCount').textContent = `Showing ${list.length} of ${complaints.length} complaints`;
    $('#cEmpty').style.display = list.length ? 'none' : 'block';

    $('#statTotal').textContent = complaints.length;
    $('#statPending').textContent = complaints.filter(c => c.status === 'Pending').length;
    $('#statSolved').textContent = complaints.filter(c => c.status === 'Solved').length;
    $('#statHigh').textContent = complaints.filter(c => c.status === 'Pending' && c.priority === 'High').length;

    /* Dashboard: recent complaints preview (latest 5) */
    const recent = complaints.slice(0, 5);
    if(recent.length === 0){
      $('#recentEmpty').style.display = 'block';
    } else {
      $('#recentEmpty').style.display = 'none';
    }
    const existingList = document.getElementById('recentList');
    if(existingList) existingList.remove();
    if(recent.length){
      const wrap = document.createElement('div');
      wrap.id = 'recentList';
      wrap.style.padding = '10px 22px 6px';
      wrap.innerHTML = recent.map(c => `
        <div class="activity-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
          <div>
            <div class="cname">${escapeHtml(c.student)} <span class="mono">· ${escapeHtml(c.id)}</span></div>
            <div class="csub">${escapeHtml(c.category)} — ${escapeHtml(c.desc).slice(0,50)}${c.desc.length>50?'…':''}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <span class="badge ${c.priority.toLowerCase()}">${escapeHtml(c.priority)}</span>
            <span class="badge ${c.status.toLowerCase()}">${escapeHtml(c.status)}</span>
          </div>
        </div>
      `).join('');
      $('#recentBody').appendChild(wrap);
    }
  }
  render ();