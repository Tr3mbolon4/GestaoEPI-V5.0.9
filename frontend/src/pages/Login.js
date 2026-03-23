import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { must_change_password } = await login(username, password);
      
      if (must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      
      let message = 'Erro ao fazer login. Tente novamente.';
      
      if (error.response?.status === 403) {
        message = 'Licença expirada. Contate o administrador.';
      } else if (error.response?.status === 401) {
        message = 'E-mail/usuário ou senha incorretos. Verifique suas credenciais.';
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        message = 'Erro de conexão com o servidor. Verifique sua internet.';
      } else if (error.message) {
        message = error.message;
      }
      
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1764154739233-659b2681d162?crop=entropy&cs=srgb&fm=jpg&q=85)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 to-slate-900/90"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-md">
            <img 
              src="/icone-cipolatti.png" 
              alt="Cipolatti" 
              className="w-20 h-20 mb-6 rounded-lg bg-white p-2"
            />
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Cipolatti</h1>
            <p className="text-xl text-emerald-100">Sistema de Gestão de EPI</p>
            <p className="mt-4 text-slate-300">Controle completo de equipamentos de proteção individual com rastreamento por QR Code e reconhecimento facial.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src="/icone-cipolatti.png" 
                alt="Cipolatti" 
                className="w-12 h-12 rounded-md object-contain"
              />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Entrar</h2>
                <p className="text-sm text-slate-600">Sistema Cipolatti</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mensagem de erro visível */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="login-error">
                  <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                </div>
              )}
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mail ou Usuário
                </label>
                <input
                  id="username"
                  type="text"
                  data-testid="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Digite seu e-mail ou usuário"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Digite sua senha"
                  required
                />
              </div>

              <button
                type="submit"
                data-testid="login-submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm rounded-md px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => toast.info('Contate o administrador para redefinir sua senha.')}
                className="text-sm text-emerald-600 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 mt-6">
            Versão 1.0 - Sistema Cipolatti © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
