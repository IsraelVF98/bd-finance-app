// src/pages/Investimentos.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import { Trash2, PiggyBank, Wallet, TrendingUp, Plus, Minus,LineChart } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const fmt = (v) => {
  const val = Number(v)
  const formatado = Math.abs(val).toLocaleString("pt-BR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
  return val < 0 ? `-R$ ${formatado}` : `R$ ${formatado}`
}

const MESES = [
  ["01","Jan"],["02","Fev"],["03","Mar"],["04","Abr"],
  ["05","Mai"],["06","Jun"],["07","Jul"],["08","Ago"],
  ["09","Set"],["10","Out"],["11","Nov"],["12","Dez"],
]

const PALETA_CORES = [
  "#36A2EB", "#FF6384", "#FF9F40", "#4BC0C0", "#9966FF", 
  "#FFCD56", "#C9CBCC", "#FF5733", "#33FF57", "#3357FF"
]

const hoje = new Date()
const anoAtual = hoje.getFullYear()
const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0")
const mesAtualCompleto = `${mesAtual}/${anoAtual}`

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <input {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green" />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-muted text-xs font-medium block mb-1">{label}</label>
    <select {...props} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green">{children}</select>
  </div>
)

export default function Investimentos() {
  const [anos, setAnos] = useState([anoAtual.toString()])
  const [ativos, setAtivos] = useState([])
  const [evolucao, setEvolucao] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [resumo, setResumo] = useState({ total_investido: 0, total_rendido: 0, saldo_atual: 0 })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ tipo: "", texto: "" })

  const [novoAtivo, setNovoAtivo] = useState({ nome: "", instituicao: "", tipo: "Renda Fixa" })
  const [novaMov, setMov] = useState({ 
    investimento_id: "", 
    tipo_movimentacao: "aporte", 
    valor: "", 
    mes_ano: mesAtualCompleto
  })

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: "", texto: "" }), 3000) }

  useEffect(() => {
    api.get("/dashboard/anos-disponiveis").then(r => {
      setAnos(r.data && r.data.length > 0 ? r.data : [anoAtual.toString()])
    })
    carregarDashboard()
  }, [])

  const carregarDashboard = () => {
    api.get("/investimentos/dashboard").then(r => {
      setAtivos(r.data.ativos)
      setResumo(r.data.resumo_geral)
      setEvolucao(r.data.evolucao)
      if (r.data.ativos[0]) {
        setMov(m => ({ ...m, investimento_id: r.data.ativos[0].id.toString() }))
      }
    })
    
    api.get("/investimentos/movimentacoes").then(r => {
      setMovimentacoes(r.data)
    })
  }

  const salvarAtivo = async () => {
    if (!novoAtivo.nome) { flash("erro", "Por favor, digite o nome do ativo."); return }
    setLoading(true)
    try {
      await api.post("/investimentos/ativo", novoAtivo)
      flash("ok", "Ativo criado com sucesso!")
      setNovoAtivo({ nome: "", instituicao: "", tipo: "Renda Fixa" })
      carregarDashboard()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const salvarMovimentacao = async () => {
    if (!novaMov.investimento_id) { flash("erro", "Crie ou selecione um ativo primeiro."); return }
    const valorNum = parseFloat(String(novaMov.valor).replace(",", "."))
    if (!valorNum || valorNum <= 0) { flash("erro", "O valor deve ser maior que zero."); return }
    if (!novaMov.mes_ano) { flash("erro", "Selecione uma data para o lançamento."); return }

    const [mes, ano] = novaMov.mes_ano.split("/")
    const dataConvertida = `${ano}-${mes}-01`

    setLoading(true)
    try {
      await api.post("/investimentos/movimentacao", {
        investimento_id: parseInt(novaMov.investimento_id),
        tipo_movimentacao: novaMov.tipo_movimentacao,
        valor: valorNum,
        data_movimento: dataConvertida
      })
      flash("ok", "Movimentação registrada!")
      setMov(m => ({ ...m, valor: "" }))
      carregarDashboard()
    } catch (e) { flash("erro", e.response?.data?.detail || "Erro.") }
    finally { setLoading(false) }
  }

  const deletarAtivo = async (id) => {
    if (!confirm("Tem certeza que deseja apagar este ativo? Todos os seus lançamentos e rendimentos serão apagados!")) return
    await api.delete(`/investimentos/ativo/${id}`)
    carregarDashboard()
  }

  const deletarMovimentacao = async (id) => {
    if (!confirm("Excluir este lançamento de investimento? O saldo da carteira será recalculado!")) return
    await api.delete(`/investimentos/movimentacao/${id}`)
    carregarDashboard()
  }

  const labelsTipo = {
    aporte: "Aporte",
    rendimento: "Rendimento",
    saque: "Saque"
  }

  const coresTipo = {
    aporte: "text-[#36A2EB]",
    rendimento: "text-green",
    saque: "text-red"
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Investimentos</h1>

      {msg.texto && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
          {msg.texto}
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 border-l-4 border-green flex items-center justify-between">
          <div>
            <p className="text-muted text-xs font-medium mb-1">Saldo Atual Investido</p>
            <p className="text-2xl font-bold font-mono text-green">{fmt(resumo.saldo_atual)}</p>
          </div>
          <Wallet size={24} className="text-green opacity-40" />
        </div>
        <div className="bg-surface rounded-xl p-5 border-l-4 flex items-center justify-between" style={{ borderColor: "#36A2EB" }}>
          <div>
            <p className="text-muted text-xs font-medium mb-1">Total Aplicado (Do Bolso)</p>
            <p className="text-2xl font-bold font-mono text-[#36A2EB]">{fmt(resumo.total_investido)}</p>
          </div>
          <PiggyBank size={24} className="text-[#36A2EB] opacity-40" />
        </div>
        <div className="bg-surface rounded-xl p-5 border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-muted text-xs font-medium mb-1">Rendimento Acumulado</p>
            <p className="text-2xl font-bold font-mono text-yellow-500">{fmt(resumo.total_rendido)}</p>
          </div>
          <LineChart size={24} className="text-yellow-500 opacity-40" />
        </div>
      </div>

      {/* Seção Central - Formulários e Gráfico de Barras Empilhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Formulários (Esquerda) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Novo Ativo */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted mb-4">Adicionar Novo Ativo</h3>
            <div className="space-y-4">
              <Input label="Nome do Ativo" value={novoAtivo.nome} onChange={e => setNovoAtivo(a => ({ ...a, nome: e.target.value }))} placeholder="Ex: Tesouro Selic 2029" />
              <Input label="Instituição/Corretora" value={novoAtivo.instituicao} onChange={e => setNovoAtivo(a => ({ ...a, instituicao: e.target.value }))} placeholder="Ex: XP Investimentos" />
              <Select label="Tipo" value={novoAtivo.tipo} onChange={e => setNovoAtivo(a => ({ ...a, tipo: e.target.value }))}>
                <option>Renda Fixa</option>
                <option>Ações</option>
                <option>FIIs</option>
                <option>Cripto</option>
                <option>Outros</option>
              </Select>
              <button onClick={salvarAtivo} disabled={loading} className="w-full bg-green text-bg font-bold py-2 rounded-lg text-sm hover:bg-green/90 transition-all">
                Criar Ativo
              </button>
            </div>
          </div>

          {/* Registrar Movimentação */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted mb-4">Registrar Movimentação</h3>
            <div className="space-y-4">
              <Select 
                label="Escolha o Ativo" 
                value={novaMov.investimento_id} 
                onChange={e => setMov(m => ({ ...m, investimento_id: e.target.value }))}
              >
                <option value="" disabled>Selecione um ativo...</option>
                {ativos.map(a => (
                  <option key={a.id} value={a.id.toString()}>
                    {a.nome} ({a.instituicao})
                  </option>
                ))}
              </Select>
              
              {/* UPGRADE: Tipo de Movimento substituído pelo seletor de ícones do Lucide */}
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Tipo de Movimento</label>
                <TipoMovimentoPicker
                  value={novaMov.tipo_movimentacao}
                  onChange={valor => setMov(m => ({ ...m, tipo_movimentacao: valor }))}
                />
              </div>

              <Input label="Valor (R$)" value={novaMov.valor} onChange={e => setMov(m => ({ ...m, valor: e.target.value }))} placeholder="0,00" />
              
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Mês/Ano do Lançamento</label>
                <MonthPicker
                  value={novaMov.mes_ano}
                  onChange={valor => setMov(m => ({ ...m, mes_ano: valor }))}
                  anos={anos}
                />
              </div>

              <button onClick={salvarMovimentacao} disabled={loading} className="w-full bg-green text-bg font-bold py-2 rounded-lg text-sm hover:bg-green/90 transition-all mt-1">
                Registrar
              </button>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução de Barras Empilhadas (Direita) */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted mb-4">Evolução do Patrimônio Acumulado</h3>
          {evolucao.length === 0 ? (
            <p className="text-subtle text-sm text-center py-20">Registre aportes para visualizar a evolução.</p>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucao} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                  <XAxis dataKey="mes_ano" tick={{ fill: "#a3a8b4", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a3a8b4", fontSize: 11 }} tickFormatter={v => `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }}
                    itemStyle={{ color: "#ffffff" }}
                    labelStyle={{ color: "#ffffff" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Aplicado" stackId="patrimonio" fill="#36A2EB" name="Valor Aplicado" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Rendimento" stackId="patrimonio" fill="#00E676" name="Rendimento" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé - Duas colunas de listagem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna 1: Meus Ativos */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted mb-4">Meus Ativos</h3>
          {ativos.length === 0 ? (
            <p className="text-subtle text-sm text-center py-6">Você ainda não tem ativos cadastrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-muted text-xs uppercase tracking-wider text-left">
                    <th className="py-2.5 px-3 font-semibold">Ativo</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo</th>
                    <th className="py-2.5 px-3 font-semibold">Saldo Atual</th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {ativos.map(row => (
                    <tr key={row.id} className="hover:bg-surface2/40 transition-colors">
                      <td className="py-2.5 px-3 text-white font-sans font-medium">
                        {row.nome} <span className="text-muted text-xs font-normal">({row.instituicao || "—"})</span>
                      </td>
                      <td className="py-2.5 px-3"><span className="bg-surface2 text-muted px-1.5 py-0.5 rounded text-[10px] font-medium font-sans">{row.tipo}</span></td>
                      <td className="py-2.5 px-3 text-green font-bold">{fmt(row.saldo_atual)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => deletarAtivo(row.id)} className="text-subtle hover:text-red transition-colors p-1">
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

        {/* Coluna 2: Histórico de Movimentações */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted mb-4">Histórico de Movimentações</h3>
          {movimentacoes.length === 0 ? (
            <p className="text-subtle text-sm text-center py-6">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-muted text-xs uppercase tracking-wider text-left">
                    <th className="py-2.5 px-3 font-semibold">Data</th>
                    <th className="py-2.5 px-3 font-semibold">Ativo</th>
                    <th className="py-2.5 px-3 font-semibold">Operação</th>
                    <th className="py-2.5 px-3 font-semibold">Valor</th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {movimentacoes.map(row => (
                    <tr key={row.id} className="hover:bg-surface2/40 transition-colors">
                      <td className="py-2.5 px-3 text-subtle">{row.data}</td>
                      <td className="py-2.5 px-3 text-white font-sans font-medium">
                        {row.ativo} <span className="text-muted text-xs font-normal">({row.instituicao || "—"})</span>
                      </td>
                      <td className={`py-2.5 px-3 font-sans font-medium ${coresTipo[row.tipo]}`}>
                        {labelsTipo[row.tipo]}
                      </td>
                      <td className={`py-2.5 px-3 font-bold ${coresTipo[row.tipo]}`}>{fmt(row.valor)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => deletarMovimentacao(row.id)} className="text-subtle hover:text-red transition-colors p-1">
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
    </div>
  )
}

// UPGRADE: Componente Customizado TipoMovimentoPicker utilizando ícones nativos do Lucide
function TipoMovimentoPicker({ value, onChange }) {
  const [aberto, setAberto] = useState(false)
  
  const opcoes = [
    { valor: "aporte", label: "Aporte (Depositar)", icon: Plus, cor: "text-[#36A2EB]" },
    { valor: "rendimento", label: "Rendimento (Rendeu sozinho)", icon: TrendingUp, cor: "text-green" },
    { valor: "saque", label: "Saque (Resgatar)", icon: Minus, cor: "text-red" }
  ]
  
  const selecionado = opcoes.find(o => o.valor === value) || opcoes[0]
  const CurrentIcon = selecionado.icon

  return (
    <div className="relative inline-block w-full">
      {/* Botão Principal do Seletor */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="bg-surface border border-border text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-green w-full flex items-center justify-between gap-2 hover:bg-surface2 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <CurrentIcon size={14} className={selecionado.cor} />
          <span>{selecionado.label}</span>
        </div>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {/* Backdrop invisível para clique fora */}
      {aberto && (
        <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
      )}

      {/* Lista Flutuante de Opções */}
      {aberto && (
        <div className="absolute top-full left-0 mt-2 bg-surface2 border border-border rounded-xl p-1.5 w-full shadow-2xl z-50 animate-fadeIn">
          <div className="flex flex-col gap-1">
            {opcoes.map(({ valor, label, icon: OptionIcon, cor }) => (
              <button
                key={valor}
                type="button"
                onClick={() => {
                  onChange(valor)
                  setAberto(false)
                }}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg uppercase transition-all text-left ${
                  value === valor
                    ? "bg-green/10 text-green"
                    : "text-gray-400 hover:text-white hover:bg-surface"
                }`}
              >
                <OptionIcon size={14} className={cor} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MonthPicker({ value, onChange, anos }) {
  const [aberto, setAberto] = useState(false)
  const [mesSel, anoSel] = value ? value.split("/") : [mesAtual, anoAtual.toString()]
  const [anoVisualizado, setAnoVisualizado] = useState(anoSel)

  useEffect(() => {
    if (anoSel) setAnoVisualizado(anoSel)
  }, [anoSel])

  const handleAnoAnterior = () => {
    const anosNumeros = anos.map(Number)
    const minAno = Math.min(...anosNumeros)
    const novoAno = Number(anoVisualizado) - 1
    if (novoAno >= minAno) {
      setAnoVisualizado(String(novoAno))
    }
  }

  const handleAnoSeguinte = () => {
    const anosNumeros = anos.map(Number)
    const maxAno = Math.max(...anosNumeros)
    const novoAno = Number(anoVisualizado) + 1
    if (novoAno <= maxAno) {
      setAnoVisualizado(String(novoAno))
    }
  }

  const MESES_PICKER = [
    ["01", "jan"], ["02", "fev"], ["03", "mar"], ["04", "abr"],
    ["05", "mai"], ["06", "jun"], ["07", "jul"], ["08", "ago"],
    ["09", "set"], ["10", "out"], ["11", "nov"], ["12", "dez"]
  ]

  const mesNomeExibicao = MESES.find(([cod]) => cod === mesSel)?.[1] || "Jun"

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="bg-surface border border-border text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-green w-full flex items-center justify-between gap-2 hover:bg-surface2 transition-all"
      >
        <span>{value ? `${mesNomeExibicao}/${anoSel}` : "Selecione"}</span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
      )}

      {aberto && (
        <div className="absolute top-full left-0 mt-2 bg-surface2 border border-border rounded-xl p-3 w-[240px] shadow-2xl z-50 animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
            <button
              type="button"
              onClick={handleAnoAnterior}
              className="text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-surface transition-all text-sm font-bold"
            >
              &lt;
            </button>
            <span className="text-white text-sm font-bold">{anoVisualizado}</span>
            <button
              type="button"
              onClick={handleAnoSeguinte}
              className="text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-surface transition-all text-sm font-bold"
            >
              &gt;
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MESES_PICKER.map(([cod, nome]) => {
              const estaSelecionado = mesSel === cod && anoVisualizado === anoSel
              return (
                <button
                  key={cod}
                  type="button"
                  onClick={() => {
                    onChange(`${cod}/${anoVisualizado}`)
                    setAberto(false)
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg uppercase transition-all ${
                    estaSelecionado
                      ? "bg-green text-bg font-bold"
                      : "text-gray-400 hover:text-white hover:bg-surface"
                  }`}
                >
                  {nome}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
