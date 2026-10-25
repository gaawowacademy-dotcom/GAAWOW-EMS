"use strict";

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let currentParent = null;
let linkedChildren = [];
let parentNotifications = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setMessage("Hubinaya gelitaankaaga...");

  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session?.user) {
      window.location.replace("index.html");
      return;
    }

    currentUser = session.user;

    await loadParentProfile();

    document.getElementById("logoutBtn").hidden = false;
    document.getElementById("portalContent").hidden = false;

    document.getElementById("welcomeName").textContent =
      "Ku soo dhowow, " +
      (currentParent.full_name || "Waalid");

    await loadChildren();
    await loadNotifications();

    document.getElementById("pageMessage").hidden = true;

  } catch (error) {
    console.error("Parent Portal initialization error:", error);

    setMessage(
      "Portal-ka lama furi karo. Hubi in akoonkaagu yahay Parent account, " +
      "in profile-ka waalidku sax yahay, iyo in Supabase RLS policies-ku oggol yihiin gelitaanka xogta.",
      true
    );
  }
}

async function loadParentProfile() {
  const { data, error } = await supabaseClient
    .from("parents")
    .select("id, institution_id, profile_id, full_name, email")
    .eq("profile_id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Akoonkaaga lama xiriirin diiwaanka parents.profile_id."
    );
  }

  currentParent = data;
}

async function loadChildren() {
  const { data, error } = await supabaseClient
    .from("parent_students")
    .select(`
      student_id,
      relationship,
      is_primary,
      students (
        id,
        student_id,
        full_name,
        status
      )
    `)
    .eq("parent_id", currentParent.id)
    .eq("institution_id", currentParent.institution_id);

  if (error) throw error;

  linkedChildren = (data || [])
    .filter(link => link.students)
    .map(link => ({
      ...link.students,
      relationship: link.relationship,
      is_primary: link.is_primary
    }));

  renderChildren();

  document.getElementById("childrenCount").textContent =
    linkedChildren.length;
}

function renderChildren() {
  const container = document.getElementById("childrenList");
  container.replaceChildren();

  if (!linkedChildren.length) {
    container.innerHTML =
      '<div class="empty">Weli carruur laguma xiriirin akoonkan. Fadlan la xiriir maamulka GAAWOW Academy.</div>';
    return;
  }

  linkedChildren.forEach(student => {
    const card = document.createElement("article");
    card.className = "card";

    const name = document.createElement("div");
    name.className = "student-name";
    name.textContent = student.full_name || "Arday";

    const meta = document.createElement("div");
    meta.className = "student-meta";
    meta.textContent =
      "Student ID: " + (student.student_id || "—") +
      " · Xiriirka: " + (student.relationship || "Waalid") +
      (student.is_primary ? " · Primary Parent" : "");

    card.append(name, meta);
    container.appendChild(card);
  });
}

async function loadNotifications() {
  const container = document.getElementById("notificationsList");
  container.innerHTML =
    '<div class="loading">Loading notifications...</div>';

  /*
   * RLS must ensure parents can read only notifications
   * belonging to their own parent record and linked children.
   */
  const { data, error } = await supabaseClient
    .from("parent_notifications")
    .select(`
      id,
      student_id,
      attendance_id,
      title,
      message,
      is_read,
      read_at,
      created_at
    `)
    .eq("parent_id", currentParent.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Notification loading error:", error);

    container.innerHTML =
      '<div class="error-box">Ogeysiisyada lama soo dejin karin. Hubi parent_notifications RLS policies iyo permissions-ka Supabase.</div>';

    return;
  }

  parentNotifications = data || [];

  renderNotifications();

  document.getElementById("notificationsCount").textContent =
    parentNotifications.length;

  document.getElementById("unreadCount").textContent =
    parentNotifications.filter(item => !item.is_read).length;
}

function renderNotifications() {
  const container = document.getElementById("notificationsList");
  container.replaceChildren();

  if (!parentNotifications.length) {
    container.innerHTML =
      '<div class="empty">📭 Weli ma jiraan ogeysiisyo maqnaansho ah.</div>';
    return;
  }

  parentNotifications.forEach(item => {
    const card = document.createElement("article");
    card.className = "card notification" + (item.is_read ? " read" : "");

    const top = document.createElement("div");
    top.className = "notification-top";

    const title = document.createElement("h3");
    title.textContent = item.title || "Ogeysiiska Maqnaanshaha Ardayga";

    const badge = document.createElement("span");
    badge.className = "badge " + (item.is_read ? "badge-read" : "badge-new");
    badge.textContent = item.is_read ? "Read · La akhriyey" : "New · Cusub";

    top.append(title, badge);

    const message = document.createElement("p");
    message.className = "notification-message";
    message.textContent = item.message || "Faahfaahin lama hayo.";

    const footer = document.createElement("div");
    footer.className = "notification-footer";

    const date = document.createElement("span");
    date.className = "date";
    date.textContent = formatDate(item.created_at);

    footer.appendChild(date);

    if (!item.is_read) {
      const button = document.createElement("button");
      button.className = "read-btn";
      button.textContent = "Mark as Read";
      button.addEventListener("click", () => markAsRead(item.id));
      footer.appendChild(button);
    }

    card.append(top, message, footer);
    container.appendChild(card);
  });
}

async function markAsRead(notificationId) {
  const button = [...document.querySelectorAll(".read-btn")]
    .find(btn => btn.closest(".notification"));

  try {
    const now = new Date().toISOString();

    const { error } = await supabaseClient
      .from("parent_notifications")
      .update({
        is_read: true,
        read_at: now
      })
      .eq("id", notificationId)
      .eq("parent_id", currentParent.id)
      .eq("is_read", false);

    if (error) throw error;

    await loadNotifications();

  } catch (error) {
    console.error("Mark notification as read failed:", error);
    alert(
      "Ogeysiiska lama calaamadin. Hubi UPDATE permission iyo RLS policy-ga parent_notifications."
    );
  }
}

function formatDate(value) {
  if (!value) return "Taariikh lama hayo";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Taariikh lama hayo";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function setMessage(message, isError = false) {
  const box = document.getElementById("pageMessage");
  box.hidden = false;
  box.textContent = message;
  box.className = isError ? "error-box" : "loading";
}

document.getElementById("refreshBtn").addEventListener(
  "click",
  async () => {
    const button = document.getElementById("refreshBtn");
    button.disabled = true;

    try {
      await loadChildren();
      await loadNotifications();
    } catch (error) {
      console.error(error);
      alert("Xogta lama cusboonaysiin karin.");
    } finally {
      button.disabled = false;
    }
  }
);

document.getElementById("logoutBtn").addEventListener(
  "click",
  async () => {
    const button = document.getElementById("logoutBtn");
    button.disabled = true;

    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      window.location.replace("index.html");
    } catch (error) {
      console.error(error);
      alert("Sign out ma shaqayn. Fadlan mar kale isku day.");
      button.disabled = false;
    }
  }
);
