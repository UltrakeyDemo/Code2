// ============================================================
//  UltraKey Invoice App — Database Layer
//  Storage: localStorage (works on GitHub Pages)
//  Export/Import: JSON files compatible with D:\UltraKeydb
// ============================================================

const DB = {
  // ── Keys ──────────────────────────────────────────────────
  KEYS: {
    USERS:    'ukey_users',
    CLIENTS:  'ukey_clients',
    INVOICES: 'ukey_invoices',
    QUOTES:   'ukey_quotes',
    SETTINGS: 'ukey_settings',
    SESSION:  'ukey_session',
  },

  // ── Helpers ───────────────────────────────────────────────
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ── Init seed data ────────────────────────────────────────
  init() {
    if (!this._get(this.KEYS.USERS)) {
      this._set(this.KEYS.USERS, [
        { id:'u1', username:'admin', password:'Admin@123', name:'Admin User', role:'admin', email:'admin@ultrakeyit.com' }
      ]);
    }
    if (!this._get(this.KEYS.CLIENTS)) this._set(this.KEYS.CLIENTS, []);
    if (!this._get(this.KEYS.INVOICES)) this._set(this.KEYS.INVOICES, []);
    if (!this._get(this.KEYS.QUOTES)) this._set(this.KEYS.QUOTES, []);
    if (!this._get(this.KEYS.SETTINGS)) {
      this._set(this.KEYS.SETTINGS, {
        general: {
          yearStart: '01 Apr',
          yearEnd: '31 Mar',
          predefinedItems: [
            { qty:1, title:'.com/.in Domain Registration Charges per year', price:1600, desc:'Domain Registration Per Year' },
            { qty:1, title:'Hosting Plan for 1 year', price:2500, desc:'Web Hosting Space for 1 year' },
            { qty:1, title:'SSL Certificate for 1 Year', price:1200, desc:'SSL Certificate for 1 Year' },
          ]
        },
        business: {
          logo: '',
          name: 'Ultrakey IT Solutions Private Limited',
          address: 'Flat No. 204, 2nd Floor, Cyber Residency,\nInidra Nagar, Gachibowli,\nHyderabad, Telangana, India-500032\nsupport@ultrakeyit.com',
          extraInfo: '<br><b>GST No:</b> 36AADCU5062A1ZO',
          website: 'https://ultrakeyit.com'
        },
        quotes: {
          prefix: 'AKEYQ-',
          suffix: '',
          autoIncrement: true,
          nextNumber: 52,
          validDays: 15,
          termsConditions: 'This is a fixed price quote. If accepted, we require a 60% deposit upfront before work commences.',
          footer: 'Thanks for choosing <a href="https://ultrakeyit.com" target="_blank">Ultrakey IT Solutions Private Limited</a> | <a href="mailto:support@ultrakeyit.com">support@ultrakeyit.com</a>',
          acceptButton: true,
          acceptedAction: 'Convert Quote to Invoice and send to client',
          declineReasonRequired: true,
        },
        invoices: {
          prefix: 'AKEYI-',
          suffix: '',
          autoIncrement: true,
          nextNumber: 128,
          dueDays: 14,
          termsConditions: 'Payment is due within 14 days from date of invoice. Late payment is subject to fees of 5% per month.\n\n<b>Payment Methods:</b>\n- 60% Advance Payment for Commencement\n- Remaining 40% Final Settlement',
          footer: 'Thanks for choosing <a href="https://ultrakeyit.com" target="_blank">Ultrakey IT Solutions Private Limited</a> | <a href="mailto:support@ultrakeyit.com">support@ultrakeyit.com</a>',
        },
        payments: {
          currency: '₹',
          currencyPosition: 'left',
          thousandSep: ',',
          decimalSep: '.',
          decimals: 2,
          bankDetails: '',
          genericPayment: 'Pay Invoice amount via one of the options mentioned in the below\n1. Click here for Online Payment through Razorpay - Debit/Credit Card/UPI etc.,\n2. Gpay (or) Phonepe Number: 6300440316',
        },
        tax: {
          pricesIncludeTax: false,
          taxPercentage: 18,
          taxName: 'GST (18%)'
        },
        emails: {
          emailAddress: 'support@ultrakeyit.com',
          emailName: 'Ultrakey IT Solutions Private Limited',
          bccOnClientEmails: true,
        },
        translate: {
          quoteLabel: 'Quote',
          invoiceLabel: 'Invoice',
          hrsQty: 'Hrs/Qty',
          service: 'Service',
          ratePrice: 'Rate/Price',
          adjust: 'Adjust',
          subTotal: 'Sub Total',
          discount: 'Discount',
          total: 'Total',
          totalDue: 'Total Due',
        }
      });
    }
  },

  // ── Auth ──────────────────────────────────────────────────
  login(username, password) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const session = { userId: user.id, name: user.name, role: user.role, email: user.email, loginAt: Date.now() };
      this._set(this.KEYS.SESSION, session);
      return session;
    }
    return null;
  },
  logout() { localStorage.removeItem(this.KEYS.SESSION); },
  getSession() { return this._get(this.KEYS.SESSION); },

  // ── Settings ──────────────────────────────────────────────
  getSettings() { return this._get(this.KEYS.SETTINGS); },
  saveSettings(settings) { this._set(this.KEYS.SETTINGS, settings); },

  // ── Clients ───────────────────────────────────────────────
  getClients() { return this._get(this.KEYS.CLIENTS) || []; },
  saveClient(client) {
    const clients = this.getClients();
    if (client.id) {
      const idx = clients.findIndex(c => c.id === client.id);
      if (idx > -1) clients[idx] = client; else clients.push(client);
    } else {
      client.id = 'c' + Date.now();
      client.createdAt = new Date().toISOString();
      clients.push(client);
    }
    this._set(this.KEYS.CLIENTS, clients);
    return client;
  },
  deleteClient(id) {
    const clients = this.getClients().filter(c => c.id !== id);
    this._set(this.KEYS.CLIENTS, clients);
  },
  getClient(id) { return this.getClients().find(c => c.id === id); },

  // ── Invoices ──────────────────────────────────────────────
  getInvoices() { return this._get(this.KEYS.INVOICES) || []; },
  saveInvoice(invoice) {
    const invoices = this.getInvoices();
    const settings = this.getSettings();
    if (!invoice.id) {
      const num = String(settings.invoices.nextNumber).padStart(4,'0');
      invoice.invoiceNumber = settings.invoices.prefix + num + (settings.invoices.suffix||'');
      invoice.id = 'inv' + Date.now();
      invoice.createdAt = new Date().toISOString();
      // Auto-increment
      settings.invoices.nextNumber = (settings.invoices.nextNumber||1) + 1;
      this.saveSettings(settings);
      invoices.push(invoice);
    } else {
      const idx = invoices.findIndex(i => i.id === invoice.id);
      if (idx > -1) invoices[idx] = invoice; else invoices.push(invoice);
    }
    this._set(this.KEYS.INVOICES, invoices);
    return invoice;
  },
  deleteInvoice(id) {
    this._set(this.KEYS.INVOICES, this.getInvoices().filter(i => i.id !== id));
  },
  getInvoice(id) { return this.getInvoices().find(i => i.id === id); },

  // ── Quotes ────────────────────────────────────────────────
  getQuotes() { return this._get(this.KEYS.QUOTES) || []; },
  saveQuote(quote) {
    const quotes = this.getQuotes();
    const settings = this.getSettings();
    if (!quote.id) {
      const num = String(settings.quotes.nextNumber).padStart(2,'0');
      quote.quoteNumber = settings.quotes.prefix + num + (settings.quotes.suffix||'');
      quote.id = 'q' + Date.now();
      quote.createdAt = new Date().toISOString();
      settings.quotes.nextNumber = (settings.quotes.nextNumber||1) + 1;
      this.saveSettings(settings);
      quotes.push(quote);
    } else {
      const idx = quotes.findIndex(q => q.id === quote.id);
      if (idx > -1) quotes[idx] = quote; else quotes.push(quote);
    }
    this._set(this.KEYS.QUOTES, quotes);
    return quote;
  },
  deleteQuote(id) {
    this._set(this.KEYS.QUOTES, this.getQuotes().filter(q => q.id !== id));
  },
  getQuote(id) { return this.getQuotes().find(q => q.id === id); },

  // ── Convert Quote to Invoice ──────────────────────────────
  convertQuoteToInvoice(quoteId) {
    const quote = this.getQuote(quoteId);
    if (!quote) return null;
    const settings = this.getSettings();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.invoices.dueDays||14));
    const invoice = {
      title: quote.title,
      clientId: quote.clientId,
      status: 'draft',
      lineItems: quote.lineItems,
      payments: [],
      termsConditions: settings.invoices.termsConditions,
      fromQuote: quote.id,
      dueDate: dueDate.toISOString().split('T')[0],
      discount: quote.discount || 0,
      taxRate: quote.taxRate,
      taxName: quote.taxName,
    };
    const saved = this.saveInvoice(invoice);
    // Mark quote as accepted
    quote.status = 'accepted';
    this.saveQuote(quote);
    return saved;
  },

  // ── Export all data (D:\UltraKeydb compatible JSON) ───────
  exportAll() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'UltraKey Invoice App',
      database: 'UltraKeydb',
      clients: this.getClients(),
      invoices: this.getInvoices(),
      quotes: this.getQuotes(),
      settings: this.getSettings(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UltraKeydb_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Import from JSON file ─────────────────────────────────
  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.clients)  this._set(this.KEYS.CLIENTS, data.clients);
      if (data.invoices) this._set(this.KEYS.INVOICES, data.invoices);
      if (data.quotes)   this._set(this.KEYS.QUOTES, data.quotes);
      if (data.settings) this._set(this.KEYS.SETTINGS, data.settings);
      return true;
    } catch(e) { return false; }
  },

  // ── Stats ─────────────────────────────────────────────────
  getStats() {
    const invoices = this.getInvoices();
    const quotes = this.getQuotes();
    const settings = this.getSettings();
    const currency = settings.payments.currency;
    const today = new Date().toISOString().split('T')[0];

    let totalRevenue = 0, paidCount = 0, overdueCount = 0, draftCount = 0;
    invoices.forEach(inv => {
      const total = this._calcTotal(inv);
      const paid = (inv.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
      if (inv.status === 'paid' || paid >= total) { totalRevenue += total; paidCount++; }
      if (inv.status === 'overdue' || (inv.dueDate && inv.dueDate < today && inv.status !== 'paid')) overdueCount++;
      if (inv.status === 'draft') draftCount++;
    });

    return {
      totalInvoices: invoices.length,
      totalQuotes: quotes.length,
      totalRevenue,
      paidCount,
      overdueCount,
      draftCount,
      pendingQuotes: quotes.filter(q=>q.status==='draft'||q.status==='sent').length,
      currency,
    };
  },

  _calcTotal(doc) {
    const settings = this.getSettings();
    const taxRate = doc.taxRate !== undefined ? doc.taxRate : settings.tax.taxPercentage;
    const items = doc.lineItems || [];
    const subtotal = items.reduce((s,i)=> s + (parseFloat(i.qty)||0)*(parseFloat(i.rate)||0)*(1-(parseFloat(i.adjust||0)/100)), 0);
    const discount = parseFloat(doc.discount||0);
    const taxable = subtotal - discount;
    const tax = settings.tax.pricesIncludeTax ? 0 : taxable * (taxRate/100);
    const paidAmt = (doc.payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
    return Math.max(0, taxable + tax - paidAmt);
  },

  formatCurrency(amount) {
    const s = this.getSettings();
    const p = s.payments;
    const formatted = parseFloat(amount||0).toLocaleString('en-IN', {
      minimumFractionDigits: p.decimals,
      maximumFractionDigits: p.decimals,
    });
    return p.currencyPosition === 'left' ? p.currency + formatted : formatted + p.currency;
  }
};
