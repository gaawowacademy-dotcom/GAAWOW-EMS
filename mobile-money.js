const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let payments = [];
let students = [];
let institutions = [];
let invoices = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("full_name, role, institution_id, is_active")
        .eq("id", currentUser.id)
        .single();

    if (profileError) throw profileError;

    if (
      !profile ||
      profile.role !== "super_admin" ||
      profile.is_active !== true
    ) {
      alert("Access denied. Super Admin only.");
      window.location.href = "index.html";
      return;
    }

    await loadInstitutions();
    await loadAllStudents();
    await loadAllInvoices();
    await loadPayments();

    setDefaultPaidAt();

  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  }
}


/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const { data, error } =
    await supabaseClient
      .from("institutions")
      .select("id, name")
      .order("name");

  if (error) throw error;

  institutions = data || [];

  const select = document.getElementById("institution");

  select.innerHTML =
    '<option value="">Select Institution</option>';

  institutions.forEach(inst => {

    const option = document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    select.appendChild(option);
  });

  select.addEventListener("change", async () => {

    await loadStudentsByInstitution(select.value);
    await loadInvoicesByInstitution(select.value);

  });
}


/* =========================
   STUDENTS
========================= */

async function loadAllStudents() {

  const { data, error } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        institution_id,
        student_id,
        full_name,
        email
      `)
      .order("full_name");

  if (error) throw error;

  students = data || [];
}


async function loadStudentsByInstitution(institutionId) {

  const studentSelect =
    document.getElementById("student");

  studentSelect.innerHTML =
    '<option value="">Select Student</option>';

  if (!institutionId) return;

  const filtered =
    students.filter(
      s => s.institution_id === institutionId
    );

  filtered.forEach(student => {

    const option =
      document.createElement("option");

    option.value = student.id;

    option.textContent =
      `${student.full_name} (${student.student_id || "No ID"})`;

    studentSelect.appendChild(option);
  });
}


/* =========================
   INVOICES
========================= */

async function loadAllInvoices() {

  const { data, error } =
    await supabaseClient
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
        status
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) throw error;

  invoices = data || [];
}


async function loadInvoicesByInstitution(institutionId) {

  const invoiceSelect =
    document.getElementById("invoice");

  invoiceSelect.innerHTML =
    '<option value="">No Invoice</option>';

  if (!institutionId) return;

  const filtered =
    invoices.filter(
      inv => inv.institution_id === institutionId
    );

  filtered.forEach(invoice => {

    const option =
      document.createElement("option");

    option.value = invoice.id;

    option.textContent =
      `${invoice.invoice_number} — ${formatMoney(invoice.amount)}`;

    invoiceSelect.appendChild(option);
  });
}


/* =========================
   PAYMENTS
========================= */

async function loadPayments() {

  const { data, error } =
    await supabaseClient
      .from("payments")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) throw error;

  payments = data || [];

  renderPayments();
  updateStats();
}


/* =========================
   SAVE PAYMENT
========================= */

async function savePayment() {

  try {

    const paymentId =
      document.getElementById("paymentId").value;

    const institutionId =
      document.getElementById("institution").value;

    const studentId =
      document.getElementById("student").value;

    const invoiceId =
      document.getElementById("invoice").value || null;

    const paymentMethod =
      document.getElementById("paymentMethod").value;

    const provider =
      document.getElementById("provider").value.trim();

    const amount =
      Number(document.getElementById("amount").value);

    const currency =
      document.getElementById("currency").value;

    const payerPhone =
      document.getElementById("payerPhone").value.trim();

    const transactionReference =
      document
        .getElementById("transactionReference")
        .value
        .trim();

    const providerTransactionId =
      document
        .getElementById("providerTransactionId")
        .value
        .trim();

    const status =
      document.getElementById("status").value;

    const paidAtInput =
      document.getElementById("paidAt").value;

    const metadataText =
      document.getElementById("metadata").value.trim();

    if (!institutionId) {
      alert("Please select an institution.");
      return;
    }

    if (!studentId) {
      alert("Please select a student.");
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    let metadata = {};

    if (metadataText) {
      metadata = {
        notes: metadataText
      };
    }

    const payload = {

      institution_id: institutionId,

      invoice_id: invoiceId,

      student_id: studentId,

      amount: amount,

      currency: currency,

      payment_method: paymentMethod,

      provider: provider || null,

      provider_transaction_id:
        providerTransactionId || null,

      transaction_reference:
        transactionReference || null,

      payer_phone:
        payerPhone || null,

      status: status,

      paid_at:
        paidAtInput
          ? new Date(paidAtInput).toISOString()
          : null,

      metadata: metadata
    };


    if (paymentId) {

      const { error } =
        await supabaseClient
          .from("payments")
          .update(payload)
          .eq("id", paymentId);

      if (error) throw error;

      showMessage(
        "Payment updated successfully.",
        "success"
      );

    } else {

      const { error } =
        await supabaseClient
          .from("payments")
          .insert([payload]);

      if (error) throw error;

      showMessage(
        "Payment saved successfully.",
        "success"
      );
    }


    resetForm();

    await loadPayments();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================
   RENDER
========================= */

function renderPayments() {

  const body =
    document.getElementById("paymentsBody");

  const search =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase()
      .trim();

  const method =
    document.getElementById("filterMethod").value;

  const status =
    document.getElementById("filterStatus").value;


  let filtered = payments.filter(payment => {

    const student =
      students.find(
        s => s.id === payment.student_id
      );

    const studentName =
      student?.full_name || "";

    const studentId =
      student?.student_id || "";

    const text =
      [
        studentName,
        studentId,
        payment.payment_method,
        payment.provider,
        payment.payer_phone,
        payment.transaction_reference,
        payment.provider_transaction_id
      ]
      .join(" ")
      .toLowerCase();


    const searchMatch =
      !search || text.includes(search);

    const methodMatch =
      !method ||
      payment.payment_method === method;

    const statusMatch =
      !status ||
      payment.status === status;


    return (
      searchMatch &&
      methodMatch &&
      statusMatch
    );
  });


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="10" class="loading">
          No payments found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML = filtered.map(payment => {

    const student =
      students.find(
        s => s.id === payment.student_id
      );

    const studentName =
      student?.full_name || "Unknown Student";


    const statusClass =
      payment.status || "pending";


    return `
      <tr>

        <td>
          ${formatDate(payment.created_at)}
        </td>

        <td>
          <strong>${escapeHtml(studentName)}</strong>
        </td>

        <td>
          <span class="method">
            ${escapeHtml(payment.payment_method || "-")}
          </span>
        </td>

        <td>
          ${escapeHtml(payment.provider || "-")}
        </td>

        <td>
          <strong>
            ${formatMoney(payment.amount)}
          </strong>
        </td>

        <td>
          ${escapeHtml(payment.currency || "-")}
        </td>

        <td>
          ${escapeHtml(payment.payer_phone || "-")}
        </td>

        <td>
          ${escapeHtml(
            payment.transaction_reference || "-"
          )}
        </td>

        <td>
          <span class="badge ${statusClass}">
            ${escapeHtml(payment.status || "-")}
          </span>
        </td>

        <td>

          <button
            class="action-btn edit-btn"
            onclick="editPayment('${payment.id}')">
            Edit
          </button>

          <button
            class="action-btn delete-btn"
            onclick="deletePayment('${payment.id}')">
            Delete
          </button>

        </td>

      </tr>
    `;

  }).join("");
}


/* =========================
   EDIT
========================= */

async function editPayment(id) {

  const payment =
    payments.find(p => p.id === id);

  if (!payment) return;


  document.getElementById("paymentId").value =
    payment.id;

  document.getElementById("institution").value =
    payment.institution_id;


  await loadStudentsByInstitution(
    payment.institution_id
  );

  await loadInvoicesByInstitution(
    payment.institution_id
  );


  document.getElementById("student").value =
    payment.student_id || "";

  document.getElementById("invoice").value =
    payment.invoice_id || "";

  document.getElementById("paymentMethod").value =
    payment.payment_method || "";

  document.getElementById("provider").value =
    payment.provider || "";

  document.getElementById("amount").value =
    payment.amount || "";

  document.getElementById("currency").value =
    payment.currency || "USD";

  document.getElementById("payerPhone").value =
    payment.payer_phone || "";

  document.getElementById("transactionReference").value =
    payment.transaction_reference || "";

  document.getElementById("providerTransactionId").value =
    payment.provider_transaction_id || "";

  document.getElementById("status").value =
    payment.status || "pending";


  if (payment.paid_at) {

    const date =
      new Date(payment.paid_at);

    const local =
      new Date(
        date.getTime() -
        date.getTimezoneOffset() * 60000
      )
      .toISOString()
      .slice(0, 16);

    document.getElementById("paidAt").value =
      local;
  }


  document.getElementById("metadata").value =
    payment.metadata?.notes || "";


  document.getElementById("formTitle").textContent =
    "Edit Payment";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   DELETE
========================= */

async function deletePayment(id) {

  const payment =
    payments.find(p => p.id === id);

  if (!payment) return;


  const confirmed =
    confirm(
      `Delete this payment of ${payment.amount} ${payment.currency}?`
    );

  if (!confirmed) return;


  try {

    const { error } =
      await supabaseClient
        .from("payments")
        .delete()
        .eq("id", id);

    if (error) throw error;


    showMessage(
      "Payment deleted successfully.",
      "success"
    );

    await loadPayments();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================
   RESET
========================= */

function resetForm() {

  document.getElementById("paymentId").value = "";

  document.getElementById("institution").value = "";

  document.getElementById("student").innerHTML =
    '<option value="">Select Student</option>';

  document.getElementById("invoice").innerHTML =
    '<option value="">No Invoice</option>';

  document.getElementById("paymentMethod").value = "";

  document.getElementById("provider").value = "";

  document.getElementById("amount").value = "";

  document.getElementById("currency").value = "USD";

  document.getElementById("payerPhone").value = "";

  document.getElementById("transactionReference").value = "";

  document.getElementById("providerTransactionId").value = "";

  document.getElementById("status").value = "pending";

  document.getElementById("metadata").value = "";

  setDefaultPaidAt();

  document.getElementById("formTitle").textContent =
    "Add Payment";
}


function setDefaultPaidAt() {

  const now = new Date();

  const local =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() * 60000
    )
    .toISOString()
    .slice(0, 16);

  document.getElementById("paidAt").value =
    local;
}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    payments.length;

  const successful =
    payments.filter(
      p => p.status === "successful"
    );

  const pending =
    payments.filter(
      p => p.status === "pending"
    );


  const successfulAmount =
    successful.reduce(
      (sum, p) =>
        sum + Number(p.amount || 0),
      0
    );


  document.getElementById(
    "totalPayments"
  ).textContent = total;


  document.getElementById(
    "successfulPayments"
  ).textContent = successful.length;


  document.getElementById(
    "pendingPayments"
  ).textContent = pending.length;


  document.getElementById(
    "successfulAmount"
  ).textContent =
    formatMoney(successfulAmount);
}


/* =========================
   HELPERS
========================= */

function formatMoney(value) {

  const number =
    Number(value || 0);

  return number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}


function formatDate(value) {

  if (!value) return "-";

  const date = new Date(value);

  return date.toLocaleDateString(
    "en-GB",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function showMessage(message, type) {

  const box =
    document.getElementById("message");

  box.textContent = message;

  box.className =
    "message " +
    (type === "success"
      ? "success-message"
      : "error-message");

  box.style.display = "block";


  setTimeout(() => {
    box.style.display = "none";
  }, 5000);
}


function goBack() {
  window.location.href = "super-admin.html";
}
