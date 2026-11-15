(() => {
  const loginButton = document.querySelector('#loginButton');
  const username = document.querySelector('#u');
  const password = document.querySelector('#p');
  const notice = document.querySelector('#notice');

  if (!loginButton || !username || !password) return;

  const show = (message) => {
    if (notice) notice.textContent = message;
  };

  async function submitLogin() {
    loginButton.disabled = true;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.value, password: password.value })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '登录失败');
      window.location.reload();
    } catch (error) {
      show(error.message);
    } finally {
      loginButton.disabled = false;
    }
  }

  loginButton.addEventListener('click', submitLogin, { capture: true });
  password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitLogin();
  });
})();
