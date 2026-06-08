// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { LayoutDashboard, ArrowLeftRight, CreditCard, Tag, Users, LogOut } from "lucide-react"

const menu = [
  { to: "/dashboard",    label: "Dashboard",           icon: LayoutDashboard },
  { to: "/lancamentos",  label: "Receitas/Despesas",   icon: ArrowLeftRight },
  { to: "/parcelamentos",label: "Parcelamentos",       icon: CreditCard },
  { to: "/categorias",   label: "Categorias",          icon: Tag },
  { to: "/pessoas",      label: "Pessoas",             icon: Users },
]

export default function Layout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate("/login") }

  return (
    <div className="flex h-screen w-screen bg-bg overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col z-10">
        <div className="p-5 border-b border-border">
          <span className="text-green font-bold text-xl tracking-tight">B&D Finance</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-green/10 text-green"
                    : "text-muted hover:text-white hover:bg-surface2"
                }`
              }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-subtle mb-2">
            Logado como <span className="text-white font-medium">{username}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:text-red hover:bg-red/10 transition-all">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal Corrigido */}
      <main className="flex-1 h-full overflow-y-auto p-6 min-w-0 relative z-0">
        <Outlet />
      </main>
    </div>
  )
}