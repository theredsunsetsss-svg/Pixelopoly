const list = document.getElementById('users-list');

async function loadUsers() {
  const res = await fetch('/api/admin/users', { credentials: 'include' });
  if (!res.ok) { location.href = 'login.html'; return; }
  const { users } = await res.json();
  
  list.innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.banned ? '🚫 Забанен' : '✅ Активен'}</td>
      <td>
        <button class="action" style="padding:5px; font-size:10px; margin:0" onclick="toggleBan(${u.id}, ${!u.banned})">
          ${u.banned ? 'Разбанить' : 'Забанить'}
        </button>
      </td>
    </tr>
  `).join('');
}

window.toggleBan = async (userId, banned) => {
  await fetch('/api/admin/ban', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ userId, banned })
  });
  loadUsers();
};

loadUsers();