export default async function explainWithServer(code) {
  const response = await fetch('/.netlify/functions/explain.js', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to get explanation');
  }

  const data = await response.json();
  return data;
}
