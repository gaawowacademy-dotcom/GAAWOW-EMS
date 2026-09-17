/* =========================================================
   GAAWOW EMS
   Certificate Generator V7
   A4 Landscape 297 × 210 mm
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let students = [];
let selectedStudent = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id){
  return document.getElementById(id);
}

function todayISO(){
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function addYears(dateString, years){
  const d = new Date(dateString + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

function randomChars(length){
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for(let i = 0; i < length; i++){
    result += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  return result;
}

function showMessage(text, type = "success"){
  const box = $("message");

  box.style.display = "block";
  box.textContent = text;

  if(type === "error"){
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
  }else{
    box.style.background = "#dcfce7";
    box.style.color = "#166534";
  }
}


/* =========================================================
   AUTOMATIC IDS
   ========================================================= */

function generateCertificateNo(){
  const year = new Date().getFullYear();

  const random =
    Math.floor(1000 + Math.random() * 9000);

  return `CERT-${year}-${random}`;
}

function generateCertificateId(){
  const random =
    Math.floor(1000 + Math.random() * 9000);

  return `GA-CERT-${random}`;
}

function generateVerifyCode(){
  return `GAW-${randomChars(4)}-${randomChars(4)}`;
}

function generateHashCode(){
  const timestamp =
    Date.now().toString(36).toUpperCase();

  return `GA-${timestamp}-${randomChars(8)}`;
}

function generateAllIds(){

  $("certificate_no").value =
    generateCertificateNo();

  $("certificate_id").value =
    generateCertificateId();

  $("verify_code").value =
    generateVerifyCode();
}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents(){

  const select = $("student_select");

  select.innerHTML =
    `<option value="">Loading students...</option>`;

  try{

    const {
      data,
      error
    } = await supabaseClient
      .from("students")
      .select("*")
      .order("full_name", {
        ascending:true
      });

    if(error){
      throw error;
    }

    students = data || [];

    select.innerHTML =
      `<option value="">Select Student</option>`;

    students.forEach(student => {

      const option =
        document.createElement("option");

      option.value =
        student.id ||
        student.student_id;

      option.textContent =
        `${student.full_name || "Unnamed"} — ${student.student_id || ""}`;

      select.appendChild(option);

    });

    if(!students.length){

      select.innerHTML =
        `<option value="">No students found</option>`;

      showMessage(
        "No students were found in Student Registration.",
        "error"
      );

    }

  }catch(error){

    console.error(
      "Student loading error:",
      error
    );

    select.innerHTML =
      `<option value="">Unable to load students</option>`;

    showMessage(
      "Unable to load students: " +
      (error.message || error),
      "error"
    );
  }
}


/* =========================================================
   STUDENT SELECTION
   ========================================================= */

function handleStudentSelection(){

  const value =
    $("student_select").value;

  selectedStudent =
    students.find(student =>
      String(student.id) === String(value) ||
      String(student.student_id) === String(value)
    );

  if(!selectedStudent){

    $("full_name").value = "";
    $("student_id").value = "";

    return;
  }

  $("full_name").value =
    selectedStudent.full_name || "";

  $("student_id").value =
    selectedStudent.student_id || "";

  generateAllIds();

  generateCertificate();
}


/* =========================================================
   QR CODE
   ========================================================= */

function getVerificationURL(){

  const verifyCode =
    encodeURIComponent(
      $("verify_code").value || ""
    );

  return (
    "https://gaawowacademy-dotcom.github.io/" +
    "GAAWOW-EMS/verify.html?code=" +
    verifyCode
  );
}

function updateQRCode(){

  const url =
    encodeURIComponent(
      getVerificationURL()
    );

  /*
    QR image is generated remotely.
    It is only used for the visual certificate QR.
  */

  $("qr_code").src =
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=300x300&margin=5&data=" +
    url;
}


/* =========================================================
   RENDER CERTIFICATE
   ========================================================= */

function generateCertificate(){

  const name =
    $("full_name").value.trim() ||
    "STUDENT NAME";

  const studentId =
    $("student_id").value.trim() ||
    "—";

  const course =
    $("course_name").value.trim() ||
    "COURSE NAME";

  const certNo =
    $("certificate_no").value.trim() ||
    generateCertificateNo();

  const certId =
    $("certificate_id").value.trim() ||
    generateCertificateId();

  const verify =
    $("verify_code").value.trim() ||
    generateVerifyCode();

  const issue =
    $("issue_date").value ||
    todayISO();

  const director =
    $("director_name").value.trim() ||
    "GAAWOW Academy";

  const signatory =
    $("signatory_name").value.trim() ||
    "Authorized Signatory";


  $("certificate_no").value = certNo;
  $("certificate_id").value = certId;
  $("verify_code").value = verify;
  $("issue_date").value = issue;

  if(!$("expiry_date").value){

    $("expiry_date").value =
      addYears(issue, 3);
  }


  $("preview_name").textContent =
    name.toUpperCase();

  $("preview_student_id").textContent =
    `Student ID: ${studentId}`;

  $("preview_course").textContent =
    course;

  $("preview_cert_no").textContent =
    certNo;

  $("preview_cert_id").textContent =
    certId;

  $("preview_verify").textContent =
    verify;

  $("preview_issue").textContent =
    issue;

  $("preview_director").textContent =
    director;

  $("preview_signatory").textContent =
    signatory;


  updateQRCode();

  return true;
}


/* =========================================================
   PREVIEW
   ========================================================= */

function previewCertificate(){

  generateCertificate();

  $("certificate").scrollIntoView({
    behavior:"smooth",
    block:"center"
  });

  showMessage(
    "Certificate preview updated."
  );
}


/* =========================================================
   SAVE TO SUPABASE
   ========================================================= */

async function saveCertificate(){

  try{

    if(!selectedStudent){

      throw new Error(
        "Please select a student first."
      );
    }

    generateCertificate();

    const record = {

      certificate_no:
        $("certificate_no").value,

      certificate_id:
        $("certificate_id").value,

      verify_code:
        $("verify_code").value,

      hash_code:
        generateHashCode(),

      issue_date:
        $("issue_date").value,

      expiry_date:
        $("expiry_date").value,

      status:
        "valid",

      student_name:
        $("full_name").value,

      course_name:
        $("course_name").value

    };


    const {
      data,
      error
    } = await supabaseClient
      .from("certificates")
      .insert([record])
      .select()
      .single();


    if(error){

      console.error(
        "Certificate save error:",
        error
      );

      throw error;
    }


    showMessage(
      "Certificate saved successfully. Certificate No: " +
      data.certificate_no
    );


  }catch(error){

    console.error(error);

    showMessage(
      "Save failed: " +
      (error.message || error),
      "error"
    );
  }
}


/* =========================================================
   HD DOWNLOAD
   ========================================================= */

async function downloadCertificate(){

  try{

    generateCertificate();

    if(typeof html2canvas === "undefined"){

      throw new Error(
        "HD download library is not loaded."
      );
    }


    const certificate =
      $("certificate");


    showMessage(
      "Preparing HD certificate..."
    );


    const canvas =
      await html2canvas(
        certificate,
        {
          scale:3,
          useCORS:true,
          allowTaint:false,
          backgroundColor:"#ffffff",
          logging:false
        }
      );


    const link =
      document.createElement("a");

    const safeName =
      (
        $("full_name").value ||
        "Student"
      )
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );


    link.download =
      `GAAWOW-Certificate-${safeName || "Student"}.png`;

    link.href =
      canvas.toDataURL(
        "image/png",
        1.0
      );

    link.click();


    showMessage(
      "HD certificate downloaded successfully."
    );


  }catch(error){

    console.error(
      "Download error:",
      error
    );

    showMessage(
      "HD download failed: " +
      (error.message || error),
      "error"
    );
  }
}


/* =========================================================
   NEW CERTIFICATE
   ========================================================= */

function newCertificate(){

  selectedStudent = null;

  $("student_select").value = "";

  $("full_name").value = "";
  $("student_id").value = "";
  $("course_name").value = "";

  $("issue_date").value =
    todayISO();

  $("expiry_date").value =
    addYears(
      todayISO(),
      3
    );

  $("director_name").value =
    "GAAWOW Academy";

  $("signatory_name").value =
    "Authorized Signatory";

  generateAllIds();

  generateCertificate();

  showMessage(
    "New certificate ready."
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    $("issue_date").value =
      todayISO();

    $("expiry_date").value =
      addYears(
        todayISO(),
        3
      );

    generateAllIds();

    $("student_select")
      .addEventListener(
        "change",
        handleStudentSelection
      );

    $("course_name")
      .addEventListener(
        "input",
        generateCertificate
      );

    $("director_name")
      .addEventListener(
        "input",
        generateCertificate
      );

    $("signatory_name")
      .addEventListener(
        "input",
        generateCertificate
      );

    $("issue_date")
      .addEventListener(
        "change",
        generateCertificate
      );

    $("expiry_date")
      .addEventListener(
        "change",
        generateCertificate
      );


    generateCertificate();

    await loadStudents();

  }
);
