document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    // log complet pour debug serveur
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (err) { data = null; }

    console.log("Login response status:", res.status);
    console.log("Login response raw:", text);
    console.log("Login response json:", data);

    if (!res.ok || !data || !data.username) {
      alert((data && data.message) || "Erreur de connexion");
      return;
    }

    const user = {
      username: data.username,
      role: data.role
    };
    // stocker **toujours** l'objet user sous la même clef
    localStorage.setItem("user", JSON.stringify(user));

    res.json({ 
      message: "Connexion réussie.", 
      username: user.username, 
      role: user.role, 
      email: user.email, 
      created_at: user.created_at 
    });
    
    if (data.role === "admin") {
      window.location.href = "choice.html";
    } else {
      window.location.href = "user.html";
    }
  } catch (err) {
    console.error("Erreur de requête :", err);
    alert("Impossible de se connecter au serveur.");
  }
});
