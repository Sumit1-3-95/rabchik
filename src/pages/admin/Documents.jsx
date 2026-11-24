import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useQuery, toast } from '../../lib/hooks'
import Sheet from '../../components/Sheet'
import Icon from '../../components/Icon'
import '../../extras.css'

const MAX = 25 * 1024 * 1024 // matches the bucket limit in docs-contacts.sql
const LINK_SECONDS = 6 * 60 * 60

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`)
const ext = (n) => (n.includes('.') ? n.split('.').pop().toLowerCase() : '')
const badge = (n) => {
  const e = ext(n)
  if (e === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(e)) return 'DOC'
  if (['xls', 'xlsx', 'csv'].includes(e)) return 'XLS'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(e)) return 'IMG'
  return (e || 'FILE').slice(0, 4).toUpperCase()
}
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** Admins: important wedding documents and PDFs. Files are private and open through short-lived links. */
export default function Documents() {
  const nav = useNavigate()
  const { session } = useAuth()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(null)
  const pick = useRef(null)

  const docs = useQuery(async () => {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (error) throw error
    // one signed link per file, made up front so each row is a plain link (opens reliably on phones)
    const urls = {}
    if (data.length) {
      const { data: signed } = await supabase.storage.from('docs').createSignedUrls(data.map((d) => d.path), LINK_SECONDS)
      for (const s of signed || []) if (s.signedUrl) urls[s.path] = s.signedUrl
    }
    return data.map((d) => ({ ...d, url: urls[d.path] }))
  })

  const t = q.trim().toLowerCase()
  const rows = useMemo(
    () => (docs.data || []).filter((d) => !t || d.title.toLowerCase().includes(t) || d.file_name.toLowerCase().includes(t)),
    [docs.data, t],
  )

  const openAdd = () => { setTitle(''); setFile(null); setAdding(true) }
  const choose = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX) return toast('File is over 25 MB')
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!file) return toast('Choose a file first')
    const name = title.trim() || file.name
    setBusy(true)
    const path = `${session.user.id}/${crypto.randomUUID()}${ext(file.name) ? `.${ext(file.name)}` : ''}`
    const up = await supabase.storage.from('docs').upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' })
    if (up.error) { setBusy(false); return toast(`Upload failed: ${up.error.message}`) }
    const { error } = await supabase.from('documents').insert({ title: name, path, file_name: file.name, size_bytes: file.size })
    if (error) {
      await supabase.storage.from('docs').remove([path])
      setBusy(false)
      return toast(error.message)
    }
    setBusy(false)
    setAdding(false)
    toast('Document added')
    docs.refetch()
  }

  const remove = async () => {
    setBusy(true)
    const { error } = await supabase.from('documents').delete().eq('id', del.id)
    if (!error) await supabase.storage.from('docs').remove([del.path])
    setBusy(false)
    if (error) return toast(error.message)
    setDel(null)
    toast('Deleted')
    docs.refetch()
  }

  const count = (docs.data || []).length
  return (
    <main className="page tight">
      <div className="dc-top">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="title" style={{ fontSize: 26 }}>Documents</h1>
          <div className="small muted">{count} {count === 1 ? 'file' : 'files'} · visible to admins only</div>
        </div>
      </div>

      <button className="btn" onClick={openAdd}><Icon name="upload" /> Add document</button>

      {count > 4 && (
        <div className="field">
          <label className="label" htmlFor="dq">Search</label>
          <input id="dq" className="input" placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {docs.loading && <div className="spinner" />}
      {docs.error && <div className="err">Could not load documents: {docs.error.message}. Did you run docs-contacts.sql?</div>}
      {!docs.loading && !docs.error && rows.length === 0 && (
        <div className="dc-empty">{count ? 'No documents match.' : 'No documents yet. Add the first PDF or file.'}</div>
      )}

      <div className="dc-list">
        {rows.map((d) => (
          <div key={d.id} className="card doc-row">
            <a className="doc-main" href={d.url} target="_blank" rel="noreferrer" aria-label={`Open ${d.title}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="doc-badge">{badge(d.file_name)}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{d.title}</b>
                  <small>{size(d.size_bytes)} · {day(d.created_at)}</small>
                </span>
              </div>
            </a>
            <button className="doc-del" onClick={() => setDel(d)} aria-label={`Delete ${d.title}`}><Icon name="trash" size={19} /></button>
          </div>
        ))}
      </div>

      <Sheet open={adding} onClose={() => !busy && setAdding(false)} title="Add document">
        <form className="col" onSubmit={save}>
          <button type="button" className="dc-file" onClick={() => pick.current?.click()}>
            <Icon name="doc" /> {file ? `${file.name} · ${size(file.size)}` : 'Choose a PDF or file (max 25 MB)'}
          </button>
          <input ref={pick} type="file" hidden onChange={choose} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,image/*" />
          <div className="field">
            <label className="label" htmlFor="dt">Name</label>
            <input id="dt" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Resort booking confirmation" />
          </div>
          <button className="btn" disabled={busy || !file}>{busy ? 'Uploading…' : 'Save document'}</button>
        </form>
      </Sheet>

      <Sheet open={!!del} onClose={() => !busy && setDel(null)} title="Delete this document?">
        <div className="col">
          <div className="small muted">{del?.title} will be removed for all admins.</div>
          <button className="btn danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</button>
          <button className="btn secondary" disabled={busy} onClick={() => setDel(null)}>Cancel</button>
        </div>
      </Sheet>
    </main>
  )
}
