import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Search, Building2, Edit2, Printer, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const printRef = useRef(null);
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    cnpj: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    notes: ''
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/companies`, { headers: getAuthHeader() });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmpresa) {
        await axios.patch(`${API}/companies/${editingEmpresa.id}`, formData, { headers: getAuthHeader() });
        toast.success('Empresa atualizada com sucesso!');
      } else {
        await axios.post(`${API}/companies`, formData, { headers: getAuthHeader() });
        toast.success('Empresa cadastrada com sucesso!');
      }
      setShowDialog(false);
      resetForm();
      fetchEmpresas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar empresa');
    }
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      legal_name: empresa.legal_name || '',
      trade_name: empresa.trade_name || '',
      cnpj: empresa.cnpj || '',
      address: empresa.address || '',
      contact_person: empresa.contact_person || '',
      contact_phone: empresa.contact_phone || '',
      contact_email: empresa.contact_email || '',
      notes: empresa.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
      await axios.delete(`${API}/companies/${id}`, { headers: getAuthHeader() });
      toast.success('Empresa excluída');
      fetchEmpresas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir');
    }
  };

  const handlePrint = (empresa) => {
    const printContent = `
      <html>
        <head>
          <title>Empresa - ${empresa.legal_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .field { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
          </style>
        </head>
        <body>
          <h1>${empresa.legal_name}</h1>
          <div class="field"><span class="label">Nome Fantasia:</span><span class="value">${empresa.trade_name || '-'}</span></div>
          <div class="field"><span class="label">CNPJ:</span><span class="value">${empresa.cnpj}</span></div>
          <div class="field"><span class="label">Endereço:</span><span class="value">${empresa.address || '-'}</span></div>
          <div class="field"><span class="label">Contato:</span><span class="value">${empresa.contact_person || '-'}</span></div>
          <div class="field"><span class="label">Telefone:</span><span class="value">${empresa.contact_phone || '-'}</span></div>
          <div class="field"><span class="label">Email:</span><span class="value">${empresa.contact_email || '-'}</span></div>
          <div class="field"><span class="label">Observações:</span><span class="value">${empresa.notes || '-'}</span></div>
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
      legal_name: '',
      trade_name: '',
      cnpj: '',
      address: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      notes: ''
    });
    setEditingEmpresa(null);
  };

  const filteredEmpresas = empresas.filter(e => 
    e.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm) ||
    e.trade_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="space-y-6" data-testid="empresas-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Empresas</h1>
            <p className="text-slate-600 mt-1">Gerencie as empresas cadastradas</p>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-empresa-button">
                <Plus className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={formData.legal_name}
                      onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      value={formData.trade_name}
                      onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
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
                      disabled={!!editingEmpresa}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pessoa de Contato</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="flex min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                    {editingEmpresa ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Empresas */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>
          
          {filteredEmpresas.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Razão Social</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nome Fantasia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CNPJ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contato</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Telefone</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmpresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{empresa.legal_name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{empresa.trade_name || '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{empresa.cnpj}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{empresa.contact_person || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{empresa.contact_phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(empresa)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(empresa)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(empresa.id)}
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
