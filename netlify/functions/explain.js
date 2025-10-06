export async function handler(event, context) {
  try {
    if (!event.body) throw new Error("No request body");
    const { code } = JSON.parse(event.body);
    if (!code) throw new Error("No code provided");

    const apiKey = process.env.BLACKBOX_API_KEY;

    const response = await fetch(
      "https://api.blackbox.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "blackboxai/openai/gpt-4",
          messages: [
            {
              role: "user",
              content: `Explain this code:\n${code}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 256,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BlackBox API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        explanation: data.choices[0].message.content || "No explanation returned",
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
