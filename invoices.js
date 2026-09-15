const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const { createClient } =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let invoices = [];
let institutions = [];
let students = [];
let editingId = null;


/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();
    await loadInstitutions();
    await loadInvoices();

    setupEvents();

  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  }
}


/* =========================
   AUTH
========================= */

async function checkSuperAdmin() {

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, institution_id, is_active")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    throw new Error(
      "Profile could not be loaded: " + error.message
    );
  }

  if (
    data.role !== "super_admin" ||
    data.is_active !== true
  ) {
    alert("Access denied. Super Admin only.");
    location.href = "index.html";
    return;
  }
}


/* =========================
   EVENTS
========================= */

function setupEvents() {

  document
    .getElementById("institution_id")
    .addEventListener("change", async function () {
      await loadStudents(this.value);
    });

  document
    .getElementById("invoiceForm")
    .addEventListener("submit", saveInvoice);

  document
    .getElementById("search")
    .addEventListener("input", renderInvoices);

  document
    .getElementById("filterStatus")
    .addEventListener("change", renderInvoices);

  document
    .getElementById("filterInstitution")
    .addEventListener("change", renderInvoices);

  document
    .getElementById("amount")
    .addEventListener("input", autoStatus);

  document
    .getElementById("paid_amount")
    .addEventListener("input", autoStatus);
}


/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const { data, error } = await supabase
    .from("institutions")
    .select("id, name")
    .order("name");

  if (error) {
    throw error;
  }

  institutions = data || [];

  const select =
    document.getElementById("institution_id");

  const filter =
    document.getElementById("filterInstitution");

  select.innerHTML =
    `<option value="">Select institution</option>`;

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  institutions.forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    select.appendChild(option);

    const filterOption =
      document.createElement("option");

    filterOption.value = inst.id;
    filterOption.textContent = inst.name;

    filter.appendChild(filterOption);
  });
}


/* =========================
   STUDENTS
========================= */

async function loadStudents(institutionId) {

  const select =
    document.getElementById("student_id");

  select.innerHTML =
    `<option value="">Select student</option>`;

  select.disabled = true;

  if (!institutionId) {
    return;
  }

  const { data, error } = await supabase
    .from("students")
    .select(
      "id, institution_id, student_id, full_name, status"
    )
    .eq("institution_id", institutionId)
    .order("full_name");

  if (error) {
    showMessage(
      "Could not load students: " + error.message,
      "error"
    );
    return;
  }

  students = data || [];

  students.forEach(student => {

    const option =
      document.createElement("option");

    option.value = student.id;

    option.textContent =
      `${student.full_name} — ${student.student_id}`;

    select.appendChild(option);
  });

  select.disabled = false;
}


/* =========================
   LOAD INVOICES
========================= */

async function loadInvoices() {

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  invoices = data || [];

  await loadInvoiceStudents();

  renderInvoices();
  updateStats();
}


/* =========================
   LOAD STUDENTS FOR INVOICES
========================= */

async function loadInvoiceStudents() {

  const { data, error } = await supabase
    .from("students")
    .select(
      "id, institution_id, student_id, full_name, status"
    )
    .order("full_name");

  if (error) {
    throw error;
  }

  students = data || [];
}


/* =========================
   SAVE
========================= */

async function saveInvoice(event) {

  event.preventDefault();

  const institutionId =
    document.getElementById("institution_id").value;

  const studentId =
    document.getElementById("student_id").value;

  const invoiceNumber =
    document.getElementById("invoice_number").value.trim();

  const description =
    document.getElementById("description").value.trim();

  const amount =
    Number(document.getElementById("amount").value);

  const paidAmount =
    Number(document.getElementById("paid_amount").value);

  const dueDate =
    document.getElementById("due_date").value || null;

  let status =
    document.getElementById("status").value;

  if (!institutionId) {
    showMessage(
      "Please select an institution.",
      "error"
    );
    return;
  }

  if (!studentId) {
    showMessage(
      "Please select a student.",
      "error"
    );
    return;
  }

  if (!invoiceNumber) {
    showMessage(
      "Invoice number is required.",
      "error"
    );
    return;
  }

  if (amount < 0 || paidAmount < 0) {
    showMessage(
      "Amount cannot be negative.",
      "error"
    );
    return;
  }

  if (paidAmount > amount) {
    showMessage(
      "Paid amount cannot be greater than invoice amount.",
      "error"
    );
    return;
  }

  status = calculateStatus(
    amount,
    paidAmount,
    status,
    dueDate
  );

  const payload = {
    institution_id: institutionId,
    student_id: studentId,
    invoice_number: invoiceNumber,
    description: description || null,
    amount: amount,
    paid_amount: paidAmount,
    due_date: dueDate,
    status: status
  };

  try {

    if (editingId) {

      const { error } = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        throw error;
      }

      showMessage(
        "Invoice updated successfully.",
        "success"
      );

    } else {

      const { error } = await supabase
        .from("invoices")
        .insert(payload);

      if (error) {
        throw error;
      }

      showMessage(
        "Invoice created successfully.",
        "success"
      );
    }

    resetForm();

    await loadInvoices();

  } catch (error) {

    console.error(error);

    showMessage(
      "Failed to save invoice: " +
      error.message,
      "error"
    );
  }
}


/* =========================
   STATUS
========================= */

function calculateStatus(
  amount,
  paidAmount,
  selectedStatus,
  dueDate
) {

  if (selectedStatus === "cancelled") {
    return "cancelled";
  }

  if (amount > 0 && paidAmount >= amount) {
    return "paid";
  }

  if (paidAmount > 0 && paidAmount < amount) {
    return "partial";
  }

  if (
    dueDate &&
    new Date(dueDate + "T23:59:59") < new Date()
  ) {
    return "overdue";
  }

  return "unpaid";
}


function autoStatus() {

  const amount =
    Number(document.getElementById("amount").value);

  const paid =
    Number(document.getElementById("paid_amount").value);

  const dueDate =
    document.getElementById("due_date").value;

  if (!amount) {
    return;
  }

  const status =
    document.getElementById("status");

  if (paid >= amount) {
    status.value = "paid";
  } else if (paid > 0) {
    status.value = "partial";
  } else if (
    dueDate &&
    new Date(dueDate + "T23:59:59") < new Date()
  ) {
    status.value = "overdue";
  } else {
    status.value = "unpaid";
  }
}


/* =========================
   RENDER
========================= */

function renderInvoices() {

  const tbody =
    document.getElementById("invoiceTableBody");

  const search =
    document.getElementById("search")
      .value
      .toLowerCase()
      .trim();

  const statusFilter =
    document.getElementById("filterStatus").value;

  const institutionFilter =
    document.getElementById("filterInstitution").value;

  const filtered =
    invoices.filter(invoice => {

      const student =
        students.find(
          s => s.id === invoice.student_id
        );

      const institution =
        institutions.find(
          i => i.id === invoice.institution_id
        );

      const studentName =
        student?.full_name || "";

      const studentCode =
        student?.student_id || "";

      const institutionName =
        institution?.name || "";

      const matchesSearch =
        !search ||
        invoice.invoice_number
          .toLowerCase()
          .includes(search) ||
        studentName
          .toLowerCase()
          .includes(search) ||
        studentCode
          .toLowerCase()
          .includes(search) ||
        institutionName
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !statusFilter ||
        invoice.status === statusFilter;

      const matchesInstitution =
        !institutionFilter ||
        invoice.institution_id === institutionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesInstitution
      );
    });

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          No invoices found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered.map(invoice => {

      const student =
        students.find(
          s => s.id === invoice.student_id
        );

      const institution =
        institutions.find(
          i => i.id === invoice.institution_id
        );

      const amount =
        Number(invoice.amount || 0);

      const paid =
        Number(invoice.paid_amount || 0);

      const balance =
        Math.max(amount - paid, 0);

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(invoice.invoice_number)}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              institution?.name || "Unknown"
            )}
          </td>

          <td>
            ${escapeHtml(
              student?.full_name || "Unknown"
            )}
            <br>
            <small>
              ${escapeHtml(
                student?.student_id || ""
              )}
            </small>
          </td>

          <td>
            $${amount.toFixed(2)}
          </td>

          <td>
            $${paid.toFixed(2)}
          </td>

          <td>
            <strong>
              $${balance.toFixed(2)}
            </strong>
          </td>

          <td>
            ${invoice.due_date || "-"}
          </td>

          <td>
            <span class="badge ${invoice.status}">
              ${invoice.status}
            </span>
          </td>

          <td>

            <button
              class="action-btn edit"
              onclick="editInvoice('${invoice.id}')"
            >
              Edit
            </button>

            <button
              class="action-btn delete"
              onclick="deleteInvoice('${invoice.id}')"
            >
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

async function editInvoice(id) {

  const invoice =
    invoices.find(i => i.id === id);

  if (!invoice) {
    return;
  }

  editingId = id;

  showForm();

  document.getElementById("formTitle").textContent =
    "Edit Invoice";

  document.getElementById("institution_id").value =
    invoice.institution_id;

  await loadStudents(invoice.institution_id);

  document.getElementById("student_id").value =
    invoice.student_id;

  document.getElementById("invoice_number").value =
    invoice.invoice_number;

  document.getElementById("description").value =
    invoice.description || "";

  document.getElementById("amount").value =
    invoice.amount;

  document.getElementById("paid_amount").value =
    invoice.paid_amount;

  document.getElementById("due_date").value =
    invoice.due_date || "";

  document.getElementById("status").value =
    invoice.status;
}


/* =========================
   DELETE
========================= */

async function deleteInvoice(id) {

  const invoice =
    invoices.find(i => i.id === id);

  if (!invoice) {
    return;
  }

  const confirmed =
    confirm(
      `Delete invoice "${invoice.invoice_number}"?`
    );

  if (!confirmed) {
    return;
  }

  try {

    const { data: payments, error: paymentError } =
      await supabase
        .from("payments")
        .select("id")
        .eq("invoice_id", id)
        .limit(1);

    if (paymentError) {
      throw paymentError;
    }

    if (payments && payments.length > 0) {

      showMessage(
        "This invoice has payment records and cannot be deleted.",
        "error"
      );

      return;
    }

    const { error } =
      await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showMessage(
      "Invoice deleted successfully.",
      "success"
    );

    await loadInvoices();

  } catch (error) {

    console.error(error);

    showMessage(
      "Delete failed: " + error.message,
      "error"
    );
  }
}


/* =========================
   FORM
========================= */

function showForm() {

  document.getElementById("formCard")
    .style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function hideForm() {

  resetForm();

  document.getElementById("formCard")
    .style.display = "none";
}


function resetForm() {

  editingId = null;

  document.getElementById("invoiceForm").reset();

  document.getElementById("formTitle").textContent =
    "Create Invoice";

  document.getElementById("student_id").innerHTML =
    `<option value="">Select student</option>`;

  document.getElementById("student_id").disabled =
    true;

  document.getElementById("paid_amount").value =
    "0";

  document.getElementById("status").value =
    "unpaid";
}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    invoices.length;

  const unpaid =
    invoices.filter(
      i => i.status === "unpaid"
    ).length;

  const partial =
    invoices.filter(
      i => i.status === "partial"
    ).length;

  const paid =
    invoices.filter(
      i => i.status === "paid"
    ).length;

  const outstanding =
    invoices.reduce(
      (sum, invoice) => {

        if (invoice.status === "cancelled") {
          return sum;
        }

        const amount =
          Number(invoice.amount || 0);

        const paidAmount =
          Number(invoice.paid_amount || 0);

        return sum +
          Math.max(amount - paidAmount, 0);

      },
      0
    );

  document.getElementById("totalInvoices")
    .textContent = total;

  document.getElementById("unpaidInvoices")
    .textContent = unpaid;

  document.getElementById("partialInvoices")
    .textContent = partial;

  document.getElementById("paidInvoices")
    .textContent = paid;

  document.getElementById("outstandingAmount")
    .textContent =
      "$" + outstanding.toFixed(2);
}


/* =========================
   MESSAGE
========================= */

function showMessage(text, type) {

  const box =
    document.getElementById("message");

  box.textContent = text;

  box.className =
    "message " + type;

  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 5000);
}


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
