// Bosh sahifada kerak emas, shu yerda umumiy front kodlari

document.addEventListener('DOMContentLoaded', () => {
  // Agar login sahifasida bo'lsa
  if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = loginForm.username.value.trim();
      const password = loginForm.password.value.trim();

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) {
          // role asosida redirect qilamiz
          if (data.role === 'admin') {
            window.location.href = 'admin-panel.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        } else {
          loginError.textContent = data.error || 'Noto‘g‘ri login yoki parol';
        }
      } catch (err) {
        loginError.textContent = 'Server bilan aloqa yo‘q';
      }
    });
  }

  // Agar admin panelda bo'lsa
  if (document.getElementById('commentsContainer')) {
    const logoutBtn = document.getElementById('logoutBtn');
    const commentsContainer = document.getElementById('commentsContainer');
    const commentForm = document.getElementById('commentForm');

    // Chiqish tugmasi
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = 'login.html';
    });

    // Fikrlarni yuklash
    async function loadComments() {
      const res = await fetch('/api/comments');
      const comments = await res.json();
      commentsContainer.innerHTML = '';
      comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
          <p><strong>Ism:</strong> ${escapeHtml(c.author)}</p>
          <p><strong>Izoh:</strong> ${escapeHtml(c.content)}</p>
          <p><strong>Baholash:</strong> ${c.rating} ⭐</p>
          <div class="actions">
            <button class="editBtn" data-id="${c.id}">Tahrirlash</button>
            <button class="deleteBtn" data-id="${c.id}">O'chirish</button>
          </div>
        `;
        commentsContainer.appendChild(div);
      });

      // Edit tugmasi
      document.querySelectorAll('.editBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          const comments = await (await fetch('/api/comments')).json();
          const comment = comments.find(c => c.id === id);
          if (!comment) return alert('Fikr topilmadi');

          const author = prompt('Ismni kiriting:', comment.author);
          const content = prompt('Izohni kiriting:', comment.content);
          const rating = prompt('Baholash (1-5):', comment.rating);

          if (author && content && rating) {
            await fetch(`/api/comments/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ author, content, rating: Number(rating) }),
            });
            loadComments();
          }
        });
      });

      // Delete tugmasi
      document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Haqiqatan ham o‘chirmoqchimisiz?')) {
            await fetch(`/api/comments/${id}`, { method: 'DELETE' });
            loadComments();
          }
        });
      });
    }

    loadComments();

    // Yangi fikr qo'shish
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = commentForm.author.value.trim();
      const content = commentForm.content.value.trim();
      const rating = Number(commentForm.rating.value);

      if (!author || !content || rating < 1 || rating > 5) return alert('Iltimos, to‘g‘ri ma‘lumot kiriting.');

      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content, rating }),
      });

      commentForm.reset();
      loadComments();
    });
  }

  // Agar foydalanuvchi panelida bo'lsa
  if (document.getElementById('healthForm')) {
    const logoutBtn = document.getElementById('logoutBtn');
    const healthForm = document.getElementById('healthForm');
    const healthList = document.getElementById('healthList');

    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = 'login.html';
    });

    async function loadHealthData() {
      const res = await fetch('/api/health');
      if (res.status === 401) {
        alert('Iltimos, tizimga kiring.');
        window.location.href = 'login.html';
        return;
      }
      const data = await res.json();
      healthList.innerHTML = '';
      data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'health-item';
        div.innerHTML = `
          <p><strong>Kasallik nomi:</strong> ${escapeHtml(item.disease)}</p>
          <p><strong>Sana:</strong> ${escapeHtml(item.date)}</p>
          <p><strong>Izoh:</strong> ${escapeHtml(item.notes || '')}</p>
        `;
        healthList.appendChild(div);
      });
    }

    loadHealthData();

    healthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const disease = healthForm.disease.value.trim();
      const date = healthForm.date.value;
      const notes = healthForm.notes.value.trim();

      if (!disease || !date) return alert('Kasallik nomi va sana kiritilishi shart.');

      await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease, date, notes }),
      });

      healthForm.reset();
      loadHealthData();
    });
  }
});

// XSS oldini olish uchun oddiy funksiya
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}
