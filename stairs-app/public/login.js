document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    // log complet pour debug serveur
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    console.log("Login response status:", res.status);
    console.log("Login response raw:", text);
    console.log("Login response json:", data);

    if (!res.ok || !data || !data.username) {
      alert((data && data.message) || "Erreur de connexion");
      return;
    }

    // Stocker l'objet user dans localStorage
    const user = {
      username: data.username,
      role: data.role,
      email: data.email,
      created_at: data.created_at
    };
    localStorage.setItem("user", JSON.stringify(user));

    // Redirection selon rôle
    if (user.role === "admin") {
      window.location.href = "choice.html";
    } else {
      window.location.href = "user.html";
    }

  } catch (err) {
    console.error("Erreur de requête :", err);
    alert("Impossible de se connecter au serveur.");
  }
});
