import fetch from 'node-fetch';

export async function handler(event, context) {
  try {
    const { code } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY; 

    const response = await fetch('https://api.google.com/gemini/v1/models/gemini-2.5-flash:generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [{ content: `Explain this code:\n${code}` }],
      }),
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ explanation: data.outputs[0].content }),
    };
  } catch (error) {
    console.error('Error explaining code:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to explain code' }),
    };
  }
}

