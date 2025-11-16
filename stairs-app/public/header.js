// public/header.js
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const currentPage = window.location.pathname.split("/").pop(); // Exemple : "user.html"

  // Création du header
  const header = document.createElement("div");
  header.style.cssText = `
    width: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background-color: #1b263b;
    color: #fff;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
  `;

  // 🏠 Bouton Accueil
  const homeBtn = document.createElement("button");
  homeBtn.textContent = "🏠 Accueil";
  homeBtn.style.cssText = `
    background-color: #1e90ff;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
  `;
  homeBtn.onclick = () => window.location.href = "index.html";
  header.appendChild(homeBtn);

  // 👤 Si connecté → afficher le nom et le rôle
  if (user) {
    const userInfo = document.createElement("span");
    userInfo.textContent = `${user.username} (${user.role})`;
    userInfo.style.marginRight = "10px";
    header.appendChild(userInfo);

    // 🔑 Bouton Admin → visible uniquement pour les admins
    if (user.role === "admin" && currentPage !== "choice.html") {
      const adminChoiceBtn = document.createElement("button");
      adminChoiceBtn.textContent = "⚙️ Mode Admin";
      adminChoiceBtn.style.cssText = `
        background-color: #6c63ff;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
      `;
      adminChoiceBtn.onclick = () => window.location.href = "choice.html";
      header.appendChild(adminChoiceBtn);
    }

    // 🚪 Bouton Déconnexion
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "⛔ Déconnexion";
    logoutBtn.style.cssText = `
      background-color: #ff4d4d;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    `;
    logoutBtn.onclick = () => {
      localStorage.removeItem("user");
      alert("Vous avez été déconnecté.");
      window.location.href = "login.html";
    };
    header.appendChild(logoutBtn);
  }

  // Ajout du header à la page
  document.body.insertBefore(header, document.body.firstChild);
});
