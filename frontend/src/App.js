import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import ChangePassword from '@/pages/ChangePassword';
import Dashboard from '@/pages/Dashboard';
import EntregaEPI from '@/pages/EntregaEPI';
import Colaboradores from '@/pages/Colaboradores';
import Empresas from '@/pages/Empresas';
import EPIs from '@/pages/EPIs';
import Kits from '@/pages/Kits';
import Usuarios from '@/pages/Usuarios';
import Configuracoes from '@/pages/Configuracoes';
import Fornecedores from '@/pages/Fornecedores';
import ColaboradorDetalhes from '@/pages/ColaboradorDetalhes';
import HistoricoEntregas from '@/pages/HistoricoEntregas';
import Alertas from '@/pages/Alertas';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/entrega-epi" element={<PrivateRoute><EntregaEPI /></PrivateRoute>} />
      <Route path="/historico-entregas" element={<PrivateRoute><HistoricoEntregas /></PrivateRoute>} />
      <Route path="/colaboradores" element={<PrivateRoute><Colaboradores /></PrivateRoute>} />
      <Route path="/colaboradores/:id" element={<PrivateRoute><ColaboradorDetalhes /></PrivateRoute>} />
      <Route path="/empresas" element={<PrivateRoute><Empresas /></PrivateRoute>} />
      <Route path="/epis" element={<PrivateRoute><EPIs /></PrivateRoute>} />
      <Route path="/kits" element={<PrivateRoute><Kits /></PrivateRoute>} />
      <Route path="/fornecedores" element={<PrivateRoute><Fornecedores /></PrivateRoute>} />
      <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
      <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
      <Route path="/alertas" element={<PrivateRoute><Alertas /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
