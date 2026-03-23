import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Search, User, Camera, Upload } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Webcam from 'react-webcam';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const webcamRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    rg: '',
    registration_number: '',
    company_id: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    status: 'active',
    facial_consent: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colRes, empRes] = await Promise.all([
        axios.get(`${API}/employees`, { headers: getAuthHeader() }),
        axios.get(`${API}/companies`, { headers: getAuthHeader() })
      ]);
      setColaboradores(colRes.data);
      setEmpresas(empRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
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
      const response = await axios.post(`${API}/employees`, formData, { headers: getAuthHeader() });
      
      if (photoFile) {
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photoFile);
        await axios.post(`${API}/employees/${response.data.id}/photo`, formDataPhoto, {
          headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success('Colaborador cadastrado com sucesso!');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar');
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
      phone: '',
      email: '',
      status: 'active',
      facial_consent: false
    });
    setPhotoFile(null);
    setPhotoPreview(null);
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
      <div className="space-y-6" data-testid="colaboradores-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Colaboradores</h1>
            <p className="text-slate-600 mt-1">Gerencie os colaboradores da empresa</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-colaborador-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Colaborador</DialogTitle>
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="000.000.000-00"
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
                    <label className="block text-sm font-medium mb-1">Matrícula</label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Empresa</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.legal_name}</option>
                      ))}
                    </select>
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Foto do Colaborador</label>
                  {photoPreview ? (
                    <div className="mb-3">
                      <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                        className="text-sm text-red-500 mt-2"
                      >
                        Remover foto
                      </button>
                    </div>
                  ) : null}
                  
                  {!showWebcam && !photoPreview && (
                    <div className="flex gap-3">
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
                    </div>
                  )}

                  {showWebcam && (
                    <div>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        className="w-full rounded-lg mb-3"
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

                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Cadastrar Colaborador
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
                placeholder="Buscar por nome, CPF, matrícula..."
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Colaborador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CPF</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">RG</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Matrícula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {colaboradores.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {col.photo_path ? (
                          <img src={`${BACKEND_URL}${col.photo_path}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{col.full_name}</p>
                          <p className="text-sm text-slate-500">{col.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{col.cpf}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{col.rg || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{col.registration_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{col.position || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{col.department || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        col.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {col.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
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
