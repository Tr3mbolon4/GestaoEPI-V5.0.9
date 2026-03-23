import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Wrench, Search } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Ferramentas() {
  const [ferramentas, setFerramentas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    internal_code: '',
    qr_code: '',
    condition: 'new',
    storage_location: '',
    purchase_date: '',
    supplier_id: '',
    invoice_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, suppRes] = await Promise.all([
        axios.get(`${API}/tools`, { headers: getAuthHeader() }),
        axios.get(`${API}/suppliers`, { headers: getAuthHeader() })
      ]);
      setFerramentas(toolsRes.data);
      setFornecedores(suppRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tools`, formData, { headers: getAuthHeader() });
      toast.success('Ferramenta cadastrada com sucesso!');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model: '',
      serial_number: '',
      internal_code: '',
      qr_code: '',
      condition: 'new',
      storage_location: '',
      purchase_date: '',
      supplier_id: '',
      invoice_number: '',
      notes: ''
    });
  };

  const filteredFerramentas = ferramentas.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.internal_code && f.internal_code.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="space-y-6" data-testid="ferramentas-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ferramentas</h1>
            <p className="text-slate-600 mt-1">Gerencie as ferramentas e equipamentos</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Ferramenta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Ferramenta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome da Ferramenta *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Ex: Furadeira, Parafusadeira, Martelete"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Número de Série</label>
                    <input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Código Interno/Patrimônio</label>
                    <input
                      type="text"
                      value={formData.internal_code}
                      onChange={(e) => setFormData({...formData, internal_code: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">QR Code</label>
                    <input
                      type="text"
                      value={formData.qr_code}
                      onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Condição</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="new">Novo</option>
                      <option value="used">Usado</option>
                      <option value="damaged">Danificado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Local de Armazenamento</label>
                    <input
                      type="text"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data da Compra</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fornecedor</label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="flex min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Cadastrar Ferramenta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ferramenta por nome ou código..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ferramenta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Código/Patrimônio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nº Série</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Condição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Local</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFerramentas.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tool.name}</p>
                          <p className="text-sm text-slate-500">{tool.brand} {tool.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{tool.internal_code || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{tool.serial_number || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tool.condition === 'new' ? 'bg-emerald-100 text-emerald-700' :
                        tool.condition === 'used' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tool.condition === 'new' ? 'Novo' : tool.condition === 'used' ? 'Usado' : 'Danificado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{tool.storage_location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
