import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Box, Edit2, Printer, Trash2, Package, X, Eye } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Kits() {
  const [kits, setKits] = useState([]);
  const [epis, setEpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [editingKit, setEditingKit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sector: '',
    is_mandatory: true,
    items: []
  });
  const [selectedEPI, setSelectedEPI] = useState('');
  const [epiQuantity, setEpiQuantity] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitsRes, episRes] = await Promise.all([
        axios.get(`${API}/kits`, { headers: getAuthHeader() }),
        axios.get(`${API}/epis`, { headers: getAuthHeader() })
      ]);
      setKits(kitsRes.data);
      setEpis(episRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addEPIToKit = () => {
    if (!selectedEPI) {
      toast.error('Selecione um EPI');
      return;
    }
    const epi = epis.find(e => e.id === selectedEPI);
    if (epi) {
      if (formData.items.find(i => i.epi_id === epi.id)) {
        toast.error('Este EPI já foi adicionado ao kit');
        return;
      }
      setFormData({
        ...formData,
        items: [...formData.items, { 
          epi_id: epi.id, 
          name: epi.name, 
          quantity: epiQuantity,
          ca_number: epi.ca_number,
          type_category: epi.type_category
        }]
      });
      setSelectedEPI('');
      setEpiQuantity(1);
      toast.success(`${epi.name} adicionado ao kit`);
    }
  };

  const removeItem = (index) => {
    const item = formData.items[index];
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
    toast.success(`${item.name} removido do kit`);
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = newQuantity;
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sector) {
      toast.error('Informe o setor do kit');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um EPI ao kit');
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        sector: formData.sector,
        is_mandatory: formData.is_mandatory,
        items: formData.items.map(item => ({
          epi_id: item.epi_id,
          quantity: item.quantity
        }))
      };

      if (editingKit) {
        await axios.patch(`${API}/kits/${editingKit.id}`, payload, { headers: getAuthHeader() });
        toast.success('Kit atualizado com sucesso!');
      } else {
        await axios.post(`${API}/kits`, payload, { headers: getAuthHeader() });
        toast.success('Kit criado com sucesso!');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar kit');
    }
  };

  const handleEdit = (kit) => {
    setEditingKit(kit);
    // Enriquecer itens com dados dos EPIs (para kits antigos que podem não ter os detalhes)
    const enrichedItems = (kit.items || []).map(item => {
      // Se o item já tem nome, usar os dados existentes
      if (item.name) {
        return item;
      }
      // Se não tem nome, buscar do EPI correspondente
      const epi = epis.find(e => e.id === item.epi_id);
      if (epi) {
        return {
          ...item,
          name: epi.name,
          ca_number: epi.ca_number,
          nbr_number: epi.nbr_number,
          type_category: epi.type_category
        };
      }
      return item;
    });
    
    setFormData({
      name: kit.name || '',
      description: kit.description || '',
      sector: kit.sector || '',
      is_mandatory: kit.is_mandatory !== false,
      items: enrichedItems
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este kit?')) return;
    try {
      await axios.delete(`${API}/kits/${id}`, { headers: getAuthHeader() });
      toast.success('Kit excluído');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir');
    }
  };

  const handlePrint = (kit) => {
    // Enriquecer itens com dados dos EPIs para impressão
    const enrichedItems = (kit.items || []).map(item => {
      if (item.name) {
        return item;
      }
      const epi = epis.find(e => e.id === item.epi_id);
      if (epi) {
        return {
          ...item,
          name: epi.name,
          ca_number: epi.ca_number
        };
      }
      return { ...item, name: 'EPI não encontrado' };
    });
    
    const itemsList = enrichedItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name || 'Item sem nome'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.ca_number || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      </tr>
    `).join('') || '<tr><td colspan="3">Nenhum item</td></tr>';

    const printContent = `
      <html>
        <head>
          <title>Kit - ${kit.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
            .info { margin: 10px 0; color: #666; }
          </style>
        </head>
        <body>
          <h1>Kit: ${kit.name}</h1>
          <p class="info"><strong>Setor:</strong> ${kit.sector || 'Não especificado'}</p>
          <p class="info"><strong>Descrição:</strong> ${kit.description || '-'}</p>
          <table>
            <thead>
              <tr>
                <th>EPI</th>
                <th>CA</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const openKitDetails = (kit) => {
    // Enriquecer itens com dados dos EPIs para visualização
    const enrichedItems = (kit.items || []).map(item => {
      if (item.name) {
        return item;
      }
      const epi = epis.find(e => e.id === item.epi_id);
      if (epi) {
        return {
          ...item,
          name: epi.name,
          ca_number: epi.ca_number,
          type_category: epi.type_category
        };
      }
      return { ...item, name: 'EPI não encontrado' };
    });
    
    setSelectedKit({ ...kit, items: enrichedItems });
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', sector: '', is_mandatory: true, items: [] });
    setSelectedEPI('');
    setEpiQuantity(1);
    setEditingKit(null);
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
      <div className="space-y-6" data-testid="kits-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kits</h1>
            <p className="text-slate-600 mt-1">Gerencie kits de EPIs por setor</p>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-kit-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Kit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingKit ? 'Editar Kit' : 'Criar Novo Kit'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Nome do Kit *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Ex: Kit Eletricista, Kit Altura"
                      data-testid="kit-name-input"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Setor *</label>
                    <input
                      type="text"
                      required
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Ex: Marcenaria, Serralheria, Montagem"
                    />
                    <p className="text-xs text-slate-500 mt-1">O kit será vinculado a este setor</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="flex min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Descreva o kit e sua finalidade..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_mandatory}
                        onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium">Kit obrigatório para colaboradores do setor</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      Se marcado, o sistema gerará alertas quando colaboradores do setor não possuírem todos os EPIs do kit
                    </p>
                  </div>
                </div>

                {/* Adicionar EPIs */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Adicionar EPIs ao Kit
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <select
                      value={selectedEPI}
                      onChange={(e) => setSelectedEPI(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="select-epi-kit"
                    >
                      <option value="">Selecione um EPI...</option>
                      {epis.map(epi => (
                        <option key={epi.id} value={epi.id}>
                          {epi.name} {epi.ca_number ? `(CA: ${epi.ca_number})` : epi.nbr_number ? `(NBR: ${epi.nbr_number})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={epiQuantity}
                      onChange={(e) => setEpiQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-center"
                      placeholder="Qtd"
                    />
                    <Button 
                      type="button" 
                      onClick={addEPIToKit} 
                      className="bg-emerald-500 hover:bg-emerald-600"
                      data-testid="add-epi-to-kit"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Lista de itens do kit */}
                {formData.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-slate-900 mb-3">
                      EPIs do Kit ({formData.items.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 rounded-md border bg-emerald-50 border-emerald-200"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">CA: {item.ca_number || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex gap-3">
                  <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600" data-testid="submit-kit">
                    {editingKit ? 'Salvar Alterações' : 'Criar Kit'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Kits */}
        {kits.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
            <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum kit cadastrado</h3>
            <p className="text-slate-600 mb-4">Crie seu primeiro kit clicando no botão acima</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descrição</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Itens</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {kits.map((kit) => (
                  <tr key={kit.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Box className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="font-medium text-slate-900">{kit.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{kit.sector || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{kit.description || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {kit.items?.length || 0} EPIs
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openKitDetails(kit)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(kit)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(kit)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(kit.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dialog de Visualização do Kit */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-600" />
                {selectedKit?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedKit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Setor</p>
                    <p className="font-medium">{selectedKit.sector || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total de Itens</p>
                    <p className="font-medium">{selectedKit.items?.length || 0} EPIs</p>
                  </div>
                </div>
                
                {selectedKit.description && (
                  <div>
                    <p className="text-slate-500 text-sm">Descrição</p>
                    <p className="text-sm">{selectedKit.description}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">EPIs do Kit</h3>
                  
                  {(!selectedKit.items || selectedKit.items.length === 0) ? (
                    <p className="text-slate-500 text-center py-4">Nenhum EPI cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedKit.items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 rounded-md border bg-emerald-50 border-emerald-200"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-medium text-slate-900">{item.name || 'Item'}</p>
                              <p className="text-xs text-slate-500">CA: {item.ca_number || 'N/A'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-700 bg-white px-3 py-1 rounded-full border">
                            Qtd: {item.quantity || 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 text-sm text-slate-500">
                  Criado em: {new Date(selectedKit.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
