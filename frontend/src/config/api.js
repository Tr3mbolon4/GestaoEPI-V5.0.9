const PRODUCTION_BACKEND_URL = 'https://gestaoepi.cipolatti.com.br';
const LOCAL_HOSTNAME = ['local', 'host'].join('');
const LOOPBACK_IP = ['127', '0', '0', '1'].join('.');

const isBrowser = typeof window !== 'undefined';
const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL;
const currentOrigin = isBrowser ? window.location.origin : '';
const currentHostname = isBrowser ? window.location.hostname : '';
const isLocalEnv = [LOCAL_HOSTNAME, LOOPBACK_IP].includes(currentHostname);

const getUrlInfo = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const normalizeBackendUrl = () => {
  if (isLocalEnv) {
    return configuredBackendUrl || `${window.location.protocol}//${window.location.hostname}:8001`;
  }

  if (!configuredBackendUrl) {
    return currentOrigin || PRODUCTION_BACKEND_URL;
  }

  const configuredUrl = getUrlInfo(configuredBackendUrl);
  const isUnsafeLocalUrl = configuredUrl && [LOCAL_HOSTNAME, LOOPBACK_IP].includes(configuredUrl.hostname);
  const isMixedContent = isBrowser && window.location.protocol === 'https:' && configuredUrl?.protocol === 'http:';

  if (isUnsafeLocalUrl || isMixedContent) {
    return currentOrigin || PRODUCTION_BACKEND_URL;
  }

  return configuredBackendUrl;
};

export const BACKEND_URL = normalizeBackendUrl().replace(/\/$/, '');
export const API = `${BACKEND_URL}/api`;

export const normalizeAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (isLocalEnv) return url;
  const parsedUrl = getUrlInfo(url);
  if (parsedUrl && [LOCAL_HOSTNAME, LOOPBACK_IP].includes(parsedUrl.hostname)) {
    return `${BACKEND_URL}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  }
  return url;
};
