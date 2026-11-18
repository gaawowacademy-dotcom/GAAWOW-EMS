/* GAAWOW EMS — Invoice & Payment Receipt module
   Usage:
     GaawowReceipt.invoice({...})   // preview + print invoice
     GaawowReceipt.payment({...})   // preview + print payment receipt
*/
(function () {
  "use strict";

  var CONFIG = {
    logo: "https://i.ibb.co/4ZCRpm30/gaawow-logo.png",
    academy: "GAAWOW ACADEMY",
    motto: "Ilayska Aqoonta iyo Xirfadda",
    system: "Education Management & Verification System",
    signerName: "Dr. Osmaan Mohamed Ibraahin",
    signerTitle: "G-Director / Founder",
    // Haddii aad haysato sawirka saxiixa (PNG transparent), halkan ku qor URL-kiisa:
    signatureImage: "",
    signatureText: "Osmaan M. Ibraahin"
  };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pick(o) {
    for (var i = 1; i < arguments.length; i++) {
      var v = o[arguments[i]];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "";
  }

  function money(n, cur) {
    var x = Number(n || 0);
    var c = cur || "USD";
    var s = x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return c === "USD" ? "$" + s : s + " " + c;
  }

  function fdate(d) {
    if (!d) return "—";
    var dt = new Date(d);
    if (isNaN(dt)) return esc(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  var CSS = [
    "@page{size:A4;margin:10mm}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:Arial,Helvetica,sans-serif;color:#17233d;background:#eef2fa;padding:14px}",
    ".sheet{max-width:780px;margin:auto;background:#fff;border:2px solid #D4AF37;border-radius:6px;position:relative;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    ".sheet:before{content:'';position:absolute;inset:6px;border:1px solid #0B1E63;border-radius:3px;pointer-events:none;opacity:.35}",
    ".wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:84px;font-weight:900;letter-spacing:6px;color:rgba(11,30,99,.05);white-space:nowrap;pointer-events:none}",
    ".head{background:linear-gradient(110deg,#0B1E63,#0B4DA2);color:#fff;padding:20px 26px;display:flex;align-items:center;justify-content:space-between;gap:14px}",
    ".brand{display:flex;align-items:center;gap:13px}",
    ".brand img{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:12px;padding:5px}",
    ".brand h1{font-size:21px;letter-spacing:1px}",
    ".brand p{font-size:10px;opacity:.9;margin-top:3px}",
    ".brand em{display:block;font-size:10px;color:#D4AF37;margin-top:3px;font-style:normal;font-weight:700}",
    ".doc-tag{text-align:right}",
    ".doc-tag h2{font-size:17px;color:#D4AF37;letter-spacing:1.5px}",
    ".doc-tag div{font-size:11px;margin-top:5px;opacity:.95}",
    ".goldbar{height:5px;background:linear-gradient(90deg,#D4AF37,#f3dc86,#D4AF37)}",
    ".body{padding:22px 26px;position:relative}",
    ".status-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap}",
    ".num{font-size:13px;color:#64748b}.num b{color:#0B1E63;font-size:16px;display:block;margin-top:2px}",
    ".badge{padding:7px 16px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;border:2px solid}",
    ".b-green{background:#dcf5e6;color:#126b39;border-color:#16834a}",
    ".b-orange{background:#fff2d8;color:#9a6100;border-color:#c47b12}",
    ".b-red{background:#ffe1e1;color:#a51d1d;border-color:#c62828}",
    ".b-blue{background:#e0efff;color:#1456a0;border-color:#0B4DA2}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}",
    ".box{border:1px solid #e2e8f0;border-left:4px solid #D4AF37;border-radius:8px;padding:12px 14px;background:#fafbfe}",
    ".box h4{font-size:10px;color:#0B4DA2;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}",
    ".row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:4px 0;border-bottom:1px dashed #e2e8f0}",
    ".row:last-child{border-bottom:0}.row span{color:#64748b}.row b{color:#17233d;text-align:right;word-break:break-word}",
    "table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}",
    "th{background:#0B1E63;color:#fff;text-align:left;padding:10px;font-size:11px;letter-spacing:.5px;text-transform:uppercase}",
    "td{padding:11px 10px;border-bottom:1px solid #e2e8f0}",
    "td.r,th.r{text-align:right}",
    ".totals{margin-left:auto;width:290px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px}",
    ".totals div{display:flex;justify-content:space-between;padding:9px 13px;font-size:12px;border-bottom:1px solid #e2e8f0}",
    ".totals div.grand{background:linear-gradient(110deg,#0B1E63,#0B4DA2);color:#fff;font-size:14px;font-weight:800;border:0}",
    ".totals div.grand span{color:#D4AF37}",
    ".note{font-size:11px;color:#475569;background:#f5f7fa;border-radius:8px;padding:10px 12px;margin-bottom:22px;line-height:1.6}",
    ".sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px;align-items:end}",
    ".sig{text-align:center;font-size:11px}",
    ".sig .area{height:62px;display:flex;align-items:flex-end;justify-content:center;position:relative}",
    ".sig .line{border-top:1.5px solid #0B1E63;padding-top:6px;margin-top:2px}",
    ".sig b{display:block;color:#0B1E63;font-size:12px}",
    ".sig small{color:#64748b;font-size:10px}",
    ".sig .date{margin-top:4px;color:#64748b;font-size:10px}",
    ".autograph{font-family:'Segoe Script','Brush Script MT','Lucida Handwriting','Snell Roundhand',cursive;font-size:25px;color:#0B1E63;transform:rotate(-5deg);line-height:1;white-space:nowrap;position:relative}",
    ".autograph:after{content:'';position:absolute;left:-4px;right:-4px;bottom:-7px;height:2px;background:#0B1E63;border-radius:50%;transform:rotate(1.5deg);opacity:.75}",
    ".sigimg{max-height:60px;max-width:100%}",
    ".stamp{position:absolute;right:-6px;bottom:2px;width:68px;height:68px;border:3px double #16834a;border-radius:50%;color:#16834a;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;text-align:center;transform:rotate(-14deg);opacity:.8;line-height:1.15}",
    ".stamp.pending{border-color:#c47b12;color:#c47b12}",
    ".foot{margin-top:20px;border-top:3px solid #D4AF37;padding:12px 26px;background:#0B1E63;color:#fff;text-align:center;font-size:10px;line-height:1.7}",
    ".foot b{color:#D4AF37;letter-spacing:1px}",
    "@media(max-width:560px){.grid{grid-template-columns:1fr}.sigs{grid-template-columns:1fr}.head{flex-direction:column;align-items:flex-start}.doc-tag{text-align:left}.totals{width:100%}.wm{font-size:48px}}",
    "@media print{body{background:#fff;padding:0}.sheet{border-radius:0;max-width:none}}"
  ].join("\n");

  function badgeClass(s) {
    s = String(s || "").toLowerCase();
    if (["paid", "successful", "approved", "issued"].indexOf(s) > -1) return "b-green";
    if (["failed", "rejected", "overdue", "cancelled"].indexOf(s) > -1) return "b-red";
    if (["partial", "in_review", "refunded"].indexOf(s) > -1) return "b-blue";
    return "b-orange";
  }

  function signerBlock() {
    var mark = CONFIG.signatureImage
      ? '<img class="sigimg" src="' + esc(CONFIG.signatureImage) + '" alt="Signature">'
      : '<span class="autograph">' + esc(CONFIG.signatureText) + "</span>";
    return '<div class="sig"><div class="area">' + mark + "</div>" +
      '<div class="line"><b>' + esc(CONFIG.signerName) + "</b><small>" +
      esc(CONFIG.signerTitle) + "</small></div></div>";
  }

  function blankSig(title, sub) {
    return '<div class="sig"><div class="area"></div><div class="line"><b>' + esc(title) +
      "</b><small>" + esc(sub) + '</small></div><div class="date">Date: ____ / ____ / ______</div></div>';
  }

  function wrap(kind, number, dateStr, status, inner, stampText, stampPending) {
    var title = kind === "invoice" ? "INVOICE" : "OFFICIAL PAYMENT RECEIPT";
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" + title + " " + esc(number) + "</title><style>" + CSS + "</style></head><body>" +
      '<div class="sheet"><div class="wm">GAAWOW</div>' +
      '<div class="head"><div class="brand"><img src="' + CONFIG.logo + '" alt="Logo"><div><h1>' +
      CONFIG.academy + "</h1><p>" + CONFIG.system + "</p><em>" + CONFIG.motto + "</em></div></div>" +
      '<div class="doc-tag"><h2>' + title + "</h2><div>No: <b>" + esc(number) + "</b></div><div>Date: " +
      fdate(dateStr) + "</div></div></div><div class=\"goldbar\"></div>" +
      '<div class="body">' + inner +
      '<div class="sigs">' + signerBlock() +
      blankSig("Finance Manager", "Name & Signature") +
      blankSig(kind === "invoice" ? "Student / Parent" : "Payer", "Name & Signature") + "</div>" +
      (stampText ? '<div style="position:relative;height:0"><div class="stamp' + (stampPending ? " pending" : "") +
        '" style="right:10px;bottom:150px">' + stampText + "</div></div>" : "") +
      "</div>" +
      '<div class="foot"><b>' + CONFIG.academy + "</b> | " + CONFIG.motto +
      "<br>This document is computer generated by GAAWOW EMS and is valid only with an authorised signature and stamp." +
      "</div></div></body></html>";
  }

  function invoiceHtml(d) {
    var cur = pick(d, "currency") || "USD";
    var amount = Number(pick(d, "amount", "total_amount", "total") || 0);
    var paid = Number(pick(d, "paid", "paid_amount", "amount_paid") || 0);
    var balance = d.balance !== undefined && d.balance !== "" ? Number(d.balance) : amount - paid;
    var status = pick(d, "status") || (balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid");
    var number = pick(d, "invoice_number", "number", "invoice_no", "id");
    var inner =
      '<div class="status-row"><div class="num">Invoice Number<b>' + esc(number) + "</b></div>" +
      '<span class="badge ' + badgeClass(status) + '">' + esc(String(status).replace("_", " ")) + "</span></div>" +
      '<div class="grid"><div class="box"><h4>Billed To</h4>' +
      '<div class="row"><span>Student</span><b>' + esc(pick(d, "student_name", "student")) + "</b></div>" +
      '<div class="row"><span>Student ID</span><b>' + esc(pick(d, "student_id_number", "student_code")) + "</b></div>" +
      '<div class="row"><span>Institution</span><b>' + esc(pick(d, "institution_name", "institution")) + "</b></div></div>" +
      '<div class="box"><h4>Invoice Details</h4>' +
      '<div class="row"><span>Issue Date</span><b>' + fdate(pick(d, "issue_date", "created_at", "date")) + "</b></div>" +
      '<div class="row"><span>Due Date</span><b>' + fdate(pick(d, "due_date")) + "</b></div>" +
      '<div class="row"><span>Currency</span><b>' + esc(cur) + "</b></div></div></div>" +
      '<table><thead><tr><th style="width:40px">#</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>' + esc(pick(d, "description") || "School fees") + '</td><td class="r">' + money(amount, cur) + "</td></tr></tbody></table>" +
      '<div class="totals"><div><span>Invoice Total</span><b>' + money(amount, cur) + "</b></div>" +
      '<div><span>Total Paid</span><b>' + money(paid, cur) + "</b></div>" +
      '<div class="grand"><span>Balance Due</span><b>' + money(balance, cur) + "</b></div></div>" +
      '<div class="note"><b>Fiiro gaar ah:</b> Fadlan lacagta ku bixi Finance Office-ka ama habka lacag-bixinta ee la oggol yahay, kuna sheeg lambarka invoice-ka kor ku xusan.</div>';
    return wrap("invoice", number, pick(d, "issue_date", "created_at", "date"), status, inner,
      balance <= 0 ? "PAID<br>IN FULL" : "", false);
  }

  function paymentHtml(d) {
    var cur = pick(d, "currency") || "USD";
    var amount = Number(pick(d, "amount") || 0);
    var status = pick(d, "status") || "pending";
    var ok = String(status).toLowerCase() === "successful";
    var number = pick(d, "receipt_number", "receipt_no", "payment_reference", "reference", "id");
    var inner =
      '<div class="status-row"><div class="num">Receipt Number<b>' + esc(number) + "</b></div>" +
      '<span class="badge ' + badgeClass(status) + '">' + esc(ok ? "Paid / Approved" : status) + "</span></div>" +
      '<div class="grid"><div class="box"><h4>Received From</h4>' +
      '<div class="row"><span>Student</span><b>' + esc(pick(d, "student_name", "student")) + "</b></div>" +
      '<div class="row"><span>Institution</span><b>' + esc(pick(d, "institution_name", "institution")) + "</b></div>" +
      '<div class="row"><span>Payer Phone</span><b>' + esc(pick(d, "payer_phone", "phone")) + "</b></div></div>" +
      '<div class="box"><h4>Payment Details</h4>' +
      '<div class="row"><span>Payment Ref.</span><b>' + esc(pick(d, "payment_reference", "reference")) + "</b></div>" +
      '<div class="row"><span>Method</span><b>' + esc(pick(d, "payment_method", "method")) + "</b></div>" +
      '<div class="row"><span>Transaction Ref.</span><b>' + esc(pick(d, "transaction_reference", "transaction_ref")) + "</b></div>" +
      '<div class="row"><span>Payment Date</span><b>' + fdate(pick(d, "payment_date", "date", "created_at")) + "</b></div>" +
      '<div class="row"><span>Invoice No.</span><b>' + esc(pick(d, "invoice_number", "invoice")) + "</b></div></div></div>" +
      '<table><thead><tr><th style="width:40px">#</th><th>Description</th><th class="r">Amount Received</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>' + esc(pick(d, "description", "notes") || "Payment received") + '</td><td class="r">' + money(amount, cur) + "</td></tr></tbody></table>" +
      '<div class="totals"><div class="grand"><span>Total Received</span><b>' + money(amount, cur) + "</b></div></div>" +
      '<div class="note">' + (ok
        ? "<b>Xaqiijin:</b> Lacagtan waa la helay, waana la ansixiyey. Rasiidkani waa caddeyn rasmi ah oo lacag-bixinta ah."
        : "<b>Digniin:</b> Bixintan weli waa la dib-eegayaa. Rasiidkan rasmiga ah waxaa la siinayaa kaddib ansixinta.") + "</div>";
    return wrap("payment", number, pick(d, "payment_date", "date", "created_at"), status, inner,
      ok ? "PAID<br>GAAWOW" : "PENDING", !ok);
  }

  function ensureModal() {
    var m = document.getElementById("gwReceiptModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "gwReceiptModal";
    m.style.cssText = "position:fixed;inset:0;z-index:5000;background:rgba(4,13,39,.7);display:none;flex-direction:column;padding:10px";
    m.innerHTML =
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:8px">' +
      '<button id="gwPrintBtn" style="border:0;border-radius:8px;padding:10px 16px;font-weight:700;background:#D4AF37;color:#0B1E63;cursor:pointer">Print / Save PDF</button>' +
      '<button id="gwCloseBtn" style="border:0;border-radius:8px;padding:10px 16px;font-weight:700;background:#fff;color:#0B1E63;cursor:pointer">Close</button></div>' +
      '<iframe id="gwReceiptFrame" style="flex:1;width:100%;border:0;border-radius:10px;background:#fff"></iframe>';
    document.body.appendChild(m);
    document.getElementById("gwCloseBtn").onclick = function () { m.style.display = "none"; };
    document.getElementById("gwPrintBtn").onclick = function () {
      var f = document.getElementById("gwReceiptFrame");
      f.contentWindow.focus();
      f.contentWindow.print();
    };
    return m;
  }

  function show(html) {
    var m = ensureModal();
    document.getElementById("gwReceiptFrame").srcdoc = html;
    m.style.display = "flex";
  }

  window.GaawowReceipt = {
    config: CONFIG,
    invoice: function (d) { show(invoiceHtml(d || {})); },
    payment: function (d) { show(paymentHtml(d || {})); }
  };
})();
