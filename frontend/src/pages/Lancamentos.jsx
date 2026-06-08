// src/pages/Lancamentos.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2, Search } from "lucide-react"

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const MESES_MAP = Object.fromEntries(MESES.map((m, i) => [m, String(i + 1).padStart(2, "0")]))
const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <input {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green transition-colors" />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <select {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green transition-colors">
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
    categoria: "", quem_pagou: "", descricao: "", valor: ""
  })
  const [receita, setReceita] = useState({
    mes: MESES[new Date().getMonth()], ano: anoAtual, fonte: "", valor: ""
  })

  const [tipoLista, setTipoLista] = useState("avulsas")
  const [busca, setBusca] = useState("")
  const [lista, setLista] = useState([])

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }

  useEffect(() => {
    api.get("/categorias").then(r => setCategorias(r.data))
    api.get("/pessoas").then(r => { 
      setPessoas(r.data); 
      if (r.data[0]) { 
        // Mantém categoria vazia para forçar a seleção manual
        setDespesa(d => ({ ...d, categoria: "", quem_pagou: r.data[0] })); 
        setReceita(r => ({ ...r, fonte: r.data?.[0] || "" })) 
      } 
    })
  }, [])

  useEffect(() => { carregarLista() }, [tipoLista, busca])

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
    // VALIDAÇÃO DO BUG: Impede o envio se não escolher uma categoria
    if (!despesa.categoria) { flash("erro", "Por favor, selecione uma categoria."); return }
    if (!despesa.valor || parseFloat(despesa.valor) <= 0) { flash("erro", "Valor deve ser maior que zero."); return }
    if (!despesa.quem_pagou) { flash("erro", "Selecione o pagante."); return }
    
    setLoading(true)
    try {
      await api.post("/lancamentos/despesa", {
        mes_ano: `${MESES_MAP[despesa.mes]}/${despesa.ano}`,
        categoria: despesa.categoria, descricao: despesa.descricao,
        valor: parseFloat(despesa.valor.replace(",", ".")),
        quem_pagou: despesa.quem_pagou
      })
      flash("ok", "Despesa adicionada!")
      // Reseta o formulário e limpa a categoria para o próximo lançamento
      setDespesa(d => ({ ...d, categoria: "", descricao: "", valor: "" }))
      carregarLista()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const salvarReceita = async () => {
    if (!receita.valor || parseFloat(receita.valor) <= 0) { flash("erro", "Valor deve ser maior que zero."); return }
    setLoading(true)
    try {
      await api.post("/lancamentos/receita", {
        mes_ano: `${MESES_MAP[receita.mes]}/${receita.ano}`,
        fonte: receita.fonte,
        valor: parseFloat(String(receita.valor).replace(",", "."))
      })
      flash("ok", "Receita adicionada!")
      setReceita(r => ({ ...r, valor: "" }))
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
          {["despesa", "receita"].map(t => (
            <button key={t} onClick={() => setAba(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${aba === t ? "bg-green text-bg" : "text-muted hover:text-white"}`}>
              {t === "despesa" ? "➖ Nova Despesa" : "➕ Nova Receita"}
            </button>
          ))}
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
              {/* Opção padrão placeholder desativada */}
              <option value="" disabled hidden>Selecione uma categoria...</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Pagante" value={despesa.quem_pagou} onChange={e => setDespesa(d => ({ ...d, quem_pagou: e.target.value }))}>
              {pessoas.map(p => <option key={p}>{p}</option>)}
            </Select>
            <Input label="Descrição (opcional)" value={despesa.descricao} onChange={e => setDespesa(d => ({ ...d, descricao: e.target.value }))} placeholder="Ex: Conta de luz" />
            <Input label="Valor (R$)" value={despesa.valor} onChange={e => setDespesa(d => ({ ...d, valor: e.target.value }))} placeholder="0,00" />
            <div className="col-span-2">
              <button onClick={salvarDespesa} disabled={loading}
                className="w-full bg-green text-bg font-bold py-2.5 rounded-lg text-sm hover:bg-green/90 active:scale-95 transition-all disabled:opacity-50">
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
              {pessoas.map(p => <option key={p}>{p}</option>)}
            </Select>
            <Input label="Valor (R$)" value={receita.valor} onChange={e => setReceita(r => ({ ...r, valor: e.target.value }))} placeholder="0,00" />
            <div className="col-span-2">
              <button onClick={salvarReceita} disabled={loading}
                className="w-full bg-green text-bg font-bold py-2.5 rounded-lg text-sm hover:bg-green/90 active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Salvando..." : "Inserir Receita"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista / Exclusão */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">Corrigir / Excluir Lançamentos</h3>

        <div className="flex gap-3 mb-4">
          <div className="flex bg-surface2 rounded-lg p-1 gap-1">
            {[["avulsas","Despesas Avulsas"],["receitas","Receitas"]].map(([v,l]) => (
              <button key={v} onClick={() => setTipoLista(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tipoLista === v ? "bg-green text-bg" : "text-muted hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por descrição, categoria..."
              className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-1.5 text-white text-sm focus:outline-none focus:border-green" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs">
                <th className="text-left py-2 px-3">Mês/Ano</th>
                <th className="text-left py-2 px-3">{tipoLista === "receitas" ? "Fonte" : "Categoria"}</th>
                <th className="text-left py-2 px-3">Descrição</th>
                <th className="text-left py-2 px-3">Valor</th>
                <th className="text-left py-2 px-3">{tipoLista === "receitas" ? "" : "Quem Pagou"}</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(row => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="py-2 px-3 text-subtle">{row.mes_ano}</td>
                  <td className="py-2 px-3"><span className="bg-green/10 text-green px-2 py-0.5 rounded text-xs">{tipoLista === "receitas" ? row.fonte : row.categoria}</span></td>
                  <td className="py-2 px-3 text-muted">{row.descricao || "—"}</td>
                  <td className="py-2 px-3 font-mono text-sm">{fmt(row.valor)}</td>
                  <td className="py-2 px-3 text-subtle">{tipoLista === "receitas" ? "" : row.quem_pagou}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => deletar(row.id)} className="text-subtle hover:text-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-subtle">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}