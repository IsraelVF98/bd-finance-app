// src/pages/Lancamentos.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2, Search, Plus, Minus, Download } from "lucide-react"

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const MESES_MAP = Object.fromEntries(MESES.map((m, i) => [m, String(i + 1).padStart(2, "0")]))
const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <input {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors" />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <select {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors">
      {children}
    </select>
  </div>
)

export default function Lancamentos() {
  const [aba, setAba] = useState("despesa")
  const [categorias, setCategorias] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ tipo: "", texto: "" })

  const [despesa, setDespesa] = useState({
    mes: MESES[new Date().getMonth()], ano: anoAtual,
    categoria: "", quem_pagou: "", descricao: "", valor: "",
    custo_fixo: false
  })
  const [receita, setReceita] = useState({
    mes: MESES[new Date().getMonth()], ano: anoAtual, fonte: "", valor: ""
  })

  const [tipoLista, setTipoLista] = useState("avulsas")
  const [busca, setBusca] = useState("")
  const [lista, setLista] = useState([])

  const [filtroMesAno, setFiltroMesAno] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroQuemPagou, setFiltroQuemPagou] = useState("")

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }

  useEffect(() => {
    api.get("/categorias").then(r => setCategorias(r.data))
    api.get("/pessoas").then(r => { 
      setPessoas(r.data); 
      if (r.data[0]) { 
        setDespesa(d => ({ ...d, categoria: "", quem_pagou: "", custo_fixo: false })); 
        setReceita(r => ({ ...r, fonte: "" })) 
      } 
    })
  }, [])

  useEffect(() => { carregarLista() }, [tipoLista, busca])

  useEffect(() => {
    setFiltroMesAno("")
    setFiltroCategoria("")
    setFiltroQuemPagou("")
  }, [tipoLista])

  const carregarLista = async () => {
    try {
      if (tipoLista === "receitas") {
        const r = await api.get("/lancamentos/receitas", { params: { busca } })
        setLista(r.data)
      } else {
        const r = await api.get("/lancamentos/despesas", { params: { tipo: tipoLista, busca } })
        setLista(r.data)
      }
    } catch {}
  }

  const salvarDespesa = async () => {
    if (!despesa.categoria) { flash("erro", "Por favor, selecione uma categoria."); return }
    if (!despesa.valor || parseFloat(despesa.valor) <= 0) { flash("erro", "Valor deve ser maior que zero."); return }
    if (!despesa.quem_pagou) { flash("erro", "Selecione o pagante."); return }
    
    setLoading(true)
    try {
      await api.post("/lancamentos/despesa", {
        mes_ano: `${MESES_MAP[despesa.mes]}/${despesa.ano}`,
        categoria: despesa.categoria, descricao: despesa.descricao,
        valor: parseFloat(despesa.valor.replace(",", ".")),
        quem_pagou: despesa.quem_pagou,
        custo_fixo: despesa.custo_fixo
      })
      flash("ok", "Despesa adicionada!")
      setDespesa(d => ({ ...d, categoria: "", quem_pagou: "", descricao: "", valor: "", custo_fixo: false }))
      carregarLista()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const salvarReceita = async () => {
    if (!receita.fonte) { flash("erro", "Por favor, selecione a fonte/membro."); return }
    if (!receita.valor || parseFloat(receita.valor) <= 0) { flash("erro", "Valor deve ser maior que zero."); return }
    
    setLoading(true)
    try {
      await api.post("/lancamentos/receita", {
        mes_ano: `${MESES_MAP[receita.mes]}/${receita.ano}`,
        fonte: receita.fonte,
        valor: parseFloat(String(receita.valor).replace(",", "."))
      })
      flash("ok", "Receita adicionada!")
      setReceita(r => ({ ...r, fonte: "", valor: "" }))
      carregarLista()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const deletar = async (id) => {
    const endpoint = tipoLista === "receitas" ? `/lancamentos/receita/${id}` : `/lancamentos/despesa/${id}`
    await api.delete(endpoint)
    carregarLista()
  }

  const fmt = v => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  const opcoesMesAno = [...new Set(lista.map(r => r.mes_ano))].sort()
  const opcoesCategoria = [...new Set(lista.map(r => tipoLista === "receitas" ? r.fonte : r.categoria))].sort()
  const opcoesQuemPagou = [...new Set(lista.map(r => r.quem_pagou).filter(Boolean))].sort()

  const listaFiltrada = lista.filter(row => {
    const matchMes = filtroMesAno ? row.mes_ano === filtroMesAno : true
    const catAtual = tipoLista === "receitas" ? row.fonte : row.categoria
    const matchCat = filtroCategoria ? catAtual === filtroCategoria : true
    const matchPagante = filtroQuemPagou ? row.quem_pagou === filtroQuemPagou : true
    return matchMes && matchCat && matchPagante
  })

  const exportarParaExcel = () => {
    const headers = ["Mês/Ano", tipoLista === "receitas" ? "Fonte" : "Categoria", "Descrição", "Valor", tipoLista === "receitas" ? "" : "Quem Pagou"]
    
    const rows = listaFiltrada.map(row => [
      row.mes_ano,
      tipoLista === "receitas" ? row.fonte : row.categoria,
      row.descricao || "—",
      row.valor.toString().replace(".", ","),
      tipoLista === "receitas" ? "" : row.quem_pagou
    ])

    const csvContent = "\ufeff" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `lancamentos_${tipoLista}_${new Date().toLocaleDateString("pt-BR")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Receitas / Despesas</h1>

      {msg.texto && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
          {msg.texto}
        </div>
      )}

      {/* Formulário */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex bg-surface2 rounded-lg p-1 mb-5 w-fit gap-1">
          <button 
            onClick={() => setAba("despesa")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              aba === "despesa" ? "bg-brand-brown text-white font-bold" : "text-muted hover:text-white"
            }`}
          >
            <Minus size={14} />
            Nova Despesa
          </button>
          <button 
            onClick={() => setAba("receita")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              aba === "receita" ? "bg-brand-brown text-white font-bold" : "text-muted hover:text-white"
            }`}
          >
            <Plus size={14} />
            Nova Receita
          </button>
        </div>

        {aba === "despesa" ? (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Mês" value={despesa.mes} onChange={e => setDespesa(d => ({ ...d, mes: e.target.value }))}>
              {MESES.map(m => <option key={m}>{m}</option>)}
            </Select>
            <Select label="Ano" value={despesa.ano} onChange={e => setDespesa(d => ({ ...d, ano: e.target.value }))}>
              {ANOS.map(a => <option key={a}>{a}</option>)}
            </Select>
            <Select label="Categoria" value={despesa.categoria} onChange={e => setDespesa(d => ({ ...d, categoria: e.target.value }))}>
              <option value="" disabled hidden>Selecione uma categoria...</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Pagante" value={despesa.quem_pagou} onChange={e => setDespesa(d => ({ ...d, quem_pagou: e.target.value }))}>
              <option value="" disabled hidden>Selecione o pagante...</option>
              {pessoas.map(p => <option key={p}>{p}</option>)}
            </Select>
            <Input label="Descrição (opcional)" value={despesa.descricao} onChange={e => setDespesa(d => ({ ...d, descricao: e.target.value }))} placeholder="Ex: Conta de luz" />
            <Input label="Valor (R$)" value={despesa.valor} onChange={e => setDespesa(d => ({ ...d, valor: e.target.value }))} placeholder="0,00" />
            
            <div className="col-span-2 flex items-center gap-2.5 py-1">
              <input 
                type="checkbox" 
                id="custo_fixo" 
                checked={despesa.custo_fixo} 
                onChange={e => setDespesa(d => ({ ...d, custo_fixo: e.target.checked }))}
                className="w-4 h-4 rounded bg-bg border-border text-brand-brown focus:ring-brand-brown focus:ring-offset-bg cursor-pointer"
              />
              <label htmlFor="custo_fixo" className="text-muted text-xs font-medium cursor-pointer select-none">
                Esta é uma despesa recorrente (Custo Fixo)
              </label>
            </div>

            <div className="col-span-2">
              <button onClick={salvarDespesa} disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Salvando..." : "Inserir Despesa"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Mês" value={receita.mes} onChange={e => setReceita(r => ({ ...r, mes: e.target.value }))}>
              {MESES.map(m => <option key={m}>{m}</option>)}
            </Select>
            <Select label="Ano" value={receita.ano} onChange={e => setReceita(r => ({ ...r, ano: e.target.value }))}>
              {ANOS.map(a => <option key={a}>{a}</option>)}
            </Select>
            
            <Select label="Fonte/Membro" value={receita.fonte} onChange={e => setReceita(r => ({ ...r, fonte: e.target.value }))}>
              <option value="" disabled hidden>Selecione a fonte...</option>
              {pessoas.map(p => <option key={p}>{p}</option>)}
            </Select>

            <Input label="Valor (R$)" value={receita.valor} onChange={e => setReceita(r => ({ ...r, valor: e.target.value }))} placeholder="0,00" />
            <div className="col-span-2">
              <button onClick={salvarReceita} disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Salvando..." : "Inserir Receita"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista / Exclusão */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">Corrigir / Excluir Lançamentos</h3>

        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex bg-surface2 rounded-lg p-1 gap-1">
            {[
              ["avulsas","Despesas Avulsas"],
              ["fixos", "Despesas Fixas"],
              ["receitas","Receitas"]
            ].map(([v,l]) => (
              <button key={v} onClick={() => setTipoLista(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tipoLista === v ? "bg-brand-brown text-white font-bold" : "text-muted hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por descrição, categoria..."
              className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-1.5 text-white text-sm focus:outline-none focus:border-brand-brown" />
          </div>
          
          <button 
            onClick={exportarParaExcel}
            className="flex items-center gap-2 bg-brand-brown hover:bg-brand-brownHover text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all h-[34px]"
          >
            <Download size={14} />
            Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs">
                
                <th className="text-left py-2 px-3 font-medium min-w-[100px]">
                  <div className="flex flex-col gap-1.5">
                    <span>Mês/Ano</span>
                    <select 
                      value={filtroMesAno} 
                      onChange={e => setFiltroMesAno(e.target.value)}
                      className="bg-bg border border-border text-subtle text-[10px] py-0.5 px-1.5 rounded focus:outline-none focus:border-brand-brown font-normal cursor-pointer w-full"
                    >
                      <option value="">Tudo</option>
                      {opcoesMesAno.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </th>
                
                <th className="text-left py-2 px-3 font-medium min-w-[130px]">
                  <div className="flex flex-col gap-1.5">
                    <span>{tipoLista === "receitas" ? "Fonte" : "Categoria"}</span>
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
                
                <th className="text-left py-2 px-3 font-medium min-w-[100px]">
                  <div className="flex flex-col gap-1.5">
                    <span>Valor</span>
                    <div className="h-[21px]" />
                  </div>
                </th>
                
                <th className="text-left py-2 px-3 font-medium min-w-[120px]">
                  {tipoLista !== "receitas" ? (
                    <div className="flex flex-col gap-1.5">
                      <span>Quem Pagou</span>
                      <select 
                        value={filtroQuemPagou} 
                        onChange={e => setFiltroQuemPagou(e.target.value)}
                        className="bg-bg border border-border text-subtle text-[10px] py-0.5 px-1.5 rounded focus:outline-none focus:border-brand-brown font-normal cursor-pointer w-full"
                      >
                        <option value="">Tudo</option>
                        {opcoesQuemPagou.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-transparent">—</span>
                      <div className="h-[21px]" />
                    </div>
                  )}
                </th>

                <th className="py-2 px-3">
                  <div className="h-[36px]" />
                </th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(row => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="py-2.5 px-3 text-subtle">{row.mes_ano}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-brand-brown/10 text-brand-brown px-2 py-0.5 rounded text-xs font-medium">
                      {tipoLista === "receitas" ? row.fonte : row.categoria}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted">{row.descricao || "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-sm">{fmt(row.valor)}</td>
                  <td className="py-2.5 px-3 text-subtle">{tipoLista === "receitas" ? "" : row.quem_pagou}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => deletar(row.id)} className="text-subtle hover:text-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-subtle">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}