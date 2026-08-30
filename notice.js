const BACKEND_URL = "https://kd-hostel-backend.onrender.com";

let allNotices = [];

function formatDate(dateStr){
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function renderNotices(notices){
  const list = document.getElementById('noticeList');
  list.innerHTML = '';

  if (!notices.length){
    list.innerHTML = `
      <div class="state-box">
        <i class="bi bi-inbox"></i>
        No notices match your search.
      </div>`;
    return;
  }

  notices.forEach(n => {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.innerHTML = `
      <div class="notice-top">
        <h3>${n.title}</h3>
        <span class="notice-date"><i class="bi bi-calendar3"></i> ${formatDate(n.date)}</span>
      </div>
      <p>${n.description || n.content || ''}</p>
      <div class="notice-meta">
        <span><i class="bi bi-person-badge"></i> ${n.faculty_name || ''}</span>
        <span><i class="bi bi-tag"></i> ${n.category || ''}</span>
        ${n.pinned ? '<span class="pin-badge"><i class="bi bi-pin-angle-fill"></i> Pinned</span>' : ''}
      </div>
      ${n.document_url ? `
        <div class="notice-doc">
          <button class="doc-btn" onclick="window.open('${BACKEND_URL}${n.document_url}', '_blank')">
            <i class="bi bi-file-earmark-arrow-down"></i> View Document
          </button>
        </div>
      ` : ''}
    `;
    list.appendChild(card);
  });
}

function applyFilters(){
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered = allNotices.filter(n =>
    n.title.toLowerCase().includes(query) ||
    (n.description || n.content || '').toLowerCase().includes(query)
  );
  renderNotices(filtered);
}

async function loadNotices(){
  const list = document.getElementById('noticeList');
  list.innerHTML = `
    <div class="state-box">
      <i class="bi bi-hourglass-split"></i>
      Loading notices...
    </div>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/notices`);
    const data = await res.json();
    allNotices = data.notices || [];
    applyFilters();
  } catch (err) {
    console.error("Failed to load notices:", err);
    list.innerHTML = `
      <div class="state-box">
        <i class="bi bi-wifi-off"></i>
        Could not load notices right now. Please try again later.
      </div>`;
  }
}

document.getElementById('searchInput')?.addEventListener('input', applyFilters);

loadNotices();
