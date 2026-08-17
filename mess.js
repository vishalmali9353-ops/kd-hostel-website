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

  /* ---------------- Weekly menu data ---------------- */
  const weeklyMenu = [
    { day:"Monday",    breakfast:"Dhokla, Green Chutney, Tea",         lunch:"Dal, Bhaat, Rotli, Bhindi nu Shaak, Kachumber, Papad",     snacks:"Khaman, Sev, Tea",          dinner:"Dal Dhokli, Chaas" },
    { day:"Tuesday",   breakfast:"Thepla, Chhundo, Curd",              lunch:"Kadhi, Khichdi, Bataka nu Shaak, Papad, Athanu",           snacks:"Handvo, Green Chutney",     dinner:"Ringan no Olo, Rotli, Dal Bhaat" },
    { day:"Wednesday", breakfast:"Khandvi, Coriander Chutney",         lunch:"Dal, Bhaat, Rotli, Turiya-Patra nu Shaak, Papad, Chaas",   snacks:"Sev Khamani, Tea",          dinner:"Undhiyu, Puri" },
    { day:"Thursday",  breakfast:"Fafda, Jalebi, Fried Chilli",        lunch:"Dal, Bhaat, Rotli, Guvar nu Shaak, Kachumber, Papad",      snacks:"Dabeli, Tea",               dinner:"Muthiya nu Shaak, Rotli, Chaas" },
    { day:"Friday",    breakfast:"Poha, Sev, Tea",                     lunch:"Dal, Bhaat, Bhakri, Sev-Tameta nu Shaak, Athanu, Papad",   snacks:"Ganthiya, Fafda",           dinner:"Dal Dhokli, Chaas" },
    { day:"Saturday",  breakfast:"Idada, Green Chutney",               lunch:"Dal, Bhaat, Rotli, Val-Papdi nu Shaak, Kachumber, Papad", snacks:"Lilva Kachori, Tea",        dinner:"Special Gujarati Thali — Shrikhand, Puri, Dal Bhaat, Shaak" },
    { day:"Sunday",    breakfast:"Gathiya, Jalebi",                    lunch:"Undhiyu, Puri, Dal Bhaat, Chaas",                          snacks:"Bhajiya, Tea",              dinner:"Khichdi, Kadhi, Papad, Chaas" },
  ];
  const mealTimings = [
    { name:"Breakfast",      window:"7:30 AM – 9:00 AM" },
    { name:"Lunch",          window:"12:30 PM – 2:00 PM" },
    { name:"Evening Snacks", window:"5:00 PM – 5:30 PM" },
    { name:"Dinner",         window:"8:00 PM – 9:30 PM" },
  ];

  function buildTodayCards(){
    const todayName = new Date().toLocaleDateString('en-IN', { weekday:'long' });
    const today = weeklyMenu.find(r => r.day === todayName) || weeklyMenu[0];
    const cards = [
      { name:"Breakfast", time:mealTimings[0].window, items:today.breakfast },
      { name:"Lunch", time:mealTimings[1].window, items:today.lunch },
      { name:"Evening Snacks", time:mealTimings[2].window, items:today.snacks },
      { name:"Dinner", time:mealTimings[3].window, items:today.dinner },
    ];
    return { todayName, cards };
  }
  function cardsHtml(cards){
    return cards.map(c => `
      <div class="meal-card">
        <div class="meal-card-head">
          <div class="meal-icon">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div class="meal-name">${c.name}</div>
            <div class="meal-time">${c.time}</div>
          </div>
        </div>
        <ul class="meal-items">${c.items.split(', ').map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>
    `).join('');
  }

  function renderWeekly(){
    const { todayName, cards } = buildTodayCards();
    $('#todayLabel').textContent = todayName;
    const wBody = $('#weeklyBody');
    wBody.innerHTML = weeklyMenu.map(row => `
      <tr class="${row.day === todayName ? 'today-row' : ''}">
        <td data-label="Day" class="day-cell">${row.day}</td>
        <td data-label="Breakfast">${row.breakfast}</td>
        <td data-label="Lunch">${row.lunch}</td>
        <td data-label="Evening Snacks">${row.snacks}</td>
        <td data-label="Dinner">${row.dinner}</td>
      </tr>
    `).join('');
    $('#todayGrid').innerHTML = cardsHtml(cards);

    /* Dashboard preview */
    $('#dashDay').textContent = todayName;
    $('#dashTodayLabel').textContent = todayName;
    $('#dashTodayGrid').innerHTML = cardsHtml(cards);

    /* Next meal (by current time) */
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const mealStarts = [
      { name:"Breakfast", start: 7*60+30 },
      { name:"Lunch", start: 12*60+30 },
      { name:"Evening Snacks", start: 17*60 },
      { name:"Dinner", start: 20*60 },
    ];
    const upcoming = mealStarts.find(m => m.start > minutesNow);
    $('#dashNextMeal').textContent = upcoming ? upcoming.name : "Breakfast (tomorrow)";
  }
  renderWeekly();

  function renderTimings(){
    $('#timingList').innerHTML = mealTimings.map(t => `
      <div class="timing-row">
        <div class="timing-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <div class="timing-name">${t.name}</div>
          <div class="timing-window">${t.window}</div>
        </div>
      </div>
    `).join('');
  }
  renderTimings();

  /* ---------------- Shared student directory (same data as Visitor Management) ---------------- */
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
  $('#fName').addEventListener('input', () => {
    const val = $('#fName').value.trim().toLowerCase();
    const match = students.find(s => s.name.toLowerCase() === val);
    const msg = $('#verified-fName');
    if(match){
      $('#fRoom').value = match.room;
      $('#fName').classList.add('verified');
      msg.classList.add('show');
    } else {
      $('#fName').classList.remove('verified');
      msg.classList.remove('show');
    }
  });

  /* ---------------- Feedback form ---------------- */
  let selectedRating = 0;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.dataset.val);
      document.querySelectorAll('.star-btn').forEach(b => b.classList.toggle('selected', Number(b.dataset.val) <= selectedRating));
      $('#err-fRating').classList.remove('show');
    });
  });

  const feedbackIds = ['fName','fRoom','fMeal'];
  function clearErrors(){
    feedbackIds.forEach(id => { $('#'+id).classList.remove('invalid'); $('#err-'+id).classList.remove('show'); });
    $('#err-fRating').classList.remove('show');
    $('#formBanner').classList.remove('show');
  }
  function validate(){
    let valid = true;
    ['fName','fRoom'].forEach(id => {
      const v = $('#'+id).value.trim();
      const bad = !v;
      $('#'+id).classList.toggle('invalid', bad);
      $('#err-'+id).classList.toggle('show', bad);
      if(bad) valid = false;
    });
    const meal = $('#fMeal').value;
    $('#fMeal').classList.toggle('invalid', !meal);
    $('#err-fMeal').classList.toggle('show', !meal);
    if(!meal) valid = false;

    const ratingBad = selectedRating < 1;
    $('#err-fRating').classList.toggle('show', ratingBad);
    if(ratingBad) valid = false;

    $('#formBanner').classList.toggle('show', !valid);
    $('#successBanner').classList.remove('show');
    return valid;
  }
  feedbackIds.forEach(id => {
    $('#'+id).addEventListener('input', () => { if($('#'+id).classList.contains('invalid')) validate(); });
    $('#'+id).addEventListener('change', () => { if($('#'+id).classList.contains('invalid')) validate(); });
  });

  let feedbackList = [];
  let fbSearchTerm = '';
  let fbMealFilter = 'all';

  $('#feedbackForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if(!validate()){
      $('#formBanner').scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }
    feedbackList.unshift({
      student: $('#fName').value.trim(),
      room: $('#fRoom').value.trim(),
      meal: $('#fMeal').value,
      rating: selectedRating,
      comments: $('#fComments').value.trim(),
      date: new Date().toISOString().slice(0,10)
    });
    $('#feedbackForm').reset();
    clearErrors();
    selectedRating = 0;
    document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('selected'));
    $('#fName').classList.remove('verified');
    $('#verified-fName').classList.remove('show');
    $('#successBanner').classList.add('show');
    setTimeout(() => $('#successBanner').classList.remove('show'), 3000);
    renderFeedback();
  });
  $('#clearBtn').addEventListener('click', () => {
    setTimeout(() => {
      clearErrors();
      selectedRating = 0;
      document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('selected'));
      $('#fName').classList.remove('verified');
      $('#verified-fName').classList.remove('show');
    }, 0);
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      fbMealFilter = chip.dataset.meal;
      renderFeedback();
    });
  });
  $('#fbSearch').addEventListener('input', (e) => { fbSearchTerm = e.target.value.trim().toLowerCase(); renderFeedback(); });

  function renderFeedback(){
    const list = feedbackList.filter(f => {
      if(fbMealFilter !== 'all' && f.meal !== fbMealFilter) return false;
      if(fbSearchTerm){
        const hay = `${f.student} ${f.room} ${f.meal}`.toLowerCase();
        if(!hay.includes(fbSearchTerm)) return false;
      }
      return true;
    });
    $('#fbBody').innerHTML = list.map(f => `
      <tr>
        <td data-label="Student">${escapeHtml(f.student)}</td>
        <td data-label="Room">${escapeHtml(f.room)}</td>
        <td data-label="Meal">${escapeHtml(f.meal)}</td>
        <td data-label="Rating"><span class="stars-display">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span></td>
        <td data-label="Comments">${escapeHtml(f.comments) || '—'}</td>
        <td data-label="Date">${escapeHtml(f.date)}</td>
      </tr>
    `).join('');
    $('#fbCount').textContent = `Showing ${list.length} of ${feedbackList.length} responses`;
    $('#fbEmpty').style.display = list.length ? 'none' : 'block';

    /* Dashboard stats */
    $('#dashFeedbackCount').textContent = feedbackList.length;
    if(feedbackList.length){
      const avg = feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length;
      $('#dashAvgRating').textContent = avg.toFixed(1) + ' / 5';
    } else {
      $('#dashAvgRating').textContent = '—';
    }
  }
  renderFeedback();