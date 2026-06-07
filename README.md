# UltraKey Invoice Application

A complete **Invoice & Quotation Management** web application for Ultrakey IT Solutions Private Limited.

---

## 🚀 Live Demo
Deploy to GitHub Pages: `https://<your-username>.github.io/ultrakey-invoice/`

---

## 🔐 Default Login
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Admin@123` |

---

## 📁 Features
- **Dashboard** – Revenue stats, overdue count, recent invoices, monthly chart
- **Invoices** – Create, edit, delete, print, mark paid, track payments, pagination
- **Quotations** – Create, edit, convert to invoice, expiry auto-detection
- **Clients** – Full client database with GST/address support
- **Settings** – General, Business, Quotes, Invoices, Payments, Tax, Emails, Translate (all 8 tabs from requirements)
- **PDF Print** – Browser print / Save as PDF for any invoice or quote
- **Export/Import** – Full JSON export compatible with `D:\UltraKeydb` path naming
- **Auto-numbering** – AKEYI- and AKEYQ- prefix with auto-increment

---

## 🗄️ Database (D:\UltraKeydb)
All data is stored in **localStorage** (works on GitHub Pages). To backup/sync with `D:\UltraKeydb`:

1. Click **⬇ Export DB** button (top right) → saves `UltraKeydb_YYYY-MM-DD.json`
2. Move/copy the file to `D:\UltraKeydb\`
3. To restore: click **⬆ Import DB** → select the JSON file

---

## 🌐 Deploy to GitHub Pages

```bash
# 1. Create a new repo on GitHub named: ultrakey-invoice
# 2. Upload all files (index.html, css/, js/ folders)
# 3. Go to Settings → Pages → Source: main branch / root
# 4. Your app is live at https://yourusername.github.io/ultrakey-invoice/
```

Or via Git:
```bash
git init
git add .
git commit -m "Initial commit - UltraKey Invoice App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ultrakey-invoice.git
git push -u origin main
```

---

## 📂 File Structure
```
ultrakey-invoice/
├── index.html          # Main application (single page)
├── css/
│   └── style.css       # All styles (Ultrakey brand theme)
├── js/
│   ├── db.js           # Database layer (localStorage + export/import)
│   └── app.js          # Application logic
├── assets/
│   └── logo.png        # (add your Ultrakey logo here)
└── README.md
```

---

## 💾 Data Persistence
- **Local**: Browser localStorage (persists across sessions on same device)
- **Backup**: JSON export → `D:\UltraKeydb\UltraKeydb_DATE.json`
- **GitHub**: Upload the JSON file to your repo for cloud backup
- **Restore**: Import JSON on any device/browser

---

## 📋 Invoice Features (per Requirements)
✅ Pre-defined line items  
✅ Business tab with logo, name, address, GST  
✅ Quotation settings (prefix, auto-increment, validity, T&C, accept/decline)  
✅ Invoice settings (prefix, auto-increment, due days, T&C)  
✅ Email settings  
✅ Payment settings (currency ₹, Razorpay, bank, UPI)  
✅ Tax settings (GST 18%, inclusive/exclusive)  
✅ PDF download via browser print  
✅ Translate/Labels customization  
✅ Add New Client (existing user / create new)  
✅ Add New Invoice with line items, payments, discount  
✅ Invoice display with pagination (bottom right)  
✅ Quotes display with pagination (bottom right)  
✅ Paid invoice sample (AKEYI-0124 format)  
✅ Invoice template with From/To blocks, GST, payment methods  

---

*Prepared by: UltraKey IT Solutions Private Limited*  
*support@ultrakeyit.com | www.ultrakeyit.com | +91 63004 40316*
