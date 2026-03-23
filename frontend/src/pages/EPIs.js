import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Package, Search, AlertTriangle, Calendar, X, Eye, Edit2, Printer } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader, useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EPIs() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [epis, setEpis] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEPI, setEditingEPI] = useState(null);
  const [viewingEPI, setViewingEPI] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  const [formData, setFormData] = useState({
    name: '',
    type_category: '',
    brand: '',
    model: '',
    color: '',
    size: '',
    material: '',
    ca_number: '',
    nbr_number: '',  // NOVO: Campo NBR
    ca_validity: '',
    technical_standard: '',
    supplier_id: '',
    invoice_number: '',
    purchase_date: '',
    quantity_purchased: 0,
    unit_price: 0,
    validity_date: '',
    qr_code: '',
    internal_code: '',
    batch: '',
    storage_location: '',
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    // NOVOS: Periodicidade de troca
    replacement_period: '',
    replacement_days: ''
  });
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);
  
  // Atualizar filtro quando URL mudar
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setActiveFilter(filter);
    }
  }, [searchParams]);
  
  // Funções auxiliares para filtros
  const isLowStock = (epi) => epi.current_stock <= epi.min_stock;
  
  const isExpiringSoon = (epi) => {
    if (!epi.validity_date) return false;
    const today = new Date();
    const validity = new Date(epi.validity_date);
    const diffDays = Math.ceil((validity - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };
  
  const isExpired = (epi) => {
    if (!epi.validity_date) return false;
    return new Date(epi.validity_date) < new Date();
  };

  const fetchData = async () => {
    try {
      const [episRes, suppRes] = await Promise.all([
        axios.get(`${API}/epis`, { headers: getAuthHeader() }),
        axios.get(`${API}/suppliers`, { headers: getAuthHeader() })
      ]);
      setEpis(episRes.data);
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
    
    // Validar que pelo menos CA ou NBR deve ser preenchido
    if (!formData.ca_number && !formData.nbr_number) {
      toast.error('É necessário informar o número do CA ou NBR');
      return;
    }
    
    try {
      // Preparar dados limpos para envio
      const cleanData = {
        name: formData.name,
        type_category: formData.type_category,
        ca_number: formData.ca_number || null,
        nbr_number: formData.nbr_number || null,  // NOVO: Campo NBR
        brand: formData.brand || null,
        model: formData.model || null,
        color: formData.color || null,
        size: formData.size || null,
        material: formData.material || null,
        ca_validity: formData.ca_validity || null,
        technical_standard: formData.technical_standard || null,
        supplier_id: formData.supplier_id || null,
        invoice_number: formData.invoice_number || null,
        purchase_date: formData.purchase_date || null,
        quantity_purchased: parseInt(formData.quantity_purchased) || 0,
        unit_price: parseFloat(formData.unit_price) || 0,
        validity_date: formData.validity_date || null,
        qr_code: formData.qr_code || null,
        internal_code: formData.internal_code || null,
        batch: formData.batch || null,
        storage_location: formData.storage_location || null,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: parseInt(formData.max_stock) || 0,
        // NOVOS: Periodicidade de troca
        replacement_period: formData.replacement_period || null,
        replacement_days: formData.replacement_period === 'custom' ? parseInt(formData.replacement_days) || null : null
      };
      
      if (editingEPI) {
        await axios.patch(`${API}/epis/${editingEPI.id}`, cleanData, { headers: getAuthHeader() });
        toast.success('EPI atualizado com sucesso!');
      } else {
        await axios.post(`${API}/epis`, cleanData, { headers: getAuthHeader() });
        toast.success('EPI cadastrado com sucesso!');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar EPI:', error.response?.data);
      // Tratar erro de validação (422)
      const errorData = error.response?.data;
      let errorMessage = 'Erro ao salvar EPI';
      
      if (errorData?.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          errorMessage = errorData.detail.map(err => err.msg || err.message || String(err)).join(', ');
        }
      }
      
      toast.error(errorMessage);
    }
  };
  
  const handleEdit = (epi) => {
    setEditingEPI(epi);
    setFormData({
      name: epi.name || '',
      type_category: epi.type_category || '',
      brand: epi.brand || '',
      model: epi.model || '',
      color: epi.color || '',
      size: epi.size || '',
      material: epi.material || '',
      ca_number: epi.ca_number || '',
      nbr_number: epi.nbr_number || '',  // NOVO: Campo NBR
      ca_validity: epi.ca_validity ? epi.ca_validity.split('T')[0] : '',
      technical_standard: epi.technical_standard || '',
      supplier_id: epi.supplier_id || '',
      invoice_number: epi.invoice_number || '',
      purchase_date: epi.purchase_date ? epi.purchase_date.split('T')[0] : '',
      quantity_purchased: epi.quantity_purchased || 0,
      unit_price: epi.unit_price || 0,
      validity_date: epi.validity_date ? epi.validity_date.split('T')[0] : '',
      qr_code: epi.qr_code || '',
      internal_code: epi.internal_code || '',
      batch: epi.batch || '',
      storage_location: epi.storage_location || '',
      current_stock: epi.current_stock || 0,
      min_stock: epi.min_stock || 0,
      max_stock: epi.max_stock || 0,
      // NOVOS: Periodicidade de troca
      replacement_period: epi.replacement_period || '',
      replacement_days: epi.replacement_days || ''
    });
    setShowDialog(true);
  };
  
  const printEPI = (epi) => {
    const fornecedor = fornecedores.find(f => f.id === epi.supplier_id);
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>EPI - ${epi.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
            .value { margin-top: 4px; font-size: 14px; }
            .section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .badge-ok { background: #D1FAE5; color: #065F46; }
            .badge-low { background: #FEF3C7; color: #92400E; }
            .badge-out { background: #FEE2E2; color: #991B1B; }
          </style>
        </head>
        <body>
          <h1>${epi.name}</h1>
          <p style="color: #666;">${epi.type_category} - ${epi.size || 'Tamanho Único'}</p>
          
          <div class="grid">
            <div class="field">
              <div class="label">Certificado de Aprovação (CA)</div>
              <div class="value" style="font-size: 18px; font-weight: bold;">${epi.ca_number}</div>
            </div>
            <div class="field">
              <div class="label">Validade do CA</div>
              <div class="value">${epi.ca_validity ? new Date(epi.ca_validity).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
            <div class="field">
              <div class="label">Marca</div>
              <div class="value">${epi.brand || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Modelo</div>
              <div class="value">${epi.model || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Cor</div>
              <div class="value">${epi.color || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Material</div>
              <div class="value">${epi.material || '-'}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Informações de Compra</div>
            <div class="grid">
              <div class="field">
                <div class="label">Fornecedor</div>
                <div class="value">${fornecedor?.name || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Nota Fiscal</div>
                <div class="value">${epi.invoice_number || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Data da Compra</div>
                <div class="value">${epi.purchase_date ? new Date(epi.purchase_date).toLocaleDateString('pt-BR') : '-'}</div>
              </div>
              <div class="field">
                <div class="label">Qtd. Comprada</div>
                <div class="value">${epi.quantity_purchased || 0}</div>
              </div>
              <div class="field">
                <div class="label">Valor Unitário</div>
                <div class="value">${epi.unit_price ? 'R$ ' + epi.unit_price.toFixed(2) : '-'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Estoque e Rastreamento</div>
            <div class="grid">
              <div class="field">
                <div class="label">Estoque Atual</div>
                <div class="value" style="font-size: 24px; font-weight: bold;">
                  ${epi.current_stock}
                  <span class="badge ${epi.current_stock === 0 ? 'badge-out' : epi.current_stock <= epi.min_stock ? 'badge-low' : 'badge-ok'}">
                    ${epi.current_stock === 0 ? 'Zerado' : epi.current_stock <= epi.min_stock ? 'Baixo' : 'OK'}
                  </span>
                </div>
              </div>
              <div class="field">
                <div class="label">Estoque Mínimo</div>
                <div class="value">${epi.min_stock || 0}</div>
              </div>
              <div class="field">
                <div class="label">Código Interno</div>
                <div class="value">${epi.internal_code || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Lote</div>
                <div class="value">${epi.batch || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Local de Armazenamento</div>
                <div class="value">${epi.storage_location || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Validade do EPI</div>
                <div class="value">${epi.validity_date ? new Date(epi.validity_date).toLocaleDateString('pt-BR') : '-'}</div>
              </div>
            </div>
          </div>
          
          <p style="margin-top: 40px; font-size: 11px; color: #999; text-align: center;">
            Documento gerado em: ${new Date().toLocaleString('pt-BR')} | Sistema Cipolatti - Gestão de EPI
          </p>
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
      type_category: '',
      brand: '',
      model: '',
      color: '',
      size: '',
      material: '',
      ca_number: '',
      nbr_number: '',  // NOVO: Campo NBR
      ca_validity: '',
      technical_standard: '',
      supplier_id: '',
      invoice_number: '',
      purchase_date: '',
      quantity_purchased: 0,
      unit_price: 0,
      validity_date: '',
      qr_code: '',
      internal_code: '',
      batch: '',
      storage_location: '',
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      // NOVOS: Periodicidade de troca
      replacement_period: '',
      replacement_days: ''
    });
    setEditingEPI(null);
  };

  const filteredEPIs = epis.filter(epi => {
    // Primeiro aplica filtro de busca por texto
    const matchesSearch = epi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (epi.ca_number && epi.ca_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (epi.nbr_number && epi.nbr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (epi.internal_code && epi.internal_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Depois aplica filtro específico
    switch (activeFilter) {
      case 'low_stock':
        return isLowStock(epi);
      case 'expiring':
        return isExpiringSoon(epi) || isExpired(epi);
      case 'expired':
        return isExpired(epi);
      default:
        return true;
    }
  });
  
  const clearFilter = () => {
    setActiveFilter('all');
    setSearchParams({});
  };
  
  const getFilterTitle = () => {
    switch (activeFilter) {
      case 'low_stock':
        return 'EPIs com Estoque Baixo';
      case 'expiring':
        return 'EPIs com Validade Próxima ou Vencidos';
      case 'expired':
        return 'EPIs Vencidos';
      default:
        return 'Cadastro de EPIs';
    }
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
      <div className="space-y-6" data-testid="epis-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{getFilterTitle()}</h1>
            <p className="text-slate-600 mt-1">
              {activeFilter === 'all' 
                ? 'Gerencie os equipamentos de proteção individual'
                : `Mostrando ${filteredEPIs.length} item(s) filtrado(s)`
              }
            </p>
          </div>
          <div className="flex gap-2">
            {activeFilter !== 'all' && (
              <Button variant="outline" onClick={clearFilter} className="gap-2">
                <X className="w-4 h-4" />
                Limpar Filtro
              </Button>
            )}
            <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-epi-button">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Novo EPI</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEPI ? 'Editar EPI' : 'Cadastrar Novo EPI'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium mb-1">Nome do EPI *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria/Tipo *</label>
                    <select
                      required
                      value={formData.type_category}
                      onChange={(e) => setFormData({...formData, type_category: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="Cabeça">Cabeça</option>
                      <option value="Olhos/Face">Olhos/Face</option>
                      <option value="Respiratória">Respiratória</option>
                      <option value="Mãos/Braços">Mãos/Braços</option>
                      <option value="Pés/Pernas">Pés/Pernas</option>
                      <option value="Corpo">Corpo</option>
                      <option value="Audição">Audição</option>
                      <option value="Queda">Queda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CA (Certificado)</label>
                    <input
                      type="text"
                      value={formData.ca_number}
                      onChange={(e) => setFormData({...formData, ca_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Número do CA"
                    />
                    <p className="text-xs text-slate-500 mt-1">Informe CA ou NBR</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">NBR</label>
                    <input
                      type="text"
                      value={formData.nbr_number}
                      onChange={(e) => setFormData({...formData, nbr_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Número da NBR"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Validade do CA</label>
                    <input
                      type="date"
                      value={formData.ca_validity}
                      onChange={(e) => setFormData({...formData, ca_validity: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
                    <label className="block text-sm font-medium mb-1">Cor</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                {/* NOVO: Periodicidade de Troca */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">Periodicidade de Troca Obrigatória</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Período de Troca</label>
                      <select
                        value={formData.replacement_period}
                        onChange={(e) => setFormData({...formData, replacement_period: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Sem periodicidade definida</option>
                        <option value="weekly">Semanal (7 dias)</option>
                        <option value="biweekly">Quinzenal (14 dias)</option>
                        <option value="monthly">Mensal (30 dias)</option>
                        <option value="custom">Personalizado (dias)</option>
                      </select>
                    </div>
                    {formData.replacement_period === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Dias</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.replacement_days}
                          onChange={(e) => setFormData({...formData, replacement_days: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          placeholder="Ex: 45"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">Informações de Compra</h3>
                  <div className="grid grid-cols-3 gap-4">
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
                      <label className="block text-sm font-medium mb-1">Data da Compra</label>
                      <input
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Número da Nota Fiscal</label>
                      <input
                        type="text"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Quantidade Comprada</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.quantity_purchased}
                        onChange={(e) => setFormData({...formData, quantity_purchased: parseInt(e.target.value) || 0})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Valor Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unit_price}
                        onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Validade do EPI</label>
                      <input
                        type="date"
                        value={formData.validity_date}
                        onChange={(e) => setFormData({...formData, validity_date: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">Rastreamento e Estoque</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tamanho</label>
                      <input
                        type="text"
                        value={formData.size}
                        onChange={(e) => setFormData({...formData, size: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="P, M, G, GG, Único"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Lote</label>
                      <input
                        type="text"
                        value={formData.batch}
                        onChange={(e) => setFormData({...formData, batch: e.target.value})}
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
                      <label className="block text-sm font-medium mb-1">Código Interno</label>
                      <input
                        type="text"
                        value={formData.internal_code}
                        onChange={(e) => setFormData({...formData, internal_code: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
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
                      <label className="block text-sm font-medium mb-1">Material</label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={(e) => setFormData({...formData, material: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estoque Atual</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estoque Mínimo</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estoque Máximo</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_stock}
                        onChange={(e) => setFormData({...formData, max_stock: parseInt(e.target.value) || 0})}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  {editingEPI ? 'Salvar Alterações' : 'Cadastrar EPI'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        
        {/* Dialog de Visualização */}
        <Dialog open={!!viewingEPI} onOpenChange={(open) => !open && setViewingEPI(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do EPI</DialogTitle>
            </DialogHeader>
            {viewingEPI && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{viewingEPI.name}</h3>
                    <p className="text-slate-600">{viewingEPI.type_category} - {viewingEPI.size || 'Tamanho Único'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">CA</p>
                    <p className="font-mono font-bold text-lg">{viewingEPI.ca_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Validade CA</p>
                    <p className="font-medium">{viewingEPI.ca_validity ? new Date(viewingEPI.ca_validity).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Marca</p>
                    <p className="font-medium">{viewingEPI.brand || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Modelo</p>
                    <p className="font-medium">{viewingEPI.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Cor</p>
                    <p className="font-medium">{viewingEPI.color || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Material</p>
                    <p className="font-medium">{viewingEPI.material || '-'}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Estoque</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-900">{viewingEPI.current_stock}</p>
                      <p className="text-xs text-slate-500 uppercase">Atual</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-900">{viewingEPI.min_stock}</p>
                      <p className="text-xs text-slate-500 uppercase">Mínimo</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-900">{viewingEPI.max_stock || '-'}</p>
                      <p className="text-xs text-slate-500 uppercase">Máximo</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={() => { setViewingEPI(null); handleEdit(viewingEPI); }} className="flex-1">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" onClick={() => printEPI(viewingEPI)} className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Filtros rápidos */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Search className="w-5 h-5 text-slate-400 hidden sm:block" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CA, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 outline-none text-sm px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => { setActiveFilter('all'); setSearchParams({}); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setActiveFilter('low_stock'); setSearchParams({ filter: 'low_stock' }); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeFilter === 'low_stock' ? 'bg-orange-500 text-white' : 'bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Estoque Baixo
                </button>
                <button
                  onClick={() => { setActiveFilter('expiring'); setSearchParams({ filter: 'expiring' }); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeFilter === 'expiring' ? 'bg-red-500 text-white' : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Vencimento
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabela responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">EPI</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CA</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Marca</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Cor</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden xl:table-cell">Fornecedor</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Validade</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estoque</th>
                  {isAdmin && <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEPIs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">
                        {activeFilter !== 'all' 
                          ? 'Nenhum EPI encontrado com este filtro'
                          : searchTerm 
                            ? 'Nenhum EPI encontrado com esses critérios'
                            : 'Nenhum EPI cadastrado'
                        }
                      </p>
                    </td>
                  </tr>
                ) : filteredEPIs.map((epi) => (
                  <tr key={epi.id} className={`hover:bg-slate-50 ${
                    isExpired(epi) ? 'bg-red-50' : isLowStock(epi) ? 'bg-orange-50' : ''
                  }`}>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isExpired(epi) ? 'bg-red-200' : isLowStock(epi) ? 'bg-orange-200' : 'bg-blue-100'
                        }`}>
                          <Package className={`w-5 h-5 ${
                            isExpired(epi) ? 'text-red-700' : isLowStock(epi) ? 'text-orange-700' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{epi.name}</p>
                          <p className="text-sm text-slate-500 truncate">{epi.type_category} - {epi.size || 'Único'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-mono text-slate-900">
                        {epi.ca_number && <div>CA: {epi.ca_number}</div>}
                        {epi.nbr_number && <div className="text-xs text-slate-500">NBR: {epi.nbr_number}</div>}
                        {!epi.ca_number && !epi.nbr_number && '-'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-slate-900">{epi.brand || '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-slate-900 hidden lg:table-cell">{epi.color || '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-slate-900 hidden xl:table-cell">{epi.supplier_id || '-'}</td>
                    <td className="px-4 sm:px-6 py-4">
                      {epi.validity_date ? (
                        <div className={`text-sm font-medium ${
                          isExpired(epi) ? 'text-red-700' : isExpiringSoon(epi) ? 'text-orange-600' : 'text-slate-900'
                        }`}>
                          {new Date(epi.validity_date).toLocaleDateString('pt-BR')}
                          {isExpired(epi) && (
                            <span className="block text-xs text-red-600">VENCIDO</span>
                          )}
                          {isExpiringSoon(epi) && !isExpired(epi) && (
                            <span className="block text-xs text-orange-600">PRÓXIMO</span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold ${
                          isLowStock(epi) ? 'text-orange-700' : 'text-slate-900'
                        }`}>{epi.current_stock}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          epi.current_stock === 0
                            ? 'bg-red-100 text-red-700'
                            : isLowStock(epi)
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {epi.current_stock === 0 ? 'Zerado' : isLowStock(epi) ? 'Baixo' : 'OK'}
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setViewingEPI(epi)}
                            data-testid={`view-epi-${epi.id}`}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(epi)}
                            data-testid={`edit-epi-${epi.id}`}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => printEPI(epi)}
                            data-testid={`print-epi-${epi.id}`}
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
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
