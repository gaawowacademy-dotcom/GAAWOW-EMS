// =====================================================
// GAAWOW EMS — Certificate Generator V2
// =====================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// =====================================================
// ELEMENTS
// =====================================================

const institutionSelect =
  document.getElementById("institutionSelect");

const studentSelect =
  document.getElementById("studentSelect");

const courseSelect =
  document.getElementById("courseSelect");

const issueDate =
  document.getElementById("issueDate");

const expiryDate =
  document.getElementById("expiryDate");

const studentPhotoUrl =
  document.getElementById("studentPhotoUrl");

const studentPhotoPreview =
  document.getElementById("studentPhotoPreview");

const generateBtn =
  document.getElementById("generateBtn");

const clearBtn =
  document.getElementById("clearBtn");

const message =
  document.getElementById("message");

const previewSection =
  document.getElementById("previewSection");

const previewTitle =
  document.getElementById("previewTitle");

const previewSubtitle =
  document.getElementById("previewSubtitle");

const previewPresented =
  document.getElementById("previewPresented");

const previewStudentName =
  document.getElementById("previewStudentName");

const previewCourse =
  document.getElementById("previewCourse");

const previewDetails =
  document.getElementById("previewDetails");

const previewBody =
  document.getElementById("previewBody");

const previewPhotoArea =
  document.getElementById("previewPhotoArea");

const previewPhoto =
  document.getElementById("previewPhoto");

const qrImage =
  document.getElementById("qrImage");

const certificateCanvas =
  document.getElementById("certificateCanvas");

const downloadBtn =
  document.getElementById("downloadBtn");

const printBtn =
  document.getElementById("printBtn");

const verificationBtn =
  document.getElementById("verificationBtn");


// =====================================================
// STATE
// =====================================================

let selectedTemplate =
  "certificate";

let currentCertificate =
  null;


// =====================================================
// INIT
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    issueDate.value =
      new Date()
        .toISOString()
        .split("T")[0];

    await loadInstitutions();

  }
);


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
  text,
  type = "success"
) {

  message.textContent =
    text;

  message.className =
    "message " + type;

}


// =====================================================
// LOAD INSTITUTIONS
// =====================================================

async function loadInstitutions() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("institutions")
        .select("id,name")
        .order("name");

    if (error)
      throw error;

    institutionSelect.innerHTML =
      `<option value="">
        Select Institution
      </option>`;

    (data || []).forEach(
      institution => {

        const option =
          document.createElement("option");

        option.value =
          institution.id;

        option.textContent =
          institution.name;

        institutionSelect
          .appendChild(option);

      }
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to load institutions: " +
      error.message,
      "error"
    );

  }

}


// =====================================================
// INSTITUTION CHANGE
// =====================================================

institutionSelect.addEventListener(
  "change",
  async () => {

    studentSelect.innerHTML =
      `<option value="">
        Select Student
      </option>`;

    courseSelect.innerHTML =
      `<option value="">
        Select Course
      </option>`;

    studentSelect.disabled =
      true;

    courseSelect.disabled =
      true;

    if (!institutionSelect.value)
      return;

    await loadStudents(
      institutionSelect.value
    );

    await loadCourses(
      institutionSelect.value
    );

  }
);


// =====================================================
// LOAD STUDENTS
// =====================================================

async function loadStudents(
  institutionId
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("students")
        .select(`
          id,
          student_id,
          full_name,
          photo_url,
          status
        `)
        .eq(
          "institution_id",
          institutionId
        )
        .eq(
          "status",
          "active"
        )
        .order("full_name");

    if (error)
      throw error;

    (data || []).forEach(
      student => {

        const option =
          document.createElement("option");

        option.value =
          student.id;

        option.textContent =
          `${student.full_name} (${student.student_id})`;

        option.dataset.photo =
          student.photo_url || "";

        studentSelect
          .appendChild(option);

      }
    );

    studentSelect.disabled =
      false;

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to load students: " +
      error.message,
      "error"
    );

  }

}


// =====================================================
// LOAD COURSES
// =====================================================

async function loadCourses(
  institutionId
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("courses")
        .select(`
          id,
          name
        `)
        .eq(
          "institution_id",
          institutionId
        )
        .order("name");

    if (error)
      throw error;

    (data || []).forEach(
      course => {

        const option =
          document.createElement("option");

        option.value =
          course.id;

        option.textContent =
          course.name;

        courseSelect
          .appendChild(option);

      }
    );

    courseSelect.disabled =
      false;

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to load courses: " +
      error.message,
      "error"
    );

  }

}


// =====================================================
// STUDENT CHANGE
// =====================================================

studentSelect.addEventListener(
  "change",
  () => {

    const option =
      studentSelect.options[
        studentSelect.selectedIndex
      ];

    if (
      option &&
      option.dataset.photo
    ) {

      studentPhotoUrl.value =
        option.dataset.photo;

      showPhoto(
        option.dataset.photo
      );

    } else {

      studentPhotoUrl.value =
        "";

      studentPhotoPreview.style.display =
        "none";

    }

  }
);


// =====================================================
// PHOTO URL
// =====================================================

studentPhotoUrl.addEventListener(
  "input",
  () => {

    showPhoto(
      studentPhotoUrl.value.trim()
    );

  }
);


function showPhoto(url) {

  if (!url) {

    studentPhotoPreview.style.display =
      "none";

    return;

  }

  studentPhotoPreview.src =
    url;

  studentPhotoPreview.style.display =
    "block";

}


// =====================================================
// TEMPLATE SELECTOR
// =====================================================

document
  .querySelectorAll(".template")
  .forEach(template => {

    template.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".template")
          .forEach(item => {

            item.classList.remove(
              "active"
            );

          });

        template.classList.add(
          "active"
        );

        selectedTemplate =
          template.dataset.type;

        updateTemplatePreview();

      }
    );

  });


// =====================================================
// TEMPLATE PREVIEW
// =====================================================

function updateTemplatePreview() {

  certificateCanvas
    .classList
    .remove(
      "diploma",
      "authentication"
    );

  if (
    selectedTemplate ===
    "diploma"
  ) {

    certificateCanvas
      .classList
      .add("diploma");

    previewTitle.textContent =
      "DIPLOMA";

    previewSubtitle.textContent =
      "OF COMPLETION";

    previewPresented.textContent =
      "This Diploma is proudly awarded to";

    previewBody.textContent =
      "For successfully completing the academic requirements of";

  } else if (
    selectedTemplate ===
    "authentication_letter"
  ) {

    certificateCanvas
      .classList
      .add("authentication");

    previewTitle.textContent =
      "AUTHENTICATION LETTER";

    previewSubtitle.textContent =
      "OFFICIAL ACADEMIC VERIFICATION";

    previewPresented.textContent =
      "To Whom It May Concern,";

    previewBody.textContent =
      "This letter officially confirms that the following student successfully completed the stated course at GAAWOW Academy:";

  } else {

    previewTitle.textContent =
      "CERTIFICATE";

    previewSubtitle.textContent =
      "OF COMPLETION";

    previewPresented.textContent =
      "This certificate is proudly presented to";

    previewBody.textContent =
      "For successfully completing the course";

  }

}


// =====================================================
// RANDOM CODE
// =====================================================

function randomCode(
  length = 8
) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (
    let i = 0;
    i < length;
    i++
  ) {

    result +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];

  }

  return result;

}


// =====================================================
// IDENTIFIERS
// =====================================================

function generateCertificateNo() {

  const year =
    new Date()
      .getFullYear();

  return (
    `GA-CERT-${year}-` +
    randomCode(6)
  );

}


function generateCertificateId() {

  return (
    `GA-ID-` +
    randomCode(10)
  );

}


function generateVerifyCode() {

  const year =
    new Date()
      .getFullYear();

  return (
    `GAW-${year}-` +
    randomCode(8)
  );

}


// =====================================================
// SHA-256 HASH
// =====================================================

async function createHash(
  text
) {

  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(text);

  const buffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array
    .from(
      new Uint8Array(buffer)
    )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


// =====================================================
// GENERATE
// =====================================================

generateBtn.addEventListener(
  "click",
  generateCertificate
);


async function generateCertificate() {

  try {

    generateBtn.disabled =
      true;

    showMessage(
      "Generating certificate...",
      "success"
    );


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!institutionSelect.value)
      throw new Error(
        "Please select an institution."
      );

    if (!studentSelect.value)
      throw new Error(
        "Please select a student."
      );

    if (!courseSelect.value)
      throw new Error(
        "Please select a course."
      );


    // -------------------------------
    // STUDENT
    // -------------------------------

    const {
      data: student,
      error: studentError
    } =
      await supabaseClient
        .from("students")
        .select(`
          id,
          full_name,
          photo_url
        `)
        .eq(
          "id",
          studentSelect.value
        )
        .single();

    if (studentError)
      throw studentError;


    // -------------------------------
    // COURSE
    // -------------------------------

    const {
      data: course,
      error: courseError
    } =
      await supabaseClient
        .from("courses")
        .select(`
          id,
          name
        `)
        .eq(
          "id",
          courseSelect.value
        )
        .single();

    if (courseError)
      throw courseError;


    // -------------------------------
    // USER
    // -------------------------------

    const {
      data: {
        user
      }
    } =
      await supabaseClient
        .auth
        .getUser();


    // -------------------------------
    // IDENTIFIERS
    // -------------------------------

    const certificateNo =
      generateCertificateNo();

    const certificateId =
      generateCertificateId();

    const verifyCode =
      generateVerifyCode();


    const hashInput =
      [
        certificateNo,
        certificateId,
        verifyCode,
        student.id,
        course.id,
        issueDate.value
      ].join("|");


    const hashCode =
      await createHash(
        hashInput
      );


    // -------------------------------
    // VERIFICATION URL
    // -------------------------------

    const verificationUrl =
      `${window.location.origin}` +
      `/GAAWOW-EMS/verify.html?code=` +
      encodeURIComponent(
        verifyCode
      );


    // -------------------------------
    // PHOTO
    // -------------------------------

    const photoUrl =
      studentPhotoUrl.value.trim() ||
      student.photo_url ||
      null;


    // -------------------------------
    // PAYLOAD
    // -------------------------------

    const payload = {

      institution_id:
        institutionSelect.value,

      student_id:
        student.id,

      course_id:
        course.id,

      certificate_no:
        certificateNo,

      certificate_id:
        certificateId,

      verify_code:
        verifyCode,

      hash_code:
        hashCode,

      issue_date:
        issueDate.value,

      expiry_date:
        expiryDate.value ||
        null,

      status:
        "valid",

      certificate_url:
        verificationUrl,

      pdf_url:
        null,

      qr_url:
        verificationUrl,

      student_name_snapshot:
        student.full_name,

      course_name_snapshot:
        course.name,

      issued_by:
        user ?
          user.id :
          null,

      certificate_type:
        selectedTemplate,

      template_url:
        null,

      student_photo_url:
        photoUrl,

      verification_url:
        verificationUrl

    };


    // -------------------------------
    // SAVE DATABASE
    // -------------------------------

    const {
      data: certificate,
      error
    } =
      await supabaseClient
        .from("certificates")
        .insert(payload)
        .select()
        .single();

    if (error)
      throw error;


    currentCertificate =
      certificate;


    // -------------------------------
    // PREVIEW
    // -------------------------------

    updatePreview(
      certificate
    );


    previewSection.style.display =
      "block";


    previewSection.scrollIntoView({
      behavior: "smooth"
    });


    showMessage(
      "Certificate generated successfully.",
      "success"
    );


  } catch (error) {

    console.error(
      "Certificate generation error:",
      error
    );

    showMessage(
      error.message ||
      "Certificate generation failed.",
      "error"
    );

  } finally {

    generateBtn.disabled =
      false;

  }

}


// =====================================================
// UPDATE PREVIEW
// =====================================================

function updatePreview(
  certificate
) {

  updateTemplatePreview();


  previewStudentName.textContent =
    certificate.student_name_snapshot ||
    "Student Name";


  previewCourse.textContent =
    certificate.course_name_snapshot ||
    "Course Name";


  previewDetails.innerHTML =
    `
      Issue Date:
      <strong>
        ${certificate.issue_date || "—"}
      </strong>

      &nbsp; | &nbsp;

      Certificate No:
      <strong>
        ${certificate.certificate_no || "—"}
      </strong>

      <br>

      Verification Code:
      <strong>
        ${certificate.verify_code || "—"}
      </strong>
    `;


  if (
    certificate.student_photo_url
  ) {

    previewPhoto.src =
      certificate.student_photo_url;

    previewPhotoArea.style.display =
      "block";

  } else {

    previewPhotoArea.style.display =
      "none";

  }


  // -------------------------------
  // QR CODE
  // -------------------------------

  const qrContainer =
    document.createElement("div");

  qrContainer.style.display =
    "none";

  document.body.appendChild(
    qrContainer
  );


  new QRCode(
    qrContainer,
    {
      text:
        certificate.verification_url ||
        certificate.certificate_url,

      width: 180,
      height: 180,

      correctLevel:
        QRCode.CorrectLevel.H
    }
  );


  setTimeout(
    () => {

      const canvas =
        qrContainer.querySelector(
          "canvas"
        );

      if (canvas) {

        qrImage.src =
          canvas.toDataURL(
            "image/png"
          );

      }

      qrContainer.remove();

    },
    300
  );

}


// =====================================================
// DOWNLOAD PDF
// =====================================================

downloadBtn.addEventListener(
  "click",
  downloadPDF
);


async function downloadPDF() {

  if (!currentCertificate) {

    showMessage(
      "Generate a certificate first.",
      "error"
    );

    return;

  }


  try {

    downloadBtn.disabled =
      true;

    showMessage(
      "Preparing PDF...",
      "success"
    );


    const canvas =
      await html2canvas(
        certificateCanvas,
        {
          scale: 2,
          useCORS: true,
          backgroundColor:
            "#ffffff"
        }
      );


    const {
      jsPDF
    } = window.jspdf;


    let orientation =
      "landscape";


    if (
      currentCertificate
        .certificate_type ===
      "authentication_letter"
    ) {

      orientation =
        "portrait";

    }


    const pdf =
      new jsPDF({
        orientation,
        unit: "mm",
        format: "a4"
      });


    const pageWidth =
      pdf.internal.pageSize
        .getWidth();

    const pageHeight =
      pdf.internal.pageSize
        .getHeight();


    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.95
      );


    let imageWidth =
      pageWidth - 10;

    let imageHeight =
      (
        canvas.height /
        canvas.width
      ) *
      imageWidth;


    if (
      imageHeight >
      pageHeight - 10
    ) {

      imageHeight =
        pageHeight - 10;

      imageWidth =
        (
          canvas.width /
          canvas.height
        ) *
        imageHeight;

    }


    const x =
      (pageWidth -
        imageWidth) / 2;

    const y =
      (pageHeight -
        imageHeight) / 2;


    pdf.addImage(
      imageData,
      "JPEG",
      x,
      y,
      imageWidth,
      imageHeight
    );


    const filename =
      `${currentCertificate.certificate_no}.pdf`;


    pdf.save(filename);


    showMessage(
      "PDF downloaded successfully.",
      "success"
    );


  } catch (error) {

    console.error(error);

    showMessage(
      "PDF generation failed: " +
      error.message,
      "error"
    );

  } finally {

    downloadBtn.disabled =
      false;

  }

}


// =====================================================
// PRINT
// =====================================================

printBtn.addEventListener(
  "click",
  () => {

    if (!currentCertificate) {

      showMessage(
        "Generate a certificate first.",
        "error"
      );

      return;

    }

    window.print();

  }
);


// =====================================================
// VERIFICATION
// =====================================================

verificationBtn.addEventListener(
  "click",
  () => {

    if (
      !currentCertificate
    ) {

      showMessage(
        "Generate a certificate first.",
        "error"
      );

      return;

    }


    const url =
      `verify.html?code=` +
      encodeURIComponent(
        currentCertificate.verify_code
      );


    window.open(
      url,
      "_blank"
    );

  }
);


// =====================================================
// CLEAR
// =====================================================

clearBtn.addEventListener(
  "click",
  () => {

    institutionSelect.value =
      "";

    studentSelect.innerHTML =
      `<option value="">
        Select Student
      </option>`;

    courseSelect.innerHTML =
      `<option value="">
        Select Course
      </option>`;

    studentSelect.disabled =
      true;

    courseSelect.disabled =
      true;

    issueDate.value =
      new Date()
        .toISOString()
        .split("T")[0];

    expiryDate.value =
      "";

    studentPhotoUrl.value =
      "";

    studentPhotoPreview.style.display =
      "none";

    previewSection.style.display =
      "none";

    message.className =
      "message";

    message.textContent =
      "";

    currentCertificate =
      null;

  }
);
