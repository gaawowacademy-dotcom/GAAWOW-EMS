/* =========================================================
   GAAWOW EMS
   Certificate Generator V8
   CLEAN DATABASE-SAFE VERSION

   Flow:
   Institution
      ↓
   Student
      ↓
   Enrollment
      ↓
   Course
      ↓
   Certificate

   Template:
   certificate-template.png

   Database:
   Supabase
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let institutions = [];
let students = [];
let enrollments = [];
let courses = [];

let selectedStudent = null;
let selectedEnrollment = null;
let selectedCourse = null;

let currentCertificate = null;

let certificateBackground = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id){

  return document.getElementById(id);

}


function setValue(id,value){

  const el = $(id);

  if(el){
    el.value = value ?? "";
  }

}


function setText(id,value){

  const el = $(id);

  if(el){
    el.textContent = value ?? "";
  }

}


function showMessage(message,type="info"){

  const box = $("message");

  if(!box) return;

  box.textContent = message;

  box.className =
    `message ${type}`;

}


function clearMessage(){

  const box = $("message");

  if(!box) return;

  box.textContent = "";

  box.className = "message";

}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function loadSession(){

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();


  if(error){

    throw error;

  }


  currentUser =
    data?.session?.user || null;


  if(!currentUser){

    window.location.href = "index.html";

    return false;

  }


  return true;

}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile(){

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      institution_id,
      is_active
    `)
    .eq("id",currentUser.id)
    .single();


  if(error){

    throw error;

  }


  currentProfile = data;


  if(!currentProfile){

    throw new Error(
      "Profile not found."
    );

  }


  if(!currentProfile.is_active){

    throw new Error(
      "Your account is inactive."
    );

  }


  const allowedRoles = [
    "super_admin",
    "school_admin",
    "teacher"
  ];


  if(
    !allowedRoles.includes(
      currentProfile.role
    )
  ){

    throw new Error(
      "You are not authorized to generate certificates."
    );

  }


  return currentProfile;

}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions(){

  const select =
    $("institutionSelect");


  if(!select){

    throw new Error(
      "Institution selector not found."
    );

  }


  select.innerHTML =
    `<option value="">
       Select Institution
     </option>`;


  let query =
    supabaseClient
      .from("institutions")
      .select(`
        id,
        name,
        code,
        is_active
      `)
      .eq("is_active",true)
      .order("name");


  /*
     Super Admin:
     See all institutions.

     School Admin / Teacher:
     Only own institution.
  */

  if(
    currentProfile.role !== "super_admin"
  ){

    if(!currentProfile.institution_id){

      throw new Error(
        "Your profile has no institution."
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
  } = await query;


  if(error){

    throw error;

  }


  institutions =
    data || [];


  institutions.forEach(
    institution => {

      const option =
        document.createElement("option");

      option.value =
        institution.id;

      option.textContent =
        institution.code
          ? `${institution.name} (${institution.code})`
          : institution.name;

      select.appendChild(option);

    }
  );


  /*
     Automatically select own institution
     for non-super-admin users.
  */

  if(
    currentProfile.role !== "super_admin" &&
    currentProfile.institution_id
  ){

    select.value =
      currentProfile.institution_id;

    await loadStudents();

  }


  if(
    currentProfile.role === "super_admin" &&
    institutions.length === 1
  ){

    select.value =
      institutions[0].id;

    await loadStudents();

  }

}


/* =========================================================
   GET SELECTED INSTITUTION
   ========================================================= */

function getSelectedInstitutionId(){

  return $("institutionSelect")?.value || "";

}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents(){

  const institutionId =
    getSelectedInstitutionId();


  const studentSelect =
    $("studentSelect");


  if(!studentSelect){

    return;

  }


  students = [];

  selectedStudent = null;

  selectedEnrollment = null;

  selectedCourse = null;


  resetStudentFields();


  studentSelect.innerHTML =
    `<option value="">
       Loading students...
     </option>`;


  $("courseSelect").innerHTML =
    `<option value="">
       Select student first
     </option>`;


  if(!institutionId){

    studentSelect.innerHTML =
      `<option value="">
         Select institution first
       </option>`;

    return;

  }


  const {
    data,
    error
  } = await supabaseClient
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
    .order("full_name");


  if(error){

    throw error;

  }


  students =
    data || [];


  studentSelect.innerHTML =
    `<option value="">
       Select Student
     </option>`;


  students.forEach(
    student => {

      const option =
        document.createElement("option");

      option.value =
        student.id;

      option.textContent =
        `${student.full_name || "Unnamed Student"} — ${student.student_id || "No ID"}`;

      studentSelect.appendChild(option);

    }
  );


  if(!students.length){

    studentSelect.innerHTML =
      `<option value="">
         No students found
       </option>`;

  }

}


/* =========================================================
   STUDENT SELECTED
   ========================================================= */

async function handleStudentChange(){

  const studentUuid =
    $("studentSelect")?.value || "";


  selectedStudent =
    students.find(
      student => student.id === studentUuid
    ) || null;


  selectedEnrollment = null;

  selectedCourse = null;


  resetStudentFields();


  if(!selectedStudent){

    $("courseSelect").innerHTML =
      `<option value="">
         Select student first
       </option>`;

    return;

  }


  /*
     Student information
  */

  setValue(
    "studentFullName",
    selectedStudent.full_name
  );


  setValue(
    "studentId",
    selectedStudent.student_id
  );


  /*
     Student photo
  */

  const photo =
    $("studentPhoto");


  if(
    photo &&
    selectedStudent.photo_url
  ){

    photo.src =
      selectedStudent.photo_url;

    photo.style.display =
      "block";

  }


  await loadEnrollments(
    selectedStudent.id
  );

}


/* =========================================================
   LOAD ENROLLMENTS
   ========================================================= */

async function loadEnrollments(
  studentUuid
){

  const courseSelect =
    $("courseSelect");


  courseSelect.innerHTML =
    `<option value="">
       Loading courses...
     </option>`;


  const institutionId =
    getSelectedInstitutionId();


  const {
    data,
    error
  } = await supabaseClient
    .from("enrollments")
    .select(`
      id,
      institution_id,
      student_id,
      course_id,
      class_id,
      enrollment_number,
      enrollment_date,
      start_date,
      end_date,
      status
    `)
    .eq(
      "student_id",
      studentUuid
    )
    .eq(
      "institution_id",
      institutionId
    )
    .order(
      "start_date",
      {
        ascending:false
      }
    );


  if(error){

    throw error;

  }


  enrollments =
    data || [];


  if(!enrollments.length){

    courseSelect.innerHTML =
      `<option value="">
         No enrollments found
       </option>`;

    return;

  }


  /*
     Get unique course IDs.
  */

  const courseIds = [
    ...new Set(
      enrollments
        .map(row => row.course_id)
        .filter(Boolean)
    )
  ];


  if(!courseIds.length){

    courseSelect.innerHTML =
      `<option value="">
         No courses found
       </option>`;

    return;

  }


  const {
    data: courseData,
    error: courseError
  } = await supabaseClient
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
    .order("name");


  if(courseError){

    throw courseError;

  }


  courses =
    courseData || [];


  courseSelect.innerHTML =
    `<option value="">
       Select Course
     </option>`;


  /*
     Only show courses connected
     to this student's enrollments.
  */

  enrollments.forEach(
    enrollment => {

      const course =
        courses.find(
          item =>
            item.id === enrollment.course_id
        );


      if(!course){

        return;

      }


      const option =
        document.createElement("option");

      option.value =
        enrollment.id;

      option.textContent =
        course.code
          ? `${course.name} (${course.code})`
          : course.name;

      courseSelect.appendChild(
        option
      );

    }
  );


  if(
    courseSelect.options.length === 1
  ){

    courseSelect.innerHTML =
      `<option value="">
         No valid courses found
       </option>`;

  }

}


/* =========================================================
   COURSE / ENROLLMENT SELECTED
   ========================================================= */

function handleCourseChange(){

  const enrollmentId =
    $("courseSelect")?.value || "";


  selectedEnrollment =
    enrollments.find(
      enrollment =>
        enrollment.id === enrollmentId
    ) || null;


  selectedCourse = null;


  setValue(
    "dateStarted",
    ""
  );


  setValue(
    "dateCompleted",
    ""
  );


  if(!selectedEnrollment){

    return;

  }


  selectedCourse =
    courses.find(
      course =>
        course.id ===
        selectedEnrollment.course_id
    ) || null;


  /*
     Enrollment dates are the
     official source for certificate.
  */

  setValue(
    "dateStarted",
    selectedEnrollment.start_date
  );


  setValue(
    "dateCompleted",
    selectedEnrollment.end_date
  );


  /*
     If end date doesn't exist,
     use enrollment date.
  */

  if(
    !selectedEnrollment.end_date &&
    selectedEnrollment.enrollment_date
  ){

    setValue(
      "dateCompleted",
      selectedEnrollment.enrollment_date
    );

  }


  /*
     Generate certificate identifiers
     after course selection.
  */

  generateIdentifiers();

  previewCertificate();

}


/* =========================================================
   RESET STUDENT FIELDS
   ========================================================= */

function resetStudentFields(){

  setValue(
    "studentFullName",
    ""
  );

  setValue(
    "studentId",
    "");


  setValue(
    "dateStarted",
    ""
  );

  setValue(
    "dateCompleted",
    "");


  const photo =
    $("studentPhoto");


  if(photo){

    photo.removeAttribute("src");

    photo.style.display =
      "none";

  }

}


/* =========================================================
   CERTIFICATE IDENTIFIERS
   ========================================================= */

function randomDigits(length=6){

  let output = "";

  for(
    let i=0;
    i<length;
    i++
  ){

    output +=
      Math.floor(
        Math.random() * 10
      );

  }

  return output;

}


function randomAlphaNumeric(
  length=10
){

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let output = "";

  for(
    let i=0;
    i<length;
    i++
  ){

    output +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];

  }

  return output;

}


function generateIdentifiers(){

  const year =
    new Date()
      .getFullYear();


  /*
     Do not overwrite existing
     identifiers unnecessarily.
  */

  if(
    !$("certificateNo").value
  ){

    setValue(
      "certificateNo",
      `CERT-${year}-${randomDigits(6)}`
    );

  }


  if(
    !$("certificateId").value
  ){

    setValue(
      "certificateId",
      `GA-CERT-${year}-${randomDigits(6)}`
    );

  }


  if(
    !$("verifyCode").value
  ){

    setValue(
      "verifyCode",
      `GAW-${randomAlphaNumeric(10)}`
    );

  }


  if(
    !$("issueDate").value
  ){

    setValue(
      "issueDate",
      new Date()
        .toISOString()
        .slice(0,10)
    );

  }

}


/* =========================================================
   HASH
   ========================================================= */

async function sha256(
  text
){

  const encoder =
    new TextEncoder();


  const data =
    encoder.encode(text);


  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );


  const hashArray =
    Array.from(
      new Uint8Array(
        hashBuffer
      )
    );


  return hashArray
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2,"0")
    )
    .join("");

}


/* =========================================================
   LOAD CERTIFICATE TEMPLATE
   ========================================================= */

async function loadCertificateTemplate(){

  return new Promise(
    (resolve,reject) => {

      const img =
        new Image();


      img.onload = () => {

        certificateBackground =
          img;

        resolve(img);

      };


      img.onerror = () => {

        reject(
          new Error(
            "certificate-template.png could not be loaded."
          )
        );

      };


      img.src =
        "./certificate-template.png";

    }
  );

}


/* =========================================================
   CANVAS
   ========================================================= */

function getCanvas(){

  return $("certificateCanvas");

}


function getCanvasContext(){

  const canvas =
    getCanvas();

  return canvas.getContext(
    "2d"
  );

}


/* =========================================================
   DRAW CERTIFICATE
   ========================================================= */

function drawCertificate(){

  const canvas =
    getCanvas();


  const ctx =
    getCanvasContext();


  if(!canvas || !ctx){

    throw new Error(
      "Certificate canvas not found."
    );

  }


  /*
     Original certificate size.
  */

  canvas.width =
    1536;

  canvas.height =
    1024;


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
     Background
  */

  if(
    certificateBackground
  ){

    ctx.drawImage(
      certificateBackground,
      0,
      0,
      canvas.width,
      canvas.height
    );

  }


  /*
     Certificate information.
  */

  const studentName =
    $("studentFullName")?.value ||
    "";

  const courseName =
    selectedCourse?.name ||
    "";

  const certificateNo =
    $("certificateNo")?.value ||
    "";

  const issueDate =
    $("issueDate")?.value ||
    "";


  /*
     Font helper.
  */

  function centerText(
    text,
    y,
    font
  ){

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      font;

    ctx.fillStyle =
      "#0B1E63";

    ctx.fillText(
      text,
      canvas.width / 2,
      y
    );

    ctx.restore();

  }


  /*
     Student name.
  */

  if(studentName){

    centerText(
      studentName,
      455,
      "700 42px Arial"
    );

  }


  /*
     Course.
  */

  if(courseName){

    centerText(
      courseName,
      535,
      "700 30px Arial"
    );

  }


  /*
     Certificate number.
  */

  if(certificateNo){

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.font =
      "600 18px Arial";

    ctx.fillStyle =
      "#0B1E63";

    ctx.fillText(
      certificateNo,
      768,
      875
    );

    ctx.restore();

  }


  /*
     Issue date.
  */

  if(issueDate){

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.font =
      "600 17px Arial";

    ctx.fillStyle =
      "#0B1E63";

    ctx.fillText(
      formatDate(issueDate),
      768,
      910
    );

    ctx.restore();

  }

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(
  dateString
){

  if(!dateString){

    return "";

  }


  const date =
    new Date(
      `${dateString}T00:00:00`
    );


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return dateString;

  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day:"2-digit",
      month:"long",
      year:"numeric"
    }
  );

}


/* =========================================================
   GENERATE
   ========================================================= */

async function generateCertificate(){

  try{

    clearMessage();


    if(!selectedStudent){

      showMessage(
        "Please select a student first.",
        "error"
      );

      return;

    }


    if(!selectedEnrollment){

      showMessage(
        "Please select a course/enrollment first.",
        "error"
      );

      return;

    }


    if(!selectedCourse){

      showMessage(
        "The selected enrollment has no valid course.",
        "error"
      );

      return;

    }


    generateIdentifiers();


    await ensureTemplate();


    drawCertificate();


    showMessage(
      "Certificate generated successfully.",
      "success"
    );


  }catch(error){

    console.error(
      "Generate Certificate Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to generate certificate.",
      "error"
    );

  }

}


/* =========================================================
   PREVIEW
   ========================================================= */

async function previewCertificate(){

  try{

    clearMessage();


    if(
      !selectedStudent ||
      !selectedEnrollment ||
      !selectedCourse
    ){

      showMessage(
        "Select Student and Course first.",
        "error"
      );

      return;

    }


    generateIdentifiers();


    await ensureTemplate();


    drawCertificate();


    const canvas =
      $("certificateCanvas");


    canvas.scrollIntoView({
      behavior:"smooth",
      block:"center"
    });


  }catch(error){

    console.error(
      "Preview Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to preview certificate.",
      "error"
    );

  }

}


/* =========================================================
   ENSURE TEMPLATE
   ========================================================= */

async function ensureTemplate(){

  if(
    certificateBackground
  ){

    return;

  }


  await loadCertificateTemplate();

}


/* =========================================================
   FORM DATA
   ========================================================= */

function getCertificateFormData(){

  if(!selectedStudent){

    throw new Error(
      "Student is required."
    );

  }


  if(!selectedEnrollment){

    throw new Error(
      "Enrollment is required."
    );

  }


  if(!selectedCourse){

    throw new Error(
      "Course is required."
    );

  }


  const institutionId =
    getSelectedInstitutionId();


  const issueDate =
    $("issueDate").value;


  if(!issueDate){

    throw new Error(
      "Issue date is required."
    );

  }


  return {

    institution_id:
      institutionId,

    student_id:
      selectedStudent.id,

    course_id:
      selectedCourse.id,

    enrollment_id:
      selectedEnrollment.id,

    certificate_no:
      $("certificateNo").value,

    certificate_id:
      $("certificateId").value,

    verify_code:
      $("verifyCode").value,

    issue_date:
      issueDate,

    expiry_date:
      null,

    status:
      $("certificateStatus").value,

    student_name:
      selectedStudent.full_name,

    course_name:
      selectedCourse.name

  };

}


/* =========================================================
   SAVE CERTIFICATE
   ========================================================= */

async function saveCertificate(){

  try{

    clearMessage();


    if(
      !selectedStudent ||
      !selectedEnrollment ||
      !selectedCourse
    ){

      showMessage(
        "Select Student and Course before saving.",
        "error"
      );

      return;

    }


    generateIdentifiers();


    await ensureTemplate();


    drawCertificate();


    const formData =
      getCertificateFormData();


    /*
       Create stable hash.
    */

    const hashSource =
      [
        formData.certificate_no,
        formData.certificate_id,
        formData.verify_code,
        formData.student_id,
        formData.course_id,
        formData.enrollment_id,
        formData.issue_date
      ].join("|");


    const hashCode =
      await sha256(
        hashSource
      );


    const payload = {

      ...formData,

      hash_code:
        hashCode

    };


    /*
       Prevent accidental duplicate
       certificate numbers.
    */

    const {
      data: existing,
      error: existingError
    } = await supabaseClient
      .from("certificates")
      .select(`
        id,
        certificate_no,
        certificate_id,
        verify_code
      `)
      .or(
        `certificate_no.eq.${formData.certificate_no},certificate_id.eq.${formData.certificate_id},verify_code.eq.${formData.verify_code}`
      )
      .limit(1);


    if(existingError){

      throw existingError;

    }


    if(
      existing &&
      existing.length
    ){

      showMessage(
        "This certificate identifier already exists. Click New and generate another certificate.",
        "error"
      );

      return;

    }


    const {
      data,
      error
    } = await supabaseClient
      .from("certificates")
      .insert(payload)
      .select()
      .single();


    if(error){

      throw error;

    }


    currentCertificate =
      data;


    showMessage(
      "Certificate saved successfully.",
      "success"
    );


  }catch(error){

    console.error(
      "Save Certificate Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to save certificate.",
      "error"
    );

  }

}


/* =========================================================
   HD DOWNLOAD
   ========================================================= */

function downloadHD(){

  try{

    clearMessage();


    const canvas =
      $("certificateCanvas");


    if(!canvas){

      throw new Error(
        "Certificate canvas not found."
      );

    }


    if(
      !selectedStudent ||
      !selectedCourse
    ){

      showMessage(
        "Generate a certificate before downloading.",
        "error"
      );

      return;

    }


    generateIdentifiers();


    drawCertificate();


    const studentId =
      selectedStudent.student_id ||
      "student";


    const certificateNo =
      $("certificateNo").value ||
      "certificate";


    const safeStudentId =
      studentId
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "-"
        );


    const safeCertificateNo =
      certificateNo
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "-"
        );


    const link =
      document.createElement("a");


    link.download =
      `GAAWOW-${safeStudentId}-${safeCertificateNo}.png`;


    link.href =
      canvas.toDataURL(
        "image/png",
        1.0
      );


    link.click();


    showMessage(
      "HD certificate downloaded.",
      "success"
    );


  }catch(error){

    console.error(
      "HD Download Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to download certificate.",
      "error"
    );

  }

}


/* =========================================================
   PRINT A4
   ========================================================= */

function printCertificate(){

  try{

    clearMessage();


    const canvas =
      $("certificateCanvas");


    if(!canvas){

      throw new Error(
        "Certificate canvas not found."
      );

    }


    if(
      !selectedStudent ||
      !selectedCourse
    ){

      showMessage(
        "Generate a certificate before printing.",
        "error"
      );

      return;

    }


    drawCertificate();


    const image =
      canvas.toDataURL(
        "image/png",
        1.0
      );


    const printWindow =
      window.open(
        "",
        "_blank"
      );


    if(!printWindow){

      throw new Error(
        "Please allow pop-ups to print the certificate."
      );

    }


    printWindow.document.open();


    printWindow.document.write(`

      <!DOCTYPE html>

      <html>

      <head>

        <title>
          GAAWOW Certificate
        </title>

        <style>

          @page{
            size:A4 landscape;
            margin:0;
          }

          html,
          body{
            margin:0;
            padding:0;
            width:100%;
            height:100%;
            background:#fff;
          }

          body{
            display:flex;
            align-items:center;
            justify-content:center;
          }

          img{
            display:block;
            width:100%;
            height:100%;
            object-fit:contain;
          }

        </style>

      </head>

      <body>

        <img
          src="${image}"
          alt="GAAWOW Certificate"
        >

        <script>

          window.onload = function(){

            setTimeout(
              function(){
                window.print();
              },
              300
            );

          };

        <\/script>

      </body>

      </html>

    `);


    printWindow.document.close();


  }catch(error){

    console.error(
      "Print Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to print certificate.",
      "error"
    );

  }

}


/* =========================================================
   NEW CERTIFICATE
   ========================================================= */

function newCertificate(){

  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  currentCertificate =
    null;


  /*
     Reset student selector.
  */

  const studentSelect =
    $("studentSelect");


  if(studentSelect){

    studentSelect.value =
      "";

  }


  /*
     Reset course selector.
  */

  const courseSelect =
    $("courseSelect");


  if(courseSelect){

    courseSelect.innerHTML =
      `<option value="">
         Select student first
       </option>`;

  }


  resetStudentFields();


  /*
     Clear certificate identifiers.
  */

  setValue(
    "certificateNo",
    ""
  );

  setValue(
    "certificateId",
    ""
  );

  setValue(
    "verifyCode",
    ""
  );


  /*
     New issue date.
  */

  setValue(
    "issueDate",
    new Date()
      .toISOString()
      .slice(0,10)
  );


  /*
     Default status.
  */

  setValue(
    "certificateStatus",
    "valid"
  );


  /*
     Clear canvas.
  */

  const canvas =
    $("certificateCanvas");


  if(canvas){

    const ctx =
      canvas.getContext("2d");


    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    if(
      certificateBackground
    ){

      ctx.drawImage(
        certificateBackground,
        0,
        0,
        canvas.width,
        canvas.height
      );

    }

  }


  clearMessage();

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function bindEvents(){

  /*
     Back
  */

  $("backDashboardBtn")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "dashboard.html";

      }
    );


  /*
     Institution
  */

  $("institutionSelect")
    ?.addEventListener(
      "change",
      async () => {

        try{

          await loadStudents();

        }catch(error){

          console.error(error);

          showMessage(
            error.message ||
            "Unable to load students.",
            "error"
          );

        }

      }
    );


  /*
     Student
  */

  $("studentSelect")
    ?.addEventListener(
      "change",
      async () => {

        try{

          await handleStudentChange();

        }catch(error){

          console.error(error);

          showMessage(
            error.message ||
            "Unable to load student enrollment.",
            "error"
          );

        }

      }
    );


  /*
     Course
  */

  $("courseSelect")
    ?.addEventListener(
      "change",
      () => {

        try{

          handleCourseChange();

        }catch(error){

          console.error(error);

          showMessage(
            error.message ||
            "Unable to select course.",
            "error"
          );

        }

      }
    );


  /*
     Buttons
  */

  $("generateBtn")
    ?.addEventListener(
      "click",
      generateCertificate
    );


  $("previewBtn")
    ?.addEventListener(
      "click",
      previewCertificate
    );


  $("saveBtn")
    ?.addEventListener(
      "click",
      saveCertificate
    );


  $("downloadBtn")
    ?.addEventListener(
      "click",
      downloadHD
    );


  $("printBtn")
    ?.addEventListener(
      "click",
      printCertificate
    );


  $("newBtn")
    ?.addEventListener(
      "click",
      newCertificate
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initialize(){

  try{

    clearMessage();


    /*
       Check Supabase library.
    */

    if(
      !window.supabase
    ){

      throw new Error(
        "Supabase library failed to load."
      );

    }


    /*
       Authentication.
    */

    const authenticated =
      await loadSession();


    if(!authenticated){

      return;

    }


    /*
       Profile.
    */

    await loadProfile();


    /*
       Template.
    */

    await loadCertificateTemplate();


    /*
       Institutions.
    */

    await loadInstitutions();


    /*
       Events.
    */

    bindEvents();


    /*
       Initial issue date.
    */

    setValue(
      "issueDate",
      new Date()
        .toISOString()
        .slice(0,10)
    );


    /*
       Initial canvas.
    */

    const canvas =
      $("certificateCanvas");


    if(canvas){

      const ctx =
        canvas.getContext("2d");


      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      if(
        certificateBackground
      ){

        ctx.drawImage(
          certificateBackground,
          0,
          0,
          canvas.width,
          canvas.height
        );

      }

    }


    showMessage(
      "Certificate Generator ready.",
      "success"
    );


  }catch(error){

    console.error(
      "Certificate Generator Initialization Error:",
      error
    );


    showMessage(
      error.message ||
      "Certificate Generator could not initialize.",
      "error"
    );

  }

}


/* =========================================================
   START
   ========================================================= */

if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

}else{

  initialize();

}
