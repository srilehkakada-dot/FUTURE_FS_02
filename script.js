/* ===== LEADFLOW CRM - script.js ===== */

const STATUS_COLORS = {
  'New':        { accent: '#4f8ef7' },
  'Contacted':  { accent: '#a78bfa' },
  'Follow Up':  { accent: '#f59e0b' },
  'Closed':     { accent: '#10b981' },
};

// ===== SAMPLE DATA =====
const SAMPLE_LEADS = [
  { id: 'sample1', name: 'Jane Doe',    email: 'jane@acme.com',      phone: '+91 98765 43210', company: 'Acme Corp',    status: 'New',       createdAt: Date.now() - 6*86400000 },
  { id: 'sample2', name: 'Raj Sharma',  email: 'raj@technova.in',    phone: '+91 91234 56789', company: 'TechNova Ltd', status: 'Contacted', createdAt: Date.now() - 5*86400000 },
  { id: 'sample3', name: 'Priya Kumar', email: 'priya@growify.io',   phone: '+91 99887 76655', company: 'Growify',      status: 'Follow Up', createdAt: Date.now() - 4*86400000 },
  { id: 'sample4', name: 'Arjun Mehta', email: 'arjun@zeta.dev',     phone: '+91 88001 23456', company: 'Zeta Systems', status: 'Closed',    createdAt: Date.now() - 3*86400000 },
  { id: 'sample5', name: 'Sara Patel',  email: 'sara@brightedge.co', phone: '+91 77009 88776', company: 'BrightEdge',   status: 'New',       createdAt: Date.now() - 2*86400000 },
  { id: 'sample6', name: 'Kiran Rao',   email: 'kiran@finvest.com',  phone: '+91 90000 11223', company: 'Finvest Co',   status: 'Contacted', createdAt: Date.now() - 1*86400000 },
];

// ===== STATE =====
// Force load samples — clears any stale/broken localStorage from previous runs
localStorage.setItem('crm_leads', JSON.stringify(SAMPLE_LEADS));
let leads = [...SAMPLE_LEADS];
let activeFilter = 'All';
let searchQuery = '';
let deleteTargetId = null;

// ===== UTILS =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function save() { localStorage.setItem('crm_leads', JSON.stringify(leads)); }
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ===== RENDER =====
function getFiltered() {
  return leads.filter(l => {
    const matchFilter = activeFilter === 'All' || l.status === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function renderLeads() {
  const grid  = document.getElementById('leadsGrid');
  const empty = document.getElementById('emptyState');
  const filtered = getFiltered();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(l => cardHTML(l)).join('');

    grid.querySelectorAll('.card-btn[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEdit(btn.dataset.edit));
    });
    grid.querySelectorAll('.card-btn[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
    });
  }
  updateStats();
}

function cardHTML(l) {
  const col = STATUS_COLORS[l.status] || STATUS_COLORS['New'];
  const badgeClass = 'badge-' + l.status.replace(/ /g, '\\ ');
  return `
  <div class="lead-card" style="--card-accent:${col.accent}">
    <div class="card-top">
      <div class="card-avatar" style="background:${col.accent}">${escHtml(initials(l.name))}</div>
      <div class="card-actions">
        <button class="card-btn" data-edit="${l.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="card-btn del" data-delete="${l.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
    <div class="card-name">${escHtml(l.name)}</div>
    <div class="card-company"><i class="fa-solid fa-building"></i>${escHtml(l.company)}</div>
    <div class="card-divider"></div>
    <div class="card-meta">
      <div class="card-meta-row"><i class="fa-solid fa-envelope"></i>${escHtml(l.email || '—')}</div>
      <div class="card-meta-row"><i class="fa-solid fa-phone"></i>${escHtml(l.phone || '—')}</div>
    </div>
    <div class="card-bottom">
      <span class="status-badge ${badgeClass}">${escHtml(l.status)}</span>
      <span class="card-id">#${l.id.slice(-5).toUpperCase()}</span>
    </div>
  </div>`;
}

function updateStats() {
  document.getElementById('nav-total').textContent        = leads.length;
  document.getElementById('count-new').textContent        = leads.filter(l => l.status === 'New').length;
  document.getElementById('count-contacted').textContent  = leads.filter(l => l.status === 'Contacted').length;
  document.getElementById('count-followup').textContent   = leads.filter(l => l.status === 'Follow Up').length;
  document.getElementById('count-closed').textContent     = leads.filter(l => l.status === 'Closed').length;
}

// ===== FORM MODAL =====
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const leadForm     = document.getElementById('leadForm');

function openModal() { modalOverlay.classList.add('open'); }
function closeModal() {
  modalOverlay.classList.remove('open');
  leadForm.reset();
  document.getElementById('editId').value = '';
  document.querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
  document.querySelector('.status-opt[data-val="New"]').classList.add('active');
  document.getElementById('fStatus').value = 'New';
  modalTitle.textContent = 'Add New Lead';
}

function openEdit(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  modalTitle.textContent = 'Edit Lead';
  document.getElementById('editId').value   = lead.id;
  document.getElementById('fName').value    = lead.name;
  document.getElementById('fEmail').value   = lead.email;
  document.getElementById('fPhone').value   = lead.phone;
  document.getElementById('fCompany').value = lead.company;
  document.getElementById('fStatus').value  = lead.status;
  document.querySelectorAll('.status-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.val === lead.status);
  });
  openModal();
}

document.getElementById('openFormBtn').addEventListener('click', () => { closeModal(); openModal(); });
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelForm').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

document.querySelectorAll('.status-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('fStatus').value = btn.dataset.val;
  });
});

leadForm.addEventListener('submit', e => {
  e.preventDefault();
  const name    = document.getElementById('fName').value.trim();
  const email   = document.getElementById('fEmail').value.trim();
  const phone   = document.getElementById('fPhone').value.trim();
  const company = document.getElementById('fCompany').value.trim();
  const status  = document.getElementById('fStatus').value;
  const editId  = document.getElementById('editId').value;

  if (!name)    { showToast('Name is required', 'error');    return; }
  if (!email)   { showToast('Email is required', 'error');   return; }
  if (!company) { showToast('Company is required', 'error'); return; }

  if (editId) {
    const idx = leads.findIndex(l => l.id === editId);
    if (idx > -1) {
      leads[idx] = { ...leads[idx], name, email, phone, company, status, updatedAt: Date.now() };
      showToast('Lead updated ✓', 'success');
    }
  } else {
    leads.unshift({ id: uid(), name, email, phone, company, status, createdAt: Date.now() });
    showToast('Lead added ✓', 'success');
  }

  save();
  renderLeads();
  closeModal();
});

// ===== DELETE MODAL =====
const deleteOverlay = document.getElementById('deleteOverlay');

function openDeleteModal(id) { deleteTargetId = id; deleteOverlay.classList.add('open'); }
function closeDeleteModal()  { deleteOverlay.classList.remove('open'); deleteTargetId = null; }

document.getElementById('closeDelete').addEventListener('click', closeDeleteModal);
document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });
document.getElementById('confirmDelete').addEventListener('click', () => {
  if (!deleteTargetId) return;
  leads = leads.filter(l => l.id !== deleteTargetId);
  save();
  renderLeads();
  showToast('Lead deleted', 'info');
  closeDeleteModal();
});

// ===== SEARCH =====
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  clearSearch.style.display = searchQuery ? 'grid' : 'none';
  renderLeads();
});
clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearch.style.display = 'none';
  renderLeads();
});

// ===== FILTER =====
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderLeads();
  });
});

// ===== STAT CARD QUICK FILTER =====
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('click', () => {
    const status = card.dataset.status;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === status);
    });
    activeFilter = status;
    renderLeads();
    document.querySelector('.controls').scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== EXPORT CSV =====
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!leads.length) { showToast('No leads to export', 'error'); return; }
  const headers = ['Name','Email','Phone','Company','Status','ID'];
  const rows = leads.map(l => [
    `"${l.name}"`,`"${l.email}"`,`"${l.phone}"`,`"${l.company}"`,`"${l.status}"`,`"${l.id}"`
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'leads_export.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Exported as CSV ✓', 'success');
});

// ===== INIT =====
renderLeads();