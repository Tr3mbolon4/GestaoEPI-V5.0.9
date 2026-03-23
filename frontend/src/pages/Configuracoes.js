import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Settings, Calendar, Plus, AlertTriangle, Shield, Clock } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Configuracoes() {
  const { user } = useAuth();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addDays, setAddDays] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLicense();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchLicense = async () => {
    try {
      const response = await axios.get(`${API}/license`, { headers: getAuthHeader() });
      setLicense(response.data);
    } catch (error) {
      console.error('Erro ao carregar licença:', error);
      toast.error('Erro ao carregar informações da licença');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDays = async (e) => {
    e.preventDefault();
    if (!addDays || parseInt(addDays) <= 0) {
      toast.error('Informe uma quantidade válida de dias');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/license/add-days`,
        { days: parseInt(addDays), reason },
        { headers: getAuthHeader() }
      );
      toast.success(`${addDays} dias adicionados com sucesso!`);
      setAddDays('');
      setReason('');
      fetchLicense();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar dias');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">Apenas administradores podem acessar as configurações.</p>
        </div>
      </DashboardLayout>
    );
  }

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
      <div className="space-y-6" data-testid="configuracoes-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-600 mt-1">Configurações do sistema e licença do painel</p>
        </div>

        {/* Contador de Dias de Funcionamento */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Contador de Dias de Funcionamento
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Gerencie a licença de funcionamento do painel
            </p>
          </div>

          <div className="p-6">
            {license ? (
              <div className="space-y-6">
                {/* Status da Licença */}
                <div className={`p-6 rounded-lg ${
                  license.days_remaining <= 0 
                    ? 'bg-red-50 border-2 border-red-200' 
                    : license.days_remaining <= 7 
                    ? 'bg-amber-50 border-2 border-amber-200'
                    : 'bg-emerald-50 border-2 border-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Dias Restantes</p>
                      <p className={`text-5xl font-bold font-mono ${
                        license.days_remaining <= 0 
                          ? 'text-red-600' 
                          : license.days_remaining <= 7 
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {license.days_remaining}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 mb-1">Expira em</p>
                      <p className="text-lg font-medium text-slate-900">
                        {new Date(license.expires_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {license.days_remaining <= 0 && (
                    <div className="mt-4 p-3 bg-red-100 rounded-md flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Licença Expirada</p>
                        <p className="text-sm text-red-700">
                          O painel está bloqueado para todos os usuários exceto administradores. 
                          Adicione dias para reativar o acesso.
                        </p>
                      </div>
                    </div>
                  )}

                  {license.days_remaining > 0 && license.days_remaining <= 7 && (
                    <div className="mt-4 p-3 bg-amber-100 rounded-md flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Atenção: Licença expirando</p>
                        <p className="text-sm text-amber-700">
                          Adicione mais dias para evitar o bloqueio do sistema.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulário para Adicionar Dias */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    Adicionar Dias à Licença
                  </h3>
                  <form onSubmit={handleAddDays} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Quantidade de Dias *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={addDays}
                          onChange={(e) => setAddDays(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          placeholder="Ex: 30, 60, 90"
                          required
                          data-testid="add-days-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Motivo (opcional)
                        </label>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          placeholder="Ex: Renovação mensal"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="bg-emerald-500 hover:bg-emerald-600"
                      data-testid="add-days-button"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {submitting ? 'Adicionando...' : 'Adicionar Dias'}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Não foi possível carregar informações da licença</p>
              </div>
            )}
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-slate-600" />
            Informações do Sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Versão</p>
              <p className="font-medium text-slate-900">1.0.0</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Usuário Logado</p>
              <p className="font-medium text-slate-900">{user?.username}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Perfil</p>
              <p className="font-medium text-slate-900">Administrador</p>
            </div>
          </div>
        </div>

        {/* Aviso sobre Bloqueio */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Regras de Bloqueio</p>
              <p className="mt-1">
                Quando o contador de dias chegar a zero, o sistema será bloqueado automaticamente 
                para todos os usuários. Apenas o Administrador poderá acessar o painel para 
                reativar a licença. Os demais usuários verão a mensagem: "Preciso ativar o Painel".
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
