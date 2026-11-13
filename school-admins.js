
"use strict";

(() => {
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);

  const LOGO_URL = "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

  const S = {
    user: null,
    profile: null,
    inst: [],
    students: [],
    invoices: [],
    payments: [],
    editingPayment: null,
    tab: "invPanel"
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const cash = (n, cur = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur
      }).format(Number(n || 0));
    } catch {
      return Number(n || 0).toFixed(2) + " " + cur;
    }
  };

  const fmtDate = v => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  function msg(message, kind = "success") {
    const e = $("alertBox");
    if (!e) return;

    e.textContent = message;
    e.className = "alert show " +
      (kind === "err" ? "error" : kind);

    window.scrollTo({ top: 0, behavior: "smooth" });

    clearTimeout(msg.timer);
    msg.timer = setTimeout(() => {
      e.classList.remove("show");
    }, 8500);
  }

  function fill(id, rows, val, label, first = "Choose...") {
    const e = $(id);
    if (!e) return;

    const old = e.value;
    e.innerHTML = "";

    if (first !== null) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = first;
      e.append(o);
    }

    rows.forEach(r => {
      const o = document.createElement("option");
      o.value = val(r);
      o.textContent = label(r);
      e.append(o);
    });

    if ([...e.options].some(o => o.value === old)) {
      e.value = old;
    }
  }

  function student(id) {
    return S.students.find(x => x.id === id);
  }

  function invoice(id) {
    return S.invoices.find(x => x.id === id);
  }

  function payment(id) {
    return S.payments.find(x => x.id === id);
  }

  function studentLabel(id) {
    const s = student(id);
    return s
      ? `${s.full_name} (${s.student_id})`
      : "Unknown student";
  }

  function meta(p) {
    return p?.metadata && typeof p.metadata === "object"
      ? p.metadata
      : {};
  }

  function role() {
    return S.profile?.role || "";
  }

  function isSuperAdmin() {
    return role() === "super_admin";
  }

  function isInstitutionUser() {
    return role() === "school_admin";
  }

  function institutionAllowed(id) {
    return isSuperAdmin() ||
      id === S.profile?.institution_id;
  }

  function statusBadge(status) {
    const s = String(status || "pending").toLowerCase();

    return `<span class="status ${esc(s)}">${esc(s)}</span>`;
  }

  function balance(i) {
    return Math.max(
      Number(i.amount || 0) - Number(i.paid_amount || 0),
      0
    );
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async function auth() {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      msg("Fadlan marka hore ka gal GAAWOW EMS login-kaaga.", "err");
      return false;
    }

    S.user = data.session.user;

    const r = await db
      .from("profiles")
      .select("id,institution_id,full_name,role,is_active")
      .eq("id", S.user.id)
      .maybeSingle();

    if (r.error) throw r.error;

    S.profile = r.data;

    const allowed = [
      "super_admin",
      "school_admin"
    ];

    if (
      !S.profile ||
      !S.profile.is_active ||
      !allowed.includes(S.profile.role)
    ) {
      msg("Access denied: Ma lihid oggolaanshaha Financial Management.", "err");
      return false;
    }

    if (
      isInstitutionUser() &&
      !S.profile.institution_id
    ) {
      msg("Account-kan looma qoondeyn machad.", "err");
      return false;
    }

    return true;
  }

  // ==========================================
  // INSTITUTIONS
  // ==========================================

  async function loadInstitutions() {
    let q = db
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name")
      .limit(1000);

    if (isInstitutionUser()) {
      q = q.eq("id", S.profile.institution_id);
    }

    const { data, error } = await q;

    if (error) throw error;

    S.inst = (data || []).filter(x => x.is_active !== false);

    fill(
      "filterInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`,
      "All Institutions"
    );

    fill(
      "invInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`
    );

    fill(
      "payInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`,
      "All Institutions"
    );

    fill(
      "payFormInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`
    );

    if (isInstitutionUser()) {
      [
        "filterInst",
        "invInst",
        "payInst",
        "payFormInst"
      ].forEach(id => {
        if ($(id)) {
          $(id).value = S.profile.institution_id;
          $(id).disabled = true;
        }
      });
    }
  }

  // ==========================================
  // STUDENTS
  // ==========================================

  async function loadStudents() {
    let q = db
      .from("students")
      .select("id,institution_id,student_id,full_name,status")
      .order("full_name")
      .limit(3000);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    }

    const { data, error } = await q;

    if (error) throw error;

    S.students = data || [];

    studentOptions();
  }

  function studentOptions() {
    const invInst = $("invInst")?.value || "";
    const payInst = $("payFormInst")?.value || "";

    fill(
      "invStudent",
      S.students.filter(s =>
        !invInst || s.institution_id === invInst
      ),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`,
      "Select student"
    );

    fill(
      "payStudent",
      S.students.filter(s =>
        !payInst || s.institution_id === payInst
      ),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`,
      "Select student"
    );

    invoiceOptions();
  }

  // ==========================================
  // INVOICE OPTIONS FOR PAYMENTS
  // ==========================================

  function invoiceOptions() {
    const st = $("payStudent")?.value;
    const inst = $("payFormInst")?.value;

    const rows = S.invoices.filter(i =>
      i.institution_id === inst &&
      (!st || i.student_id === st) &&
      balance(i) > 0 &&
      String(i.status).toLowerCase() !== "cancelled"
    );

    fill(
      "payInvoice",
      rows,
      i => i.id,
      i => `${i.invoice_number} • ${cash(i.amount)} • Balance: ${cash(balance(i))}`,
      "No invoice linked"
    );
  }

  // ==========================================
  // LOAD INVOICES
  // ==========================================

  async function loadInvoices() {
    let q = db
      .from("invoices")
      .select(`
        id,
        institution_id,
        student_id,
        invoice_number,
        description,
        amount,
        paid_amount,
        due_date,
        status,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(1500);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    } else if ($("filterInst").value) {
      q = q.eq("institution_id", $("filterInst").value);
    }

    const { data, error } = await q;

    if (error) throw error;

    S.invoices = data || [];
  }

  // ==========================================
  // LOAD PAYMENTS
  // ==========================================

  async function loadPayments() {
    let q = db
      .from("payments")
      .select(`
        id,
        institution_id,
        invoice_id,
        student_id,
        amount,
        currency,
        payment_method,
        transaction_reference,
        provider_transaction_id,
        payer_phone,
        status,
        paid_at,
        created_at,
        payment_reference,
        receipt_number,
        metadata
      `)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    } else if ($("payInst").value) {
      q = q.eq("institution_id", $("payInst").value);
    }

    const { data, error } = await q;

    if (error) throw error;

    S.payments = data || [];
  }

  // ==========================================
  // SEARCH
  // ==========================================

  function matches(text, query) {
    return !query ||
      String(text || "").toLowerCase().includes(query);
  }

  // ==========================================
  // RENDER INVOICES
  // ==========================================

  function renderInvoices() {
    const query = $("invoiceSearch").value
      .trim()
      .toLowerCase();

    const rows = S.invoices.filter(i =>
      matches([
        i.invoice_number,
        studentLabel(i.student_id),
        i.description,
        i.status
      ].join(" "), query)
    );

    $("invoiceTable").innerHTML = rows.length
      ? rows.map(i => `
        <tr>
          <td><b>${esc(i.invoice_number || "Pending number")}</b></td>
          <td>${esc(studentLabel(i.student_id))}</td>
          <td>${esc(i.description || "—")}</td>
          <td>${cash(i.amount)}</td>
          <td>${cash(i.paid_amount)}</td>
          <td><b>${cash(balance(i))}</b></td>
          <td>${esc(i.due_date || "—")}</td>
          <td>${statusBadge(i.status)}</td>
          <td>
            <button class="btn-blue btn-small"
              data-invoice-print="${esc(i.id)}">
              View / Print
            </button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="9" class="empty">No invoices found.</td></tr>`;
  }

  // ==========================================
  // RENDER PAYMENTS
  // ==========================================

  function renderPayments() {
    const query = $("paymentSearch").value
      .trim()
      .toLowerCase();

    const status = $("paymentStatusFilter").value;

    const rows = S.payments.filter(p => {
      const m = meta(p);

      const searchText = [
        p.payment_reference,
        p.receipt_number,
        studentLabel(p.student_id),
        p.payment_method,
        p.status,
        p.transaction_reference,
        p.provider_transaction_id,
        m.provider,
        m.sender_account
      ].join(" ");

      return matches(searchText, query) &&
        (!status || String(p.status).toLowerCase() === status);
    });

    $("paymentTable").innerHTML = rows.length
      ? rows.map(p => {
        const official =
          String(p.status).toLowerCase() === "successful" &&
          !!p.receipt_number;

        const pending =
          String(p.status).toLowerCase() === "pending";

        return `
          <tr>
            <td><b>${esc(p.payment_reference || p.id)}</b></td>
            <td>${esc(studentLabel(p.student_id))}</td>
            <td>${cash(p.amount, p.currency || "USD")}</td>
            <td>${esc(p.payment_method || "—")}</td>
            <td>${esc(p.transaction_reference || "—")}</td>
            <td>${esc(fmtDate(p.paid_at || p.created_at))}</td>
            <td>${statusBadge(p.status)}</td>
            <td>
              ${pending ? `
                <button class="btn-green btn-small"
                  data-review="${esc(p.id)}">
                  Review
                </button>
              ` : ""}

              <button class="btn-blue btn-small"
                data-print="${esc(p.id)}">
                ${official ? "Official Receipt" : "View Record"}
              </button>
            </td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="8" class="empty">No payments found.</td></tr>`;
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  function renderStats() {
    const valid = S.invoices.filter(i =>
      String(i.status).toLowerCase() !== "cancelled"
    );

    const received = S.payments.filter(p =>
      String(p.status).toLowerCase() === "successful"
    );

    const pending = S.payments.filter(p =>
      String(p.status).toLowerCase() === "pending"
    );

    const totalBalance = valid.reduce(
      (sum, i) => sum + balance(i),
      0
    );

    const totalUSD = received
      .filter(p => (p.currency || "USD") === "USD")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalSOS = received
      .filter(p => p.currency === "SOS")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    $("statInvoices").textContent = S.invoices.length;

    $("statReceived").textContent =
      cash(totalUSD, "USD") +
      (totalSOS > 0 ? " | " + cash(totalSOS, "SOS") : "");

    $("statPending").textContent = pending.length;

    $("statBalance").textContent = cash(totalBalance, "USD");
  }

  function render() {
    renderInvoices();
    renderPayments();
    renderStats();

    document.querySelectorAll("[data-invoice-print]").forEach(b => {
      b.onclick = () => printInvoice(b.dataset.invoicePrint);
    });

    document.querySelectorAll("[data-print]").forEach(b => {
      b.onclick = () => printReceipt(b.dataset.print);
    });

    document.querySelectorAll("[data-review]").forEach(b => {
      b.onclick = () => openReview(b.dataset.review);
    });

    invoiceOptions();
  }

  async function reload() {
    await loadInvoices();
    await loadPayments();
    render();
  }

  // ==========================================
  // FORM DISPLAY
  // ==========================================

  function hideForms() {
    [
      "invoiceFormWrap",
      "paymentFormWrap"
    ].forEach(id => {
      $(id).classList.add("hidden");
    });

    $("reviewModal").classList.remove("show");
  }

  function openInvoiceForm() {
    hideForms();
    $("invoiceFormWrap").classList.remove("hidden");
    studentOptions();
    $("invoiceFormWrap").scrollIntoView({ behavior: "smooth" });
  }

  function openPaymentForm() {
    hideForms();
    $("paymentFormWrap").classList.remove("hidden");

    $("payDate").value = new Date().toISOString().slice(0, 10);

    studentOptions();
    $("paymentFormWrap").scrollIntoView({ behavior: "smooth" });
  }

  // ==========================================
  // CREATE INVOICE
  // ==========================================

  async function saveInvoice(event) {
    event.preventDefault();

    const institution_id = $("invInst").value;
    const student_id = $("invStudent").value;
    const description = $("invDescription").value.trim();
    const amount = Number($("invAmount").value);
    const due_date = $("invDueDate").value || null;

    const st = student(student_id);

    if (
      !institution_id ||
      !institutionAllowed(institution_id) ||
      !st ||
      st.institution_id !== institution_id ||
      !description ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return msg("Hubi machadka, ardayga, sharaxaadda iyo lacagta.", "err");
    }

    const btn = $("saveInvoiceBtn");
    btn.disabled = true;

    try {
      const { data, error } = await db
        .from("invoices")
        .insert({
          institution_id,
          student_id,
          description,
          amount,
          paid_amount: 0,
          due_date,
          status: "unpaid"
        })
        .select("id,invoice_number")
        .single();

      if (error) throw error;

      $("invoiceForm").reset();
      hideForms();

      await reload();

      msg(
        "Invoice waa la sameeyay. Number: " +
        (data?.invoice_number || "Database assigned")
      );

    } catch (e) {
      console.error(e);
      msg("Invoice lama kaydin: " + e.message, "err");
    } finally {
      btn.disabled = false;
    }
  }

  // ==========================================
  // CREATE PENDING PAYMENT
  // ==========================================

  async function savePayment(event) {
    event.preventDefault();

    const institution_id = $("payFormInst").value;
    const student_id = $("payStudent").value;
    const invoice_id = $("payInvoice").value || null;

    const amount = Number($("payAmount").value);
    const currency = $("payCurrency").value;
    const payment_method = $("payMethod").value;

    const transaction_reference =
      $("payReference").value.trim() || null;

    const payer_phone =
      $("payerPhone").value.trim() || null;

    const provider =
      $("payProvider").value.trim() || null;

    const sender_account =
      $("senderAccount").value.trim() || null;

    const receiver_account =
      $("receiverAccount").value.trim() || null;

    const payment_date = $("payDate").value || null;
    const notes = $("payNotes").value.trim() || null;

    const st = student(student_id);
    const iv = invoice(invoice_id);

    if (
      !institution_id ||
      !institutionAllowed(institution_id) ||
      !st ||
      st.institution_id !== institution_id ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !payment_method
    ) {
      return msg("Fadlan hubi machadka, ardayga, lacagta iyo payment method.", "err");
    }

    if (
      invoice_id &&
      (
        !iv ||
        iv.student_id !== student_id ||
        iv.institution_id !== institution_id
      )
    ) {
      return msg("Invoice-ka waa inuu la mid yahay ardayga iyo machadka.", "err");
    }

    // Invoice amounts in this HTML/database setup are USD.
    // Prevent applying SOS amounts directly to USD invoice balances.
    if (invoice_id && currency !== "USD") {
      return msg(
        "Invoice-ka hadda USD ayuu ku salaysan yahay. SOS payment ku diiwaangeli adigoon invoice ku xirin.",
        "err"
      );
    }

    if (invoice_id && amount > balance(iv) + 0.001) {
      if (!confirm("Lacagtu waxay ka badan tahay balance-ka invoice-ka. Ma sii wadaysaa?")) {
        return;
      }
    }

    if (transaction_reference) {
      const duplicate = S.payments.some(p =>
        String(
          p.transaction_reference ||
          p.provider_transaction_id ||
          ""
        ).trim().toLowerCase() ===
        transaction_reference.toLowerCase() &&
        String(p.status).toLowerCase() !== "failed"
      );

      if (duplicate) {
        return msg("Transaction reference-kan horay ayuu u diiwaangashan yahay.", "err");
      }
    }

    const metadata = {
      source: "GAAWOW EMS Financial Management",
      provider,
      sender_account,
      receiver_account,
      payment_date,
      notes,
      manually_verified: false,
      recorded_by: S.user.id,
      recorded_by_name: S.profile.full_name || "Financial Administrator",
      recorded_at: new Date().toISOString()
    };

    const payload = {
      institution_id,
      student_id,
      invoice_id,
      amount,
      currency,
      payment_method,
      status: "pending",
      payer_phone,
      transaction_reference,
      paid_at: null,
      metadata
    };

    const btn = $("savePaymentBtn");
    btn.disabled = true;

    try {
      const { data, error } = await db
        .from("payments")
        .insert(payload)
        .select("id,payment_reference,status")
        .single();

      if (error) throw error;

      $("paymentForm").reset();
      $("payDate").value = new Date().toISOString().slice(0, 10);

      hideForms();

      await reload();
      setTab("payPanel");

      msg(
        "Payment waxaa loo kaydiyay PENDING. Reference: " +
        (data.payment_reference || data.id) +
        ". Ansixin ayaa loo baahan yahay."
      );

    } catch (e) {
      console.error(e);
      msg("Payment lama kaydin: " + e.message, "err");
    } finally {
      btn.disabled = false;
    }
  }

  // ==========================================
  // REVIEW PAYMENT
  // ==========================================

  function openReview(id) {
    const p = payment(id);

    if (!p) {
      return msg("Payment lama helin.", "err");
    }

    if (String(p.status).toLowerCase() !== "pending") {
      return msg("Kaliya payment pending ah ayaa la review-gareyn karaa.", "err");
    }

    const m = meta(p);

    S.editingPayment = id;

    $("reviewPaymentInfo").innerHTML = `
      <b>Payment Reference:</b> ${esc(p.payment_reference || p.id)}<br>
      <b>Student:</b> ${esc(studentLabel(p.student_id))}<br>
      <b>Amount:</b> ${cash(p.amount, p.currency || "USD")}<br>
      <b>Method:</b> ${esc(p.payment_method || "—")}<br>
      <b>Provider:</b> ${esc(m.provider || "—")}<br>
      <b>Sender:</b> ${esc(m.sender_account || p.payer_phone || "—")}<br>
      <b>Receiver:</b> ${esc(m.receiver_account || "—")}<br>
      <b>Transaction:</b> ${esc(p.transaction_reference || "—")}<br>
      <b>Date:</b> ${esc(fmtDate(p.created_at))}
    `;

    $("reviewStatus").value = "";
    $("reviewNote").value = "";

    $("reviewModal").classList.add("show");
  }

  async function saveReview(event) {
    event.preventDefault();

    const p = payment(S.editingPayment);

    if (!p || String(p.status).toLowerCase() !== "pending") {
      return msg("Payment-kan hadda pending ma aha. Refresh samee.", "err");
    }

    const status = $("reviewStatus").value;
    const review_note = $("reviewNote").value.trim();

    if (!["successful", "failed", "cancelled"].includes(status)) {
      return msg("Dooro go'aan sax ah.", "err");
    }

    if (
      status === "successful" &&
      !confirm(
        "Ma xaqiijisay in lacagta dhabta ah lagu helay account-ka GAAWOW Academy?"
      )
    ) {
      return;
    }

    if (
      status !== "successful" &&
      !review_note &&
      !confirm("Review note lama gelin. Ma sii wadaysaa?")
    ) {
      return;
    }

    const btn = $("saveReviewBtn");
    btn.disabled = true;

    try {
      // Protected Edge Function handles approval,
      // receipt issuance and payment status changes.

      const { data, error } = await db.functions.invoke(
        "review-payment",
        {
          body: {
            payment_id: p.id,
            status,
            review_note
          }
        }
      );

      if (error) throw error;

      if (!data || data.success !== true) {
        throw new Error(
          data?.message || "Payment review was not completed."
        );
      }

      if (status === "successful") {
        if (data.official_receipt_issued) {
          msg(
            "Payment waa la ansixiyay. Official Receipt: " +
            (data.payment?.receipt_number || "Issued")
          );
        } else {
          msg(
            "Payment waa la ansixiyay laakiin receipt number lama soo celin. Fadlan xaqiiji database-ka.",
            "err"
          );
        }
      } else {
        msg("Payment review waa la dhammeeyay: " + status);
      }

      $("reviewModal").classList.remove("show");
      S.editingPayment = null;

      await reload();

    } catch (e) {
      console.error("Payment review error:", e);
      msg("Payment review failed: " + e.message, "err");
    } finally {
      btn.disabled = false;
    }
  }

  // ==========================================
  // PRINT INVOICE
  // ==========================================

  function printInvoice(id) {
    const i = invoice(id);

    if (!i) return msg("Invoice lama helin.", "err");

    const s = student(i.student_id);
    const inst = S.inst.find(x => x.id === i.institution_id);

    const amount = Number(i.amount || 0);
    const paid = Number(i.paid_amount || 0);
    const remaining = balance(i);

    const w = window.open("", "_blank", "width=900,height=950");

    if (!w) {
      return msg("Fadlan oggolow pop-ups si invoice loo daabaco.", "err");
    }

    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${esc(i.invoice_number)}</title>
        <style>
          *{box-sizing:border-box}
          body{font:15px Arial;padding:35px;color:#172554;background:#fff}
          header{background:#0B1E63;color:white;padding:22px;border-bottom:5px solid #D4AF37;display:flex;align-items:center;gap:18px}
          header img{width:76px;height:76px;object-fit:contain;background:white;border-radius:10px;padding:5px}
          table{width:100%;border-collapse:collapse;margin-top:24px}
          td{padding:12px;border:1px solid #ddd}
          .amount{font-size:22px;font-weight:bold}
          footer{margin-top:50px;display:flex;justify-content:space-between}
          @media print{body{padding:12mm}}
        </style>
      </head>
      <body>
        <header>
          <img src="${esc(LOGO_URL)}">
          <div>
            <h1>GAAWOW ACADEMY</h1>
            ILAYSKA AQOONTA IYO XIRFADDA<br>
            Burhakaba, Bay, Somalia<br>
            <b>OFFICIAL INVOICE</b>
          </div>
        </header>

        <h2>${esc(i.invoice_number || "INVOICE")}</h2>

        <p>
          <b>Institution:</b> ${esc(inst?.name || "—")}<br>
          <b>Student:</b> ${esc(s?.full_name || "—")}<br>
          <b>Student ID:</b> ${esc(s?.student_id || "—")}<br>
          <b>Issue date:</b> ${esc(i.created_at ? new Date(i.created_at).toLocaleDateString() : "—")}
        </p>

        <table>
          <tr><td>Description</td><td>${esc(i.description || "Education fees")}</td></tr>
          <tr><td>Invoice amount</td><td>${cash(amount)}</td></tr>
          <tr><td>Paid amount</td><td>${cash(paid)}</td></tr>
          <tr><td>Outstanding balance</td><td class="amount">${cash(remaining)}</td></tr>
          <tr><td>Status</td><td>${esc(i.status)}</td></tr>
          <tr><td>Due date</td><td>${esc(i.due_date || "—")}</td></tr>
        </table>

        <footer>
          <div>Issued by GAAWOW EMS</div>
          <div>Authorized signature:<br><br><b>Dr Osmaan Gaawow</b></div>
        </footer>

        <script>window.onload=()=>window.print()<\/script>
      </body>
      </html>
    `);

    w.document.close();
  }

  // ==========================================
  // PRINT PAYMENT / OFFICIAL RECEIPT
  // ==========================================

  function printReceipt(id) {
    const p = payment(id);

    if (!p) return msg("Payment lama helin.", "err");

    const successful =
      String(p.status).toLowerCase() === "successful";

    if (successful && !p.receipt_number) {
      return msg(
        "Payment waa successful laakiin receipt number ma laha. Marka hore database-ka xaqiiji.",
        "err"
      );
    }

    const official = successful && !!p.receipt_number;

    const m = meta(p);
    const s = student(p.student_id);
    const i = invoice(p.invoice_id);
    const inst = S.inst.find(x => x.id === p.institution_id);

    const documentNumber = official
      ? p.receipt_number
      : "NOT ISSUED";

    const w = window.open("", "_blank", "width=900,height=950");

    if (!w) {
      return msg("Fadlan oggolow pop-ups si document-ka loo daabaco.", "err");
    }

    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${official ? "Official Receipt" : "Payment Record"}</title>
        <style>
          *{box-sizing:border-box}
          body{font:14px Arial;color:#172554;padding:30px;background:white}
          .receipt{max-width:760px;margin:auto;border:2px solid #0B1E63;padding:28px}
          .head{background:linear-gradient(110deg,#0B1E63,#0B4DA2);color:white;padding:20px;border-bottom:5px solid #D4AF37;display:flex;align-items:center;gap:16px}
          .logo{width:78px;height:78px;object-fit:contain;background:white;border-radius:10px;padding:5px}
          .brand{flex:1}
          h1{margin:0}
          .stamp{border:2px solid ${official ? "#15803d" : "#b45309"};color:${official ? "#15803d" : "#b45309"};padding:8px;font-weight:bold;display:inline-block;margin-bottom:8px}
          table{width:100%;border-collapse:collapse;margin-top:20px}
          td{padding:11px;border-bottom:1px solid #ddd}
          .amount{font-size:21px;font-weight:bold;color:#0B1E63}
          .foot{display:flex;justify-content:space-between;gap:25px;margin-top:45px}
          .note{background:#fff7dd;border:1px solid #f3df9b;padding:12px;margin-top:15px;line-height:1.5}
          @media print{body{padding:12mm}}
        </style>
      </head>
      <body>
        <div class="receipt">

          <div class="head">
            <img class="logo" src="${esc(LOGO_URL)}">
            <div class="brand">
              <div class="stamp">
                ${official ? "PAYMENT CONFIRMED" : "NOT AN OFFICIAL RECEIPT"}
              </div>
              <h1>GAAWOW ACADEMY</h1>
              ILAYSKA AQOONTA IYO XIRFADDA<br>
              Burhakaba, Bay, Somalia
            </div>
          </div>

          <h2>${official ? "OFFICIAL PAYMENT RECEIPT" : "PAYMENT RECORD"}</h2>

          <table>
            <tr><td>Receipt Number</td><td><b>${esc(documentNumber)}</b></td></tr>
            <tr><td>Payment Reference</td><td>${esc(p.payment_reference || p.id)}</td></tr>
            <tr><td>Institution</td><td>${esc(inst?.name || "—")}</td></tr>
            <tr><td>Student</td><td>${esc(s?.full_name || "—")}</td></tr>
            <tr><td>Student ID</td><td>${esc(s?.student_id || "—")}</td></tr>
            <tr><td>Invoice</td><td>${esc(i?.invoice_number || "No invoice linked")}</td></tr>
            <tr><td>Provider</td><td>${esc(m.provider || "—")}</td></tr>
            <tr><td>Payment method</td><td>${esc(p.payment_method || "—")}</td></tr>
            <tr><td>Sender account</td><td>${esc(m.sender_account || p.payer_phone || "—")}</td></tr>
            <tr><td>Receiver account</td><td>${esc(m.receiver_account || "—")}</td></tr>
            <tr><td>Transaction reference</td><td>${esc(p.transaction_reference || "—")}</td></tr>
            <tr><td>Payment date</td><td>${esc(fmtDate(p.paid_at || p.created_at))}</td></tr>
            <tr><td>Amount</td><td class="amount">${cash(p.amount, p.currency || "USD")}</td></tr>
            <tr><td>Status</td><td><b>${esc(String(p.status).toUpperCase())}</b></td></tr>
            <tr><td>Reviewed by</td><td>${esc(m.reviewed_by_name || "—")}</td></tr>
            <tr><td>Review note</td><td>${esc(m.review_note || "—")}</td></tr>
          </table>

          ${official ? "" : `
            <div class="note">
              This document is a payment record only. It is not proof of successful receipt.
              An official receipt requires authorized payment approval.
            </div>
          `}

          <div class="foot">
            <div>Issued by GAAWOW EMS<br>Keep this document for your records.</div>
            <div>Authorized signature:<br><br><b>Dr Osmaan Gaawow</b></div>
          </div>

        </div>

        <script>window.onload=()=>window.print()<\/script>
      </body>
      </html>
    `);

    w.document.close();
  }

  // ==========================================
  // TABS
  // ==========================================

  function setTab(id) {
    S.tab = id;

    ["invPanel", "payPanel"].forEach(x => {
      $(x).classList.toggle("active", x === id);
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === id);
    });
  }

  // ==========================================
  // EVENTS
  // ==========================================

  function events() {

    $("backDashboard").onclick = () => {
      location.href = "dashboard.html";
    };

    $("logout").onclick = async () => {
      if (!confirm("Ma hubtaa inaad ka baxayso GAAWOW EMS?")) return;

      const { error } = await db.auth.signOut();

      if (error) {
        msg(error.message, "err");
        return;
      }

      location.href = "index.html";
    };

    $("newInvoiceBtn").onclick = openInvoiceForm;
    $("newPaymentBtn").onclick = openPaymentForm;

    $("closeInvoiceForm").onclick = hideForms;
    $("cancelInvoiceBtn").onclick = hideForms;

    $("closePaymentForm").onclick = hideForms;
    $("cancelPaymentBtn").onclick = hideForms;

    $("invoiceForm").addEventListener("submit", saveInvoice);
    $("paymentForm").addEventListener("submit", savePayment);
    $("reviewForm").addEventListener("submit", saveReview);

    $("closeReviewModal").onclick = () => {
      $("reviewModal").classList.remove("show");
      S.editingPayment = null;
    };

    $("cancelReviewBtn").onclick = () => {
      $("reviewModal").classList.remove("show");
      S.editingPayment = null;
    };

    $("reviewModal").addEventListener("click", e => {
      if (e.target === $("reviewModal")) {
        $("reviewModal").classList.remove("show");
        S.editingPayment = null;
      }
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.onclick = () => setTab(b.dataset.tab);
    });

    $("invoiceSearch").oninput = renderInvoices;
    $("paymentSearch").oninput = renderPayments;

    $("paymentStatusFilter").onchange = renderPayments;

    $("filterInst").onchange = async () => {
      try {
        await loadInvoices();
        renderInvoices();
      } catch (e) {
        msg(e.message, "err");
      }
    };

    $("payInst").onchange = async () => {
      try {
        await loadPayments();
        renderPayments();
        renderStats();
      } catch (e) {
        msg(e.message, "err");
      }
    };

    ["invInst", "payFormInst"].forEach(id => {
      $(id).onchange = studentOptions;
    });

    $("payStudent").onchange = invoiceOptions;

    $("refreshInvoices").onclick = async () => {
      const btn = $("refreshInvoices");
      btn.disabled = true;

      try {
        await loadStudents();
        await loadInvoices();
        renderInvoices();
        renderStats();
        msg("Invoices waa la cusbooneysiiyay.");
      } catch (e) {
        msg(e.message, "err");
      } finally {
        btn.disabled = false;
      }
    };

    $("refreshPayments").onclick = async () => {
      const btn = $("refreshPayments");
      btn.disabled = true;

      try {
        await loadStudents();
        await loadInvoices();
        await loadPayments();
        render();
        msg("Payments waa la cusbooneysiiyay.");
      } catch (e) {
        msg(e.message, "err");
      } finally {
        btn.disabled = false;
      }
    };
  }

  // ==========================================
  // INITIALIZE
  // ==========================================

  async function init() {
    events();

    try {
      const authenticated = await auth();

      if (!authenticated) return;

      await loadInstitutions();
      await loadStudents();
      await loadInvoices();
      await loadPayments();

      render();

      const requested = sessionStorage.getItem("gaawowFinanceTab");

      setTab(
        location.hash.toLowerCase().includes("payment") ||
        requested === "payPanel"
          ? "payPanel"
          : "invPanel"
      );

      sessionStorage.removeItem("gaawowFinanceTab");

      msg("GAAWOW EMS Financial Management is connected.");

    } catch (e) {
      console.error("Financial Management initialization:", e);

      msg(
        "Portal setup error: " + e.message,
        "err"
      );
    }
  }

  init();

})();
