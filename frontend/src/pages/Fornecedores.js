import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Search, Truck, Edit2, Printer, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    contact: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`, { headers: getAuthHeader() });
      setFornecedores(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFornecedor) {
        await axios.patch(`${API}/suppliers/${editingFornecedor.id}`, formData, { headers: getAuthHeader() });
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/suppliers`, formData, { headers: getAuthHeader() });
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      setShowDialog(false);
      resetForm();
      fetchFornecedores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar fornecedor');
    }
  };

  const handleEdit = (fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      name: fornecedor.name || '',
      cnpj: fornecedor.cnpj || '',
      contact: fornecedor.contact || '',
      phone: fornecedor.phone || '',
      email: fornecedor.email || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await axios.delete(`${API}/suppliers/${id}`, { headers: getAuthHeader() });
      toast.success('Fornecedor excluído');
      fetchFornecedores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir');
    }
  };

  const handlePrint = (fornecedor) => {
    const printContent = `
      <html>
        <head>
          <title>Fornecedor - ${fornecedor.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .field { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
          </style>
        </head>
        <body>
          <h1>${fornecedor.name}</h1>
          <div class="field"><span class="label">CNPJ:</span><span class="value">${fornecedor.cnpj || '-'}</span></div>
          <div class="field"><span class="label">Contato:</span><span class="value">${fornecedor.contact || '-'}</span></div>
          <div class="field"><span class="label">Telefone:</span><span class="value">${fornecedor.phone || '-'}</span></div>
          <div class="field"><span class="label">Email:</span><span class="value">${fornecedor.email || '-'}</span></div>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      contact: '',
      phone: '',
      email: ''
    });
    setEditingFornecedor(null);
  };

  const filteredFornecedores = fornecedores.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj?.includes(searchTerm)
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
      <div className="space-y-6" data-testid="fornecedores-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fornecedores</h1>
            <p className="text-slate-600 mt-1">Gerencie os fornecedores de EPI</p>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-fornecedor-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="00.000.000/0000-00"
                    data-testid="input-cnpj"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pessoa de Contato</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                    {editingFornecedor ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Fornecedores */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>
          
          {filteredFornecedores.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum fornecedor encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CNPJ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contato</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredFornecedores.map((fornecedor) => (
                    <tr key={fornecedor.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{fornecedor.name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{fornecedor.cnpj || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fornecedor.contact || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fornecedor.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fornecedor.email || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(fornecedor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(fornecedor)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fornecedor.id)}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
