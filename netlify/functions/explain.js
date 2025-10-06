import fetch from "node-fetch";

export async function handler(event, context) {
  try {
    if (!event.body) throw new Error("No request body");
    const { code } = JSON.parse(event.body);
    if (!code) throw new Error("No code provided");

    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        input: `Explain this code:\n${code}`,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        explanation: data.output_text || "No explanation returned",
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
