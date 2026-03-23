import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Package, Calendar, User, ArrowLeft, Search } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getUploadUrl } from '@/utils/imageUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HistoricoEntregas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filter = searchParams.get('filter') || 'all';
  
  useEffect(() => {
    fetchEntregas();
  }, [filter]);
  
  const fetchEntregas = async () => {
    try {
      setLoading(true);
      let url = `${API}/deliveries`;
      
      // Filtro para últimos 30 dias
      if (filter === 'last30days') {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        url += `?start_date=${startDate.toISOString()}`;
      }
      
      const response = await axios.get(url, { headers: getAuthHeader() });
      setEntregas(response.data);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
      toast.error('Erro ao carregar histórico de entregas');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredEntregas = entregas.filter(entrega => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entrega.employee_name?.toLowerCase().includes(term) ||
      entrega.items?.some(item => 
        item.epi_name?.toLowerCase().includes(term) ||
        item.kit_name?.toLowerCase().includes(term)
      )
    );
  });
  
  const getTitle = () => {
    if (filter === 'last30days') return 'Entregas dos Últimos 30 Dias';
    return 'Histórico de Entregas';
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
      <div className="space-y-6" data-testid="historico-entregas-page">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{getTitle()}</h1>
              <p className="text-slate-600 mt-1">
                {filteredEntregas.length} entrega(s) encontrada(s)
              </p>
            </div>
          </div>
        </div>
        
        {/* Barra de Pesquisa */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador ou item..."
              className="flex-1 outline-none text-sm"
              data-testid="search-entregas"
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
        
        {/* Lista de Entregas */}
        <div className="space-y-4">
          {filteredEntregas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma entrega encontrada</p>
            </div>
          ) : (
            filteredEntregas.map((entrega) => (
              <div 
                key={entrega.id} 
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                data-testid={`entrega-item-${entrega.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Foto facial se existir */}
                    {entrega.facial_photo_path ? (
                      <img 
                        src={`${getUploadUrl(entrega.facial_photo_path)}`} 
                        alt="Confirmação facial" 
                        className="w-16 h-16 rounded-lg object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <User className="w-8 h-8 text-emerald-600" />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{entrega.employee_name}</h3>
                        {entrega.facial_match_score && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                            {Math.round(entrega.facial_match_score * 100)}% match
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entrega.is_return 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {entrega.is_return ? 'Devolução' : 'Entrega'}
                        </span>
                      </div>
                      
                      {/* Itens */}
                      <div className="mt-2 space-y-1">
                        {entrega.items?.map((item, idx) => (
                          <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            <span>
                              {item.quantity}x {item.epi_name || item.kit_name || 'Item'}
                              {item.ca_number && <span className="text-slate-400 ml-1">(CA: {item.ca_number})</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {entrega.notes && (
                        <p className="mt-2 text-sm text-slate-500 italic">"{entrega.notes}"</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(entrega.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(entrega.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
