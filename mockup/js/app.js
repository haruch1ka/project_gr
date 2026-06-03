function goTo(screenId) {
  window.scrollTo(0, 0);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function toggleK(header) {
  const toggle = header.querySelector('.k-toggle');
  const children = header.nextElementSibling;
  const isOpen = children.classList.contains('open');
  children.classList.toggle('open', !isOpen);
  toggle.textContent = isOpen ? '▶' : '▼';
}

function saveRecord() {
  const input = document.getElementById('memoInput');
  const text = input.value.trim();
  if (!text) return;

  const logs = document.querySelector('.recent-logs');
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
  const newItem = document.createElement('div');
  newItem.className = 'log-item';
  newItem.innerHTML = `<span class="log-date">${dateStr}</span><span class="log-text">${text}</span>`;
  logs.insertBefore(newItem, logs.children[1]);

  input.value = '';
  showToast('保存しました');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
