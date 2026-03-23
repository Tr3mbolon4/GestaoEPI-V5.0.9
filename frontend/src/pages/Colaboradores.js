import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Search, User, Camera, Upload, Eye, Edit2, FileDown, FileUp, FileText, Loader2, ToggleLeft, ToggleRight, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader, useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Webcam from 'react-webcam';
import { getUploadUrl, logImageError, hasMixedContentRisk } from '@/utils/imageUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente de Avatar com fallback robusto para erro de carregamento
const AvatarImage = ({ src, alt, className, fallbackClassName, bustCache = false }) => {
  const [imageStatus, setImageStatus] = useState('idle');
  const [processedSrc, setProcessedSrc] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Processar URL quando src muda
  useEffect(() => {
    if (!src) {
      setImageStatus('error');
      setProcessedSrc(null);
      return;
    }
    
    const url = getUploadUrl(src, bustCache);
    if (!url) {
      setImageStatus('error');
      setProcessedSrc(null);
      console.debug('[AvatarImage] URL inválida:', src);
      return;
    }
    
    setProcessedSrc(url);
    setImageStatus('loading');
    setRetryCount(0);
  }, [src, bustCache]);
  
  const handleLoad = () => {
    setImageStatus('loaded');
    console.debug('[AvatarImage] Imagem carregada:', processedSrc);
  };
  
  const handleError = (e) => {
    logImageError('AvatarImage', 'Falha ao carregar', {
      src: processedSrc,
      originalSrc: src,
      retryCount
    });
    
    // Tentar uma vez com cache busting
    if (retryCount < 1 && processedSrc && !processedSrc.includes('?v=')) {
      console.debug('[AvatarImage] Retentando com cache busting...');
      setRetryCount(prev => prev + 1);
      setProcessedSrc(prev => `${prev}?v=${Date.now()}`);
      return;
    }
    
    setImageStatus('error');
  };
  
  const fallbackEl = (
    <div className={fallbackClassName || "w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0"}>
      <User className="w-6 h-6 text-emerald-600" />
    </div>
  );
  
  if (imageStatus === 'error' || !src || !processedSrc) {
    return fallbackEl;
  }
  
  return (
    <div className="relative">
      {imageStatus === 'loading' && fallbackEl}
      <img 
        src={processedSrc} 
        alt={alt || ""} 
        className={`${className} ${imageStatus === 'loading' ? 'absolute opacity-0' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default function Colaboradores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredColaboradores, setFilteredColaboradores] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const webcamRef = useRef(null);
  const importInputRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    rg: '',
    registration_number: '',
    company_id: '',
    position: '',
    department: '',
    status: 'active',
    facial_consent: false
  });
  
  const isAdmin = user?.role === 'admin';
  const [loadError, setLoadError] = useState(null);

  // Verificar problemas de Mixed Content na inicialização
  useEffect(() => {
    if (hasMixedContentRisk()) {
      console.warn('[Colaboradores] AVISO: Possível problema de Mixed Content detectado');
    }
    fetchData();
  }, []);

  useEffect(() => {
    filterColaboradores();
  }, [searchTerm, colaboradores]);

  const fetchData = async () => {
    console.log('[Colaboradores] Iniciando carregamento de dados...');
    console.log('[Colaboradores] BACKEND_URL:', BACKEND_URL);
    console.log('[Colaboradores] API:', API);
    setLoadError(null);
    
    try {
      const headers = getAuthHeader();
      console.log('[Colaboradores] Headers de autenticação:', headers ? 'OK' : 'AUSENTE');
      
      if (!headers?.Authorization) {
        throw new Error('Token de autenticação ausente - faça login novamente');
      }
      
      const [colRes, empRes] = await Promise.all([
        axios.get(`${API}/employees`, { 
          headers,
          timeout: 15000 // 15 segundos de timeout
        }).catch(err => {
          console.error('[Colaboradores] Erro ao buscar employees:', err.message);
          throw new Error(`Falha ao carregar colaboradores: ${err.message}`);
        }),
        axios.get(`${API}/companies`, { 
          headers,
          timeout: 15000
        }).catch(err => {
          console.error('[Colaboradores] Erro ao buscar companies:', err.message);
          // Companies pode falhar sem quebrar a página
          return { data: [] };
        })
      ]);
      
      // Validar resposta
      if (!Array.isArray(colRes.data)) {
        console.error('[Colaboradores] Resposta inválida - esperava array:', typeof colRes.data);
        throw new Error('Resposta inválida da API - formato inesperado');
      }
      
      console.log(`[Colaboradores] ${colRes.data.length} colaboradores carregados`);
      console.log(`[Colaboradores] ${empRes.data.length} empresas carregadas`);
      
      // Log de fotos para debug
      const comFoto = colRes.data.filter(c => c.photo_path).length;
      console.log(`[Colaboradores] ${comFoto}/${colRes.data.length} com foto cadastrada`);
      
      setColaboradores(colRes.data);
      setFilteredColaboradores(colRes.data);
      setEmpresas(empRes.data);
      
    } catch (error) {
      const errorInfo = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      };
      
      console.error('[Colaboradores] Erro ao carregar dados:', errorInfo);
      
      // Identificar tipo de erro para mensagem mais clara
      let userMessage = 'Erro ao carregar dados';
      
      if (error.message.includes('Network Error')) {
        userMessage = 'Erro de conexão - verifique sua internet';
        console.error('[Colaboradores] Tipo: Erro de rede');
      } else if (error.response?.status === 401) {
        userMessage = 'Sessão expirada - faça login novamente';
        console.error('[Colaboradores] Tipo: Não autorizado');
      } else if (error.response?.status === 403) {
        userMessage = 'Sem permissão para acessar colaboradores';
        console.error('[Colaboradores] Tipo: Acesso negado');
      } else if (error.response?.status === 500) {
        userMessage = 'Erro interno do servidor - tente novamente';
        console.error('[Colaboradores] Tipo: Erro do servidor');
      } else if (error.code === 'ECONNABORTED') {
        userMessage = 'Tempo limite excedido - servidor lento';
        console.error('[Colaboradores] Tipo: Timeout');
      }
      
      setLoadError(userMessage);
      toast.error(userMessage);
      
    } finally {
      setLoading(false);
    }
  };

  // Função para recarregar dados
  const handleRefresh = () => {
    setLoading(true);
    setColaboradores([]);
    setFilteredColaboradores([]);
    fetchData();
  };

  // Funções de importação/exportação
  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/employees/template/excel`, {
        headers: getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_colaboradores.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template baixado!');
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      toast.error('Erro ao baixar template');
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/employees/export/excel`, {
        headers: getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `colaboradores_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Exportação concluída!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/reports/employees/pdf`, {
        headers: getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `colaboradores_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF gerado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  const importFromExcel = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await axios.post(`${API}/employees/import/excel`, formData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { imported, errors, skipped } = response.data;
      
      if (imported > 0) {
        toast.success(`${imported} colaborador(es) importado(s) com sucesso!`);
      }
      if (skipped > 0) {
        toast.warning(`${skipped} registro(s) ignorado(s) (duplicados)`);
      }
      if (errors.length > 0) {
        const errorMsg = errors.slice(0, 3).map(e => `Linha ${e.row}: ${e.errors.join(', ')}`).join('\n');
        toast.error(`Erros encontrados:\n${errorMsg}${errors.length > 3 ? `\n... e mais ${errors.length - 3} erro(s)` : ''}`);
      }
      
      setShowImportDialog(false);
      setImportFile(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error(error.response?.data?.detail || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
    }
  };

  const filterColaboradores = () => {
    if (!searchTerm.trim()) {
      setFilteredColaboradores(colaboradores);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = colaboradores.filter(col => 
      col.full_name?.toLowerCase().includes(term) ||
      col.cpf?.toLowerCase().includes(term) ||
      col.registration_number?.toLowerCase().includes(term) ||
      col.department?.toLowerCase().includes(term) ||
      col.position?.toLowerCase().includes(term)
    );
    setFilteredColaboradores(filtered);
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        setPhotoFile(file);
        setPhotoPreview(imageSrc);
        setShowWebcam(false);
        toast.success('Foto capturada!');
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success('Foto selecionada!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let employeeId;
      
      if (editingColaborador) {
        // Edição
        await axios.patch(`${API}/employees/${editingColaborador.id}`, formData, { headers: getAuthHeader() });
        employeeId = editingColaborador.id;
        toast.success('Colaborador atualizado com sucesso!');
      } else {
        // Criação
        const response = await axios.post(`${API}/employees`, formData, { headers: getAuthHeader() });
        employeeId = response.data.id;
        toast.success('Colaborador cadastrado com sucesso!');
      }
      
      if (photoFile) {
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photoFile);
        await axios.post(`${API}/employees/${employeeId}/photo`, formDataPhoto, {
          headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar';
      toast.error(errorMsg);
    }
  };
  
  const handleEdit = (colaborador) => {
    setEditingColaborador(colaborador);
    setFormData({
      full_name: colaborador.full_name || '',
      cpf: colaborador.cpf || '',
      rg: colaborador.rg || '',
      registration_number: colaborador.registration_number || '',
      company_id: colaborador.company_id || '',
      position: colaborador.position || '',
      department: colaborador.department || '',
      status: colaborador.status || 'active',
      facial_consent: colaborador.facial_consent || false
    });
    if (colaborador.photo_path) {
      setPhotoPreview(getUploadUrl(colaborador.photo_path));
    }
    setShowDialog(true);
  };
  
  const toggleStatus = async (colaborador) => {
    const newStatus = colaborador.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.patch(`${API}/employees/${colaborador.id}`, { status: newStatus }, { headers: getAuthHeader() });
      toast.success(`Colaborador ${newStatus === 'active' ? 'ativado' : 'inativado'} com sucesso!`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      cpf: '',
      rg: '',
      registration_number: '',
      company_id: '',
      position: '',
      department: '',
      status: 'active',
      facial_consent: false
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingColaborador(null);
  };

  const openColaborador = (id) => {
    navigate(`/colaboradores/${id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600">Carregando colaboradores...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Estado de erro com opção de retry
  if (loadError && colaboradores.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Erro ao carregar</h2>
          <p className="text-slate-600 mb-4 text-center max-w-md">{loadError}</p>
          <Button onClick={handleRefresh} className="bg-emerald-500 hover:bg-emerald-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          <p className="text-xs text-slate-400 mt-4">
            Se o problema persistir, verifique sua conexão ou contate o suporte.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="colaboradores-page">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Colaboradores</h1>
            <p className="text-slate-600 mt-1">Gerencie os colaboradores da empresa</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Refresh */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              className="text-slate-600 hover:text-slate-900"
              title="Recarregar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            {/* Botões de Importação/Exportação */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={downloadTemplate}
                className="text-slate-600 hover:text-slate-900"
                data-testid="download-template-btn"
                title="Baixar Template Excel"
              >
                <FileDown className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowImportDialog(true)}
                className="text-slate-600 hover:text-slate-900"
                data-testid="import-excel-btn"
                title="Importar Excel"
              >
                <FileUp className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={exportToExcel}
                disabled={exporting}
                className="text-slate-600 hover:text-slate-900"
                data-testid="export-excel-btn"
                title="Exportar Excel"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={exportToPDF}
                disabled={exporting}
                className="text-slate-600 hover:text-slate-900"
                data-testid="export-pdf-btn"
                title="Exportar PDF"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
            
            <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-colaborador-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
                </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="input-full-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      className={`flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm ${editingColaborador ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                      placeholder="000.000.000-00"
                      data-testid="input-cpf"
                      readOnly={!!editingColaborador}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">RG</label>
                    <input
                      type="text"
                      value={formData.rg}
                      onChange={(e) => setFormData({...formData, rg: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Matrícula *</label>
                    <input
                      type="text"
                      required
                      value={formData.registration_number}
                      onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="input-registration-number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Empresa *</label>
                    {console.log('📋 Empresas disponíveis para select:', empresas)}
                    <select
                      required
                      value={formData.company_id}
                      onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="input-company-id"
                    >
                      <option value="">Selecione...</option>
                      {empresas && empresas.length > 0 ? (
                        empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.legal_name || emp.trade_name || 'Empresa sem nome'}</option>
                        ))
                      ) : (
                        <option disabled>Nenhuma empresa cadastrada</option>
                      )}
                    </select>
                    {empresas && empresas.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Nenhuma empresa encontrada. Cadastre uma empresa primeiro.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cargo</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Setor/Departamento</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Foto do Colaborador</label>
                  
                  {/* Preview da foto */}
                  <div className={`mb-3 ${photoPreview ? 'block' : 'hidden'}`}>
                    {photoPreview && (
                      <div>
                        <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                          className="text-sm text-red-500 mt-2 block"
                        >
                          Remover foto
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Botões de captura - visíveis quando não há preview nem webcam */}
                  <div className={`flex flex-wrap gap-3 ${!showWebcam && !photoPreview ? 'block' : 'hidden'}`}>
                    <button
                      type="button"
                      onClick={() => setShowWebcam(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar Foto
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Upload Foto
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {/* Opção para tirar foto diretamente no celular */}
                    <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 cursor-pointer sm:hidden">
                      <Camera className="w-4 h-4" />
                      Tirar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="user" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* Webcam - visível apenas quando ativa */}
                  <div className={showWebcam ? 'block' : 'hidden'}>
                    {showWebcam && (
                      <div>
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          className="w-full rounded-lg mb-3"
                          videoConstraints={{
                            facingMode: "user",
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                          }}
                          onUserMediaError={(error) => {
                            console.error('Erro ao acessar câmera:', error);
                            toast.error('Erro ao acessar câmera. Verifique as permissões do navegador.');
                            setShowWebcam(false);
                          }}
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                          >
                            Capturar
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowWebcam(false)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={formData.facial_consent}
                    onChange={(e) => setFormData({...formData, facial_consent: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="consent" className="text-sm text-slate-600">
                    Autorizo o uso de biometria facial (LGPD)
                  </label>
                </div>
                
                {/* Status para Admin ao editar */}
                {editingColaborador && isAdmin && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-sm font-medium mb-2">Status do Colaborador</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, status: 'active'})}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          formData.status === 'active' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        <ToggleRight className="w-4 h-4" />
                        Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, status: 'inactive'})}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          formData.status === 'inactive' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        <ToggleLeft className="w-4 h-4" />
                        Inativo
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" data-testid="submit-colaborador">
                  {editingColaborador ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Dialog de Importação */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Importar Colaboradores</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">
                Faça upload de um arquivo Excel (.xlsx) com os dados dos colaboradores.
                Use o template para garantir o formato correto.
              </p>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Baixar Template
                </Button>
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                {importFile ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setImportFile(null)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Clique para selecionar arquivo</p>
                    <p className="text-xs text-slate-400 mt-1">Apenas .xlsx ou .xls</p>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls" 
                      onChange={handleImportFile}
                      className="hidden"
                      ref={importInputRef}
                    />
                  </label>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={importFromExcel} 
                  disabled={!importFile || importing}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Importar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF, matrícula, cargo, setor..."
                className="flex-1 outline-none text-sm"
                data-testid="search-colaborador"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          
          {filteredColaboradores.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {searchTerm ? 'Nenhum colaborador encontrado com esses critérios' : 'Nenhum colaborador cadastrado'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Versão Mobile - Cards */}
              <div className="block sm:hidden space-y-3 p-4">
                {filteredColaboradores.map((col) => (
                  <div 
                    key={col.id} 
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <AvatarImage 
                        src={col.photo_path ? getUploadUrl(col.photo_path) : null}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-slate-200"
                        fallbackClassName="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-lg truncate">{col.full_name}</p>
                        <p className="text-sm text-slate-500">{col.position || 'Sem cargo'}</p>
                        <p className="text-xs text-slate-400 font-mono mt-1">CPF: {col.cpf}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            col.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {col.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                          {col.department && (
                            <span className="text-xs text-slate-500">{col.department}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Button 
                        size="sm" 
                        className="w-full bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => openColaborador(col.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Ficha Completa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Versão Desktop - Tabela */}
              <table className="w-full hidden sm:table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Colaborador</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CPF</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Matrícula</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Cargo</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden xl:table-cell">Setor</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredColaboradores.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarImage 
                            src={col.photo_path ? getUploadUrl(col.photo_path) : null}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-slate-200"
                            fallbackClassName="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{col.full_name}</p>
                            <p className="text-sm text-slate-500 truncate">{col.position || col.department || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-mono text-slate-900">{col.cpf}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-mono text-slate-900 hidden md:table-cell">{col.registration_number || '-'}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-slate-900 hidden lg:table-cell">{col.position || '-'}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-slate-900 hidden xl:table-cell">{col.department || '-'}</td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          col.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {col.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openColaborador(col.id)}
                            data-testid={`view-colaborador-${col.id}`}
                            title="Ver Ficha"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(col)}
                            data-testid={`edit-colaborador-${col.id}`}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              size="sm" 
                              variant={col.status === 'active' ? 'outline' : 'default'}
                              onClick={() => toggleStatus(col)}
                              data-testid={`toggle-status-${col.id}`}
                              title={col.status === 'active' ? 'Inativar' : 'Ativar'}
                              className={col.status === 'active' ? '' : 'bg-emerald-500 hover:bg-emerald-600'}
                            >
                              {col.status === 'active' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            </Button>
                          )}
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
