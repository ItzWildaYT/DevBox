const explainEndpoint = '/.netlify/functions/explain'
export async function explainWithServer(prompt){
  const res = await fetch(explainEndpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})})
  if(!res.ok) throw new Error('explain failed')
  const data = await res.json()
  return data
}
export default explainWithServer
