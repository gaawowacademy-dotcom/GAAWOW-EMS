
"use strict";

/* =========================================================
   GAAWOW EMS - FINANCE MANAGER DASHBOARD
   Read-only invoices and payments
   Institution-restricted access
   ========================================================= */

(() => {
  // 1. SUPABASE CONFIGURATION
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // 2. GLOBAL STATE
  let currentUser = null;
  let currentProfile = null;
  let currentInstitution = null;

  const PAGE_SIZE = 100;

  // 3. HELPERS
  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatMoney(amount, currency = "USD") {
    const number = Number(amount || 0);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2
      }).format(number);
    } catch {
      return `${number.toFixed(2)} ${currency || "USD"}`;
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function shortReference(value) {
    if (!value) return "—";
    return String(value).slice(0, 8).toUpperCase();
  }

  function statusClass(status) {
    const value = String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    return `status-${value}`;
  }

  function showMessage(id, message, type = "info") {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.dataset.type = type;
    el.style.display = "block";
  }

  function hideMessage(id) {
    const el = $(id);
    if (el) el.style.display = "none";
  }

  function showError(message) {
    console.error("[GAAWOW Finance]", message);
  }

  // 4. AUTHENTICATION AND PROFILE
  async function initializeDashboard() {
    try {
      if (!window.supabase) {
        throw new Error(
          "Supabase library lama helin. Hubi script-ka Supabase ee HTML."
        );
      }

      const {
        data: { session },
        error: sessionError
      } = await db.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        window.location.href = "index.html";
        return;
      }

      currentUser = session.user;

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id, full_name, role, is_active, institution_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (
        !profile ||
        profile.role !== "finance_manager" ||
        profile.is_active !== true ||
        !profile.institution_id
      ) {
        alert(
          "Access denied. Account-ka Finance Manager ma aha mid firfircoon ama machad looma qoondeyn."
        );

        await db.auth.signOut();
        window.location.href = "index.html";
        return;
      }

      currentProfile = profile;

      await loadInstitution();
      displayProfile();
      setupNavigation();
      setupLogout();

      await loadDashboardData();

    } catch (error) {
      console.error("Dashboard initialization error:", error);

      alert(
        "Dashboard lama furi karin. Hubi internet-ka iyo rukhsadaha account-ka."
      );
    }
  }

  // 5. LOAD ASSIGNED INSTITUTION
  async function loadInstitution() {
    const { data, error } = await db
      .from("institutions")
      .select("id, name, code")
      .eq("id", currentProfile.institution_id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Machadka Finance Manager-ka lama helin.");
    }

    currentInstitution = data;
  }

  // 6. DISPLAY PROFILE
  function displayProfile() {
    const name =
      currentProfile.full_name || "Finance Manager";

    const institution =
      currentInstitution?.name || "Assigned Institution";

    const profileNameIds = [
      "profileName",
      "financeManagerName",
      "userName",
      "managerName"
    ];

    const institutionNameIds = [
      "institutionName",
      "schoolName",
      "financeInstitution"
    ];

    profileNameIds.forEach((id) => setText(id, name));

    institutionNameIds.forEach((id) =>
      setText(id, institution)
    );

    setText("institutionCode", currentInstitution?.code || "—");
    setText("profileRole", "Finance Manager");
    setText("profileEmail", currentUser?.email || "—");
  }

  // 7. LOAD DASHBOARD DATA
  async function loadDashboardData() {
    await Promise.allSettled([
      loadInvoiceStatistics(),
      loadPaymentStatistics(),
      loadInvoiceRecords(),
      loadPaymentRecords()
    ]);

    // Graduation requests lama xisaabinayo ilaa schema
    // iyo columns-keeda si rasmi ah loo xaqiijiyo.
    setText("graduationRequests", "--");
  }

  // 8. INVOICE STATISTICS
  async function loadInvoiceStatistics() {
    try {
      const { count, error } = await db
        .from("invoices")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("institution_id", currentProfile.institution_id);

      if (error) throw error;

      setText("totalInvoices", count ?? 0);

    } catch (error) {
      showError("Invoice statistics: " + error.message);
      setText("totalInvoices", "—");
    }
  }

  // 9. PAYMENT STATISTICS
  async function loadPaymentStatistics() {
    try {
      const [successfulResult, pendingResult] =
        await Promise.all([
          db
            .from("payments")
            .select("id", {
              count: "exact",
              head: true
            })
            .eq("institution_id", currentProfile.institution_id)
            .eq("status", "successful"),

          db
            .from("payments")
            .select("id", {
              count: "exact",
              head: true
            })
            .eq("institution_id", currentProfile.institution_id)
            .eq("status", "pending")
        ]);

      if (successfulResult.error) {
        throw successfulResult.error;
      }

      if (pendingResult.error) {
        throw pendingResult.error;
      }

      setText(
        "verifiedPayments",
        successfulResult.count ?? 0
      );

      setText(
        "pendingPayments",
        pendingResult.count ?? 0
      );

    } catch (error) {
      showError("Payment statistics: " + error.message);
      setText("verifiedPayments", "—");
      setText("pendingPayments", "—");
    }
  }

  // 10. TABLE RENDERING HELPER
  function renderTable(tableId, headers, rows) {
    const table = $(tableId);

    if (!table) {
      console.warn(`Table element not found: ${tableId}`);
      return;
    }

    let tbody = table.querySelector("tbody");

    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    // Haddii table-ku uusan lahayn thead, samee.
    if (!table.querySelector("thead")) {
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.insertBefore(thead, tbody);
    }

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${headers.length}" class="empty-state">
            No records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.join("");
  }

  // 11. LOAD INVOICE RECORDS
  async function loadInvoiceRecords() {
    const messageId = "invoiceMessage";

    try {
      showMessage(messageId, "Loading invoice records...");

      const { data, error } = await db
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
          created_at,
          currency
        `)
        .eq("institution_id", currentProfile.institution_id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const invoices = data || [];

      const rows = invoices.map((invoice) => {
        const amount = Number(invoice.amount || 0);
        const paid = Number(invoice.paid_amount || 0);
        const balance = Math.max(amount - paid, 0);
        const currency = invoice.currency || "USD";

        return `
          <tr>
            <td>${escapeHTML(invoice.invoice_number || shortReference(invoice.id))}</td>
            <td title="${escapeHTML(invoice.student_id || "")}">
              ${escapeHTML(shortReference(invoice.student_id))}
            </td>
            <td>${escapeHTML(formatMoney(amount, currency))}</td>
            <td>${escapeHTML(formatMoney(paid, currency))}</td>
            <td>${escapeHTML(formatMoney(balance, currency))}</td>
            <td>
              <span class="status-badge ${statusClass(invoice.status)}">
                ${escapeHTML(invoice.status || "unknown")}
              </span>
            </td>
            <td>${escapeHTML(formatDate(invoice.due_date))}</td>
          </tr>
        `;
      });

      renderTable(
        "invoiceTable",
        [
          "Invoice Number",
          "Student Ref",
          "Amount",
          "Paid",
          "Balance",
          "Status",
          "Due Date"
        ],
        rows
      );

      if (invoices.length === 0) {
        showMessage(messageId, "No invoices found for this institution.");
      } else {
        hideMessage(messageId);
      }

    } catch (error) {
      showError("Invoice records: " + error.message);

      showMessage(
        messageId,
        "Invoice records lama soo qaadi karin. Hubi RLS permissions iyo database connection.",
        "error"
      );
    }
  }

  // 12. LOAD PAYMENT RECORDS
  async function loadPaymentRecords() {
    const messageId = "paymentMessage";

    try {
      showMessage(messageId, "Loading payment records...");

      const { data, error } = await db
        .from("payments")
        .select(`
          id,
          institution_id,
          invoice_id,
          student_id,
          amount,
          currency,
          payment_method,
          status,
          paid_at,
          created_at,
          payment_reference,
          receipt_number,
          transaction_reference
        `)
        .eq("institution_id", currentProfile.institution_id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const payments = data || [];

      const rows = payments.map((payment) => {
        const reference =
          payment.receipt_number ||
          payment.payment_reference ||
          payment.transaction_reference ||
          shortReference(payment.id);

        const paymentDate =
          payment.paid_at || payment.created_at;

        return `
          <tr>
            <td>${escapeHTML(reference)}</td>
            <td title="${escapeHTML(payment.student_id || "")}">
              ${escapeHTML(shortReference(payment.student_id))}
            </td>
            <td>${escapeHTML(
              formatMoney(payment.amount, payment.currency || "USD")
            )}</td>
            <td>${escapeHTML(payment.payment_method || "—")}</td>
            <td>
              <span class="status-badge ${statusClass(payment.status)}">
                ${escapeHTML(payment.status || "unknown")}
              </span>
            </td>
            <td>${escapeHTML(formatDate(paymentDate))}</td>
          </tr>
        `;
      });

      renderTable(
        "paymentTable",
        [
          "Payment Reference",
          "Student Ref",
          "Amount",
          "Method",
          "Status",
          "Date"
        ],
        rows
      );

      if (payments.length === 0) {
        showMessage(messageId, "No payment records found for this institution.");
      } else {
        hideMessage(messageId);
      }

    } catch (error) {
      showError("Payment records: " + error.message);

      showMessage(
        messageId,
        "Payment records lama soo qaadi karin. Hubi RLS permissions iyo database connection.",
        "error"
      );
    }
  }

  // 13. NAVIGATION
  function setupNavigation() {
    document.addEventListener("click", (event) => {
      const navItem = event.target.closest(
        "[data-target], [data-section]"
      );

      if (!navItem) return;

      const target =
        navItem.dataset.target ||
        navItem.dataset.section;

      if (!target) return;

      const sectionId = target.startsWith("section-")
        ? target
        : `section-${target}`;

      const targetSection = $(sectionId);

      if (!targetSection) return;

      document.querySelectorAll(
        '[id^="section-"]'
      ).forEach((section) => {
        section.style.display = "none";
        section.classList.remove("active");
      });

      targetSection.style.display = "block";
      targetSection.classList.add("active");

      document.querySelectorAll(
        "[data-target], [data-section]"
      ).forEach((item) => {
        item.classList.remove("active");
      });

      navItem.classList.add("active");
    });
  }

  // 14. LOGOUT
  function setupLogout() {
    const logoutButtons = [
      "logoutBtn",
      "logoutButton",
      "signOutBtn"
    ];

    logoutButtons.forEach((id) => {
      const button = $(id);

      if (!button) return;

      button.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Ma hubtaa inaad ka baxdo Finance Manager Dashboard?"
        );

        if (!confirmed) return;

        const { error } = await db.auth.signOut();

        if (error) {
          alert("Logout failed: " + error.message);
          return;
        }

        window.location.href = "index.html";
      });
    });
  }

  // 15. AUTH STATE CHANGE
  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "index.html";
    }
  });

  // 16. START
  document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
  });

})();
