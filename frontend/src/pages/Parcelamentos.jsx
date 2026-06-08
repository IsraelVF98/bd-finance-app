// src/pages/Parcelamentos.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2 } from "lucide-react"

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const MESES_MAP = Object.fromEntries(MESES.map((m, i) => [m, String(i + 1).padStart(2, "0")]))
const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <select {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green">{children}</select>
  </div>
)
const Input = ({ label, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <input {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green" />
  </div>
)

export default function Parcelamentos() {
  const [categorias, setCategorias] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ tipo: "", texto: "" })

  // Começa com strings vazias para obrigar a seleção manual
  const [form, setForm] = useState({
    descricao: "", categoria: "", quem_pagou: "",
    mes: MESES[new Date().getMonth()], ano: anoAtual,
    qtd_parcelas: 12, valor_total: ""
  })

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get("/categorias").then(r => setCategorias(r.data))
    api.get("/pessoas").then(r => setPessoas(r.data))
    carregarLista()
  }, [])

  const carregarLista = () => api.get("/parcelamentos/").then(r => setLista(r.data))

  const salvar = async () => {
    // VALIDAÇÃO PADRONIZADA: Barra se não escolher categoria ou pagante
    if (!form.categoria) { flash("erro", "Por favor, selecione uma categoria."); return }
    if (!form.quem_pagou) { flash("erro", "Por favor, selecione o pagante."); return }
    
    const valor = parseFloat(String(form.valor_total).replace(",", "."))
    if (!valor || valor <= 0) { flash("erro", "Valor total deve ser maior que zero."); return }
    
    setLoading(true)
    try {
      await api.post("/parcelamentos/", {
        descricao: form.descricao, categoria: form.categoria,
        quem_pagou: form.quem_pagou,
        mes_inicial: `${MESES_MAP[form.mes]}/${form.ano}`,
        qtd_parcelas: parseInt(form.qtd_parcelas),
        valor_total: valor
      })
      flash("ok", "Parcelamento criado com sucesso!")
      
      // Reseta limpando os campos e resetando os placeholders
      setForm(f => ({ ...f, descricao: "", valor_total: "", categoria: "", quem_pagou: "" }))
      carregarLista()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const deletar = async (id) => {
    if (!confirm("Apagar TODAS as parcelas deste contrato?")) return
    await api.delete(`/parcelamentos/${id}`)
    carregarLista()
  }

  const fmt = v => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Parcelamentos</h1>

      {msg.texto && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
          {msg.texto}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">Nova Compra Parcelada</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Descrição (opcional)" value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex: Notebook Samsung" />
          
          <Select label="Categoria" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            <option value="" disabled hidden>Selecione uma categoria...</option>
            {categorias.map(c => <option key={c}>{c}</option>)}
          </Select>

          <Select label="Pagante" value={form.quem_pagou} onChange={e => set("quem_pagou", e.target.value)}>
            <option value="" disabled hidden>Selecione o pagante...</option>
            {pessoas.map(p => <option key={p}>{p}</option>)}
          </Select>

          <Input label="Valor Total (R$)" value={form.valor_total} onChange={e => set("valor_total", e.target.value)} placeholder="0,00" />
          <Select label="Mês da 1ª Parcela" value={form.mes} onChange={e => set("mes", e.target.value)}>
            {MESES.map(m => <option key={m}>{m}</option>)}
          </Select>
          <Select label="Ano" value={form.ano} onChange={e => set("ano", e.target.value)}>
            {ANOS.map(a => <option key={a}>{a}</option>)}
          </Select>
          <div>
            <label className="text-muted text-xs font-medium block mb-1">Nº de Parcelas</label>
            <input type="number" min={2} max={48} value={form.qtd_parcelas} onChange={e => set("qtd_parcelas", e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green" />
          </div>
          {form.valor_total && !isNaN(parseFloat(String(form.valor_total).replace(",","."))) && (
            <div className="flex items-end">
              <p className="text-muted text-sm">Parcela: <span className="text-green font-mono font-bold">
                {fmt(parseFloat(String(form.valor_total).replace(",",".")) / form.qtd_parcelas)}
              </span></p>
            </div>
          )}
          <div className="col-span-2">
            <button onClick={salvar} disabled={loading}
              className="w-full bg-green text-bg font-bold py-2.5 rounded-lg text-sm hover:bg-green/90 active:scale-95 transition-all disabled:opacity-50">
              {loading ? "Criando..." : "Criar Parcelamento"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de contratos */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">Contratos Ativos</h3>
        {lista.length === 0 ? (
          <p className="text-subtle text-sm text-center py-6">Nenhum parcelamento cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs">
                  {["ID Contrato","Categoria","Responsável","Parcelas","Valor Total",""].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(row => (
                  <tr key={row.id_contrato} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs text-subtle">{row.id_contrato}</td>
                    <td className="py-2 px-3"><span className="bg-green/10 text-green px-2 py-0.5 rounded text-xs">{row.categoria}</span></td>
                    <td className="py-2 px-3 text-muted">{row.responsavel}</td>
                    <td className="py-2 px-3 text-center">{row.parcelas_totais}x</td>
                    <td className="py-2 px-3 font-mono text-red">{fmt(row.valor_total)}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => deletar(row.id_contrato)} className="text-subtle hover:text-red transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}