/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.5
   ---------------------------------------------------------
   FLOW:

   Logged User
      ↓
   profiles
      ↓
   role / institution
      ↓
   institutions
      ↓
   students
      ↓
   enrollments
      ↓
   courses
      ↓
   certificate

   IMPORTANT:
   - Super Admin can select Institution A/B
   - School Admin / Teacher gets own Institution
   - Students are filtered by Institution
   - No hard-coded institution
========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

/*
   IMPORTANT:
   Geli ANON / PUBLIC KEY-gaaga saxda ah halkan.

   HA GELIN service_role key.
*/
const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


let supabaseClient = null;


/* =========================================================
   2. GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let institutionsCache = [];
let studentsCache = [];
let enrollmentsCache = [];
let coursesCache = [];

let selectedInstitution = null;
let selectedStudent = null;
let selectedEnrollment = null;
let selectedCourse = null;

let templateImage = null;
let studentImage = null;
let generatedCertificate = null;

const TEMPLATE_PATH = "certificate-template.png";

const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 1024;


/* =========================================================
   3. SUPABASE INITIALIZATION
========================================================= */

function initializeSupabase() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    throw new Error(
      "Supabase JavaScript library lama load-gareyn."
    );
  }

  if (
    !SUPABASE_KEY ||
    SUPABASE_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    throw new Error(
      "SUPABASE_KEY wali lama gelin. Geli anon/public key-gaaga saxda ah."
    );
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  return supabaseClient;
}


/* =========================================================
   4. DOM HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {

  const element = $(id);

  if (!element) {
    return "";
  }

  return String(
    element.value || ""
  ).trim();
}

function setValue(id, value) {

  const element = $(id);

  if (element) {
    element.value = value ?? "";
  }
}


/* =========================================================
   5. MESSAGE
========================================================= */

function showMessage(
  message,
  type = "info"
) {

  const box = $("message");

  if (!box) {
    console.log(message);
    return;
  }

  box.className =
    "message " + type;

  box.textContent =
    message;

  box.style.display =
    "block";
}

function hideMessage() {

  const box =
    $("message");

  if (!box) return;

  box.style.display =
    "none";

  box.textContent =
    "";

  box.className =
    "message";
}


/* =========================================================
   6. SESSION / PROFILE
========================================================= */

async function loadCurrentUser() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  currentUser =
    data?.session?.user || null;

  if (!currentUser) {

    throw new Error(
      "Login session lama helin. Fadlan marka hore login samee."
    );
  }

  return currentUser;
}


/* =========================================================
   7. LOAD PROFILE
========================================================= */

async function loadCurrentProfile() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id
      `)
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (error) {

    console.error(
      "Profile query error:",
      error
    );

    throw error;
  }

  if (!data) {

    throw new Error(
      "Profile-ka user-kan lama helin."
    );
  }

  currentProfile =
    data;

  console.log(
    "Current profile:",
    currentProfile
  );

  return currentProfile;
}


/* =========================================================
   8. CREATE INSTITUTION SELECTOR
========================================================= */

function createInstitutionSelector() {

  const existing =
    $("institution_select");

  if (existing) {
    return existing;
  }

  const studentSelect =
    $("student_select");

  if (!studentSelect) {
    return null;
  }

  const field =
    document.createElement("div");

  field.className =
    "field";

  field.innerHTML = `
    <label for="institution_select">
      Institution
    </label>

    <select id="institution_select">
      <option value="">
        Loading institutions...
      </option>
    </select>
  `;

  /*
    Insert before Student field.
  */

  const studentField =
    studentSelect.closest(".field");

  if (studentField) {

    studentField.parentNode.insertBefore(
      field,
      studentField
    );

  } else {

    studentSelect.parentNode.insertBefore(
      field,
      studentSelect
    );
  }

  return $("institution_select");
}


/* =========================================================
   9. POPULATE SELECT
========================================================= */

function populateSelect(
  selectId,
  items,
  placeholder
) {

  const select =
    $(selectId);

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const first =
    document.createElement("option");

  first.value =
    "";

  first.textContent =
    placeholder || "Select";

  select.appendChild(
    first
  );

  items.forEach(item => {

    const option =
      document.createElement("option");

    option.value =
      item.value;

    option.textContent =
      item.label;

    select.appendChild(
      option
    );
  });
}


/* =========================================================
   10. LOAD INSTITUTIONS
========================================================= */

async function loadInstitutions() {

  const select =
    createInstitutionSelector();

  if (!select) {
    throw new Error(
      "Institution selector lama abuuri karin."
    );
  }

  select.innerHTML =
    `<option value="">
       Loading institutions...
     </option>`;

  let query =
    supabaseClient
      .from("institutions")
      .select(`
        id,
        name
      `)
      .order(
        "name",
        {
          ascending: true
        }
      );


  /*
    Super Admin:
    sees all institutions.
  */

  if (
    currentProfile.role !==
    "super_admin"
  ) {

    if (
      !currentProfile.institution_id
    ) {

      throw new Error(
        "User-kan institution_id ma laha."
      );
    }

    query =
      query.eq(
        "id",
        currentProfile.institution_id
      );
  }


  const {
    data,
    error
  } =
    await query;


  if (error) {

    console.error(
      "Institutions error:",
      error
    );

    throw error;
  }


  institutionsCache =
    data || [];


  populateSelect(
    "institution_select",

    institutionsCache.map(
      institution => ({
        value:
          institution.id,

        label:
          institution.name
      })
    ),

    "Select Institution"
  );


  /*
    Non-super-admin:
    automatically select own institution.
  */

  if (
    currentProfile.role !==
    "super_admin"
  ) {

    const select =
      $("institution_select");

    select.value =
      currentProfile.institution_id;

    selectedInstitution =
      institutionsCache.find(
        institution =>
          institution.id ===
          currentProfile.institution_id
      );

    await loadStudents();
  }


  /*
    Super Admin:
    waits for manual institution selection.
  */

  if (
    currentProfile.role ===
    "super_admin"
  ) {

    showMessage(
      "Super Admin: marka hore dooro Institution.",
      "info"
    );
  }
}


/* =========================================================
   11. LOAD STUDENTS
========================================================= */

async function loadStudents() {

  const institutionId =
    getValue(
      "institution_select"
    );


  if (!institutionId) {

    studentsCache = [];

    populateSelect(
      "student_select",
      [],
      "Select Institution first"
    );

    return;
  }


  selectedInstitution =
    institutionsCache.find(
      institution =>
        String(institution.id) ===
        String(institutionId)
    );


  const studentSelect =
    $("student_select");

  if (studentSelect) {

    studentSelect.innerHTML =
      `<option value="">
        Loading students...
       </option>`;
  }


  try {

    /*
      IMPORTANT:
      Filter institution directly.
      This prevents Student A/B mixing.
    */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("students")
        .select(`
          id,
          institution_id,
          profile_id,
          student_id,
          full_name,
          gender,
          date_of_birth,
          phone,
          email,
          address,
          photo_url,
          admission_date,
          status
        `)
        .eq(
          "institution_id",
          institutionId
        )
        .order(
          "full_name",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Students Supabase error:",
        error
      );

      throw error;
    }


    studentsCache =
      data || [];


    populateSelect(

      "student_select",

      studentsCache.map(
        student => ({

          value:
            student.id,

          label:
            `${student.full_name || "Unnamed Student"} — ${
              student.student_id || ""
            }`

        })
      ),

      studentsCache.length
        ? "Select Student"
        : "No students found"
    );


    console.log(
      "Students loaded:",
      studentsCache
    );


    if (
      studentsCache.length === 0
    ) {

      showMessage(
        `Institution-kan "${selectedInstitution?.name || ""}" students kuma jiraan.`,
        "info"
      );

    } else {

      showMessage(
        `${studentsCache.length} student(s) loaded — ${selectedInstitution?.name || ""}`,
        "success"
      );
    }


  } catch (error) {

    console.error(
      "loadStudents error:",
      error
    );


    populateSelect(
      "student_select",
      [],
      "Students unavailable"
    );


    showMessage(
      "Students lama soo dejin. " +
      (
        error.message ||
        "Hubi Supabase/RLS."
      ),
      "error"
    );
  }
}


/* =========================================================
   12. INSTITUTION CHANGE
========================================================= */

async function handleInstitutionChange() {

  const institutionId =
    getValue(
      "institution_select"
    );

  selectedInstitution =
    institutionsCache.find(
      institution =>
        String(institution.id) ===
        String(institutionId)
    ) || null;


  /*
    Reset student/course
  */

  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  studentsCache =
    [];

  enrollmentsCache =
    [];

  coursesCache =
    [];


  setValue(
    "full_name",
    ""
  );

  setValue(
    "student_id",
    ""
  );

  setValue(
    "date_started",
    ""
  );

  setValue(
    "date_completed",
    ""
  );


  const photo =
    $("student_photo");

  if (photo) {

    photo.style.display =
      "none";

    photo.removeAttribute(
      "src"
    );
  }


  populateSelect(
    "course_select",
    [],
    "Select student first"
  );


  if (!institutionId) {

    populateSelect(
      "student_select",
      [],
      "Select Institution first"
    );

    drawCertificate();

    return;
  }


  await loadStudents();

  drawCertificate();
}


/* =========================================================
   13. STUDENT CHANGE
========================================================= */

async function handleStudentChange() {

  const studentId =
    getValue(
      "student_select"
    );


  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;


  setValue(
    "full_name",
    ""
  );

  setValue(
    "student_id",
    ""
  );

  setValue(
    "date_started",
    ""
  );

  setValue(
    "date_completed",
    ""
  );


  populateSelect(
    "course_select",
    [],
    "Loading courses..."
  );


  if (!studentId) {

    drawCertificate();

    return;
  }


  selectedStudent =
    studentsCache.find(
      student =>
        String(student.id) ===
        String(studentId)
    );


  if (!selectedStudent) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }


  setValue(
    "full_name",
    selectedStudent.full_name
  );

  setValue(
    "student_id",
    selectedStudent.student_id
  );


  loadStudentPhoto(
    selectedStudent.photo_url
  );


  generateCertificateIdentifiers();


  await loadStudentEnrollments(
    selectedStudent
  );


  drawCertificate();
}


/* =========================================================
   14. LOAD ENROLLMENTS
========================================================= */

async function loadStudentEnrollments(
  student
) {

  enrollmentsCache =
    [];


  try {

    /*
      Primary:
      students.id UUID
    */

    let result =
      await supabaseClient
        .from("enrollments")
        .select(`
          id,
          student_id,
          course_id,
          institution_id,
          status,
          enrollment_date,
          start_date,
          completed_date,
          completion_date
        `)
        .eq(
          "student_id",
          student.id
        );


    /*
      Fallback:
      public student_id
      e.g. TEST-STUDENT-A
    */

    if (
      result.error ||
      !result.data ||
      result.data.length === 0
    ) {

      if (
        student.student_id
      ) {

        result =
          await supabaseClient
            .from("enrollments")
            .select(`
              id,
              student_id,
              course_id,
              institution_id,
              status,
              enrollment_date,
              start_date,
              completed_date,
              completion_date
            `)
            .eq(
              "student_id",
              student.student_id
            );
      }
    }


    if (result.error) {

      throw result.error;
    }


    enrollmentsCache =
      result.data || [];


    if (
      enrollmentsCache.length === 0
    ) {

      populateSelect(
        "course_select",
        [],
        "No enrollment found"
      );

      showMessage(
        "Student-kan enrollment looma helin.",
        "info"
      );

      return;
    }


    await loadCourses();
  }

  catch (error) {

    console.error(
      "Enrollment error:",
      error
    );

    populateSelect(
      "course_select",
      [],
      "Enrollment unavailable"
    );

    showMessage(
      "Enrollment lama soo dejin: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
   15. LOAD COURSES
========================================================= */

async function loadCourses() {

  const courseIds =
    [
      ...new Set(
        enrollmentsCache
          .map(
            enrollment =>
              enrollment.course_id
          )
          .filter(Boolean)
      )
    ];


  if (
    courseIds.length === 0
  ) {

    populateSelect(
      "course_select",
      [],
      "No course linked"
    );

    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("courses")
      .select(`
        id,
        institution_id,
        name,
        code,
        description,
        is_active
      `)
      .in(
        "id",
        courseIds
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Courses error:",
      error
    );

    throw error;
  }


  coursesCache =
    data || [];


  populateSelect(

    "course_select",

    coursesCache.map(
      course => ({

        value:
          course.id,

        label:
          `${course.name || "Unnamed Course"}${
            course.code
              ? " — " + course.code
              : ""
          }`

      })
    ),

    coursesCache.length
      ? "Select Course"
      : "No courses found"
  );


  if (
    coursesCache.length === 1
  ) {

    const select =
      $("course_select");

    select.value =
      coursesCache[0].id;

    await handleCourseChange();
  }
}


/* =========================================================
   16. COURSE CHANGE
========================================================= */

async function handleCourseChange() {

  const courseId =
    getValue(
      "course_select"
    );


  selectedCourse =
    coursesCache.find(
      course =>
        String(course.id) ===
        String(courseId)
    ) || null;


  selectedEnrollment =
    enrollmentsCache.find(
      enrollment =>
        String(enrollment.course_id) ===
        String(courseId)
    ) || null;


  if (!selectedCourse) {

    setValue(
      "date_started",
      ""
    );

    setValue(
      "date_completed",
      ""
    );

    drawCertificate();

    return;
  }


  if (selectedEnrollment) {

    const started =
      selectedEnrollment.start_date ||
      selectedEnrollment.enrollment_date ||
      "";

    const completed =
      selectedEnrollment.completed_date ||
      selectedEnrollment.completion_date ||
      "";


    setValue(
      "date_started",
      normalizeDateInput(
        started
      )
    );

    setValue(
      "date_completed",
      normalizeDateInput(
        completed
      ) || ""
    );


    if (
      !getValue("issue_date")
    ) {

      setValue(
        "issue_date",
        normalizeDateInput(
          completed
        ) || todayISO()
      );
    }
  }


  generateCertificateIdentifiers();

  drawCertificate();


  showMessage(
    `Course selected: ${selectedCourse.name}`,
    "success"
  );
}


/* =========================================================
   17. STUDENT PHOTO
========================================================= */

function loadStudentPhoto(
  url
) {

  studentImage =
    null;

  const preview =
    $("student_photo");


  if (!url) {

    if (preview) {
      preview.style.display =
        "none";
    }

    return;
  }


  const img =
    new Image();

  img.crossOrigin =
    "anonymous";


  img.onload = () => {

    studentImage =
      img;

    if (preview) {

      preview.src =
        url;

      preview.style.display =
        "block";
    }

    drawCertificate();
  };


  img.onerror = () => {

    console.warn(
      "Student photo could not be loaded."
    );

    studentImage =
      null;

    if (preview) {
      preview.style.display =
        "none";
    }

    drawCertificate();
  };


  img.src =
    url;
}


/* =========================================================
   18. DATE HELPERS
========================================================= */

function todayISO() {

  const date =
    new Date();

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(2, "0"),

    String(
      date.getDate()
    ).padStart(2, "0")

  ].join("-");
}


function normalizeDateInput(
  value
) {

  if (!value) {
    return "";
  }

  const stringValue =
    String(value);


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      stringValue
    )
  ) {

    return stringValue;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";
  }


  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(2, "0"),

    String(
      date.getDate()
    ).padStart(2, "0")

  ].join("-");
}


function formatDate(
  value
) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;
  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );
}


/* =========================================================
   19. CERTIFICATE IDS
========================================================= */

function randomCode(
  length = 6
) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let output =
    "";

  for (
    let i = 0;
    i < length;
    i++
  ) {

    output +=
      chars.charAt(
        Math.floor(
          Math.random() *
          chars.length
        )
      );
  }

  return output;
}


function generateCertificateNo() {

  return `GA-CERT-${new Date().getFullYear()}-${randomCode(6)}`;
}


function generateCertificateId() {

  return `GA-${Date.now()}-${randomCode(4)}`;
}


function generateVerifyCode() {

  return `GA-V-${randomCode(10)}`;
}


function generateCertificateIdentifiers() {

  if (
    !getValue(
      "certificate_no"
    )
  ) {

    setValue(
      "certificate_no",
      generateCertificateNo()
    );
  }


  if (
    !getValue(
      "certificate_id"
    )
  ) {

    setValue(
      "certificate_id",
      generateCertificateId()
    );
  }


  if (
    !getValue(
      "verify_code"
    )
  ) {

    setValue(
      "verify_code",
      generateVerifyCode()
    );
  }


  if (
    !getValue(
      "issue_date"
    )
  ) {

    setValue(
      "issue_date",
      todayISO()
    );
  }
}


/* =========================================================
   20. TEMPLATE
========================================================= */

function loadTemplate() {

  return new Promise(
    (resolve, reject) => {

      const image =
        new Image();

      image.onload =
        () => {

          templateImage =
            image;

          resolve(image);
        };


      image.onerror =
        () => {

          reject(
            new Error(
              `Template lama helin: ${TEMPLATE_PATH}`
            )
          );
        };


      image.src =
        TEMPLATE_PATH;
    }
  );
}


/* =========================================================
   21. CANVAS
========================================================= */

function getCanvas() {

  return $("certificateCanvas");
}


function drawImageCover(
  ctx,
  image,
  x,
  y,
  width,
  height
) {

  if (!image) return;

  const iw =
    image.naturalWidth ||
    image.width;

  const ih =
    image.naturalHeight ||
    image.height;


  const scale =
    Math.max(
      width / iw,
      height / ih
    );


  const w =
    iw * scale;

  const h =
    ih * scale;


  ctx.drawImage(
    image,

    x +
      (width - w) / 2,

    y +
      (height - h) / 2,

    w,
    h
  );
}


function drawStudentPhoto(
  ctx
) {

  if (!studentImage) {
    return;
  }


  const x =
    112;

  const y =
    290;

  const size =
    190;


  ctx.save();

  ctx.beginPath();

  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );

  ctx.clip();


  drawImageCover(
    ctx,
    studentImage,
    x,
    y,
    size,
    size
  );


  ctx.restore();


  ctx.save();

  ctx.strokeStyle =
    "#D4AF37";

  ctx.lineWidth =
    5;

  ctx.beginPath();

  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.restore();
}


/* =========================================================
   22. TEXT
========================================================= */

function fitText(
  ctx,
  text,
  maxWidth,
  fontSize,
  weight = 700
) {

  let size =
    fontSize;


  while (
    size > 14
  ) {

    ctx.font =
      `${weight} ${size}px Arial`;

    if (
      ctx.measureText(text).width <=
      maxWidth
    ) {

      break;
    }

    size--;
  }


  return size;
}


function drawCenteredText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  weight = 700
) {

  if (!text) return;


  const size =
    fitText(
      ctx,
      text,
      maxWidth,
      fontSize,
      weight
    );


  ctx.font =
    `${weight} ${size}px Arial`;

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.fillStyle =
    "#111827";


  ctx.fillText(
    text,
    x,
    y
  );
}


/* =========================================================
   23. DRAW CERTIFICATE
========================================================= */

function drawCertificate() {

  const canvas =
    getCanvas();

  if (!canvas) {
    return;
  }


  canvas.width =
    CANVAS_WIDTH;

  canvas.height =
    CANVAS_HEIGHT;


  const ctx =
    canvas.getContext(
      "2d"
    );


  /*
    Background
  */

  if (templateImage) {

    drawImageCover(
      ctx,
      templateImage,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );

  } else {

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
  }


  /*
    Student photo
  */

  drawStudentPhoto(
    ctx
  );


  /*
    Certificate data
  */

  const studentName =
    getValue(
      "full_name"
    ) ||
    "STUDENT NAME";


  const courseName =
    selectedCourse?.name ||
    "COURSE NAME";


  const studentId =
    getValue(
      "student_id"
    );


  const certificateNo =
    getValue(
      "certificate_no"
    );


  const verifyCode =
    getValue(
      "verify_code"
    );


  const issueDate =
    getValue(
      "issue_date"
    );


  const completedDate =
    getValue(
      "date_completed"
    );


  const director =
    getValue(
      "director_name"
    );


  const academicHead =
    getValue(
      "academic_head_name"
    );


  /*
    NOTE:
    Coordinates-kaan waxaa lagu hagaajin karaa
    template-kaaga haddii loo baahdo.
  */


  drawCenteredText(
    ctx,
    studentName,
    768,
    455,
    1120,
    54,
    700
  );


  drawCenteredText(
    ctx,
    courseName,
    768,
    545,
    1050,
    38,
    700
  );


  if (studentId) {

    drawCenteredText(
      ctx,
      `Student ID: ${studentId}`,
      768,
      610,
      800,
      24,
      600
    );
  }


  if (completedDate) {

    drawCenteredText(
      ctx,
      `Completed: ${formatDate(completedDate)}`,
      768,
      655,
      800,
      22,
      500
    );
  }


  if (issueDate) {

    drawCenteredText(
      ctx,
      `Issued: ${formatDate(issueDate)}`,
      768,
      700,
      800,
      22,
      500
    );
  }


  if (certificateNo) {

    drawCenteredText(
      ctx,
      `Certificate No: ${certificateNo}`,
      250,
      900,
      430,
      20,
      600
    );
  }


  if (verifyCode) {

    drawCenteredText(
      ctx,
      `Verify Code: ${verifyCode}`,
      768,
      900,
      500,
      20,
      600
    );
  }


  if (director) {

    drawCenteredText(
      ctx,
      director,
      1175,
      835,
      350,
      22,
      700
    );
  }


  if (academicHead) {

    drawCenteredText(
      ctx,
      academicHead,
      365,
      835,
      350,
      22,
      700
    );
  }
}


/* =========================================================
   24. GENERATE
========================================================= */

function generateCertificate() {

  hideMessage();


  try {

    if (!selectedInstitution) {

      showMessage(
        "Fadlan dooro Institution.",
        "error"
      );

      return;
    }


    if (!selectedStudent) {

      showMessage(
        "Fadlan dooro Student.",
        "error"
      );

      return;
    }


    if (!selectedCourse) {

      showMessage(
        "Fadlan dooro Course.",
        "error"
      );

      return;
    }


    generateCertificateIdentifiers();

    drawCertificate();


    showMessage(
      "Certificate-ka waa la generate gareeyay.",
      "success"
    );

  }

  catch (error) {

    console.error(
      "Generate error:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   25. PREVIEW
========================================================= */

function previewCertificate() {

  generateCertificate();


  const stage =
    document.querySelector(
      ".stage"
    );


  if (stage) {

    stage.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   26. SAVE
========================================================= */

async function saveCertificate() {

  hideMessage();


  try {

    if (!selectedInstitution) {

      showMessage(
        "Institution lama dooran.",
        "error"
      );

      return;
    }


    if (!selectedStudent) {

      showMessage(
        "Student lama dooran.",
        "error"
      );

      return;
    }


    if (!selectedCourse) {

      showMessage(
        "Course lama dooran.",
        "error"
      );

      return;
    }


    generateCertificateIdentifiers();

    drawCertificate();


    const certificateNo =
      getValue(
        "certificate_no"
      );


    /*
      Check duplicate
    */

    const duplicate =
      await supabaseClient
        .from("certificates")
        .select(
          "id,certificate_no"
        )
        .eq(
          "certificate_no",
          certificateNo
        )
        .limit(1);


    if (
      duplicate.error
    ) {

      console.warn(
        "Duplicate check:",
        duplicate.error
      );
    }


    if (
      duplicate.data &&
      duplicate.data.length
    ) {

      showMessage(
        "Certificate No-kan horey ayuu u jiraa. Riix New.",
        "error"
      );

      return;
    }


    /*
      Known certificates fields
    */

    const payload = {

      institution_id:
        selectedInstitution.id,

      student_id:
        selectedStudent.id,

      course_id:
        selectedCourse.id,

      certificate_no:
        certificateNo,

      certificate_id:
        getValue(
          "certificate_id"
        ),

      verify_code:
        getValue(
          "verify_code"
        ),

      student_name:
        selectedStudent.full_name,

      course_name:
        selectedCourse.name,

      issue_date:
        getValue(
          "issue_date"
        ) || todayISO(),

      expiry_date:
        null,

      status:
        getValue(
          "status"
        ) || "valid"
    };


    console.log(
      "Certificate payload:",
      payload
    );


    const {
      data,
      error
    } =
      await supabaseClient
        .from("certificates")
        .insert(
          payload
        )
        .select()
        .single();


    if (error) {

      console.error(
        "Certificate insert error:",
        error
      );

      throw error;
    }


    generatedCertificate =
      data;


    showMessage(
      `Certificate waa la keydiyay — ${certificateNo}`,
      "success"
    );


  }

  catch (error) {

    console.error(
      "Save certificate error:",
      error
    );

    showMessage(
      "Save error: " +
      (
        error.message ||
        "Unknown error"
      ),
      "error"
    );
  }
}


/* =========================================================
   27. HD DOWNLOAD
========================================================= */

function downloadCertificate() {

  try {

    if (!selectedStudent) {

      showMessage(
        "Marka hore dooro Student.",
        "error"
      );

      return;
    }


    if (!selectedCourse) {

      showMessage(
        "Marka hore dooro Course.",
        "error"
      );

      return;
    }


    generateCertificateIdentifiers();

    drawCertificate();


    const canvas =
      getCanvas();


    const studentName =
      getValue(
        "full_name"
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


    const certificateNo =
      getValue(
        "certificate_no"
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


    const filename =
      `GAAWOW-Certificate-${studentName}-${certificateNo}.png`;


    canvas.toBlob(
      blob => {

        if (!blob) {

          showMessage(
            "HD PNG lama abuuri karin.",
            "error"
          );

          return;
        }


        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            "a"
          );


        link.href =
          url;

        link.download =
          filename;


        document.body.appendChild(
          link
        );


        link.click();

        link.remove();


        setTimeout(
          () => {
            URL.revokeObjectURL(
              url
            );
          },
          1000
        );


        showMessage(
          "HD Certificate waa la download-gareeyay.",
          "success"
        );

      },

      "image/png",

      1.0
    );

  }

  catch (error) {

    console.error(
      "Download error:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   28. NEW
========================================================= */

function newCertificate() {

  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  selectedInstitution =
    null;

  studentImage =
    null;


  studentsCache =
    [];

  enrollmentsCache =
    [];

  coursesCache =
    [];


  setValue(
    "institution_select",
    ""
  );


  populateSelect(
    "student_select",
    [],
    "Select Institution first"
  );


  populateSelect(
    "course_select",
    [],
    "Select student first"
  );


  setValue(
    "full_name",
    ""
  );

  setValue(
    "student_id",
    ""
  );

  setValue(
    "date_started",
    ""
  );

  setValue(
    "date_completed",
    ""
  );

  setValue(
    "certificate_no",
    ""
  );

  setValue(
    "certificate_id",
    ""
  );

  setValue(
    "verify_code",
    ""
  );

  setValue(
    "issue_date",
    todayISO()
  );


  setValue(
    "status",
    "graduated"
  );


  const photo =
    $("student_photo");


  if (photo) {

    photo.style.display =
      "none";

    photo.removeAttribute(
      "src"
    );
  }


  hideMessage();

  drawCertificate();
}


/* =========================================================
   29. EVENTS
========================================================= */

function bindEvents() {

  const institutionSelect =
    $("institution_select");


  if (institutionSelect) {

    institutionSelect.addEventListener(
      "change",
      handleInstitutionChange
    );
  }


  const studentSelect =
    $("student_select");


  if (studentSelect) {

    studentSelect.addEventListener(
      "change",
      handleStudentChange
    );
  }


  const courseSelect =
    $("course_select");


  if (courseSelect) {

    courseSelect.addEventListener(
      "change",
      handleCourseChange
    );
  }


  [
    "issue_date",
    "status",
    "director_name",
    "academic_head_name"
  ].forEach(
    id => {

      const element =
        $(id);


      if (!element) {
        return;
      }


      element.addEventListener(
        "input",
        drawCertificate
      );


      element.addEventListener(
        "change",
        drawCertificate
      );
    }
  );
}


/* =========================================================
   30. INITIALIZATION
========================================================= */

async function initCertificateGenerator() {

  try {

    console.log(
      "===================================="
    );

    console.log(
      "GAAWOW EMS Certificate V7.5"
    );

    console.log(
      "Initializing..."
    );

    console.log(
      "===================================="
    );


    /*
      Supabase
    */

    initializeSupabase();


    /*
      Session
    */

    await loadCurrentUser();


    console.log(
      "Logged user:",
      currentUser.email
    );


    /*
      Profile
    */

    await loadCurrentProfile();


    console.log(
      "Role:",
      currentProfile.role
    );


    console.log(
      "Institution:",
      currentProfile.institution_id
    );


    /*
      Template
    */

    try {

      await loadTemplate();

      console.log(
        "Certificate template loaded."
      );

    }

    catch (error) {

      console.error(
        "Template error:",
        error
      );

      showMessage(
        "certificate-template.png lama helin. Hubi inuu isla folder-ka ku jiro.",
        "error"
      );
    }


    /*
      Events
    */

    createInstitutionSelector();

    bindEvents();


    /*
      Date
    */

    if (
      !getValue(
        "issue_date"
      )
    ) {

      setValue(
        "issue_date",
        todayISO()
      );
    }


    /*
      Canvas
    */

    drawCertificate();


    /*
      Institutions
    */

    await loadInstitutions();


    console.log(
      "GAAWOW EMS Certificate V7.5 READY"
    );


  }

  catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "CERTIFICATE INITIALIZATION ERROR"
    );

    console.error(
      error
    );

    console.error(
      "===================================="
    );


    showMessage(
      "System error: " +
      (
        error.message ||
        "Unknown error"
      ),
      "error"
    );
  }
}


/* =========================================================
   31. GLOBAL FUNCTIONS
========================================================= */

window.generateCertificate =
  generateCertificate;

window.previewCertificate =
  previewCertificate;

window.saveCertificate =
  saveCertificate;

window.downloadCertificate =
  downloadCertificate;

window.newCertificate =
  newCertificate;


/* =========================================================
   32. START
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initCertificateGenerator
  );

} else {

  initCertificateGenerator();
}
