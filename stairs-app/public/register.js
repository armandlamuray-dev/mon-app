// 🔹 Gestion du formulaire d'inscription
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!username || !password || !email) {
    alert("Merci de remplir tous les champs !");
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email }),
    });

    // Parse JSON ou fallback en null
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      alert((data && data.message) || "Erreur lors de l'inscription.");
      return;
    }

    alert(data.message || "Compte créé avec succès !");
    window.location.href = "login.html"; // redirection uniquement si succès
  } catch (err) {
    console.error("Erreur réseau :", err);
    alert("Impossible de contacter le serveur.");
  }
});
