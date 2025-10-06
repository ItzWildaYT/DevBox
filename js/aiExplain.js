export default async function explainWithServer(code) {
  const response = await fetch("/.netlify/functions/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    let errMsg = "Failed to get explanation";
    try {
      const data = await response.json();
      if (data.error) errMsg += ": " + data.error;
    } catch {}
    throw new Error(errMsg);
  }

  return await response.json();
}

