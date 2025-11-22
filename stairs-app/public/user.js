// Générer un ID aléatoire
function generateId(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Échapper le HTML pour éviter l'injection
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ajouter un bloc de sous-page
function addSubpageBlock(subId) {
  const container = document.getElementById("subpages-container");
  const div = document.createElement("div");
  div.className = "subpage";
  div.innerHTML = `
    <h4>Sous-page ${subId}</h4>
    <label class="small">Contenu</label>
    <textarea id="subContent_${subId}" rows="3" placeholder="Contenu de la sous-page ${subId}"></textarea>
    <label class="small">Image (depuis PC)</label>
    <input type="file" id="subImage_${subId}" accept="image/*">
  `;
  container.appendChild(div);
}

// Création d'une page principale
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user?.username) { alert("Connectez-vous."); return; }

  const titleInput = document.getElementById("title");
  const fileInput = document.getElementById("mainImage");

  const title = titleInput?.value.trim();
  const isPublic = document.getElementById("publicPage")?.value === "true";

  // Correction : seul le titre doit obligatoirement être rempli
  if (!title) {
    alert("Vous devez mettre un titre.");
    return;
  }

  // Correction : on récupère le texte de la sous-page 1
  const subpage1 = document.getElementById("subContent_1")?.value.trim();
  if (!subpage1) {
    alert("Vous devez remplir la sous-page 1, qui sert de contenu principal.");
    return;
  }

  // Correction : on envoie SUBPAGE1 comme contenu principal
  const content = subpage1;

  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content); // <-- contenu principal = sous-page 1
  formData.append("username", user.username);
  formData.append("public", isPublic);

  if (fileInput?.files?.length) formData.append("image", fileInput.files[0]);

  try {
    const res = await fetch("/user/add-page", { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    if (!res.ok) return alert(data?.message || "Erreur serveur");

    alert(data.message || "Page créée !");
    titleInput.value = "";
    document.getElementById("subContent_1").value = "";
    if (fileInput) fileInput.value = "";

    loadMyPages();
  } catch (err) {
    console.error("Erreur réseau addPage:", err);
    alert("Impossible de contacter le serveur.");
  }
}

// Afficher les pages de l'utilisateur
async function loadMyPages() {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("pages-list");
  if (!user || !user.username) { window.location.href = "/login.html"; return; }

  container.textContent = "Chargement...";
  try {
    const res = await fetch(`/user/pages/${encodeURIComponent(user.username)}`);
    if (!res.ok) return container.textContent = "Erreur chargement.";
    const pages = await res.json();
    if (!pages.length) { container.innerHTML = "<p>Aucune page.</p>"; return; }

    container.innerHTML = "";
    pages.forEach(p => {
      const card = document.createElement("div");
      card.className = "page-card";
      card.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p><strong>ID:</strong> ${escapeHtml(p.id)}</p>
        <p><strong>Sous-pages:</strong> ${p.nb_subpages ?? p.subpages?.length ?? "?"}</p>
        <p><strong>Public:</strong> ${p.public ? "Oui" : "Non"}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.textContent = "Erreur réseau.";
  }
}

// Fonctions admin
async function deletePage() {
  const id = document.getElementById("slug").value.trim();
  if (!id) return alert("Entrez un ID.");
  try {
    const res = await fetch(`/admin/delete-page/${encodeURIComponent(id)}`, { method: "DELETE" });
    alert(await res.text());
    loadMyPages();
  } catch (err) {
    console.error(err);
    alert("Erreur suppression page.");
  }
}

async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez un nom d'utilisateur.");
  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    alert(await res.text());
  } catch (err) {
    console.error(err);
    alert("Erreur suppression utilisateur.");
  }
}

// Initialisation
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) { window.location.href = "/login.html"; return; }

  document.getElementById("welcome").textContent = `Bienvenue, ${user.username} 👋`;
  if (user.role === "admin") document.getElementById("admin-section").style.display = "block";

  document.getElementById("createPageBtn").addEventListener("click", addPage);
  document.getElementById("addSubpageBtn").addEventListener("click", () => {
    const count = document.querySelectorAll(".subpage").length;
    addSubpageBlock(count + 1);
  });

  document.getElementById("view-page-btn").addEventListener("click", async () => {
    const id = document.getElementById("slug").value.trim();
    if (!id) return alert("Saisissez un ID");
    try {
      const res = await fetch(`/admin/page/${encodeURIComponent(id)}`);
      if (!res.ok) return alert("Page introuvable");
      const page = await res.json();
      document.getElementById("page-details").textContent = JSON.stringify(page, null, 2);
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    }
  });

  document.getElementById("delete-page-btn").addEventListener("click", deletePage);
  document.getElementById("delete-user-btn").addEventListener("click", deleteUser);

  // Crée une première sous-page par défaut
  addSubpageBlock(1);
  loadMyPages();
});
