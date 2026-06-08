// src/pages/Dashboard.jsx
import { useState, useEffect } from "react"
import api from "../api/client"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

const MESES = [
  ["01","Jan"],["02","Fev"],["03","Mar"],["04","Abr"],
  ["05","Mai"],["06","Jun"],["07","Jul"],["08","Ago"],
  ["09","Set"],["10","Out"],["11","Nov"],["12","Dez"],
]

// Paleta de cores moderna e viva para diferenciar as colunas de categorias
const PALETA_CORES = [
  "#36A2EB", "#FF6384", "#FF9F40", "#4BC0C0", "#9966FF", 
  "#FFCD56", "#C9CBCCF", "#FF5733", "#33FF57", "#3357FF"
]

export default function Dashboard() {
  const [anos, setAnos] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [filtroAno, setFiltroAno] = useState("")
  const [filtroMes, setFiltroMes] = useState("todos")
  const [filtroPessoa, setFiltroPessoa] = useState("todos")
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 })
  const [evolucao, setEvolucao] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proporcao, setProporcao] = useState({ avulsas: 0, parceladas: 0 })
  const [extrato, setExtrato] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/anos-disponiveis"),
      api.get("/pessoas"),
    ]).then(([a, p]) => {
      setAnos(a.data)
      setPessoas(p.data)
      setFiltroAno(a.data[0] || new Date().getFullYear().toString())
    })
  }, [])

  useEffect(() => {
    if (!filtroAno) return
    setLoading(true)
    const params = { filtro_ano: filtroAno, filtro_mes: filtroMes, filtro_pessoa: filtroPessoa }
    Promise.all([
      api.get("/dashboard/resumo", { params }),
      api.get("/dashboard/evolucao-mensal", { params: { filtro_ano: filtroAno } }),
      api.get("/dashboard/por-categoria", { params }),
      api.get("/dashboard/avulsas-vs-parceladas", { params }),
      api.get("/dashboard/extrato", { params }),
    ]).then(([r, e, c, p, ex]) => {
      setResumo(r.data)
      const mapa = {}
      e.data.receitas.forEach(x => { mapa[x.mes_ano] = { ...mapa[x.mes_ano], mes_ano: x.mes_ano, Receitas: x.total } })
      e.data.despesas.forEach(x => { mapa[x.mes_ano] = { ...mapa[x.mes_ano], mes_ano: x.mes_ano, Despesas: x.total } })
      setEvolucao(Object.values(mapa).sort((a, b) => a.mes_ano.localeCompare(b.mes_ano)))
      setCategorias(c.data)
      setProporcao(p.data)
      setExtrato(ex.data)
    }).finally(() => setLoading(false))
  }, [filtroAno, filtroMes, filtroPessoa])

  const saldoPositivo = resumo.saldo >= 0
  const mesesDisponiveis = [...new Set([
    ...evolucao.map(e => e.mes_ano?.split("/")[0])
  ])].filter(Boolean)

  const pieData = [
    { name: "Avulsas", value: proporcao.avulsas },
    { name: "Parceladas", value: proporcao.parceladas },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Topo Responsivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
            className="bg-surface border border-border text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-green flex-1 md:flex-none">
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>

          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="bg-surface border border-border text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-green flex-1 md:flex-none">
            <option value="todos">Ano Inteiro</option>
            {MESES.filter(([cod]) => mesesDisponiveis.includes(cod)).map(([cod, nome]) => (
              <option key={cod} value={cod}>{nome}</option>
            ))}
          </select>

          <select value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)}
            className="bg-surface border border-border text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-green flex-1 md:flex-none">
            <option value="todos">Todos</option>
            {pessoas.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs Responsivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Saldo Líquido" value={resumo.saldo}
          cor={saldoPositivo ? "#00E676" : "#EF553B"}
          badge={saldoPositivo ? "↑ Positivo" : "↓ Negativo"} />
        <KpiCard label="Total Receitas" value={resumo.receitas} cor="#00E676" sub="Entradas registradas" />
        <KpiCard label="Total Despesas" value={resumo.despesas} cor="#EF553B" sub="Saídas registradas" />
      </div>

      {/* TÓPICO 1 - Gráfico evolução mensal (Cores explícitas e forçadas nas linhas) */}
      {filtroMes === "todos" && evolucao.length > 0 && (
        <ChartCard title="Evolução Financeira Mensal">
          <div className="w-full h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="mes_ano" tick={{ fill: "#a3a8b4", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a3a8b4", fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }} />
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
        
        {/* TÓPICO 2 - Gastos por categoria (Barras Verticais e Coloridas individualmente) */}
        {categorias.length > 0 && (
          <ChartCard title="Gastos por Categoria">
            <div className="w-full h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorias} layout="horizontal" margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                  <XAxis type="category" dataKey="categoria" tick={{ fill: "#a3a8b4", fontSize: 10 }} />
                  <YAxis type="number" tick={{ fill: "#a3a8b4", fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {/* Injeta dinamicamente uma cor da paleta para cada coluna de categoria */}
                    {categorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETA_CORES[index % PALETA_CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

       {/* Avulsas vs Parceladas */}
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
            // Removemos o fill daqui de dentro para não pintar a pizza inteira de cinza
            style={{ fontSize: 11 }} 
            // Injetamos a cor diretamente na renderização da label de texto
            label={({ name, percent }) => (
              <text fill="#a3a8b4" textAnchor="middle" dominantBaseline="central">
                {`${name} ${(percent * 100).toFixed(0)}%`}
              </text>
            )}
          >
            {/* Suas cores personalizadas agora vão fixar sem interferência externa */}
            <Cell fill="#ef9a07" />
            <Cell fill="#0512c8" />
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#161922", border: "1px solid #2a2d3e", borderRadius: 8 }} />
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
                  {(filtroMes === "todos" ? ["Mês/Ano", "Categoria", "Descrição", "Valor", "Quem Pagou"] : ["Categoria", "Descrição", "Valor", "Quem Pagou"])
                    .map(h => <th key={h} className="text-left py-2 px-2.5 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {extrato.map(row => (
                  <tr key={row.id} className="hover:bg-surface2 transition-colors">
                    {filtroMes === "todos" && <td className="py-2 px-2.5 text-subtle font-mono text-[11px] md:text-xs">{row.mes_ano}</td>}
                    <td className="py-2 px-2.5">
                      <span className="bg-green/10 text-green px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium">
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