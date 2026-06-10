// src/pages/Dashboard.jsx
import { useState, useEffect, Fragment } from "react"
import api from "../api/client"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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

// UPGRADE: Declarado mesAtual de forma global para evitar quebra no MonthPicker
const hoje = new Date()
const anoAtual = hoje.getFullYear().toString()
const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0")

export default function Dashboard() {
  const [anos, setAnos] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [filtroPessoa, setFiltroPessoa] = useState("todos")
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 })
  const [evolucao, setEvolucao] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proporcao, setProporcao] = useState({ avulsas: 0, parceladas: 0, custos_fixos: 0 })
  const [extrato, setExtrato] = useState([])
  const [tabelaoData, setTabelaoData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/anos-disponiveis"),
      api.get("/pessoas"),
    ]).then(([a, p]) => {
      const listaAnos = a.data && a.data.length > 0 ? a.data : [anoAtual]
      setAnos(listaAnos)
      setPessoas(p.data)
      
      const anoPadrao = listaAnos.includes(anoAtual) ? anoAtual : listaAnos[0]
      setDataInicio(`01/${anoPadrao}`)
      setDataFim(`12/${anoPadrao}`)
    }).catch(err => {
      console.error("Erro ao buscar dados iniciais", err)
    })
  }, [])

  useEffect(() => {
    if (!dataInicio || !dataFim) return
    setLoading(true)
    const params = { data_inicio: dataInicio, data_fim: dataFim, filtro_pessoa: filtroPessoa }
    
    const promessas = [
      api.get("/dashboard/resumo", { params }),
      api.get("/dashboard/evolucao-mensal", { params }),
      api.get("/dashboard/por-categoria", { params }),
      api.get("/dashboard/avulsas-vs-parceladas", { params }),
      api.get("/dashboard/extrato", { params }),
      api.get("/dashboard/tabelao", { params }),
    ]

    Promise.all(promessas).then(([r, e, c, p, ex, t]) => {
      setResumo(r.data)
      const mapa = {}
      e.data.receitas.forEach(x => { mapa[x.mes_ano] = { ...mapa[x.mes_ano], mes_ano: x.mes_ano, Receitas: x.total } })
      e.data.despesas.forEach(x => { mapa[x.mes_ano] = { ...mapa[x.mes_ano], mes_ano: x.mes_ano, Despesas: x.total } })
      
      setEvolucao(Object.values(mapa))
      setCategorias(c.data)
      setProporcao(p.data)
      setExtrato(ex.data)
      setTabelaoData(t.data)
    }).catch(err => {
      console.error("Erro ao buscar dados do dashboard", err)
    }).finally(() => setLoading(false))
  }, [dataInicio, dataFim, filtroPessoa])

  const compararDatas = (d1, d2) => {
    if (!d1 || !d2) return 0
    const [m1, a1] = d1.split("/")
    const [m2, a2] = d2.split("/")
    return `${a1}${m1}`.localeCompare(`${a2}${m2}`)
  }

  const handleDataInicioChange = (novaData) => {
    setDataInicio(novaData)
    if (compararDatas(novaData, dataFim) > 0) {
      setDataFim(novaData)
    }
  }

  const handleDataFimChange = (novaData) => {
    setDataFim(novaData)
    if (compararDatas(dataInicio, novaData) > 0) {
      setDataInicio(novaData)
    }
  }

  const saldoPositivo = resumo.saldo >= 0

  const pieData = [
    { name: "Avulsas", value: proporcao.avulsas },
    { name: "Parceladas", value: proporcao.parceladas },
    { name: "Fixas", value: proporcao.custos_fixos || 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Filtros Superiores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker
            value={dataInicio}
            onChange={handleDataInicioChange}
            anos={anos}
          />

          <span className="text-gray-400 text-sm font-medium">até</span>

          <MonthPicker
            value={dataFim}
            onChange={handleDataFimChange}
            anos={anos}
          />

          <select
            value={filtroPessoa}
            onChange={e => setFiltroPessoa(e.target.value)}
            className="bg-surface border border-border text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-green min-w-[160px]"
          >
            <option value="todos">Todas as pessoas</option>
            {pessoas.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white py-10">Carregando dados...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard label="Saldo Líquido" value={resumo.saldo}
              cor={saldoPositivo ? "#00E676" : "#EF553B"}
              badge={saldoPositivo ? "↑ Positivo" : "↓ Negativo"} />
            <KpiCard label="Total Receitas" value={resumo.receitas} cor="#00E676" sub="Entradas registradas" />
            <KpiCard label="Total Despesas" value={resumo.despesas} cor="#EF553B" sub="Saídas registradas" />
          </div>

          {/* Tabelão de Consolidação Mensal */}
          {tabelaoData && tabelaoData.linhas.length > 0 && (
            <ChartCard title="Tabelão de Consolidação Mensal">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-[10px] md:text-xs whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="bg-surface2 text-muted uppercase tracking-wider border-b border-border text-center">
                      <th className="py-2 px-3 text-left font-semibold">Mês/Ano</th>
                      <th className="py-2 px-3 font-semibold">Receitas Totais</th>
                      <th className="py-2 px-3 font-semibold">Despesas Totais</th>
                      <th className="py-2 px-3 font-semibold">Saldo Geral</th>
                      {tabelaoData.pessoas.map(p => (
                        <Fragment key={p}>
                          <th className="py-2 px-3 font-semibold text-center border-l border-border/40">{`Gastos ${p}`}</th>
                          <th className="py-2 px-3 font-semibold text-center">{`Saldo ${p}`}</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-center">
                    {tabelaoData.linhas.map(row => (
                      <tr key={row.mes_ano} className="hover:bg-surface2/40 transition-colors">
                        <td className="py-2 px-3 text-left text-subtle font-medium">{row.mes_ano}</td>
                        <td className="py-2 px-3 text-green">{fmt(row.receitas_totais)}</td>
                        <td className="py-2 px-3 text-red">{fmt(row.despesas_totais)}</td>
                        <td className={`py-2 px-3 font-semibold ${row.saldo_geral >= 0 ? 'text-green' : 'text-red'}`}>
                          {fmt(row.saldo_geral)}
                        </td>
                        {tabelaoData.pessoas.map(p => {
                          const det = row.detalhes_pessoas[p] || { gastos: 0.0, saldo: 0.0 };
                          return (
                            <Fragment key={p}>
                              <td className="py-2 px-3 text-muted border-l border-border/30">{fmt(det.gastos)}</td>
                              <td className={`py-2 px-3 ${det.saldo >= 0 ? 'text-green' : 'text-red'}`}>
                                {fmt(det.saldo)}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-surface2 font-bold text-center border-t-2 border-border text-white">
                      <td className="py-2 px-3 text-left font-semibold">TOTAL ACUMULADO</td>
                      <td className="py-2 px-3 text-green">{fmt(tabelaoData.totais_acumulados.receitas_totais)}</td>
                      <td className="py-2 px-3 text-red">{fmt(tabelaoData.totais_acumulados.despesas_totais)}</td>
                      <td className={`py-2 px-3 ${tabelaoData.totais_acumulados.saldo_geral >= 0 ? 'text-green' : 'text-red'}`}>
                        {fmt(tabelaoData.totais_acumulados.saldo_geral)}
                      </td>
                      {tabelaoData.pessoas.map(p => {
                        const det = tabelaoData.totais_acumulados.detalhes_pessoas[p] || { gastos: 0.0, saldo: 0.0 };
                        return (
                          <Fragment key={p}>
                            <td className="py-2 px-3 text-muted border-l border-border/30">{fmt(det.gastos)}</td>
                            <td className={`py-2 px-3 ${det.saldo >= 0 ? 'text-green' : 'text-red'}`}>
                              {fmt(det.saldo)}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {/* Gráfico de Evolução */}
          {evolucao.length > 0 && (
            <ChartCard title="Evolução Financeira Mensal">
              <div className="w-full h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                    <XAxis dataKey="mes_ano" tick={{ fill: "#a3a8b4", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#a3a8b4", fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(v) => fmt(v)} 
                      contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }}
                      itemStyle={{ color: "#ffffff" }}
                      labelStyle={{ color: "#ffffff" }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Receitas" stroke="#00E676" strokeWidth={2} dot={{ r: 3, fill: "#00E676" }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Despesas" stroke="#EF553B" strokeWidth={2} dot={{ r: 3, fill: "#EF553B" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Gráficos Secundários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categorias.length > 0 && (
              <ChartCard title="Gastos por Categoria">
                <div className="w-full h-56 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorias} layout="horizontal" margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                      <XAxis type="category" dataKey="categoria" tick={{ fill: "#a3a8b4", fontSize: 10 }} />
                      <YAxis type="number" tick={{ fill: "#a3a8b4", fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(v) => fmt(v)} 
                        contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }}
                        itemStyle={{ color: "#ffffff" }}
                        labelStyle={{ color: "#ffffff" }}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {categorias.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETA_CORES[index % PALETA_CORES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {pieData.length > 0 && (
              <ChartCard title="Avulsas vs. Parceladas">
                <div className="w-full h-56 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={`pie-chart-${pieData.length}`}>
                      <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={85}
                        dataKey="value" 
                        nameKey="name" 
                        labelLine={false} 
                        style={{ fontSize: 11 }} 
                        label={({ x, y, name, percent }) => <text x={x} y={y} fill="#a3a8b4" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10 }}>{`${name} ${(percent * 100).toFixed(0)}%`}</text>}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETA_CORES[index % PALETA_CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(v) => fmt(v)} 
                        contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }}
                        itemStyle={{ color: "#ffffff" }}
                        labelStyle={{ color: "#ffffff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}
          </div>

          {/* Extrato de Despesas */}
          {extrato.length > 0 && (
            <ChartCard title="Extrato de Despesas">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs md:text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border text-muted text-[10px] md:text-xs uppercase tracking-wider">
                      {(dataInicio !== dataFim ? ["Mês/Ano", "Categoria", "Descrição", "Valor", "Quem Pagou"] : ["Categoria", "Descrição", "Valor", "Quem Pagou"])
                        .map(h => <th key={h} className="text-left py-2 px-2.5 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {extrato.map(row => (
                      <tr key={row.id} className="hover:bg-surface2 transition-colors">
                        {dataInicio !== dataFim && <td className="py-2 px-2.5 text-subtle font-mono text-[11px] md:text-xs">{row.mes_ano}</td>}
                        <td className="py-2 px-2.5">
                          <span className="bg-brand-brown/10 text-brand-brown px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium">
                            {row.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-muted max-w-[140px] truncate md:max-w-none">{row.descricao || "—"}</td>
                        <td className="py-2 px-2.5 font-mono text-red font-medium">{fmt(row.valor)}</td>
                        <td className="py-2 px-2.5 text-subtle text-[11px] md:text-xs">{row.quem_pagou}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, cor, badge, sub }) {
  return (
    <div className="bg-surface rounded-xl p-4 md:p-5 border-l-4" style={{ borderColor: cor }}>
      <p className="text-muted text-xs font-medium mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold font-mono mb-1.5 md:mb-2" style={{ color: cor }}>{fmt(value)}</p>
      {badge && <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded" style={{ background: `${cor}20`, color: cor }}>{badge}</span>}
      {sub && <p className="text-subtle text-[11px] md:text-xs mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface rounded-xl p-4 md:p-5 border border-border">
      <h3 className="text-xs md:text-sm font-semibold text-muted mb-4">{title}</h3>
      {children}
    </div>
  )
}

// Componente Customizado MonthPicker (Visual Estilo Windows / Fluent Dark)
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
    <div className="relative inline-block">
      {/* Botão de Controle Principal */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="bg-surface border border-border text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-green min-w-[130px] flex items-center justify-between gap-2 hover:bg-surface2 transition-all"
      >
        <span>{value ? `${mesNomeExibicao}/${anoSel}` : "Selecione"}</span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {/* Backdrop para fechar ao clicar fora */}
      {aberto && (
        <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
      )}

      {/* Painel do Calendário (Estilo Windows Calendar) */}
      {aberto && (
        <div className="absolute top-full left-0 mt-2 bg-surface2 border border-border rounded-xl p-3 w-[240px] shadow-2xl z-50 animate-fadeIn">
          {/* Cabeçalho do Ano */}
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

          {/* Grade de Meses 3x4 */}
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
                      ? "bg-brand-brown text-white font-bold"
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