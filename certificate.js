/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.4
   DATABASE-SAFE / TEMPLATE-BASED VERSION

   HTML:
   certificate.html V7.4

   TEMPLATE:
   certificate-template.png
   Location:
   Same folder as certificate.html

   SUPABASE:
   https://mytyvqwrxnxpxnxpiicj.supabase.co
========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;

try {
  if (
    typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function"
  ) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  } else {
    console.error("Supabase library was not loaded.");
  }
} catch (error) {
  console.error("Supabase initialization error:", error);
}


/* =========================================================
   2. GLOBAL STATE
========================================================= */

let studentsCache = [];
let enrollmentsCache = [];
let coursesCache = [];

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
   3. DOM HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {
  const el = $(id);
  return el ? String(el.value || "").trim() : "";
}

function setValue(id, value) {
  const el = $(id);
  if (el) {
    el.value = value ?? "";
  }
}

function setSelectOptions(selectId, options, placeholder) {
  const select = $(selectId);

  if (!select) return;

  select.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder || "Select";
  select.appendChild(first);

  options.forEach(option => {
    const opt = document.createElement("option");

    opt.value = option.value;
    opt.textContent = option.label;

    select.appendChild(opt);
  });
}


/* =========================================================
   4. MESSAGE SYSTEM
========================================================= */

function showMessage(message, type = "info") {
  const box = $("message");

  if (!box) return;

  box.className = "message " + type;
  box.textContent = message;
  box.style.display = "block";
}

function hideMessage() {
  const box = $("message");

  if (!box) return;

  box.style.display = "none";
  box.textContent = "";
  box.className = "message";
}


/* =========================================================
   5. DATE HELPERS
========================================================= */

function todayISO() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}


/* =========================================================
   6. RANDOM / ID GENERATORS
========================================================= */

function randomUpper(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

function generateCertificateNo() {
  const year = new Date().getFullYear();

  return `GA-CERT-${year}-${randomUpper(6)}`;
}

function generateCertificateId() {
  return `GA-${Date.now()}-${randomUpper(4)}`;
}

function generateVerifyCode() {
  return `GA-V-${randomUpper(10)}`;
}


/* =========================================================
   7. SUPABASE CHECK
========================================================= */

function ensureSupabase() {
  if (!supabaseClient) {
    throw new Error(
      "Supabase lama bilaabin. Hubi Supabase CDN iyo SUPABASE_KEY."
    );
  }

  return true;
}


/* =========================================================
   8. LOAD TEMPLATE
========================================================= */

function loadTemplate() {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      templateImage = img;
      resolve(img);
    };

    img.onerror = () => {
      reject(
        new Error(
          `Certificate template lama helin: ${TEMPLATE_PATH}`
        )
      );
    };

    img.src = TEMPLATE_PATH;
  });
}


/* =========================================================
   9. LOAD STUDENTS
========================================================= */

async function loadStudents() {
  ensureSupabase();

  const select = $("student_select");

  if (select) {
    select.innerHTML =
      `<option value="">Loading students...</option>`;
  }

  try {
    const { data, error } = await supabaseClient
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
      .order("full_name", { ascending: true });

    if (error) {
      throw error;
    }

    studentsCache = data || [];

    const options = studentsCache.map(student => ({
      value: student.id,
      label:
        `${student.full_name || "Unnamed Student"}`
        + ` — ${student.student_id || student.id}`
    }));

    setSelectOptions(
      "student_select",
      options,
      "Select Student"
    );

    showMessage(
      `${studentsCache.length} student(s) loaded successfully.`,
      "success"
    );

  } catch (error) {
    console.error("loadStudents error:", error);

    setSelectOptions(
      "student_select",
      [],
      "Unable to load students"
    );

    showMessage(
      "Students lama soo dejin. Hubi Supabase/RLS.",
      "error"
    );
  }
}


/* =========================================================
   10. STUDENT SELECTION
========================================================= */

async function handleStudentChange() {
  const studentId = getValue("student_select");

  selectedStudent = null;
  selectedEnrollment = null;
  selectedCourse = null;

  setValue("full_name", "");
  setValue("student_id", "");
  setValue("date_started", "");
  setValue("date_completed", "");

  setSelectOptions(
    "course_select",
    [],
    "Loading courses..."
  );

  const photo = $("student_photo");

  if (photo) {
    photo.style.display = "none";
    photo.removeAttribute("src");
  }

  if (!studentId) {
    setSelectOptions(
      "course_select",
      [],
      "Select student first"
    );

    drawCertificate();
    return;
  }

  selectedStudent = studentsCache.find(
    student => String(student.id) === String(studentId)
  );

  if (!selectedStudent) {
    showMessage(
      "Student-ka la doortay lama helin.",
      "error"
    );
    return;
  }

  setValue(
    "full_name",
    selectedStudent.full_name || ""
  );

  setValue(
    "student_id",
    selectedStudent.student_id || ""
  );

  loadStudentPhoto(selectedStudent.photo_url);

  await loadStudentEnrollments(selectedStudent);

  generateCertificateIdentifiers();

  drawCertificate();
}


/* =========================================================
   11. LOAD STUDENT PHOTO
========================================================= */

function loadStudentPhoto(url) {
  const preview = $("student_photo");

  studentImage = null;

  if (!url || !preview) {
    if (preview) {
      preview.style.display = "none";
    }
    return;
  }

  const img = new Image();

  img.crossOrigin = "anonymous";

  img.onload = () => {
    studentImage = img;

    preview.src = url;
    preview.style.display = "block";

    drawCertificate();
  };

  img.onerror = () => {
    console.warn(
      "Student photo lama load gareyn:",
      url
    );

    if (preview) {
      preview.style.display = "none";
    }

    studentImage = null;
  };

  img.src = url;
}


/* =========================================================
   12. LOAD ENROLLMENTS
========================================================= */

async function loadStudentEnrollments(student) {
  ensureSupabase();

  try {
    /*
      parent/child structure:
      enrollments.student_id
      enrollments.course_id

      Haddii schema-gaaga uu isticmaalo profile_id
      fallback ayaa hoose lagu sameeyay.
    */

    let data = null;
    let error = null;

    const firstQuery = await supabaseClient
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
      .eq("student_id", student.id);

    data = firstQuery.data;
    error = firstQuery.error;

    /*
      Haddii student.id uusan ahayn enrollments.student_id,
      isku day student_id-ka public-ka ah.
    */

    if (
      error ||
      !data ||
      data.length === 0
    ) {
      if (student.student_id) {
        const fallbackQuery = await supabaseClient
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

        if (!fallbackQuery.error) {
          data = fallbackQuery.data;
          error = null;
        }
      }
    }

    if (error) {
      throw error;
    }

    enrollmentsCache = data || [];

    if (enrollmentsCache.length === 0) {
      setSelectOptions(
        "course_select",
        [],
        "No enrollment found"
      );

      showMessage(
        "Student-kan enrollment/course looma helin.",
        "info"
      );

      return;
    }

    await loadCoursesForEnrollments(
      enrollmentsCache
    );

  } catch (error) {
    console.error(
      "loadStudentEnrollments error:",
      error
    );

    setSelectOptions(
      "course_select",
      [],
      "Unable to load courses"
    );

    showMessage(
      "Enrollments lama soo dejin.",
      "error"
    );
  }
}


/* =========================================================
   13. LOAD COURSES
========================================================= */

async function loadCoursesForEnrollments(enrollments) {
  ensureSupabase();

  const courseIds = [
    ...new Set(
      enrollments
        .map(row => row.course_id)
        .filter(Boolean)
    )
  ];

  if (courseIds.length === 0) {
    setSelectOptions(
      "course_select",
      [],
      "No course linked"
    );

    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("courses")
      .select(`
        id,
        institution_id,
        name,
        code,
        description,
        is_active
      `)
      .in("id", courseIds)
      .order("name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    coursesCache = data || [];

    const options = coursesCache.map(course => ({
      value: course.id,
      label:
        `${course.name || "Unnamed Course"}`
        + (course.code
          ? ` — ${course.code}`
          : "")
    }));

    setSelectOptions(
      "course_select",
      options,
      "Select Course"
    );

    if (options.length === 1) {
      $("course_select").value =
        options[0].value;

      await handleCourseChange();
    }

  } catch (error) {
    console.error(
      "loadCoursesForEnrollments error:",
      error
    );

    setSelectOptions(
      "course_select",
      [],
      "Unable to load courses"
    );

    showMessage(
      "Courses lama soo dejin.",
      "error"
    );
  }
}


/* =========================================================
   14. COURSE SELECTION
========================================================= */

async function handleCourseChange() {
  const courseId = getValue("course_select");

  selectedEnrollment = null;
  selectedCourse = null;

  setValue("date_started", "");
  setValue("date_completed", "");

  if (!courseId) {
    drawCertificate();
    return;
  }

  selectedCourse = coursesCache.find(
    course => String(course.id) === String(courseId)
  );

  selectedEnrollment = enrollmentsCache.find(
    enrollment =>
      String(enrollment.course_id) === String(courseId)
  );

  if (!selectedEnrollment) {
    showMessage(
      "Enrollment-ka course-kan lama helin.",
      "error"
    );

    return;
  }

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
    normalizeDateInput(started)
  );

  setValue(
    "date_completed",
    normalizeDateInput(completed)
  );

  if (!getValue("issue_date")) {
    setValue(
      "issue_date",
      normalizeDateInput(completed) ||
      todayISO()
    );
  }

  generateCertificateIdentifiers();

  drawCertificate();

  showMessage(
    "Course iyo enrollment waa la doortay.",
    "success"
  );
}


/* =========================================================
   15. DATE NORMALIZER
========================================================= */

function normalizeDateInput(value) {
  if (!value) return "";

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}


/* =========================================================
   16. CERTIFICATE IDENTIFIERS
========================================================= */

function generateCertificateIdentifiers() {
  if (!getValue("certificate_no")) {
    setValue(
      "certificate_no",
      generateCertificateNo()
    );
  }

  if (!getValue("certificate_id")) {
    setValue(
      "certificate_id",
      generateCertificateId()
    );
  }

  if (!getValue("verify_code")) {
    setValue(
      "verify_code",
      generateVerifyCode()
    );
  }

  if (!getValue("issue_date")) {
    setValue(
      "issue_date",
      todayISO()
    );
  }
}


/* =========================================================
   17. CANVAS HELPERS
========================================================= */

function getCanvas() {
  return $("certificateCanvas");
}

function clearCanvas() {
  const canvas = getCanvas();

  if (!canvas) return null;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  return ctx;
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

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;

  const scale = Math.max(
    width / iw,
    height / ih
  );

  const sw = iw * scale;
  const sh = ih * scale;

  const dx =
    x + (width - sw) / 2;

  const dy =
    y + (height - sh) / 2;

  ctx.drawImage(
    image,
    dx,
    dy,
    sw,
    sh
  );
}

function drawImageContain(
  ctx,
  image,
  x,
  y,
  width,
  height
) {
  if (!image) return;

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;

  const scale = Math.min(
    width / iw,
    height / ih
  );

  const sw = iw * scale;
  const sh = ih * scale;

  const dx =
    x + (width - sw) / 2;

  const dy =
    y + (height - sh) / 2;

  ctx.drawImage(
    image,
    dx,
    dy,
    sw,
    sh
  );
}


/* =========================================================
   18. TEXT HELPERS
========================================================= */

function fitText(
  ctx,
  text,
  maxWidth,
  startingSize,
  fontFamily = "Arial"
) {
  let size = startingSize;

  while (
    size > 16 &&
    ctx.measureText(text).width > maxWidth
  ) {
    size -= 1;

    ctx.font =
      `700 ${size}px ${fontFamily}`;
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
  weight = 700,
  family = "Arial"
) {
  if (!text) return;

  let size = fontSize;

  ctx.font =
    `${weight} ${size}px ${family}`;

  size = fitText(
    ctx,
    text,
    maxWidth,
    size,
    family
  );

  ctx.font =
    `${weight} ${size}px ${family}`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    text,
    x,
    y
  );
}

function drawLeftText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  weight = 400,
  family = "Arial"
) {
  if (!text) return;

  let size = fontSize;

  ctx.font =
    `${weight} ${size}px ${family}`;

  size = fitText(
    ctx,
    text,
    maxWidth,
    size,
    family
  );

  ctx.font =
    `${weight} ${size}px ${family}`;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText(
    text,
    x,
    y
  );
}


/* =========================================================
   19. STUDENT PHOTO DRAWING
========================================================= */

function drawStudentPhoto(ctx) {
  if (!studentImage) return;

  /*
    Default photo position.
    Waxaa si fudud looga beddeli karaa halkan
    haddii template-ka booska sawirku ka duwan yahay.
  */

  const x = 112;
  const y = 290;
  const size = 190;

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );

  ctx.closePath();
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

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 5;

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
   20. CERTIFICATE DRAW
========================================================= */

function drawCertificate() {
  const canvas = getCanvas();

  if (!canvas) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = clearCanvas();

  if (!ctx) return;

  /*
    BACKGROUND TEMPLATE
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
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
  }

  /*
    STUDENT PHOTO
  */

  drawStudentPhoto(ctx);

  /*
    DATA
  */

  const studentName =
    getValue("full_name") ||
    "STUDENT NAME";

  const courseName =
    selectedCourse?.name ||
    "COURSE NAME";

  const studentId =
    getValue("student_id");

  const certificateNo =
    getValue("certificate_no");

  const certificateId =
    getValue("certificate_id");

  const verifyCode =
    getValue("verify_code");

  const issueDate =
    getValue("issue_date");

  const completedDate =
    getValue("date_completed");

  const director =
    getValue("director_name");

  const academicHead =
    getValue("academic_head_name");

  /*
    ---------------------------------------------------------
    IMPORTANT
    ---------------------------------------------------------
    These coordinates are intentionally separated so the
    certificate design can be adjusted without changing
    the database logic.

    If your PNG has different text spaces, only change
    these coordinates.
  */

  /*
    STUDENT NAME
  */

  drawCenteredText(
    ctx,
    studentName,
    768,
    455,
    1120,
    54,
    700,
    "Arial"
  );

  /*
    COURSE
  */

  drawCenteredText(
    ctx,
    courseName,
    768,
    545,
    1050,
    38,
    700,
    "Arial"
  );

  /*
    STUDENT ID
  */

  if (studentId) {
    drawCenteredText(
      ctx,
      `Student ID: ${studentId}`,
      768,
      610,
      800,
      24,
      600,
      "Arial"
    );
  }

  /*
    COMPLETION DATE
  */

  if (completedDate) {
    drawCenteredText(
      ctx,
      `Completed: ${formatDate(completedDate)}`,
      768,
      655,
      800,
      22,
      500,
      "Arial"
    );
  }

  /*
    ISSUE DATE
  */

  if (issueDate) {
    drawCenteredText(
      ctx,
      `Issued: ${formatDate(issueDate)}`,
      768,
      700,
      800,
      22,
      500,
      "Arial"
    );
  }

  /*
    CERTIFICATE NUMBER
  */

  if (certificateNo) {
    drawLeftText(
      ctx,
      `Certificate No: ${certificateNo}`,
      90,
      900,
      500,
      20,
      600,
      "Arial"
    );
  }

  /*
    VERIFY CODE
  */

  if (verifyCode) {
    drawCenteredText(
      ctx,
      `Verify Code: ${verifyCode}`,
      768,
      900,
      500,
      20,
      600,
      "Arial"
    );
  }

  /*
    SIGNATORIES
  */

  if (director) {
    drawCenteredText(
      ctx,
      director,
      1175,
      835,
      350,
      22,
      700,
      "Arial"
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
      700,
      "Arial"
    );
  }

  /*
    STATUS
  */

  const status =
    getValue("status");

  if (status) {
    drawCenteredText(
      ctx,
      status.toUpperCase(),
      768,
      950,
      400,
      18,
      700,
      "Arial"
    );
  }

  generatedCertificate = {
    student_id: selectedStudent?.id || null,
    course_id: selectedCourse?.id || null,
    enrollment_id:
      selectedEnrollment?.id || null,
    certificate_no: certificateNo,
    certificate_id: certificateId,
    verify_code: verifyCode
  };

  return canvas;
}


/* =========================================================
   21. GENERATE CERTIFICATE
========================================================= */

function generateCertificate() {
  hideMessage();

  try {
    if (!selectedStudent) {
      showMessage(
        "Fadlan marka hore dooro Student.",
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
      "Certificate-ka si guul leh ayaa loo generate gareeyay.",
      "success"
    );

  } catch (error) {
    console.error(
      "generateCertificate error:",
      error
    );

    showMessage(
      "Generate error: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   22. PREVIEW
========================================================= */

function previewCertificate() {
  try {
    generateCertificate();

    const stage =
      document.querySelector(".stage");

    if (stage) {
      stage.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  } catch (error) {
    console.error(
      "previewCertificate error:",
      error
    );
  }
}


/* =========================================================
   23. SAVE CERTIFICATE
========================================================= */

async function saveCertificate() {
  hideMessage();

  try {
    ensureSupabase();

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
      getValue("certificate_no");

    const certificateId =
      getValue("certificate_id");

    const verifyCode =
      getValue("verify_code");

    const issueDate =
      getValue("issue_date") ||
      todayISO();

    const status =
      getValue("status") ||
      "valid";

    const expiryDate = null;

    /*
      DATABASE-SAFE certificate payload.

      Fields that exist in the known certificates
      schema are used here.
    */

    const payload = {
      institution_id:
        selectedStudent.institution_id || null,

      student_id:
        selectedStudent.id || null,

      course_id:
        selectedCourse.id || null,

      certificate_no:
        certificateNo,

      certificate_id:
        certificateId,

      verify_code:
        verifyCode,

      student_name:
        selectedStudent.full_name || null,

      course_name:
        selectedCourse.name || null,

      issue_date:
        issueDate,

      expiry_date:
        expiryDate,

      status:
        status
    };

    /*
      Prevent duplicate certificate number.
    */

    const duplicateCheck =
      await supabaseClient
        .from("certificates")
        .select("id,certificate_no")
        .eq(
          "certificate_no",
          certificateNo
        )
        .limit(1);

    if (duplicateCheck.error) {
      console.warn(
        "Duplicate check warning:",
        duplicateCheck.error
      );
    }

    if (
      duplicateCheck.data &&
      duplicateCheck.data.length > 0
    ) {
      showMessage(
        "Certificate No-kan horey ayuu database-ka ugu jiraa. Samee New Certificate.",
        "error"
      );

      return;
    }

    const { data, error } =
      await supabaseClient
        .from("certificates")
        .insert(payload)
        .select()
        .single();

    if (error) {
      console.error(
        "Supabase certificate insert error:",
        error
      );

      throw error;
    }

    showMessage(
      `Certificate waa la keydiyay. Certificate No: ${certificateNo}`,
      "success"
    );

    generatedCertificate = data;

  } catch (error) {
    console.error(
      "saveCertificate error:",
      error
    );

    showMessage(
      "Save error: " +
      (error.message || "Unknown error"),
      "error"
    );
  }
}


/* =========================================================
   24. HD DOWNLOAD
========================================================= */

function downloadCertificate() {
  hideMessage();

  try {
    const canvas = drawCertificate();

    if (!canvas) {
      throw new Error(
        "Certificate canvas lama helin."
      );
    }

    if (
      !getValue("full_name") ||
      !selectedStudent
    ) {
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

    const studentName =
      getValue("full_name")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    const certificateNo =
      getValue("certificate_no")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    const filename =
      `GAAWOW-Certificate-${studentName}-${certificateNo}.png`;

    canvas.toBlob(
      blob => {
        if (!blob) {
          showMessage(
            "PNG generation failed.",
            "error"
          );
          return;
        }

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        showMessage(
          "HD Certificate PNG waa la diyaariyay.",
          "success"
        );
      },
      "image/png",
      1.0
    );

  } catch (error) {
    console.error(
      "downloadCertificate error:",
      error
    );

    showMessage(
      "Download error: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
   25. NEW CERTIFICATE
========================================================= */

function newCertificate() {
  selectedStudent = null;
  selectedEnrollment = null;
  selectedCourse = null;

  studentImage = null;

  generatedCertificate = null;

  setValue(
    "student_select",
    ""
  );

  setSelectOptions(
    "course_select",
    [],
    "Select student first"
  );

  setValue("full_name", "");
  setValue("student_id", "");
  setValue("date_started", "");
  setValue("date_completed", "");

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
    photo.style.display = "none";
    photo.removeAttribute("src");
  }

  hideMessage();

  drawCertificate();

  showMessage(
    "Certificate cusub ayaa diyaar ah.",
    "info"
  );
}


/* =========================================================
   26. EVENT LISTENERS
========================================================= */

function bindEvents() {

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
  ].forEach(id => {

    const element = $(id);

    if (element) {
      element.addEventListener(
        "input",
        () => drawCertificate()
      );

      element.addEventListener(
        "change",
        () => drawCertificate()
      );
    }

  });
}


/* =========================================================
   27. INITIALIZATION
========================================================= */

async function initCertificateGenerator() {

  try {

    console.log(
      "GAAWOW EMS Certificate Generator V7.4 starting..."
    );

    /*
      Default issue date
    */

    if (!getValue("issue_date")) {
      setValue(
        "issue_date",
        todayISO()
      );
    }

    /*
      Load template first
    */

    try {

      await loadTemplate();

      console.log(
        "Certificate template loaded:",
        TEMPLATE_PATH
      );

    } catch (templateError) {

      console.error(
        templateError
      );

      showMessage(
        "Fiiro gaar ah: certificate-template.png lama helin. Hubi inuu ku jiro isla folder-ka certificate.html.",
        "error"
      );
    }

    /*
      Bind UI
    */

    bindEvents();

    /*
      Initial canvas
    */

    drawCertificate();

    /*
      Load database
    */

    await loadStudents();

    console.log(
      "GAAWOW EMS Certificate Generator V7.4 ready."
    );

  } catch (error) {

    console.error(
      "Certificate Generator initialization error:",
      error
    );

    showMessage(
      "System initialization error: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
   28. GLOBAL FUNCTIONS
   HTML onclick="" NEEDS THESE
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
   29. START
========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initCertificateGenerator
  );

} else {

  initCertificateGenerator();

}
