// src/pages/Parcelamentos.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2, Download } from "lucide-react"

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const MESES_MAP = Object.fromEntries(MESES.map((m, i) => [m, String(i + 1).padStart(2, "0")]))
const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <select {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown">{children}</select>
  </div>
)
const Input = ({ label, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <input {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown" />
  </div>
)

export default function Parcelamentos() {
  const [categorias, setCategorias] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ tipo: "", texto: "" })

  const [form, setForm] = useState({
    descricao: "", categoria: "", quem_pagou: "",
    mes: MESES[new Date().getMonth()], ano: anoAtual,
    qtd_parcelas: 12, valor_total: ""
  })

  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroResponsavel, setFiltroResponsavel] = useState("")

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get("/categorias").then(r => setCategorias(r.data))
    api.get("/pessoas").then(r => setPessoas(r.data))
    carregarLista()
  }, [])

  const carregarLista = () => api.get("/parcelamentos/").then(r => setLista(r.data))

  const salvar = async () => {
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

  const opcoesCategoria = [...new Set(lista.map(r => r.categoria))].sort()
  const opcoesResponsavel = [...new Set(lista.map(r => r.responsavel))].sort()

  const listaFiltrada = lista.filter(row => {
    const matchCat = filtroCategoria ? row.categoria === filtroCategoria : true
    const matchResp = filtroResponsavel ? row.responsavel === filtroResponsavel : true
    return matchCat && matchResp
  })

  const exportarParaExcel = () => {
    const headers = ["ID Contrato", "Categoria", "Descrição", "Responsável", "Parcelas", "Valor Total"]
    
    const rows = listaFiltrada.map(row => [
      row.id_contrato,
      row.categoria,
      row.descricao || "—",
      row.responsavel,
      `${row.parcelas_totais}x`,
      row.valor_total.toString().replace(".", ",")
    ])

    const csvContent = "\ufeff" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `parcelamentos_${new Date().toLocaleDateString("pt-BR")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown" />
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
              className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
              {loading ? "Criando..." : "Criar Parcelamento"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de contratos */}
      <div className="bg-surface border border-border rounded-xl p-5">
        
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-sm font-semibold text-muted">Contratos Ativos</h3>
          <button 
            onClick={exportarParaExcel}
            className="flex items-center gap-2 bg-brand-brown hover:bg-brand-brownHover text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all h-[34px]"
          >
            <Download size={14} />
            Exportar Excel
          </button>
        </div>

        {lista.length === 0 ? (
          <p className="text-subtle text-sm text-center py-6">Nenhum parcelamento cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs">
                  
                  <th className="text-left py-2 px-3 font-medium min-w-[100px]">
                    <div className="flex flex-col gap-1.5">
                      <span>ID Contrato</span>
                      <div className="h-[21px]" />
                    </div>
                  </th>
                  
                  <th className="text-left py-2 px-3 font-medium min-w-[130px]">
                    <div className="flex flex-col gap-1.5">
                      <span>Categoria</span>
                      <select 
                        value={filtroCategoria} 
                        onChange={e => setFiltroCategoria(e.target.value)}
                        className="bg-bg border border-border text-subtle text-[10px] py-0.5 px-1.5 rounded focus:outline-none focus:border-brand-brown font-normal cursor-pointer w-full"
                      >
                        <option value="">Tudo</option>
                        {opcoesCategoria.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </th>
                  
                  <th className="text-left py-2 px-3 font-medium">
                    <div className="flex flex-col gap-1.5">
                      <span>Descrição</span>
                      <div className="h-[21px]" />
                    </div>
                  </th>
                  
                  <th className="text-left py-2 px-3 font-medium min-w-[120px]">
                    <div className="flex flex-col gap-1.5">
                      <span>Responsável</span>
                      <select 
                        value={filtroResponsavel} 
                        onChange={e => setFiltroResponsavel(e.target.value)}
                        className="bg-bg border border-border text-subtle text-[10px] py-0.5 px-1.5 rounded focus:outline-none focus:border-brand-brown font-normal cursor-pointer w-full"
                      >
                        <option value="">Tudo</option>
                        {opcoesResponsavel.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </th>
                  
                  <th className="text-left py-2 px-3 font-medium min-w-[80px]">
                    <div className="flex flex-col gap-1.5">
                      <span>Parcelas</span>
                      <div className="h-[21px]" />
                    </div>
                  </th>
                  
                  <th className="text-left py-2 px-3 font-medium min-w-[100px]">
                    <div className="flex flex-col gap-1.5">
                      <span>Valor Total</span>
                      <div className="h-[21px]" />
                    </div>
                  </th>

                  <th className="py-2 px-3">
                    <div className="h-[36px]" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map(row => (
                  <tr key={row.id_contrato} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs text-subtle">{row.id_contrato}</td>
                    <td className="py-2 px-3">
                      <span className="bg-brand-brown/10 text-brand-brown px-2 py-0.5 rounded text-xs font-medium">
                        {row.categoria}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted max-w-[150px] truncate">{row.descricao || "—"}</td>
                    <td className="py-2 px-3 text-subtle">{row.responsavel}</td>
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