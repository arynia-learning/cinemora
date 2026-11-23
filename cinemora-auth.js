
// ==================================
// CINEMORA ACCOUNT & PROFILE SYSTEM
// ==================================

(function () {
  const supabase = window.cinemoraSupabase;

  if (!supabase) {
    console.error("CINEMORA database is not connected.");
    return;
  }

  let currentUser = null;
  let profiles = [];
  let activeProfile = null;

  const style = document.createElement("style");
  style.textContent = `
    #cinemoraAuth {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #090909;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      overflow-y: auto;
    }
    .cin-auth-box {
      width: 100%;
      max-width: 390px;
      text-align: center;
    }
    .cin-auth-logo {
      color: #d6ad58;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 5px;
      margin-bottom: 30px;
    }
    .cin-auth-box input {
      width: 100%;
      box-sizing: border-box;
      padding: 14px;
      margin: 8px 0;
      background: #222;
      border: 1px solid #765b2c;
      border-radius: 7px;
      color: white;
    }
    .cin-auth-box button {
      padding: 13px 18px;
      margin: 7px 4px;
      background: #d6ad58;
      color: #111;
      border: 0;
      border-radius: 7px;
      font-weight: bold;
      cursor: pointer;
    }
    .cin-auth-box .secondary {
      background: #29231b;
      color: white;
      border: 1px solid #d6ad58;
    }
    .cin-auth-message {
      color: #d6ad58;
      font-size: 14px;
      margin: 12px 0;
      overflow-wrap: anywhere;
    }
    .cin-profile-button {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: 125px;
      margin: 12px;
      padding: 12px;
      background: #171717;
      border: 1px solid #765b2c;
      border-radius: 10px;
      color: white;
      cursor: pointer;
    }
    .cin-profile-avatar {
      font-size: 40px;
      margin-bottom: 8px;
    }
    #cinemoraToolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: #111;
      border-bottom: 1px solid #765b2c;
    }
    #cinemoraToolbar button {
      background: #302820;
      color: white;
      border: 1px solid #d6ad58;
      border-radius: 6px;
      padding: 9px 11px;
    }
    #cinemoraNotifications {
      display: none;
      background: #171717;
      color: white;
      padding: 18px;
      border: 1px solid #d6ad58;
      margin: 10px;
    }
  `;
  document.head.appendChild(style);

  const screen = document.createElement("div");
  screen.id = "cinemoraAuth";
  document.body.appendChild(screen);

  function showMessage(message) {
    const box = screen.querySelector(".cin-auth-message");
    if (box) box.textContent = message;
  }

  function hideSite() {
    const profileScreen = document.getElementById("profileScreen");
    const siteContent = document.getElementById("siteContent");

    if (profileScreen) profileScreen.style.display = "none";
    if (siteContent) siteContent.style.display = "none";
  }

  function showAuth() {
    screen.style.display = "flex";
    hideSite();

    screen.innerHTML = `
      <div class="cin-auth-box">
        <div class="cin-auth-logo">CINEMORA</div>
        <h2>Welcome to CINEMORA</h2>
        <p>Sign in or create your account.</p>

        <input id="cinEmail" type="email"
          placeholder="Email address" autocomplete="email">

        <input id="cinPassword" type="password"
          placeholder="Password" autocomplete="current-password">

        <div>
          <button id="cinSignIn">Sign In</button>
          <button id="cinSignUp">Create Account</button>
        </div>

        <button class="secondary" id="cinForgot">
          Forgot Password?
        </button>

        <p class="cin-auth-message"></p>
      </div>
    `;

    document.getElementById("cinSignIn").onclick = signIn;
    document.getElementById("cinSignUp").onclick = signUp;
    document.getElementById("cinForgot").onclick = forgotPassword;
  }

  function getCredentials() {
    return {
      email: document.getElementById("cinEmail").value.trim(),
      password: document.getElementById("cinPassword").value
    };
  }

  async function signUp() {
    const { email, password } = getCredentials();

    if (!email || password.length < 6) {
      showMessage("Enter your email and a password of at least 6 characters.");
      return;
    }

    showMessage("Creating your account...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        showMessage("This email already has an account. Please sign in or use Forgot Password.");
      } else {
        showMessage(error.message);
      }
      return;
    }

    if (data.session) {
      currentUser = data.user;
      await loadProfiles();
    } else {
      showMessage("Account request received. Check your email to confirm your account.");
    }
  }

  async function signIn() {
    const { email, password } = getCredentials();

    if (!email || !password) {
      showMessage("Enter your email and password.");
      return;
    }

    showMessage("Signing in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(error.message);
      return;
    }

    currentUser = data.user;
    await loadProfiles();
  }

  async function forgotPassword() {
    const email = document.getElementById("cinEmail").value.trim();

    if (!email) {
      showMessage("Enter your account email address first.");
      return;
    }

    showMessage("Requesting password reset...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("If the account exists, a password reset email will be sent. Check your inbox and spam folder.");
  }

  function showUpdatePassword() {
    screen.style.display = "flex";
    hideSite();

    screen.innerHTML = `
      <div class="cin-auth-box">
        <div class="cin-auth-logo">CINEMORA</div>
        <h2>Choose a New Password</h2>

        <input id="cinNewPassword" type="password"
          placeholder="New password" autocomplete="new-password">

        <input id="cinConfirmPassword" type="password"
          placeholder="Confirm new password" autocomplete="new-password">

        <button id="cinSavePassword">Save New Password</button>

        <p class="cin-auth-message"></p>
      </div>
    `;

    document.getElementById("cinSavePassword").onclick = saveNewPassword;
  }

  async function saveNewPassword() {
    const password = document.getElementById("cinNewPassword").value;
    const confirmPassword = document.getElementById("cinConfirmPassword").value;

    if (password.length < 6) {
      showMessage("Your password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("The passwords do not match.");
      return;
    }

    showMessage("Updating your password...");

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("Password updated successfully. Please sign in.");

    await supabase.auth.signOut();
    currentUser = null;

    setTimeout(showAuth, 1200);
  }

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("cinemora_profiles")
      .select("*")
      .eq("owner_user_id", currentUser.id)
      .order("sort_order");

    if (error) {
      screen.style.display = "flex";
      showMessage(error.message);
      return;
    }

    profiles = data || [];

    if (profiles.length === 0) {
      const defaults = [
        { name: "Main Profile", avatar_emoji: "👑", sort_order: 1 }
      ];

      const { error: insertError } = await supabase
        .from("cinemora_profiles")
        .insert(defaults.map(profile => ({
          ...profile,
          owner_user_id: currentUser.id
        })));

      if (insertError) {
        screen.style.display = "flex";
        showMessage(insertError.message);
        return;
      }

      return loadProfiles();
    }

    renderProfiles();
  }

  function renderProfiles() {
    screen.style.display = "flex";

    screen.innerHTML = `
      <div class="cin-auth-box">
        <div class="cin-auth-logo">CINEMORA</div>
        <h2>Who's Watching?</h2>
        <div id="cinProfileList"></div>

        <div>
          <button id="cinAddProfile">Add Profile +</button>
          <button id="cinEditProfile" class="secondary">Edit Profile</button>
          <button id="cinDeleteProfile" class="secondary">Delete Profile</button>
          <button id="cinSignOut" class="secondary">Sign Out</button>
        </div>

        <p class="cin-auth-message"></p>
      </div>
    `;

    const list = document.getElementById("cinProfileList");

    profiles.forEach(profile => {
      const button = document.createElement("button");
      button.className = "cin-profile-button";

      const avatar = document.createElement("span");
      avatar.className = "cin-profile-avatar";
      avatar.textContent = profile.avatar_emoji;

      const name = document.createElement("span");
      name.textContent = profile.name;

      button.append(avatar, name);
      button.onclick = () => selectProfile(profile);

      list.appendChild(button);
    });

    document.getElementById("cinAddProfile").onclick = addProfile;
    document.getElementById("cinEditProfile").onclick = editProfile;
    document.getElementById("cinDeleteProfile").onclick = deleteProfile;
    document.getElementById("cinSignOut").onclick = signOut;
  }

  function selectProfile(profile) {
    activeProfile = profile;
    window.cinemoraActiveProfile = profile;

    try {
      localStorage.setItem("cinemoraActiveProfile", profile.id);
    } catch (error) {}

    screen.style.display = "none";

    const profileScreen = document.getElementById("profileScreen");
    const siteContent = document.getElementById("siteContent");

    if (profileScreen) profileScreen.style.display = "none";
    if (siteContent) siteContent.style.display = "block";

    addToolbar();
  }

  function addToolbar() {
    let toolbar = document.getElementById("cinemoraToolbar");

    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.id = "cinemoraToolbar";

      const site = document.getElementById("siteContent");
      if (site) {
        site.prepend(toolbar);
      } else {
        document.body.prepend(toolbar);
      }
    }

    toolbar.innerHTML = `
      <span id="cinToolbarProfile"></span>
      <button id="cinSwitchProfile">Switch Profile</button>
      <button id="cinNotifications">Notifications</button>
      <button id="cinToolbarSignOut">Sign Out</button>
    `;

    document.getElementById("cinToolbarProfile").textContent =
      activeProfile.avatar_emoji + " " + activeProfile.name;

    document.getElementById("cinSwitchProfile").onclick = renderProfiles;
    document.getElementById("cinToolbarSignOut").onclick = signOut;
    document.getElementById("cinNotifications").onclick = toggleNotifications;

    let panel = document.getElementById("cinemoraNotifications");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "cinemoraNotifications";
      panel.textContent =
        "You're all caught up! New CINEMORA updates will appear here when notifications are connected.";
      toolbar.after(panel);
    }
  }

  function toggleNotifications() {
    const panel = document.getElementById("cinemoraNotifications");
    if (!panel) return;

    panel.style.display =
      panel.style.display === "block" ? "none" : "block";
  }

    async function addProfile() {
    if (profiles.length >= 5) {
      showMessage("You can have up to 5 profiles on this account.");
      return;
    }

    const type = prompt(
      "Choose profile type:\n1. Kids\n2. Family\n3. Guest\n4. Other"
    );
    if (!type) return;

    const choices = {
      "1": { label: "Kids", emoji: "🧸", kids: true },
      "2": { label: "Family", emoji: "👨‍👩‍👧", kids: false },
      "3": { label: "Guest", emoji: "👤", kids: false },
      "4": { label: "Other", emoji: "🙂", kids: false }
    };

    const selected = choices[type.trim()];
    if (!selected) {
      showMessage("Please choose 1, 2, 3 or 4.");
      return;
    }

    const name = prompt("Enter profile name:", selected.label);
    if (!name || !name.trim()) return;

    const emoji = prompt("Choose an avatar emoji:", selected.emoji) || selected.emoji;

    const { error } = await supabase
      .from("cinemora_profiles")
      .insert({
        owner_user_id: currentUser.id,
        name: name.trim(),
        avatar_emoji: emoji,
        is_kids: selected.kids,
        sort_order: profiles.length + 1
      });

    if (error) {
      showMessage(error.message);
      return;
    }

    await loadProfiles();
  }

  async function editProfile() {
    const number = prompt(
      "Enter the profile number to edit:\n" +
      profiles.map((p, i) => `${i + 1}. ${p.name}`).join("\n")
    );

    const profile = profiles[Number(number) - 1];
    if (!profile) return;

    const name = prompt("Enter the new profile name:", profile.name);
    if (!name || !name.trim()) return;

    const emoji = prompt("Enter the new avatar emoji:", profile.avatar_emoji);
    if (!emoji) return;

    const { error } = await supabase
      .from("cinemora_profiles")
      .update({
        name: name.trim(),
        avatar_emoji: emoji,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id)
      .eq("owner_user_id", currentUser.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    await loadProfiles();
  }

  async function deleteProfile() {
    const number = prompt(
      "Enter the profile number to delete:\n" +
      profiles.map((p, i) => `${i + 1}. ${p.name}`).join("\n")
    );

    const profile = profiles[Number(number) - 1];
    if (!profile) return;
         if (profile.name === "Main Profile") {
      showMessage("The Main Profile cannot be deleted.");
      return;
    }
    if (!confirm(`Delete the ${profile.name} profile?`)) return;

    const { error } = await supabase
      .from("cinemora_profiles")
      .delete()
      .eq("id", profile.id)
      .eq("owner_user_id", currentUser.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    await loadProfiles();
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showMessage(error.message);
      return;
    }

    currentUser = null;
    profiles = [];
    activeProfile = null;
    window.cinemoraActiveProfile = null;

    const toolbar = document.getElementById("cinemoraToolbar");
    const panel = document.getElementById("cinemoraNotifications");

    if (toolbar) toolbar.remove();
    if (panel) panel.remove();

    showAuth();
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      showUpdatePassword();
    }
  });

  async function start() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      showAuth();
      return;
    }

    if (data.session) {
      currentUser = data.session.user;
      await loadProfiles();
    } else {
      showAuth();
    }
  }

  start();
})();

