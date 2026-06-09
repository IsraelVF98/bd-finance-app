// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Login from "./pages/Login"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Lancamentos from "./pages/Lancamentos"
import Parcelamentos from "./pages/Parcelamentos"
import Categorias from "./pages/Categorias"
import Pessoas from "./pages/Pessoas"
import Investimentos from "./pages/Investimentos" // UPGRADE: Importando a nova página de Investimentos

function PrivateRoute({ children }) {
  const { logado } = useAuth()
  return logado ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="parcelamentos" element={<Parcelamentos />} />
            
            {/* UPGRADE: Registrando a rota de Investimentos dentro do Layout privado */}
            <Route path="investimentos" element={<Investimentos />} />
            
            <Route path="categorias" element={<Categorias />} />
            <Route path="pessoas" element={<Pessoas />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}