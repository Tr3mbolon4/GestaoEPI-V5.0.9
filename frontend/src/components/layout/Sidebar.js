import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Building2, 
  HardHat, 
  Box, 
  UserCog, 
  Settings,
  LogOut,
  Truck,
  X,
  History,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Perfis: admin, gestor, rh, seguranca_trabalho, almoxarifado
  const menuItems = [
    { 
      path: '/dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      roles: ['admin', 'gestor', 'rh', 'seguranca_trabalho', 'almoxarifado'] 
    },
    { 
      path: '/alertas', 
      icon: Bell, 
      label: 'Alertas', 
      roles: ['admin', 'gestor', 'rh', 'seguranca_trabalho', 'almoxarifado'],
      highlight: true
    },
    { 
      path: '/entrega-epi', 
      icon: HardHat, 
      label: 'Entrega de EPI', 
      roles: ['admin', 'gestor', 'almoxarifado'] 
    },
    { 
      path: '/historico-entregas', 
      icon: History, 
      label: 'Histórico Entregas', 
      roles: ['admin', 'gestor', 'seguranca_trabalho', 'almoxarifado'] 
    },
    { 
      path: '/colaboradores', 
      icon: Users, 
      label: 'Colaboradores', 
      roles: ['admin', 'gestor', 'rh', 'seguranca_trabalho', 'almoxarifado'] 
    },
    { 
      path: '/empresas', 
      icon: Building2, 
      label: 'Empresas', 
      roles: ['admin', 'gestor', 'rh'] 
    },
    { 
      path: '/epis', 
      icon: Package, 
      label: 'Cadastro EPI', 
      roles: ['admin', 'gestor', 'seguranca_trabalho'] 
    },
    { 
      path: '/fornecedores', 
      icon: Truck, 
      label: 'Fornecedores', 
      roles: ['admin', 'gestor', 'seguranca_trabalho'] 
    },
    { 
      path: '/kits', 
      icon: Box, 
      label: 'Kits', 
      roles: ['admin', 'gestor', 'seguranca_trabalho'] 
    },
    { 
      path: '/usuarios', 
      icon: UserCog, 
      label: 'Usuários', 
      roles: ['admin', 'rh'] 
    },
    { 
      path: '/configuracoes', 
      icon: Settings, 
      label: 'Configurações', 
      roles: ['admin'] 
    },
  ];

  const filteredMenu = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  const getProfileLabel = (role) => {
    const labels = {
      'admin': 'Administrador',
      'gestor': 'Gestor',
      'rh': 'RH',
      'seguranca_trabalho': 'Seg. Trabalho',
      'almoxarifado': 'Almoxarifado'
    };
    return labels[role] || role;
  };

  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
              <img 
                src={`${process.env.PUBLIC_URL}/icone-cipolatti.png`}
                alt="Cipolatti" 
                className="w-9 h-9 object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', e);
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="text-emerald-600 font-bold text-lg">C</span>';
                }}
              />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">Cipolatti</h1>
              <p className="text-slate-400 text-xs">Gestão de EPI</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              data-testid={`nav-${item.path.replace('/', '')}`}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-emerald-600 text-white' 
                  : item.highlight 
                    ? 'text-orange-300 hover:bg-orange-500/20 hover:text-orange-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${item.highlight && !isActive ? 'text-orange-400' : ''}`} />
              {item.label}
              {item.highlight && !isActive && (
                <span className="ml-auto w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-3 py-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-emerald-400 text-xs truncate">{getProfileLabel(user?.role)}</p>
          </div>
        </div>
        <button
          onClick={logout}
          data-testid="logout-button"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );
};
