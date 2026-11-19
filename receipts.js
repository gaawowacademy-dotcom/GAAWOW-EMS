/* GAAWOW EMS — Official Invoice & Payment Receipt module (v3)
   GaawowReceipt.invoice({...})   GaawowReceipt.payment({...})
   Names under the three signatures are filled automatically:
     1) Director        -> CONFIG.signerName (fixed)
     2) Finance Manager -> d.finance_manager_name
     3) Student / Payer -> d.payer_name || d.student_name
*/
(function () {
  "use strict";

  var CONFIG = {
    logo: "https://i.ibb.co/4ZCRpm30/gaawow-logo.png",
    academy: "GAAWOW ACADEMY",
    motto: "Ilayska Aqoonta iyo Xirfadda",
    address: "Burhakaba, Bay, Somalia",
    system: "Education Management & Verification System",
    signerName: "Dr. Osmaan Mohamed Ibraahin",
    signerTitle: "G-Director / Founder",
    // Sawirka saxiixa dhabta ah (PNG transparent) – ikhtiyaari:
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
    "@page{size:A4;margin:8mm}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:Arial,Helvetica,sans-serif;color:#17233d;background:#e9eef7;padding:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}",

    /* Official framed sheet */
    ".sheet{max-width:790px;margin:auto;background:#fff;position:relative;overflow:hidden;border:3px solid #0B1E63;outline:2px solid #D4AF37;outline-offset:-9px;box-shadow:0 10px 35px rgba(11,30,99,.18)}",
    ".sheet:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(11,30,99,.018) 0 2px,transparent 2px 10px);pointer-events:none}",
    ".corner{position:absolute;width:34px;height:34px;border:3px solid #D4AF37;z-index:3}",
    ".c1{top:14px;left:14px;border-right:0;border-bottom:0}.c2{top:14px;right:14px;border-left:0;border-bottom:0}",
    ".c3{bottom:14px;left:14px;border-right:0;border-top:0}.c4{bottom:14px;right:14px;border-left:0;border-top:0}",

    /* Logo watermark */
    ".wm{position:absolute;top:50%;left:50%;width:62%;max-width:460px;transform:translate(-50%,-50%);opacity:.08;pointer-events:none;z-index:0}",

    /* Header */
    ".head{position:relative;z-index:1;background:linear-gradient(115deg,#0B1E63 0%,#0B4DA2 100%);color:#fff;padding:22px 30px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px}",
    ".brand{display:flex;align-items:center;gap:14px}",
    ".brand img{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:50%;padding:5px;border:3px solid #D4AF37}",
    ".brand h1{font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:2px}",
    ".brand p{font-size:10px;opacity:.9;margin-top:3px;letter-spacing:.4px}",
    ".brand em{display:block;font-size:10px;color:#f3dc86;margin-top:3px;font-style:normal;font-weight:700;letter-spacing:.5px}",
    ".doc-tag{text-align:right}",
    ".doc-tag h2{font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#f3dc86;letter-spacing:2px;border-bottom:1px solid rgba(243,220,134,.6);padding-bottom:6px}",
    ".doc-tag div{font-size:11px;margin-top:6px}",
    ".goldbar{position:relative;z-index:1;height:6px;background:linear-gradient(90deg,#9a7a14,#D4AF37,#f7e7a1,#D4AF37,#9a7a14)}",

    /* Body */
    ".body{position:relative;z-index:1;padding:22px 34px 26px}",
    ".status-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap}",
    ".num{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px}",
    ".num b{display:block;font-family:Georgia,serif;font-size:19px;color:#0B1E63;margin-top:3px;letter-spacing:.5px}",
    ".badge{padding:7px 18px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;border:2px solid}",
    ".b-green{background:#dcf5e6;color:#126b39;border-color:#16834a}",
    ".b-orange{background:#fff2d8;color:#9a6100;border-color:#c47b12}",
    ".b-red{background:#ffe1e1;color:#a51d1d;border-color:#c62828}",
    ".b-blue{background:#e0efff;color:#1456a0;border-color:#0B4DA2}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}",
    ".box{border:1px solid #dfe5f0;border-top:3px solid #D4AF37;border-radius:6px;padding:12px 14px;background:rgba(250,251,254,.92)}",
    ".box h4{font-size:10px;color:#0B4DA2;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}",
    ".row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:4px 0;border-bottom:1px dashed #dfe5f0}",
    ".row:last-child{border-bottom:0}.row span{color:#64748b}.row b{color:#17233d;text-align:right;word-break:break-word}",
    "table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;background:rgba(255,255,255,.85)}",
    "th{background:#0B1E63;color:#fff;text-align:left;padding:10px;font-size:10px;letter-spacing:.8px;text-transform:uppercase}",
    "td{padding:11px 10px;border-bottom:1px solid #dfe5f0}",
    "td.r,th.r{text-align:right}",
    ".totals{margin-left:auto;width:295px;border:1px solid #dfe5f0;border-radius:6px;overflow:hidden;margin-bottom:18px;background:#fff}",
    ".totals div{display:flex;justify-content:space-between;padding:9px 13px;font-size:12px;border-bottom:1px solid #dfe5f0}",
    ".totals div.grand{background:linear-gradient(110deg,#0B1E63,#0B4DA2);color:#fff;font-size:14px;font-weight:800;border:0}",
    ".totals div.grand span{color:#f3dc86}",
    ".note{font-size:11px;color:#475569;background:#f7f4e8;border-left:4px solid #D4AF37;border-radius:4px;padding:10px 12px;margin-bottom:20px;line-height:1.6}",

    /* Gold stamp */
    ".stamp{position:absolute;right:42px;bottom:178px;width:132px;height:132px;transform:rotate(-14deg);z-index:4;filter:drop-shadow(0 2px 3px rgba(122,92,10,.35));opacity:.95}",

    /* Signatures */
    ".sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:8px;align-items:end}",
    ".sig{text-align:center;font-size:11px}",
    ".sig .area{height:64px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px}",
    ".sig .line{border-top:1.5px solid #0B1E63;padding-top:6px}",
    ".sig .nm{display:block;color:#0B1E63;font-size:12px;font-weight:700;min-height:15px}",
    ".sig .role{display:block;color:#0B4DA2;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}",
    ".sig .date{margin-top:5px;color:#64748b;font-size:10px}",
    ".autograph{font-family:'Segoe Script','Brush Script MT','Lucida Handwriting','Snell Roundhand',cursive;font-size:23px;color:#0B1E63;transform:rotate(-5deg);line-height:1;white-space:nowrap;position:relative;max-width:100%;overflow:hidden}",
    ".autograph:after{content:'';position:absolute;left:0;right:0;bottom:-6px;height:2px;background:#0B1E63;border-radius:50%;transform:rotate(1.5deg);opacity:.7}",
    ".sigimg{max-height:60px;max-width:100%}",

    /* Footer */
    ".foot{position:relative;z-index:1;border-top:4px solid #D4AF37;padding:12px 30px;background:#0B1E63;color:#fff;text-align:center;font-size:10px;line-height:1.7}",
    ".foot b{color:#f3dc86;letter-spacing:1.5px}",

    "@media(max-width:600px){.grid{grid-template-columns:1fr}.sigs{grid-template-columns:1fr;gap:26px}.head{flex-direction:column;align-items:flex-start}.doc-tag{text-align:left}.totals{width:100%}.stamp{width:96px;height:96px;right:18px;bottom:auto;top:230px}.body{padding:18px}.brand h1{font-size:19px}}",
    "@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;max-width:none}}"
  ].join("\n");

  function badgeClass(s) {
    s = String(s || "").toLowerCase();
    if (["paid", "successful", "approved", "issued"].indexOf(s) > -1) return "b-green";
    if (["failed", "rejected", "overdue", "cancelled"].indexOf(s) > -1) return "b-red";
    if (["partial", "in_review", "refunded"].indexOf(s) > -1) return "b-blue";
    return "b-orange";
  }

  /* Circular gold seal (SVG) */
  function stampSvg(line1, line2, pending) {
    var g1 = pending ? "#b9b9b9" : "#f7e7a1";
    var g2 = pending ? "#7d7d7d" : "#b8901a";
    var g3 = pending ? "#cfcfcf" : "#fff3b8";
    var ink = pending ? "#6b6b6b" : "#8a6a0c";
    return '<svg class="stamp" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + g3 + '"/><stop offset=".35" stop-color="' + g1 + '"/>' +
      '<stop offset=".7" stop-color="' + g2 + '"/><stop offset="1" stop-color="' + g1 + '"/></linearGradient>' +
      '<radialGradient id="gf" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fffdf0" stop-opacity=".95"/>' +
      '<stop offset="1" stop-color="' + g1 + '" stop-opacity=".35"/></radialGradient>' +
      '<path id="arcT" d="M30,100 a70,70 0 0,1 140,0"/>' +
      '<path id="arcB" d="M22,100 a78,78 0 0,0 156,0"/></defs>' +
      '<circle cx="100" cy="100" r="96" fill="url(#gf)" stroke="url(#gg)" stroke-width="6"/>' +
      '<circle cx="100" cy="100" r="88" fill="none" stroke="url(#gg)" stroke-width="1.6"/>' +
      '<circle cx="100" cy="100" r="58" fill="none" stroke="url(#gg)" stroke-width="3"/>' +
      '<circle cx="100" cy="100" r="53" fill="none" stroke="' + ink + '" stroke-width=".8" stroke-dasharray="2 3"/>' +
      '<text font-family="Georgia,serif" font-size="15" font-weight="700" fill="' + ink + '" letter-spacing="2.6">' +
      '<textPath href="#arcT" startOffset="50%" text-anchor="middle">GAAWOW ACADEMY</textPath></text>' +
      '<text font-family="Georgia,serif" font-size="12" font-weight="700" fill="' + ink + '" letter-spacing="2">' +
      '<textPath href="#arcB" startOffset="50%" text-anchor="middle">OFFICIAL &#9733; EMS</textPath></text>' +
      '<text x="100" y="75" text-anchor="middle" font-size="12" fill="' + ink + '">&#9733; &#9733; &#9733;</text>' +
      '<text x="100" y="102" text-anchor="middle" font-family="Georgia,serif" font-size="' + (line1.length > 5 ? 21 : 29) + '" font-weight="900" fill="' + ink + '" letter-spacing="1.5">' + line1 + "</text>" +
      '<text x="100" y="121" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="' + ink + '" letter-spacing="1.5">' + line2 + "</text>" +
      "</svg>";
  }

  function autograph(name) {
    return name ? '<span class="autograph">' + esc(name) + "</span>" : "";
  }

  function sigBlock(role, name, signed, mark) {
    return '<div class="sig"><div class="area">' + (signed ? mark : "") + "</div>" +
      '<div class="line"><span class="nm">' + esc(name || "") + '</span><span class="role">' + esc(role) + "</span></div>" +
      '<div class="date">Date: ____ / ____ / ______</div></div>';
  }

  function directorMark() {
    return CONFIG.signatureImage
      ? '<img class="sigimg" src="' + esc(CONFIG.signatureImage) + '" alt="Signature">'
      : autograph(CONFIG.signatureText);
  }

  /* signed = true when the document is official/approved */
  function signatures(d, signed, payerRole) {
    var finName = pick(d, "finance_manager_name", "finance_manager");
    var payer = pick(d, "payer_name", "student_name", "student");
    return '<div class="sigs">' +
      sigBlock(CONFIG.signerTitle, CONFIG.signerName, signed, directorMark()) +
      sigBlock("Finance Manager", finName, signed && !!finName, autograph(finName)) +
      sigBlock(payerRole, payer, false, "") +
      "</div>";
  }

  function wrap(kind, number, dateStr, inner, sigHtml, stampHtml) {
    var title = kind === "invoice" ? "OFFICIAL INVOICE" : "OFFICIAL PAYMENT RECEIPT";
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" + title + " " + esc(number) + "</title><style>" + CSS + "</style></head><body>" +
      '<div class="sheet">' +
      '<span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>' +
      '<img class="wm" src="' + CONFIG.logo + '" alt="">' +
      '<div class="head"><div class="brand"><img src="' + CONFIG.logo + '" alt="Logo"><div><h1>' +
      CONFIG.academy + "</h1><p>" + CONFIG.system + "</p><em>" + CONFIG.motto + " &bull; " + esc(CONFIG.address) +
      "</em></div></div>" +
      '<div class="doc-tag"><h2>' + title + "</h2><div>No: <b>" + esc(number) + "</b></div><div>Date: " +
      fdate(dateStr) + "</div></div></div><div class=\"goldbar\"></div>" +
      '<div class="body">' + inner + stampHtml + sigHtml + "</div>" +
      '<div class="foot"><b>' + CONFIG.academy + "</b> &nbsp;|&nbsp; " + CONFIG.motto + " &nbsp;|&nbsp; " + esc(CONFIG.address) +
      "<br>This document is generated by GAAWOW EMS and is valid only with the official stamp and authorised signatures." +
      "</div></div></body></html>";
  }

  function invoiceHtml(d) {
    var cur = pick(d, "currency") || "USD";
    var amount = Number(pick(d, "amount", "total_amount", "total") || 0);
    var paid = Number(pick(d, "paid", "paid_amount", "amount_paid") || 0);
    var balance = d.balance !== undefined && d.balance !== "" ? Number(d.balance) : amount - paid;
    var status = pick(d, "status") || (balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid");
    var number = pick(d, "invoice_number", "number", "invoice_no", "id");
    var fullyPaid = balance <= 0;
    var cancelled = String(status).toLowerCase() === "cancelled";

    var inner =
      '<div class="status-row"><div class="num">Invoice Number<b>' + esc(number) + "</b></div>" +
      '<span class="badge ' + badgeClass(status) + '">' + esc(String(status).replace("_", " ")) + "</span></div>" +
      '<div class="grid"><div class="box"><h4>Billed To</h4>' +
      '<div class="row"><span>Student</span><b>' + esc(pick(d, "student_name", "student")) + "</b></div>" +
      '<div class="row"><span>Student ID</span><b>' + esc(pick(d, "student_id_number", "student_code") || "—") + "</b></div>" +
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

    var stamp = cancelled ? "" :
      fullyPaid ? stampSvg("PAID", "IN FULL", false) : stampSvg("ISSUED", "UNPAID", true);

    return wrap("invoice", number, pick(d, "issue_date", "created_at", "date"), inner,
      signatures(d, !cancelled, "Student / Parent"), stamp);
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
      '<div class="row"><span>Payer Phone / Account</span><b>' + esc(pick(d, "payer_phone", "phone") || "—") + "</b></div></div>" +
      '<div class="box"><h4>Payment Details</h4>' +
      '<div class="row"><span>Payment Ref.</span><b>' + esc(pick(d, "payment_reference", "reference")) + "</b></div>" +
      '<div class="row"><span>Method</span><b>' + esc(pick(d, "payment_method", "method")) + "</b></div>" +
      '<div class="row"><span>Transaction Ref.</span><b>' + esc(pick(d, "transaction_reference", "transaction_ref") || "—") + "</b></div>" +
      '<div class="row"><span>Payment Date</span><b>' + fdate(pick(d, "payment_date", "date", "created_at")) + "</b></div>" +
      '<div class="row"><span>Invoice No.</span><b>' + esc(pick(d, "invoice_number", "invoice")) + "</b></div>" +
      '<div class="row"><span>Reviewed By</span><b>' + esc(pick(d, "reviewed_by") || "—") + "</b></div></div></div>" +
      '<table><thead><tr><th style="width:40px">#</th><th>Description</th><th class="r">Amount Received</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>' + esc(pick(d, "description", "notes") || "Payment received") + '</td><td class="r">' + money(amount, cur) + "</td></tr></tbody></table>" +
      '<div class="totals"><div class="grand"><span>Total Received</span><b>' + money(amount, cur) + "</b></div></div>" +
      '<div class="note">' + (ok
        ? "<b>Xaqiijin:</b> Lacagtan waa la helay, waana la ansixiyey. Rasiidkani waa caddeyn rasmi ah oo lacag-bixinta ah."
        : "<b>Digniin:</b> Bixintan weli waa la dib-eegayaa. Rasiidka rasmiga ah waxaa la siinayaa kaddib ansixinta.") + "</div>";

    var stamp = ok ? stampSvg("PAID", "RECEIVED", false) : stampSvg("PENDING", "REVIEW", true);

    return wrap("payment", number, pick(d, "payment_date", "date", "created_at"), inner,
      signatures(d, ok, "Payer / Student"), stamp);
  }

  function ensureModal() {
    var m = document.getElementById("gwReceiptModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "gwReceiptModal";
    m.style.cssText = "position:fixed;inset:0;z-index:5000;background:rgba(4,13,39,.75);display:none;flex-direction:column;padding:10px";
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
