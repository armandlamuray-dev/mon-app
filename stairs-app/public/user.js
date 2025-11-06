// utilitaire : créer slug propre à partir du titre
function makeSlug(str) {
  return str
    .toString()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// 🔹 Enregistrer une page
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) {
    alert("Vous devez être connecté.");
    window.location.href = "/login.html";
    return;
  }

  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const imageInput = document.getElementById("image");
  const slugInput = document.getElementById("slug");

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const image = imageInput.value.trim();
  let slug = slugInput?.value.trim();

  if (!title || !content) { alert("Veuillez remplir tous les champs."); return; }
  if (!slug) slug = makeSlug(title);

  const isPublic = document.getElementById("publicPage")?.checked || false;
  const payload = { slug, title, content, image, username: user.username, public: isPublic };

  try {
    const res = await fetch("/user/add-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("Erreur add-page:", data || await res.text());
      alert((data && data.message) || "Erreur lors de la sauvegarde.");
      return;
    }

    alert(data?.message || "Page enregistrée !");
    titleInput.value = "";
    contentInput.value = "";
    imageInput.value = "";
    if (slugInput) slugInput.value = "";
    await loadMyPages();
  } catch (err) {
    console.error("Erreur réseau add-page:", err);
    alert("Impossible de contacter le serveur.");
  }
}

// 🔹 Charger toutes les pages de l’utilisateur
async function loadMyPages() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) { window.location.href = "/login.html"; return; }

  const container = document.getElementById("pages-list");
  if (!container) return;
  container.innerHTML = "Chargement...";

  try {
    const res = await fetch(`/user/pages/${encodeURIComponent(user.username)}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => null);
      console.error("Erreur loadMyPages:", txt);
      container.innerText = "Erreur lors du chargement des pages.";
      return;
    }

    const pages = await res.json();
    container.innerHTML = "";

    if (!pages || pages.length === 0) {
      container.innerHTML = "<p>Aucune page pour le moment.</p>";
      return;
    }

    pages.forEach(p => {
      const div = document.createElement("div");
      div.className = "page-card";
      const preview = (p.content || "").length > 300 ? p.content.slice(0,300) + "…" : p.content;
      div.innerHTML = `
        <h3>${escapeHtml(p.title || "(sans titre)")}</h3>
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title||"image")}" width="200"><br>` : ""}
        <p>${preview}</p>
        <small>slug: ${escapeHtml(p.slug||"")} • public: ${p.public ? "Oui" : "Non"}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Erreur réseau loadMyPages:", err);
    container.innerText = "Erreur réseau lors du chargement.";
  }
}

// 🔹 Sécurité : échappement HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 🔹 Déconnexion
function logout() {
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

// 🔹 Initialisation
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username || !user.role) {
    window.location.href = "/login.html";
    return;
  }

  const welcomeEl = document.getElementById("welcome");
  if (welcomeEl) welcomeEl.innerText = `Bienvenue, ${user.username} 👋`;

  if (!document.getElementById("logoutBtn")) {
    const btn = document.createElement("button");
    btn.id = "logoutBtn";
    btn.textContent = "Se déconnecter";
    btn.style.margin = "10px 0";
    btn.onclick = logout;
    document.body.insertBefore(btn, document.body.firstChild);
  }

  loadMyPages();
});
