const BACKEND_URL = "https://kd-hostel-backend.onrender.com";

let allNotices = [];

function formatDate(dateStr){
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

// NEW: builds a safe absolute URL for the document, regardless of whether
// document_url comes back as "file.pdf" or "/file.pdf" or a full URL.
function buildDocUrl(documentUrl){
  if (!documentUrl) return '';
  if (/^https?:\/\//i.test(documentUrl)) return documentUrl; // already absolute
  return documentUrl.startsWith('/')
    ? `${BACKEND_URL}${documentUrl}`
    : `${BACKEND_URL}/${documentUrl}`;
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
    const docUrl = buildDocUrl(n.document_url); // CHANGED
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
      ${docUrl ? `
        <div class="notice-doc">
          <button class="doc-btn" onclick="window.open('${docUrl}', '_blank')">
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

// NEW: small helper to fetch with a timeout so a sleeping backend doesn't
// hang forever on the first try.
function fetchWithTimeout(url, ms){
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

// CHANGED: loadNotices now retries automatically while the Render free-tier
// server wakes up from sleep, instead of failing on the very first attempt.
async function loadNotices(attempt = 1){
  const list = document.getElementById('noticeList');
  list.innerHTML = `
    <div class="state-box">
      <i class="bi bi-hourglass-split"></i>
      ${attempt === 1 ? 'Loading notices...' : 'Server is waking up, please wait...'}
    </div>`;

  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/notices`, 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allNotices = data.notices || [];
    applyFilters();
  } catch (err) {
    console.error(`Failed to load notices (attempt ${attempt}):`, err);
    if (attempt < 4) {
      // Retry a few times with increasing delay - covers Render cold start (~30-50s)
      setTimeout(() => loadNotices(attempt + 1), attempt * 4000);
    } else {
      list.innerHTML = `
        <div class="state-box">
          <i class="bi bi-wifi-off"></i>
          Could not load notices right now. Please try again later.
        </div>`;
    }
  }
}

document.getElementById('searchInput')?.addEventListener('input', applyFilters);

loadNotices();
