const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let institutions = [];
let students = [];
let invoices = [];
let editingId = null;


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();

    /*
      IMPORTANT:
      Load institutions FIRST.
      Then invoices.
    */
    await loadInstitutions();

    await loadAllStudents();

    await loadInvoices();

    setupEvents();

  } catch (error) {

    console.error("INIT ERROR:", error);

    showMessage(
      "System error: " + error.message,
      "error"
    );
  }
}


/* =====================================================
   SUPER ADMIN CHECK
===================================================== */

async function checkSuperAdmin() {

  const { data, error } = await supabaseClient
    .from("profiles")
    .select(
      "id, full_name, role, institution_id, is_active"
    )
    .eq("id", currentUser.id)
    .single();

  if (error) {
    throw new Error(
      "Profile could not be loaded: " +
      error.message
    );
  }

  if (
    data.role !== "super_admin" ||
    data.is_active !== true
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href = "index.html";
    return;
  }
}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

  const institutionSelect =
    document.getElementById("institution_id");

  const form =
    document.getElementById("invoiceForm");

  const search =
    document.getElementById("search");

  const statusFilter =
    document.getElementById("filterStatus");

  const institutionFilter =
    document.getElementById("filterInstitution");

  const amount =
    document.getElementById("amount");

  const paidAmount =
    document.getElementById("paid_amount");

  if (institutionSelect) {

    institutionSelect.addEventListener(
      "change",
      async function () {

        await loadStudents(this.value);

      }
    );
  }

  if (form) {
    form.addEventListener(
      "submit",
      saveInvoice
    );
  }

  if (search) {
    search.addEventListener(
      "input",
      renderInvoices
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener(
      "change",
      renderInvoices
    );
  }

  if (institutionFilter) {
    institutionFilter.addEventListener(
      "change",
      renderInvoices
    );
  }

  if (amount) {
    amount.addEventListener(
      "input",
      autoStatus
    );
  }

  if (paidAmount) {
    paidAmount.addEventListener(
      "input",
      autoStatus
    );
  }
}


/* =====================================================
   LOAD INSTITUTIONS
===================================================== */

async function loadInstitutions() {

  console.log(
    "Loading institutions..."
  );

  const select =
    document.getElementById(
      "institution_id"
    );

  const filter =
    document.getElementById(
      "filterInstitution"
    );

  if (!select) {

    console.error(
      "institution_id not found"
    );

    return;
  }

  select.innerHTML =
    `<option value="">
      Loading institutions...
    </option>`;

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("institutions")
      .select("id, name")
      .order("name", {
        ascending: true
      });

    console.log(
      "Institutions:",
      data
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      institutions = [];

      select.innerHTML =
        `<option value="">
          No institutions found
        </option>`;

      if (filter) {

        filter.innerHTML =
          `<option value="">
            No institutions found
          </option>`;
      }

      return;
    }

    institutions = data;

    /* Form dropdown */

    select.innerHTML =
      `<option value="">
        Select institution
      </option>`;

    /* Filter dropdown */

    if (filter) {

      filter.innerHTML =
        `<option value="">
          All Institutions
        </option>`;
    }

    data.forEach(function (institution) {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        institution.id;

      option.textContent =
        institution.name;

      select.appendChild(
        option
      );


      if (filter) {

        const filterOption =
          document.createElement(
            "option"
          );

        filterOption.value =
          institution.id;

        filterOption.textContent =
          institution.name;

        filter.appendChild(
          filterOption
        );
      }

    });

    console.log(
      "Institutions loaded:",
      institutions.length
    );

  } catch (error) {

    console.error(
      "Institution loading error:",
      error
    );

    select.innerHTML =
      `<option value="">
        Error loading institutions
      </option>`;

    if (filter) {

      filter.innerHTML =
        `<option value="">
          Error loading institutions
        </option>`;
    }

    showMessage(
      "Failed to load institutions: " +
      error.message,
      "error"
    );
  }
}


/* =====================================================
   LOAD ALL STUDENTS
===================================================== */

async function loadAllStudents() {

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("students")
      .select(
        "id, institution_id, student_id, full_name, status"
      )
      .order("full_name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    students = data || [];

    console.log(
      "Students loaded:",
      students.length
    );

  } catch (error) {

    console.error(
      "Students loading error:",
      error
    );

    students = [];

    showMessage(
      "Failed to load students: " +
      error.message,
      "error"
    );
  }
}


/* =====================================================
   LOAD STUDENTS BY INSTITUTION
===================================================== */

async function loadStudents(
  institutionId
) {

  const select =
    document.getElementById(
      "student_id"
    );

  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">
      Loading students...
    </option>`;

  select.disabled = true;

  if (!institutionId) {

    select.innerHTML =
      `<option value="">
        Select student
      </option>`;

    return;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("students")
      .select(
        "id, institution_id, student_id, full_name, status"
      )
      .eq(
        "institution_id",
        institutionId
      )
      .order("full_name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      select.innerHTML =
        `<option value="">
          No students found
        </option>`;

      return;
    }

    select.innerHTML =
      `<option value="">
        Select student
      </option>`;

    data.forEach(function (student) {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        student.id;

      option.textContent =
        student.full_name +
        " — " +
        student.student_id;

      select.appendChild(
        option
      );
    });

    select.disabled = false;

  } catch (error) {

    console.error(
      "Students error:",
      error
    );

    select.innerHTML =
      `<option value="">
        Error loading students
      </option>`;

    showMessage(
      "Failed to load students: " +
      error.message,
      "error"
    );
  }
}


/* =====================================================
   LOAD INVOICES
===================================================== */

async function loadInvoices() {

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("invoices")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    invoices = data || [];

    renderInvoices();

    updateStats();

    console.log(
      "Invoices loaded:",
      invoices.length
    );

  } catch (error) {

    console.error(
      "Invoice loading error:",
      error
    );

    invoices = [];

    showMessage(
      "Failed to load invoices: " +
      error.message,
      "error"
    );

    renderInvoices();

    updateStats();
  }
}


/* =====================================================
   SAVE INVOICE
===================================================== */

async function saveInvoice(event) {

  event.preventDefault();

  const institutionId =
    document.getElementById(
      "institution_id"
    ).value;

  const studentId =
    document.getElementById(
      "student_id"
    ).value;

  const invoiceNumber =
    document.getElementById(
      "invoice_number"
    ).value.trim();

  const description =
    document.getElementById(
      "description"
    ).value.trim();

  const amount =
    Number(
      document.getElementById(
        "amount"
      ).value
    );

  const paidAmount =
    Number(
      document.getElementById(
        "paid_amount"
      ).value
    );

  const dueDate =
    document.getElementById(
      "due_date"
    ).value || null;

  let status =
    document.getElementById(
      "status"
    ).value;


  /* Validation */

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

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    showMessage(
      "Please enter a valid amount.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(paidAmount) ||
    paidAmount < 0
  ) {

    showMessage(
      "Please enter a valid paid amount.",
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


  /* Automatic status */

  status =
    calculateStatus(
      amount,
      paidAmount,
      status,
      dueDate
    );


  const payload = {

    institution_id:
      institutionId,

    student_id:
      studentId,

    invoice_number:
      invoiceNumber,

    description:
      description || null,

    amount:
      amount,

    paid_amount:
      paidAmount,

    due_date:
      dueDate,

    status:
      status
  };


  try {

    if (editingId) {

      const {
        error
      } = await supabaseClient
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

      const {
        error
      } = await supabaseClient
        .from("invoices")
        .insert([payload]);

      if (error) {
        throw error;
      }

      showMessage(
        "Invoice created successfully.",
        "success"
      );
    }


    resetForm();

    hideForm();

    await loadInvoices();

  } catch (error) {

    console.error(
      "SAVE INVOICE ERROR:",
      error
    );

    showMessage(
      "Failed to save invoice: " +
      error.message,
      "error"
    );
  }
}


/* =====================================================
   CALCULATE STATUS
===================================================== */

function calculateStatus(
  amount,
  paidAmount,
  selectedStatus,
  dueDate
) {

  if (
    selectedStatus ===
    "cancelled"
  ) {
    return "cancelled";
  }

  if (
    amount > 0 &&
    paidAmount >= amount
  ) {
    return "paid";
  }

  if (
    paidAmount > 0 &&
    paidAmount < amount
  ) {
    return "partial";
  }

  if (
    dueDate &&
    new Date(
      dueDate + "T23:59:59"
    ) < new Date()
  ) {
    return "overdue";
  }

  return "unpaid";
}


/* =====================================================
   AUTO STATUS
===================================================== */

function autoStatus() {

  const amount =
    Number(
      document.getElementById(
        "amount"
      ).value
    );

  const paid =
    Number(
      document.getElementById(
        "paid_amount"
      ).value
    );

  const dueDate =
    document.getElementById(
      "due_date"
    ).value;

  const status =
    document.getElementById(
      "status"
    );

  if (!amount) {
    return;
  }

  if (paid >= amount) {

    status.value =
      "paid";

  } else if (paid > 0) {

    status.value =
      "partial";

  } else if (
    dueDate &&
    new Date(
      dueDate + "T23:59:59"
    ) < new Date()
  ) {

    status.value =
      "overdue";

  } else {

    status.value =
      "unpaid";
  }
}


/* =====================================================
   RENDER INVOICES
===================================================== */

function renderInvoices() {

  const tbody =
    document.getElementById(
      "invoiceTableBody"
    );

  if (!tbody) {
    return;
  }

  const search =
    (
      document.getElementById(
        "search"
      )?.value || ""
    )
      .toLowerCase()
      .trim();

  const statusFilter =
    document.getElementById(
      "filterStatus"
    )?.value || "";

  const institutionFilter =
    document.getElementById(
      "filterInstitution"
    )?.value || "";


  const filtered =
    invoices.filter(
      function (invoice) {

        const student =
          students.find(
            s =>
              s.id ===
              invoice.student_id
          );

        const institution =
          institutions.find(
            i =>
              i.id ===
              invoice.institution_id
          );

        const studentName =
          student?.full_name || "";

        const studentCode =
          student?.student_id || "";

        const institutionName =
          institution?.name || "";

        const invoiceNumber =
          invoice.invoice_number || "";


        const searchMatch =
          !search ||
          invoiceNumber
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


        const statusMatch =
          !statusFilter ||
          invoice.status ===
            statusFilter;


        const institutionMatch =
          !institutionFilter ||
          invoice.institution_id ===
            institutionFilter;


        return (
          searchMatch &&
          statusMatch &&
          institutionMatch
        );
      }
    );


  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="empty"
        >
          No invoices found.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    filtered.map(
      function (invoice) {

        const student =
          students.find(
            s =>
              s.id ===
              invoice.student_id
          );

        const institution =
          institutions.find(
            i =>
              i.id ===
              invoice.institution_id
          );


        const amount =
          Number(
            invoice.amount || 0
          );

        const paid =
          Number(
            invoice.paid_amount || 0
          );

        const balance =
          Math.max(
            amount - paid,
            0
          );


        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  invoice.invoice_number
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                institution?.name ||
                "Unknown"
              )}
            </td>

            <td>
              ${escapeHtml(
                student?.full_name ||
                "Unknown"
              )}

              <br>

              <small>
                ${escapeHtml(
                  student?.student_id ||
                  ""
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
              ${
                invoice.due_date ||
                "-"
              }
            </td>

            <td>
              <span
                class="badge ${invoice.status}"
              >
                ${escapeHtml(
                  invoice.status
                )}
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
      }
    ).join("");
}


/* =====================================================
   EDIT INVOICE
===================================================== */

async function editInvoice(id) {

  const invoice =
    invoices.find(
      i => i.id === id
    );

  if (!invoice) {
    return;
  }

  editingId = id;

  showForm();

  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Invoice";


  const institutionSelect =
    document.getElementById(
      "institution_id"
    );

  institutionSelect.value =
    invoice.institution_id;


  await loadStudents(
    invoice.institution_id
  );


  document.getElementById(
    "student_id"
  ).value =
    invoice.student_id;


  document.getElementById(
    "invoice_number"
  ).value =
    invoice.invoice_number;


  document.getElementById(
    "description"
  ).value =
    invoice.description || "";


  document.getElementById(
    "amount"
  ).value =
    invoice.amount;


  document.getElementById(
    "paid_amount"
  ).value =
    invoice.paid_amount;


  document.getElementById(
    "due_date"
  ).value =
    invoice.due_date || "";


  document.getElementById(
    "status"
  ).value =
    invoice.status;
}


/* =====================================================
   DELETE INVOICE
===================================================== */

async function deleteInvoice(id) {

  const invoice =
    invoices.find(
      i => i.id === id
    );

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

    /*
      Do not delete invoices
      that already have payments.
    */

    const {
      data: payments,
      error: paymentError
    } = await supabaseClient
      .from("payments")
      .select("id")
      .eq("invoice_id", id)
      .limit(1);


    if (paymentError) {
      throw paymentError;
    }


    if (
      payments &&
      payments.length > 0
    ) {

      showMessage(
        "This invoice has payment records and cannot be deleted.",
        "error"
      );

      return;
    }


    const {
      error
    } = await supabaseClient
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

    console.error(
      "DELETE INVOICE ERROR:",
      error
    );

    showMessage(
      "Delete failed: " +
      error.message,
      "error"
    );
  }
}


/* =====================================================
   FORM
===================================================== */

function showForm() {

  const formCard =
    document.getElementById(
      "formCard"
    );

  if (!formCard) {
    return;
  }

  formCard.style.display =
    "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function hideForm() {

  const formCard =
    document.getElementById(
      "formCard"
    );

  if (formCard) {
    formCard.style.display =
      "none";
  }
}


function resetForm() {

  editingId = null;

  const form =
    document.getElementById(
      "invoiceForm"
    );

  if (form) {
    form.reset();
  }


  const formTitle =
    document.getElementById(
      "formTitle"
    );

  if (formTitle) {

    formTitle.textContent =
      "Create Invoice";
  }


  const studentSelect =
    document.getElementById(
      "student_id"
    );

  if (studentSelect) {

    studentSelect.innerHTML =
      `<option value="">
        Select student
      </option>`;

    studentSelect.disabled =
      true;
  }


  const paidAmount =
    document.getElementById(
      "paid_amount"
    );

  if (paidAmount) {
    paidAmount.value = "0";
  }


  const status =
    document.getElementById(
      "status"
    );

  if (status) {
    status.value =
      "unpaid";
  }
}


/* =====================================================
   STATISTICS
===================================================== */

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
      function (sum, invoice) {

        if (
          invoice.status ===
          "cancelled"
        ) {
          return sum;
        }

        const amount =
          Number(
            invoice.amount || 0
          );

        const paidAmount =
          Number(
            invoice.paid_amount || 0
          );

        return (
          sum +
          Math.max(
            amount - paidAmount,
            0
          )
        );

      },
      0
    );


  const totalElement =
    document.getElementById(
      "totalInvoices"
    );

  const unpaidElement =
    document.getElementById(
      "unpaidInvoices"
    );

  const partialElement =
    document.getElementById(
      "partialInvoices"
    );

  const paidElement =
    document.getElementById(
      "paidInvoices"
    );

  const outstandingElement =
    document.getElementById(
      "outstandingAmount"
    );


  if (totalElement) {
    totalElement.textContent =
      total;
  }

  if (unpaidElement) {
    unpaidElement.textContent =
      unpaid;
  }

  if (partialElement) {
    partialElement.textContent =
      partial;
  }

  if (paidElement) {
    paidElement.textContent =
      paid;
  }

  if (outstandingElement) {
    outstandingElement.textContent =
      "$" +
      outstanding.toFixed(2);
  }
}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
  text,
  type
) {

  const box =
    document.getElementById(
      "message"
    );

  if (!box) {
    return;
  }

  box.textContent =
    text;

  box.className =
    "message " + type;

  box.style.display =
    "block";


  setTimeout(
    function () {

      box.style.display =
        "none";

    },
    5000
  );
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
