// ===== DATA =====
const SERVICES = [
  { key:'setor', label:'Setor Tunai', icon:'💰', color:'#10b981', fee:0, brimoFlow:'out', cashFlow:'in' },
  { key:'tarik', label:'Tarik Tunai', icon:'💵', color:'#ef4444', fee:5000, brimoFlow:'in', cashFlow:'out' },
  { key:'transfer', label:'Transfer', icon:'💸', color:'#3b82f6', fee:2500, brimoFlow:'out', cashFlow:'in' },
  { key:'pulsa', label:'Pulsa', icon:'📱', color:'#8b5cf6', fee:1000, brimoFlow:'out', cashFlow:'in' },
  { key:'pln', label:'Listrik PLN', icon:'⚡', color:'#f59e0b', fee:2500, brimoFlow:'out', cashFlow:'in' },
  { key:'pdam', label:'PDAM', icon:'💧', color:'#06b6d4', fee:2500, brimoFlow:'out', cashFlow:'in' },
  { key:'bpjs', label:'BPJS', icon:'🏥', color:'#14b8a6', fee:2500, brimoFlow:'out', cashFlow:'in' },
  { key:'internet', label:'Internet/TV', icon:'📡', color:'#f97316', fee:2500, brimoFlow:'out', cashFlow:'in' },
  { key:'topupgame', label:'Topup Game', icon:'🎮', color:'#ec4899', fee:2000, brimoFlow:'out', cashFlow:'in' },
  { key:'kartuhp', label:'Kartu Hp', icon:'📲', color:'#8b5cf6', fee:0, brimoFlow:'none', cashFlow:'in' },
];
const PRODUCTS = [
  { key:'gas', label:'Tabung Gas', icon:'🛢️', color:'#f97316', sellPrice:20000, brimoFlow:'none', cashFlow:'in', defaultStock: 10 },
  { key:'air', label:'Air Isi Ulang', icon:'💧', color:'#06b6d4', sellPrice:5000, brimoFlow:'none', cashFlow:'in', defaultStock: 20 },
];
const ALL_ITEMS = [
  ...SERVICES.map(s => ({ ...s, itemType: 'service' })),
  ...PRODUCTS.map(p => ({ ...p, itemType: 'product', fee:0 }))
];
function getItem(key) { return ALL_ITEMS.find(i => i.key === key); }

// ===== SAFE PARSE HELPER & MIGRATION =====
function safeParse(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    if (key === 'bri_settings' && parsed.modal !== undefined && parsed.modalBrimo === undefined) {
      parsed.modalBrimo = parsed.modal;
      parsed.modalCash = 0;
      delete parsed.modal;
      localStorage.setItem('bri_settings', JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
}

let state = {
  user: safeParse('bri_user', null),
  transactions: safeParse('bri_tx', []),
  settings: safeParse('bri_settings', {
    name:"Agen BRI Link 001", id:"AGEN001", addr:"Jl. Merdeka No.1",
    phone:"0800-1500-012", modalBrimo:5000000, modalCash:2000000
  }),
  stock: safeParse('bri_stock', (() => {
    const init = {};
    PRODUCTS.forEach(p => init[p.key] = p.defaultStock);
    return init;
  })())
};

// ===== MODAL CALCULATION =====
function getBrmoSisa() {
  let sisa = state.settings.modalBrimo || 0;
  state.transactions.forEach(t => {
    const item = getItem(t.type);
    if (t.type === 'add_modal' && t.modalType === 'brimo') sisa += t.amount;
    else if (item) {
      if (item.brimoFlow === 'out') sisa -= t.amount;
      else if (item.brimoFlow === 'in') sisa += t.amount;
    }
  });
  return sisa;
}
function getCashSisa() {
  let sisa = state.settings.modalCash || 0;
  state.transactions.forEach(t => {
    const item = getItem(t.type);
    if (t.type === 'add_modal' && t.modalType === 'cash') sisa += t.amount;
    else if (item) {
      if (item.cashFlow === 'out') sisa -= t.amount;
      else if (item.cashFlow === 'in') sisa += t.amount;
    }
  });
  return sisa;
}
function getFlowTotal(flowType, wallet) {
  let total = 0;
  state.transactions.forEach(t => {
    const item = getItem(t.type);
    if (t.type === 'add_modal' && t.modalType === wallet) {
      total += t.amount;
    } else if (item) {
      const flow = wallet === 'brimo' ? item.brimoFlow : item.cashFlow;
      if (flow === flowType) total += t.amount;
    }
  });
  return total;
}
function getTotalFee() {
  return state.transactions.reduce((s, t) => s + (t.fee || 0), 0);
}
function getTotalRevenue() {
  return state.transactions.filter(t => getItem(t.type)?.itemType === 'product').reduce((s, t) => s + (t.amount || 0), 0);
}
function getTodayOmzet() {
  const today = new Date().toDateString();
  return state.transactions.filter(t => new Date(t.date).toDateString() === today).reduce((s,t) => s + (t.amount||0), 0);
}

// ===== UTIL =====
function formatRupiahInput(input) {
  const cursorPos = input.selectionStart;
  const oldLength = input.value.length;
  let value = input.value.replace(/[^0-9]/g, '');
  if (value !== '') {
    value = parseInt(value).toLocaleString('id-ID');
  }
  input.value = value;
  const newLength = input.value.length;
  const diff = newLength - oldLength;
  const newPos = Math.max(0, cursorPos + diff);
  input.setSelectionRange(newPos, newPos);
}
function hanyaAngka(event) {
  const allowedKeys = [8, 46, 37, 38, 39, 40, 9, 36, 35, 13];
  if (allowedKeys.includes(event.keyCode)) return true;
  return event.keyCode >= 48 && event.keyCode <= 57;
}
function getNominalValue() {
  let value = document.getElementById('txAmount').value;
  return parseInt(value.replace(/\./g, '')) || 0;
}
const fmt = n => 'Rp ' + (n||0).toLocaleString('id-ID');
const fmtShort = n => {
  if (Math.abs(n) >= 1000000) return 'Rp ' + (n/1000000).toFixed(1) + 'jt';
  if (Math.abs(n) >= 1000) return 'Rp ' + (n/1000).toFixed(0) + 'rb';
  return fmt(n);
};
const fmtDate = d => new Date(d).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const save = () => {
  localStorage.setItem('bri_tx', JSON.stringify(state.transactions));
  localStorage.setItem('bri_settings', JSON.stringify(state.settings));
  localStorage.setItem('bri_stock', JSON.stringify(state.stock));
};

// ===== AUTH =====
function doLogin(e) {
  e.preventDefault();
  const id = document.getElementById('loginId').value;
  const pass = document.getElementById('loginPass').value;
  if (id==='kios yuyun' && pass==='alfaqih23') {
    state.user = { id, name: 'Kasir 01' };
    localStorage.setItem('bri_user', JSON.stringify(state.user));
    initApp();
  } else alert('ID atau password salah!');
}
function doLogout() {
  if (!confirm('Keluar dari aplikasi?')) return;
  localStorage.removeItem('bri_user');
  location.reload();
}

let charts = {};
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

function initApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  document.getElementById('userName').textContent = state.user.name;
  document.getElementById('userAvatar').textContent = state.user.name[0].toUpperCase();
  document.getElementById('agentInfo').textContent = state.settings.name;
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const now = new Date();
  const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('reportMonth').value = monthStr;
  renderMenu();
  renderProduk();
  renderDashboard();
  renderLayanan();
  renderProdukStats();
  renderAnalytics();
  renderHistory();
  renderReport();
  loadSettings();
  renderLowStockAlert();
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('active');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

// ===== RENDER FUNCTIONS =====
function renderMenu() {
  document.getElementById('menuGrid').innerHTML = SERVICES.map(m => {
    const brmoTxt = m.brimoFlow === 'out' ? '📤 BRImo Keluar' : (m.brimoFlow === 'in' ? '💳 BRImo Masuk' : 'BRImo Tetap');
    const cashTxt = m.cashFlow === 'in' ? '💵 Cash Masuk' : (m.cashFlow === 'out' ? '📤 Cash Keluar' : 'Cash Tetap');
    return `<div class="menu-card" style="--menu-color: ${m.color};" onclick="openTx('${m.key}')">
      <span class="menu-badge service">Layanan</span>
      <div class="menu-icon">${m.icon}</div>
      <h3>${m.label}</h3>
      <div class="fee-tag">${brmoTxt}<br>${cashTxt}${m.fee > 0 ? '<br>Fee '+fmt(m.fee) : ''}</div>
    </div>`;
  }).join('');
}

function renderProduk() {
  document.getElementById('produkGrid').innerHTML = PRODUCTS.map(p => {
    const currentStock = state.stock[p.key] || 0;
    let stockClass = 'safe';
    let stockLabel = `Stok: ${currentStock}`;
    if (currentStock === 0) { stockClass = 'empty'; stockLabel = 'HABIS'; }
    else if (currentStock < 3) { stockClass = 'low'; stockLabel = `Sisa ${currentStock} ⚠️`; }
    return `<div class="menu-card" style="--menu-color: ${p.color};" onclick="openTx('${p.key}')">
      <span class="menu-badge product">Produk</span>
      <div class="menu-icon">${p.icon}</div>
      <h3>${p.label}</h3>
      <div class="fee-tag">Harga ${fmtShort(p.sellPrice)}<br>💵 Masuk Cash</div>
      <div class="stock-badge ${stockClass}">${stockLabel}</div>
    </div>`;
  }).join('');
}

function renderLowStockAlert() {
  const lowItems = PRODUCTS.filter(p => (state.stock[p.key] || 0) < 3);
  const alertBox = document.getElementById('lowStockAlert');
  const list = document.getElementById('lowStockList');
  if (lowItems.length === 0) {
    alertBox.style.display = 'none';
    return;
  }
  alertBox.style.display = 'block';
  list.innerHTML = lowItems.map(p => {
    const s = state.stock[p.key] || 0;
    const status = s === 0 ? 'HABIS!' : `Sisa ${s} (minimal 3)`;
    return `<div class="low-stock-item">
      <div class="emoji">${p.icon}</div>
      <div class="info">
        <div class="name">${p.label}</div>
        <div class="detail">${status}</div>
      </div>
      <div class="count">${s}</div>
    </div>`;
  }).join('');
}

function todayTx() {
  const today = new Date().toDateString();
  return state.transactions.filter(t => new Date(t.date).toDateString() === today);
}
function yesterdayTx() {
  const y = new Date(); y.setDate(y.getDate()-1);
  return state.transactions.filter(t => new Date(t.date).toDateString() === y.toDateString());
}
function calcTrend(today, yesterday) {
  if (yesterday === 0) return today > 0 ? {val:100, dir:'up'} : {val:0, dir:'neutral'};
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { val: Math.abs(pct), dir: pct >= 0 ? 'up' : 'down' };
}

function renderDashboard() {
  const txs = todayTx();
  const yTxs = yesterdayTx();
  const omzet = getTodayOmzet();
  const yOmzet = yesterdayTx().reduce((s,t) => s+t.amount, 0);
  const fee = txs.reduce((s,t) => s+t.fee, 0);
  const revenue = state.transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString() && getItem(t.type)?.itemType === 'product').reduce((s,t) => s + (t.amount||0), 0);
  const brmoSisa = getBrmoSisa();
  const cashSisa = getCashSisa();
  const brmoAwal = state.settings.modalBrimo || 0;
  const cashAwal = state.settings.modalCash || 0;

  document.getElementById('heroBrmo').textContent = fmt(brmoSisa);
  document.getElementById('heroBrmoAwal').textContent = fmt(brmoAwal);
  document.getElementById('heroBrmoKeluar').textContent = fmt(getFlowTotal('out', 'brimo'));
  document.getElementById('heroBrmoMasuk').textContent = fmt(getFlowTotal('in', 'brimo'));
  document.getElementById('heroCash').textContent = fmt(cashSisa);
  document.getElementById('heroCashAwal').textContent = fmt(cashAwal);
  document.getElementById('heroCashKeluar').textContent = fmt(getFlowTotal('out', 'cash'));
  document.getElementById('heroCashMasuk').textContent = fmt(getFlowTotal('in', 'cash'));

  document.getElementById('kpiCount').textContent = txs.length;
  document.getElementById('kpiOmzet').textContent = fmt(omzet);
  document.getElementById('kpiProfit').textContent = fmt(revenue);
  document.getElementById('kpiFee').textContent = fmt(fee);

  const countTrend = calcTrend(txs.length, yTxs.length);
  const omzetTrend = calcTrend(omzet, yOmzet);
  document.getElementById('kpiCountTrend').innerHTML = `${countTrend.dir==='up'?'↑':'↓'} ${countTrend.val}% vs kemarin`;
  document.getElementById('kpiCountTrend').className = `kpi-trend ${countTrend.dir}`;
  document.getElementById('kpiOmzetTrend').innerHTML = `${omzetTrend.dir==='up'?'↑':'↓'} ${omzetTrend.val}% vs kemarin`;
  document.getElementById('kpiOmzetTrend').className = `kpi-trend ${omzetTrend.dir}`;

  const recent = state.transactions.slice(-5).reverse();
  document.getElementById('recentTable').innerHTML = recent.length ? recent.map(t => {
    const item = getItem(t.type);
    if (!item && t.type !== 'add_modal') return '';
    let dampak = '-';
    if (t.type === 'add_modal') {
      dampak = `<span style="color:var(--success);font-weight:600;">+ ${fmt(t.amount)} (${t.modalType === 'brimo' ? 'BRImo' : 'Cash'})</span>`;
    } else {
      const parts = [];
      if (item.brimoFlow === 'out') parts.push(`BRImo -${fmt(t.amount)}`);
      if (item.brimoFlow === 'in') parts.push(`BRImo +${fmt(t.amount)}`);
      if (item.cashFlow === 'out') parts.push(`Cash -${fmt(t.amount)}`);
      if (item.cashFlow === 'in') parts.push(`Cash +${fmt(t.amount)}`);
      dampak = parts.map(p => `<div>${p}</div>`).join('');
    }
    const revenueStr = t.itemType === 'product' ? `<span style="color:var(--success);font-weight:600;">+${fmt(t.amount)}</span>` : (t.fee > 0 ? `<span style="color:var(--purple);font-weight:600;">+${fmt(t.fee)}</span>` : '-');
    const label = t.type === 'add_modal' ? 'Tambah Modal' : item.label;
    const icon = t.type === 'add_modal' ? '💰' : item.icon;
    const color = t.type === 'add_modal' ? '#10b981' : item.color;
    return `<tr>
      <td>${fmtDate(t.date)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:28px;height:28px;border-radius:8px;background:${color}20;color:${color};display:inline-flex;align-items:center;justify-content:center;font-size:14px;">${icon}</span>${label}</span></td>
      <td>${t.name}</td>
      <td><b>${fmt(t.amount)}</b></td>
      <td>${revenueStr}</td>
      <td style="font-size:11px;">${dampak}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state"><div class="icon">📭</div>Belum ada transaksi hari ini</td></tr>';

  renderTrendChart();
  renderPieChart();
}

function renderLayanan() {
  const byType = {};
  SERVICES.forEach(m => { byType[m.key] = { label:m.label, icon:m.icon, color:m.color, count:0, omzet:0, fee:0 }; });
  state.transactions.filter(t => getItem(t.type)?.itemType === 'service').forEach(t => {
    if (byType[t.type]) { byType[t.type].count++; byType[t.type].omzet += t.amount; byType[t.type].fee += t.fee; }
  });
  document.getElementById('layananTable').innerHTML = Object.values(byType).map(b => `<tr>
    <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:32px;height:32px;border-radius:8px;background:${b.color}20;color:${b.color};display:inline-flex;align-items:center;justify-content:center;font-size:16px;">${b.icon}</span><b>${b.label}</b></span></td>
    <td><b>${b.count}</b></td>
    <td>${fmt(b.omzet)}</td>
    <td>${fmt(b.fee)}</td>
  </tr>`).join('');
}

function renderProdukStats() {
  const byType = {};
  PRODUCTS.forEach(p => { byType[p.key] = { label:p.label, icon:p.icon, color:p.color, sellPrice:p.sellPrice, qty:0, omzet:0, revenue:0 }; });
  state.transactions.filter(t => getItem(t.type)?.itemType === 'product').forEach(t => {
    if (byType[t.type]) {
      byType[t.type].qty += (t.qty || 1);
      byType[t.type].omzet += t.amount;
      byType[t.type].revenue += t.amount;
    }
  });
  document.getElementById('produkTable').innerHTML = Object.values(byType).map(b => {
    const currentStock = state.stock[PRODUCTS.find(p => p.label === b.label).key] || 0;
    let stockStyle = 'color:var(--success);font-weight:700;';
    if (currentStock === 0) stockStyle = 'color:var(--danger);font-weight:700;';
    else if (currentStock < 3) stockStyle = 'color:var(--warning);font-weight:700;';
    return `<tr>
      <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:32px;height:32px;border-radius:8px;background:${b.color}20;color:${b.color};display:inline-flex;align-items:center;justify-content:center;font-size:16px;">${b.icon}</span><b>${b.label}</b></span></td>
      <td><span style="${stockStyle}">${currentStock} unit</span></td>
      <td><b>${b.qty}</b> unit</td>
      <td>${fmt(b.omzet)}</td>
      <td><span style="color:var(--success);font-weight:700;">+${fmt(b.revenue)}</span></td>
    </tr>`;
  }).join('');
}

// ===== CHARTS =====
function getLast7Days() {
  const days = [];
  for (let i=6; i >=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({ date: d.toISOString().split('T')[0], label: d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric'}) });
  }
  return days;
}

function renderTrendChart() {
  destroyChart('trend');
  const days = getLast7Days();
  const counts = days.map(d => state.transactions.filter(t => t.date.startsWith(d.date)).length);
  const omzets = days.map(d => state.transactions.filter(t => t.date.startsWith(d.date)).reduce((s,t) => s+t.amount, 0));
  const ctx = document.getElementById('trendChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(0,83,158,0.3)');
  gradient.addColorStop(1, 'rgba(0,83,158,0)');
  charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.label),
      datasets: [
        { label: 'Omzet', data: omzets, borderColor: '#00539E', backgroundColor: gradient, fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#00539E', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y' },
        { label: 'Jumlah Trx', data: counts, borderColor: '#F58220', backgroundColor: '#F58220', tension: 0.4, borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#F58220', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, padding: 15, font: { size: 12, weight: '600' } } },
        tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8, callbacks: { label: ctx => ctx.dataset.label === 'Omzet' ? 'Omzet: ' + fmt(ctx.raw) : 'Trx: ' + ctx.raw } }
      },
      scales: {
        y: { position: 'left', ticks: { callback: v => fmtShort(v), font: { size: 11 } }, grid: { color: '#f1f5f9' } },
        y1: { position: 'right', ticks: { font: { size: 11 } }, grid: { display: false } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderPieChart() {
  destroyChart('pie');
  const byType = {};
  state.transactions.forEach(t => { byType[t.type] = (byType[t.type]||0) + 1; });
  const keys = Object.keys(byType);
  if (keys.length === 0) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    ctx.font = '14px Inter'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', ctx.canvas.width/2, ctx.canvas.height/2);
    return;
  }
  charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: { labels: keys.map(k => getItem(k)?.label || k), datasets: [{ data: keys.map(k => byType[k]), backgroundColor: keys.map(k => getItem(k)?.color || '#64748b'), borderWidth: 3, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: '500' } } },
        tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8, callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} trx` } }
      }
    }
  });
}

function renderAnalytics() {
  renderBarChart();
  renderTopList();
  renderSummary();
}

function renderBarChart() {
  destroyChart('bar');
  const byType = {};
  state.transactions.forEach(t => {
    if (!byType[t.type]) byType[t.type] = { omzet:0, fee:0, revenue:0 };
    byType[t.type].omzet += t.amount;
    byType[t.type].fee += (t.fee||0);
    if (getItem(t.type)?.itemType === 'product') byType[t.type].revenue += t.amount;
  });
  const keys = Object.keys(byType);
  charts.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: keys.map(k => getItem(k)?.label || k),
      datasets: [
        { label: 'Omzet', data: keys.map(k => byType[k].omzet), backgroundColor: '#00539E', borderRadius: 8, borderSkipped: false },
        { label: 'Fee + Pendapatan', data: keys.map(k => byType[k].fee + byType[k].revenue), backgroundColor: '#F58220', borderRadius: 8, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, padding: 15, font: { size: 12, weight: '600' } } },
        tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8, callbacks: { label: ctx => ctx.dataset.label + ': ' + fmt(ctx.raw) } }
      },
      scales: {
        y: { ticks: { callback: v => fmtShort(v), font: { size: 11 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderTopList() {
  const byType = {};
  state.transactions.forEach(t => {
    if (!byType[t.type]) byType[t.type] = { count:0, omzet:0 };
    byType[t.type].count++;
    byType[t.type].omzet += t.amount;
  });
  const sorted = Object.entries(byType).sort((a,b) => b[1].count - a[1].count).slice(0,5);
  document.getElementById('topList').innerHTML = sorted.length ? sorted.map(([k,v],i) => {
    const m = getItem(k) || {icon: '❓', label: k};
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:12px;margin-bottom:8px;">
      <div style="width:32px;height:32px;border-radius:8px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">${i+1}</div>
      <div style="font-size:22px;">${m.icon}</div>
      <div style="flex:1;"><div style="font-weight:700;">${m.label}</div><div style="font-size:11px;color:var(--text-muted);">${v.count} transaksi</div></div>
      <div style="font-weight:700;color:var(--primary);">${fmt(v.omzet)}</div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="icon">📊</div>Belum ada data</div>';
}

function renderSummary() {
  const txs = state.transactions;
  const days = new Set(txs.map(t => new Date(t.date).toDateString())).size || 1;
  const avgDay = (txs.length / days).toFixed(1);
  const avgNom = txs.length ? txs.reduce((s,t) => s+t.amount, 0) / txs.length : 0;
  const totalIncome = getTotalFee() + getTotalRevenue();
  document.getElementById('avgDay').textContent = avgDay + ' trx';
  document.getElementById('avgNom').textContent = fmt(Math.round(avgNom));
  document.getElementById('totalFeeAll').textContent = fmt(totalIncome);
}

// ===== TRANSACTION =====
function openTx(key) {
  const item = getItem(key);
  if (!item) return;
  document.getElementById('modalTitle').textContent = item.icon + ' ' + item.label;
  document.getElementById('txType').value = key;
  document.getElementById('txItemType').value = item.itemType;
  document.getElementById('txForm').reset();
  document.getElementById('btnProses').disabled = false;
  document.getElementById('btnProses').style.opacity = '1';

  if (item.itemType === 'product') {
    document.getElementById('serviceFields').style.display = 'block';
    document.getElementById('productFields').style.display = 'none';
    document.getElementById('txAmount').value = item.sellPrice.toLocaleString('id-ID');
    document.getElementById('txFee').value = '0';
    document.getElementById('labelAmount').textContent = 'Nominal Transaksi';
    document.getElementById('labelTotal').textContent = 'Total Bayar Pelanggan';
    document.getElementById('rowFee').style.display = 'flex';
    document.getElementById('rowFeeSummary').style.display = 'flex';
    document.getElementById('rowProfit').style.display = 'none';
    const currentStock = state.stock[item.key] || 0;
    const stockInfo = document.getElementById('productStockInfo');
    if (currentStock === 0) {
      stockInfo.innerHTML = `<span style="color:var(--danger);font-weight:700;">⛔ STOK HABIS!</span>`;
      document.getElementById('btnProses').disabled = true;
      document.getElementById('btnProses').style.opacity = '0.5';
    } else if (currentStock < 3) {
      stockInfo.innerHTML = `<span style="color:var(--warning);">⚠️ Stok tersisa ${currentStock}</span>`;
    } else {
      stockInfo.innerHTML = `<span style="color:var(--success);">✅ Stok: ${currentStock}</span>`;
    }
    document.getElementById('modalInfoText').textContent = '💵 Cash bertambah sesuai nominal + fee';
  } else {
    document.getElementById('serviceFields').style.display = 'block';
    document.getElementById('productFields').style.display = 'none';
    document.getElementById('txFee').value = item.fee.toLocaleString('id-ID');
    document.getElementById('labelAmount').textContent = 'Nominal Transaksi';
    document.getElementById('labelTotal').textContent = 'Total Bayar Pelanggan';
    document.getElementById('rowFee').style.display = 'flex';
    document.getElementById('rowFeeSummary').style.display = 'flex';
    document.getElementById('rowProfit').style.display = 'none';
    let info = [];
    if (item.brimoFlow === 'out') info.push('📤 BRImo berkurang');
    if (item.brimoFlow === 'in') info.push('💳 BRImo bertambah');
    if (item.cashFlow === 'out') info.push('📤 Cash berkurang');
    if (item.cashFlow === 'in') info.push('💵 Cash bertambah');
    document.getElementById('modalInfoText').textContent = info.join(' | ');
  }
  calcTotal();
  document.getElementById('txModal').classList.add('active');
}

function closeModal() { document.getElementById('txModal').classList.remove('active'); }

function calcTotal() {
  const itemType = document.getElementById('txItemType').value;
  let amount = 0, fee = 0, revenue = 0;
  if (itemType === 'product') {
    const nominal = parseInt(document.getElementById('txAmount').value.replace(/\./g, '')) || 0;
    const feeVal = parseInt(document.getElementById('txFee').value.replace(/\./g, '')) || 0;
    amount = nominal;
    fee = feeVal;
    revenue = nominal + feeVal;
    document.getElementById('sumAmount').textContent = fmt(nominal);
    document.getElementById('sumFee').textContent = fmt(feeVal);
    document.getElementById('sumTotal').textContent = fmt(nominal + feeVal);
  } else {
    amount = getNominalValue();
    fee = parseInt(document.getElementById('txFee').value.replace(/\./g, '')) || 0;
    revenue = fee;
    document.getElementById('sumAmount').textContent = fmt(amount);
    document.getElementById('sumFee').textContent = fmt(fee);
    document.getElementById('sumTotal').textContent = fmt(amount + fee);
  }
  if (amount < 0) {
    alert('Nominal tidak boleh kurang dari 0');
    return;
  }
  const type = document.getElementById('txType').value;
  const item = getItem(type);
  let projBrmo = getBrmoSisa();
  let projCash = getCashSisa();
  if (item) {
    if (item.brimoFlow === 'out') projBrmo -= amount;
    else if (item.brimoFlow === 'in') projBrmo += amount;
    if (item.cashFlow === 'out') projCash -= amount;
    else if (item.cashFlow === 'in') projCash += amount;
  }
  document.getElementById('modalBarBrmo').textContent = fmt(projBrmo);
  document.getElementById('modalBarCash').textContent = fmt(projCash);
  const maxBrmo = Math.max(state.settings.modalBrimo, projBrmo, 1000000);
  const pctBrmo = Math.max(0, Math.min(100, (projBrmo / maxBrmo) * 100));
  document.getElementById('modalBarBrmoFill').style.width = pctBrmo + '%';
  document.getElementById('modalBarBrmoFill').style.background = projBrmo < 0 ? 'var(--danger)' : (pctBrmo < 20 ? 'var(--warning)' : 'var(--primary)');
  const maxCash = Math.max(state.settings.modalCash, projCash, 1000000);
  const pctCash = Math.max(0, Math.min(100, (projCash / maxCash) * 100));
  document.getElementById('modalBarCashFill').style.width = pctCash + '%';
  document.getElementById('modalBarCashFill').style.background = projCash < 0 ? 'var(--danger)' : (pctCash < 20 ? 'var(--warning)' : 'var(--success)');

  const btn = document.getElementById('btnProses');
  if (itemType === 'product') {
    const currentStock = state.stock[type] || 0;
    const qty = +document.getElementById('txQty').value || 1;
    if (currentStock < qty) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = `⛔ Stok Tidak Cukup (sisa ${currentStock})`;
      return;
    }
  }
  if (projBrmo < 0 || projCash < 0) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = '⚠️ Saldo Tidak Cukup';
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = '✅ Proses Transaksi';
  }
}

function submitTx(e) {
  if (e) e.preventDefault();
  const type = document.getElementById('txType').value;
  const itemType = document.getElementById('txItemType').value;
  let amount, fee, revenue, qty, sellPrice;
  if (itemType === 'product') {
    const nominal = parseInt(document.getElementById('txAmount').value.replace(/\./g, '')) || 0;
    const feeVal = parseInt(document.getElementById('txFee').value.replace(/\./g, '')) || 0;
    if (nominal <= 0) {
      alert('❌ Nominal harus lebih dari 0!');
      return;
    }
    const currentStock = state.stock[type] || 0;
    if (currentStock < 1) {
      alert('⛔ Stok habis!');
      return;
    }
    amount = nominal;
    fee = feeVal;
    revenue = nominal + feeVal;
    qty = 1;
    sellPrice = nominal;
  } else {
    amount = getNominalValue();
    fee = parseInt(document.getElementById('txFee').value.replace(/\./g, '')) || 0;
    revenue = fee;
    qty = 1;
    sellPrice = amount;
  }
  if (amount < 0) {
    alert('Nominal tidak boleh kurang dari 0');
    return;
  }
  const tx = {
    id: 'TX' + Date.now(),
    type: type,
    itemType: itemType,
    name: document.getElementById('txName').value,
    amount: amount,
    fee: fee,
    revenue: revenue,
    qty: qty,
    sellPrice: sellPrice,
    date: new Date().toISOString(),
    status: 'success',
    agentId: state.settings.id,
  };
  state.transactions.push(tx);
  if (itemType === 'product') {
    state.stock[type] = (state.stock[type] || 0) - qty;
  }
  save();
  closeModal();
  renderDashboard();
  renderLayanan();
  renderProduk();
  renderProdukStats();
  renderAnalytics();
  renderHistory();
  renderReport();
  loadSettings();
  renderLowStockAlert();
  showReceipt(tx);
  if (itemType === 'product') {
    const newStock = state.stock[type] || 0;
    if (newStock === 0) {
      setTimeout(() => alert(`⛔ PERINGATAN!\n\nStok ${getItem(type).label} HABIS!\nSegera lakukan penambahan stok.`), 500);
    } else if (newStock < 3) {
      setTimeout(() => alert(`⚠️ Peringatan Stok Rendah!\n\nStok ${getItem(type).label} tersisa ${newStock} unit.\nSegera lakukan penambahan stok.`), 500);
    }
  }
}

// ===== ADD MODAL =====
function openAddModal() {
  document.getElementById('currentBrmoDisplay').textContent = fmt(getBrmoSisa());
  document.getElementById('currentCashDisplay').textContent = fmt(getCashSisa());
  document.getElementById('addModalForm').reset();
  document.getElementById('addModalType').value = 'brimo';
  calcAddModal();
  document.getElementById('addModalOverlay').classList.add('active');
}
function closeAddModal() { document.getElementById('addModalOverlay').classList.remove('active'); }
function calcAddModal() {
  const type = document.getElementById('addModalType').value;
  const addAmount = parseInt((document.getElementById('addModalAmount').value || '0').replace(/\./g, '')) || 0;
  const currentBrmo = getBrmoSisa();
  const currentCash = getCashSisa();
  if (type === 'brimo') {
    document.getElementById('addModalPreview').textContent = `Modal BRImo akan bertambah menjadi ${fmt(currentBrmo + addAmount)}`;
  } else {
    document.getElementById('addModalPreview').textContent = `Modal Cash akan bertambah menjadi ${fmt(currentCash + addAmount)}`;
  }
}
function submitAddModal(e) {
  if (e) e.preventDefault();
  const amount = parseInt(document.getElementById('addModalAmount').value.replace(/\./g, '')) || 0;
  const type = document.getElementById('addModalType').value;
  const note = document.getElementById('addModalNote').value || `Tambah Modal ${type === 'brimo' ? 'BRImo' : 'Cash'}`;
  if (amount <= 0) {
    alert('❌ Jumlah harus lebih dari 0!');
    return;
  }
  const tx = {
    id: 'TX' + Date.now(),
    type: 'add_modal',
    modalType: type,
    itemType: 'add_modal',
    name: note,
    amount: amount,
    fee: 0,
    revenue: 0,
    qty: 1,
    sellPrice: amount,
    date: new Date().toISOString(),
    status: 'success',
    agentId: state.settings.id,
  };
  state.transactions.push(tx);
  save();
  closeAddModal();
  renderDashboard();
  renderReport();
  loadSettings();
  alert(`✅ Modal ${type === 'brimo' ? 'BRImo' : 'Cash'} berhasil ditambahkan sebesar ${fmt(amount)}`);
}

// ===== RECEIPT =====
function showReceiptById(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (tx) showReceipt(tx);
}
function showReceipt(tx) {
  const item = getItem(tx.type);
  if (!item && tx.type !== 'add_modal') return;
  let dampak = '';
  let extraRows = '';
  if (tx.type === 'add_modal') {
    dampak = `+ ${fmt(tx.amount)} (${tx.modalType === 'brimo' ? 'BRImo' : 'Cash'})`;
    extraRows = `<div class="row"><span>Jenis</span><span>Tambah Modal ${tx.modalType === 'brimo' ? 'BRImo' : 'Cash'}</span></div>`;
  } else {
    const parts = [];
    if (item.brimoFlow === 'out') parts.push(`BRImo -${fmt(tx.amount)}`);
    if (item.brimoFlow === 'in') parts.push(`BRImo +${fmt(tx.amount)}`);
    if (item.cashFlow === 'out') parts.push(`Cash -${fmt(tx.amount)}`);
    if (item.cashFlow === 'in') parts.push(`Cash +${fmt(tx.amount)}`);
    dampak = parts.join(', ');
    if (tx.itemType === 'product') {
      extraRows = `<div class="row"><span>Produk</span><span>${item.label}</span></div>
        <div class="row"><span>Harga Jual</span><span>${fmt(tx.sellPrice)}</span></div>
        <div class="row"><span>Jumlah</span><span>${tx.qty} unit</span></div>`;
    }
  }
  const html = `<div class="receipt">
    <h3>🏦 BRI LINK</h3>
    <div class="center">${state.settings.name}</div>
    <div class="center">${state.settings.addr}</div>
    <div class="center">Telp: ${state.settings.phone}</div>
    <hr>
    <div class="center"><b>BUKTI TRANSAKSI</b></div>
    <hr>
    <div class="row"><span>ID</span><span>${tx.id}</span></div>
    <div class="row"><span>Tgl</span><span>${fmtDate(tx.date)}</span></div>
    ${tx.type !== 'add_modal' ? `<div class="row"><span>Jenis</span><span>${item.label}</span></div>` : ''}
    <div class="row"><span>Nama</span><span>${tx.name}</span></div>
    ${extraRows}
    <hr>
    <div class="row"><span>Total</span><span>${fmt(tx.amount)}</span></div>
    ${tx.fee > 0 ? `<div class="row"><span>Fee</span><span>${fmt(tx.fee)}</span></div>` : ''}
    <hr>
    <div class="row"><span>Dampak Saldo</span><span style="text-align:right;max-width:120px;">${dampak}</span></div>
    <div class="row"><span>Sisa BRImo</span><span>${fmt(getBrmoSisa())}</span></div>
    <div class="row"><span>Sisa Cash</span><span>${fmt(getCashSisa())}</span></div>
    <hr>
    <div class="center">Status: <b>SUKSES ✅</b></div>
    <div class="center">Kasir: ${state.user.name}</div>
  </div>`;
  document.getElementById('receiptContent').innerHTML = html;
  document.getElementById('printArea').innerHTML = html;
  document.getElementById('receiptModal').classList.add('active');
}
function printReceipt() { window.print(); }

// ===== HISTORY =====
let historyFilter = { type: 'all', date: '' };
function setFilter(type, el) {
  historyFilter.type = type;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderHistory();
}
function renderHistory() {
  const dateFilter = document.getElementById('filterDate').value;
  let txs = [...state.transactions].reverse();
  if (dateFilter) txs = txs.filter(t => t.date.startsWith(dateFilter));
  if (historyFilter.type !== 'all') txs = txs.filter(t => getItem(t.type)?.itemType === historyFilter.type);
  document.getElementById('historyTable').innerHTML = txs.length ? txs.map(t => {
    const item = getItem(t.type);
    if (!item && t.type !== 'add_modal') return '';
    const tipeBadge = t.type === 'add_modal' ? `<span class="badge badge-success">Tambah Modal</span>` : (item.itemType === 'product' ? `<span class="badge badge-product">Produk</span>` : `<span class="badge badge-service">Layanan</span>`);
    let dampak = '-';
    if (t.type === 'add_modal') {
      dampak = `<span style="color:var(--success);font-weight:600;">+ ${fmt(t.amount)} (${t.modalType})</span>`;
    } else {
      const parts = [];
      if (item.brimoFlow === 'out') parts.push(`BRImo -${fmt(t.amount)}`);
      if (item.brimoFlow === 'in') parts.push(`BRImo +${fmt(t.amount)}`);
      if (item.cashFlow === 'out') parts.push(`Cash -${fmt(t.amount)}`);
      if (item.cashFlow === 'in') parts.push(`Cash +${fmt(t.amount)}`);
      dampak = parts.map(p => `<div style="font-size:11px;">${p}</div>`).join('');
    }
    const revenueStr = t.type === 'add_modal' ? '-' : (t.itemType === 'product' ? `<span style="color:var(--success);font-weight:600;">+${fmt(t.revenue||t.amount)}</span>` : (t.fee > 0 ? `<span style="color:var(--purple);font-weight:600;">+${fmt(t.fee)}</span>` : '-'));
    const label = t.type === 'add_modal' ? 'Tambah Modal' : item.label;
    const icon = t.type === 'add_modal' ? '💰' : item.icon;
    const color = t.type === 'add_modal' ? '#10b981' : item.color;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;">${t.id}</td>
      <td>${fmtDate(t.date)}</td>
      <td>${tipeBadge}</td>
      <td><span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:24px;height:24px;border-radius:6px;background:${color}20;color:${color};display:inline-flex;align-items:center;justify-content:center;font-size:12px;">${icon}</span>${label}</span></td>
      <td>${t.name}</td>
      <td>${t.itemType==='product' ? t.qty+'x' : '-'}</td>
      <td><b>${fmt(t.amount)}</b></td>
      <td>${revenueStr}</td>
      <td>${dampak}</td>
      <td>
        <div class="action-group">
          <button class="btn-icon view" onclick="showReceiptById('${t.id}')" title="Lihat Struk">🖨️</button>
          <button class="btn-icon edit" onclick="openEditTx('${t.id}')" title="Edit">✏️</button>
          <button class="btn-icon delete" onclick="deleteTx('${t.id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="10" class="empty-state"><div class="icon">📭</div>Tidak ada data</td></tr>';
}
function resetFilter() {
  document.getElementById('filterDate').value='';
  historyFilter.type = 'all';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-filter="all"]').classList.add('active');
  renderHistory();
}

// ===== REPORT BULANAN =====
function renderReport() {
  const monthVal = document.getElementById('reportMonth').value;
  if (!monthVal) return;
  const [year, month] = monthVal.split('-');
  const monthTx = state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() == year && (d.getMonth()+1) == month;
  });
  const totalOmzet = monthTx.reduce((s,t) => s + (t.amount||0), 0);
  const totalFee = monthTx.reduce((s,t) => s + (t.fee||0), 0);
  const totalRevenue = monthTx.filter(t => getItem(t.type)?.itemType === 'product').reduce((s,t) => s + (t.amount||0), 0);
  document.getElementById('reportSummary').innerHTML = `<div class="report-card"><div class="label">Total Transaksi</div><div class="value">${monthTx.length}</div></div>
    <div class="report-card green"><div class="label">Total Omzet</div><div class="value">${fmt(totalOmzet)}</div></div>
    <div class="report-card orange"><div class="label">Total Fee</div><div class="value">${fmt(totalFee)}</div></div>
    <div class="report-card purple"><div class="label">Pendapatan Produk</div><div class="value">${fmt(totalRevenue)}</div></div>`;
  document.getElementById('reportTable').innerHTML = monthTx.length ? monthTx.map(t => {
    const item = getItem(t.type);
    if (!item && t.type !== 'add_modal') return '';
    const label = t.type === 'add_modal' ? 'Tambah Modal' : item.label;
    const icon = t.type === 'add_modal' ? '💰' : item.icon;
    const color = t.type === 'add_modal' ? '#10b981' : item.color;
    let dampak = '-';
    if (t.type === 'add_modal') dampak = `+ ${fmt(t.amount)} (${t.modalType})`;
    else {
      const parts = [];
      if (item.brimoFlow === 'out') parts.push(`BRImo -${fmt(t.amount)}`);
      if (item.brimoFlow === 'in') parts.push(`BRImo +${fmt(t.amount)}`);
      if (item.cashFlow === 'out') parts.push(`Cash -${fmt(t.amount)}`);
      if (item.cashFlow === 'in') parts.push(`Cash +${fmt(t.amount)}`);
      dampak = parts.join(', ');
    }
    return `<tr>
      <td>${fmtDate(t.date)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:24px;height:24px;border-radius:6px;background:${color}20;color:${color};display:inline-flex;align-items:center;justify-content:center;font-size:12px;">${icon}</span>${label}</span></td>
      <td>${t.name}</td>
      <td><b>${fmt(t.amount)}</b></td>
      <td>${t.fee > 0 ? fmt(t.fee) : '-'}</td>
      <td style="font-size:11px;">${dampak}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state"><div class="icon">📭</div>Tidak ada data untuk bulan ini</td></tr>';
}

function generatePDF() {
  const monthVal = document.getElementById('reportMonth').value;
  if (!monthVal) { alert('Pilih bulan terlebih dahulu!'); return; }
  const [year, month] = monthVal.split('-');
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthName = monthNames[parseInt(month)-1];
  const monthTx = state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() == year && (d.getMonth()+1) == month;
  });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(0, 83, 158);
  doc.text('BRI LINK KASIR', 105, 20, { align: 'center' });
  doc.setFontSize(12); doc.setTextColor(100, 116, 139);
  doc.text(state.settings.name, 105, 28, { align: 'center' });
  doc.setFontSize(14); doc.setTextColor(0, 0, 0);
  doc.text(`Laporan Bulanan - ${monthName} ${year}`, 105, 50, { align: 'center' });
  const tableData = monthTx.map(t => {
    const item = getItem(t.type);
    const label = t.type === 'add_modal' ? 'Tambah Modal' : (item ? item.label : t.type);
    let dampak = '-';
    if (t.type === 'add_modal') dampak = `+ (${t.modalType})`;
    else if (item) {
      const p = [];
      if (item.brimoFlow === 'out') p.push('BRImo -');
      if (item.brimoFlow === 'in') p.push('BRImo +');
      if (item.cashFlow === 'out') p.push('Cash -');
      if (item.cashFlow === 'in') p.push('Cash +');
      dampak = p.join(', ');
    }
    return [fmtDate(t.date), label, t.name, fmt(t.amount), t.fee > 0 ? fmt(t.fee) : '-', dampak];
  });
  doc.autoTable({
    startY: 60,
    head: [['Tanggal', 'Jenis', 'Nama', 'Nominal', 'Fee', 'Dampak']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 83, 158], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 251] }
  });
  doc.save(`Laporan_${monthName}_${year}.pdf`);
}

function printReport() {
  const monthVal = document.getElementById('reportMonth').value;
  if (!monthVal) { alert('Pilih bulan terlebih dahulu!'); return; }
  const [year, month] = monthVal.split('-');
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthName = monthNames[parseInt(month)-1];
  const monthTx = state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() == year && (d.getMonth()+1) == month;
  });
  const html = `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
    <h1 style="text-align: center; color: #00539E; margin-bottom: 5px;">BRI LINK KASIR</h1>
    <p style="text-align: center; color: #64748b; margin: 0;">${state.settings.name}</p>
    <h2 style="text-align: center; margin-bottom: 20px;">Laporan Bulanan - ${monthName} ${year}</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #00539E; color: white;">
          <th style="padding: 10px; text-align: left;">Tanggal</th>
          <th style="padding: 10px; text-align: left;">Jenis</th>
          <th style="padding: 10px; text-align: left;">Nama</th>
          <th style="padding: 10px; text-align: right;">Nominal</th>
          <th style="padding: 10px; text-align: right;">Fee</th>
        </tr>
      </thead>
      <tbody>
        ${monthTx.map(t => {
          const item = getItem(t.type);
          const label = t.type === 'add_modal' ? 'Tambah Modal' : (item ? item.label : t.type);
          return `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px;">${fmtDate(t.date)}</td>
            <td style="padding: 8px;">${label}</td>
            <td style="padding: 8px;">${t.name}</td>
            <td style="padding: 8px; text-align: right;">${fmt(t.amount)}</td>
            <td style="padding: 8px; text-align: right;">${t.fee > 0 ? fmt(t.fee) : '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
  document.getElementById('printArea').innerHTML = html;
  window.print();
}

// ===== SETTINGS =====
function loadSettings() {
  document.getElementById('setName').value = state.settings.name;
  document.getElementById('setId').value = state.settings.id;
  document.getElementById('setAddr').value = state.settings.addr;
  document.getElementById('setPhone').value = state.settings.phone;
  document.getElementById('setModalBrmo').value = (state.settings.modalBrimo || 0).toLocaleString('id-ID');
  document.getElementById('setModalCash').value = (state.settings.modalCash || 0).toLocaleString('id-ID');
  document.getElementById('infoBrmo').textContent = fmt(getBrmoSisa());
  document.getElementById('infoCash').textContent = fmt(getCashSisa());
  document.getElementById('infoFee').textContent = fmt(getTotalFee());
  document.getElementById('infoProfit').textContent = fmt(getTotalRevenue());
  document.getElementById('infoTotalTx').textContent = state.transactions.length + ' transaksi';
  const lastBackup = localStorage.getItem('bri_last_backup');
  document.getElementById('infoLastBackup').textContent = lastBackup ? fmtDate(lastBackup) : 'Belum pernah';
}
function saveSettings(e) {
  e.preventDefault();
  state.settings = {
    name: document.getElementById('setName').value,
    id: document.getElementById('setId').value,
    addr: document.getElementById('setAddr').value,
    phone: document.getElementById('setPhone').value,
    modalBrimo: parseInt(document.getElementById('setModalBrmo').value.replace(/\./g, '')) || 0,
    modalCash: parseInt(document.getElementById('setModalCash').value.replace(/\./g, '')) || 0,
  };
  save();
  document.getElementById('agentInfo').textContent = state.settings.name;
  loadSettings();
  renderDashboard();
  alert('✅ Pengaturan berhasil disimpan!');
}

// ===== NAV =====
function showPage(page, el) {
  ['dashboard','layanan','produk','analytics','history','report','settings'].forEach(p => {
    document.getElementById('page-'+p).style.display = p===page?'block':'none';
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const titles = {dashboard:'Dashboard',layanan:'Layanan Digital',produk:'Produk Fisik',analytics:'Analitik Performa',history:'Riwayat Transaksi',report:'Laporan Bulanan',settings:'Pengaturan Agen'};
  document.getElementById('pageTitle').textContent = titles[page];
  if (page==='dashboard') renderDashboard();
  if (page==='layanan') renderLayanan();
  if (page==='produk') { renderProdukStats(); renderProduk(); renderLowStockAlert(); }
  if (page==='analytics') renderAnalytics();
  if (page==='history') renderHistory();
  if (page==='report') renderReport();
  if (page==='settings') loadSettings();
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }
}

// ===== BACKUP & RESTORE DATA =====
function exportData() {
  const data = {
    version: '2.1',
    exportDate: new Date().toISOString(),
    transactions: state.transactions,
    settings: state.settings,
    stock: state.stock,
    credentials: safeParse('bri_credentials', null)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `backup_bri_link_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  localStorage.setItem('bri_last_backup', new Date().toISOString());
  alert('✅ Data berhasil di-export!\n\nSimpan file ini di tempat aman (Google Drive, WhatsApp, dll).');
  loadSettings();
}
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('⚠️ PERINGATAN:\n\nImport data akan MENGGANTI semua data saat ini.\n\nPastikan Anda sudah backup data lama sebelum melanjutkan.\n\nLanjutkan?')) {
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transactions || !data.settings) {
        throw new Error('Format file tidak valid');
      }
      const autoBackup = {
        version: 'auto',
        exportDate: new Date().toISOString(),
        transactions: state.transactions,
        settings: state.settings,
        stock: state.stock
      };
      localStorage.setItem('bri_auto_backup', JSON.stringify(autoBackup));
      state.transactions = data.transactions;
      state.settings = data.settings;
      if (data.stock) state.stock = data.stock;
      if (data.credentials) {
        localStorage.setItem('bri_credentials', JSON.stringify(data.credentials));
      }
      save();
      localStorage.setItem('bri_last_backup', new Date().toISOString());
      alert('✅ Data berhasil di-import!\n\nAplikasi akan dimuat ulang.');
      location.reload();
    } catch (err) {
      alert('❌ Gagal import data: ' + err.message + '\n\nPastikan file adalah backup yang valid.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===== RESET ALL DATA =====
function resetAllData() {
  if (!confirm('⚠️ PERINGATAN KERAS!\n\nAnda akan menghapus SEMUA data transaksi, pengaturan, dan stok produk.\n\nTindakan ini TIDAK DAPAT dibatalkan!\n\nLanjutkan?')) {
    return;
  }
  const konfirmasi = prompt('🔴 KONFIRMASI TERAKHIR!\n\nUntuk mencegah klik tidak sengaja, ketik kata:\n\nHAPUS\n\n(dengan huruf kapital semua)');
  if (konfirmasi !== 'HAPUS') {
    alert('❌ Dibatalkan. Kata konfirmasi tidak sesuai.');
    return;
  }
  try {
    localStorage.removeItem('bri_tx');
    localStorage.removeItem('bri_settings');
    localStorage.removeItem('bri_stock');
    localStorage.removeItem('bri_user');
    localStorage.removeItem('bri_last_backup');
    localStorage.removeItem('bri_auto_backup');
    alert('✅ Semua data berhasil dihapus!\n\nAplikasi akan dimuat ulang.');
    location.reload();
  } catch (err) {
    alert('❌ Gagal menghapus data: ' + err.message);
  }
}

// ===== EDIT & HAPUS TRANSAKSI =====
function openEditTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('editTxId').value = tx.id;
  document.getElementById('editTxIdDisplay').textContent = tx.id;
  document.getElementById('editDateDisplay').textContent = fmtDate(tx.date);
  document.getElementById('editName').value = tx.name;
  const item = getItem(tx.type);
  if (tx.type === 'add_modal') {
    document.getElementById('editAmountGroup').style.display = 'block';
    document.getElementById('editFeeGroup').style.display = 'none';
    document.getElementById('editQtyGroup').style.display = 'none';
    document.getElementById('editAmount').value = tx.amount.toLocaleString('id-ID');
  } else if (tx.itemType === 'product') {
    document.getElementById('editAmountGroup').style.display = 'none';
    document.getElementById('editFeeGroup').style.display = 'none';
    document.getElementById('editQtyGroup').style.display = 'block';
    document.getElementById('editQty').value = tx.qty || 1;
  } else {
    document.getElementById('editAmountGroup').style.display = 'block';
    document.getElementById('editFeeGroup').style.display = 'block';
    document.getElementById('editQtyGroup').style.display = 'none';
    document.getElementById('editAmount').value = tx.amount.toLocaleString('id-ID');
    document.getElementById('editFee').value = (tx.fee || 0).toLocaleString('id-ID');
  }
  document.getElementById('editModal').classList.add('active');
}
function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}
function saveEditTx(e) {
  e.preventDefault();
  const id = document.getElementById('editTxId').value;
  const txIndex = state.transactions.findIndex(t => t.id === id);
  if (txIndex === -1) return;
  const tx = state.transactions[txIndex];
  const oldQty = tx.qty || 1;
  tx.name = document.getElementById('editName').value;
  if (tx.type === 'add_modal') {
    const newAmount = parseInt(document.getElementById('editAmount').value.replace(/\./g, '')) || 0;
    tx.amount = newAmount;
    tx.sellPrice = newAmount;
  } else if (tx.itemType === 'product') {
    const newQty = parseInt(document.getElementById('editQty').value) || 1;
    const diff = newQty - oldQty;
    state.stock[tx.type] = (state.stock[tx.type] || 0) - diff;
    tx.qty = newQty;
    const item = getItem(tx.type);
    tx.amount = item.sellPrice * newQty;
    tx.revenue = tx.amount;
    tx.sellPrice = item.sellPrice;
  } else {
    const newAmount = parseInt(document.getElementById('editAmount').value.replace(/\./g, '')) || 0;
    const newFee = parseInt(document.getElementById('editFee').value.replace(/\./g, '')) || 0;
    tx.amount = newAmount;
    tx.fee = newFee;
    tx.revenue = newFee;
  }
  save();
  closeEditModal();
  renderDashboard();
  renderLayanan();
  renderProduk();
  renderProdukStats();
  renderAnalytics();
  renderHistory();
  renderReport();
  loadSettings();
  renderLowStockAlert();
  alert('✅ Transaksi berhasil diupdate!');
}
function deleteTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  const item = getItem(tx.type);
  const label = tx.type === 'add_modal' ? 'Tambah Modal' : (item ? item.label : tx.type);
  if (!confirm(`⚠️ HAPUS TRANSAKSI?\n\nJenis: ${label}\nNama: ${tx.name}\nNominal: ${fmt(tx.amount)}\n\nTindakan ini tidak dapat dibatalkan.`)) {
    return;
  }
  if (tx.itemType === 'product') {
    state.stock[tx.type] = (state.stock[tx.type] || 0) + (tx.qty || 1);
  }
  state.transactions = state.transactions.filter(t => t.id !== id);
  save();
  renderDashboard();
  renderLayanan();
  renderProduk();
  renderProdukStats();
  renderAnalytics();
  renderHistory();
  renderReport();
  loadSettings();
  renderLowStockAlert();
  alert('✅ Transaksi berhasil dihapus!');
}

// ===== MODAL ATUR STOK =====
function openStockModal() {
  const list = document.getElementById('stockEditorList');
  list.innerHTML = PRODUCTS.map(p => {
    const current = state.stock[p.key] || 0;
    return `<div class="stock-item">
      <div class="stock-icon" style="background:${p.color};">${p.icon}</div>
      <div class="stock-info">
        <div class="name">${p.label}</div>
        <div class="current">Stok saat ini: <b>${current}</b> unit</div>
      </div>
      <input type="number" id="stockInput_${p.key}" value="${current}" min="0" />
    </div>`;
  }).join('');
  document.getElementById('stockModal').classList.add('active');
}
function closeStockModal() {
  document.getElementById('stockModal').classList.remove('active');
}
function saveStock() {
  PRODUCTS.forEach(p => {
    const val = parseInt(document.getElementById(`stockInput_${p.key}`).value) || 0;
    state.stock[p.key] = Math.max(0, val);
  });
  save();
  closeStockModal();
  renderProduk();
  renderProdukStats();
  renderLowStockAlert();
  alert('✅ Stok produk berhasil diupdate!');
}

// ===== INIT =====
if (state.user) initApp();
