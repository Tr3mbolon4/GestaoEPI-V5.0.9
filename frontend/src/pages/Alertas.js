import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertTriangle, Bell, Clock, Package, User, RefreshCw, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Alertas() {
  const [alerts, setAlerts] = useState({ pending_epis: [], replacement_due: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/alerts/all`, { headers: getAuthHeader() });
      setAlerts(response.data);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const goToEmployee = (employeeId) => {
    navigate(`/colaboradores/${employeeId}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="alertas-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-orange-500" />
              Central de Alertas
            </h1>
            <p className="text-slate-600 mt-1">
              {alerts.total_alerts || 0} alerta(s) pendente(s)
            </p>
          </div>
          <Button onClick={fetchAlerts} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Resumo de Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
              activeTab === 'pending' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-slate-200 bg-white hover:border-orange-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Package className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{alerts.total_pending_epis || 0}</p>
                <p className="text-slate-600">EPIs Obrigatórios Pendentes</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('replacement')}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
              activeTab === 'replacement' 
                ? 'border-red-500 bg-red-50' 
                : 'border-slate-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{alerts.total_replacement_due || 0}</p>
                <p className="text-slate-600">Trocas Periódicas Vencidas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Alertas */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              EPIs Pendentes ({alerts.total_pending_epis || 0})
            </button>
            <button
              onClick={() => setActiveTab('replacement')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'replacement'
                  ? 'text-red-600 border-b-2 border-red-500 bg-red-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Trocas Vencidas ({alerts.total_replacement_due || 0})
            </button>
          </div>

          {/* Conteúdo */}
          <div className="divide-y divide-slate-200">
            {activeTab === 'pending' && (
              <>
                {alerts.pending_epis?.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum alerta pendente</h3>
                    <p className="text-slate-600">Todos os colaboradores possuem os EPIs obrigatórios do kit</p>
                  </div>
                ) : (
                  alerts.pending_epis?.map((alert, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-slate-900">{alert.employee_name}</h4>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                              {alert.department || 'Sem setor'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Kit: <span className="font-medium">{alert.kit_name}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {alert.missing_epis?.map((epi, epiIdx) => (
                              <span 
                                key={epiIdx}
                                className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                              >
                                {epi.name} {epi.ca_number && `(CA: ${epi.ca_number})`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => goToEmployee(alert.employee_id)}
                          className="flex-shrink-0"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'replacement' && (
              <>
                {alerts.replacement_due?.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma troca vencida</h3>
                    <p className="text-slate-600">Todas as trocas periódicas estão em dia</p>
                  </div>
                ) : (
                  alerts.replacement_due?.map((alert, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-slate-900">{alert.employee_name}</h4>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                              {alert.days_overdue} dias de atraso
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            EPI: <span className="font-medium">{alert.epi_name}</span>
                            {alert.ca_number && <span className="text-slate-500"> (CA: {alert.ca_number})</span>}
                            {alert.nbr_number && <span className="text-slate-500"> (NBR: {alert.nbr_number})</span>}
                          </p>
                          <div className="mt-2 text-xs text-slate-500">
                            <span>Última entrega: {new Date(alert.last_delivery_date).toLocaleDateString('pt-BR')}</span>
                            <span className="mx-2">|</span>
                            <span>Vencimento: {new Date(alert.replacement_due_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => goToEmployee(alert.employee_id)}
                          className="flex-shrink-0"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
