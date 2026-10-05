/* =========================================================
   PROFESSIONAL STUDENT LOGIN ACCOUNT MODAL
========================================================= */

const CREATE_STUDENT_FUNCTION_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co/functions/v1/create-student-account";


let selectedStudentForAccount = null;


/* ---------------------------------------------------------
   ELEMENTS
--------------------------------------------------------- */

const studentAccountModal =
  document.getElementById("studentAccountModal");

const closeStudentAccountModal =
  document.getElementById("closeStudentAccountModal");

const cancelStudentAccount =
  document.getElementById("cancelStudentAccount");

const closeStudentAccountSuccess =
  document.getElementById("closeStudentAccountSuccess");

const createStudentAccountBtn =
  document.getElementById("createStudentAccountBtn");

const createStudentAccountText =
  document.getElementById("createStudentAccountText");

const createStudentAccountIcon =
  document.getElementById("createStudentAccountIcon");

const studentAccountForm =
  document.getElementById("studentAccountForm");

const studentAccountSuccess =
  document.getElementById("studentAccountSuccess");

const studentAccountError =
  document.getElementById("studentAccountError");

const accountStudentName =
  document.getElementById("accountStudentName");

const accountStudentId =
  document.getElementById("accountStudentId");

const studentAccountEmail =
  document.getElementById("studentAccountEmail");

const studentAccountUsername =
  document.getElementById("studentAccountUsername");

const studentAccountPassword =
  document.getElementById("studentAccountPassword");

const toggleStudentPassword =
  document.getElementById("toggleStudentPassword");

const generateStudentPassword =
  document.getElementById("generateStudentPassword");

const studentPasswordStrengthBar =
  document.getElementById("studentPasswordStrengthBar");

const studentPasswordStrengthText =
  document.getElementById("studentPasswordStrengthText");


/* ---------------------------------------------------------
   PASSWORD GENERATOR
--------------------------------------------------------- */

function generateSecureStudentPassword(length = 12) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ" +
    "abcdefghijkmnopqrstuvwxyz" +
    "23456789" +
    "!@#$%";

  const array = new Uint32Array(length);

  crypto.getRandomValues(array);

  let password = "";

  for (let i = 0; i < length; i++) {

    password +=
      chars[array[i] % chars.length];

  }

  return password;
}


/* ---------------------------------------------------------
   PASSWORD STRENGTH
--------------------------------------------------------- */

function updateStudentPasswordStrength(password) {

  let score = 0;

  if (password.length >= 8) score++;

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password)) score++;

  if (/[a-z]/.test(password)) score++;

  if (/[0-9]/.test(password)) score++;

  if (/[^A-Za-z0-9]/.test(password)) score++;


  const percentage =
    Math.min(100, (score / 6) * 100);

  studentPasswordStrengthBar.style.width =
    `${percentage}%`;


  if (!password) {

    studentPasswordStrengthText.textContent =
      "Password must contain at least 8 characters.";

    return;
  }


  if (score <= 2) {

    studentPasswordStrengthText.textContent =
      "Weak password";

  } else if (score <= 4) {

    studentPasswordStrengthText.textContent =
      "Good password";

  } else {

    studentPasswordStrengthText.textContent =
      "Strong password";

  }

}


/* ---------------------------------------------------------
   OPEN MODAL
--------------------------------------------------------- */

function openStudentAccountModal(student) {

  if (!student) {

    alert("Student information is missing.");

    return;
  }


  selectedStudentForAccount = student;


  studentAccountForm.classList.remove("hidden");

  studentAccountSuccess.classList.add("hidden");

  studentAccountError.classList.add("hidden");

  createStudentAccountBtn.disabled = false;

  createStudentAccountText.textContent =
    "Create Account";

  createStudentAccountIcon.textContent =
    "🔐";


  accountStudentName.textContent =
    student.full_name || "Student";

  accountStudentId.textContent =
    student.student_id || "No Student ID";


  const email =
    String(student.email || "")
      .trim()
      .toLowerCase();


  studentAccountEmail.value = email;

  studentAccountUsername.textContent =
    email || "—";


  const password =
    generateSecureStudentPassword();


  studentAccountPassword.value =
    password;


  studentAccountPassword.type =
    "password";


  toggleStudentPassword.textContent =
    "👁️";


  updateStudentPasswordStrength(password);


  studentAccountModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

}


/* ---------------------------------------------------------
   CLOSE MODAL
--------------------------------------------------------- */

function closeStudentAccountModalFn() {

  studentAccountModal.classList.add("hidden");

  document.body.style.overflow = "";

  selectedStudentForAccount = null;

}


/* ---------------------------------------------------------
   SHOW ERROR
--------------------------------------------------------- */

function showStudentAccountError(message) {

  studentAccountError.textContent =
    message || "Something went wrong.";

  studentAccountError.classList.remove("hidden");

}


/* ---------------------------------------------------------
   TOGGLE PASSWORD
--------------------------------------------------------- */

toggleStudentPassword?.addEventListener(
  "click",
  () => {

    const visible =
      studentAccountPassword.type === "text";


    studentAccountPassword.type =
      visible ? "password" : "text";


    toggleStudentPassword.textContent =
      visible ? "👁️" : "🙈";

  }
);


/* ---------------------------------------------------------
   GENERATE PASSWORD
--------------------------------------------------------- */

generateStudentPassword?.addEventListener(
  "click",
  () => {

    const password =
      generateSecureStudentPassword();

    studentAccountPassword.value =
      password;

    updateStudentPasswordStrength(password);

  }
);


/* ---------------------------------------------------------
   PASSWORD INPUT
--------------------------------------------------------- */

studentAccountPassword?.addEventListener(
  "input",
  () => {

    updateStudentPasswordStrength(
      studentAccountPassword.value
    );

  }
);


/* ---------------------------------------------------------
   CREATE ACCOUNT
--------------------------------------------------------- */

createStudentAccountBtn?.addEventListener(
  "click",
  async () => {

    if (!selectedStudentForAccount) {

      showStudentAccountError(
        "Student information is missing."
      );

      return;
    }


    const password =
      studentAccountPassword.value.trim();


    const email =
      studentAccountEmail.value.trim().toLowerCase();


    if (!email) {

      showStudentAccountError(
        "Student email address is required."
      );

      studentAccountEmail.focus();

      return;
    }


    if (password.length < 8) {

      showStudentAccountError(
        "Password must contain at least 8 characters."
      );

      studentAccountPassword.focus();

      return;
    }


    if (!window.supabaseClient) {

      showStudentAccountError(
        "Supabase client is not connected."
      );

      return;
    }


    try {

      createStudentAccountBtn.disabled = true;

      createStudentAccountIcon.textContent =
        "⏳";

      createStudentAccountText.textContent =
        "Creating Account...";


      studentAccountError.classList.add(
        "hidden"
      );


      /*
       * IMPORTANT:
       * Use the currently logged-in Super Admin
       * access token.
       */

      const {
        data: sessionData,
        error: sessionError
      } =
        await window.supabaseClient.auth.getSession();


      if (
        sessionError ||
        !sessionData?.session?.access_token
      ) {

        throw new Error(
          "Your login session has expired. Please login again."
        );

      }


      const accessToken =
        sessionData.session.access_token;


      /*
       * Call secure Edge Function.
       */

      const response =
        await fetch(
          CREATE_STUDENT_FUNCTION_URL,
          {
            method: "POST",

            headers: {

              "Authorization":
                `Bearer ${accessToken}`,

              "apikey":
                window.SUPABASE_ANON_KEY ||
                "",

              "Content-Type":
                "application/json"

            },

            body: JSON.stringify({

              action: "create",

              student_db_id:
                selectedStudentForAccount.id,

              student_id:
                selectedStudentForAccount.student_id,

              email,

              password

            })

          }
        );


      let result = null;

      try {

        result = await response.json();

      } catch {

        throw new Error(
          `Edge Function returned invalid response (${response.status}).`
        );

      }


      if (!response.ok || !result?.success) {

        throw new Error(
          result?.error ||
          "Student account could not be created."
        );

      }


      /*
       * SUCCESS
       */

      document.getElementById(
        "successStudentName"
      ).textContent =
        selectedStudentForAccount.full_name || "Student";


      document.getElementById(
        "successUsername"
      ).textContent =
        result.email || email;


      document.getElementById(
        "successPassword"
      ).textContent =
        password;


      studentAccountForm.classList.add(
        "hidden"
      );

      studentAccountSuccess.classList.remove(
        "hidden"
      );


      /*
       * Refresh student table if function exists.
       */

      if (
        typeof window.loadStudents ===
        "function"
      ) {

        await window.loadStudents();

      } else if (
        typeof window.loadStudentRecords ===
        "function"
      ) {

        await window.loadStudentRecords();

      }


    } catch (error) {

      console.error(
        "CREATE STUDENT ACCOUNT ERROR:",
        error
      );


      showStudentAccountError(
        error?.message ||
        "Student account creation failed."
      );


      createStudentAccountBtn.disabled =
        false;

      createStudentAccountIcon.textContent =
        "🔐";

      createStudentAccountText.textContent =
        "Create Account";

    }

  }
);


/* ---------------------------------------------------------
   COPY CREDENTIALS
--------------------------------------------------------- */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        ".copy-credential"
      );


    if (!button) return;


    const targetId =
      button.dataset.copyTarget;


    const target =
      document.getElementById(targetId);


    if (!target) return;


    const text =
      target.textContent.trim();


    try {

      await navigator.clipboard.writeText(
        text
      );


      const oldText =
        button.textContent;


      button.textContent =
        "✓";


      setTimeout(
        () => {

          button.textContent =
            oldText;

        },
        1200
      );


    } catch (error) {

      console.error(
        "COPY ERROR:",
        error
      );

    }

  }
);


/* ---------------------------------------------------------
   CLOSE EVENTS
--------------------------------------------------------- */

closeStudentAccountModal?.addEventListener(
  "click",
  closeStudentAccountModalFn
);

cancelStudentAccount?.addEventListener(
  "click",
  closeStudentAccountModalFn
);

closeStudentAccountSuccess?.addEventListener(
  "click",
  closeStudentAccountModalFn
);


/* Click overlay to close */

document.querySelector(
  ".student-account-overlay"
)?.addEventListener(
  "click",
  closeStudentAccountModalFn
);


/* ESC */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      !studentAccountModal.classList.contains(
        "hidden"
      )
    ) {

      closeStudentAccountModalFn();

    }

  }
);


/* ---------------------------------------------------------
   GLOBAL FUNCTION
   Use this from the "Create Account" button
--------------------------------------------------------- */

window.openStudentAccountModal =
  openStudentAccountModal;
