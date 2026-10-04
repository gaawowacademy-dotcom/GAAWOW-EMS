const username =
  document
    .getElementById(
      "username"
    )
    .value
    .trim()
    .toLowerCase();

const password =
  document
    .getElementById(
      "password"
    )
    .value;

const loginEmail =
  username.includes("@")
    ? username
    : `${username}@student.gaawow.local`;

const {
  data,
  error
} =
  await supabaseClient.auth.signInWithPassword({
    email:
      loginEmail,

    password
});
