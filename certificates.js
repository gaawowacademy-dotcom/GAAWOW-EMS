const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let currentUser = null;

let certificates = [];

let institutions = [];

let students = [];

let courses = [];


document.addEventListener(
  "DOMContentLoaded",
  init
);


/* =========================
   INITIALIZE
========================= */

async function init() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) throw error;


    if (!session) {

      window.location.href =
        "index.html";

      return;
    }


    currentUser =
      session.user;


    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "full_name, role, institution_id, is_active"
        )
        .eq("id", currentUser.id)
        .single();


    if (profileError)
      throw profileError;


    if (
      !profile ||
      profile.role !== "super_admin" ||
      profile.is_active !== true
    ) {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.href =
        "index.html";

      return;
    }


    await loadInstitutions();

    await loadStudents();

    await loadCourses();

    await loadCertificates();


    setDefaultIssueDate();


  } catch (error) {

    console.error(error);

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select("id, name")
      .order("name");


  if (error) throw error;


  institutions =
    data || [];


  const select =
    document.getElementById(
      "institution"
    );


  const filter =
    document.getElementById(
      "filterInstitution"
    );


  select.innerHTML =
    `<option value="">
      Select Institution
    </option>`;


  filter.innerHTML =
    `<option value="">
      All Institutions
    </option>`;


  institutions.forEach(
    institution => {

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
  );


  select.addEventListener(
    "change",
    async () => {

      await loadStudentsForInstitution(
        select.value
      );

      await loadCoursesForInstitution(
        select.value
      );

    }
  );
}


/* =========================
   STUDENTS
========================= */

async function loadStudents() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("students")
      .select(
        `
        id,
        institution_id,
        student_id,
        full_name,
        email
        `
      )
      .order("full_name");


  if (error) throw error;


  students =
    data || [];


  const studentSelect =
    document.getElementById(
      "student"
    );


  studentSelect.addEventListener(
    "change",
    updateStudentSnapshot
  );
}


async function loadStudentsForInstitution(
  institutionId
) {

  const select =
    document.getElementById(
      "student"
    );


  select.innerHTML =
    `<option value="">
      Select Student
    </option>`;


  document.getElementById(
    "studentSnapshot"
  ).textContent =
    "Select a student";


  if (!institutionId)
    return;


  const filtered =
    students.filter(
      student =>
        student.institution_id ===
        institutionId
    );


  filtered.forEach(
    student => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        student.id;


      option.textContent =
        `${student.full_name} (${student.student_id || "No ID"})`;


      select.appendChild(
        option
      );
    }
  );
}


function updateStudentSnapshot() {

  const id =
    document.getElementById(
      "student"
    ).value;


  const student =
    students.find(
      item => item.id === id
    );


  document.getElementById(
    "studentSnapshot"
  ).textContent =
    student
      ? student.full_name
      : "Select a student";
}


/* =========================
   COURSES
========================= */

async function loadCourses() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("courses")
      .select(
        `
        id,
        institution_id,
        name,
        code
        `
      )
      .order("name");


  if (error) throw error;


  courses =
    data || [];


  document.getElementById(
    "course"
  ).addEventListener(
    "change",
    updateCourseSnapshot
  );
}


async function loadCoursesForInstitution(
  institutionId
) {

  const select =
    document.getElementById(
      "course"
    );


  select.innerHTML =
    `<option value="">
      No Course
    </option>`;


  document.getElementById(
    "courseSnapshot"
  ).textContent =
    "Select a course";


  if (!institutionId)
    return;


  const filtered =
    courses.filter(
      course =>
        course.institution_id ===
        institutionId
    );


  filtered.forEach(
    course => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        course.id;


      option.textContent =
        `${course.name} (${course.code || "No Code"})`;


      select.appendChild(
        option
      );
    }
  );
}


function updateCourseSnapshot() {

  const id =
    document.getElementById(
      "course"
    ).value;


  const course =
    courses.find(
      item => item.id === id
    );


  document.getElementById(
    "courseSnapshot"
  ).textContent =
    course
      ? course.name
      : "Select a course";
}


/* =========================
   CERTIFICATES
========================= */

async function loadCertificates() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("certificates")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) throw error;


  certificates =
    data || [];


  renderCertificates();

  updateStats();
}


/* =========================
   SAVE
========================= */

async function saveCertificate() {

  try {

    const dbId =
      document.getElementById(
        "certificateDbId"
      ).value;


    const institutionId =
      document.getElementById(
        "institution"
      ).value;


    const studentId =
      document.getElementById(
        "student"
      ).value;


    const courseId =
      document.getElementById(
        "course"
      ).value || null;


    const certificateNo =
      document.getElementById(
        "certificateNo"
      ).value.trim();


    const certificateId =
      document.getElementById(
        "certificateId"
      ).value.trim();


    const verifyCode =
      document.getElementById(
        "verifyCode"
      ).value.trim();


    const hashCode =
      document.getElementById(
        "hashCode"
      ).value.trim();


    const issueDate =
      document.getElementById(
        "issueDate"
      ).value;


    const expiryDate =
      document.getElementById(
        "expiryDate"
      ).value || null;


    const status =
      document.getElementById(
        "status"
      ).value;


    const certificateUrl =
      document.getElementById(
        "certificateUrl"
      ).value.trim() || null;


    const pdfUrl =
      document.getElementById(
        "pdfUrl"
      ).value.trim() || null;


    const qrUrl =
      document.getElementById(
        "qrUrl"
      ).value.trim() || null;


    /* VALIDATION */

    if (!institutionId) {

      alert(
        "Please select an institution."
      );

      return;
    }


    if (!studentId) {

      alert(
        "Please select a student."
      );

      return;
    }


    if (!certificateNo) {

      alert(
        "Please enter Certificate No."
      );

      return;
    }


    if (!certificateId) {

      alert(
        "Please enter Certificate ID."
      );

      return;
    }


    if (!verifyCode) {

      alert(
        "Please enter Verify Code."
      );

      return;
    }


    if (!hashCode) {

      alert(
        "Please enter Hash Code."
      );

      return;
    }


    if (!issueDate) {

      alert(
        "Please select Issue Date."
      );

      return;
    }


    const student =
      students.find(
        item =>
          item.id === studentId
      );


    const course =
      courses.find(
        item =>
          item.id === courseId
      );


    const payload = {

      institution_id:
        institutionId,

      student_id:
        studentId,

      course_id:
        courseId,

      certificate_no:
        certificateNo,

      certificate_id:
        certificateId,

      verify_code:
        verifyCode,

      hash_code:
        hashCode,

      issue_date:
        issueDate,

      expiry_date:
        expiryDate,

      status:
        status,

      certificate_url:
        certificateUrl,

      pdf_url:
        pdfUrl,

      qr_url:
        qrUrl,

      student_name_snapshot:
        student
          ? student.full_name
          : null,

      course_name_snapshot:
        course
          ? course.name
          : null,

      issued_by:
        currentUser.id
    };


    /* UPDATE */

    if (dbId) {

      const {
        error
      } =
        await supabaseClient
          .from("certificates")
          .update(payload)
          .eq("id", dbId);


      if (error) throw error;


      showMessage(
        "Certificate updated successfully.",
        "success"
      );

    }

    /* INSERT */

    else {

      const {
        error
      } =
        await supabaseClient
          .from("certificates")
          .insert([
            payload
          ]);


      if (error) throw error;


      showMessage(
        "Certificate created successfully.",
        "success"
      );
    }


    resetForm();

    await loadCertificates();


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

function renderCertificates() {

  const body =
    document.getElementById(
      "certificatesBody"
    );


  const search =
    document.getElementById(
      "searchInput"
    ).value
      .toLowerCase()
      .trim();


  const status =
    document.getElementById(
      "filterStatus"
    ).value;


  const institution =
    document.getElementById(
      "filterInstitution"
    ).value;


  const filtered =
    certificates.filter(
      certificate => {

        const student =
          students.find(
            item =>
              item.id ===
              certificate.student_id
          );


        const studentName =
          certificate.student_name_snapshot ||
          student?.full_name ||
          "";


        const courseName =
          certificate.course_name_snapshot ||
          "";


        const text = [

          certificate.certificate_no,

          certificate.certificate_id,

          certificate.verify_code,

          certificate.hash_code,

          studentName,

          courseName

        ]
          .join(" ")
          .toLowerCase();


        const searchMatch =
          !search ||
          text.includes(search);


        const statusMatch =
          !status ||
          certificate.status ===
            status;


        const institutionMatch =
          !institution ||
          certificate.institution_id ===
            institution;


        return (
          searchMatch &&
          statusMatch &&
          institutionMatch
        );
      }
    );


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="8" class="loading">
          No certificates found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    filtered.map(
      certificate => {

        const student =
          students.find(
            item =>
              item.id ===
              certificate.student_id
          );


        const studentName =
          certificate.student_name_snapshot ||
          student?.full_name ||
          "Unknown Student";


        const courseName =
          certificate.course_name_snapshot ||
          "-";


        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  certificate.certificate_no
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                studentName
              )}
            </td>

            <td>
              ${escapeHtml(
                courseName
              )}
            </td>

            <td>
              <span class="verify-code">
                ${escapeHtml(
                  certificate.verify_code
                )}
              </span>
            </td>

            <td>
              ${formatDate(
                certificate.issue_date
              )}
            </td>

            <td>
              ${
                certificate.expiry_date
                  ? formatDate(
                      certificate.expiry_date
                    )
                  : "No expiry"
              }
            </td>

            <td>
              <span
                class="badge ${
                  certificate.status
                }"
              >
                ${escapeHtml(
                  certificate.status
                )}
              </span>
            </td>

            <td>

              <button
                class="action-btn edit-btn"
                onclick="editCertificate('${certificate.id}')"
              >
                Edit
              </button>

              <button
                class="action-btn delete-btn"
                onclick="deleteCertificate('${certificate.id}')"
              >
                Delete
              </button>

            </td>

          </tr>
        `;

      }
    ).join("");
}


/* =========================
   EDIT
========================= */

async function editCertificate(id) {

  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if (!certificate)
    return;


  document.getElementById(
    "certificateDbId"
  ).value =
    certificate.id;


  document.getElementById(
    "institution"
  ).value =
    certificate.institution_id;


  await loadStudentsForInstitution(
    certificate.institution_id
  );


  await loadCoursesForInstitution(
    certificate.institution_id
  );


  document.getElementById(
    "student"
  ).value =
    certificate.student_id || "";


  document.getElementById(
    "course"
  ).value =
    certificate.course_id || "";


  updateStudentSnapshot();

  updateCourseSnapshot();


  document.getElementById(
    "certificateNo"
  ).value =
    certificate.certificate_no || "";


  document.getElementById(
    "certificateId"
  ).value =
    certificate.certificate_id || "";


  document.getElementById(
    "verifyCode"
  ).value =
    certificate.verify_code || "";


  document.getElementById(
    "hashCode"
  ).value =
    certificate.hash_code || "";


  document.getElementById(
    "issueDate"
  ).value =
    certificate.issue_date || "";


  document.getElementById(
    "expiryDate"
  ).value =
    certificate.expiry_date || "";


  document.getElementById(
    "status"
  ).value =
    certificate.status || "valid";


  document.getElementById(
    "certificateUrl"
  ).value =
    certificate.certificate_url || "";


  document.getElementById(
    "pdfUrl"
  ).value =
    certificate.pdf_url || "";


  document.getElementById(
    "qrUrl"
  ).value =
    certificate.qr_url || "";


  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Certificate";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   DELETE
========================= */

async function deleteCertificate(id) {

  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if (!certificate)
    return;


  const confirmed =
    confirm(
      `Delete certificate ${certificate.certificate_no}?`
    );


  if (!confirmed)
    return;


  try {

    const {
      error
    } =
      await supabaseClient
        .from("certificates")
        .delete()
        .eq("id", id);


    if (error) throw error;


    showMessage(
      "Certificate deleted successfully.",
      "success"
    );


    await loadCertificates();


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

  document.getElementById(
    "certificateDbId"
  ).value = "";


  document.getElementById(
    "institution"
  ).value = "";


  document.getElementById(
    "student"
  ).innerHTML =
    `<option value="">
      Select Student
    </option>`;


  document.getElementById(
    "course"
  ).innerHTML =
    `<option value="">
      No Course
    </option>`;


  document.getElementById(
    "certificateNo"
  ).value = "";


  document.getElementById(
    "certificateId"
  ).value = "";


  document.getElementById(
    "verifyCode"
  ).value = "";


  document.getElementById(
    "hashCode"
  ).value = "";


  document.getElementById(
    "expiryDate"
  ).value = "";


  document.getElementById(
    "status"
  ).value = "valid";


  document.getElementById(
    "certificateUrl"
  ).value = "";


  document.getElementById(
    "pdfUrl"
  ).value = "";


  document.getElementById(
    "qrUrl"
  ).value = "";


  document.getElementById(
    "studentSnapshot"
  ).textContent =
    "Select a student";


  document.getElementById(
    "courseSnapshot"
  ).textContent =
    "Select a course";


  setDefaultIssueDate();


  document.getElementById(
    "formTitle"
  ).textContent =
    "Issue New Certificate";
}


/* =========================
   DEFAULT DATE
========================= */

function setDefaultIssueDate() {

  const now =
    new Date();


  const local =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
        60000
    )
      .toISOString()
      .slice(0, 10);


  document.getElementById(
    "issueDate"
  ).value =
    local;
}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    certificates.length;


  const valid =
    certificates.filter(
      certificate =>
        certificate.status ===
        "valid"
    ).length;


  const revoked =
    certificates.filter(
      certificate =>
        certificate.status ===
        "revoked"
    ).length;


  const expired =
    certificates.filter(
      certificate =>
        certificate.status ===
        "expired"
    ).length;


  document.getElementById(
    "totalCertificates"
  ).textContent =
    total;


  document.getElementById(
    "validCertificates"
  ).textContent =
    valid;


  document.getElementById(
    "revokedCertificates"
  ).textContent =
    revoked;


  document.getElementById(
    "expiredCertificates"
  ).textContent =
    expired;
}


/* =========================
   HELPERS
========================= */

function formatDate(value) {

  if (!value)
    return "-";


  const date =
    new Date(value);


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


function showMessage(
  message,
  type
) {

  const box =
    document.getElementById(
      "message"
    );


  box.textContent =
    message;


  box.className =
    "message " +
    (
      type === "success"
        ? "success-message"
        : "error-message"
    );


  box.style.display =
    "block";


  setTimeout(
    () => {
      box.style.display =
        "none";
    },
    5000
  );
}


function goBack() {

  window.location.href =
    "super-admin.html";
}
