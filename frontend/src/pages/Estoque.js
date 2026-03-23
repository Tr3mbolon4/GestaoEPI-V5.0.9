import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertTriangle, Package, Search, Eye } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Estoque() {
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [] });
  const [epis, setEpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEPI, setSelectedEPI] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, episRes] = await Promise.all([
        axios.get(`${API}/stock/alerts`, { headers: getAuthHeader() }),
        axios.get(`${API}/epis`, { headers: getAuthHeader() })
      ]);
      setAlerts(alertsRes.data);
      setEpis(episRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (epi) => {
    setSelectedEPI(epi);
    setShowDetailDialog(true);
  };

  const filteredEPIs = epis.filter(epi =>
    epi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    epi.ca_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (epi.internal_code && epi.internal_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="space-y-6" data-testid="estoque-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estoque</h1>
          <p className="text-slate-600 mt-1">Monitore os níveis de estoque e alertas</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Estoque Baixo</h2>
                <p className="text-sm text-slate-600">{alerts.low_stock.length} itens</p>
              </div>
            </div>
            
            {alerts.low_stock.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum item com estoque baixo</p>
            ) : (
              <div className="space-y-3">
                {alerts.low_stock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-md border border-orange-200">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">Mínimo: {item.min_stock}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-orange-600">{item.current_stock}</p>
                      <p className="text-xs text-slate-500">em estoque</p>
                    </div>
                  </div>
                ))}\n              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Validade Próxima</h2>
                <p className="text-sm text-slate-600">{alerts.expiring_soon.length} itens</p>
              </div>
            </div>
            
            {alerts.expiring_soon.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum item próximo do vencimento</p>
            ) : (
              <div className="space-y-3">
                {alerts.expiring_soon.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-red-600" />
                      <p className="font-medium text-slate-900">{item.name}</p>
                    </div>
                    <p className="text-sm font-medium text-red-600">
                      {new Date(item.validity_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar item por nome, CA ou código interno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estoque Atual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mínimo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEPIs.map((epi) => (
                  <tr key={epi.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{epi.name}</p>
                        <p className="text-sm text-slate-500">{epi.brand || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{epi.ca_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{epi.type_category}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-900">{epi.current_stock}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{epi.min_stock}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        epi.current_stock > epi.min_stock
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {epi.current_stock > epi.min_stock ? 'OK' : 'Baixo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewDetails(epi)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Item</DialogTitle>
            </DialogHeader>
            {selectedEPI && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Nome</p>
                    <p className="font-medium text-slate-900">{selectedEPI.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">CA</p>
                    <p className="font-medium font-mono text-slate-900">{selectedEPI.ca_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Categoria</p>
                    <p className="font-medium text-slate-900">{selectedEPI.type_category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Marca/Modelo</p>
                    <p className="font-medium text-slate-900">{selectedEPI.brand} {selectedEPI.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Cor</p>
                    <p className="font-medium text-slate-900">{selectedEPI.color || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Tamanho</p>
                    <p className="font-medium text-slate-900">{selectedEPI.size || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Estoque Atual</p>
                    <p className="font-medium font-mono text-slate-900">{selectedEPI.current_stock}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Estoque Mínimo</p>
                    <p className="font-medium font-mono text-slate-900">{selectedEPI.min_stock}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Lote</p>
                    <p className="font-medium text-slate-900">{selectedEPI.batch || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Local</p>
                    <p className="font-medium text-slate-900">{selectedEPI.storage_location || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Data de Compra</p>
                    <p className="font-medium text-slate-900">
                      {selectedEPI.purchase_date ? new Date(selectedEPI.purchase_date).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Validade</p>
                    <p className="font-medium text-slate-900">
                      {selectedEPI.validity_date ? new Date(selectedEPI.validity_date).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
