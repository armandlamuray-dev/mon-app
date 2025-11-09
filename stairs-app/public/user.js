function generateId(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
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
    <label class="small">Image (URL)</label>
    <input type="text" id="subImage_${subId}" placeholder="https://...">
  `;
  container.appendChild(div);
}

// Création de la page principale
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) {
    alert("Connectez-vous d’abord.");
    window.location.href = "/login.html";
    return;
  }

  const title = document.getElementById("title").value.trim();
  const isPublic = document.getElementById("publicPage").value === "true";
  if (!title) return alert("Veuillez entrer un titre.");

  const subpages = [];
  const blocks = document.querySelectorAll(".subpage");
  blocks.forEach((block, i) => {
    const sub_id = i + 1;
    const content = document.getElementById(`subContent_${sub_id}`).value.trim();
    const image = document.getElementById(`subImage_${sub_id}`).value.trim();
    if (content) subpages.push({ sub_id, content, image: image || null });
  });

  if (subpages.length === 0) return alert("Ajoutez au moins une sous-page.");

  const payload = {
    id: generateId(),
    title,
    username: user.username,
    public: isPublic,
    subpages
  };

  try {
    const res = await fetch("/user/add-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>null);
    if (!res.ok) return alert(data?.message || "Erreur création page.");
    alert(data.message || "Page créée !");
    document.getElementById("title").value = "";
    document.getElementById("subpages-container").innerHTML = "";
    addSubpageBlock(1);
    loadMyPages();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau.");
  }
}

// Afficher pages utilisateur
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
    for (const p of pages) {
      const card = document.createElement("div");
      card.className = "page-card";
      card.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p><strong>ID:</strong> ${escapeHtml(p.id)}</p>
        <p><strong>Sous-pages:</strong> ${p.nb_subpages ?? p.subpages?.length ?? "?"}</p>
        <p><strong>Public:</strong> ${p.public ? "Oui" : "Non"}</p>
      `;
      container.appendChild(card);
    }
  } catch (e) {
    console.error(e);
    container.textContent = "Erreur réseau.";
  }
}

// Fonctions admin
async function deletePage() {
  const id = document.getElementById("slug").value.trim();
  if (!id) return alert("Entrez un ID.");
  const res = await fetch(`/admin/delete-page/${encodeURIComponent(id)}`, { method: "DELETE" });
  alert(await res.text());
  loadMyPages();
}

async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez un nom d'utilisateur.");
  const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
  alert(await res.text());
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
    const res = await fetch(`/admin/page/${encodeURIComponent(id)}`);
    if (!res.ok) return alert("Page introuvable");
    const page = await res.json();
    document.getElementById("page-details").textContent = JSON.stringify(page, null, 2);
  });
  document.getElementById("delete-page-btn").addEventListener("click", deletePage);
  document.getElementById("delete-user-btn").addEventListener("click", deleteUser);

  // crée une première sous-page par défaut
  addSubpageBlock(1);
  loadMyPages();
});
