 // 🔹 Génère un ID aléatoire de 16 caractères
function generateId() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

// 🔹 Ajouter une page
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) return alert("Vous devez être connecté.");

  const title = document.getElementById("title").value.trim();
  const isPublic = document.getElementById("publicPage").checked;

  if (!title) return alert("Veuillez saisir un titre.");

  const payload = {
    id: generateId(),
    title,
    username: user.username,
    created_at: new Date(),
    nb_subpages: 0,
    public: isPublic
  };

  try {
    const res = await fetch("/user/add-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Erreur lors de la création.");

    alert(data.message || "✅ Page créée !");
    document.getElementById("title").value = "";
    await loadMyPages();
  } catch (err) {
    console.error("Erreur addPage:", err);
    alert(err.message || "Erreur serveur.");
  }
}

// 🔹 Charger les pages de l’utilisateur
async function loadMyPages() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user?.username) return (window.location.href = "/login.html");

  const container = document.getElementById("pages-list");
  container.innerHTML = "Chargement...";

  try {
    const res = await fetch(`/user/pages/${encodeURIComponent(user.username)}`);
    const pages = await res.json();
    if (!res.ok) throw new Error("Erreur lors du chargement.");

    if (!pages || pages.length === 0) {
      container.innerHTML = "<p>Aucune page.</p>";
      return;
    }

    container.innerHTML = "";
    pages.forEach((p) => {
      const div = document.createElement("div");
      div.className = "page-card";
      div.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p><strong>ID:</strong> ${escapeHtml(p.id)}</p>
        <p><strong>Public:</strong> ${p.public ? "Oui" : "Non"}</p>
        <small>Créée le : ${new Date(p.created_at).toLocaleString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erreur réseau.</p>";
  }
}

// 🔹 Supprimer une page
async function deletePage() {
  const slug = document.getElementById("slug").value.trim();
  if (!slug) return alert("Entrez l'ID de la page à supprimer.");
  try {
    const res = await fetch(`/admin/delete-page/${encodeURIComponent(slug)}`, { method: "DELETE" });
    alert(await res.text());
    loadMyPages();
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la suppression.");
  }
}

// 🔹 Supprimer un utilisateur
async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez un nom d'utilisateur.");
  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    alert(await res.text());
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la suppression.");
  }
}

// 🔹 Échappement HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
