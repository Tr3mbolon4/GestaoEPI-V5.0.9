import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, FileText, Eye, Edit2, Trash2, Save } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Documentacao() {
  const [templates, setTemplates] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    content: '',
    version: '1.0'
  });
  const [fillData, setFillData] = useState({
    employee_id: '',
    employee_name: '',
    employee_cpf: '',
    company: '',
    representative_name: ''
  });
  
  const sigRepRef = useRef(null);
  const sigEmpRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, empRes] = await Promise.all([
        axios.get(`${API}/document-templates`, { headers: getAuthHeader() }),
        axios.get(`${API}/employees`, { headers: getAuthHeader() })
      ]);
      setTemplates(templatesRes.data);
      setColaboradores(empRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/document-templates`, formData, { headers: getAuthHeader() });
      toast.success('Modelo criado com sucesso!');
      setShowCreateDialog(false);
      setFormData({ name: '', type: '', content: '', version: '1.0' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar modelo');
    }
  };

  const openFillDialog = (template) => {
    setSelectedTemplate(template);
    setShowFillDialog(true);
  };

  const handleEmployeeChange = (empId) => {
    const emp = colaboradores.find(e => e.id === parseInt(empId));
    if (emp) {
      setFillData({
        ...fillData,
        employee_id: empId,
        employee_name: emp.full_name,
        employee_cpf: emp.cpf,
        company: emp.company_id || 'N/A'
      });
    }
  };

  const generatePDF = () => {
    if (!fillData.employee_name || !fillData.representative_name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (sigRepRef.current.isEmpty() || sigEmpRef.current.isEmpty()) {
      toast.error('Ambas as assinaturas são obrigatórias');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(selectedTemplate.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    let y = 40;
    const content = selectedTemplate.content
      .replace('{NOME_COLABORADOR}', fillData.employee_name)
      .replace('{CPF}', fillData.employee_cpf)
      .replace('{EMPRESA}', fillData.company)
      .replace('{REPRESENTANTE}', fillData.representative_name)
      .replace('{DATA}', new Date().toLocaleDateString('pt-BR'));
    
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 20;

    doc.text('Assinatura do Representante de Segurança:', 15, y);
    const sigRepData = sigRepRef.current.toDataURL();
    doc.addImage(sigRepData, 'PNG', 15, y + 5, 80, 30);

    doc.text('Assinatura do Colaborador:', 105, y);
    const sigEmpData = sigEmpRef.current.toDataURL();
    doc.addImage(sigEmpData, 'PNG', 105, y + 5, 80, 30);

    doc.save(`${selectedTemplate.name}_${fillData.employee_name}.pdf`);
    toast.success('PDF gerado e baixado com sucesso!');
    setShowFillDialog(false);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) return;
    
    try {
      await axios.delete(`${API}/document-templates/${id}`, { headers: getAuthHeader() });
      toast.success('Modelo excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir');
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
      <div className="space-y-6" data-testid="documentacao-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documentação</h1>
            <p className="text-slate-600 mt-1">Modelos de documentos com assinatura digital</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{template.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{template.type}</p>
                  <p className="text-xs text-slate-400 mt-1">Versão {template.version}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => openFillDialog(template)}
                  size="sm"
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Abrir
                </Button>
                <Button
                  onClick={() => deleteTemplate(template.id)}
                  size="sm"
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Dialog Criar Modelo */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Modelo de Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Documento *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Ex: Termo de Entrega de EPI NR-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="termo_epi">Termo de Ciência EPI (NR-6)</option>
                  <option value="nr10">Treinamento NR-10</option>
                  <option value="altura">Treinamento em Altura</option>
                  <option value="andaime">Trabalho em Andaime</option>
                  <option value="plataforma">Plataforma Elevatória</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Conteúdo do Documento *</label>
                <p className="text-xs text-slate-500 mb-2">Use: {'{NOME_COLABORADOR}'}, {'{CPF}'}, {'{EMPRESA}'}, {'{REPRESENTANTE}'}, {'{DATA}'}</p>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="flex min-h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Digite o conteúdo do documento..."
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                Criar Modelo
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Preencher e Assinar */}
        <Dialog open={showFillDialog} onOpenChange={setShowFillDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Colaborador *</label>
                  <select
                    value={fillData.employee_id}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {colaboradores.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Representante de Segurança *</label>
                  <input
                    type="text"
                    value={fillData.representative_name}
                    onChange={(e) => setFillData({...fillData, representative_name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTemplate?.content
                    .replace('{NOME_COLABORADOR}', fillData.employee_name || '[NOME]')
                    .replace('{CPF}', fillData.employee_cpf || '[CPF]')
                    .replace('{EMPRESA}', fillData.company || '[EMPRESA]')
                    .replace('{REPRESENTANTE}', fillData.representative_name || '[REPRESENTANTE]')
                    .replace('{DATA}', new Date().toLocaleDateString('pt-BR'))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Assinatura do Representante *</label>
                  <div className="border-2 border-slate-300 rounded-lg">
                    <SignatureCanvas
                      ref={sigRepRef}
                      canvasProps={{ className: 'w-full h-32' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => sigRepRef.current?.clear()}
                    className="text-xs text-red-500 mt-1"
                  >
                    Limpar
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Assinatura do Colaborador *</label>
                  <div className="border-2 border-slate-300 rounded-lg">
                    <SignatureCanvas
                      ref={sigEmpRef}
                      canvasProps={{ className: 'w-full h-32' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => sigEmpRef.current?.clear()}
                    className="text-xs text-red-500 mt-1"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <Button onClick={generatePDF} className="w-full bg-emerald-500 hover:bg-emerald-600">
                <Save className="w-4 h-4 mr-2" />
                Gerar e Baixar PDF Assinado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
