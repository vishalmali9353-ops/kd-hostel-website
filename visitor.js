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

  /* ---------------- Dark mode toggle ---------------- */
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const MOON_PATH = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const SUN_PATH = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeIcon.innerHTML = isDark ? SUN_PATH : MOON_PATH;
  });

  /* ---------------- Live clock ---------------- */
  function updateClock(){
    const now = new Date();
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
    document.getElementById('liveDate').textContent = now.toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  }
  updateClock();
  setInterval(updateClock, 1000);


  const ICON_LOGIN = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
  const ICON_LOGOUT = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

  /* ---------------- Student Database (50 seeded records - Gujarat) ---------------- */
  const firstNames = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rohan",
                       "Ananya","Diya","Saanvi","Aadhya","Kiara","Myra","Anika","Navya","Riya","Priya"];
  const lastNames  = ["Patel","Shah","Chaudhary","Thakor","Prajapati","Rajput","Solanki","Rathod",
                       "Desai","Joshi","Vaghela","Parmar","Mehta","Chauhan","Bharwad"];
  const cities = ["Palanpur, Banaskantha, Gujarat","Deesa, Banaskantha, Gujarat","Tharad, Banaskantha, Gujarat",
                   "Dhanera, Banaskantha, Gujarat","Patan, Patan, Gujarat","Sidhpur, Patan, Gujarat",
                   "Chanasma, Patan, Gujarat","Vastrapur, Ahmedabad, Gujarat","Sanand, Ahmedabad, Gujarat",
                   "Viramgam, Ahmedabad, Gujarat","Sariyad, Banaskantha, Gujarat","Mahesana, Mahesana, Gujarat",
                   "Visnagar, Mahesana, Gujarat","Unjha, Mahesana, Gujarat"];
  const courses = ["B.Tech - CSE","B.Tech - Mechanical","B.Tech - Electrical","BBA","B.Com (Hons)",
                    "BA - Economics","B.Sc - Physics","MBA","M.Tech - CSE","BCA"];
  const blocks = ["A","B","C","D"];

  const students = [];
  for(let i = 0; i < 50; i++){
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const course = courses[i % courses.length];
    const year = (i % 4) + 1;
    const block = blocks[i % blocks.length];
    const floor = Math.floor(i / blocks.length) % 4 + 1;
    const room = `${block}-${floor}0${(i % 9) + 1}`;
    const mobile = `9${String(700000000 + i * 8123).padStart(9,'0').slice(0,9)}`;
    const address = cities[i % cities.length];
    students.push({
      id: `KDP${1001 + i}`,
      name, room,
      course: `${course}, Year ${year}`,
      mobile, address
    });
  }

  /* ---------------- Shared helpers ---------------- */
  let visitors = [];
  let nextId = 1;
  let activeFilter = 'all';
  let searchTerm = '';
  let studentSearchTerm = '';

  const $ = (sel) => document.querySelector(sel);
  const form = $('#regForm');
  const body = $('#recordsBody');
  const emptyState = $('#emptyState');
  const formBanner = $('#formBanner');
  const successBanner = $('#successBanner');

  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function nowTime(){ return new Date().toTimeString().slice(0,5); }
  function fmtTime(t){
    if(!t) return '—';
    const [h,m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h % 12) || 12);
    return `${h12}:${String(m).padStart(2,'0')} ${period}`;
  }
  function escapeHtml(str){
    if(str === undefined || str === null) return '';
    return String(str)
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  $('#vDate').value = todayISO();
  $('#vTimeIn').value = nowTime();
  $('#statStudents').textContent = students.length;

  const datalist = $('#studentList');
  students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    datalist.appendChild(opt);
  });

  $('#vMeetName').addEventListener('input', () => {
    const val = $('#vMeetName').value.trim().toLowerCase();
    const match = students.find(s => s.name.toLowerCase() === val);
    const verifiedMsg = $('#verified-vMeetName');
    if(match){
      $('#vRoom').value = match.room;
      $('#vMeetName').classList.add('verified');
      verifiedMsg.classList.add('show');
    } else {
      $('#vMeetName').classList.remove('verified');
      verifiedMsg.classList.remove('show');
    }
  });

  /* ---------------- Student Database rendering & search ---------------- */
  function renderStudents(){
    const list = students.filter(s => {
      if(!studentSearchTerm) return true;
      const hay = `${s.name} ${s.room} ${s.mobile} ${s.course} ${s.address} ${s.id}`.toLowerCase();
      return hay.includes(studentSearchTerm);
    });

    const studentBody = $('#studentBody');
    const studentEmptyState = $('#studentEmptyState');
    studentBody.innerHTML = '';
    studentEmptyState.style.display = list.length ? 'none' : 'block';
    $('#studentResultCount').textContent = `Showing ${list.length} of ${students.length} students`;

    list.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Student ID" class="mono">${escapeHtml(s.id)}</td>
        <td data-label="Name"><div class="vname">${escapeHtml(s.name)}</div></td>
        <td data-label="Room"><span class="badge room"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg>${escapeHtml(s.room)}</span></td>
        <td data-label="Course & Year">${escapeHtml(s.course)}</td>
        <td data-label="Mobile No." class="mono">${escapeHtml(s.mobile)}</td>
        <td data-label="Home Address">${escapeHtml(s.address)}</td>
      `;
      studentBody.appendChild(tr);
    });
  }

  $('#studentSearchInput').addEventListener('input', (e) => {
    studentSearchTerm = e.target.value.trim().toLowerCase();
    renderStudents();
  });
  renderStudents();

  /* ---------------- Registration form validation ---------------- */
  const fieldIds = ['vName','vPhone','vIdProof','vMeetName','vRoom','vPersons','vPurpose','vDate','vTimeIn'];

  function clearErrors(){
    fieldIds.forEach(id => {
      $('#'+id).classList.remove('invalid');
      const err = $('#err-'+id);
      if(err) err.classList.remove('show');
    });
    formBanner.classList.remove('show');
  }
  function markInvalid(id, show){
    $('#'+id).classList.toggle('invalid', show);
    const err = $('#err-'+id);
    if(err) err.classList.toggle('show', show);
  }

  function validateForm(){
    let valid = true;
    const name = $('#vName').value.trim();
    if(!name || name.length < 2){ markInvalid('vName', true); valid = false; } else { markInvalid('vName', false); }

    const phone = $('#vPhone').value.trim();
    if(!/^[6-9]\d{9}$/.test(phone)){ markInvalid('vPhone', true); valid = false; } else { markInvalid('vPhone', false); }

    const idProof = $('#vIdProof').value;
    if(!idProof){ markInvalid('vIdProof', true); valid = false; } else { markInvalid('vIdProof', false); }

    const meetName = $('#vMeetName').value.trim();
    if(!meetName){ markInvalid('vMeetName', true); valid = false; } else { markInvalid('vMeetName', false); }

    const room = $('#vRoom').value.trim();
    if(!room){ markInvalid('vRoom', true); valid = false; } else { markInvalid('vRoom', false); }

    const persons = Number($('#vPersons').value);
    if(!persons || persons < 1){ markInvalid('vPersons', true); valid = false; } else { markInvalid('vPersons', false); }

    const purpose = $('#vPurpose').value;
    if(!purpose){ markInvalid('vPurpose', true); valid = false; } else { markInvalid('vPurpose', false); }

    const date = $('#vDate').value;
    if(!date){ markInvalid('vDate', true); valid = false; } else { markInvalid('vDate', false); }

    const timeIn = $('#vTimeIn').value;
    if(!timeIn){ markInvalid('vTimeIn', true); valid = false; } else { markInvalid('vTimeIn', false); }

    formBanner.classList.toggle('show', !valid);
    successBanner.classList.remove('show');
    return valid;
  }

  fieldIds.forEach(id => {
    $('#'+id).addEventListener('input', () => { if($('#'+id).classList.contains('invalid')) validateForm(); });
    $('#'+id).addEventListener('change', () => { if($('#'+id).classList.contains('invalid')) validateForm(); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!validateForm()){
      const firstInvalid = form.querySelector('.invalid');
      formBanner.scrollIntoView({ behavior:'smooth', block:'center' });
      if(firstInvalid) firstInvalid.focus();
      return;
    }
    const entry = {
      id: nextId++,
      name: $('#vName').value.trim(),
      phone: $('#vPhone').value.trim(),
      idProof: $('#vIdProof').value,
      meetName: $('#vMeetName').value.trim(),
      room: $('#vRoom').value.trim(),
      persons: $('#vPersons').value,
      purpose: $('#vPurpose').value,
      date: $('#vDate').value,
      timeIn: $('#vTimeIn').value,
      timeOut: null,
      remarks: $('#vRemarks').value.trim(),
      status: 'in'
    };
    visitors.unshift(entry);
    form.reset();
    clearErrors();
    $('#vMeetName').classList.remove('verified');
    $('#verified-vMeetName').classList.remove('show');
    $('#vDate').value = todayISO();
    $('#vTimeIn').value = nowTime();
    $('#vPersons').value = 1;
    successBanner.classList.add('show');
    setTimeout(() => successBanner.classList.remove('show'), 3500);
    render();
  });

  $('#clearBtn').addEventListener('click', () => {
    setTimeout(() => {
      clearErrors();
      $('#vMeetName').classList.remove('verified');
      $('#verified-vMeetName').classList.remove('show');
      $('#vDate').value = todayISO();
      $('#vTimeIn').value = nowTime();
      $('#vPersons').value = 1;
    }, 0);
  });

  /* ---------------- Visitor Records rendering & search ---------------- */
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      render();
    });
  });

  $('#searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  function checkout(id){
    const v = visitors.find(v => v.id === id);
    if(v && v.status === 'in'){
      v.status = 'out';
      v.timeOut = nowTime();
      render();
    }
  }
  function removeEntry(id){
    visitors = visitors.filter(v => v.id !== id);
    render();
  }
  window.checkout = checkout;
  window.removeEntry = removeEntry;

  function renderActivity(){
    const wrap = $('#recentActivity');
    const recent = visitors.slice(0, 5);
    if(recent.length === 0){
      wrap.innerHTML = `<div class="empty-state" id="activityEmpty"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg><p>No visitor activity yet today — new check-ins will appear here.</p></div>`;
      return;
    }
    wrap.innerHTML = recent.map(v => `
      <div class="activity-item">
        <div class="activity-left">
          <div class="activity-icon">${v.status === 'in' ? ICON_LOGIN : ICON_LOGOUT}</div>
          <div>
            <div class="activity-name">${escapeHtml(v.name)}</div>
            <div class="activity-sub">Meeting ${escapeHtml(v.meetName)} · Room ${escapeHtml(v.room)}</div>
          </div>
        </div>
        <span class="badge ${v.status}">${v.status === 'in' ? 'Checked In' : 'Checked Out'}</span>
      </div>
    `).join('');
  }

  function render(){
    let list = visitors.filter(v => {
      if(activeFilter === 'in' && v.status !== 'in') return false;
      if(activeFilter === 'out' && v.status !== 'out') return false;
      if(searchTerm){
        const hay = `${v.name} ${v.room} ${v.phone} ${v.purpose} ${v.meetName}`.toLowerCase();
        if(!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    body.innerHTML = '';
    emptyState.style.display = list.length ? 'none' : 'block';
    $('#resultCount').textContent = `Showing ${list.length} of ${visitors.length} records`;

    list.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Visitor">
          <div class="vname">${escapeHtml(v.name)}</div>
          <div class="vsub">${escapeHtml(v.idProof || '—')}</div>
        </td>
        <td data-label="Contact" class="mono">${escapeHtml(v.phone)}</td>
        <td data-label="Meeting / Room">
          <div>${escapeHtml(v.meetName)}</div>
          <div class="vsub">Room ${escapeHtml(v.room)}</div>
        </td>
        <td data-label="Purpose">${escapeHtml(v.purpose)}</td>
        <td data-label="Persons">${escapeHtml(v.persons)}</td>
        <td data-label="Check-in" class="mono">${fmtTime(v.timeIn)}</td>
        <td data-label="Check-out" class="mono">${v.timeOut ? fmtTime(v.timeOut) : '—'}</td>
        <td data-label="Status"><span class="badge ${v.status}">${v.status === 'in' ? 'Checked In' : 'Checked Out'}</span></td>
        <td data-label="Action">
          <div class="row-actions">
            <button class="icon-btn checkout" onclick="checkout(${v.id})" ${v.status === 'out' ? 'disabled' : ''}><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Check Out</button>
            <button class="icon-btn remove" onclick="removeEntry(${v.id})"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </td>
      `;
      body.appendChild(tr);
    });

    const todayList = visitors.filter(v => v.date === todayISO());
    $('#statToday').textContent = todayList.length;
    $('#statCurrent').textContent = visitors.filter(v => v.status === 'in').length;
    $('#statOut').textContent = visitors.filter(v => v.status === 'out').length;
    renderActivity();
  }

  render();