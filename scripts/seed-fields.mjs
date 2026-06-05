const BASE_URL = 'https://project-gr-back.vercel.app';

const fields = [
  { name: '釣り',  icon: '🎣' },
  { name: '筋トレ', icon: '💪' },
  { name: '読書',  icon: '📖' },
];

for (const field of fields) {
  const res = await fetch(`${BASE_URL}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(field),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✓ ${field.icon} ${field.name} (${data._id})`);
  } else {
    console.error(`✗ ${field.name}:`, data);
  }
}
