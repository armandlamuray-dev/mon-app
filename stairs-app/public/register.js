document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Merci de remplir tous les champs !");
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Erreur lors de l'inscription.");
      return;
    }

    alert("Compte créé avec succès !");
    window.location.href = "login.html"; // ✅ redirection uniquement si succès
  } catch (err) {
    console.error("Erreur réseau :", err);
    alert("Impossible de contacter le serveur.");
  }
});
