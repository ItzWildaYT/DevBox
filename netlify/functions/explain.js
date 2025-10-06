export async function handler(event, context) {
  try {
    if (!event.body) throw new Error("No request body");
    const { code } = JSON.parse(event.body);
    if (!code) throw new Error("No code provided");

    const apiKey = "AIzaSyBEWSm8AA9WKUM16lhsa2yctZpmKQEy0tE";

    const response = await fetch(
      "https://api.google.com/gemini/v1/models/gemini-2.5-flash:generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: [{ content: `Explain this code:\n${code}` }],
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
        explanation: data.outputs?.[0]?.content || "No explanation returned",
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
