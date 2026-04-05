import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'

const S = {
  bg: '#0c0c10', card: '#111118', border: '#1e1e2a',
  ib: '#2a2a38', muted: '#555568', faint: '#333340',
  input: '#0c0c10',
}

const CATEGORIES = ['geral', 'email', 'whatsapp', 'social', 'banner', 'produto', 'logo']

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function CategoryBadge({ cat, brandColor, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-lg text-xs font-medium border transition-all capitalize"
      style={active
        ? { backgroundColor: brandColor + '20', borderColor: brandColor + '50', color: brandColor }
        : { borderColor: S.ib, color: S.muted, backgroundColor: 'transparent' }
      }
    >
      {cat}
    </button>
  )
}

/* ── Upload zone ── */
function UploadZone({ brandColor, onFiles }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
      style={{
        borderColor: drag ? brandColor : S.ib,
        backgroundColor: drag ? brandColor + '08' : 'transparent',
      }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: brandColor + '15' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm text-white font-semibold">Arraste imagens ou clique para selecionar</p>
        <p className="text-xs mt-1" style={{ color: S.muted }}>PNG, JPG, GIF, WebP — até 10 MB cada</p>
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { const files = [...e.target.files]; if (files.length) onFiles(files) }}
      />
    </div>
  )
}

/* ── Image card ── */
function ImageCard({ img, brandColor, onDelete, onCopy, copied }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="rounded-xl border overflow-hidden relative group transition-all"
      style={{ borderColor: hover ? brandColor + '50' : S.border, backgroundColor: S.card }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* image */}
      <div className="relative overflow-hidden" style={{ paddingBottom: '66%' }}>
        <img
          src={img.url}
          alt={img.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
          style={{ transform: hover ? 'scale(1.04)' : 'scale(1)' }}
        />

        {/* hover overlay */}
        {hover && (
          <div className="absolute inset-0 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <button
              onClick={() => onCopy(img)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ backgroundColor: copied === img.id ? '#10b981' : brandColor }}
            >
              {copied === img.id ? '✓ Copiado!' : '⎘ Copiar URL'}
            </button>
            <a href={img.url} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ backgroundColor: '#ffffff20' }}>
              ↗ Abrir
            </a>
            <button
              onClick={() => onDelete(img)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 transition-all"
              style={{ backgroundColor: '#ff000015' }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="px-3 py-2.5">
        <p className="text-xs text-white font-medium truncate">{img.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
            style={{ backgroundColor: S.ib, color: S.muted }}>{img.category}</span>
          {img.file_size && (
            <span className="text-[10px]" style={{ color: S.faint }}>{formatSize(img.file_size)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Upload modal ── */
function UploadModal({ files, brandColor, onClose, onUpload }) {
  const [metas, setMetas] = useState(
    files.map(f => ({ file: f, name: f.name.replace(/\.[^.]+$/, ''), category: 'geral' }))
  )
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  function update(i, key, val) {
    setMetas(p => p.map((m, idx) => idx === i ? { ...m, [key]: val } : m))
  }

  async function handleUpload() {
    setUploading(true)
    const total = metas.length
    let done = 0
    for (const meta of metas) {
      await onUpload(meta)
      done++
      setProgress(Math.round(done / total * 100))
    }
    setUploading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (!uploading && e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl border w-full max-w-lg flex flex-col"
        style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', maxHeight: '88vh' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: S.ib }}>
          <p className="text-white font-bold">{metas.length} imagem{metas.length !== 1 ? 'ns' : ''} selecionada{metas.length !== 1 ? 's' : ''}</p>
          {!uploading && (
            <button onClick={onClose} className="text-[#555568] hover:text-white transition-colors text-xl">×</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {metas.map((m, i) => (
            <div key={i} className="rounded-xl border p-4 flex gap-4 items-start"
              style={{ borderColor: S.ib, backgroundColor: '#0e0e16' }}>
              <img src={URL.createObjectURL(m.file)} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="flex-1 space-y-2.5 min-w-0">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: S.faint }}>Nome</label>
                  <input
                    value={m.name} onChange={e => update(i, 'name', e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }}
                    onBlur={e => { e.target.style.borderColor = S.ib }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: S.faint }}>Categoria</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => update(i, 'category', cat)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium capitalize border transition-all"
                        style={m.category === cat
                          ? { backgroundColor: brandColor + '25', borderColor: brandColor + '60', color: brandColor }
                          : { borderColor: S.ib, color: S.muted }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t shrink-0" style={{ borderColor: S.ib }}>
          {uploading ? (
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: S.muted }}>
                <span>Enviando…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: S.ib }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: brandColor }} />
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm border transition-colors"
                style={{ borderColor: S.ib, color: S.muted }}>Cancelar</button>
              <button onClick={handleUpload}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}>
                Enviar {metas.length} imagem{metas.length !== 1 ? 'ns' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function BancoImagens() {
  const { client, brandColor } = useClient()
  const [images, setImages]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activecat, setActivecat] = useState('todos')
  const [search, setSearch]       = useState('')
  const [pendingFiles, setPending] = useState(null)
  const [copied, setCopied]       = useState(null)
  const [deleting, setDeleting]   = useState(null)

  const fetchImages = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase
      .from('client_images')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    setImages(data || [])
    setLoading(false)
  }, [client])

  useEffect(() => { fetchImages() }, [fetchImages])

  async function handleUpload({ file, name, category }) {
    const ext  = file.name.split('.').pop()
    const path = `${client.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('client-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr) { console.error(upErr); return }

    const { data: urlData } = supabase.storage.from('client-images').getPublicUrl(path)
    const url = urlData?.publicUrl || ''

    await supabase.from('client_images').insert({
      client_id:    client.id,
      name:         name || file.name,
      storage_path: path,
      url,
      category,
      file_size:    file.size,
    })
  }

  async function handleDelete(img) {
    if (!window.confirm(`Excluir "${img.name}"?`)) return
    setDeleting(img.id)
    await supabase.storage.from('client-images').remove([img.storage_path])
    await supabase.from('client_images').delete().eq('id', img.id)
    setImages(p => p.filter(i => i.id !== img.id))
    setDeleting(null)
  }

  function handleCopy(img) {
    navigator.clipboard.writeText(img.url)
    setCopied(img.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = images.filter(img => {
    const matchCat = activecat === 'todos' || img.category === activecat
    const matchSearch = !search || img.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const usedCats = ['todos', ...CATEGORIES.filter(c => images.some(i => i.category === c))]

  if (!client) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ color: S.muted }} className="text-sm">Selecione um cliente</p>
    </div>
  )

  return (
    <div className="min-h-full" style={{ backgroundColor: S.bg }}>

      {/* header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: S.border }}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-lg font-bold text-white">Banco de Imagens</h1>
            <p className="text-xs mt-0.5" style={{ color: S.muted }}>
              {images.length} imagem{images.length !== 1 ? 'ns' : ''} · {client.name}
            </p>
          </div>

          {/* search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4" stroke="#555568" strokeWidth="1.5"/>
              <path d="M10 10l3 3" stroke="#555568" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar imagem…"
              className="w-full text-sm pl-8 pr-3 py-2 rounded-lg focus:outline-none"
              style={{ backgroundColor: S.card, border: `1px solid ${S.ib}`, color: '#fff' }}
              onFocus={e => e.target.style.borderColor = brandColor}
              onBlur={e => e.target.style.borderColor = S.ib}
            />
          </div>
        </div>

        {/* category filter */}
        <div className="flex gap-2 flex-wrap">
          {usedCats.map(cat => (
            <CategoryBadge
              key={cat} cat={cat === 'todos' ? 'Todos' : cat}
              brandColor={brandColor}
              active={activecat === cat}
              onClick={() => setActivecat(cat)}
            />
          ))}
        </div>
      </div>

      <div className="px-8 py-6">

        {/* upload zone */}
        <div className="mb-6">
          <UploadZone
            brandColor={brandColor}
            onFiles={files => setPending(files)}
          />
        </div>

        {/* grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="rounded-xl border animate-pulse" style={{ borderColor: S.border, backgroundColor: S.card }}>
                <div className="rounded-t-xl" style={{ paddingBottom: '66%', backgroundColor: S.ib }} />
                <div className="p-3">
                  <div className="h-3 rounded w-3/4 mb-2" style={{ backgroundColor: S.ib }} />
                  <div className="h-2.5 rounded w-1/2" style={{ backgroundColor: S.faint }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl border" style={{ borderColor: S.border }}>
            <p className="text-3xl mb-3">🖼</p>
            <p className="text-sm" style={{ color: S.muted }}>
              {images.length === 0 ? 'Nenhuma imagem ainda. Arraste arquivos acima para começar.' : 'Nenhuma imagem encontrada.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(img => (
              <ImageCard
                key={img.id} img={img} brandColor={brandColor}
                onDelete={handleDelete} onCopy={handleCopy} copied={copied}
              />
            ))}
          </div>
        )}
      </div>

      {/* upload modal */}
      {pendingFiles && (
        <UploadModal
          files={pendingFiles}
          brandColor={brandColor}
          onClose={() => { setPending(null); fetchImages() }}
          onUpload={async (meta) => { await handleUpload(meta) }}
        />
      )}
    </div>
  )
}
