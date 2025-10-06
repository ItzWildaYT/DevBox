export async function handler(event, context) {
  try {
    if (!event.body) throw new Error("No request body");
    const { code } = JSON.parse(event.body);
    if (!code) throw new Error("No code provided");

    const apiKey = process.env.GEMINI_API_KEY;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `Explain this code:\n${code}` }],
              role: "user",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        explanation: data.text || "No explanation returned",
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
