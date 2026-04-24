
const uid   = () => '_' + Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split('T')[0];
const fmt   = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const inr   = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const $     = id => document.getElementById(id);


function lsGet(key, def) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : def;
  } catch { return def; }
}
function lsSave(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const getUsers    = () => lsGet('ah_users', {});
const getCrops    = () => lsGet('ah_crops', []);
const getInv      = () => lsGet('ah_inventory', []);
const getTasks    = () => lsGet('ah_tasks', []);
const getExpenses = () => lsGet('ah_expenses', []);


let _toastTimer;
function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.className = 'toast ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'toast hidden'; }, 2800);
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  lsSave('ah_theme', isLight ? 'light' : 'dark');
}


function switchAuthTab(tab) {
  $('login-form').classList.toggle('hidden', tab !== 'login');
  $('signup-form').classList.toggle('hidden', tab !== 'signup');
  $('tab-login').classList.toggle('active', tab === 'login');
  $('tab-signup').classList.toggle('active', tab === 'signup');
  $('login-error').classList.add('hidden');
  $('signup-error').classList.add('hidden');
}

function handleSignup(e) {
  e.preventDefault();
  const name = $('signup-name').value.trim();
  const user = $('signup-username').value.trim().toLowerCase();
  const pass = $('signup-password').value;
  const err  = $('signup-error');
  const users = getUsers();
  if (!name || !user || !pass) { err.textContent = 'All fields are required.'; err.classList.remove('hidden'); return; }
  if (users[user]) { err.textContent = 'Username already taken. Try another.'; err.classList.remove('hidden'); return; }
  users[user] = { name, password: btoa(unescape(encodeURIComponent(pass))) };
  lsSave('ah_users', users);
  showToast('Account created! Please log in.');
  switchAuthTab('login');
  $('signup-form').reset();
}

function handleLogin(e) {
  e.preventDefault();
  const user = $('login-username').value.trim().toLowerCase();
  const pass = $('login-password').value;
  const err  = $('login-error');
  const users = getUsers();
  const encoded = btoa(unescape(encodeURIComponent(pass)));
  if (!users[user] || users[user].password !== encoded) {
    err.textContent = 'Invalid username or password.'; err.classList.remove('hidden'); return;
  }
  lsSave('ah_session', { username: user, name: users[user].name });
  bootApp(users[user].name, user);
}

function handleLogout() {
  localStorage.removeItem('ah_session');
  $('app').classList.add('hidden');
  $('auth-screen').classList.remove('hidden');
  switchAuthTab('login');
  $('login-form').reset();
}


const pageTitles = {
  dashboard: 'Dashboard',
  crops:     'Crop Management',
  inventory: 'Inventory Management',
  tasks:     'Task Scheduler',
  expenses:  'Expense Tracker'
};

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = $('page-' + name);
  if (page) { page.style.display = 'block'; page.classList.add('active'); }
  const nav = $('nav-' + name);
  if (nav) nav.classList.add('active');
  $('page-title').textContent = pageTitles[name] || '';

  if (name === 'dashboard') updateDashboard();
  if (name === 'crops')     renderCrops();
  if (name === 'inventory') renderInventory();
  if (name === 'tasks')     renderTasks();
  if (name === 'expenses')  renderExpenses();

  if (window.innerWidth <= 768) $('sidebar').classList.remove('mobile-open');
}


function toggleSidebar() {
  const sb = $('sidebar');
  const mc = $('main-content');
  if (window.innerWidth <= 768) {
    sb.classList.toggle('mobile-open');
  } else {
    sb.classList.toggle('collapsed');
    mc.classList.toggle('expanded');
  }
}


function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});

function resetModal(mod) {
  const titles = { crop: 'Add Crop', inventory: 'Add Inventory Item', task: 'Add Task', expense: 'Add Expense' };
  const form = $(mod + '-form');
  if (form) form.reset();
  const idEl = $(mod + '-id');
  if (idEl) idEl.value = '';
  const titleEl = $(mod + '-modal-title');
  if (titleEl) titleEl.textContent = titles[mod] || '';
  setDateDefaults();
}

function setDateDefaults() {
  ['crop-planted', 'crop-harvest', 'inventory-date', 'task-due', 'expense-date'].forEach(id => {
    const el = $(id);
    if (el && !el.value) el.value = today();
  });
}

let expChart, cropChart;

function buildCharts() {
  if (typeof Chart === 'undefined') return;

  const expenses = getExpenses();
  const crops    = getCrops();

 
  const cats = {};
  expenses.forEach(ex => { cats[ex.category] = (cats[ex.category] || 0) + Number(ex.amount || 0); });
  const ctx1 = $('expenseChart').getContext('2d');
  if (expChart) expChart.destroy();
  expChart = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels:   Object.keys(cats).length ? Object.keys(cats) : ['No Data'],
      datasets: [{ data: Object.values(cats).length ? Object.values(cats) : [1],
        backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308', '#64748b'],
        borderWidth: 0, hoverOffset: 6 }]
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(), font: { size: 12 } } } 
      }, 
      cutout: '65%' 
    }
  });


  const statuses = { growing: 0, harvested: 0, failed: 0 };
  crops.forEach(c => { if (statuses[c.status] !== undefined) statuses[c.status]++; });
  const ctx2 = $('cropChart').getContext('2d');
  if (cropChart) cropChart.destroy();
  cropChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['Growing', 'Harvested', 'Failed'],
      datasets: [{ label: 'Crops', data: [statuses.growing, statuses.harvested, statuses.failed],
        backgroundColor: ['rgba(34,197,94,.6)', 'rgba(59,130,246,.6)', 'rgba(239,68,68,.6)'],
        borderRadius: 8, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-dim').trim() }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-dim').trim(), stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true }
      }
    }
  });
}

function updateDashboard() {
  const crops    = getCrops();
  const inv      = getInv();
  const tasks    = getTasks();
  const expenses = getExpenses();

  $('stat-crops').textContent     = crops.length;
  $('stat-inventory').textContent = inv.length;
  $('stat-tasks').textContent     = tasks.filter(t => t.status !== 'done').length;
  $('stat-expenses').textContent  = inr(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));

  const rt = $('recent-tasks');
  rt.innerHTML = tasks.length
    ? tasks.slice(-5).reverse().map(t => `<li><span>${t.title}</span><span class="badge badge-${t.status}">${t.status}</span></li>`).join('')
    : '<li><span style="color:var(--text-dim)">No tasks yet</span></li>';

  const re = $('recent-expenses');
  re.innerHTML = expenses.length
    ? expenses.slice(-5).reverse().map(e => `<li><span>${e.description}</span><span>${inr(e.amount)}</span></li>`).join('')
    : '<li><span style="color:var(--text-dim)">No expenses yet</span></li>';

  buildCharts();
}


function saveCrop(e) {
  e.preventDefault();
  const crops = getCrops();
  const id    = $('crop-id').value;
  const obj = {
    id:      id || uid(),
    name:    $('crop-name').value.trim(),
    type:    $('crop-type').value,
    field:   $('crop-field').value.trim(),
    planted: $('crop-planted').value,
    harvest: $('crop-harvest').value,
    status:  $('crop-status').value,
    notes:   $('crop-notes').value.trim(),
  };
  if (!obj.name) return;
  if (id) { const i = crops.findIndex(c => c.id === id); crops[i] = obj; }
  else crops.push(obj);
  lsSave('ah_crops', crops);
  closeModal('crop-modal');
  renderCrops();
  showToast(id ? 'Crop updated!' : 'Crop added!');
}

function editCrop(id) {
  const c = getCrops().find(x => x.id === id); if (!c) return;
  $('crop-id').value      = c.id;
  $('crop-name').value    = c.name;
  $('crop-type').value    = c.type;
  $('crop-field').value   = c.field || '';
  $('crop-planted').value = c.planted || '';
  $('crop-harvest').value = c.harvest || '';
  $('crop-status').value  = c.status;
  $('crop-notes').value   = c.notes || '';
  $('crop-modal-title').textContent = 'Edit Crop';
  openModal('crop-modal');
}

function deleteCrop(id) {
  if (!confirm('Are you sure you want to delete this crop?')) return;
  const crops = getCrops().filter(c => c.id !== id);
  lsSave('ah_crops', crops);
  renderCrops();
  updateDashboard(); 
  showToast('Crop deleted successfully.', 'error');
}

function renderCrops() {
  const q     = ($('crop-search').value || '').toLowerCase();
  let crops   = getCrops();
  if (q) crops = crops.filter(c => (c.name + c.type + c.field).toLowerCase().includes(q));
  const tbody = $('crops-table-body');
  const empty = $('crops-empty');
  if (!crops.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = crops.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.type}</td>
      <td>${c.field || '—'}</td>
      <td>${fmt(c.planted)}</td>
      <td>${fmt(c.harvest)}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>
        <button class="btn-icon btn-edit"   onclick="editCrop('${c.id}')">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteCrop('${c.id}')">🗑️</button>
      </td>
    </tr>`).join('');
}


function saveInventory(e) {
  e.preventDefault();
  const inv = getInv();
  const id  = $('inventory-id').value;
  const obj = {
    id:       id || uid(),
    name:     $('inventory-name').value.trim(),
    category: $('inventory-category').value,
    quantity: $('inventory-quantity').value,
    unit:     $('inventory-unit').value,
    date:     $('inventory-date').value,
    cost:     $('inventory-cost').value,
    notes:    $('inventory-notes').value.trim(),
  };
  if (!obj.name) return;
  if (id) { const i = inv.findIndex(x => x.id === id); inv[i] = obj; }
  else inv.push(obj);
  lsSave('ah_inventory', inv);
  closeModal('inventory-modal');
  renderInventory();
  showToast(id ? 'Item updated!' : 'Item added!');
}

function editInventory(id) {
  const item = getInv().find(x => x.id === id); if (!item) return;
  $('inventory-id').value       = item.id;
  $('inventory-name').value     = item.name;
  $('inventory-category').value = item.category;
  $('inventory-quantity').value = item.quantity;
  $('inventory-unit').value     = item.unit;
  $('inventory-date').value     = item.date || '';
  $('inventory-cost').value     = item.cost;
  $('inventory-notes').value    = item.notes || '';
  $('inventory-modal-title').textContent = 'Edit Item';
  openModal('inventory-modal');
}

function deleteInventory(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  const inv = getInv().filter(x => x.id !== id);
  lsSave('ah_inventory', inv);
  renderInventory();
  updateDashboard();
  showToast('Inventory item deleted.', 'error');
}

function renderInventory() {
  const q   = ($('inventory-search').value || '').toLowerCase();
  let inv   = getInv();
  if (q) inv = inv.filter(i => (i.name + i.category).toLowerCase().includes(q));
  const tbody = $('inventory-table-body');
  const empty = $('inventory-empty');
  if (!inv.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = inv.map(i => `
    <tr>
      <td><strong>${i.name}</strong></td>
      <td>${i.category}</td>
      <td>${i.quantity}</td>
      <td>${i.unit}</td>
      <td>${fmt(i.date)}</td>
      <td>${inr(i.cost)}</td>
      <td>
        <button class="btn-icon btn-edit"   onclick="editInventory('${i.id}')">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteInventory('${i.id}')">🗑️</button>
      </td>
    </tr>`).join('');
}


function saveTask(e) {
  e.preventDefault();
  const tasks = getTasks();
  const id    = $('task-id').value;
  const obj = {
    id:          id || uid(),
    title:       $('task-title').value.trim(),
    priority:    $('task-priority').value,
    due:         $('task-due').value,
    assigned:    $('task-assigned').value.trim(),
    status:      $('task-status').value,
    crop:        $('task-crop').value.trim(),
    description: $('task-description').value.trim(),
  };
  if (!obj.title) return;
  if (id) { const i = tasks.findIndex(t => t.id === id); tasks[i] = obj; }
  else tasks.push(obj);
  lsSave('ah_tasks', tasks);
  closeModal('task-modal');
  renderTasks();
  showToast(id ? 'Task updated!' : 'Task added!');
}

function editTask(id) {
  const t = getTasks().find(x => x.id === id); if (!t) return;
  $('task-id').value          = t.id;
  $('task-title').value       = t.title;
  $('task-priority').value    = t.priority;
  $('task-due').value         = t.due || '';
  $('task-assigned').value    = t.assigned || '';
  $('task-status').value      = t.status;
  $('task-crop').value        = t.crop || '';
  $('task-description').value = t.description || '';
  $('task-modal-title').textContent = 'Edit Task';
  openModal('task-modal');
}

function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  const tasks = getTasks().filter(t => t.id !== id);
  lsSave('ah_tasks', tasks);
  renderTasks();
  updateDashboard();
  showToast('Task deleted.', 'error');
}

function renderTasks() {
  const q      = ($('task-search').value || '').toLowerCase();
  const filter = $('task-filter').value;
  let tasks    = getTasks();
  if (q) tasks = tasks.filter(t => (t.title + ' ' + (t.crop || '')).toLowerCase().includes(q));
  if (filter !== 'all') tasks = tasks.filter(t => t.status === filter);

  const grid  = $('task-cards');
  const empty = $('tasks-empty');
  if (!tasks.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = tasks.map(t => `
    <div class="task-card priority-${t.priority}">
      <div class="task-card-header">
        <span class="task-card-title">${t.title}</span>
        <span class="badge badge-${t.priority}">${t.priority}</span>
      </div>
      <div class="task-card-meta">
        ${t.due      ? `<span>📅 ${fmt(t.due)}</span>` : ''}
        ${t.assigned ? `<span>👤 ${t.assigned}</span>` : ''}
        ${t.crop     ? `<span>🌱 ${t.crop}</span>`     : ''}
      </div>
      ${t.description ? `<p class="task-card-desc">${t.description}</p>` : ''}
      <div class="task-card-footer">
        <span class="badge badge-${t.status}">${t.status}</span>
        <div class="task-card-actions">
          <button class="btn-icon btn-edit"   onclick="editTask('${t.id}')">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteTask('${t.id}')">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

function saveExpense(e) {
  e.preventDefault();
  const expenses = getExpenses();
  const id       = $('expense-id').value;
  const obj = {
    id:          id || uid(),
    description: $('expense-desc').value.trim(),
    category:    $('expense-category').value,
    amount:      $('expense-amount').value,
    date:        $('expense-date').value,
    notes:       $('expense-notes').value.trim(),
  };
  if (!obj.description || !obj.amount) return;
  if (id) { const i = expenses.findIndex(x => x.id === id); expenses[i] = obj; }
  else expenses.push(obj);
  lsSave('ah_expenses', expenses);
  closeModal('expense-modal');
  renderExpenses();
  showToast(id ? 'Expense updated!' : 'Expense added!');
}

function editExpense(id) {
  const ex = getExpenses().find(x => x.id === id); if (!ex) return;
  $('expense-id').value       = ex.id;
  $('expense-desc').value     = ex.description;
  $('expense-category').value = ex.category;
  $('expense-amount').value   = ex.amount;
  $('expense-date').value     = ex.date || '';
  $('expense-notes').value    = ex.notes || '';
  $('expense-modal-title').textContent = 'Edit Expense';
  openModal('expense-modal');
}

function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  const expenses = getExpenses().filter(x => x.id !== id);
  lsSave('ah_expenses', expenses);
  renderExpenses();
  updateDashboard();
  showToast('Expense record deleted.', 'error');
}

function renderExpenses() {
  const q      = ($('expense-search').value || '').toLowerCase();
  const filter = $('expense-filter').value;
  let expenses = getExpenses();
  if (q) expenses = expenses.filter(ex => (ex.description + ex.category).toLowerCase().includes(q));
  if (filter !== 'all') expenses = expenses.filter(ex => ex.category === filter);

  const allExp = getExpenses();
  const total  = allExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const cats   = {};
  allExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount || 0); });
  $('expense-summary').innerHTML =
    `<div class="expense-chip">Total<span>${inr(total)}</span></div>` +
    Object.entries(cats).map(([k, v]) => `<div class="expense-chip">${k}<span>${inr(v)}</span></div>`).join('');

  const tbody = $('expenses-table-body');
  const empty = $('expenses-empty');
  if (!expenses.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = expenses.map(ex => `
    <tr>
      <td><strong>${ex.description}</strong></td>
      <td>${ex.category}</td>
      <td>${inr(ex.amount)}</td>
      <td>${fmt(ex.date)}</td>
      <td>${ex.notes || '—'}</td>
      <td>
        <button class="btn-icon btn-edit"   onclick="editExpense('${ex.id}')">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteExpense('${ex.id}')">🗑️</button>
      </td>
    </tr>`).join('');
}

// Synthetic
function seedData() {
  const users = getUsers();
  if (Object.keys(users).length === 0) {
    users['admin'] = { name: 'Admin Farmer', password: btoa('admin123') };
    lsSave('ah_users', users);
  }

  if (getCrops().length === 0) {
    const crops = [
      { id: uid(), name: 'Wheat', type: 'Grain', field: 'Field A', planted: '2026-03-01', harvest: '2026-07-01', status: 'growing', notes: 'Using organic fertilizer' },
      { id: uid(), name: 'Tomatoes', type: 'Vegetable', field: 'Field B', planted: '2026-04-10', harvest: '2026-06-15', status: 'growing', notes: 'Needs regular irrigation' },
      { id: uid(), name: 'Corn', type: 'Grain', field: 'Field C', planted: '2025-10-01', harvest: '2026-02-15', status: 'harvested', notes: 'High yield' }
    ];
    lsSave('ah_crops', crops);
  }

  if (getInv().length === 0) {
    const inv = [
      { id: uid(), name: 'Urea Fertilizer', category: 'Fertilizer', quantity: 50, unit: 'bags', date: '2026-04-01', cost: 15000, notes: 'Main stock' },
      { id: uid(), name: 'Potato Seeds', category: 'Seeds', quantity: 200, unit: 'kg', date: '2026-03-15', cost: 8000, notes: 'For next season' }
    ];
    lsSave('ah_inventory', inv);
  }

  if (getTasks().length === 0) {
    const tasks = [
      { id: uid(), title: 'Water Wheat Field', priority: 'high', due: '2026-04-24', assigned: 'Self', status: 'pending', crop: 'Wheat', description: 'Irrigation scheduled for morning' },
      { id: uid(), title: 'Check Tomato Pests', priority: 'medium', due: '2026-04-25', assigned: 'Worker 1', status: 'in-progress', crop: 'Tomatoes', description: 'Apply organic spray if needed' }
    ];
    lsSave('ah_tasks', tasks);
  }

  if (getExpenses().length === 0) {
    const expenses = [
      { id: uid(), description: 'Organic Fertilizer', category: 'Fertilizer', amount: 15000, date: '2026-04-01', notes: 'Bulk purchase' },
      { id: uid(), description: 'Seed Procurement', category: 'Seeds', amount: 8000, date: '2026-03-15', notes: 'Potato seeds' },
      { id: uid(), description: 'Equipment Maintenance', category: 'Equipment', amount: 4500, date: '2026-04-10', notes: 'Tractor servicing' }
    ];
    lsSave('ah_expenses', expenses);
  }
}

function bootApp(name, username) {
  $('auth-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('user-name').textContent   = name;
  $('user-avatar').textContent = name.charAt(0).toUpperCase();
  $('topbar-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  setDateDefaults();
  showPage('dashboard');
}

(function init() {
  const savedTheme = lsGet('ah_theme', 'dark');
  if (savedTheme === 'light') document.body.classList.add('light-mode');

 
  seedData();

  const session = lsGet('ah_session', null);
  if (session && session.username) {
    const users = getUsers();
    if (users[session.username]) {
      bootApp(session.name, session.username);
      return;
    }
  }
  $('auth-screen').classList.remove('hidden');
  $('app').classList.add('hidden');
})();
