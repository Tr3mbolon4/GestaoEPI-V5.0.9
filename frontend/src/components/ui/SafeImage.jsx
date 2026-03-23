import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { getUploadUrl, logImageError } from '@/utils/imageUtils';

/**
 * Componente de imagem com fallback robusto
 * Trata: URL vazia, erro de carregamento, cache, CORS, etc.
 */
const SafeImage = ({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  fallbackIcon: FallbackIcon = User,
  fallbackIconClassName = 'w-6 h-6 text-emerald-600',
  showLoadingState = true,
  bustCache = false,
  onLoad,
  onError,
  ...props
}) => {
  const [status, setStatus] = useState('idle'); // idle, loading, loaded, error
  const [processedSrc, setProcessedSrc] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 1;

  // Processa a URL quando src muda
  useEffect(() => {
    if (!src) {
      setStatus('error');
      setProcessedSrc(null);
      return;
    }

    // Processa URL
    const url = getUploadUrl(src, bustCache);
    
    if (!url) {
      setStatus('error');
      setProcessedSrc(null);
      console.debug('[SafeImage] URL inválida:', src);
      return;
    }

    setProcessedSrc(url);
    setStatus('loading');
    setRetryCount(0);
  }, [src, bustCache]);

  const handleLoad = useCallback((e) => {
    setStatus('loaded');
    console.debug('[SafeImage] Imagem carregada:', processedSrc);
    onLoad?.(e);
  }, [processedSrc, onLoad]);

  const handleError = useCallback((e) => {
    const errorDetails = {
      src: processedSrc,
      originalSrc: src,
      retryCount,
      naturalWidth: e.target?.naturalWidth,
      naturalHeight: e.target?.naturalHeight
    };

    logImageError('SafeImage', 'Falha ao carregar imagem', errorDetails);

    // Tentar uma vez com cache busting
    if (retryCount < MAX_RETRIES && processedSrc && !processedSrc.includes('?v=')) {
      console.debug('[SafeImage] Tentando novamente com cache busting...');
      setRetryCount(prev => prev + 1);
      setProcessedSrc(prev => `${prev}?v=${Date.now()}`);
      return;
    }

    setStatus('error');
    onError?.(e);
  }, [processedSrc, src, retryCount, onError]);

  // Renderiza fallback
  const renderFallback = () => (
    <div 
      className={fallbackClassName || `w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0`}
      data-testid="image-fallback"
    >
      <FallbackIcon className={fallbackIconClassName} />
    </div>
  );

  // Se não tem src ou erro, mostra fallback
  if (!src || status === 'error') {
    return renderFallback();
  }

  // Loading state
  if (status === 'loading' && showLoadingState) {
    return (
      <div className="relative">
        {renderFallback()}
        {processedSrc && (
          <img
            src={processedSrc}
            alt={alt}
            className={`${className} absolute inset-0 opacity-0`}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        )}
      </div>
    );
  }

  // Imagem carregada
  return (
    <img
      src={processedSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

/**
 * Componente de Avatar com fallback
 * Versão especializada do SafeImage para avatares
 */
export const AvatarImage = ({
  src,
  alt = '',
  size = 'md',
  className = '',
  fallbackClassName = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-12 h-12'
  };

  const baseSize = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  return (
    <SafeImage
      src={src}
      alt={alt}
      className={`${baseSize} rounded-full object-cover flex-shrink-0 border-2 border-slate-200 ${className}`}
      fallbackClassName={`${baseSize} bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 ${fallbackClassName}`}
      fallbackIconClassName={`${iconSize} text-emerald-600`}
      {...props}
    />
  );
};

export default SafeImage;
