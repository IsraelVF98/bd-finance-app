// src/pages/Categorias.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2, Plus } from "lucide-react"

export default function Categorias() {
  const [lista, setLista] = useState([])
  const [nome, setNome] = useState("")
  const [msg, setMsg] = useState({ tipo: "", texto: "" })

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }
  const carregar = () => api.get("/categorias").then(r => setLista(r.data))

  useEffect(() => { carregar() }, [])

  const adicionar = async () => {
    if (!nome.trim()) return
    try {
      await api.post("/categorias", { nome })
      flash("ok", `"${nome}" adicionada!`)
      setNome("")
      carregar()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
  }

  const remover = async (n) => {
    await api.delete(`/categorias/${encodeURIComponent(n)}`)
    carregar()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Categorias</h1>

      {msg.texto && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
          {msg.texto}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-3">Adicionar Categoria</h3>
        <div className="flex gap-2">
          <input value={nome} onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && adicionar()}
            placeholder="Ex: Alimentação, Transporte..."
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown" />
          <button onClick={adicionar}
            className="bg-brand-brown text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-brownHover active:scale-95 transition-all flex items-center gap-1.5">
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-3">Categorias Cadastradas</h3>
        {lista.length === 0 ? (
          <p className="text-subtle text-sm text-center py-4">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="space-y-1">
            {lista.map(cat => (
              <div key={cat} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface2 transition-colors group">
                <span className="text-sm text-white">▪ {cat}</span>
                <button onClick={() => remover(cat)} className="text-subtle hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}