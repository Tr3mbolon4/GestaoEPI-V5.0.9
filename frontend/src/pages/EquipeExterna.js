import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, UsersRound, User } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EquipeExterna() {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [teamData, setTeamData] = useState({
    company_name: '',
    cnpj: '',
    responsible_person: '',
    contact_phone: '',
    contact_email: '',
    service_locations: ''
  });
  const [memberData, setMemberData] = useState({
    team_id: '',
    full_name: '',
    cpf: '',
    document_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, membersRes] = await Promise.all([
        axios.get(`${API}/external-teams`, { headers: getAuthHeader() }),
        axios.get(`${API}/external-members`, { headers: getAuthHeader() })
      ]);
      setTeams(teamsRes.data);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/external-teams`, teamData, { headers: getAuthHeader() });
      toast.success('Equipe externa cadastrada!');
      setShowTeamDialog(false);
      setTeamData({ company_name: '', cnpj: '', responsible_person: '', contact_phone: '', contact_email: '', service_locations: '' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao cadastrar equipe');
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/external-members`, memberData, { headers: getAuthHeader() });
      toast.success('Membro cadastrado!');
      setShowMemberDialog(false);
      setMemberData({ team_id: '', full_name: '', cpf: '', document_number: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao cadastrar membro');
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
      <div className="space-y-6" data-testid="equipe-externa-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Equipe Externa</h1>
            <p className="text-slate-600 mt-1">Gerencie equipes terceirizadas e seus membros</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Membro Externo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleMemberSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Equipe *</label>
                    <select
                      required
                      value={memberData.team_id}
                      onChange={(e) => setMemberData({...memberData, team_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={memberData.full_name}
                      onChange={(e) => setMemberData({...memberData, full_name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF</label>
                    <input
                      type="text"
                      value={memberData.cpf}
                      onChange={(e) => setMemberData({...memberData, cpf: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Documento</label>
                    <input
                      type="text"
                      value={memberData.document_number}
                      onChange={(e) => setMemberData({...memberData, document_number: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
                    Cadastrar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Equipe Externa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTeamSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome da Empresa *</label>
                    <input
                      type="text"
                      required
                      value={teamData.company_name}
                      onChange={(e) => setTeamData({...teamData, company_name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={teamData.cnpj}
                      onChange={(e) => setTeamData({...teamData, cnpj: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Responsável</label>
                    <input
                      type="text"
                      value={teamData.responsible_person}
                      onChange={(e) => setTeamData({...teamData, responsible_person: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <input
                      type="text"
                      value={teamData.contact_phone}
                      onChange={(e) => setTeamData({...teamData, contact_phone: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Locais de Serviço</label>
                    <textarea
                      value={teamData.service_locations}
                      onChange={(e) => setTeamData({...teamData, service_locations: e.target.value})}
                      className="flex min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                    Cadastrar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{team.company_name}</h3>
                  {team.cnpj && <p className="text-sm text-slate-600">CNPJ: {team.cnpj}</p>}
                  {team.responsible_person && <p className="text-sm text-slate-600">Responsável: {team.responsible_person}</p>}
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Membros:</p>
                {members.filter(m => m.team_id === team.id).map(member => (
                  <div key={member.id} className="flex items-center gap-2 py-1">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-900">{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
