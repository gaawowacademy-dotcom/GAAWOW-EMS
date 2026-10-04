"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT PORTAL
   VERSION 5.3
   =========================================================
   
   AUTH MODEL:
   Supabase Auth
        ↓
   students.auth_user_id
        ↓
   students.account_enabled
        ↓
   students.status

   IMPORTANT:
   This version does NOT depend on:
   - profiles
   - profile_id
   - get_my_student_id()

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
   HELPER
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
   INITIALIZE PORTAL
   ========================================================= */

async function initPortal() {

  try {

    showLoading(
      "Checking student account..."
    );


    /* -----------------------------------------------------
       1. GET AUTH SESSION
       ----------------------------------------------------- */

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth.getSession();


    if (sessionError) {

      console.error(
        "Session error:",
        sessionError
      );

      redirectToLogin();

      return;

    }


    const session =
      sessionData?.session;


    if (!session?.user) {

      redirectToLogin();

      return;

    }


    const user =
      session.user;


    /* -----------------------------------------------------
       2. FIND STUDENT USING AUTH USER ID
       ----------------------------------------------------- */

    showLoading(
      "Verifying student account..."
    );


    const {
      data: student,
      error: studentError
    } =
      await supabaseClient
        .from("students")
        .select(`
          id,
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
          account_enabled,
          auth_user_id,
          institution_id
        `)
        .eq(
          "auth_user_id",
          user.id
        )
        .maybeSingle();


    if (studentError) {

      console.error(
        "Student query error:",
        studentError
      );

      showFatalError(
        "Student account could not be verified."
      );

      return;

    }


    if (!student) {

      console.error(
        "No student found for auth user:",
        user.id
      );

      await safeSignOut();

      showFatalError(
        "Student record lama xiriirin account-kan. Fadlan la xiriir maamulka."
      );

      return;

    }


    /* -----------------------------------------------------
       3. VERIFY ACCOUNT ENABLED
       ----------------------------------------------------- */

    if (
      student.account_enabled !== true
    ) {

      await safeSignOut();

      showFatalError(
        "Student account-kan wali lama hawlgelin. Fadlan la xiriir maamulka."
      );

      return;

    }


    /* -----------------------------------------------------
       4. VERIFY STUDENT STATUS
       ----------------------------------------------------- */

    if (
      student.status &&
      String(student.status)
        .toLowerCase() !== "active"
    ) {

      await safeSignOut();

      showFatalError(
        "Student account-kan ma aha active."
      );

      return;

    }


    /* -----------------------------------------------------
       5. VERIFY AUTH LINK
       ----------------------------------------------------- */

    if (
      String(student.auth_user_id) !==
      String(user.id)
    ) {

      console.error(
        "Auth mismatch:",
        {
          studentAuthId:
            student.auth_user_id,

          sessionUserId:
            user.id
        }
      );

      await safeSignOut();

      showFatalError(
        "Student account verification failed."
      );

      return;

    }


    /* -----------------------------------------------------
       6. RENDER STUDENT
       ----------------------------------------------------- */

    renderStudent(
      student,
      user
    );


    /* -----------------------------------------------------
       7. LOAD PORTAL MODULES
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       8. SHOW PORTAL
       ----------------------------------------------------- */

    hideLoading();

    showPortal();


  } catch (error) {

    console.error(
      "Student Portal initialization error:",
      error
    );

    showFatalError(
      "Unable to load Student Portal. Fadlan mar kale isku day."
    );

  }

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


    /* -----------------------------------------------------
       SUBJECT IDS
       ----------------------------------------------------- */

    const subjectIds = [
      ...new Set(
        rows
          .map(
            row =>
              row.subject_id
          )
          .filter(Boolean)
      )
    ];


    /* -----------------------------------------------------
       EXAM IDS
       ----------------------------------------------------- */

    const examIds = [
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


    /* -----------------------------------------------------
       LOAD SUBJECTS
       ----------------------------------------------------- */

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


      if (response.error) {

        console.warn(
          "Subjects could not be loaded:",
          response.error
        );

      } else {

        subjects =
          response.data ||
          [];

      }

    }


    /* -----------------------------------------------------
       LOAD EXAMS
       ----------------------------------------------------- */

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


      if (response.error) {

        console.warn(
          "Exams could not be loaded:",
          response.error
        );

      } else {

        exams =
          response.data ||
          [];

      }

    }


    /* -----------------------------------------------------
       MAP DATA
       ----------------------------------------------------- */

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


    if (!body) return;


    body.innerHTML = "";


    /* -----------------------------------------------------
       RENDER RESULTS
       ----------------------------------------------------- */

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


        body.appendChild(
          tr
        );

      }
    );


    if ($("resultsMessage")) {

      $("resultsMessage")
        .classList
        .add("hidden");

    }


    if ($("resultsTable")) {

      $("resultsTable")
        .classList
        .remove("hidden");

    }


  } catch (error) {

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
      .classList
      .remove("hidden");

  }


  if ($("resultsTable")) {

    $("resultsTable")
      .classList
      .add("hidden");

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

      showCertificateMessage(
        "Unable to load certificates."
      );

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


    if (!list) return;


    list.innerHTML = "";


    if (!rows.length) {

      showCertificateMessage(
        "No certificates are available yet."
      );

      return;

    }


    if ($("certificatesMessage")) {

      $("certificatesMessage")
        .classList
        .add("hidden");

    }


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
              ${escapeHtml(
                type
              )}
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
                    rel="noopener noreferrer"
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
                    rel="noopener noreferrer"
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
                    rel="noopener noreferrer"
                  >
                    Document
                  </a>
                `
                : ""
            }

          </div>

        `;


        list.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      "loadCertificates error:",
      error
    );

    showCertificateMessage(
      "Unable to load certificates."
    );

  }

}


/* =========================================================
   CERTIFICATE MESSAGE
   ========================================================= */

function showCertificateMessage(
  message
) {

  if ($("certificatesMessage")) {

    $("certificatesMessage")
      .textContent =
      message;

    $("certificatesMessage")
      .classList
      .remove("hidden");

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
        .from(
          "student_notifications"
        )
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

      showNotificationError();

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


    if (!list) return;


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
                notification.id,
                studentId
              )
          );

        }


        list.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      "loadNotifications error:",
      error
    );

    showNotificationError();

  }

}


/* =========================================================
   NOTIFICATION ERROR
   ========================================================= */

function showNotificationError() {

  if ($("notificationsList")) {

    $("notificationsList")
      .innerHTML = `
        <div class="empty-message">
          Unable to load notifications.
        </div>
      `;

  }

}


/* =========================================================
   MARK ONE NOTIFICATION READ
   ========================================================= */

async function markNotificationRead(
  notificationId,
  studentId
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
        )
        .eq(
          "student_id",
          studentId
        );


    if (error) {

      console.error(
        "Mark notification error:",
        error
      );

      return;

    }


    await loadNotifications(
      studentId
    );


  } catch (error) {

    console.error(
      error
    );

  }

}


/* =========================================================
   MARK ALL READ
   ========================================================= */

$("markAllReadBtn")?.addEventListener(
  "click",
  async () => {

    try {

      const {
        data: sessionData
      } =
        await supabaseClient.auth.getSession();


      const user =
        sessionData?.session?.user;


      if (!user) {

        redirectToLogin();

        return;

      }


      const {
        data: student,
        error: studentError
      } =
        await supabaseClient
          .from("students")
          .select("id")
          .eq(
            "auth_user_id",
            user.id
          )
          .maybeSingle();


      if (
        studentError ||
        !student
      ) {

        console.error(
          studentError
        );

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

        console.error(
          "Mark all read error:",
          error
        );

        return;

      }


      await loadNotifications(
        student.id
      );


    } catch (error) {

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

$("logoutBtn")?.addEventListener(
  "click",
  async () => {

    try {

      $("logoutBtn").disabled =
        true;


      await supabaseClient.auth.signOut();


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      redirectToLogin();

    }

  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (
    event,
    session
  ) => {

    if (
      event === "SIGNED_OUT" ||
      !session
    ) {

      redirectToLogin();

    }

  }
);


/* =========================================================
   SAFE SIGN OUT
   ========================================================= */

async function safeSignOut() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.warn(
      "Sign out warning:",
      error
    );

  }

}


/* =========================================================
   REDIRECT TO STUDENT LOGIN
   ========================================================= */

function redirectToLogin() {

  window.location.href =
    "student-login.html";

}


/* =========================================================
   SHOW PORTAL
   ========================================================= */

function showPortal() {

  if ($("portalLoading")) {

    $("portalLoading")
      .classList
      .add("hidden");

  }


  if ($("portalApp")) {

    $("portalApp")
      .classList
      .remove("hidden");

  }

}


/* =========================================================
   SHOW LOADING
   ========================================================= */

function showLoading(
  message
) {

  const loading =
    $("portalLoading");


  if (!loading) return;


  const heading =
    loading.querySelector(
      "h3"
    );


  const paragraph =
    loading.querySelector(
      "p"
    );


  if (heading) {

    heading.textContent =
      "Loading Student Portal...";

  }


  if (paragraph) {

    paragraph.textContent =
      message ||
      "Please wait.";

  }

}


/* =========================================================
   HIDE LOADING
   ========================================================= */

function hideLoading() {

  if ($("portalLoading")) {

    $("portalLoading")
      .classList
      .add("hidden");

  }

}


/* =========================================================
   FATAL ERROR
   ========================================================= */

function showFatalError(
  message
) {

  const loading =
    $("portalLoading");


  if (!loading) {

    alert(message);

    return;

  }


  loading.innerHTML = `

    <div
      style="
        max-width:520px;
        padding:30px;
        text-align:center;
        margin:auto;
      "
    >

      <div
        style="
          font-size:45px;
          margin-bottom:15px;
        "
      >
        🔐
      </div>


      <h2
        style="
          color:#0B1E63;
          margin-bottom:10px;
        "
      >
        Student Portal
      </h2>


      <p
        style="
          color:#6B7280;
          line-height:1.6;
        "
      >
        ${escapeHtml(
          message
        )}
      </p>


      <button
        type="button"
        onclick="
          window.location.href='student-login.html'
        "
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
   FORMAT DATE
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
   FORMAT DATE TIME
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
   FORMAT SCORE
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
   FORMAT PERCENTAGE
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
      Number(
        percentage
      );


    if (
      Number.isFinite(
        number
      )
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
        cert.certificate_id ||
        ""
      )}`
    );

  }


  if (
    cert.verify_code
  ) {

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
   END
   ========================================================= */
