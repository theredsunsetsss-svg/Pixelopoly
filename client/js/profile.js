// Запрашиваем данные текущего пользователя у сервера
fetch('/api/me')
  .then(res => {
    if (!res.ok) throw new Error('Не авторизован');
    return res.json();
  })
  .then(data => {
    const user = data.user;
    
    // Заполняем страницу данными
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-email').textContent = user.email;
    
    // Отображаем роль
    const roleText = user.role === 'admin' ? '👑 Администратор' : '⚔️ Игрок';
    document.getElementById('user-role').textContent = roleText;
    
    // Статистика
    document.getElementById('user-wins').textContent = user.wins || 0;
    document.getElementById('user-games').textContent = user.games_played || 0;
  })
  .catch(() => {
    // Если произошла ошибка (не залогинен), отправляем на вход
    window.location.href = 'login.html';
  });

// Обработка кнопки "Выйти"
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'main.html'; // Возвращаем на главную
});