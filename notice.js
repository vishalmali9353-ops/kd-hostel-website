// ============================================================
  // CONFIG: paste your deployed Google Apps Script Web App URL
  // (the one ending in /exec) between the quotes below.
  // Leave blank to use sample offline data.
  // ============================================================
  const GAS_URL = ""; // e.g. "https://script.google.com/macros/s/AKfycb.../exec"

  // Sample/fallback data — used if GAS_URL is blank or fetch fails
  const sampleNotices = [
    {
      title: "Hostel Fee Payment Deadline Extended",
      description: "Last date to pay hostel fees for this semester has been extended to the 5th of next month. Late fee will apply after that.",
      category: "Fee",
      date: "2026-07-25",
      pinned: true,
      postedBy: "Y.R PATEL"
    },
    {
      title: "Mess Menu Update for August",
      description: "The revised mess menu for August has been finalized based on student feedback. Check the mess notice board for details.",
      category: "Mess",
      date: "2026-07-24",
      pinned: false,
      postedBy: "M.R THAKKAR"
    },
    {
      title: "Scheduled Water Supply Maintenance",
      description: "Water supply will be temporarily stopped on Sunday from 10 AM to 1 PM for tank cleaning in Boys Block.",
      category: "Maintenance",
      date: "2026-07-22",
      pinned: false,
      postedBy: "C.D PATEL"
    },
    {
      title: "Independence Day Celebration",
      description: "All residents are invited to the flag hoisting ceremony in the common ground, followed by cultural activities.",
      category: "Event",
      date: "2026-07-20",
      pinned: false,
      postedBy: "N.A PATEL"
    },
    {
      title: "ID Card Verification Drive",
      description: "All students must get their hostel ID cards verified at the office by end of this week.",
      category: "General",
      date: "2026-07-18",
      pinned: false,
      postedBy: "M.R THAKKAR"
    }
  ];

  let allNotices = [];

  function daysAgo(dateStr){
    const diff = (new Date() - new Date(dateStr)) / (1000*60*60*24);
    return diff;
  }

  function renderNotices(notices){
    const list = document.getElementById('noticeList');
    list.innerHTML = "";

    if (!notices.length){
      list.innerHTML = `
        <div class="state-box">
          <i class="bi bi-inbox"></i>
          No notices match your search.
        </div>`;
      return;
    }

    // Pinned first, then by date descending
    const sorted = [...notices].sort((a,b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.date) - new Date(a.date);
    });

    sorted.forEach(n => {
      const isNew = daysAgo(n.date) <= 3;
      const card = document.createElement('div');
      card.className = "notice-card" + (n.pinned ? " pinned" : "");
      card.innerHTML = `
        <div class="notice-top">
          <h3>
            ${n.pinned ? '<i class="bi bi-pin-angle-fill badge-pin"></i>' : ''}
            ${n.title}
            ${isNew ? '<span class="badge-new">NEW</span>' : ''}
          </h3>
          <span class="notice-date"><i class="bi bi-calendar3"></i> ${formatDate(n.date)}</span>
        </div>
        <p>${n.description}</p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="category-tag">${n.category}</span>
          ${n.postedBy ? `<span class="notice-postedby"><i class="bi bi-person-badge"></i> ${n.postedBy}</span>` : ''}
        </div>
      `;
      list.appendChild(card);
    });
  }

  function formatDate(dateStr){
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }

  function applyFilters(){
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = allNotices.filter(n => {
      const matchesQuery = n.title.toLowerCase().includes(query) || n.description.toLowerCase().includes(query);
      const matchesCategory = category === "all" || n.category === category;
      return matchesQuery && matchesCategory;
    });

    renderNotices(filtered);
  }

  async function loadNotices(){
    const list = document.getElementById('noticeList');
    list.innerHTML = `
      <div class="state-box">
        <i class="bi bi-hourglass-split"></i>
        Loading notices...
      </div>`;

    if (!GAS_URL){
      allNotices = sampleNotices;
      applyFilters();
      return;
    }

    try {
      const res = await fetch(GAS_URL);
      const data = await res.json();
      // Expecting an array of { title, description, category, date, pinned }
      allNotices = Array.isArray(data) ? data : (data.notices || []);
      if (!allNotices.length) allNotices = sampleNotices;
    } catch (err){
      console.error("Failed to load notices from Apps Script, using sample data:", err);
      allNotices = sampleNotices;
    }
    applyFilters();
  }

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('categoryFilter').addEventListener('change', applyFilters);

  // ============================================================
  // Agent password gate. Note: this only hides the form on the
  // client — anyone viewing page source can read the password.
  // Fine for a college demo; not real security.
  // ============================================================
  const AGENT_PASSWORD = "KDP@123";

  function checkPassword(){
    const entered = document.getElementById('agentPassword').value;
    const status = document.getElementById('pw_status');

    if (entered === AGENT_PASSWORD){
      document.getElementById('agentPassword').value = "";
      status.innerHTML = "";
      bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
      const addModal = new bootstrap.Modal(document.getElementById('addNoticeModal'));
      addModal.show();
    } else {
      status.innerHTML = '<span class="text-danger">Wrong password. Try again.</span>';
    }
  }

  async function submitNotice(){
    const title = document.getElementById('n_title').value.trim();
    const description = document.getElementById('n_description').value.trim();
    const category = document.getElementById('n_category').value;
    const date = document.getElementById('n_date').value;
    const pinned = document.getElementById('n_pinned').checked;
    const status = document.getElementById('n_status');

    if (!title || !description || !date){
      status.innerHTML = '<span class="text-danger">Please fill title, description and date.</span>';
      return;
    }

    const staffNames = ["Y.R PATEL", "M.R THAKKAR", "C.D PATEL", "N.A PATEL"];
    const postedBy = staffNames[Math.floor(Math.random() * staffNames.length)];
    const newNotice = { title, description, category, date, pinned, postedBy };

    if (!GAS_URL){
      // No backend configured yet — just show it locally
      allNotices.unshift(newNotice);
      applyFilters();
      closeModalAndReset();
      return;
    }

    status.innerHTML = '<span class="text-muted">Posting...</span>';
    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight
        body: JSON.stringify({ action: "add", ...newNotice })
      });
      status.innerHTML = '<span class="text-success">Notice posted.</span>';
      allNotices.unshift(newNotice);
      applyFilters();
      closeModalAndReset();
    } catch (err){
      console.error("Failed to post notice:", err);
      status.innerHTML = '<span class="text-danger">Could not reach server. Notice shown locally only.</span>';
      allNotices.unshift(newNotice);
      applyFilters();
    }
  }

  function closeModalAndReset(){
    document.getElementById('noticeForm').reset();
    document.getElementById('n_status').innerHTML = '';
    bootstrap.Modal.getInstance(document.getElementById('addNoticeModal')).hide();
  }

  loadNotices();



