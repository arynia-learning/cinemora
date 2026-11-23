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
    .cin-auth-message {
      color: #d6ad58;
      font-size: 14px;
      margin: 12px 0;
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
  `;
  document.head.appendChild(style);

  const screen = document.createElement("div");
  screen.id = "cinemoraAuth";
  document.body.appendChild(screen);

  function showMessage(message) {
    const box = screen.querySelector(".cin-auth-message");
    if (box) box.textContent = message;
  }

  function showAuth() {
    screen.style.display = "flex";

    const profileScreen = document.getElementById("profileScreen");
    const siteContent = document.getElementById("siteContent");

    if (profileScreen) profileScreen.style.display = "none";
    if (siteContent) siteContent.style.display = "none";

    screen.innerHTML = `
      <div class="cin-auth-box">
        <div class="cin-auth-logo">CINEMORA</div>
        <h2>Welcome to CINEMORA</h2>
        <p>Sign in or create your account.</p>

        <input id="cinEmail" type="email" placeholder="Email address">
        <input id="cinPassword" type="password" placeholder="Password">

        <div>
          <button id="cinSignIn">Sign In</button>
          <button id="cinSignUp">Create Account</button>
        </div>

        <p class="cin-auth-message"></p>
      </div>
    `;

    document.getElementById("cinSignIn").onclick = signIn;
    document.getElementById("cinSignUp").onclick = signUp;
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showMessage(error.message);
    } else {
      showMessage("Account created. Check your email if confirmation is required.");
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

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("cinemora_profiles")
      .select("*")
      .eq("owner_user_id", currentUser.id)
      .order("sort_order");

    if (error) {
      showMessage(error.message);
      return;
    }

    profiles = data || [];

    if (profiles.length === 0) {
      const defaults = [
        { name: "Main Profile", avatar_emoji: "👑", sort_order: 1 },
        { name: "Kids", avatar_emoji: "🧸", is_kids: true, sort_order: 2 },
        { name: "Family", avatar_emoji: "👨‍👩‍👧", sort_order: 3 },
        { name: "Guest", avatar_emoji: "👤", sort_order: 4 }
      ];

      const { error: insertError } = await supabase
        .from("cinemora_profiles")
        .insert(defaults.map(profile => ({
          ...profile,
          owner_user_id: currentUser.id
        })));

      if (insertError) {
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
          <button id="cinEditProfile">Edit Profile</button>
          <button id="cinDeleteProfile">Delete Profile</button>
          <button id="cinSignOut">Sign Out</button>
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
    window.cinemoraActiveProfile = profile;

    screen.style.display = "none";

    const profileScreen = document.getElementById("profileScreen");
    const siteContent = document.getElementById("siteContent");

    if (profileScreen) profileScreen.style.display = "none";
    if (siteContent) siteContent.style.display = "block";

    let label = document.getElementById("activeProfile");

    if (!label) {
      label = document.createElement("div");
      label.id = "activeProfile";
      label.style.cssText =
        "color:#d6ad58;font-weight:bold;padding:12px;";
      document.querySelector("header")?.appendChild(label);
    }

    label.textContent = profile.avatar_emoji + " " + profile.name;
  }

  async function addProfile() {
    if (profiles.length >= 5) {
      showMessage("You can have up to 5 profiles on this account.");
      return;
    }

    const name = prompt("Enter the new profile name:");
    if (!name || !name.trim()) return;

    const emoji = prompt("Choose an avatar emoji:", "👤") || "👤";

    const { error } = await supabase
      .from("cinemora_profiles")
      .insert({
        owner_user_id: currentUser.id,
        name: name.trim(),
        avatar_emoji: emoji,
        is_kids: name.toLowerCase().includes("kids"),
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
    showAuth();
  }

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
