import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, Package, AlertTriangle, TrendingUp, Calendar, Bell, Clock, ScanFace } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

import { API } from '@/config/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: getAuthHeader() }),
        axios.get(`${API}/stock/alerts`, { headers: getAuthHeader() })
      ]);
      
      setStats({
        ...statsRes.data,
        alerts: alertsRes.data
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navegação dos cards clicáveis
  const handleCardClick = (type) => {
    switch(type) {
      case 'colaboradores':
        navigate('/colaboradores');
        break;
      case 'epis':
        navigate('/epis');
        break;
      case 'estoque_baixo':
        navigate('/epis?filter=low_stock');
        break;
      case 'entregas':
        navigate('/historico-entregas?filter=last30days');
        break;
      case 'validade':
        navigate('/epis?filter=expiring');
        break;
      case 'alertas':
        navigate('/alertas');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="dashboard">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-600 mt-1">Visão geral do sistema Cipolatti</p>
        </div>

        {/* Cards Clicáveis - BI Interativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => handleCardClick('colaboradores')}
            className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all"
            data-testid="card-colaboradores"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.active_employees || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Colaboradores Ativos</p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick('epis')}
            className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
            data-testid="card-epis"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.total_epis || 0}</p>
              <p className="text-sm text-slate-600 mt-1">EPIs Cadastrados</p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick('estoque_baixo')}
            className={`border rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-all ${
              stats?.low_stock_count > 0 
                ? 'bg-orange-50 border-orange-200 hover:border-orange-400' 
                : 'bg-white border-slate-200 hover:border-orange-300'
            }`}
            data-testid="card-estoque-baixo"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                stats?.low_stock_count > 0 ? 'bg-orange-200' : 'bg-orange-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${stats?.low_stock_count > 0 ? 'text-orange-700' : 'text-orange-600'}`} />
              </div>
            </div>
            <div>
              <p className={`text-3xl font-bold font-mono ${
                stats?.low_stock_count > 0 ? 'text-orange-700' : 'text-slate-900'
              }`}>{stats?.low_stock_count || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Estoque Baixo</p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick('entregas')}
            className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
            data-testid="card-entregas"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.recent_deliveries || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Entregas (30 dias)</p>
            </div>
          </div>
        </div>

        {/* Card de EPIs com Validade Próxima */}
        {stats?.expiring_epis > 0 && (
          <div 
            onClick={() => handleCardClick('validade')}
            className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-red-400 transition-all"
            data-testid="card-validade"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700 font-mono">{stats?.expiring_epis || 0}</p>
                <p className="text-sm text-red-600">EPIs com Validade Próxima (30 dias)</p>
              </div>
            </div>
          </div>
        )}

        {/* NOVO: Card de Alertas de EPI Obrigatório e Periodicidade */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-blue-600" />
                Dashboard biometrico
              </h2>
              <p className="text-sm text-slate-500 mt-1">Cobertura dos templates faciais dos colaboradores ativos</p>
            </div>
            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {stats?.biometric_coverage_percent || 0}% cobertura
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{stats?.biometric_total_employees || 0}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase text-emerald-700">Com biometria</p>
              <p className="text-2xl font-bold text-emerald-700 font-mono">{stats?.biometric_registered || 0}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium uppercase text-red-700">Sem biometria</p>
              <p className="text-2xl font-bold text-red-700 font-mono">{stats?.biometric_missing || 0}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase text-amber-700">Incompleta</p>
              <p className="text-2xl font-bold text-amber-700 font-mono">{stats?.biometric_incomplete || 0}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase text-blue-700">Cobertura</p>
              <p className="text-2xl font-bold text-blue-700 font-mono">{stats?.biometric_coverage_percent || 0}%</p>
            </div>
          </div>
        </div>

        {(stats?.total_alerts > 0) && (
          <div 
            onClick={() => handleCardClick('alertas')}
            className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-orange-400 transition-all"
            data-testid="card-alertas"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-200 rounded-full flex items-center justify-center animate-pulse">
                  <Bell className="w-7 h-7 text-orange-700" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-700 font-mono">{stats?.total_alerts || 0}</p>
                  <p className="text-sm text-orange-600 font-medium">Alertas Pendentes</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                {stats?.pending_epi_alerts > 0 && (
                  <div className="text-center px-4 py-2 bg-white/60 rounded-lg">
                    <Package className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <p className="font-bold text-orange-700">{stats.pending_epi_alerts}</p>
                    <p className="text-xs text-orange-600">EPIs Pendentes</p>
                  </div>
                )}
                {stats?.replacement_due_alerts > 0 && (
                  <div className="text-center px-4 py-2 bg-white/60 rounded-lg">
                    <Clock className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="font-bold text-red-700">{stats.replacement_due_alerts}</p>
                    <p className="text-xs text-red-600">Trocas Vencidas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Licença removida do Dashboard - disponível apenas em Configurações */}

        {/* Alertas Detalhados */}
        {stats?.alerts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.alerts.low_stock?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Alertas de Estoque Baixo
                </h3>
                <div className="space-y-3">
                  {stats.alerts.low_stock.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Mínimo: {item.min_stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-orange-600">{item.current_stock}</p>
                        <p className="text-xs text-slate-500">em estoque</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.alerts.expiring_soon?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  EPIs com Validade Próxima
                </h3>
                <div className="space-y-3">
                  {stats.alerts.expiring_soon.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        {new Date(item.validity_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
