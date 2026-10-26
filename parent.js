"use strict";

const PARENT_PORTAL_CONFIG = {
  supabaseUrl:
    window.SUPABASE_URL ||
    "https://mytyvqwrxnxpxnxpiicj.supabase.co",

  supabaseKey:
    window.SUPABASE_ANON_KEY ||
    window.SUPABASE_PUBLISHABLE_KEY ||
    ""
};

let parentPortalClient =
  window.supabaseClient || null;

if (
  !parentPortalClient &&
  window.supabase &&
  typeof window.supabase.createClient === "function" &&
  PARENT_PORTAL_CONFIG.supabaseKey
) {
  parentPortalClient = window.supabase.createClient(
    PARENT_PORTAL_CONFIG.supabaseUrl,
    PARENT_PORTAL_CONFIG.supabaseKey
  );

  window.supabaseClient = parentPortalClient;
}

let currentParentProfile = null;
let currentParentRecord = null;
let currentParentChildren = [];

function parentPortalMessage(message, type = "loading") {
  const element = document.getElementById("pageMessage");

  if (!element) return;

  element.className =
    type === "error" ? "error-box" : "loading";

  element.textContent = message;
  element.hidden = false;
}

function parentPortalShowContent(show) {
  const content = document.getElementById("portalContent");

  if (content) {
    content.hidden = !show;
  }

  const logout = document.getElementById("logoutBtn");

  if (logout) {
    logout.hidden = !show;
  }
}

async function parentPortalInitialize() {
  parentPortalShowContent(false);

  try {
    if (!parentPortalClient) {
      throw new Error(
        "Supabase lama diyaarsana. Hubi configuration-ka iyo publishable key-ga."
      );
    }

    const {
      data: sessionData,
      error: sessionError
    } = await parentPortalClient.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session?.user?.id) {
      window.location.replace("index.html");
      return;
    }

    const userId = session.user.id;

    // 1. Aqoonso qofka login-ka sameeyey.
    const {
      data: profile,
      error: profileError
    } = await parentPortalClient
      .from("profiles")
      .select("id, full_name, role, is_active, institution_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error(
        "Profile-ka akoonkan laguma helin."
      );
    }

    if (profile.role !== "parent") {
      // Haddii qofku aanu waalid ahayn, portal-kan looma oggola.
      if (profile.role === "super_admin") {
        window.location.replace("dashboard.html");
        return;
      }

      if (profile.role === "school_admin") {
        window.location.replace("school-dashboard.html");
        return;
      }

      if (profile.role === "teacher") {
        window.location.replace("teacher-portal.html");
        return;
      }

      if (profile.role === "student") {
        window.location.replace("student.html");
        return;
      }

      throw new Error(
        "Akoonkan looma oggola Parent Portal."
      );
    }

    if (profile.is_active !== true) {
      throw new Error(
        "Akoonka waalidka waa la joojiyey. La xiriir maamulka GAAWOW Academy."
      );
    }

    // 2. Hubi in profile-ku ku xiran yahay diiwaan waalid.
    const {
      data: parent,
      error: parentError
    } = await parentPortalClient
      .from("parents")
      .select("id, institution_id, profile_id, full_name, phone, email")
      .eq("profile_id", userId)
      .maybeSingle();

    if (parentError) throw parentError;

    if (!parent) {
      throw new Error(
        "Akoonkaagu ma laha diiwaan waalid oo ku xiran. La xiriir maamulka."
      );
    }

    currentParentProfile = profile;
    currentParentRecord = parent;

    const welcome = document.getElementById("welcomeName");

    if (welcome) {
      welcome.textContent =
        "Ku soo dhowow, " +
        (parent.full_name || profile.full_name || "Waalid");
    }

    // 3. Soo hel carruurta uu waalidkani xaq u leeyahay.
    await parentPortalLoadChildren();

    // 4. Soo geli ogeysiisyada attendance-ka.
    await parentPortalLoadAttendance();

    parentPortalShowContent(true);

    const message = document.getElementById("pageMessage");

    if (message) {
      message.hidden = true;
    }

  } catch (error) {
    console.error("Parent Portal authentication error:", error);

    parentPortalShowContent(false);

    parentPortalMessage(
      error.message ||
      "Gelitaanka Parent Portal-ku wuu fashilmay.",
      "error"
    );
  }
}

async function parentPortalLoadChildren() {
  if (!currentParentRecord?.id) {
    throw new Error(
      "Diiwaanka waalidka lama xaqiijin."
    );
  }

  /*
   * parent_students ayaa ah xiriirka rasmiga ah
   * ee waalidka iyo ardayda.
   */

  const {
    data: links,
    error: linksError
  } = await parentPortalClient
    .from("parent_students")
    .select(`
      student_id,
      relationship,
      is_primary,
      institution_id
    `)
    .eq("parent_id", currentParentRecord.id);

  if (linksError) throw linksError;

  const studentIds = [
    ...new Set((links || []).map(link => link.student_id))
  ];

  let students = [];

  if (studentIds.length > 0) {
    const {
      data,
      error
    } = await parentPortalClient
      .from("students")
      .select(`
        id,
        student_id,
        full_name,
        gender,
        photo_url,
        status,
        institution_id
      `)
      .in("id", studentIds);

    if (error) throw error;

    students = data || [];
  }

  const linkByStudentId = new Map(
    (links || []).map(link => [link.student_id, link])
  );

  currentParentChildren = students.map(student => ({
    ...student,
    parent_relationship:
      linkByStudentId.get(student.id)?.relationship || "Waalid",
    is_primary:
      linkByStudentId.get(student.id)?.is_primary === true
  }));

  const count = document.getElementById("childrenCount");

  if (count) {
    count.textContent = currentParentChildren.length;
  }

  const container = document.getElementById("childrenList");

  if (!container) return;

  if (!currentParentChildren.length) {
    container.innerHTML = `
      <div class="empty">
        Weli carruur kuma xirna akoonkan.
        Fadlan la xiriir maamulka GAAWOW Academy.
      </div>
    `;
    return;
  }

  container.innerHTML = currentParentChildren.map(student => `
    <article class="card">
      <div class="student-name">
        ${parentPortalEscape(student.full_name)}
      </div>

      <div class="student-meta">
        Student ID:
        ${parentPortalEscape(student.student_id || "—")}
        <br>
        Gender:
        ${parentPortalEscape(student.gender || "—")}
        <br>
        Relationship:
        ${parentPortalEscape(student.parent_relationship)}
        <br>
        Status:
        ${parentPortalEscape(student.status || "—")}
      </div>
    </article>
  `).join("");
}

async function parentPortalLoadAttendance() {
  if (!currentParentChildren.length) {
    parentPortalRenderNotifications([]);
    return;
  }

  const studentIds = currentParentChildren.map(
    student => student.id
  );

  /*
   * attendance wuxuu leeyahay lesson_id,
   * sidaas darteed jadwalka lessons waa inuu
   * u oggolaadaa xiriirkan. Haddii RLS ama FK-ga
   * lessons-ku kala duwan yihiin, waa in query-ga
   * lagu waafajiyaa schema-ga dhabta ah.
   */

  const {
    data: records,
    error
  } = await parentPortalClient
    .from("attendance")
    .select(`
      id,
      student_id,
      lesson_id,
      status,
      notes,
      recorded_at
    `)
    .in("student_id", studentIds)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  parentPortalRenderNotifications(records || []);
}

function parentPortalRenderNotifications(records) {
  const container = document.getElementById("notificationsList");

  if (!container) return;

  const count = document.getElementById("notificationsCount");
  const unread = document.getElementById("unreadCount");

  if (count) count.textContent = records.length;

  /*
   * Jadwalka attendance-ka ee hadda la xaqiijiyey
   * ma laha read_at/is_read. Sidaas darteed unread
   * halkan waa 0 ilaa notification table rasmi ah
   * la xaqiijiyo.
   */

  if (unread) unread.textContent = "0";

  if (!records.length) {
    container.innerHTML = `
      <div class="empty">
        Weli ma jiraan diiwaanno attendance ah oo la soo bandhigi karo.
      </div>
    `;
    return;
  }

  const childrenById = new Map(
    currentParentChildren.map(student => [
      student.id,
      student.full_name
    ])
  );

  container.innerHTML = records.map(record => {
    const status = String(record.status || "unknown");
    const studentName =
      childrenById.get(record.student_id) || "Arday";

    return `
      <article class="card notification">
        <div class="notification-top">
          <h3>${parentPortalEscape(studentName)}</h3>
          <span class="badge badge-read">
            ${parentPortalEscape(status)}
          </span>
        </div>

        <div class="notification-message">
          Attendance status:
          ${parentPortalEscape(status)}
          ${
            record.notes
              ? `<br>Faahfaahin: ${parentPortalEscape(record.notes)}`
              : ""
          }
        </div>

        <div class="notification-footer">
          <span class="date">
            ${parentPortalEscape(
              parentPortalFormatDate(record.recorded_at)
            )}
          </span>
        </div>
      </article>
    `;
  }).join("");
}

function parentPortalEscape(value) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    character => map[character]
  );
}

function parentPortalFormatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

async function parentPortalRefresh() {
  try {
    parentPortalMessage(
      "Xogta ayaa la cusboonaysiinayaa..."
    );

    await parentPortalLoadChildren();
    await parentPortalLoadAttendance();

    const message = document.getElementById("pageMessage");

    if (message) message.hidden = true;

  } catch (error) {
    parentPortalMessage(error.message, "error");
  }
}

async function parentPortalLogout() {
  try {
    const {
      error
    } = await parentPortalClient.auth.signOut();

    if (error) throw error;

    window.location.replace("index.html");

  } catch (error) {
    parentPortalMessage(error.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshBtn");
  const logoutButton = document.getElementById("logoutBtn");

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      parentPortalRefresh
    );
  }

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      parentPortalLogout
    );
  }

  parentPortalInitialize();
});
