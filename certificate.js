/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.3
   DATABASE-SAFE
   =========================================================

   Flow:

   Student
      ↓
   Institution
      ↓
   Course
      ↓
   Enrollment
      ↓
   Date Started
   Date Completed
      ↓
   Certificate
      ↓
   QR Verification

   Database:
   - students
   - courses
   - enrollments
   - certificates
   - profiles

   Design:
   - Existing certificate.html preserved
   - A4 Landscape
   - GAAWOW Academy Royal Blue + Gold
   ========================================================= */


/* =========================================================
   SUPABASE
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


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let students = [];
let courses = [];
let enrollments = [];

let selectedStudent = null;
let selectedCourse = null;
let selectedEnrollment = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function todayISO() {

    const d = new Date();

    const year =
        d.getFullYear();

    const month =
        String(d.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(d.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(value) {

    if (!value) return "—";

    try {

        const d =
            new Date(value);

        if (Number.isNaN(d.getTime())) {
            return value;
        }

        return d.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch {

        return value;

    }
}


function randomChars(length = 8) {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < length; i++) {

        result +=
            chars.charAt(
                Math.floor(
                    Math.random() * chars.length
                )
            );

    }

    return result;
}


function showMessage(
    message,
    type = "info"
) {

    const box = $("message");

    if (!box) return;

    box.className =
        `message ${type}`;

    box.textContent =
        message;

}


function clearMessage() {

    const box = $("message");

    if (!box) return;

    box.className =
        "message";

    box.textContent =
        "";

}


/* =========================================================
   CERTIFICATE IDENTIFIERS
   ========================================================= */

function generateCertificateNo() {

    const year =
        new Date().getFullYear();

    return `CERT-${year}-${randomChars(6)}`;
}


function generateCertificateId() {

    const year =
        new Date().getFullYear();

    return `GA-CERT-${year}-${randomChars(6)}`;
}


function generateVerifyCode() {

    return `GAW-${new Date().getFullYear()}-${randomChars(8)}`;
}


function generateHashCode() {

    return (
        "GAH-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        randomChars(8)
    );
}


function generateAllIds() {

    if ($("certificate_no")) {

        $("certificate_no").value =
            generateCertificateNo();

    }

    if ($("certificate_id")) {

        $("certificate_id").value =
            generateCertificateId();

    }

    if ($("verify_code")) {

        $("verify_code").value =
            generateVerifyCode();

    }

}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

    const select =
        $("student_select");

    if (!select) return;

    select.innerHTML =
        `<option value="">
            Loading students...
        </option>`;

    try {

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
            .order(
                "full_name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Students error:",
                error
            );

            throw error;

        }


        students =
            data || [];


        select.innerHTML =
            `<option value="">
                Select Student
            </option>`;


        students.forEach(student => {

            const option =
                document.createElement("option");

            option.value =
                student.id;

            option.textContent =
                `${student.student_id || "NO-ID"} — ${student.full_name || "Unnamed Student"}`;

            select.appendChild(option);

        });


        showMessage(
            `${students.length} student(s) loaded successfully.`,
            "success"
        );


    } catch (error) {

        console.error(error);

        select.innerHTML =
            `<option value="">
                Unable to load students
            </option>`;

        showMessage(
            "Failed to load students: " +
            (error.message || error),
            "error"
        );

    }

}


/* =========================================================
   LOAD COURSES
   ========================================================= */

async function loadCourses(
    institutionId = null
) {

    const select =
        $("course_select");

    if (!select) return;


    select.innerHTML =
        `<option value="">
            Loading courses...
        </option>`;


    try {

        let query =
            supabaseClient
                .from("courses")
                .select(`
                    id,
                    institution_id,
                    name,
                    code,
                    description,
                    is_active
                `)
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        /*
         * IMPORTANT:
         *
         * If courses are institution-specific,
         * use the student's institution.
         *
         * If the table contains global courses
         * with NULL institution_id, we keep those too.
         */

        if (institutionId) {

            const result =
                await query;

            if (result.error) {
                throw result.error;
            }

            courses =
                (result.data || [])
                    .filter(course =>
                        !course.institution_id ||
                        course.institution_id === institutionId
                    );

        } else {

            const {
                data,
                error
            } = await query;

            if (error) {
                throw error;
            }

            courses =
                data || [];

        }


        select.innerHTML =
            `<option value="">
                Select Course
            </option>`;


        courses.forEach(course => {

            const option =
                document.createElement("option");

            option.value =
                course.id;

            option.textContent =
                course.code
                    ? `${course.name} (${course.code})`
                    : course.name;

            select.appendChild(option);

        });


        if (!courses.length) {

            select.innerHTML =
                `<option value="">
                    No active courses found
                </option>`;

        }


    } catch (error) {

        console.error(
            "Courses error:",
            error
        );

        select.innerHTML =
            `<option value="">
                Unable to load courses
            </option>`;

        showMessage(
            "Failed to load courses: " +
            (error.message || error),
            "error"
        );

    }

}


/* =========================================================
   LOAD ENROLLMENTS
   ========================================================= */

async function loadEnrollmentsForStudent(
    student
) {

    enrollments = [];

    selectedEnrollment = null;

    if (!student) {
        return;
    }


    try {

        /*
         * We intentionally use select("*")
         * because the exact enrollment schema
         * may contain different column names.
         */

        const {
            data,
            error
        } = await supabaseClient
            .from("enrollments")
            .select("*");


        if (error) {

            console.warn(
                "Enrollment query:",
                error
            );

            return;

        }


        const rows =
            data || [];


        enrollments =
            rows.filter(row => {

                return (

                    row.student_id === student.id ||

                    row.student_id === student.student_id ||

                    row.student_uuid === student.id ||

                    row.student_profile_id === student.profile_id ||

                    row.profile_id === student.profile_id ||

                    row.student_profile_id === student.id

                );

            });


        console.log(
            "Enrollments for student:",
            enrollments
        );


    } catch (error) {

        console.warn(
            "Enrollment loading skipped:",
            error
        );

    }

}


/* =========================================================
   FIND ENROLLMENT
   ========================================================= */

function findEnrollmentForCourse(
    course
) {

    if (!course) {
        return null;
    }


    return enrollments.find(
        enrollment => {

            return (

                enrollment.course_id === course.id ||

                enrollment.course_uuid === course.id ||

                enrollment.course_code === course.code ||

                enrollment.course_name === course.name

            );

        }
    ) || null;

}


/* =========================================================
   ENROLLMENT DATE HELPERS
   ========================================================= */

function findDateValue(
    row,
    fields
) {

    if (!row) return "";

    for (const field of fields) {

        if (
            row[field] !== undefined &&
            row[field] !== null &&
            row[field] !== ""
        ) {

            return String(
                row[field]
            ).substring(0, 10);

        }

    }

    return "";

}


function getEnrollmentStartDate(
    enrollment
) {

    return findDateValue(
        enrollment,
        [
            "date_started",
            "started_at",
            "start_date",
            "enrollment_date",
            "date_enrolled",
            "created_at"
        ]
    );

}


function getEnrollmentCompletedDate(
    enrollment
) {

    return findDateValue(
        enrollment,
        [
            "date_completed",
            "completed_at",
            "completion_date",
            "date_completion",
            "completed_date"
        ]
    );

}


function getEnrollmentStatus(
    enrollment
) {

    if (!enrollment) {
        return "valid";
    }


    const possible =
        [
            enrollment.status,
            enrollment.enrollment_status,
            enrollment.certificate_status
        ];


    for (const value of possible) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            return String(value)
                .toLowerCase();

        }

    }


    return "valid";

}


/* =========================================================
   STUDENT PHOTO
   ========================================================= */

function updateStudentPhoto(
    photoUrl
) {

    const photo =
        $("student_photo");

    if (!photo) return;


    if (!photoUrl) {

        photo.style.display =
            "none";

        photo.removeAttribute(
            "src"
        );

        return;

    }


    photo.src =
        photoUrl;

    photo.style.display =
        "block";

}


/* =========================================================
   STUDENT SELECTION
   ========================================================= */

async function handleStudentSelection() {

    clearMessage();


    const select =
        $("student_select");

    if (!select) return;


    const studentId =
        select.value;


    selectedStudent =
        students.find(
            student =>
                String(student.id) ===
                String(studentId)
        ) || null;


    if (!selectedStudent) {

        $("full_name").value = "";
        $("student_id").value = "";

        updateStudentPhoto("");

        if ($("course_select")) {

            $("course_select").innerHTML =
                `<option value="">
                    Select student first
                </option>`;

        }

        return;

    }


    /* Student information */

    $("full_name").value =
        selectedStudent.full_name || "";

    $("student_id").value =
        selectedStudent.student_id || "";


    /* Student photo */

    updateStudentPhoto(
        selectedStudent.photo_url
    );


    /* Generate certificate IDs */

    generateAllIds();


    /* Load institution courses */

    await loadCourses(
        selectedStudent.institution_id
    );


    /* Load student enrollments */

    await loadEnrollmentsForStudent(
        selectedStudent
    );


    showMessage(
        `Student selected: ${selectedStudent.full_name}`,
        "success"
    );

}


/* =========================================================
   COURSE SELECTION
   ========================================================= */

function handleCourseSelection() {

    clearMessage();


    if (!selectedStudent) {

        showMessage(
            "Please select a student first.",
            "error"
        );

        return;

    }


    const courseId =
        $("course_select").value;


    selectedCourse =
        courses.find(
            course =>
                String(course.id) ===
                String(courseId)
        ) || null;


    if (!selectedCourse) {

        selectedEnrollment = null;

        return;

    }


    /* Find enrollment */

    selectedEnrollment =
        findEnrollmentForCourse(
            selectedCourse
        );


    let startDate = "";
    let completedDate = "";
    let enrollmentStatus = "valid";


    if (selectedEnrollment) {

        startDate =
            getEnrollmentStartDate(
                selectedEnrollment
            );

        completedDate =
            getEnrollmentCompletedDate(
                selectedEnrollment
            );

        enrollmentStatus =
            getEnrollmentStatus(
                selectedEnrollment
            );

    }


    /* Fill enrollment dates */

    if ($("date_started")) {

        $("date_started").value =
            startDate;

    }


    if ($("date_completed")) {

        $("date_completed").value =
            completedDate;

    }


    /* Certificate status */

    if ($("status")) {

        const validStatuses =
            [
                "valid",
                "pending",
                "expired",
                "revoked"
            ];

        $("status").value =
            validStatuses.includes(
                enrollmentStatus
            )
                ? enrollmentStatus
                : "valid";

    }


    /*
     * If completed date exists,
     * use it as issue date.
     */

    if (
        completedDate &&
        $("issue_date")
    ) {

        $("issue_date").value =
            completedDate;

    }


    /* Update preview immediately */

    updatePreview();


    if (!selectedEnrollment) {

        showMessage(
            "Course selected, but no matching enrollment was found for this student.",
            "info"
        );

    } else {

        showMessage(
            "Student course enrollment loaded successfully.",
            "success"
        );

    }

}


/* =========================================================
   PREVIEW UPDATE
   ========================================================= */

function updatePreview() {

    if (!selectedStudent) {
        return;
    }


    const fullName =
        $("full_name")?.value || "STUDENT NAME";


    const studentId =
        $("student_id")?.value || "—";


    const courseName =
        selectedCourse?.name ||
        "COURSE NAME";


    const certNo =
        $("certificate_no")?.value || "—";


    const certId =
        $("certificate_id")?.value || "—";


    const verifyCode =
        $("verify_code")?.value || "—";


    const issueDate =
        $("issue_date")?.value || "";


    const started =
        $("date_started")?.value || "";


    const completed =
        $("date_completed")?.value || "";


    const status =
        $("status")?.value || "valid";


    if ($("preview_name")) {

        $("preview_name").textContent =
            fullName;

    }


    if ($("preview_student_id")) {

        $("preview_student_id").textContent =
            studentId;

    }


    if ($("preview_course")) {

        $("preview_course").textContent =
            courseName;

    }


    if ($("preview_cert_no")) {

        $("preview_cert_no").textContent =
            certNo;

    }


    if ($("preview_cert_id")) {

        $("preview_cert_id").textContent =
            certId;

    }


    if ($("preview_verify")) {

        $("preview_verify").textContent =
            verifyCode;

    }


    if ($("preview_issue")) {

        $("preview_issue").textContent =
            formatDate(issueDate);

    }


    if ($("preview_started")) {

        $("preview_started").textContent =
            formatDate(started);

    }


    if ($("preview_completed")) {

        $("preview_completed").textContent =
            formatDate(completed);

    }


    if ($("preview_status")) {

        $("preview_status").textContent =
            status.toUpperCase();

        $("preview_status").className =
            "value " +
            (
                status === "valid"
                    ? "status-valid"
                    : ""
            );

    }


    if ($("preview_director")) {

        $("preview_director").textContent =
            $("director_name")?.value ||
            "GAAWOW Academy";

    }


    if ($("preview_signatory")) {

        $("preview_signatory").textContent =
            $("signatory_name")?.value ||
            "Authorized Signatory";

    }


    updateQRCode();

}


/* =========================================================
   QR CODE
   ========================================================= */

function updateQRCode() {

    const qr =
        $("qr_code");

    if (!qr) return;


    const verifyCode =
        $("verify_code")?.value;


    if (!verifyCode) {

        qr.removeAttribute(
            "src"
        );

        return;

    }


    const verificationURL =
        "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify.html" +
        "?code=" +
        encodeURIComponent(
            verifyCode
        );


    qr.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
        encodeURIComponent(
            verificationURL
        );

}


/* =========================================================
   GENERATE
   ========================================================= */

function generateCertificate() {

    clearMessage();


    if (!selectedStudent) {

        showMessage(
            "Please select a student.",
            "error"
        );

        return;

    }


    if (!selectedCourse) {

        showMessage(
            "Please select a course.",
            "error"
        );

        return;

    }


    /*
     * Generate new IDs only when missing.
     */

    if (
        !$("certificate_no").value ||
        !$("certificate_id").value ||
        !$("verify_code").value
    ) {

        generateAllIds();

    }


    if (!$("issue_date").value) {

        $("issue_date").value =
            $("date_completed").value ||
            todayISO();

    }


    if (!$("expiry_date").value) {

        const issue =
            new Date(
                $("issue_date").value
            );

        issue.setFullYear(
            issue.getFullYear() + 1
        );

        $("expiry_date").value =
            issue.toISOString()
                .substring(0, 10);

    }


    updatePreview();


    showMessage(
        "Certificate generated successfully.",
        "success"
    );

}


/* =========================================================
   PREVIEW
   ========================================================= */

function previewCertificate() {

    if (!selectedStudent) {

        showMessage(
            "Please select a student first.",
            "error"
        );

        return;

    }


    updatePreview();


    const certificate =
        $("certificate");


    if (certificate) {

        certificate.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}


/* =========================================================
   BUILD DATABASE RECORD
   ========================================================= */

function buildCertificateRecord() {

    const record = {

        certificate_no:
            $("certificate_no")?.value || null,

        certificate_id:
            $("certificate_id")?.value || null,

        verify_code:
            $("verify_code")?.value || null,

        hash_code:
            generateHashCode(),

        issue_date:
            $("issue_date")?.value || null,

        expiry_date:
            $("expiry_date")?.value || null,

        status:
            $("status")?.value || "valid",

        student_name:
            selectedStudent?.full_name || null,

        course_name:
            selectedCourse?.name || null

    };


    /*
     * Add optional fields only when available.
     */

    if (selectedStudent?.id) {

        record.student_id =
            selectedStudent.id;

    }


    if (selectedStudent?.institution_id) {

        record.institution_id =
            selectedStudent.institution_id;

    }


    if (selectedCourse?.id) {

        record.course_id =
            selectedCourse.id;

    }


    if (selectedEnrollment?.id) {

        record.enrollment_id =
            selectedEnrollment.id;

    }


    return record;

}


/* =========================================================
   SAVE CERTIFICATE
   ========================================================= */

async function saveCertificate() {

    clearMessage();


    if (!selectedStudent) {

        showMessage(
            "Please select a student.",
            "error"
        );

        return;

    }


    if (!selectedCourse) {

        showMessage(
            "Please select a course.",
            "error"
        );

        return;

    }


    /*
     * Generate missing values.
     */

    generateCertificate();


    const record =
        buildCertificateRecord();


    console.log(
        "Certificate record:",
        record
    );


    try {

        let {
            data,
            error
        } = await supabaseClient
            .from("certificates")
            .insert(record)
            .select()
            .single();


        /*
         * If optional columns do not exist,
         * retry using the core certificate fields.
         */

        if (
            error &&
            (
                error.message?.includes(
                    "student_id"
                ) ||
                error.message?.includes(
                    "institution_id"
                ) ||
                error.message?.includes(
                    "course_id"
                ) ||
                error.message?.includes(
                    "enrollment_id"
                )
            )
        ) {

            console.warn(
                "Retrying with core certificate fields."
            );


            const coreRecord = {

                certificate_no:
                    record.certificate_no,

                certificate_id:
                    record.certificate_id,

                verify_code:
                    record.verify_code,

                hash_code:
                    record.hash_code,

                issue_date:
                    record.issue_date,

                expiry_date:
                    record.expiry_date,

                status:
                    record.status,

                student_name:
                    record.student_name,

                course_name:
                    record.course_name

            };


            const retry =
                await supabaseClient
                    .from("certificates")
                    .insert(coreRecord)
                    .select()
                    .single();


            data =
                retry.data;

            error =
                retry.error;

        }


        if (error) {

            console.error(
                "Save certificate error:",
                error
            );

            throw error;

        }


        console.log(
            "Certificate saved:",
            data
        );


        showMessage(
            "Certificate saved successfully to Supabase.",
            "success"
        );


    } catch (error) {

        console.error(error);

        showMessage(
            "Certificate could not be saved: " +
            (error.message || error),
            "error"
        );

    }

}


/* =========================================================
   HD DOWNLOAD
   ========================================================= */

async function downloadCertificate() {

    clearMessage();


    const certificate =
        $("certificate");


    if (!certificate) {

        showMessage(
            "Certificate preview not found.",
            "error"
        );

        return;

    }


    try {

        generateCertificate();


        showMessage(
            "Preparing HD certificate...",
            "info"
        );


        const canvas =
            await html2canvas(
                certificate,
                {
                    scale: 3,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff"
                }
            );


        const link =
            document.createElement("a");


        const certNo =
            $("certificate_no")?.value ||
            "GAAWOW-Certificate";


        link.download =
            `${certNo}.png`;


        link.href =
            canvas.toDataURL(
                "image/png",
                1.0
            );


        link.click();


        showMessage(
            "HD certificate downloaded successfully.",
            "success"
        );


    } catch (error) {

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

function newCertificate() {

    selectedStudent = null;
    selectedCourse = null;
    selectedEnrollment = null;

    enrollments = [];


    if ($("student_select")) {

        $("student_select").value =
            "";

    }


    if ($("course_select")) {

        $("course_select").innerHTML =
            `<option value="">
                Select student first
            </option>`;

    }


    [
        "full_name",
        "student_id",
        "certificate_no",
        "certificate_id",
        "verify_code",
        "date_started",
        "date_completed",
        "issue_date",
        "expiry_date"
    ]
    .forEach(id => {

        if ($(id)) {

            $(id).value = "";

        }

    });


    if ($("status")) {

        $("status").value =
            "valid";

    }


    if ($("director_name")) {

        $("director_name").value =
            "GAAWOW Academy";

    }


    if ($("signatory_name")) {

        $("signatory_name").value =
            "Authorized Signatory";

    }


    updateStudentPhoto("");


    if ($("preview_name")) {

        $("preview_name").textContent =
            "STUDENT NAME";

    }


    if ($("preview_student_id")) {

        $("preview_student_id").textContent =
            "—";

    }


    if ($("preview_course")) {

        $("preview_course").textContent =
            "COURSE NAME";

    }


    if ($("preview_started")) {

        $("preview_started").textContent =
            "—";

    }


    if ($("preview_completed")) {

        $("preview_completed").textContent =
            "—";

    }


    if ($("preview_cert_no")) {

        $("preview_cert_no").textContent =
            "—";

    }


    if ($("preview_cert_id")) {

        $("preview_cert_id").textContent =
            "—";

    }


    if ($("preview_verify")) {

        $("preview_verify").textContent =
            "—";

    }


    if ($("preview_issue")) {

        $("preview_issue").textContent =
            "—";

    }


    if ($("preview_status")) {

        $("preview_status").textContent =
            "VALID";

    }


    if ($("qr_code")) {

        $("qr_code")
            .removeAttribute("src");

    }


    clearMessage();


    showMessage(
        "Ready for a new certificate.",
        "info"
    );

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    if ($("student_select")) {

        $("student_select")
            .addEventListener(
                "change",
                handleStudentSelection
            );

    }


    if ($("course_select")) {

        $("course_select")
            .addEventListener(
                "change",
                handleCourseSelection
            );

    }


    [
        "issue_date",
        "expiry_date",
        "status",
        "director_name",
        "signatory_name"
    ]
    .forEach(id => {

        if ($(id)) {

            $(id).addEventListener(
                "input",
                updatePreview
            );

            $(id).addEventListener(
                "change",
                updatePreview
            );

        }

    });

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initCertificateGenerator() {

    console.log(
        "GAAWOW EMS Certificate Generator V7.3 starting..."
    );


    try {

        setupEventListeners();


        /*
         * Generate initial certificate identifiers.
         */

        generateAllIds();


        /*
         * Default issue date.
         */

        if ($("issue_date")) {

            $("issue_date").value =
                todayISO();

        }


        /*
         * Load students.
         */

        await loadStudents();


        /*
         * Load courses initially.
         * Student selection will later filter them
         * according to institution.
         */

        await loadCourses();


        /*
         * Initial preview.
         */

        updatePreview();


        console.log(
            "GAAWOW EMS Certificate Generator V7.3 ready."
        );


    } catch (error) {

        console.error(
            "Certificate initialization error:",
            error
        );

        showMessage(
            "Certificate Generator initialization failed.",
            "error"
        );

    }

}


/* =========================================================
   START
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
