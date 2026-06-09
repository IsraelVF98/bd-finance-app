// src/components/Layout.jsx
import logo from "../assets/logo.png"
import { useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { 
  LayoutDashboard, ArrowLeftRight, CreditCard, Tag, Users, LogOut, Menu, X, 
  PiggyBank 
} from "lucide-react"

const menu = [
  { to: "/dashboard",    label: "Dashboard",           icon: LayoutDashboard },
  { to: "/lancamentos",  label: "Receitas/Despesas",   icon: ArrowLeftRight },
  { to: "/parcelamentos",label: "Parcelamentos",       icon: CreditCard },
  { to: "/investimentos",label: "Investimentos",       icon: PiggyBank }, 
  { to: "/categorias",   label: "Categorias",          icon: Tag },
  { to: "/pessoas",      label: "Pessoas",             icon: Users },
]

export default function Layout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  
  // Estado para controlar a abertura da sidebar no mobile
  const [sidebarAberta, setSidebarAberta] = useState(false)

  const handleLogout = () => { logout(); navigate("/login") }

  return (
    <div className="flex h-screen w-screen bg-bg overflow-hidden relative text-white">
      
      {/* OVERLAY ESCURO (Mobile) - Clica fora para fechar o menu */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar Responsiva */}
      <aside className={`
        fixed inset-y-0 left-0 w-60 bg-surface border-r border-border flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${sidebarAberta ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* UPGRADE: Topo da Sidebar centralizado verticalmente e com cores de alto contraste */}
        <div className="p-5 border-b border-border flex flex-col items-center justify-center text-center relative w-full gap-0">
          {/* Logo destacada */}
          <img src={logo} alt="B&D Finance Logo" className="w-15 h-15 object-contain" />
          
          {/* Nome da marca colorizado de forma nítida */}
          <div className="text-lg font-bold tracking-tight">
          </div>

          {/* Botão fechar absoluto no mobile (evita desalinhamento horizontal) */}
          <button 
            onClick={() => setSidebarAberta(false)}
            className="absolute top-2 right-4 p-1 rounded-lg hover:bg-surface2 text-muted hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 p-3 space-y-0">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink 
              key={to} 
              to={to}
              onClick={() => setSidebarAberta(false)} // Fecha a barra ao clicar em um link (Mobile)
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-green/10 text-green font-bold"
                    : "text-muted hover:text-white hover:bg-surface2"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé da Sidebar (Dados do usuário e sair) */}
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-subtle mb-0">
            Logado como <span className="text-white font-medium">{username}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:text-red hover:bg-red/10 transition-all">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal + Topbar Mobile */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* TOPBAR (Só aparece no Mobile) */}
        <header className="flex items-center justify-between px-5 py-4 bg-surface border-b border-border md:hidden w-full z-30">
          <button 
            onClick={() => setSidebarAberta(true)}
            className="p-1 rounded-lg hover:bg-surface2 text-muted hover:text-white"
          >
            <Menu size={24} />
          </button>
          
          {/* UPGRADE: Topbar mobile alinhada com as cores e logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="B&D Finance Logo" className="w-6 h-6 object-contain" />
            <div className="text-base font-bold tracking-tight">
              <span className="text-green">B&D</span>
              <span className="text-white"> Finance</span>
            </div>
          </div>
          
          <div className="w-8" /> {/* Div vazia apenas para equilibrar o flexbox e centralizar o logo */}
        </header>

        {/* Área da página ativa (Dashboard, Lançamentos, etc) */}
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 z-0">
          <Outlet />
        </main>
      </div>

    </div>
  )
}