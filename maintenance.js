/* ---------------- Prediction engine ---------------- */
const BASELINE_DAYS = {
  AC: 180, Geyser: 270, Plumbing: 365, Electrical: 240, Furniture: 365, FireSafety: 90
};
const USAGE_FACTOR = { Low: 0, Medium: 8, High: 16 };

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function computeRisk(asset, today) {
  const last = new Date(asset.LastMaintenance);
  const installed = new Date(asset.InstallDate);
  const baseline = BASELINE_DAYS[asset.Type] || 240;

  const daysSinceLast = daysBetween(last, today);
  const intervalFactor = Math.min((daysSinceLast / baseline) * 100, 100);

  const ageYears = daysBetween(installed, today) / 365;
  const ageFactor = Math.min(ageYears * 5, 30);

  const c30 = Number(asset.Complaints30d) || 0;
  const c90 = Number(asset.Complaints90d) || 0;
  const complaintFactor = Math.min(c30 * 8 + c90 * 2, 30);

  const usageFactor = USAGE_FACTOR[asset.UsageIntensity] ?? 0;

  let score = intervalFactor * 0.5 + ageFactor + complaintFactor + usageFactor;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const adjFactor = 1 - (score / 100) * 0.5;
  const predictedDays = Math.max(baseline * adjFactor, 7);
  const nextDate = new Date(last.getTime() + predictedDays * 86400000);
  const daysUntil = daysBetween(today, nextDate);

  let level;
  if (daysUntil <= 0 || score >= 75) level = 'critical';
  else if (score >= 50) level = 'warning';
  else if (score >= 25) level = 'watch';
  else level = 'healthy';

  const factors = [];
  if (daysSinceLast > baseline) factors.push(`${daysSinceLast}d since service`);
  else factors.push(`serviced ${daysSinceLast}d ago`);
  if (ageYears >= 1) factors.push(`${ageYears.toFixed(1)}y in use`);
  if (c30 > 0) factors.push(`${c30} complaint${c30 > 1 ? 's' : ''} (30d)`);
  if (asset.UsageIntensity === 'High') factors.push('high usage');

  return { score, level, nextDate, daysUntil, factors };
}

const STATUS_WORD = {
  critical: 'Overdue', warning: 'Due soon', watch: 'Keep watch', healthy: 'Healthy'
};

/* ---------------- Demo data ---------------- */
function demoData() {
  const today = new Date();
  const d = (n) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);
  return [
    { ID: 'A101-AC', Room: '101', Block: 'A', Type: 'AC', InstallDate: d(900), LastMaintenance: d(210), Complaints30d: 3, Complaints90d: 5, UsageIntensity: 'High' },
    { ID: 'A101-EL', Room: '101', Block: 'A', Type: 'Electrical', InstallDate: d(1400), LastMaintenance: d(60), Complaints30d: 0, Complaints90d: 1, UsageIntensity: 'Medium' },
    { ID: 'A102-GY', Room: '102', Block: 'A', Type: 'Geyser', InstallDate: d(1100), LastMaintenance: d(310), Complaints30d: 1, Complaints90d: 2, UsageIntensity: 'High' },
    { ID: 'A104-PL', Room: '104', Block: 'A', Type: 'Plumbing', InstallDate: d(1800), LastMaintenance: d(40), Complaints30d: 0, Complaints90d: 0, UsageIntensity: 'Low' },
    { ID: 'B201-FS', Room: '201', Block: 'B', Type: 'FireSafety', InstallDate: d(600), LastMaintenance: d(95), Complaints30d: 0, Complaints90d: 0, UsageIntensity: 'Low' },
    { ID: 'B202-AC', Room: '202', Block: 'B', Type: 'AC', InstallDate: d(2000), LastMaintenance: d(30), Complaints30d: 0, Complaints90d: 1, UsageIntensity: 'Medium' },
    { ID: 'B203-FU', Room: '203', Block: 'B', Type: 'Furniture', InstallDate: d(1500), LastMaintenance: d(400), Complaints30d: 2, Complaints90d: 3, UsageIntensity: 'High' },
    { ID: 'C301-EL', Room: '301', Block: 'C', Type: 'Electrical', InstallDate: d(2200), LastMaintenance: d(260), Complaints30d: 4, Complaints90d: 6, UsageIntensity: 'High' },
    { ID: 'C302-GY', Room: '302', Block: 'C', Type: 'Geyser', InstallDate: d(300), LastMaintenance: d(20), Complaints30d: 0, Complaints90d: 0, UsageIntensity: 'Low' },
    { ID: 'C303-PL', Room: '303', Block: 'C', Type: 'Plumbing', InstallDate: d(2600), LastMaintenance: d(500), Complaints30d: 1, Complaints90d: 4, UsageIntensity: 'Medium' },
  ];
}

/* ---------------- State ---------------- */
let rawAssets = [];
let gasUrl = null;

function fmtDate(dt) {
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dueLabel(daysUntil) {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
  if (daysUntil === 0) return 'due today';
  return `in ${daysUntil}d`;
}

function conicFor(level) {
  const c = { critical: '#c0392f', warning: '#b8720a', watch: '#8a7a10', healthy: '#1f7a51' }[level];
  return `conic-gradient(${c} 0deg, ${c} 300deg, #e2eaf7 300deg 360deg)`;
}

function render() {
  const today = new Date();
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const typeF = document.getElementById('filterType').value;
  const riskF = document.getElementById('filterRisk').value;
  const sortBy = document.getElementById('sortBy').value;

  let items = rawAssets.map(a => ({ asset: a, risk: computeRisk(a, today) }));

  items = items.filter(({ asset, risk }) => {
    if (typeF !== 'all' && asset.Type !== typeF) return false;
    if (riskF !== 'all' && risk.level !== riskF) return false;
    if (q) {
      const hay = `${asset.Room} ${asset.Block} ${asset.Type} ${asset.ID}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortBy === 'risk') items.sort((a, b) => b.risk.score - a.risk.score);
  else if (sortBy === 'due') items.sort((a, b) => a.risk.daysUntil - b.risk.daysUntil);
  else items.sort((a, b) => a.asset.Room.localeCompare(b.asset.Room, undefined, { numeric: true }));

  const grid = document.getElementById('grid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (items.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    items.forEach(({ asset, risk }) => grid.appendChild(buildCard(asset, risk)));
  }

  const all = rawAssets.map(a => computeRisk(a, today));
  document.getElementById('statCritical').textContent = all.filter(r => r.level === 'critical').length;
  document.getElementById('statWarning').textContent = all.filter(r => r.level === 'warning').length;
  document.getElementById('statWatch').textContent = all.filter(r => r.level === 'watch').length;
  document.getElementById('statHealthy').textContent = all.filter(r => r.level === 'healthy').length;
  document.getElementById('statAvg').textContent = all.length
    ? Math.round(all.reduce((s, r) => s + r.score, 0) / all.length)
    : 0;
}

function buildCard(asset, risk) {
  const card = document.createElement('div');
  card.className = `card ${risk.level}`;
  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="room-id">Room ${asset.Room}</div>
        <div class="room-meta">Block ${asset.Block} · ${asset.ID}</div>
      </div>
      <div class="asset-type">${asset.Type.replace(/([A-Z])/g, ' $1').trim()}</div>
    </div>
    <div class="tag-wrap">
      <div class="dial" style="background:${conicFor(risk.level)}">
        <div class="dial-inner">
          <div class="score mono">${risk.score}</div>
          <div class="score-lbl">risk</div>
        </div>
      </div>
      <div class="tag-info">
        <div class="status-word ${risk.level}">${STATUS_WORD[risk.level]}</div>
        <div class="next-date">Next: ${fmtDate(risk.nextDate)} · ${dueLabel(risk.daysUntil)}</div>
      </div>
    </div>
    <div class="factors">
      ${risk.factors.map(f => `<span class="factor-chip">${f}</span>`).join('')}
    </div>
    <div class="card-actions">
      <button class="btn-log" data-id="${asset.ID}">Log maintenance done today</button>
    </div>
  `;
  card.querySelector('.btn-log').addEventListener('click', (e) => logMaintenance(asset.ID, e.target));
  return card;
}

async function logMaintenance(id, btnEl) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const asset = rawAssets.find(a => a.ID === id);
  if (!asset) return;

  btnEl.disabled = true;
  btnEl.textContent = 'Logging…';

  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'logMaintenance', id, date: todayStr }),
      });
    } catch (err) {
      console.error('Sheet update failed', err);
    }
  }
  asset.LastMaintenance = todayStr;
  render();
}

/* ---------------- Data loading ---------------- */
async function loadFromSheet(url) {
  document.getElementById('syncText').textContent = 'Connecting…';
  try {
    const res = await fetch(`${url}?action=list`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
    rawAssets = data;
    gasUrl = url;
    document.getElementById('syncDot').className = 'dot pulse';
    document.getElementById('syncText').textContent = 'Live · synced with Google Sheet';
    render();
  } catch (err) {
    document.getElementById('syncDot').className = 'dot off';
    document.getElementById('syncText').textContent = 'Could not reach Sheet · showing demo data';
    rawAssets = demoData();
    gasUrl = null;
    render();
  }
}

function loadDemo() {
  rawAssets = demoData();
  gasUrl = null;
  document.getElementById('syncDot').className = 'dot off';
  document.getElementById('syncText').textContent = 'Demo data · not connected to Sheet';
  render();
}

/* ---------------- Wiring ---------------- */
document.getElementById('setupToggle').addEventListener('click', () => {
  const p = document.getElementById('setupPanel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('connectBtn').addEventListener('click', () => {
  const url = document.getElementById('gasUrlInput').value.trim();
  if (url) loadFromSheet(url);
});
document.getElementById('demoBtn').addEventListener('click', loadDemo);
['searchBox'].forEach(id => document.getElementById(id).addEventListener('input', render));
['filterType', 'filterRisk', 'sortBy'].forEach(id => document.getElementById(id).addEventListener('change', render));

loadDemo();
