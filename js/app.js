import {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  serverTimestamp,
  limit
} from './firebase.js'

let currentUser = null
const codeInput = document.getElementById('codeInput')
const runFrame = document.getElementById('runFrame')
const saveBtn = document.getElementById('saveBtn')
const runBtn = document.getElementById('runBtn')
const clearBtn = document.getElementById('clearBtn')
const publishPublic = document.getElementById('publishPublic')
const saveToProfile = document.getElementById('saveToProfile')
const libList = document.getElementById('libList')
const mySnippetsList = document.getElementById('mySnippetsList')
const signOutBtn = document.getElementById('signOutBtn')
const searchInput = document.getElementById('searchInput')
const searchMy = document.getElementById('searchMy')
const langSelect = document.getElementById('langSelect')
const errorBox = document.getElementById('errorBox')
const saveModal = document.getElementById('saveModal')
const snippetTitle = document.getElementById('snippetTitle')
const snippetDesc = document.getElementById('snippetDesc')
const snippetLang = document.getElementById('snippetLang')
const snippetTags = document.getElementById('snippetTags')
const cancelSave = document.getElementById('cancelSave')
const confirmSave = document.getElementById('confirmSave')

let toastContainer = document.getElementById('toastContainer')
if (!toastContainer) {
  toastContainer = document.createElement('div')
  toastContainer.id = 'toastContainer'
  toastContainer.style.position = 'fixed'
  toastContainer.style.top = '20px'
  toastContainer.style.left = '50%'
  toastContainer.style.transform = 'translateX(-50%)'
  toastContainer.style.zIndex = '9999'
  toastContainer.style.display = 'flex'
  toastContainer.style.flexDirection = 'column'
  toastContainer.style.gap = '10px'
  document.body.appendChild(toastContainer)
}

function showToast(type, text) {
  const node = document.createElement('div')
  node.textContent = text
  node.style.minWidth = '160px'
  node.style.padding = '12px 20px'
  node.style.borderRadius = '999px'
  node.style.display = 'flex'
  node.style.alignItems = 'center'
  node.style.justifyContent = 'center'
  node.style.boxShadow = '0 8px 30px rgba(2,6,23,0.6)'
  node.style.cursor = 'pointer'
  node.style.fontWeight = '600'
  node.style.color = '#fff'
  node.style.userSelect = 'none'
  node.style.transition = 'transform .12s ease, opacity .12s ease'
  node.style.background = type === 'success'
    ? 'linear-gradient(90deg,#10b981,#06b6d4)'
    : type === 'error'
    ? 'linear-gradient(90deg,#ef4444,#f97316)'
    : 'rgba(0,0,0,0.6)'
  node.onclick = () => node.remove()
  toastContainer.appendChild(node)
  setTimeout(() => {
    node.style.opacity = '0'
    node.style.transform = 'translateY(-6px)'
    setTimeout(() => node.remove(), 250)
  }, 5000)
}

if (codeInput) codeInput.addEventListener('input', analyzeCode)
if (langSelect) langSelect.addEventListener('change', analyzeCode)
if (saveBtn) saveBtn.addEventListener('click', () => saveModal ? openSaveModal() : showToast('error', 'Save modal missing'))
if (runBtn) runBtn.addEventListener('click', runSnippet)
if (clearBtn) clearBtn.addEventListener('click', clearEditor)
if (signOutBtn) signOutBtn.addEventListener('click', () => signOut(auth))
if (searchInput) searchInput.addEventListener('input', () => renderLibrary(searchInput.value))
if (searchMy) searchMy.addEventListener('input', () => renderMySnippets(searchMy.value))
if (cancelSave) cancelSave.addEventListener('click', closeSaveModal)
if (confirmSave) confirmSave.addEventListener('click', finalizeSave)

onAuthStateChanged(auth, async user => {
  currentUser = user
  if (window.location.pathname.endsWith('my-snippets.html')) await renderMySnippets()
  if (window.location.pathname.endsWith('library.html')) await renderLibrary()
  updateProfileUI()
})

function analyzeCode() {
  if (!codeInput || !langSelect || !errorBox) return
  const code = codeInput.value.trim()
  const lang = langSelect.value
  if (!code) return hideError()
  try {
    if (lang === 'javascript' && typeof esprima !== 'undefined') {
      const result = esprima.parseScript(code, { tolerant: true, loc: true })
      if (result.errors?.length) {
        const e = result.errors[0]
        showError(`⚠️ JS Error line ${e.lineNumber || '?'}: ${e.description}`)
      } else hideError()
    } else if (lang === 'html' && typeof HTMLHint !== 'undefined') {
      const messages = HTMLHint.verify(code)
      if (messages.length) showError(`⚠️ HTML line ${messages[0].line}: ${messages[0].message}`)
      else hideError()
    } else if (lang === 'css' && typeof CSSLint !== 'undefined') {
      const r = CSSLint.verify(code)
      if (r.messages?.length) showError(`⚠️ CSS line ${r.messages[0].line}: ${r.messages[0].message}`)
      else hideError()
    } else if (lang === 'python' && typeof Sk !== 'undefined') {
      try {
        Sk.configure({ output: () => {}, read: x => Sk.builtinFiles.files[x] || null })
        Sk.importMainWithBody('<stdin>', false, code)
        hideError()
      } catch (e) {
        showError(`⚠️ Python Error: ${e.toString().split('\n')[0]}`)
      }
    }
  } catch (err) {
    showError(`⚠️ Syntax Error: ${err.message}`)
  }
}

function showError(msg) {
  errorBox.textContent = msg
  errorBox.classList.remove('hidden')
  codeInput.classList.add('error')
}

function hideError() {
  errorBox.textContent = ''
  errorBox.classList.add('hidden')
  codeInput.classList.remove('error')
}

async function finalizeSave() {
  if (!currentUser) return showToast('error', 'Sign in first')
  const title = snippetTitle.value.trim() || 'Untitled Snippet'
  const desc = snippetDesc.value.trim()
  const lang = snippetLang.value || langSelect.value
  const tags = snippetTags.value.trim() ? snippetTags.value.split(',').map(t => t.trim()).filter(Boolean) : []
  const content = codeInput.value.trim()
  if (!content) return showToast('error', 'Empty code')
  const owner = saveToProfile.checked ? currentUser.uid : null
  const isPublic = publishPublic.checked
  const snippet = {
    title, description: desc, tags, content, lang,
    owner, ownerName: currentUser.displayName || 'Anon',
    public: isPublic, createdAt: serverTimestamp()
  }
  try {
    await addDoc(collection(db, 'snippets'), snippet)
    closeSaveModal()
    codeInput.value = ''
    runFrame.srcdoc = ''
    hideError()
    showToast('success', 'Snippet saved')
      if (window.location.pathname.endsWith('my-snippets.html')) renderMySnippets();
      if (window.location.pathname.endsWith('library.html')) renderLibrary();
  } catch {
    showToast('error', 'Save failed')
  }
}

function openSaveModal() {
  snippetTitle.value = ''
  snippetDesc.value = ''
  snippetLang.value = langSelect.value
  snippetTags.value = ''
  saveModal.classList.remove('hidden')
}

function closeSaveModal() {
  saveModal.classList.add('hidden')
}

function runSnippet() {
  const code = codeInput.value.trim()
  const lang = langSelect.value
  if (!code) return
  if (lang === 'html') runFrame.srcdoc = code
  else if (lang === 'javascript') runFrame.srcdoc = `<script>try{${code}}catch(e){document.body.innerText='Runtime error: '+e.message}<\/script>`
  else if (lang === 'css') runFrame.srcdoc = `<style>${code}<\/style><div style="color:white;padding:12px;">CSS snippet loaded</div>`
  else if (lang === 'python') {
    const safe = code.replace(/`/g, '\\`')
    runFrame.srcdoc = `
      <script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js"><\/script>
      <script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"><\/script>
      <pre id="output" style="color:white;padding:12px;"></pre>
      <script>
        function outf(t){document.getElementById("output").innerHTML+=t}
        Sk.configure({output:outf,read:x=>Sk.builtinFiles["files"][x]||null})
        Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody("<stdin>",false,\`${safe}\`)).catch(e=>document.getElementById("output").innerText=e.toString())
      <\/script>`
  }
}

function clearEditor() {
  codeInput.value = ''
  runFrame.srcdoc = ''
  hideError()
}

async function renderLibrary(search = '') {
  libList.innerHTML = ''
  const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(200))
  const snapshot = await getDocs(q)
  let found = false
  snapshot.forEach(docSnap => {
    const s = docSnap.data()
    if (!s || !s.public) return
    const title = s.title || 'Untitled'
    const owner = s.ownerName || 'Anon'
    if (search && !title.toLowerCase().includes(search.toLowerCase()) && !owner.toLowerCase().includes(search.toLowerCase())) return
    const date = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : 'Unknown'
    const desc = s.description ? `<div class="muted-small" style="margin-top:6px">${escapeHtml(s.description)}</div>` : ''
    const tags = s.tags?.length ? `<div style="margin-top:8px;"><small class="muted-small">${s.tags.map(t=>`#${escapeHtml(t)}`).join(' ')}</small></div>` : ''
    const card = document.createElement('div')
    card.className = 'snippet-card'
    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <div class="snippet-meta muted-small">${escapeHtml(s.lang)} • ${escapeHtml(owner)} • ${escapeHtml(date)}</div>
      <pre style="margin-top:8px;"><code>${escapeHtml(s.content.substring(0,400))}</code></pre>${desc}${tags}`
    libList.appendChild(card)
    found = true
  })
  if (!found) libList.innerHTML = "<p class='muted'>No snippets found.</p>"
}

async function renderMySnippets(search = '') {
  mySnippetsList.innerHTML = ''
  if (!currentUser) {
    mySnippetsList.innerHTML = "<p class='muted'>Sign in to view snippets.</p>"
    return
  }
  const q = query(collection(db, 'snippets'), where('owner', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(200))
  const snapshot = await getDocs(q)
  if (!snapshot || snapshot.empty) {
    mySnippetsList.innerHTML = "<p class='muted'>You haven't saved any snippets yet.</p>"
    return
  }
  let found = false
  snapshot.forEach(docSnap => {
    const s = docSnap.data()
    const title = s.title || 'Untitled'
    const date = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : 'Unknown'
    if (search && !title.toLowerCase().includes(search.toLowerCase())) return
    const desc = s.description ? `<div class="muted-small" style="margin-top:6px">${escapeHtml(s.description)}</div>` : ''
    const tags = s.tags?.length ? `<div style="margin-top:8px;"><small class="muted-small">${s.tags.map(t=>`#${escapeHtml(t)}`).join(' ')}</small></div>` : ''
    const card = document.createElement('div')
    card.className = 'snippet-card'
    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <div class="snippet-meta muted-small">${escapeHtml(s.lang)} • ${s.public ? '🌍 Public' : '🔒 Private'} • ${escapeHtml(date)}</div>
      <pre style="margin-top:8px;"><code>${escapeHtml(s.content.substring(0,400))}</code></pre>${desc}${tags}`
    mySnippetsList.appendChild(card)
    found = true
  })
  if (!found) mySnippetsList.innerHTML = "<p class='muted'>No snippets found.</p>"
}

function escapeHtml(str) {
  return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])) : ''
}

function updateProfileUI() {
  const authArea = document.getElementById('authArea')
  if (!authArea) return
  authArea.innerHTML = ''
  if (currentUser) {
    const img = document.createElement('img')
    img.src = currentUser.photoURL || ''
    img.style.width = '36px'
    img.style.height = '36px'
    img.style.borderRadius = '6px'
    img.style.marginRight = '8px'
    const name = document.createElement('span')
    name.textContent = currentUser.displayName || 'User'
    const out = document.createElement('button')
    out.className = 'btn secondary'
    out.textContent = 'Sign out'
    out.onclick = () => signOut(auth)
    authArea.append(img, name, out)
  } else {
    const btn = document.createElement('button')
    btn.className = 'btn'
    btn.textContent = 'Sign in with Google'
    btn.onclick = googleSignIn
    authArea.append(btn)
  }
}

async function googleSignIn() {
  const provider = new GoogleAuthProvider()
  try {
    const result = await signInWithPopup(auth, provider)
    currentUser = result.user
    updateProfileUI()
    showToast('success', 'Signed in')
  } catch {
    showToast('error', 'Sign in failed')
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('library.html')) {
    await renderLibrary(); 
  }
  if (window.location.pathname.endsWith('my-snippets.html')) {
    await renderMySnippets(); 
  }
});
