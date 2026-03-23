import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, UserCog, Edit2, Key, Trash2, Shield, Search, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Labels dos perfis
const PROFILE_LABELS = {
  'admin': 'Administrador',
  'gestor': 'Gestor',
  'rh': 'RH',
  'seguranca_trabalho': 'Segurança do Trabalho',
  'almoxarifado': 'Almoxarifado'
};

// Descrições dos perfis
const PROFILE_DESCRIPTIONS = {
  'admin': 'Acesso total e irrestrito ao sistema',
  'gestor': 'Acesso operacional completo, sem gerenciar perfis',
  'rh': 'Colaboradores, empresas e usuários. Não realiza entregas',
  'seguranca_trabalho': 'EPIs, fornecedores e kits. Sem dados pessoais',
  'almoxarifado': 'Entregas e movimentação. Sem dados sensíveis'
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'almoxarifado'
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    role: '',
    is_active: true
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/users`, { headers: getAuthHeader() });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Uma letra maiúscula');
    if (!/[a-z]/.test(password)) errors.push('Uma letra minúscula');
    if (!/\d/.test(password)) errors.push('Um número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Um caractere especial');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      toast.error(`Senha fraca: ${passwordErrors.join(', ')}`);
      return;
    }
    
    try {
      await axios.post(`${API}/users`, formData, { headers: getAuthHeader() });
      toast.success('Usuário criado com sucesso!');
      setShowDialog(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar usuário');
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/users/${selectedUser.id}`, editFormData, { headers: getAuthHeader() });
      toast.success('Usuário atualizado com sucesso!');
      setShowEditDialog(false);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar usuário');
    }
  };

  const handlePasswordReset = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      toast.error(`Senha fraca: ${passwordErrors.join(', ')}`);
      return;
    }
    
    try {
      await axios.post(
        `${API}/users/${selectedUser.id}/reset-password`,
        { new_password: newPassword },
        { headers: getAuthHeader() }
      );
      toast.success(`Senha de ${selectedUser.username} redefinida com sucesso!`);
      setShowPasswordDialog(false);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao redefinir senha');
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.username}?`)) return;
    
    try {
      await axios.delete(`${API}/users/${user.id}`, { headers: getAuthHeader() });
      toast.success('Usuário excluído');
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir usuário');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'almoxarifado'
    });
  };

  // Verificar se pode editar perfis (apenas Admin)
  const canManageRoles = currentUser?.role === 'admin';
  
  // RH pode criar usuários mas não pode atribuir perfil Admin
  const availableRoles = currentUser?.role === 'admin' 
    ? Object.keys(PROFILE_LABELS)
    : Object.keys(PROFILE_LABELS).filter(r => r !== 'admin');

  const filteredUsuarios = usuarios.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="space-y-6" data-testid="usuarios-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Usuários</h1>
            <p className="text-slate-600 mt-1">Gerencie usuários e perfis de acesso</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-usuario-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Usuário *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Senha *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Mínimo 8 caracteres com maiúscula, minúscula, número e especial
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Perfil *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role}>{PROFILE_LABELS[role]}</option>
                    ))}
                  </select>
                  {formData.role && (
                    <p className="text-xs text-slate-500 mt-1">
                      {PROFILE_DESCRIPTIONS[formData.role]}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Criar Usuário
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Legenda de Perfis */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">Perfis de Acesso (LGPD)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-blue-800">
                {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="font-medium">{label}:</span>
                    <span className="text-blue-700 text-xs">{PROFILE_DESCRIPTIONS[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuário ou email..."
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Perfil</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === 'admin' 
                            ? 'bg-purple-100' 
                            : user.role === 'gestor'
                            ? 'bg-blue-100'
                            : user.role === 'rh'
                            ? 'bg-pink-100'
                            : user.role === 'seguranca_trabalho'
                            ? 'bg-orange-100'
                            : 'bg-emerald-100'
                        }`}>
                          <UserCog className={`w-5 h-5 ${
                            user.role === 'admin' 
                              ? 'text-purple-600' 
                              : user.role === 'gestor'
                              ? 'text-blue-600'
                              : user.role === 'rh'
                              ? 'text-pink-600'
                              : user.role === 'seguranca_trabalho'
                              ? 'text-orange-600'
                              : 'text-emerald-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.username}</p>
                          {user.must_change_password && (
                            <span className="text-xs text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Trocar senha
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : user.role === 'gestor'
                          ? 'bg-blue-100 text-blue-700'
                          : user.role === 'rh'
                          ? 'bg-pink-100 text-pink-700'
                          : user.role === 'seguranca_trabalho'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {PROFILE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {canManageRoles && (
                          <>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar usuário"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePasswordReset(user)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                              title="Redefinir senha"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {!canManageRoles && (
                          <span className="text-xs text-slate-400">Sem permissão</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dialog de Edição */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Usuário: {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Perfil</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {editFormData.role && (
                  <p className="text-xs text-slate-500 mt-1">
                    {PROFILE_DESCRIPTIONS[editFormData.role]}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({...editFormData, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Usuário ativo
                </label>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                  Salvar Alterações
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Redefinição de Senha */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-600" />
                Redefinir Senha: {selectedUser?.username}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  A nova senha deve conter: mínimo 8 caracteres, letra maiúscula, 
                  letra minúscula, número e caractere especial (!@#$%^&*).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Digite a nova senha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Confirme a nova senha"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                  <Key className="w-4 h-4 mr-2" />
                  Redefinir Senha
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
