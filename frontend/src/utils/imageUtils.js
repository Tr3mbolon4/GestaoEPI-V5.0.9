/**
 * Utilitários para URLs e imagens
 * Centraliza a lógica de construção de URLs para garantir consistência
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Constrói URL correta para arquivos de upload
 * Suporta: URL absoluta, URL relativa, campo vazio, arquivo inexistente
 * 
 * @param {string|null|undefined} path - Caminho do arquivo
 * @param {boolean} bustCache - Se deve adicionar timestamp para evitar cache
 * @returns {string|null} - URL completa ou null se inválido
 */
export const getUploadUrl = (path, bustCache = false) => {
  // Validação de entrada
  if (!path || typeof path !== 'string' || path.trim() === '') {
    console.debug('[getUploadUrl] Path vazio ou inválido:', path);
    return null;
  }
  
  const cleanPath = path.trim();
  
  // Se já é URL absoluta (http/https), retorna como está
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    const url = bustCache ? `${cleanPath}${cleanPath.includes('?') ? '&' : '?'}v=${Date.now()}` : cleanPath;
    console.debug('[getUploadUrl] URL absoluta:', url);
    return url;
  }
  
  // Se é data URL (base64), retorna como está
  if (cleanPath.startsWith('data:')) {
    console.debug('[getUploadUrl] Data URL detectada');
    return cleanPath;
  }
  
  // Constrói URL baseada no BACKEND_URL
  let fullUrl;
  
  if (cleanPath.startsWith('/api/')) {
    // Já tem /api/, apenas concatena com BACKEND_URL
    fullUrl = `${BACKEND_URL}${cleanPath}`;
  } else if (cleanPath.startsWith('/uploads/')) {
    // Converte /uploads/ para /api/uploads/ (para funcionar com ingress)
    fullUrl = `${BACKEND_URL}/api${cleanPath}`;
  } else if (cleanPath.startsWith('/')) {
    // Outro caminho absoluto
    fullUrl = `${BACKEND_URL}/api${cleanPath}`;
  } else {
    // Caminho relativo
    fullUrl = `${BACKEND_URL}/api/uploads/${cleanPath}`;
  }
  
  // Adiciona cache busting se solicitado
  if (bustCache) {
    fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
  }
  
  console.debug('[getUploadUrl] URL construída:', fullUrl);
  return fullUrl;
};

/**
 * Valida se uma URL de imagem é acessível
 * @param {string} url - URL da imagem
 * @returns {Promise<boolean>} - true se acessível
 */
export const validateImageUrl = async (url) => {
  if (!url) return false;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout de 5 segundos
    setTimeout(() => resolve(false), 5000);
  });
};

/**
 * Logs detalhados para debug de problemas de imagem
 */
export const logImageError = (context, error, details = {}) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error?.message || error,
    ...details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    backendUrl: BACKEND_URL
  };
  
  console.error(`[ImageError] ${context}:`, errorInfo);
  
  // Identificar tipo de erro
  if (error?.message?.includes('net::ERR')) {
    console.error('[ImageError] Tipo: Erro de rede - verifique conectividade');
  } else if (error?.message?.includes('CORS')) {
    console.error('[ImageError] Tipo: Erro de CORS - verifique headers do servidor');
  } else if (error?.message?.includes('Mixed Content')) {
    console.error('[ImageError] Tipo: Mixed Content - HTTP em página HTTPS');
  } else if (error?.message?.includes('404')) {
    console.error('[ImageError] Tipo: Arquivo não encontrado no servidor');
  }
  
  return errorInfo;
};

/**
 * Verifica se há problemas de Mixed Content
 * @returns {boolean} - true se página é HTTPS mas backend é HTTP
 */
export const hasMixedContentRisk = () => {
  if (typeof window === 'undefined') return false;
  
  const pageProtocol = window.location.protocol;
  const backendProtocol = BACKEND_URL?.split('://')[0] + ':';
  
  if (pageProtocol === 'https:' && backendProtocol === 'http:') {
    console.warn('[MixedContent] Página HTTPS tentando carregar recursos HTTP');
    return true;
  }
  
  return false;
};

/**
 * Retorna URL do backend configurada
 */
export const getBackendUrl = () => BACKEND_URL;

/**
 * Retorna URL da API
 */
export const getApiUrl = () => `${BACKEND_URL}/api`;

export default {
  getUploadUrl,
  validateImageUrl,
  logImageError,
  hasMixedContentRisk,
  getBackendUrl,
  getApiUrl
};
