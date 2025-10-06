const fetch = require('node-fetch')
exports.handler = async function(event){
  const body = JSON.parse(event.body || '{}')
  const prompt = body.prompt || ''
  if(!prompt) return { statusCode: 400, body: JSON.stringify({ error: 'no prompt' }) }
  const apiKey = process.env.OPENAI_API_KEY
  if(!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'missing api key' }) }
  const payload = {
    model: 'gpt-5-nano',
    input: `Explain common JavaScript issues and fixes for the following code:\n\n${prompt}`,
    max_output_tokens: 512
  }
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(payload)
  })
  if(!r.ok) {
    const text = await r.text()
    return { statusCode: r.status, body: text }
  }
  const data = await r.json()
  const explanation = (data.output && data.output[0] && (data.output[0].content || data.output[0].text)) || JSON.stringify(data)
  return { statusCode: 200, body: JSON.stringify({ explanation }) }
}
