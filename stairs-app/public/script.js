// Gestion login
document.addEventListener('DOMContentLoaded', () => {

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } else alert(data.message);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('new-username').value;
      const password = document.getElementById('new-password').value;
      const res = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      alert(data.message);
    });
  }

});


app.post('/pages/add', async (req, res) => {
  const { title, content, image, id_user, public, related_slugs } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  const query = 'INSERT INTO pages (slug, title, content, image, public, id_user, related_slugs) VALUES (?, ?, ?, ?, ?, ?, ?)';
  try {
    await client.execute(query, [slug, title, content, image, public, id_user, related_slugs || []]);
    res.json({ success: true, message: 'Page ajoutée avec relations !' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


app.get('/page/:slug', async (req, res) => {
  const { slug } = req.params;
  const query = 'SELECT * FROM pages WHERE slug = ?';
  try {
    const result = await client.execute(query, [slug]);
    if (result.rowLength === 0) return res.status(404).json({ message: 'Page non trouvée' });
    const page = result.rows[0];

    // Si tu veux récupérer directement les pages liées
    const related = [];
    if (page.related_slugs && page.related_slugs.length > 0) {
      for (const rslug of page.related_slugs) {
        const rpage = await client.execute('SELECT slug, title FROM pages WHERE slug = ?', [rslug]);
        if (rpage.rowLength > 0) related.push(rpage.rows[0]);
      }
    }

    res.json({ ...page, related });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
