// ============================================================
//  UltraKey Invoice App — Main Application Logic
// ============================================================

// ── Globals ───────────────────────────────────────────────
let currentPage = 'dashboard';
let invoicePagination = { page:1, perPage:10 };
let quotePagination = { page:1, perPage:10 };
let clientPagination = { page:1, perPage:10 };
let editingInvoice = null;
let editingQuote = null;
let editingClient = null;
let currentInvoiceLineItems = [];
let currentQuoteLineItems = [];
let currentPayments = [];

// ── App Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  const session = DB.getSession();
  if (session) {
    showApp(session);
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showApp(session) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('user-name').textContent = session.name;
  document.getElementById('user-role').textContent = session.role;
  document.getElementById('user-avatar').textContent = session.name.charAt(0).toUpperCase();
  navigateTo('dashboard');
}

// ── Login ─────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const session = DB.login(username, password);
  if (session) {
    showApp(session);
    showToast('Welcome back, ' + session.name + '!', 'success');
  } else {
    showToast('Invalid username or password', 'error');
    document.getElementById('login-password').value = '';
  }
});

function logout() {
  DB.logout();
  showLogin();
  showToast('Logged out successfully', 'info');
}

// ── Navigation ────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  const titles = {
    dashboard: ['Dashboard', 'Overview & Analytics'],
    invoices: ['Invoices', 'Manage all invoices'],
    quotes: ['Quotations', 'Manage all quotes'],
    clients: ['Clients', 'Manage client database'],
    settings: ['Settings', 'App configuration'],
  };
  if (titles[page]) {
    document.getElementById('page-title').textContent = titles[page][0];
    document.getElementById('page-subtitle').textContent = titles[page][1];
  }
  renderPage(page);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigateTo(el.dataset.page));
});

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'invoices': renderInvoices(); break;
    case 'quotes': renderQuotes(); break;
    case 'clients': renderClients(); break;
    case 'settings': renderSettings(); break;
  }
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type='info') {
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span style="font-size:16px;font-weight:700;">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(div);
  setTimeout(() => { div.style.opacity='0'; div.style.transform='translateX(30px)'; div.style.transition='all 0.3s'; setTimeout(()=>div.remove(),300); }, 3000);
}

// ── Modal helpers ─────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target === m) closeModal(m.id); });
});

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
  const stats = DB.getStats();
  document.getElementById('stat-total-inv').textContent = stats.totalInvoices;
  document.getElementById('stat-revenue').textContent = DB.formatCurrency(stats.totalRevenue);
  document.getElementById('stat-overdue').textContent = stats.overdueCount;
  document.getElementById('stat-quotes').textContent = stats.pendingQuotes;

  // Recent invoices
  const invoices = DB.getInvoices().slice(-5).reverse();
  const tbody = document.getElementById('recent-invoices-body');
  if (!invoices.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No invoices yet</td></tr>';
  } else {
    tbody.innerHTML = invoices.map(inv => {
      const client = DB.getClient(inv.clientId);
      return `<tr>
        <td><span class="text-mono" style="font-size:12px;color:var(--text-muted)">${inv.invoiceNumber||'-'}</span><br><span style="font-size:13px;font-weight:600">${inv.title||'Untitled'}</span></td>
        <td>${client ? client.businessName : '—'}</td>
        <td>${inv.createdAt ? inv.createdAt.split('T')[0] : '—'}</td>
        <td><span class="badge badge-${inv.status||'draft'}">${inv.status||'Draft'}</span></td>
        <td class="text-right text-mono fw-bold">${DB.formatCurrency(calcInvoiceTotal(inv))}</td>
      </tr>`;
    }).join('');
  }

  renderMiniChart();
}

function renderMiniChart() {
  const invoices = DB.getInvoices();
  const months = [];
  for(let i=5;i>=0;i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push({ label: d.toLocaleString('default',{month:'short'}), year: d.getFullYear(), month: d.getMonth() });
  }
  const totals = months.map(m => {
    return invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      return d.getMonth()===m.month && d.getFullYear()===m.year;
    }).reduce((s,inv)=>s+calcInvoiceGross(inv),0);
  });
  const max = Math.max(...totals,1);
  const wrap = document.getElementById('mini-chart');
  if (!wrap) return;
  wrap.innerHTML = months.map((m,i)=>`
    <div class="chart-bar-col">
      <div class="chart-bar" style="height:${Math.max(4,(totals[i]/max)*140)}px" title="${DB.formatCurrency(totals[i])}"></div>
      <span class="chart-bar-label">${m.label}</span>
    </div>
  `).join('');
}

// ============================================================
//  INVOICES PAGE
// ============================================================
function renderInvoices(filter='') {
  let invoices = DB.getInvoices();
  const statusFilter = document.getElementById('inv-status-filter')?.value || '';
  const search = (document.getElementById('inv-search')?.value || filter).toLowerCase();

  invoices.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Auto-update overdue
  const today = new Date().toISOString().split('T')[0];
  invoices = invoices.map(inv => {
    if (inv.status === 'sent' && inv.dueDate && inv.dueDate < today) {
      inv.status = 'overdue';
      DB.saveInvoice(inv);
    }
    return inv;
  });

  if (statusFilter) invoices = invoices.filter(i=>i.status===statusFilter);
  if (search) invoices = invoices.filter(i=>{
    const c = DB.getClient(i.clientId);
    return (i.invoiceNumber||'').toLowerCase().includes(search) ||
           (i.title||'').toLowerCase().includes(search) ||
           (c?.businessName||'').toLowerCase().includes(search);
  });

  // Status counts
  const all = DB.getInvoices();
  document.getElementById('inv-count-all').textContent = all.length;
  document.getElementById('inv-count-paid').textContent = all.filter(i=>i.status==='paid').length;
  document.getElementById('inv-count-draft').textContent = all.filter(i=>i.status==='draft').length;
  document.getElementById('inv-count-overdue').textContent = all.filter(i=>i.status==='overdue').length;
  document.getElementById('inv-count-unpaid').textContent = all.filter(i=>i.status==='sent').length;

  const { page, perPage } = invoicePagination;
  const total = invoices.length;
  const paged = invoices.slice((page-1)*perPage, page*perPage);
  const tbody = document.getElementById('invoices-tbody');

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path d="M9 12h6M9 16h6M9 8h3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <h3>No invoices found</h3><p>Create your first invoice to get started</p>
      <button class="btn btn-primary btn-sm" onclick="openNewInvoiceModal()">+ New Invoice</button>
    </div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(inv => {
      const client = DB.getClient(inv.clientId);
      const gross = calcInvoiceGross(inv);
      const paid = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
      const due = Math.max(0, gross - paid);
      return `<tr>
        <td>
          <div style="font-size:12px;color:var(--text-muted);font-family:var(--mono)">${inv.invoiceNumber||'—'}</div>
          <div style="font-weight:600;font-size:13.5px">${inv.title||'Untitled'}</div>
        </td>
        <td>
          <div style="font-weight:600">${client?.businessName||'—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${client?.email||''}</div>
        </td>
        <td><span class="badge badge-${getInvoiceStatus(inv)}">${getInvoiceStatusLabel(inv)}</span></td>
        <td>${inv.createdAt?inv.createdAt.split('T')[0]:'—'}<br><span style="font-size:11px;color:var(--text-muted)">Due: ${inv.dueDate||'—'}</span></td>
        <td class="text-right text-mono">${DB.formatCurrency(gross)}</td>
        <td class="text-right text-mono fw-bold ${due>0&&inv.status!=='draft'?'color-danger':''}">${DB.formatCurrency(due)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon" title="View/Print" onclick="previewInvoice('${inv.id}')">👁</button>
            <button class="btn btn-icon" title="Edit" onclick="openEditInvoiceModal('${inv.id}')">✏️</button>
            <button class="btn btn-icon" title="Mark Paid" onclick="markInvoicePaid('${inv.id}')">✅</button>
            <button class="btn btn-icon" title="Delete" onclick="deleteInvoiceConfirm('${inv.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  renderPagination('inv-pagination', page, Math.ceil(total/perPage), p => { invoicePagination.page=p; renderInvoices(); });
}

function getInvoiceStatus(inv) {
  const today = new Date().toISOString().split('T')[0];
  const gross = calcInvoiceGross(inv);
  const paid = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  if (paid >= gross && gross > 0) return 'paid';
  if (inv.status === 'overdue' || (inv.dueDate && inv.dueDate < today && inv.status === 'sent')) return 'overdue';
  return inv.status || 'draft';
}
function getInvoiceStatusLabel(inv) {
  const s = getInvoiceStatus(inv);
  return { paid:'Paid', draft:'Draft', overdue:'Overdue', sent:'Sent', cancelled:'Cancelled' }[s] || s;
}

function calcInvoiceGross(inv) {
  const settings = DB.getSettings();
  const taxRate = inv.taxRate !== undefined ? inv.taxRate : settings.tax.taxPercentage;
  const items = inv.lineItems || [];
  const subtotal = items.reduce((s,i) => s + (parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)), 0);
  const discount = parseFloat(inv.discount||0);
  const taxable = subtotal - discount;
  const taxable2 = inv.taxable !== false ? taxable : subtotal - discount;
  const tax = settings.tax.pricesIncludeTax ? 0 : taxable * (taxRate/100);
  return taxable + tax;
}

function calcInvoiceTotal(inv) {
  const gross = calcInvoiceGross(inv);
  const paid = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  return Math.max(0, gross - paid);
}

// ── New/Edit Invoice Modal ─────────────────────────────────
function openNewInvoiceModal() {
  editingInvoice = null;
  currentInvoiceLineItems = [{ qty:1, title:'', rate:0, adjust:0, desc:'', taxable:true }];
  currentPayments = [];
  const settings = DB.getSettings();
  document.getElementById('inv-modal-title').textContent = 'Add New Invoice';
  document.getElementById('inv-form-title').value = '';
  document.getElementById('inv-client').value = '';
  document.getElementById('inv-status').value = 'draft';
  document.getElementById('inv-created').value = new Date().toISOString().split('T')[0];
  const due = new Date(); due.setDate(due.getDate()+(settings.invoices.dueDays||14));
  document.getElementById('inv-due').value = due.toISOString().split('T')[0];
  document.getElementById('inv-discount').value = '0';
  document.getElementById('inv-terms').value = settings.invoices.termsConditions||'';
  document.getElementById('inv-order-num').value = '';
  document.getElementById('inv-tax-rate').value = settings.tax.taxPercentage||18;
  populateClientDropdown('inv-client');
  populatePredefinedDropdown('inv-predefined');
  renderInvoiceLineItems();
  renderPaymentsSection();
  openModal('invoice-modal');
}

function openEditInvoiceModal(id) {
  const inv = DB.getInvoice(id);
  if (!inv) return;
  editingInvoice = inv;
  currentInvoiceLineItems = JSON.parse(JSON.stringify(inv.lineItems||[{qty:1,title:'',rate:0,adjust:0,desc:'',taxable:true}]));
  currentPayments = JSON.parse(JSON.stringify(inv.payments||[]));
  const settings = DB.getSettings();
  document.getElementById('inv-modal-title').textContent = 'Edit Invoice — ' + inv.invoiceNumber;
  document.getElementById('inv-form-title').value = inv.title||'';
  document.getElementById('inv-status').value = inv.status||'draft';
  document.getElementById('inv-created').value = inv.createdAt?inv.createdAt.split('T')[0]:'';
  document.getElementById('inv-due').value = inv.dueDate||'';
  document.getElementById('inv-discount').value = inv.discount||0;
  document.getElementById('inv-terms').value = inv.termsConditions||settings.invoices.termsConditions||'';
  document.getElementById('inv-order-num').value = inv.orderNumber||'';
  document.getElementById('inv-tax-rate').value = inv.taxRate!==undefined?inv.taxRate:settings.tax.taxPercentage;
  populateClientDropdown('inv-client', inv.clientId);
  populatePredefinedDropdown('inv-predefined');
  renderInvoiceLineItems();
  renderPaymentsSection();
  openModal('invoice-modal');
}

function saveInvoice() {
  const title = document.getElementById('inv-form-title').value.trim();
  if (!title) { showToast('Invoice title is required','error'); return; }
  const settings = DB.getSettings();
  const taxRate = parseFloat(document.getElementById('inv-tax-rate').value)||0;
  const invoice = {
    ...(editingInvoice||{}),
    title,
    clientId: document.getElementById('inv-client').value,
    status: document.getElementById('inv-status').value,
    createdAt: document.getElementById('inv-created').value,
    dueDate: document.getElementById('inv-due').value,
    discount: parseFloat(document.getElementById('inv-discount').value)||0,
    termsConditions: document.getElementById('inv-terms').value,
    orderNumber: document.getElementById('inv-order-num').value,
    taxRate,
    taxName: settings.tax.taxName,
    lineItems: currentInvoiceLineItems.filter(i=>i.title),
    payments: currentPayments,
  };
  DB.saveInvoice(invoice);
  closeModal('invoice-modal');
  renderInvoices();
  showToast(editingInvoice ? 'Invoice updated!' : 'Invoice created!', 'success');
}

function renderInvoiceLineItems() {
  const tbody = document.getElementById('inv-line-items-body');
  const settings = DB.getSettings();
  tbody.innerHTML = currentInvoiceLineItems.map((item,i) => `
    <tr>
      <td><input type="number" value="${item.qty||1}" min="0" step="0.01" oninput="updateLineItem(${i},'qty',this.value,'inv')" style="width:70px"></td>
      <td>
        <input type="text" value="${escHtml(item.title||'')}" placeholder="Item title" oninput="updateLineItem(${i},'title',this.value,'inv')" style="margin-bottom:4px">
        <input type="text" value="${escHtml(item.desc||'')}" placeholder="Description (optional)" oninput="updateLineItem(${i},'desc',this.value,'inv')" style="font-size:12px;color:var(--text-muted)">
      </td>
      <td><input type="checkbox" ${item.taxable!==false?'checked':''} onchange="updateLineItem(${i},'taxable',this.checked,'inv')" title="Taxable"></td>
      <td><input type="number" value="${item.adjust||0}" min="-100" max="100" step="0.01" oninput="updateLineItem(${i},'adjust',this.value,'inv')" style="width:70px"></td>
      <td><input type="number" value="${item.rate||0}" min="0" step="0.01" oninput="updateLineItem(${i},'rate',this.value,'inv')" style="width:100px"></td>
      <td class="text-right text-mono" id="inv-item-amt-${i}">${DB.formatCurrency((item.qty||0)*(item.rate||0)*(1-(item.adjust||0)/100))}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeLineItem(${i},'inv')">✕</button></td>
    </tr>
  `).join('');
  updateInvoiceTotals();
}

function updateLineItem(i, field, val, type) {
  const arr = type==='inv' ? currentInvoiceLineItems : currentQuoteLineItems;
  if (field==='taxable') arr[i][field] = val;
  else if (['qty','rate','adjust'].includes(field)) arr[i][field] = parseFloat(val)||0;
  else arr[i][field] = val;
  if (type==='inv') { document.getElementById(`inv-item-amt-${i}`).textContent = DB.formatCurrency((arr[i].qty||0)*(arr[i].rate||0)*(1-(arr[i].adjust||0)/100)); updateInvoiceTotals(); }
  else { document.getElementById(`qt-item-amt-${i}`).textContent = DB.formatCurrency((arr[i].qty||0)*(arr[i].rate||0)*(1-(arr[i].adjust||0)/100)); updateQuoteTotals(); }
}

function removeLineItem(i, type) {
  if (type==='inv') { currentInvoiceLineItems.splice(i,1); renderInvoiceLineItems(); }
  else { currentQuoteLineItems.splice(i,1); renderQuoteLineItems(); }
}

function addLineItem(type) {
  if (type==='inv') { currentInvoiceLineItems.push({qty:1,title:'',rate:0,adjust:0,desc:'',taxable:true}); renderInvoiceLineItems(); }
  else { currentQuoteLineItems.push({qty:1,title:'',rate:0,adjust:0,desc:'',taxable:true}); renderQuoteLineItems(); }
}

function addPredefinedItem(type) {
  const sel = document.getElementById(type==='inv'?'inv-predefined':'qt-predefined');
  const idx = parseInt(sel.value);
  if (isNaN(idx)) return;
  const settings = DB.getSettings();
  const item = settings.general.predefinedItems[idx];
  if (!item) return;
  const newItem = { qty:item.qty||1, title:item.title||'', rate:item.price||0, adjust:0, desc:item.desc||'', taxable:true };
  if (type==='inv') { currentInvoiceLineItems.push(newItem); renderInvoiceLineItems(); }
  else { currentQuoteLineItems.push(newItem); renderQuoteLineItems(); }
  sel.value = '';
}

function updateInvoiceTotals() {
  const taxRate = parseFloat(document.getElementById('inv-tax-rate')?.value||0);
  const settings = DB.getSettings();
  const items = currentInvoiceLineItems;
  const subtotal = items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)),0);
  const discount = parseFloat(document.getElementById('inv-discount')?.value||0);
  const taxable = subtotal - discount;
  const tax = settings.tax.pricesIncludeTax ? 0 : taxable*(taxRate/100);
  const paidAmt = currentPayments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const totalDue = Math.max(0, taxable+tax-paidAmt);
  const f = v => DB.formatCurrency(v);
  document.getElementById('inv-subtotal').textContent = f(subtotal);
  document.getElementById('inv-tax-amt').textContent = f(tax);
  document.getElementById('inv-tax-label').textContent = settings.tax.taxName||'GST';
  document.getElementById('inv-discount-amt').textContent = '-' + f(discount);
  document.getElementById('inv-paid-amt').textContent = '-' + f(paidAmt);
  document.getElementById('inv-total-due').textContent = f(totalDue);
}

// ── Payments Section ──────────────────────────────────────
function renderPaymentsSection() {
  const wrap = document.getElementById('payments-wrap');
  wrap.innerHTML = currentPayments.map((p,i) => `
    <div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <strong style="font-size:13px">Payment ${i+1}</strong>
        <button class="btn btn-danger btn-sm" onclick="removePayment(${i})">Remove</button>
      </div>
      <div class="form-grid form-grid-3" style="gap:10px">
        <div class="form-group"><label>Date</label><input type="date" value="${p.date||''}" onchange="updatePayment(${i},'date',this.value)"></div>
        <div class="form-group"><label>Amount (₹)</label><input type="number" value="${p.amount||''}" placeholder="0.00" oninput="updatePayment(${i},'amount',this.value); updateInvoiceTotals()"></div>
        <div class="form-group"><label>Method</label>
          <select onchange="updatePayment(${i},'method',this.value)">
            <option ${p.method==='Generic'?'selected':''}>Generic</option>
            <option ${p.method==='Bank'?'selected':''}>Bank</option>
            <option ${p.method==='Razorpay'?'selected':''}>Razorpay</option>
            <option ${p.method==='UPI'?'selected':''}>UPI</option>
            <option ${p.method==='Cash'?'selected':''}>Cash</option>
          </select>
        </div>
        <div class="form-group"><label>Payment ID</label><input type="text" value="${p.paymentId||''}" placeholder="Optional" oninput="updatePayment(${i},'paymentId',this.value)"></div>
        <div class="form-group"><label>Status</label>
          <select onchange="updatePayment(${i},'status',this.value)">
            <option ${p.status==='pending'?'selected':''} value="pending">Pending</option>
            <option ${p.status==='completed'?'selected':''} value="completed">Completed</option>
            <option ${p.status==='failed'?'selected':''} value="failed">Failed</option>
          </select>
        </div>
        <div class="form-group"><label>Memo</label><input type="text" value="${escHtml(p.memo||'')}" placeholder="Optional" oninput="updatePayment(${i},'memo',this.value)"></div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);font-size:13px;padding:10px 0">No payments recorded yet.</p>';
}

function addPayment() {
  currentPayments.push({ date: new Date().toISOString().split('T')[0], amount:'', method:'Generic', paymentId:'', status:'completed', memo:'' });
  renderPaymentsSection();
}

function removePayment(i) {
  currentPayments.splice(i,1);
  renderPaymentsSection();
  updateInvoiceTotals();
}

function updatePayment(i, field, val) {
  currentPayments[i][field] = val;
}

function markInvoicePaid(id) {
  const inv = DB.getInvoice(id);
  if (!inv) return;
  inv.status = 'paid';
  const gross = calcInvoiceGross(inv);
  const alreadyPaid = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  if (alreadyPaid < gross) {
    inv.payments = inv.payments || [];
    inv.payments.push({ date: new Date().toISOString().split('T')[0], amount: gross-alreadyPaid, method:'Generic', status:'completed', memo:'Marked as paid' });
  }
  DB.saveInvoice(inv);
  renderInvoices();
  showToast('Invoice marked as paid', 'success');
}

function deleteInvoiceConfirm(id) {
  if (confirm('Delete this invoice? This cannot be undone.')) {
    DB.deleteInvoice(id);
    renderInvoices();
    showToast('Invoice deleted','info');
  }
}

// ── Invoice Preview/Print ─────────────────────────────────
function previewInvoice(id) {
  const inv = DB.getInvoice(id);
  if (!inv) return;
  const settings = DB.getSettings();
  const client = DB.getClient(inv.clientId);
  const items = inv.lineItems || [];
  const subtotal = items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)),0);
  const discount = parseFloat(inv.discount||0);
  const taxable = subtotal - discount;
  const taxRate = inv.taxRate !== undefined ? inv.taxRate : settings.tax.taxPercentage;
  const tax = settings.tax.pricesIncludeTax ? 0 : taxable*(taxRate/100);
  const paidAmt = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const totalDue = Math.max(0, taxable+tax-paidAmt);
  const f = v => DB.formatCurrency(v);

  const html = `
    <div class="invoice-preview" id="printable-invoice">
      <div class="inv-header">
        <div>
          <img src="assets/logo.png" onerror="this.style.display='none'" style="height:48px;margin-bottom:8px"><br>
          <div class="inv-from">
            <strong>From:</strong>
            ${escHtml(settings.business.name)}<br>
            <span style="font-size:12px;opacity:0.8">${settings.business.address.replace(/\n/g,'<br>')}</span><br>
            <span style="font-size:12px;opacity:0.8">${settings.business.extraInfo}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="inv-title">INVOICE</div>
          <div class="inv-details-box" style="margin-top:12px">
            <div class="detail-row"><span>Invoice Number</span><span>${inv.invoiceNumber||'—'}</span></div>
            <div class="detail-row"><span>Invoice Date</span><span>${inv.createdAt?inv.createdAt.split('T')[0]:'—'}</span></div>
            <div class="detail-row"><span>Due Date</span><span>${inv.dueDate||'—'}</span></div>
            <div class="detail-row"><span>TOTAL DUE</span><span>${f(totalDue)}</span></div>
          </div>
        </div>
      </div>
      <div style="padding:0 32px 20px">
        <div class="inv-to" style="display:inline-block;min-width:260px">
          <strong>To:</strong>
          ${client ? `${escHtml(client.businessName)}<br><span style="font-size:12px;color:var(--text-muted)">${escHtml(client.address||'')}<br>${escHtml(client.email||'')}${client.website?'<br>'+escHtml(client.website):''}${client.gst?'<br><b>GST No:</b> '+escHtml(client.gst):''}</span>` : '<span style="color:var(--text-muted)">No client selected</span>'}
        </div>
      </div>
      <div class="inv-items">
        <table>
          <thead><tr>
            <th>HRS/QTY</th><th>SERVICE DETAILS</th><th class="text-right">RATE/PRICE</th><th class="text-right">ADJUST</th><th class="text-right">SUB TOTAL</th>
          </tr></thead>
          <tbody>
            ${items.map(item=>`<tr>
              <td>${item.qty}</td>
              <td><div style="font-weight:600">${escHtml(item.title)}</div>${item.desc?`<div style="font-size:12px;color:var(--text-muted)">${escHtml(item.desc)}</div>`:''}</td>
              <td class="text-right text-mono">${f(item.rate)}</td>
              <td class="text-right">${item.adjust||0}%</td>
              <td class="text-right text-mono">${f((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0)*(1-(parseFloat(item.adjust||0)/100)))}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="inv-totals">
        <div class="inv-totals-box">
          <div class="inv-totals-row"><span>Sub Total</span><span>${f(subtotal)}</span></div>
          ${discount>0?`<div class="inv-totals-row"><span>Discount</span><span>-${f(discount)}</span></div>`:''}
          <div class="inv-totals-row"><span>${settings.tax.taxName||'GST (18%)'}</span><span>${f(tax)}</span></div>
          ${paidAmt>0?`<div class="inv-totals-row"><span>Paid</span><span style="color:var(--success)">-${f(paidAmt)}</span></div>`:''}
          <div class="inv-totals-row"><span>TOTAL DUE</span><span>${f(totalDue)}</span></div>
        </div>
      </div>
      ${settings.payments.genericPayment?`<div class="inv-payment"><div class="pay-box">${settings.payments.genericPayment.replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="inv-footer">${settings.invoices.footer||''}</div>
    </div>
  `;

  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-inv-id').value = id;
  openModal('preview-modal');
}

function printInvoice() {
  const content = document.getElementById('printable-invoice').innerHTML;
  const win = window.open('','_blank');
  win.document.write(`<html><head><title>Invoice</title>
    <link rel="stylesheet" href="css/style.css">
    <style>body{padding:20px;background:#fff;} @media print{body{padding:0}}</style>
    </head><body>${content}<script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}

// ============================================================
//  QUOTES PAGE
// ============================================================
function renderQuotes(filter='') {
  let quotes = DB.getQuotes();
  const statusFilter = document.getElementById('qt-status-filter')?.value||'';
  const search = (document.getElementById('qt-search')?.value||filter).toLowerCase();

  quotes.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  // Auto-expire
  const today = new Date().toISOString().split('T')[0];
  quotes = quotes.map(q => {
    if ((q.status==='draft'||q.status==='sent') && q.validUntil && q.validUntil < today) {
      q.status = 'expired'; DB.saveQuote(q);
    }
    return q;
  });

  if (statusFilter) quotes = quotes.filter(q=>q.status===statusFilter);
  if (search) quotes = quotes.filter(q=>{
    const c = DB.getClient(q.clientId);
    return (q.quoteNumber||'').toLowerCase().includes(search)||
           (q.title||'').toLowerCase().includes(search)||
           (c?.businessName||'').toLowerCase().includes(search);
  });

  const all = DB.getQuotes();
  document.getElementById('qt-count-all').textContent = all.length;
  document.getElementById('qt-count-accepted').textContent = all.filter(q=>q.status==='accepted').length;
  document.getElementById('qt-count-sent').textContent = all.filter(q=>q.status==='sent').length;
  document.getElementById('qt-count-draft').textContent = all.filter(q=>q.status==='draft').length;
  document.getElementById('qt-count-expired').textContent = all.filter(q=>q.status==='expired').length;

  const { page, perPage } = quotePagination;
  const total = quotes.length;
  const paged = quotes.slice((page-1)*perPage, page*perPage);
  const tbody = document.getElementById('quotes-tbody');

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path d="M9 12h6M9 16h6M9 8h3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <h3>No quotes found</h3><p>Create your first quotation</p>
      <button class="btn btn-primary btn-sm" onclick="openNewQuoteModal()">+ New Quote</button>
    </div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(q => {
      const client = DB.getClient(q.clientId);
      const total = calcQuoteTotal(q);
      return `<tr>
        <td>
          <div style="font-size:12px;color:var(--text-muted);font-family:var(--mono)">${q.quoteNumber||'—'}</div>
          <div style="font-weight:600">${q.title||'Untitled'}</div>
        </td>
        <td><div style="font-weight:600">${client?.businessName||'—'}</div><div style="font-size:11px;color:var(--text-muted)">${client?.email||''}</div></td>
        <td><span class="badge badge-${q.status||'draft'}">${q.status||'Draft'}</span></td>
        <td>${q.createdAt?q.createdAt.split('T')[0]:'—'}<br><span style="font-size:11px;color:var(--text-muted)">Valid: ${q.validUntil||'—'}</span></td>
        <td class="text-right text-mono fw-bold">${DB.formatCurrency(total)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon" title="Preview" onclick="previewQuote('${q.id}')">👁</button>
            <button class="btn btn-icon" title="Edit" onclick="openEditQuoteModal('${q.id}')">✏️</button>
            <button class="btn btn-success btn-sm" onclick="convertQuote('${q.id}')">→ Invoice</button>
            <button class="btn btn-icon" title="Delete" onclick="deleteQuoteConfirm('${q.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  renderPagination('qt-pagination', page, Math.ceil(total/perPage), p => { quotePagination.page=p; renderQuotes(); });
}

function calcQuoteTotal(q) {
  const settings = DB.getSettings();
  const taxRate = q.taxRate !== undefined ? q.taxRate : settings.tax.taxPercentage;
  const items = q.lineItems || [];
  const subtotal = items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)),0);
  const discount = parseFloat(q.discount||0);
  const taxable = subtotal - discount;
  const tax = settings.tax.pricesIncludeTax ? 0 : taxable*(taxRate/100);
  return taxable + tax;
}

function openNewQuoteModal() {
  editingQuote = null;
  currentQuoteLineItems = [{ qty:1, title:'', rate:0, adjust:0, desc:'', taxable:true }];
  const settings = DB.getSettings();
  document.getElementById('qt-modal-title').textContent = 'Add New Quote';
  document.getElementById('qt-form-title').value = '';
  document.getElementById('qt-client').value = '';
  document.getElementById('qt-status').value = 'draft';
  document.getElementById('qt-created').value = new Date().toISOString().split('T')[0];
  const valid = new Date(); valid.setDate(valid.getDate()+(settings.quotes.validDays||15));
  document.getElementById('qt-valid').value = valid.toISOString().split('T')[0];
  document.getElementById('qt-discount').value = '0';
  document.getElementById('qt-terms').value = settings.quotes.termsConditions||'';
  document.getElementById('qt-tax-rate').value = settings.tax.taxPercentage||18;
  populateClientDropdown('qt-client');
  populatePredefinedDropdown('qt-predefined');
  renderQuoteLineItems();
  openModal('quote-modal');
}

function openEditQuoteModal(id) {
  const q = DB.getQuote(id);
  if (!q) return;
  editingQuote = q;
  currentQuoteLineItems = JSON.parse(JSON.stringify(q.lineItems||[{qty:1,title:'',rate:0,adjust:0,desc:'',taxable:true}]));
  const settings = DB.getSettings();
  document.getElementById('qt-modal-title').textContent = 'Edit Quote — ' + q.quoteNumber;
  document.getElementById('qt-form-title').value = q.title||'';
  document.getElementById('qt-status').value = q.status||'draft';
  document.getElementById('qt-created').value = q.createdAt?q.createdAt.split('T')[0]:'';
  document.getElementById('qt-valid').value = q.validUntil||'';
  document.getElementById('qt-discount').value = q.discount||0;
  document.getElementById('qt-terms').value = q.termsConditions||settings.quotes.termsConditions||'';
  document.getElementById('qt-tax-rate').value = q.taxRate!==undefined?q.taxRate:settings.tax.taxPercentage;
  populateClientDropdown('qt-client', q.clientId);
  populatePredefinedDropdown('qt-predefined');
  renderQuoteLineItems();
  openModal('quote-modal');
}

function saveQuote() {
  const title = document.getElementById('qt-form-title').value.trim();
  if (!title) { showToast('Quote title is required','error'); return; }
  const settings = DB.getSettings();
  const taxRate = parseFloat(document.getElementById('qt-tax-rate').value)||0;
  const quote = {
    ...(editingQuote||{}),
    title,
    clientId: document.getElementById('qt-client').value,
    status: document.getElementById('qt-status').value,
    createdAt: document.getElementById('qt-created').value,
    validUntil: document.getElementById('qt-valid').value,
    discount: parseFloat(document.getElementById('qt-discount').value)||0,
    termsConditions: document.getElementById('qt-terms').value,
    taxRate,
    taxName: settings.tax.taxName,
    lineItems: currentQuoteLineItems.filter(i=>i.title),
  };
  DB.saveQuote(quote);
  closeModal('quote-modal');
  renderQuotes();
  showToast(editingQuote?'Quote updated!':'Quote created!','success');
}

function renderQuoteLineItems() {
  const tbody = document.getElementById('qt-line-items-body');
  tbody.innerHTML = currentQuoteLineItems.map((item,i) => `
    <tr>
      <td><input type="number" value="${item.qty||1}" min="0" step="0.01" oninput="updateLineItem(${i},'qty',this.value,'qt')" style="width:70px"></td>
      <td>
        <input type="text" value="${escHtml(item.title||'')}" placeholder="Item title" oninput="updateLineItem(${i},'title',this.value,'qt')" style="margin-bottom:4px">
        <input type="text" value="${escHtml(item.desc||'')}" placeholder="Description (optional)" oninput="updateLineItem(${i},'desc',this.value,'qt')" style="font-size:12px;color:var(--text-muted)">
      </td>
      <td><input type="checkbox" ${item.taxable!==false?'checked':''} onchange="updateLineItem(${i},'taxable',this.checked,'qt')" title="Taxable"></td>
      <td><input type="number" value="${item.adjust||0}" min="-100" max="100" step="0.01" oninput="updateLineItem(${i},'adjust',this.value,'qt')" style="width:70px"></td>
      <td><input type="number" value="${item.rate||0}" min="0" step="0.01" oninput="updateLineItem(${i},'rate',this.value,'qt')" style="width:100px"></td>
      <td class="text-right text-mono" id="qt-item-amt-${i}">${DB.formatCurrency((item.qty||0)*(item.rate||0)*(1-(item.adjust||0)/100))}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeLineItem(${i},'qt')">✕</button></td>
    </tr>
  `).join('');
  updateQuoteTotals();
}

function updateQuoteTotals() {
  const taxRate = parseFloat(document.getElementById('qt-tax-rate')?.value||0);
  const settings = DB.getSettings();
  const items = currentQuoteLineItems;
  const subtotal = items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)),0);
  const discount = parseFloat(document.getElementById('qt-discount')?.value||0);
  const taxable = subtotal - discount;
  const tax = settings.tax.pricesIncludeTax ? 0 : taxable*(taxRate/100);
  const f = v => DB.formatCurrency(v);
  document.getElementById('qt-subtotal').textContent = f(subtotal);
  document.getElementById('qt-tax-amt').textContent = f(tax);
  document.getElementById('qt-tax-label').textContent = settings.tax.taxName||'GST';
  document.getElementById('qt-discount-amt').textContent = '-'+f(discount);
  document.getElementById('qt-total-due').textContent = f(taxable+tax);
}

function convertQuote(id) {
  const inv = DB.convertQuoteToInvoice(id);
  if (inv) {
    showToast('Quote converted to Invoice: '+inv.invoiceNumber, 'success');
    navigateTo('invoices');
  }
}

function deleteQuoteConfirm(id) {
  if (confirm('Delete this quote?')) {
    DB.deleteQuote(id);
    renderQuotes();
    showToast('Quote deleted','info');
  }
}

function previewQuote(id) {
  const q = DB.getQuote(id);
  if (!q) return;
  const settings = DB.getSettings();
  const client = DB.getClient(q.clientId);
  const items = q.lineItems||[];
  const subtotal = items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)),0);
  const discount = parseFloat(q.discount||0);
  const taxable = subtotal - discount;
  const taxRate = q.taxRate!==undefined?q.taxRate:settings.tax.taxPercentage;
  const tax = settings.tax.pricesIncludeTax?0:taxable*(taxRate/100);
  const f = v => DB.formatCurrency(v);

  const html = `
    <div class="invoice-preview">
      <div class="inv-header">
        <div>
          <div class="inv-from">
            <strong>From:</strong>
            ${escHtml(settings.business.name)}<br>
            <span style="font-size:12px;opacity:0.8">${settings.business.address.replace(/\n/g,'<br>')}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="inv-title">QUOTATION</div>
          <div class="inv-details-box" style="margin-top:12px">
            <div class="detail-row"><span>Quote Number</span><span>${q.quoteNumber||'—'}</span></div>
            <div class="detail-row"><span>Quote Date</span><span>${q.createdAt?q.createdAt.split('T')[0]:'—'}</span></div>
            <div class="detail-row"><span>Valid Until</span><span>${q.validUntil||'—'}</span></div>
            <div class="detail-row"><span>TOTAL</span><span>${f(taxable+tax)}</span></div>
          </div>
        </div>
      </div>
      <div style="padding:0 32px 20px">
        <div class="inv-to" style="display:inline-block;min-width:260px">
          <strong>To:</strong>
          ${client?`${escHtml(client.businessName)}<br><span style="font-size:12px;color:var(--text-muted)">${escHtml(client.address||'')}${client.email?'<br>'+escHtml(client.email):''}</span>`:'<span style="color:var(--text-muted)">No client</span>'}
        </div>
      </div>
      <div class="inv-items">
        <table>
          <thead><tr><th>QTY</th><th>SERVICE</th><th class="text-right">RATE</th><th class="text-right">ADJUST</th><th class="text-right">SUBTOTAL</th></tr></thead>
          <tbody>
            ${items.map(item=>`<tr><td>${item.qty}</td><td><b>${escHtml(item.title)}</b>${item.desc?`<br><small style="color:var(--text-muted)">${escHtml(item.desc)}</small>`:''}</td><td class="text-right">${f(item.rate)}</td><td class="text-right">${item.adjust||0}%</td><td class="text-right">${f((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0)*(1-(parseFloat(item.adjust||0)/100)))}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="inv-totals">
        <div class="inv-totals-box">
          <div class="inv-totals-row"><span>Sub Total</span><span>${f(subtotal)}</span></div>
          ${discount>0?`<div class="inv-totals-row"><span>Discount</span><span>-${f(discount)}</span></div>`:''}
          <div class="inv-totals-row"><span>${settings.tax.taxName}</span><span>${f(tax)}</span></div>
          <div class="inv-totals-row"><span>TOTAL DUE</span><span>${f(taxable+tax)}</span></div>
        </div>
      </div>
      ${q.termsConditions?`<div class="inv-payment"><div class="pay-box"><b>Terms & Conditions:</b><br>${escHtml(q.termsConditions).replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="inv-footer">${settings.quotes.footer||''}</div>
    </div>
  `;
  document.getElementById('preview-content').innerHTML = html;
  openModal('preview-modal');
}

// ============================================================
//  CLIENTS PAGE
// ============================================================
function renderClients() {
  let clients = DB.getClients();
  const search = (document.getElementById('client-search')?.value||'').toLowerCase();
  if (search) clients = clients.filter(c=>(c.businessName||'').toLowerCase().includes(search)||(c.email||'').toLowerCase().includes(search));

  const { page, perPage } = clientPagination;
  const total = clients.length;
  const paged = clients.slice((page-1)*perPage, page*perPage);
  const tbody = document.getElementById('clients-tbody');

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <h3>No clients yet</h3><p>Add your first client</p>
      <button class="btn btn-primary btn-sm" onclick="openNewClientModal()">+ Add Client</button>
    </div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(c => {
      const invs = DB.getInvoices().filter(i=>i.clientId===c.id);
      const total = invs.reduce((s,i)=>s+calcInvoiceGross(i),0);
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--primary-light));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0">${(c.businessName||'?').charAt(0).toUpperCase()}</div>
            <div><div style="font-weight:600">${escHtml(c.businessName||'—')}</div><div style="font-size:11px;color:var(--text-muted)">${c.firstName||''} ${c.lastName||''}</div></div>
          </div>
        </td>
        <td>${escHtml(c.email||'—')}</td>
        <td>${escHtml(c.address||'—')}</td>
        <td>${invs.length}</td>
        <td class="text-mono fw-bold">${DB.formatCurrency(total)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon" title="Edit" onclick="openEditClientModal('${c.id}')">✏️</button>
            <button class="btn btn-icon" title="New Invoice" onclick="quickInvoiceForClient('${c.id}')">📄</button>
            <button class="btn btn-icon" title="Delete" onclick="deleteClientConfirm('${c.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('client-pagination', page, Math.ceil(total/perPage), p => { clientPagination.page=p; renderClients(); });
}

function openNewClientModal() {
  editingClient = null;
  document.getElementById('client-modal-title').textContent = 'Add New Client';
  ['client-biz-name','client-email','client-username','client-password','client-address','client-extra','client-first','client-last','client-website','client-gst'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
  document.getElementById('client-user-type').value='existing';
  openModal('client-modal');
}

function openEditClientModal(id) {
  const c = DB.getClient(id);
  if (!c) return;
  editingClient = c;
  document.getElementById('client-modal-title').textContent = 'Edit Client — ' + c.businessName;
  document.getElementById('client-biz-name').value = c.businessName||'';
  document.getElementById('client-email').value = c.email||'';
  document.getElementById('client-address').value = c.address||'';
  document.getElementById('client-extra').value = c.extraInfo||'';
  document.getElementById('client-first').value = c.firstName||'';
  document.getElementById('client-last').value = c.lastName||'';
  document.getElementById('client-website').value = c.website||'';
  document.getElementById('client-gst').value = c.gst||'';
  openModal('client-modal');
}

function saveClient() {
  const biz = document.getElementById('client-biz-name').value.trim();
  const email = document.getElementById('client-email').value.trim();
  if (!biz) { showToast('Business name required','error'); return; }
  const client = {
    ...(editingClient||{}),
    businessName: biz,
    email,
    address: document.getElementById('client-address').value,
    extraInfo: document.getElementById('client-extra').value,
    firstName: document.getElementById('client-first').value,
    lastName: document.getElementById('client-last').value,
    website: document.getElementById('client-website').value,
    gst: document.getElementById('client-gst').value,
  };
  DB.saveClient(client);
  closeModal('client-modal');
  renderClients();
  showToast(editingClient?'Client updated!':'Client added!','success');
}

function deleteClientConfirm(id) {
  if (confirm('Delete this client?')) {
    DB.deleteClient(id);
    renderClients();
    showToast('Client deleted','info');
  }
}

function quickInvoiceForClient(clientId) {
  openNewInvoiceModal();
  setTimeout(()=>{ document.getElementById('inv-client').value = clientId; },100);
}

// ============================================================
//  SETTINGS PAGE
// ============================================================
let activeSettingsTab = 'general';
function renderSettings() {
  loadSettingsTab(activeSettingsTab);
}

function loadSettingsTab(tab) {
  activeSettingsTab = tab;
  document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab===tab));
  document.querySelectorAll('.settings-panel-section').forEach(el => el.classList.toggle('hidden', el.dataset.tab!==tab));
  const settings = DB.getSettings();
  const s = settings;

  if (tab==='general') {
    document.getElementById('s-year-start').value = s.general.yearStart||'01 Apr';
    document.getElementById('s-year-end').value = s.general.yearEnd||'31 Mar';
    renderPredefinedItems(s.general.predefinedItems||[]);
  } else if (tab==='business') {
    document.getElementById('s-biz-name').value = s.business.name||'';
    document.getElementById('s-biz-address').value = s.business.address||'';
    document.getElementById('s-biz-extra').value = s.business.extraInfo||'';
    document.getElementById('s-biz-website').value = s.business.website||'';
  } else if (tab==='quotes') {
    document.getElementById('s-q-prefix').value = s.quotes.prefix||'';
    document.getElementById('s-q-suffix').value = s.quotes.suffix||'';
    document.getElementById('s-q-next').value = s.quotes.nextNumber||1;
    document.getElementById('s-q-valid').value = s.quotes.validDays||15;
    document.getElementById('s-q-terms').value = s.quotes.termsConditions||'';
    document.getElementById('s-q-footer').value = s.quotes.footer||'';
  } else if (tab==='invoices') {
    document.getElementById('s-i-prefix').value = s.invoices.prefix||'';
    document.getElementById('s-i-suffix').value = s.invoices.suffix||'';
    document.getElementById('s-i-next').value = s.invoices.nextNumber||1;
    document.getElementById('s-i-due').value = s.invoices.dueDays||14;
    document.getElementById('s-i-terms').value = s.invoices.termsConditions||'';
    document.getElementById('s-i-footer').value = s.invoices.footer||'';
  } else if (tab==='payments') {
    document.getElementById('s-p-currency').value = s.payments.currency||'₹';
    document.getElementById('s-p-decimals').value = s.payments.decimals||2;
    document.getElementById('s-p-bank').value = s.payments.bankDetails||'';
    document.getElementById('s-p-generic').value = s.payments.genericPayment||'';
  } else if (tab==='tax') {
    document.getElementById('s-t-pct').value = s.tax.taxPercentage||18;
    document.getElementById('s-t-name').value = s.tax.taxName||'GST (18%)';
    document.getElementById('s-t-inclusive').checked = s.tax.pricesIncludeTax||false;
  } else if (tab==='emails') {
    document.getElementById('s-e-addr').value = s.emails.emailAddress||'';
    document.getElementById('s-e-name').value = s.emails.emailName||'';
    document.getElementById('s-e-bcc').checked = s.emails.bccOnClientEmails||true;
  } else if (tab==='translate') {
    const t = s.translate;
    ['quoteLabel','invoiceLabel','hrsQty','service','ratePrice','adjust','subTotal','discount','total','totalDue'].forEach(k=>{
      const el = document.getElementById('s-tr-'+k);
      if(el) el.value = t[k]||'';
    });
  }
}

function saveSettingsTab(tab) {
  const settings = DB.getSettings();
  if (tab==='general') {
    settings.general.yearStart = document.getElementById('s-year-start').value;
    settings.general.yearEnd = document.getElementById('s-year-end').value;
  } else if (tab==='business') {
    settings.business.name = document.getElementById('s-biz-name').value;
    settings.business.address = document.getElementById('s-biz-address').value;
    settings.business.extraInfo = document.getElementById('s-biz-extra').value;
    settings.business.website = document.getElementById('s-biz-website').value;
  } else if (tab==='quotes') {
    settings.quotes.prefix = document.getElementById('s-q-prefix').value;
    settings.quotes.suffix = document.getElementById('s-q-suffix').value;
    settings.quotes.nextNumber = parseInt(document.getElementById('s-q-next').value)||1;
    settings.quotes.validDays = parseInt(document.getElementById('s-q-valid').value)||15;
    settings.quotes.termsConditions = document.getElementById('s-q-terms').value;
    settings.quotes.footer = document.getElementById('s-q-footer').value;
  } else if (tab==='invoices') {
    settings.invoices.prefix = document.getElementById('s-i-prefix').value;
    settings.invoices.suffix = document.getElementById('s-i-suffix').value;
    settings.invoices.nextNumber = parseInt(document.getElementById('s-i-next').value)||1;
    settings.invoices.dueDays = parseInt(document.getElementById('s-i-due').value)||14;
    settings.invoices.termsConditions = document.getElementById('s-i-terms').value;
    settings.invoices.footer = document.getElementById('s-i-footer').value;
  } else if (tab==='payments') {
    settings.payments.currency = document.getElementById('s-p-currency').value;
    settings.payments.decimals = parseInt(document.getElementById('s-p-decimals').value)||2;
    settings.payments.bankDetails = document.getElementById('s-p-bank').value;
    settings.payments.genericPayment = document.getElementById('s-p-generic').value;
  } else if (tab==='tax') {
    settings.tax.taxPercentage = parseFloat(document.getElementById('s-t-pct').value)||18;
    settings.tax.taxName = document.getElementById('s-t-name').value;
    settings.tax.pricesIncludeTax = document.getElementById('s-t-inclusive').checked;
  } else if (tab==='emails') {
    settings.emails.emailAddress = document.getElementById('s-e-addr').value;
    settings.emails.emailName = document.getElementById('s-e-name').value;
    settings.emails.bccOnClientEmails = document.getElementById('s-e-bcc').checked;
  } else if (tab==='translate') {
    ['quoteLabel','invoiceLabel','hrsQty','service','ratePrice','adjust','subTotal','discount','total','totalDue'].forEach(k=>{
      const el = document.getElementById('s-tr-'+k);
      if(el) settings.translate[k] = el.value;
    });
  }
  DB.saveSettings(settings);
  showToast('Settings saved!','success');
}

function renderPredefinedItems(items) {
  const wrap = document.getElementById('predefined-items-wrap');
  wrap.innerHTML = items.map((item,i) => `
    <div style="display:grid;grid-template-columns:60px 1fr 100px 80px auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <input type="number" value="${item.qty||1}" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:13px;width:100%" oninput="updatePredefined(${i},'qty',this.value)">
      <input type="text" value="${escHtml(item.title||'')}" placeholder="Item title" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:13px;width:100%" oninput="updatePredefined(${i},'title',this.value)">
      <input type="number" value="${item.price||0}" placeholder="Price" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:13px;width:100%" oninput="updatePredefined(${i},'price',this.value)">
      <input type="text" value="${escHtml(item.desc||'')}" placeholder="Description" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:13px;width:100%" oninput="updatePredefined(${i},'desc',this.value)">
      <button class="btn btn-danger btn-sm" onclick="removePredefined(${i})">✕</button>
    </div>
  `).join('') || '<p style="color:var(--text-muted);font-size:13px;padding:10px 0">No predefined items. Add one below.</p>';
}

function addPredefinedItemRow() {
  const settings = DB.getSettings();
  settings.general.predefinedItems.push({ qty:1, title:'', price:0, desc:'' });
  DB.saveSettings(settings);
  renderPredefinedItems(settings.general.predefinedItems);
}

function updatePredefined(i, field, val) {
  const settings = DB.getSettings();
  if (field==='qty'||field==='price') settings.general.predefinedItems[i][field] = parseFloat(val)||0;
  else settings.general.predefinedItems[i][field] = val;
  DB.saveSettings(settings);
}

function removePredefined(i) {
  const settings = DB.getSettings();
  settings.general.predefinedItems.splice(i,1);
  DB.saveSettings(settings);
  renderPredefinedItems(settings.general.predefinedItems);
}

// ============================================================
//  HELPERS
// ============================================================
function populateClientDropdown(elId, selectedId='') {
  const el = document.getElementById(elId);
  if (!el) return;
  const clients = DB.getClients();
  el.innerHTML = '<option value="">— Select Client —</option>' +
    clients.map(c=>`<option value="${c.id}" ${c.id===selectedId?'selected':''}>${escHtml(c.businessName)}</option>`).join('');
}

function populatePredefinedDropdown(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const settings = DB.getSettings();
  el.innerHTML = '<option value="">+ Add pre-defined item</option>' +
    (settings.general.predefinedItems||[]).map((item,i)=>`<option value="${i}">${escHtml(item.title)} — ₹${item.price}</option>`).join('');
}

function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  const maxVisible = 5;
  let pages = [];
  if (totalPages <= maxVisible) {
    pages = Array.from({length:totalPages},(_,i)=>i+1);
  } else {
    pages = [1];
    if (currentPage > 3) pages.push('...');
    for(let i=Math.max(2,currentPage-1);i<=Math.min(totalPages-1,currentPage+1);i++) pages.push(i);
    if (currentPage < totalPages-2) pages.push('...');
    pages.push(totalPages);
  }
  el.innerHTML = `
    <span>${currentPage} of ${totalPages}</span>
    <button class="page-btn" ${currentPage===1?'disabled':''} onclick="(${onPageChange.toString()})(${currentPage-1})">‹</button>
    ${pages.map(p=>p==='...'?`<span style="padding:0 4px">…</span>`:`<button class="page-btn ${p===currentPage?'active':''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`).join('')}
    <button class="page-btn" ${currentPage===totalPages?'disabled':''} onclick="(${onPageChange.toString()})(${currentPage+1})">›</button>
  `;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Import/Export ─────────────────────────────────────────
function exportData() { DB.exportAll(); showToast('Database exported as JSON!','success'); }

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (DB.importAll(ev.target.result)) {
        showToast('Data imported successfully!','success');
        renderPage(currentPage);
      } else {
        showToast('Import failed: invalid JSON','error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── Global search ─────────────────────────────────────────
document.getElementById('global-search')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  if (!q) return;
  if (currentPage==='invoices') renderInvoices(q);
  else if (currentPage==='quotes') renderQuotes(q);
  else if (currentPage==='clients') {
    document.getElementById('client-search').value = q;
    renderClients();
  }
});
