const knowledgeData = {
  'タイミング': {
    items: {
      '朝マズメは中層レンジが基本': [
        '6/2　アジ連続ヒット、中層で反応',
        '5/28　サバ5匹、同条件で再現',
      ],
      '風速5m以上は釣りにならない': [
        '6/1　風強くて早上がり',
        '5/20　同条件で釣果ゼロ',
      ],
      '夕マズメも侮れない': [
        '6/2　夕マズメで大物ヒット',
      ],
    }
  },
  '道具・仕掛け': {
    items: {
      'タモは釣り始め前に準備する': [
        '6/3　大物バラした、タモ準備が遅かった',
      ],
    }
  },
  '場所': {
    items: {}
  },
  'まだわからないこと': {
    items: {
      '潮位の影響': [],
      'ルアーカラーの法則': [],
    }
  },
};

let currentCategory = '';

function goTo(screenId) {
  window.scrollTo(0, 0);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function goToCategory(name) {
  currentCategory = name;
  document.getElementById('category-title').textContent = name;

  const container = document.getElementById('category-items');
  container.innerHTML = '';

  const data = knowledgeData[name] || { items: {} };
  Object.keys(data.items).forEach(itemName => {
    const div = document.createElement('div');
    div.className = 'link-item';
    div.textContent = itemName;
    div.onclick = () => goToItem(itemName);
    container.appendChild(div);
  });

  const addDiv = document.createElement('div');
  addDiv.className = 'link-item add-link';
  addDiv.textContent = '＋';
  container.appendChild(addDiv);

  goTo('knowledge-category');
}

function goToItem(name) {
  document.getElementById('item-title').textContent = name;
  document.getElementById('item-back-btn').onclick = () => goToCategory(currentCategory);

  const notes = (knowledgeData[currentCategory]?.items[name]) || [];
  const container = document.getElementById('item-notes');
  container.innerHTML = notes.length === 0
    ? '<div class="item-empty">まだメモはありません</div>'
    : notes.map(n => `<div class="item-note">${n}</div>`).join('');

  goTo('knowledge-item');
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
