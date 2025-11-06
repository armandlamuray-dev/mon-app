// 🔹 Afficher les détails d'une page de manière lisible
async function viewPage() {
  const slug = document.getElementById("slug").value.trim();
  const container = document.getElementById("page-details");
  container.innerHTML = "";

  if (!slug) return alert("Veuillez saisir un slug.");

  try {
    const res = await fetch(`/admin/page/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      const txt = await res.text();
      return alert(`Erreur : ${txt}`);
    }

    const page = await res.json();

    const html = `
      <h3>${escapeHtml(page.title || "(sans titre)")}</h3>
      ${page.image ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || "image")}" style="max-width:200px;"><br>` : ""}
      <p>${escapeHtml(page.content)}</p>
      <small>Slug: ${escapeHtml(page.slug)} • Public: ${page.public ? "Oui" : "Non"}</small>
    `;
    container.innerHTML = html;

  } catch (err) {
    console.error("Erreur réseau viewPage :", err);
    alert("Impossible de récupérer la page.");
  }
}

// 🔹 Supprimer une page
async function deletePage() {
  const slug = document.getElementById("slug").value.trim();
  if (!slug) return alert("Veuillez saisir un slug.");

  try {
    const res = await fetch(`/admin/delete-page/${encodeURIComponent(slug)}`, { method: "DELETE" });
    const txt = await res.text();
    alert(txt);
    document.getElementById("page-details").innerHTML = "Aucun détail à afficher.";
  } catch (err) {
    console.error("Erreur deletePage :", err);
    alert("Impossible de supprimer la page.");
  }
}

// 🔹 Afficher les détails d'un utilisateur + ses pages publiques
async function viewUser() {
  const username = document.getElementById("userToDelete").value.trim();
  const container = document.getElementById("user-details");
  container.innerHTML = "";

  if (!username) return alert("Veuillez saisir un nom d'utilisateur.");

  try {
    // 1️⃣ Récupérer l'utilisateur
    const resUser = await fetch(`/admin/user/${encodeURIComponent(username)}`);
    if (!resUser.ok) {
      const txt = await resUser.text();
      return alert(`Erreur : ${txt}`);
    }

    const user = await resUser.json();

    // 2️⃣ Récupérer ses pages publiques
    const resPages = await fetch(`/pages/public?username=${encodeURIComponent(username)}`);
    let pages = [];
    if (resPages.ok) pages = await resPages.json();

    // 3️⃣ Affichage
    let html = `
      <p>Nom d'utilisateur : <strong>${escapeHtml(user.username)}</strong></p>
      <p>Rôle : <strong>${escapeHtml(user.role)}</strong></p>
    `;

    if (pages.length > 0) {
      html += `<h4>Pages publiques :</h4><ul>`;
      pages.forEach(p => {
        html += `<li>${escapeHtml(p.title)} (slug: ${escapeHtml(p.slug)})</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p>Aucune page publique.</p>`;
    }

    container.innerHTML = html;

  } catch (err) {
    console.error("Erreur réseau viewUser :", err);
    alert("Impossible de récupérer l'utilisateur ou ses pages.");
  }
}

// 🔹 Supprimer un utilisateur
async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Veuillez saisir un nom d'utilisateur.");

  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    const txt = await res.text();
    alert(txt);
    document.getElementById("user-details").innerHTML = "Aucun détail à afficher.";
  } catch (err) {
    console.error("Erreur deleteUser :", err);
    alert("Impossible de supprimer l'utilisateur.");
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

// 🔹 Attacher les événements après chargement du DOM
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("view-page-btn")?.addEventListener("click", viewPage);
  document.getElementById("delete-page-btn")?.addEventListener("click", deletePage);
  document.getElementById("view-user-btn")?.addEventListener("click", viewUser);
  document.getElementById("delete-user-btn")?.addEventListener("click", deleteUser);
});
