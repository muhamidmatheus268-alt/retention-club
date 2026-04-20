import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const S = { bg: '#0c0c10', card: '#111118', border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

const COLORS = ['#E8642A','#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6','#f97316']

const POPULAR_FONTS = [
  { name: 'Inter',       stack: '"Inter", sans-serif' },
  { name: 'Poppins',     stack: '"Poppins", sans-serif' },
  { name: 'Montserrat',  stack: '"Montserrat", sans-serif' },
  { name: 'Roboto',      stack: '"Roboto", sans-serif' },
  { name: 'Playfair',    stack: '"Playfair Display", serif' },
  { name: 'DM Serif',    stack: '"DM Serif Display", serif' },
  { name: 'Space Grotesk', stack: '"Space Grotesk", sans-serif' },
  { name: 'Manrope',     stack: '"Manrope", sans-serif' },
]

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

export default function ClientSettings() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [client, setClient] = useState(null)
  const [form, setForm]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  useDocumentTitle('Configurações', client?.name)

  useEffect(() => {
    supabase.from('clients').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        setClient(data); setLoading(false)
        if (data) setForm({
          name: data.name || '',
          slug: data.slug || '',
          brand_color: data.brand_color || '#E8642A',
          brand_logo:  data.brand_logo  || '',
          brand_font:  data.brand_font  || '',
          website:     data.website     || '',
          nicho:       data.nicho       || '',
        })
      })
  }, [slug])

  async function save() {
    if (!client || !form) return
    setSaving(true)
    const payload = { ...form, slug: slugify(form.slug || form.name) }
    const { error } = await supabase.from('clients').update(payload).eq('id', client.id)
    setSaving(false)
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Slug já existe.' : error.message)
    } else {
      toast.success('Configurações salvas.')
      if (payload.slug !== slug) {
        navigate(`/admin/settings/${payload.slug}`, { replace: true })
      }
    }
  }

  async function uploadLogo(file) {
    if (!file || !client) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${client.id}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('client-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('client-images').getPublicUrl(path)
      setForm(f => ({ ...f, brand_logo: pub.publicUrl }))
      toast.success('Logo enviado.')
    } catch (e) {
      toast.error('Erro no upload: ' + e.message)
    }
    setUploading(false)
  }

  if (loading) return <div className="h-screen flex items-center justify-center" style={{ backgroundColor: S.bg }}><p className="text-sm" style={{ color: S.muted }}>Carregando…</p></div>
  if (!client) return <div className="h-screen flex items-center justify-center" style={{ backgroundColor: S.bg }}><p className="text-sm" style={{ color: S.muted }}>Cliente não encontrado.</p></div>

  const color = form.brand_color || '#E8642A'

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      <header className="flex items-center justify-between px-6 h-12 border-b sticky top-0 z-40"
        style={{ backgroundColor: S.card, borderColor: S.border }}>
        <div className="flex items-center gap-2 text-xs">
          <Link to="/admin" style={{ color: S.muted }}>← Clientes</Link>
          <span style={{ color: '#222230' }}>/</span>
          <span className="text-white font-semibold">{client.name} · Config</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Configurações · {client.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Whitelabel, identidade visual e contexto</p>
        </div>

        {/* Preview */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border, borderLeft: `3px solid ${color}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>Preview do portal do cliente</p>
          <div className="rounded-lg p-4 flex items-center gap-3"
            style={{ backgroundColor: '#0e0e14', border: `1px solid ${color}30`, ...(form.brand_font ? { fontFamily: form.brand_font } : {}) }}>
            {form.brand_logo ? (
              <img src={form.brand_logo} alt={form.name} className="h-8 w-auto object-contain" style={{ maxWidth: 120 }} />
            ) : (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ backgroundColor: color }}>{(form.name || '?').charAt(0).toUpperCase()}</span>
            )}
            <span className="text-white font-semibold">{form.name}</span>
          </div>
        </div>

        {/* Identity */}
        <Section title="Identidade">
          <Field label="Nome">
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          </Field>
          <Field label={`Slug (URL) · atualmente /${client.slug}`}>
            <Input value={form.slug} onChange={v => setForm(f => ({ ...f, slug: slugify(v) }))} mono />
          </Field>
          <Field label="Site">
            <Input value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://..." />
          </Field>
          <Field label="Nicho / Categoria">
            <Input value={form.nicho} onChange={v => setForm(f => ({ ...f, nicho: v }))} placeholder="Ex: Moda feminina, Beauty, Suplementos…" />
          </Field>
        </Section>

        {/* Brand */}
        <Section title="Marca">
          <Field label="Cor principal">
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, brand_color: c }))}
                  className="w-9 h-9 rounded-lg transition-all"
                  style={{
                    backgroundColor: c,
                    outline: form.brand_color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: form.brand_color === c ? 'scale(1.1)' : 'scale(1)',
                  }} />
              ))}
              <input type="color" value={form.brand_color}
                onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
                className="w-9 h-9 rounded-lg cursor-pointer" style={{ backgroundColor: 'transparent' }} />
            </div>
          </Field>

          <Field label="Logo">
            <div className="flex items-center gap-3">
              {form.brand_logo && (
                <img src={form.brand_logo} alt="" className="h-10 w-auto object-contain rounded border p-1"
                  style={{ borderColor: S.border, backgroundColor: '#ffffff10', maxWidth: 160 }} />
              )}
              <label className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors"
                style={{ borderColor: S.ib, color: S.muted, backgroundColor: S.input }}>
                {uploading ? '⏳ Enviando…' : form.brand_logo ? '🔄 Trocar' : '📤 Upload'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => uploadLogo(e.target.files?.[0])} disabled={uploading} />
              </label>
              {form.brand_logo && (
                <button onClick={() => setForm(f => ({ ...f, brand_logo: '' }))}
                  className="text-xs transition-colors" style={{ color: '#ef4444' }}>
                  Remover
                </button>
              )}
            </div>
            <Input value={form.brand_logo || ''} onChange={v => setForm(f => ({ ...f, brand_logo: v }))}
              placeholder="Ou cole URL: https://..." className="mt-2" />
          </Field>

          <Field label="Fonte">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {POPULAR_FONTS.map(font => (
                <button key={font.name} type="button" onClick={() => setForm(f => ({ ...f, brand_font: font.stack }))}
                  className="px-3 py-2 rounded-lg text-sm border transition-all"
                  style={{
                    fontFamily: font.stack,
                    backgroundColor: form.brand_font === font.stack ? color + '22' : S.input,
                    borderColor: form.brand_font === font.stack ? color + '80' : S.border,
                    color: form.brand_font === font.stack ? '#fff' : S.muted,
                  }}>
                  {font.name}
                </button>
              ))}
            </div>
            <Input value={form.brand_font || ''} onChange={v => setForm(f => ({ ...f, brand_font: v }))}
              placeholder='Ou custom: "Seu Font", sans-serif' className="mt-2" />
            <p className="text-[10px] mt-1.5" style={{ color: S.faint }}>
              Nota: Fontes custom precisam estar carregadas (Google Fonts ou @font-face)
            </p>
          </Field>
        </Section>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <Link to={`/admin/calendar/${slug}`} className="text-xs" style={{ color: S.muted }}>
            ← Ir para calendário
          </Link>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/admin`)}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: S.border, color: S.muted }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}>
              {saving ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: S.muted }}>{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, mono, className = '' }) {
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all ${mono ? 'font-mono' : ''} ${className}`}
      style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }}
      onFocus={e => { e.target.style.borderColor = '#3a3a48' }}
      onBlur={e => { e.target.style.borderColor = S.border }} />
  )
}
