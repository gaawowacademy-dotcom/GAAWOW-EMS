"use strict";

/* =========================================================
   STUDENT ACCOUNT CREATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


let selectedStudentForAccount = null;


/* =========================================================
   OPEN ACCOUNT MODAL
   ========================================================= */

function openStudentAccountModal(student) {

  if (!student) {

    alert(
      "Please select a student first."
    );

    return;
  }

  selectedStudentForAccount =
    student;

  const modal =
    document.getElementById(
      "studentAccountModal"
    );

  if (!modal) return;

  document.getElementById(
    "accountStudentName"
  ).textContent =
    student.full_name ||
    "--";

  document.getElementById(
    "accountStudentId"
  ).textContent =
    student.student_id ||
    "--";

  document.getElementById(
    "studentAccountUsername"
  ).value =
    String(
      student.student_id || ""
    )
      .trim()
      .toLowerCase();

  document.getElementById(
    "studentAccountPassword"
  ).value = "";

  document.getElementById(
    "studentAccountResult"
  ).classList.add(
    "hidden"
  );

  modal.classList.remove(
    "hidden"
  );
}


/* =========================================================
   CLOSE
   ========================================================= */

function closeStudentAccountModal() {

  const modal =
    document.getElementById(
      "studentAccountModal"
    );

  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

  selectedStudentForAccount =
    null;
}


/* =========================================================
   PASSWORD GENERATOR
   ========================================================= */

function generateStudentPassword() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";

  const array =
    new Uint32Array(12);

  crypto.getRandomValues(
    array
  );

  return Array.from(
    array,
    n =>
      chars[
        n % chars.length
      ]
  ).join("");
}


/* =========================================================
   GENERATE PASSWORD BUTTON
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id !==
      "generateStudentPasswordBtn"
    ) {
      return;
    }

    document.getElementById(
      "studentAccountPassword"
    ).value =
      generateStudentPassword();

  }
);


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function createStudentAccount() {

  if (
    !selectedStudentForAccount
  ) {

    alert(
      "No student selected."
    );

    return;
  }

  const student =
    selectedStudentForAccount;

  const password =
    document.getElementById(
      "studentAccountPassword"
    ).value.trim();

  const button =
    document.getElementById(
      "confirmCreateStudentAccount"
    );

  const oldText =
    button.textContent;

  button.disabled =
    true;

  button.textContent =
    "Creating account...";

  try {

    /*
     * Make sure current user is logged in
     */

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (
      error ||
      !data?.session
    ) {

      throw new Error(
        "Super Admin session has expired. Please login again."
      );

    }

    /*
     * Call Edge Function
     */

    const {
      data: result,
      error: functionError
    } =
      await supabaseClient.functions.invoke(
        "create-student-account",
        {
          body: {
            student_id:
              student.id,

            password:
              password || undefined
          }
        }
      );

    if (functionError) {

      throw new Error(
        functionError.message ||
        "Account creation failed."
      );

    }

    if (
      !result?.success
    ) {

      throw new Error(
        result?.message ||
        "Account creation failed."
      );

    }

    /*
     * Show credentials
     */

    document.getElementById(
      "createdUsername"
    ).textContent =
      result.credentials.username;

    document.getElementById(
      "createdPassword"
    ).textContent =
      result.credentials.password;

    document.getElementById(
      "studentAccountResult"
    ).classList.remove(
      "hidden"
    );

    alert(
      "Student account created successfully."
    );

  }

  catch (error) {

    console.error(
      "CREATE STUDENT ACCOUNT:",
      error
    );

    alert(
      error.message ||
      "Unable to create student account."
    );

  }

  finally {

    button.disabled =
      false;

    button.textContent =
      oldText;

  }

}


/* =========================================================
   CREATE BUTTON
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "confirmCreateStudentAccount"
    ) {

      createStudentAccount();

    }

  }
);


/* =========================================================
   CLOSE BUTTON
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "closeStudentAccountModal"
    ) {

      closeStudentAccountModal();

    }

  }
);


/* =========================================================
   COPY CREDENTIALS
   ========================================================= */

document.addEventListener(
  "click",
  async event => {

    if (
      event.target.id !==
      "copyStudentCredentials"
    ) {
      return;
    }

    const username =
      document.getElementById(
        "createdUsername"
      ).textContent;

    const password =
      document.getElementById(
        "createdPassword"
      ).textContent;

    const text =
`GAAWOW ACADEMY
Student Login

Username: ${username}
Password: ${password}

Student Portal:
${window.location.origin}/student-login.html`;

    try {

      await navigator.clipboard.writeText(
        text
      );

      alert(
        "Username and password copied."
      );

    }

    catch (error) {

      console.error(
        error
      );

      alert(
        "Copy failed. Please copy manually."
      );

    }

  }
);
