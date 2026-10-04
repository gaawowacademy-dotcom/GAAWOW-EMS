"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT PORTAL JS
   VERSION 5.3
   CLEAN / COPY-PASTE READY
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initPortal
);


/* =========================================================
   INIT PORTAL
   ========================================================= */

async function initPortal() {

  try {

    showPortalLoading(
      "Loading Student Portal..."
    );


    /* -----------------------------------------
       GET SESSION
    ----------------------------------------- */

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {
      throw error;
    }


    const session =
      data?.session;


    if (!session?.user) {

      redirectToLogin();

      return;
    }


    const user =
      session.user;


    /* -----------------------------------------
       FIND STUDENT
    ----------------------------------------- */

    const student =
      await getCurrentStudent(
        user
      );


    if (!student) {

      await supabaseClient.auth.signOut();

      showFatalError(
        "Student account-ka lama helin ama account-kan lama xiriirin student."
      );

      return;
    }


    /* -----------------------------------------
       ACCOUNT STATUS
    ----------------------------------------- */

    if (
      student.account_enabled === false
    ) {

      await supabaseClient.auth.signOut();

      showFatalError(
        "Student account-kan waa la xiray. Fadlan la xiriir maamulka."
      );

      return;
    }


    if (
      student.status &&
      String(student.status).toLowerCase() !==
        "active"
    ) {

      await supabaseClient.auth.signOut();

      showFatalError(
        "Student account-kan ma aha active."
      );

      return;
    }


    /* -----------------------------------------
       RENDER STUDENT
    ----------------------------------------- */

    renderStudent(
      student,
      user
    );


    /* -----------------------------------------
       LOAD MODULES
    ----------------------------------------- */

    await Promise.allSettled([

      loadResults(
        student.id
      ),

      loadCertificates(
        student.id
      ),

      loadNotifications(
        student.id
      )

    ]);


    /* -----------------------------------------
       SHOW PORTAL
    ----------------------------------------- */

    $("portalLoading")
      ?.classList.add("hidden");


    $("portalApp")
      ?.classList.remove("hidden");


  }

  catch (error) {

    console.error(
      "Student Portal Error:",
      error
    );


    showFatalError(
      getFriendlyError(error)
    );

  }

}


/* =========================================================
   GET CURRENT STUDENT
   ========================================================= */

async function getCurrentStudent(user) {

  /*
   * First try auth_user_id.
   *
   * This matches the student account
   * structure currently being used.
   */

  const response =
    await supabaseClient
      .from("students")
      .select(`
        id,
        institution_id,
        profile_id,
        auth_user_id,
        student_id,
        full_name,
        gender,
        date_of_birth,
        phone,
        email,
        address,
        photo_url,
        admission_date,
        status,
        account_enabled
      `)
      .eq(
        "auth_user_id",
        user.id
      )
      .maybeSingle();


  if (
    !response.error &&
    response.data
  ) {

    return response.data;
  }


  /*
   * Fallback:
   * Some older records may use profile_id.
   */

  const fallback =
    await supabaseClient
      .from("students")
      .select(`
        id,
        institution_id,
        profile_id,
        auth_user_id,
        student_id,
        full_name,
        gender,
        date_of_birth,
        phone,
        email,
        address,
        photo_url,
        admission_date,
        status,
        account_enabled
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();


  if (
    !fallback.error &&
    fallback.data
  ) {

    return fallback.data;
  }


  /*
   * Last fallback:
   * Search by email if available.
   */

  if (user.email) {

    const emailResult =
      await supabaseClient
        .from("students")
        .select(`
          id,
          institution_id,
          profile_id,
          auth_user_id,
          student_id,
          full_name,
          gender,
          date_of_birth,
          phone,
          email,
          address,
          photo_url,
          admission_date,
          status,
          account_enabled
        `)
        .eq(
          "email",
          user.email
        )
        .maybeSingle();


    if (
      !emailResult.error &&
      emailResult.data
    ) {

      return emailResult.data;
    }

  }


  console.error(
    "Unable to find student:",
    response.error,
    fallback.error
  );


  return null;
}


/* =========================================================
   RENDER STUDENT
   ========================================================= */

function renderStudent(
  student,
  user
) {

  const fullName =
    student.full_name ||
    "Student";


  if ($("studentNameTop")) {

    $("studentNameTop")
      .textContent =
      fullName;

  }


  if ($("welcomeName")) {

    $("welcomeName")
      .textContent =
      fullName;

  }


  if ($("studentNumber")) {

    $("studentNumber")
      .textContent =
      student.student_id ||
      "--";

  }


  if ($("studentFullName")) {

    $("studentFullName")
      .textContent =
      fullName;

  }


  if ($("studentIdField")) {

    $("studentIdField")
      .textContent =
      student.student_id ||
      "--";

  }


  if ($("studentEmail")) {

    $("studentEmail")
      .textContent =
      user?.email ||
      student.email ||
      "--";

  }


  if ($("studentPhone")) {

    $("studentPhone")
      .textContent =
      student.phone ||
      "--";

  }


  if ($("studentGender")) {

    $("studentGender")
      .textContent =
      student.gender ||
      "--";

  }


  if ($("admissionDate")) {

    $("admissionDate")
      .textContent =
      formatDate(
        student.admission_date
      );

  }


  if (
    student.photo_url &&
    $("studentPhoto")
  ) {

    $("studentPhoto")
      .src =
      student.photo_url;

  }

}


/* =========================================================
   RESULTS
   ========================================================= */

async function loadResults(
  studentId
) {

  try {

    const {
      data: results,
      error
    } =
      await supabaseClient
        .from("results")
        .select(`
          id,
          exam_id,
          subject_id,
          score,
          max_score,
          percentage,
          grade,
          remarks,
          is_published,
          created_at
        `)
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "is_published",
          true
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Results error:",
        error
      );

      showResultsMessage(
        "Unable to load results."
      );

      return;
    }


    const rows =
      results || [];


    if ($("resultsCount")) {

      $("resultsCount")
        .textContent =
        rows.length;

    }


    if (!rows.length) {

      showResultsMessage(
        "No published academic results are available yet."
      );

      return;
    }


    /* -----------------------------------------
       SUBJECT IDS
    ----------------------------------------- */

    const subjectIds =
      [
        ...new Set(
          rows
            .map(
              row =>
                row.subject_id
            )
            .filter(Boolean)
        )
      ];


    /* -----------------------------------------
       EXAM IDS
    ----------------------------------------- */

    const examIds =
      [
        ...new Set(
          rows
            .map(
              row =>
                row.exam_id
            )
            .filter(Boolean)
        )
      ];


    let subjects = [];
    let exams = [];


    /* -----------------------------------------
       LOAD SUBJECTS
    ----------------------------------------- */

    if (subjectIds.length) {

      const response =
        await supabaseClient
          .from("subjects")
          .select(
            "id, name, code"
          )
          .in(
            "id",
            subjectIds
          );


      if (!response.error) {

        subjects =
          response.data || [];

      }

    }


    /* -----------------------------------------
       LOAD EXAMS
    ----------------------------------------- */

    if (examIds.length) {

      const response =
        await supabaseClient
          .from("exams")
          .select(
            "id, title, exam_type"
          )
          .in(
            "id",
            examIds
          );


      if (!response.error) {

        exams =
          response.data || [];

      }

    }


    const subjectMap =
      Object.fromEntries(
        subjects.map(
          item => [
            item.id,
            item
          ]
        )
      );


    const examMap =
      Object.fromEntries(
        exams.map(
          item => [
            item.id,
            item
          ]
        )
      );


    const body =
      $("resultsBody");


    if (!body) {
      return;
    }


    body.innerHTML = "";


    rows.forEach(
      row => {

        const subject =
          subjectMap[
            row.subject_id
          ];


        const exam =
          examMap[
            row.exam_id
          ];


        const tr =
          document.createElement(
            "tr"
          );


        tr.innerHTML = `

          <td>
            ${escapeHtml(
              subject?.name ||
              "Subject"
            )}
          </td>

          <td>
            ${escapeHtml(
              exam?.title ||
              "Exam"
            )}
          </td>

          <td>
            ${escapeHtml(
              formatScore(
                row.score,
                row.max_score
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              formatPercentage(
                row.percentage,
                row.score,
                row.max_score
              )
            )}
          </td>

          <td>
            <strong>
              ${escapeHtml(
                row.grade ||
                "--"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              row.remarks ||
              "--"
            )}
          </td>

        `;


        body.appendChild(tr);

      }
    );


    $("resultsMessage")
      ?.classList.add(
        "hidden"
      );


    $("resultsTable")
      ?.classList.remove(
        "hidden"
      );

  }

  catch (error) {

    console.error(
      "loadResults error:",
      error
    );

    showResultsMessage(
      "Unable to load results."
    );

  }

}


/* =========================================================
   RESULTS MESSAGE
   ========================================================= */

function showResultsMessage(
  message
) {

  if ($("resultsMessage")) {

    $("resultsMessage")
      .textContent =
      message;

    $("resultsMessage")
      .classList.remove(
        "hidden"
      );

  }


  if ($("resultsTable")) {

    $("resultsTable")
      .classList.add(
        "hidden"
      );

  }

}


/* =========================================================
   CERTIFICATES
   ========================================================= */

async function loadCertificates(
  studentId
) {

  try {

    const {
      data: certificates,
      error
    } =
      await supabaseClient
        .from("certificates")
        .select(`
          id,
          certificate_no,
          certificate_id,
          verify_code,
          certificate_type,
          issue_date,
          expiry_date,
          status,
          course_name_snapshot,
          certificate_url,
          pdf_url,
          verification_url,
          qr_url,
          student_photo_url
        `)
        .eq(
          "student_id",
          studentId
        )
        .order(
          "issue_date",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Certificates error:",
        error
      );


      if ($("certificatesMessage")) {

        $("certificatesMessage")
          .textContent =
          "Unable to load certificates.";

      }


      return;
    }


    const rows =
      certificates || [];


    if ($("certificatesCount")) {

      $("certificatesCount")
        .textContent =
        rows.length;

    }


    const list =
      $("certificatesList");


    if (!list) {
      return;
    }


    list.innerHTML = "";


    if (!rows.length) {

      if ($("certificatesMessage")) {

        $("certificatesMessage")
          .textContent =
          "No certificates are available yet.";

        $("certificatesMessage")
          .classList.remove(
            "hidden"
          );

      }

      return;
    }


    $("certificatesMessage")
      ?.classList.add(
        "hidden"
      );


    rows.forEach(
      cert => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "certificate-item";


        const type =
          cert.certificate_type ===
          "authentication_letter"
            ? "Authentication Letter"
            : "Certificate";


        const verifyUrl =
          cert.verification_url ||
          buildCertificateVerificationUrl(
            cert
          );


        item.innerHTML = `

          <div>

            <h3>
              ${escapeHtml(type)}
            </h3>

            <div class="certificate-meta">

              Certificate No:
              ${escapeHtml(
                cert.certificate_no ||
                "--"
              )}

              <br>

              Certificate ID:
              ${escapeHtml(
                cert.certificate_id ||
                "--"
              )}

              <br>

              Issue Date:
              ${escapeHtml(
                formatDate(
                  cert.issue_date
                )
              )}

              <br>

              Status:
              ${escapeHtml(
                cert.status ||
                "--"
              )}

              ${
                cert.course_name_snapshot
                  ? `
                    <br>
                    Course:
                    ${escapeHtml(
                      cert.course_name_snapshot
                    )}
                  `
                  : ""
              }

            </div>

          </div>


          <div class="certificate-actions">

            ${
              verifyUrl
                ? `
                  <a
                    class="primary-btn"
                    href="${escapeAttribute(
                      verifyUrl
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Verify
                  </a>
                `
                : ""
            }


            ${
              cert.pdf_url
                ? `
                  <a
                    class="secondary-btn"
                    href="${escapeAttribute(
                      cert.pdf_url
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    PDF
                  </a>
                `
                : ""
            }


            ${
              cert.certificate_url
                ? `
                  <a
                    class="secondary-btn"
                    href="${escapeAttribute(
                      cert.certificate_url
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Document
                  </a>
                `
                : ""
            }

          </div>

        `;


        list.appendChild(item);

      }
    );

  }

  catch (error) {

    console.error(
      "loadCertificates error:",
      error
    );

  }

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications(
  studentId
) {

  try {

    const {
      data: notifications,
      error
    } =
      await supabaseClient
        .from("student_notifications")
        .select(`
          id,
          title,
          message,
          notification_type,
          is_read,
          created_at,
          read_at
        `)
        .eq(
          "student_id",
          studentId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Notifications error:",
        error
      );


      if ($("notificationsList")) {

        $("notificationsList")
          .innerHTML = `
            <div class="empty-message">
              Unable to load notifications.
            </div>
          `;

      }


      return;
    }


    const rows =
      notifications || [];


    const unread =
      rows.filter(
        item =>
          !item.is_read
      ).length;


    if ($("notificationsCount")) {

      $("notificationsCount")
        .textContent =
        unread;

    }


    const list =
      $("notificationsList");


    if (!list) {
      return;
    }


    list.innerHTML = "";


    if (!rows.length) {

      list.innerHTML = `
        <div class="empty-message">
          No notifications yet.
        </div>
      `;

      return;
    }


    rows.forEach(
      notification => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          `notification ${
            notification.is_read
              ? ""
              : "unread"
          }`;


        item.innerHTML = `

          <h3>
            ${escapeHtml(
              notification.title ||
              "Notification"
            )}
          </h3>

          <p>
            ${escapeHtml(
              notification.message ||
              ""
            )}
          </p>

          <small>

            ${escapeHtml(
              formatDateTime(
                notification.created_at
              )
            )}

            ${
              notification.is_read
                ? ""
                : " • Unread"
            }

          </small>

        `;


        if (
          !notification.is_read
        ) {

          item.style.cursor =
            "pointer";


          item.addEventListener(
            "click",
            () =>
              markNotificationRead(
                notification.id
              )
          );

        }


        list.appendChild(item);

      }
    );

  }

  catch (error) {

    console.error(
      "loadNotifications error:",
      error
    );

  }

}


/* =========================================================
   MARK ONE NOTIFICATION READ
   ========================================================= */

async function markNotificationRead(
  notificationId
) {

  try {

    const {
      error
    } =
      await supabaseClient
        .from(
          "student_notifications"
        )
        .update({
          is_read: true,
          read_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          notificationId
        );


    if (error) {
      throw error;
    }


    const {
      data
    } =
      await supabaseClient
        .auth
        .getSession();


    const session =
      data?.session;


    if (!session?.user) {
      return;
    }


    const student =
      await getCurrentStudent(
        session.user
      );


    if (student) {

      await loadNotifications(
        student.id
      );

    }

  }

  catch (error) {

    console.error(
      "markNotificationRead error:",
      error
    );

  }

}


/* =========================================================
   MARK ALL NOTIFICATIONS READ
   ========================================================= */

$("markAllReadBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        const {
          data
        } =
          await supabaseClient
            .auth
            .getSession();


        const session =
          data?.session;


        if (!session?.user) {

          redirectToLogin();

          return;
        }


        const student =
          await getCurrentStudent(
            session.user
          );


        if (!student) {
          return;
        }


        const {
          error
        } =
          await supabaseClient
            .from(
              "student_notifications"
            )
            .update({
              is_read: true,
              read_at:
                new Date().toISOString()
            })
            .eq(
              "student_id",
              student.id
            )
            .eq(
              "is_read",
              false
            );


        if (error) {
          throw error;
        }


        await loadNotifications(
          student.id
        );

      }

      catch (error) {

        console.error(
          "Mark all read error:",
          error
        );

      }

    }
  );


/* =========================================================
   LOGOUT
   ========================================================= */

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await supabaseClient
          .auth
          .signOut();

      }

      finally {

        redirectToLogin();

      }

    }
  );


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth
  .onAuthStateChange(
    (event, session) => {

      if (
        event === "SIGNED_OUT" ||
        !session
      ) {

        redirectToLogin();

      }

    }
  );


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToLogin() {

  window.location.href =
    "student-login.html";

}


/* =========================================================
   LOADING
   ========================================================= */

function showPortalLoading(
  message
) {

  if ($("portalLoading")) {

    const title =
      $("portalLoading")
        .querySelector("h3");


    const paragraph =
      $("portalLoading")
        .querySelector("p");


    if (title) {

      title.textContent =
        message;

    }


    if (paragraph) {

      paragraph.textContent =
        "Please wait.";

    }

  }

}


/* =========================================================
   FATAL ERROR
   ========================================================= */

function showFatalError(
  message
) {

  if (!$("portalLoading")) {
    return;
  }


  $("portalLoading").innerHTML = `

    <div style="
      max-width:520px;
      padding:30px;
      text-align:center;
      margin:auto;
    ">

      <div style="
        font-size:45px;
        margin-bottom:15px;
      ">
        🔐
      </div>

      <h2 style="
        color:#0B1E63;
        margin-bottom:10px;
      ">
        Student Portal
      </h2>

      <p style="
        color:#6B7280;
        line-height:1.6;
      ">
        ${escapeHtml(message)}
      </p>

      <button
        onclick="window.location.href='student-login.html'"
        style="
          margin-top:15px;
          border:0;
          background:#0B1E63;
          color:white;
          padding:11px 18px;
          border-radius:9px;
          cursor:pointer;
          font-weight:700;
        "
      >
        Back to Login
      </button>

    </div>

  `;

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "--";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value);

  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


/* =========================================================
   DATE + TIME
   ========================================================= */

function formatDateTime(
  value
) {

  if (!value) {
    return "--";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value);

  }


  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   SCORE
   ========================================================= */

function formatScore(
  score,
  maxScore
) {

  if (
    score === null ||
    score === undefined
  ) {

    return "--";

  }


  if (
    maxScore === null ||
    maxScore === undefined
  ) {

    return String(score);

  }


  return `${score} / ${maxScore}`;

}


/* =========================================================
   PERCENTAGE
   ========================================================= */

function formatPercentage(
  percentage,
  score,
  maxScore
) {

  if (
    percentage !== null &&
    percentage !== undefined
  ) {

    const number =
      Number(percentage);


    if (
      !Number.isNaN(number)
    ) {

      return `${number.toFixed(1)}%`;

    }

  }


  if (
    score !== null &&
    score !== undefined &&
    maxScore !== null &&
    maxScore !== undefined &&
    Number(maxScore) > 0
  ) {

    return `${(
      Number(score) /
      Number(maxScore) *
      100
    ).toFixed(1)}%`;

  }


  return "--";

}


/* =========================================================
   CERTIFICATE VERIFICATION URL
   ========================================================= */

function buildCertificateVerificationUrl(
  cert
) {

  if (
    cert.certificate_type ===
      "authentication_letter" &&
    cert.verify_code
  ) {

    return (
      `verify-auth.html?code=` +
      `${encodeURIComponent(
        cert.verify_code
      )}` +
      `&id=` +
      `${encodeURIComponent(
        cert.certificate_id || ""
      )}`
    );

  }


  if (cert.verify_code) {

    return (
      `verify.html?code=` +
      `${encodeURIComponent(
        cert.verify_code
      )}`
    );

  }


  return null;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );

}


/* =========================================================
   FRIENDLY ERROR
   ========================================================= */

function getFriendlyError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "failed to fetch"
    )
  ) {

    return (
      "Internet connection ama Supabase connection ayaa cilad qaba."
    );

  }


  if (
    message.includes(
      "permission denied"
    ) ||
    message.includes(
      "row-level security"
    )
  ) {

    return (
      "Access-ka database-ka ayaa diiday. Fadlan hubi Supabase RLS policies."
    );

  }


  if (
    message.includes(
      "relation"
    ) &&
    message.includes(
      "does not exist"
    )
  ) {

    return (
      "Database table-ka loo baahan yahay lama helin."
    );

  }


  return (
    error?.message ||
    "Unable to load Student Portal."
  );

}
