// =========================================================
// GAAWOW EMS — SUPPORT MODULE
// =========================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentProfile = null;
let currentTicket = null;

let allTickets = [];
let filteredTickets = [];

let currentPage = 1;
const pageSize = 10;


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  setupFilters();

  await checkLogin();

});


// =========================================================
// CHECK LOGIN
// =========================================================

async function checkLogin() {

  try {

    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {

      window.location.href = "index.html";

      return;
    }

    currentUser = session.user;

    await loadProfile();

    await loadTickets();

  } catch (error) {

    console.error(error);

    showAlert(
      "Authentication error: " + error.message,
      "error"
    );

  }

}


// =========================================================
// LOAD PROFILE
// =========================================================

async function loadProfile() {

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        institution_id,
        is_active
      `)
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {

    showAlert(
      "Profile not found.",
      "error"
    );

    return;
  }

  currentProfile = data;

  if (data.is_active === false) {

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";

  }

}


// =========================================================
// LOAD TICKETS
// =========================================================

async function loadTickets() {

  const body =
    document.getElementById("ticketsBody");

  body.innerHTML = `
    <tr>
      <td colspan="7">
        <div class="loading">
          Loading support tickets...
        </div>
      </td>
    </tr>
  `;

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("support_tickets")
      .select(`
        id,
        ticket_no,
        user_id,
        institution_id,
        subject,
        category,
        priority,
        status,
        description,
        assigned_to,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    allTickets = data || [];

    filteredTickets = [...allTickets];

    currentPage = 1;

    updateStats();

    renderTickets();

  } catch (error) {

    console.error(error);

    body.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty">
            Failed to load support tickets.<br>
            ${escapeHtml(error.message)}
          </div>
        </td>
      </tr>
    `;

  }

}


// =========================================================
// FILTER SETUP
// =========================================================

function setupFilters() {

  const search =
    document.getElementById("searchInput");

  const status =
    document.getElementById("statusFilter");

  const priority =
    document.getElementById("priorityFilter");

  const category =
    document.getElementById("categoryFilter");


  search.addEventListener(
    "input",
    applyFilters
  );

  status.addEventListener(
    "change",
    applyFilters
  );

  priority.addEventListener(
    "change",
    applyFilters
  );

  category.addEventListener(
    "change",
    applyFilters
  );

}


// =========================================================
// APPLY FILTERS
// =========================================================

function applyFilters() {

  const search =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase()
      .trim();

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  const priority =
    document.getElementById(
      "priorityFilter"
    ).value;

  const category =
    document.getElementById(
      "categoryFilter"
    ).value;


  filteredTickets =
    allTickets.filter(ticket => {

      const matchesSearch =
        !search ||
        String(ticket.ticket_no || "")
          .toLowerCase()
          .includes(search) ||
        String(ticket.subject || "")
          .toLowerCase()
          .includes(search) ||
        String(ticket.description || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !status ||
        ticket.status === status;

      const matchesPriority =
        !priority ||
        ticket.priority === priority;

      const matchesCategory =
        !category ||
        ticket.category === category;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory
      );

    });

  currentPage = 1;

  renderTickets();

}


// =========================================================
// RENDER TICKETS
// =========================================================

function renderTickets() {

  const body =
    document.getElementById("ticketsBody");

  const total =
    filteredTickets.length;

  document.getElementById(
    "resultCount"
  ).textContent =
    `${total} ticket${total === 1 ? "" : "s"}`;


  if (!total) {

    body.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty">
            🎫 No support tickets found.
          </div>
        </td>
      </tr>
    `;

    updatePagination();

    return;
  }


  const start =
    (currentPage - 1) * pageSize;

  const end =
    start + pageSize;

  const pageTickets =
    filteredTickets.slice(start, end);


  body.innerHTML =
    pageTickets.map(ticket => {

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(ticket.ticket_no)}
            </strong>
          </td>

          <td>
            ${escapeHtml(ticket.subject)}
          </td>

          <td>
            ${escapeHtml(ticket.category)}
          </td>

          <td>
            ${priorityBadge(ticket.priority)}
          </td>

          <td>
            ${statusBadge(ticket.status)}
          </td>

          <td>
            ${formatDate(ticket.created_at)}
          </td>

          <td>

            <button
              class="btn-view"
              onclick="openTicket('${ticket.id}')"
            >
              View
            </button>

          </td>

        </tr>
      `;

    }).join("");


  updatePagination();

}


// =========================================================
// STATS
// =========================================================

function updateStats() {

  const total =
    allTickets.length;

  const open =
    allTickets.filter(
      x => x.status === "Open"
    ).length;

  const progress =
    allTickets.filter(
      x => x.status === "In Progress"
    ).length;

  const resolved =
    allTickets.filter(
      x => x.status === "Resolved"
    ).length;

  const urgent =
    allTickets.filter(
      x => x.priority === "Urgent"
    ).length;


  document.getElementById(
    "totalTickets"
  ).textContent = total;

  document.getElementById(
    "openTickets"
  ).textContent = open;

  document.getElementById(
    "progressTickets"
  ).textContent = progress;

  document.getElementById(
    "resolvedTickets"
  ).textContent = resolved;

  document.getElementById(
    "urgentTickets"
  ).textContent = urgent;

}


// =========================================================
// CREATE TICKET MODAL
// =========================================================

function openCreateTicket() {

  document
    .getElementById("createModal")
    .classList.add("show");

  document
    .getElementById("ticketSubject")
    .focus();

}


function closeCreateTicket() {

  document
    .getElementById("createModal")
    .classList.remove("show");

}


// =========================================================
// CREATE TICKET
// =========================================================

async function createTicket() {

  const subject =
    document
      .getElementById("ticketSubject")
      .value
      .trim();

  const category =
    document.getElementById(
      "ticketCategory"
    ).value;

  const priority =
    document.getElementById(
      "ticketPriority"
    ).value;

  const description =
    document
      .getElementById("ticketDescription")
      .value
      .trim();


  if (!subject) {

    showAlert(
      "Please enter a subject.",
      "error"
    );

    return;
  }


  if (!description) {

    showAlert(
      "Please describe your issue.",
      "error"
    );

    return;
  }


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("support_tickets")
      .insert({

        user_id: currentUser.id,

        institution_id:
          currentProfile
            ? currentProfile.institution_id
            : null,

        subject,
        category,
        priority,
        description,

        status: "Open"

      })
      .select()
      .single();


    if (error) {
      throw error;
    }


    closeCreateTicket();

    document.getElementById(
      "ticketSubject"
    ).value = "";

    document.getElementById(
      "ticketDescription"
    ).value = "";


    showAlert(
      `Ticket ${data.ticket_no} created successfully.`,
      "success"
    );


    await loadTickets();


    setTimeout(() => {

      openTicket(data.id);

    }, 300);


  } catch (error) {

    console.error(error);

    showAlert(
      "Could not create ticket: " +
      error.message,
      "error"
    );

  }

}


// =========================================================
// OPEN TICKET
// =========================================================

async function openTicket(ticketId) {

  const ticket =
    allTickets.find(
      x => x.id === ticketId
    );

  if (!ticket) {

    showAlert(
      "Ticket not found.",
      "error"
    );

    return;
  }


  currentTicket = ticket;


  document.getElementById(
    "viewTicketTitle"
  ).textContent =
    ticket.subject;


  document.getElementById(
    "viewTicketNo"
  ).textContent =
    ticket.ticket_no;


  document.getElementById(
    "viewStatus"
  ).innerHTML =
    statusBadge(ticket.status);


  document.getElementById(
    "viewPriority"
  ).innerHTML =
    priorityBadge(ticket.priority);


  document.getElementById(
    "viewCategory"
  ).textContent =
    ticket.category;


  document.getElementById(
    "viewCreated"
  ).textContent =
    formatDate(ticket.created_at);


  document.getElementById(
    "viewUpdated"
  ).textContent =
    formatDate(ticket.updated_at);


  document.getElementById(
    "viewDescription"
  ).textContent =
    ticket.description;


  document
    .getElementById("viewModal")
    .classList.add("show");


  await loadMessages(ticket.id);

  updateTicketButtons(ticket);

}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages(ticketId) {

  const list =
    document.getElementById(
      "messagesList"
    );

  list.innerHTML =
    `<div class="loading">
      Loading messages...
    </div>`;


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("support_messages")
      .select(`
        id,
        ticket_id,
        user_id,
        message,
        created_at
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", {
        ascending: true
      });


    if (error) {
      throw error;
    }


    if (!data || !data.length) {

      list.innerHTML = `
        <div class="empty" style="padding:20px;">
          No replies yet.
        </div>
      `;

      return;
    }


    list.innerHTML =
      data.map(message => {

        const isCurrentUser =
          message.user_id === currentUser.id;


        return `
          <div class="message ${
            isCurrentUser ? "" : "admin"
          }">

            <div class="message-meta">

              ${
                isCurrentUser
                  ? "You"
                  : "Support Team"
              }

              •

              ${formatDate(
                message.created_at
              )}

            </div>

            <div class="message-text">
              ${escapeHtml(message.message)}
            </div>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(error);

    list.innerHTML = `
      <div class="empty">
        Failed to load messages.
      </div>
    `;

  }

}


// =========================================================
// SEND REPLY
// =========================================================

async function sendReply() {

  if (!currentTicket) {
    return;
  }


  const textarea =
    document.getElementById(
      "replyMessage"
    );

  const message =
    textarea.value.trim();


  if (!message) {

    showAlert(
      "Please write a reply.",
      "error"
    );

    return;
  }


  try {

    const {
      error
    } = await supabaseClient
      .from("support_messages")
      .insert({

        ticket_id:
          currentTicket.id,

        user_id:
          currentUser.id,

        message

      });


    if (error) {
      throw error;
    }


    textarea.value = "";


    showAlert(
      "Reply sent successfully.",
      "success"
    );


    await loadMessages(
      currentTicket.id
    );


    // If ticket was Open, move to In Progress
    if (
      currentTicket.status === "Open"
    ) {

      await changeTicketStatus(
        "In Progress",
        true
      );

    }

  } catch (error) {

    console.error(error);

    showAlert(
      "Could not send reply: " +
      error.message,
      "error"
    );

  }

}


// =========================================================
// CHANGE STATUS
// =========================================================

async function changeTicketStatus(
  newStatus,
  silent = false
) {

  if (!currentTicket) {
    return;
  }


  if (
    currentTicket.status === newStatus
  ) {

    if (!silent) {

      showAlert(
        `Ticket is already ${newStatus}.`,
        "error"
      );

    }

    return;
  }


  try {

    const updateData = {
      status: newStatus
    };


    if (newStatus === "Resolved") {
      updateData.resolved_at =
        new Date().toISOString();
    }


    if (newStatus === "Closed") {
      updateData.closed_at =
        new Date().toISOString();
    }


    const {
      data,
      error
    } = await supabaseClient
      .from("support_tickets")
      .update(updateData)
      .eq("id", currentTicket.id)
      .select()
      .single();


    if (error) {
      throw error;
    }


    currentTicket = data;


    const index =
      allTickets.findIndex(
        x => x.id === data.id
      );


    if (index !== -1) {
      allTickets[index] = data;
    }


    applyFilters();

    updateStats();

    updateTicketButtons(data);


    document.getElementById(
      "viewStatus"
    ).innerHTML =
      statusBadge(data.status);


    if (!silent) {

      showAlert(
        `Ticket ${data.ticket_no} marked as ${newStatus}.`,
        "success"
      );

    }

  } catch (error) {

    console.error(error);

    showAlert(
      "Could not update ticket: " +
      error.message,
      "error"
    );

  }

}


// =========================================================
// BUTTON VISIBILITY
// =========================================================

function updateTicketButtons(ticket) {

  const progressBtn =
    document.getElementById(
      "progressBtn"
    );

  const resolveBtn =
    document.getElementById(
      "resolveBtn"
    );

  const closeBtn =
    document.getElementById(
      "closeBtn"
    );


  progressBtn.style.display =
    ticket.status === "Open"
      ? "inline-block"
      : "none";


  resolveBtn.style.display =
    (
      ticket.status === "Open" ||
      ticket.status === "In Progress"
    )
      ? "inline-block"
      : "none";


  closeBtn.style.display =
    ticket.status !== "Closed"
      ? "inline-block"
      : "none";


  const replyArea =
    document.getElementById(
      "replyArea"
    );


  if (ticket.status === "Closed") {

    replyArea.style.display =
      "none";

  } else {

    replyArea.style.display =
      "block";

  }

}


// =========================================================
// CLOSE VIEW
// =========================================================

function closeViewTicket() {

  document
    .getElementById("viewModal")
    .classList.remove("show");

  currentTicket = null;

}


// =========================================================
// PAGINATION
// =========================================================

function updatePagination() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredTickets.length /
        pageSize
      )
    );


  if (currentPage > totalPages) {
    currentPage = totalPages;
  }


  document.getElementById(
    "pageInfo"
  ).textContent =
    `Page ${currentPage} of ${totalPages}`;


  document.getElementById(
    "prevBtn"
  ).disabled =
    currentPage <= 1;


  document.getElementById(
    "nextBtn"
  ).disabled =
    currentPage >= totalPages;

}


function previousPage() {

  if (currentPage > 1) {

    currentPage--;

    renderTickets();

  }

}


function nextPage() {

  const totalPages =
    Math.ceil(
      filteredTickets.length /
      pageSize
    );


  if (currentPage < totalPages) {

    currentPage++;

    renderTickets();

  }

}


// =========================================================
// BADGES
// =========================================================

function statusBadge(status) {

  const cls = {

    "Open": "status-open",

    "In Progress": "status-progress",

    "Resolved": "status-resolved",

    "Closed": "status-closed"

  }[status] || "status-closed";


  return `
    <span class="badge ${cls}">
      ${escapeHtml(status)}
    </span>
  `;

}


function priorityBadge(priority) {

  const cls = {

    "Low": "priority-low",

    "Medium": "priority-medium",

    "High": "priority-high",

    "Urgent": "priority-urgent"

  }[priority] || "priority-medium";


  return `
    <span class="badge ${cls}">
      ${escapeHtml(priority)}
    </span>
  `;

}


// =========================================================
// DATE
// =========================================================

function formatDate(date) {

  if (!date) {
    return "—";
  }


  try {

    return new Date(date)
      .toLocaleString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  } catch {

    return date;

  }

}


// =========================================================
// ALERT
// =========================================================

function showAlert(
  message,
  type = "success"
) {

  const box =
    document.getElementById(
      "alertBox"
    );


  box.textContent = message;

  box.className =
    "alert show " +
    (
      type === "error"
        ? "alert-error"
        : "alert-success"
    );


  setTimeout(() => {

    box.classList.remove(
      "show"
    );

  }, 4500);

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }


  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// =========================================================
// DASHBOARD
// =========================================================

function goDashboard() {

  window.location.href =
    "dashboard.html";

}


// =========================================================
// LOGOUT
// =========================================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(error);

  }


  sessionStorage.clear();

  window.location.href =
    "index.html";

}


// =========================================================
// MODAL OUTSIDE CLICK
// =========================================================

window.addEventListener(
  "click",
  event => {

    const createModal =
      document.getElementById(
        "createModal"
      );

    const viewModal =
      document.getElementById(
        "viewModal"
      );


    if (event.target === createModal) {
      closeCreateTicket();
    }


    if (event.target === viewModal) {
      closeViewTicket();
    }

  }
);
