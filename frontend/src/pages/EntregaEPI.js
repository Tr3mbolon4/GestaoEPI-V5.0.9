import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Camera, QrCode, User, Package, CheckCircle2, ScanFace, History, AlertTriangle, X, Loader2, UserPlus, Info } from 'lucide-react';
import Webcam from 'react-webcam';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getUploadUrl, logImageError } from '@/utils/imageUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// CONFIGURAÇÕES OTIMIZADAS PARA PCs FRACOS
// ============================================

// Detector LEVE para detecção contínua (MUITO RÁPIDO)
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 128,        // 128 = ULTRA LEVE para detecção contínua
  scoreThreshold: 0.55   // Confiança mínima equilibrada
});

// Configurações para embedding final (só roda 1x após validação)
const EMBEDDING_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,        // Reduzido de 320 para melhor performance
  scoreThreshold: 0.6
});

// Thresholds otimizados
const SIMILARITY_THRESHOLD = 0.4;    // Similaridade mínima para match
const DETECTION_CONFIDENCE = 0.65;   // Confiança mínima do rosto (ajustado)
const STABILITY_TIME = 1000;         // ms de estabilidade antes de capturar (aumentado)
const MAX_AUTO_ATTEMPTS = 1;         // Máximo de tentativas automáticas (reduzido)
const DETECTION_INTERVAL = 350;      // ms entre detecções (aumentado de 200)

export default function EntregaEPI() {
  const navigate = useNavigate();
  const [step, setStep] = useState('facial');
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showWebcam, setShowWebcam] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [facialMatch, setFacialMatch] = useState(null);
  const [epis, setEpis] = useState([]);
  const [kits, setKits] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [employeeCurrentItems, setEmployeeCurrentItems] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [notFoundMessage, setNotFoundMessage] = useState(null);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  
  // Estados para detecção em tempo real
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceValid, setFaceValid] = useState(false);
  const [detectionScore, setDetectionScore] = useState(0);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [isProcessingEmbedding, setIsProcessingEmbedding] = useState(false);
  const [guidanceMessage, setGuidanceMessage] = useState('Posicione o rosto no centro da câmera');
  
  // Cache de templates faciais
  const [facialTemplatesCache, setFacialTemplatesCache] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);
  
  // Estado para termo de consentimento LGPD - removido pois agora é no cadastro da biometria
  // const [showConsentDialog, setShowConsentDialog] = useState(false);
  // const [consentAccepted, setConsentAccepted] = useState(false);
  
  // Refs
  const webcamRef = useRef(null);
  const qrScannerRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const stabilityTimerRef = useRef(null);
  const processingRef = useRef(false);  // LOCK DE PROCESSAMENTO
  const lastValidDetectionRef = useRef(null);
  const autoAttemptsRef = useRef(0);

  useEffect(() => {
    // Carregar tudo em paralelo
    Promise.all([
      loadFaceModels(),
      fetchEPIs(),
      fetchKits(),
      fetchAllEmployees()
    ]);
    
    // CRÍTICO: Cleanup ao desmontar componente
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      
      // Parar media stream
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Carregar templates quando modelos forem carregados
  useEffect(() => {
    if (modelsLoaded && !templatesLoaded) {
      loadAllFacialTemplates();
    }
  }, [modelsLoaded, templatesLoaded]);

  const loadFaceModels = async () => {
    try {
      setLoadingStatus('Carregando IA de reconhecimento...');
      setLoadingProgress(10);
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      setLoadingProgress(40);
      setLoadingStatus('');
    } catch (error) {
      console.error('Erro ao carregar modelos faciais:', error);
      toast.error('Erro ao carregar modelos de reconhecimento facial');
    }
  };
  
  // OTIMIZADO: Buscar templates apenas de colaboradores ativos
  const loadAllFacialTemplates = useCallback(async () => {
    try {
      setLoadingStatus('Carregando base facial...');
      setLoadingProgress(50);
      
      const res = await axios.get(`${API}/facial-templates/all`, { headers: getAuthHeader() });
      
      setLoadingProgress(80);
      
      const templatesWithEmployees = [];
      for (const item of res.data) {
        try {
          // Filtrar apenas colaboradores ativos (preparado para filtro futuro)
          if (item.employee?.status === 'inactive') continue;
          
          const descriptor = new Float32Array(JSON.parse(item.descriptor));
          templatesWithEmployees.push({
            employee: item.employee,
            descriptor,
            templateId: item.id,
            // Campos para filtro futuro
            sector: item.employee?.department,
            company: item.employee?.company_id
          });
        } catch (e) {
          console.error('Erro ao parsear descriptor:', e);
        }
      }
      
      setFacialTemplatesCache(templatesWithEmployees);
      setTemplateCount(templatesWithEmployees.length);
      setTemplatesLoaded(true);
      setLoadingProgress(100);
      setLoadingStatus('');
      
      if (templatesWithEmployees.length > 0) {
        console.log(`${templatesWithEmployees.length} templates faciais carregados`);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setLoadingStatus('');
      setLoadingProgress(100);
      setTemplatesLoaded(true);
    }
  }, []);

  // ========================================
  // DETECÇÃO EM TEMPO REAL (OTIMIZADA)
  // ========================================
  
  useEffect(() => {
    if (modelsLoaded && templatesLoaded && showWebcam && !loading && !isProcessingEmbedding) {
      startContinuousDetection();
    }
    
    return () => {
      stopContinuousDetection();
    };
  }, [modelsLoaded, templatesLoaded, showWebcam, loading, isProcessingEmbedding]);

  const startContinuousDetection = () => {
    if (detectionIntervalRef.current) return;
    
    // Detecção a cada 350ms (otimizado para PCs fracos)
    detectionIntervalRef.current = setInterval(async () => {
      await detectFaceInRealTime();
    }, DETECTION_INTERVAL);
  };

  const stopContinuousDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
  };

  // Validar vídeo antes da detecção
  const isVideoReady = () => {
    if (!webcamRef.current) return false;
    const video = webcamRef.current.video;
    return video && 
           video.readyState >= 2 && 
           video.videoWidth > 0 && 
           video.videoHeight > 0;
  };

  // Detecção LEVE - SÓ detecta rosto, NÃO gera embedding
  const detectFaceInRealTime = async () => {
    // LOCK: NÃO executar se estiver processando
    if (processingRef.current || loading || isProcessingEmbedding) return;
    
    // Validar vídeo
    if (!isVideoReady()) {
      setGuidanceMessage('Aguardando câmera...');
      return;
    }
    
    const video = webcamRef.current.video;
    
    try {
      // Detecção LEVE (inputSize: 128) - muito rápida
      const detection = await faceapi.detectSingleFace(video, DETECTION_OPTIONS);
      
      if (detection && !processingRef.current) {
        // Validar box da detecção (evitar erro de caixa inválida)
        const box = detection.box;
        if (!box || box.width <= 0 || box.height <= 0 || isNaN(box.x) || isNaN(box.y)) {
          console.warn('Detecção com caixa inválida, ignorando frame');
          return;
        }
        
        const score = detection.score;
        setDetectionScore(Math.round(score * 100));
        setFaceDetected(true);
        
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // Verificar centralização
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const isXCentered = Math.abs(centerX - videoWidth / 2) < videoWidth * 0.25;
        const isYCentered = Math.abs(centerY - videoHeight / 2) < videoHeight * 0.30;
        
        // Verificar tamanho mínimo
        const faceArea = box.width * box.height;
        const minArea = videoWidth * videoHeight * 0.03;
        const isBigEnough = faceArea > minArea;
        
        const isValid = score >= DETECTION_CONFIDENCE && isXCentered && isYCentered && isBigEnough;
        
        // Atualizar mensagem de orientação
        if (!isXCentered || !isYCentered) {
          setGuidanceMessage('Centralize o rosto na área marcada');
        } else if (!isBigEnough) {
          setGuidanceMessage('Aproxime-se da câmera');
        } else if (score < DETECTION_CONFIDENCE) {
          setGuidanceMessage('Melhore a iluminação do ambiente');
        } else {
          setGuidanceMessage('Mantenha o rosto estável');
        }
        
        if (isValid && !processingRef.current) {
          setFaceValid(true);
          
          // Controle de estabilidade
          if (!lastValidDetectionRef.current) {
            lastValidDetectionRef.current = Date.now();
          }
          
          const stableTime = Date.now() - lastValidDetectionRef.current;
          const progress = Math.min(100, (stableTime / STABILITY_TIME) * 100);
          setStabilityProgress(progress);
          
          // Captura automática
          if (stableTime >= STABILITY_TIME && !stabilityTimerRef.current && !processingRef.current && autoCaptureEnabled && autoAttemptsRef.current < MAX_AUTO_ATTEMPTS) {
            stabilityTimerRef.current = setTimeout(() => {
              if (!processingRef.current && autoAttemptsRef.current < MAX_AUTO_ATTEMPTS) {
                autoAttemptsRef.current += 1;
                setAutoAttempts(autoAttemptsRef.current);
                captureAndIdentify(true);
              }
            }, 100);
          }
        } else {
          resetStability();
        }
      } else {
        setFaceDetected(false);
        setFaceValid(false);
        setDetectionScore(0);
        setGuidanceMessage('Posicione o rosto no centro da câmera');
        resetStability();
      }
    } catch (error) {
      // Tratar erros silenciosamente para não travar a tela
      console.warn('Erro na detecção (frame ignorado):', error.message);
    }
  };

  const resetStability = () => {
    setFaceValid(false);
    setStabilityProgress(0);
    lastValidDetectionRef.current = null;
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
  };

  // ========================================
  // CAPTURA E IDENTIFICAÇÃO (OTIMIZADA)
  // ========================================
  
  const captureAndIdentify = async (isAutoCapture = false) => {
    // LOCK: Evitar múltiplas execuções simultâneas
    if (processingRef.current) {
      console.log('Identificação já em andamento - ignorando');
      return;
    }
    
    if (isProcessingEmbedding || !webcamRef.current) return;
    
    console.log(`Iniciando identificação (auto: ${isAutoCapture})`);
    processingRef.current = true;
    
    // Parar detecção antes de processar
    stopContinuousDetection();
    
    // Aguardar intervalo parar completamente
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setIsProcessingEmbedding(true);
    setLoading(true);
    setLoadingStatus('Capturando...');
    
    try {
      // Capturar screenshot
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Erro ao capturar imagem');
        resetAfterProcess(isAutoCapture);
        return;
      }
      
      setCapturedPhoto(imageSrc);
      setLoadingStatus('Gerando vetor facial...');
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });
      
      // Usar opções otimizadas para embedding
      const detection = await faceapi
        .detectSingleFace(img, EMBEDDING_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
        toast.error('Rosto não detectado na captura. Tente novamente.');
        resetAfterProcess(isAutoCapture);
        return;
      }
      
      // Buscar no cache (OTIMIZADO)
      setLoadingStatus('Identificando...');
      let bestMatch = { employee: null, score: 0 };
      
      // Comparação otimizada - apenas com templates ativos
      for (const cached of facialTemplatesCache) {
        // Futuro: adicionar filtro por setor/empresa aqui
        // if (filterBySector && cached.sector !== currentSector) continue;
        
        try {
          const distance = faceapi.euclideanDistance(detection.descriptor, cached.descriptor);
          const similarity = 1 - distance;
          
          if (similarity > bestMatch.score) {
            bestMatch = { employee: cached.employee, score: similarity };
          }
        } catch (e) {
          console.warn('Erro ao comparar template:', e);
        }
      }
      
      // Verificar resultado
      if (bestMatch.score >= SIMILARITY_THRESHOLD && bestMatch.employee) {
        const percentMatch = Math.round(bestMatch.score * 100);
        toast.success(`${bestMatch.employee.full_name} identificado! (${percentMatch}%)`);
        setFacialMatch({ score: bestMatch.score, verified: true });
        setSelectedEmployee(bestMatch.employee);
        await fetchEmployeeHistory(bestMatch.employee.id);
        
        setLoadingStatus('');
        setLoading(false);
        setIsProcessingEmbedding(false);
        
        // Resetar contadores
        autoAttemptsRef.current = 0;
        setAutoAttempts(0);
        setAutoCaptureEnabled(true);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
        setShowWebcam(false);
        setStep('delivery');
      } else {
        const percentMatch = Math.round(bestMatch.score * 100);
        setNotFoundMessage({
          message: 'Colaborador não encontrado',
          bestScore: percentMatch,
          threshold: Math.round(SIMILARITY_THRESHOLD * 100)
        });
        
        if (isAutoCapture && autoAttemptsRef.current >= MAX_AUTO_ATTEMPTS) {
          setAutoCaptureEnabled(false);
          toast.error('Não reconhecido. Use a captura manual ou selecione o colaborador.');
        } else {
          toast.error(`Não reconhecido (${percentMatch}% similaridade)`);
        }
        
        resetAfterProcess(isAutoCapture);
      }
    } catch (error) {
      console.error('Erro na identificação:', error);
      toast.error('Erro ao processar. Tente novamente.');
      resetAfterProcess(isAutoCapture);
    } finally {
      setLoading(false);
      setLoadingStatus('');
      setIsProcessingEmbedding(false);
      processingRef.current = false;
    }
  };

  const resetAfterProcess = (wasAutoCapture = false) => {
    setIsProcessingEmbedding(false);
    resetStability();
    
    if (wasAutoCapture && autoAttemptsRef.current >= MAX_AUTO_ATTEMPTS) {
      console.log('Limite de tentativas automáticas atingido');
      setTimeout(() => {
        if (showWebcam) startContinuousDetection();
      }, 2000);
      return;
    }
    
    setTimeout(() => {
      if (showWebcam) startContinuousDetection();
    }, 1000);
  };

  // Função para identificar manualmente
  const searchByFace = async () => {
    if (loading || isProcessingEmbedding) return;
    setNotFoundMessage(null);
    autoAttemptsRef.current = 0;
    setAutoAttempts(0);
    setAutoCaptureEnabled(true);
    await captureAndIdentify(false);
  };

  const fetchEPIs = async () => {
    try {
      const response = await axios.get(`${API}/epis`, { headers: getAuthHeader() });
      setEpis(response.data);
    } catch (error) {
      console.error('Erro ao buscar EPIs:', error);
    }
  };

  const fetchKits = async () => {
    try {
      const response = await axios.get(`${API}/kits`, { headers: getAuthHeader() });
      setKits(response.data);
    } catch (error) {
      console.error('Erro ao buscar Kits:', error);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await axios.get(`${API}/employees`, { headers: getAuthHeader() });
      setAllEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
    }
  };

  const fetchEmployeeHistory = async (employeeId) => {
    try {
      const response = await axios.get(`${API}/deliveries?employee_id=${employeeId}`, {
        headers: getAuthHeader()
      });
      setEmployeeHistory(response.data);
      
      const itemsMap = {};
      response.data.forEach(delivery => {
        if (delivery.items) {
          delivery.items.forEach(item => {
            const key = item.epi_id || item.name;
            const name = item.epi_name || item.name;
            if (!itemsMap[key]) {
              itemsMap[key] = { name, quantity: 0, deliveries: [] };
            }
            if (delivery.is_return) {
              itemsMap[key].quantity -= item.quantity;
            } else {
              itemsMap[key].quantity += item.quantity;
              itemsMap[key].deliveries.push(delivery.created_at);
            }
          });
        }
      });
      
      const currentItems = Object.entries(itemsMap)
        .filter(([_, v]) => v.quantity > 0)
        .map(([id, v]) => ({ id, ...v }));
      setEmployeeCurrentItems(currentItems);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const handleQRScan = async (qrCode) => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (e) {
        console.log('Error stopping scanner:', e);
      }
      qrScannerRef.current = null;
    }
    setShowQRScanner(false);
    
    const epi = epis.find(e => e.qr_code === qrCode);
    if (epi) {
      addItem(epi);
      toast.success(`EPI ${epi.name} adicionado`);
    } else {
      toast.error('QR Code não corresponde a nenhum EPI cadastrado');
    }
  };

  const startQRScanner = async () => {
    setShowQRScanner(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      qrScannerRef.current = html5Qrcode;
      
      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleQRScan(decodedText);
        },
        (errorMessage) => {}
      );
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err);
      toast.error('Erro ao acessar câmera para QR Code');
      setShowQRScanner(false);
    }
  };
  
  const stopQRScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (e) {
        console.log('Error stopping scanner:', e);
      }
      qrScannerRef.current = null;
    }
    setShowQRScanner(false);
  };

  const addItem = (epi) => {
    if (!selectedItems.find(item => item.epi_id === epi.id)) {
      setSelectedItems([...selectedItems, {
        epi_id: epi.id,
        name: epi.name,
        quantity: 1,
        size: epi.size,
        batch: epi.batch,
        qr_code: epi.qr_code,
        ca_number: epi.ca_number
      }]);
    }
  };

  const addKit = (kit) => {
    kit.items.forEach(kitItem => {
      if (!selectedItems.find(item => item.epi_id === kitItem.epi_id)) {
        setSelectedItems(prev => [...prev, {
          epi_id: kitItem.epi_id,
          name: kitItem.name,
          quantity: kitItem.quantity,
          ca_number: kitItem.ca_number,
          from_kit: kit.name
        }]);
      }
    });
    toast.success(`Kit "${kit.name}" adicionado com ${kit.items.length} itens`);
  };

  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Função para mostrar termo de consentimento antes de confirmar
  // Função para confirmar entrega - agora sem termo (consentimento é no cadastro da biometria)
  const handleConfirmDelivery = async () => {
    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    if (!facialMatch?.verified) {
      toast.error('Verificação facial obrigatória');
      return;
    }
    // Chamar diretamente a entrega (consentimento já foi dado no cadastro da biometria)
    await completeDelivery();
  };

  const completeDelivery = async () => {
    setLoading(true);
    
    try {
      let photoPath = null;
      if (capturedPhoto) {
        try {
          const photoRes = await axios.post(
            `${API}/deliveries/save-photo`,
            new URLSearchParams({
              employee_id: selectedEmployee.id,
              photo_data: capturedPhoto
            }),
            { headers: { ...getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          photoPath = photoRes.data.photo_path;
        } catch (e) {
          console.error('Erro ao salvar foto:', e);
        }
      }

      await axios.post(
        `${API}/deliveries`,
        {
          employee_id: selectedEmployee.id,
          delivery_type: deliveryType,
          is_return: deliveryType === 'return',
          facial_match_score: facialMatch?.score,
          facial_photo_path: photoPath,
          items: selectedItems
        },
        { headers: getAuthHeader() }
      );

      toast.success(
        deliveryType === 'delivery' 
          ? 'Entrega registrada com sucesso!' 
          : 'Devolução registrada com sucesso!'
      );
      
      resetForm();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      toast.error(error.response?.data?.detail || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    stopContinuousDetection();
    
    setStep('facial');
    setSelectedEmployee(null);
    setFacialMatch(null);
    setSelectedItems([]);
    setEmployeeHistory([]);
    setEmployeeCurrentItems([]);
    setCapturedPhoto(null);
    setNotFoundMessage(null);
    setShowWebcam(true);
    setConsentAccepted(false);
    autoAttemptsRef.current = 0;
    setAutoAttempts(0);
    setAutoCaptureEnabled(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="entrega-epi-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Entrega de EPI</h1>
          <p className="text-slate-600 mt-1">Registre entregas e devoluções via reconhecimento facial</p>
        </div>

        {/* ETAPA 1: RECONHECIMENTO FACIAL OBRIGATÓRIO */}
        <div 
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6"
          style={{ display: step === 'facial' ? 'block' : 'none' }}
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <ScanFace className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Identificação Obrigatória</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Posicione o rosto do colaborador na câmera para identificação biométrica. 
                  A entrega só pode ser realizada após confirmação facial.
                </p>
              </div>
            </div>
          </div>
          
          {/* Dicas de iluminação */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Dicas para melhor reconhecimento:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700">
                  <li>Use o reconhecimento em local bem iluminado</li>
                  <li>Mantenha o rosto centralizado e estável</li>
                  <li>Se a identificação demorar, tente a captura manual</li>
                </ul>
              </div>
            </div>
          </div>
            
          {/* Status de carregamento */}
          <div className={loadingStatus ? 'flex items-center justify-center gap-3 py-3 px-4 bg-slate-100 rounded-lg mb-4' : 'hidden'}>
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-700">{loadingStatus}</span>
          </div>
          
          {/* Info de templates carregados */}
          <div className={templatesLoaded && facialTemplatesCache.length > 0 ? 'flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg mb-4' : 'hidden'}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{facialTemplatesCache.length} colaborador(es) com biometria cadastrada</span>
          </div>
          
          <div className={templatesLoaded && facialTemplatesCache.length === 0 ? 'p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4' : 'hidden'}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Nenhum colaborador com biometria cadastrada</p>
                <p className="text-sm text-amber-700 mt-1">
                  Para usar o reconhecimento facial, é necessário cadastrar o template facial na ficha do colaborador 
                  (aba "Biometria Facial").
                </p>
                <Button
                  onClick={() => navigate('/colaboradores')}
                  className="mt-3 bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ir para Colaboradores
                </Button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          <div className={!modelsLoaded || !templatesLoaded ? 'flex flex-col items-center justify-center py-12 px-6' : 'hidden'}>
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500"></div>
                </div>
              </div>
              
              <p className="text-slate-700 text-center font-medium text-lg mb-4">
                {loadingStatus || 'Preparando sistema...'}
              </p>
              
              <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-slate-500 text-center text-sm">
                {loadingProgress}% concluído
              </p>
            </div>
          </div>
          
          {/* Webcam section */}
          <div className={modelsLoaded && templatesLoaded ? 'max-w-xl mx-auto' : 'hidden'}>
            <div className={templateCount > 0 ? 'flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg mb-4' : 'hidden'}>
              <ScanFace className="w-4 h-4" />
              <span>{templateCount} colaborador(es) com biometria cadastrada</span>
            </div>
            
            <div className={showWebcam ? 'block' : 'hidden'}>
              {/* Status de detecção em tempo real */}
              <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Status da Detecção</span>
                  <span className={`text-sm font-bold ${faceValid ? 'text-emerald-600' : faceDetected ? 'text-amber-600' : 'text-slate-400'}`}>
                    {faceValid ? 'Rosto Válido' : faceDetected ? 'Ajuste posição' : 'Aguardando rosto'}
                  </span>
                </div>
                
                {/* Mensagem de orientação */}
                <p className="text-xs text-slate-600 mb-2">{guidanceMessage}</p>
                
                {/* Barra de estabilidade */}
                <div className={faceValid ? 'space-y-1' : 'hidden'}>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Estabilidade</span>
                    <span>{Math.round(stabilityProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${stabilityProgress}%` }}
                    ></div>
                  </div>
                  <p className={stabilityProgress >= 100 ? 'text-xs text-emerald-600 font-medium animate-pulse' : 'hidden'}>
                    Capturando automaticamente...
                  </p>
                </div>
                
                {/* Indicador de confiança */}
                <div className={faceDetected ? 'mt-2 text-xs text-slate-500' : 'hidden'}>
                  Confiança: {detectionScore}% {detectionScore >= 65 ? '(OK)' : '(mova para frente)'}
                </div>
              </div>
                
              {/* Webcam Container - Otimizado para 640x480 */}
              <div 
                className="relative mx-auto bg-slate-900 rounded-xl overflow-hidden"
                style={{ 
                  maxWidth: '640px', 
                  aspectRatio: '4/3'
                }}
              >
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.8}
                  className={`absolute inset-0 w-full h-full object-cover rounded-lg border-4 transition-colors duration-300 ${
                    faceValid ? 'border-emerald-400' : faceDetected ? 'border-amber-400' : 'border-blue-300'
                  }`}
                  videoConstraints={{
                    facingMode: "user",
                    width: { ideal: 640, max: 640 },
                    height: { ideal: 480, max: 480 },
                    frameRate: { ideal: 15, max: 20 }
                  }}
                  mirrored={true}
                />
                
                {/* Guia de posicionamento */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-32 h-40 sm:w-44 sm:h-56 md:w-52 md:h-64 border-4 border-dashed rounded-3xl transition-colors duration-300 ${
                    faceValid ? 'border-emerald-400 opacity-90' : faceDetected ? 'border-amber-400 opacity-80' : 'border-blue-400 opacity-60'
                  }`}>
                    <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 border-t-4 border-l-4 rounded-tl-lg border-current"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 border-t-4 border-r-4 rounded-tr-lg border-current"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 border-b-4 border-l-4 rounded-bl-lg border-current"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 border-b-4 border-r-4 rounded-br-lg border-current"></div>
                  </div>
                </div>
                
                {/* Overlay de loading */}
                <div 
                  className="absolute inset-0 bg-black/70 flex items-center justify-center"
                  style={{ display: loading && loadingStatus ? 'flex' : 'none' }}
                >
                  <div className="bg-white px-6 py-4 rounded-xl flex flex-col items-center gap-3 shadow-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="font-medium text-slate-700">{loadingStatus}</span>
                  </div>
                </div>
              </div>
                  
              <p className={`text-center text-sm mt-3 mb-4 ${faceValid ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                {faceValid 
                  ? 'Mantenha a posição para captura automática' 
                  : guidanceMessage}
              </p>
              
              {/* Mensagem de não encontrado */}
              <div className={notFoundMessage ? 'mb-4 p-4 bg-red-50 border border-red-200 rounded-lg' : 'hidden'}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">{notFoundMessage?.message}</p>
                    <p className="text-sm text-red-600 mt-1">
                      Similaridade: {notFoundMessage?.bestScore}% (mínimo necessário: {notFoundMessage?.threshold}%)
                    </p>
                    <Button
                      onClick={() => navigate('/colaboradores')}
                      className="mt-3 bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar Novo Colaborador
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Botão de identificação manual */}
              <button
                onClick={searchByFace}
                disabled={loading || facialTemplatesCache.length === 0}
                className={`w-full font-medium rounded-lg px-4 py-4 flex items-center justify-center gap-2 text-lg transition-all duration-300 ${
                  loading 
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : faceValid 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                      : faceDetected 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-blue-400 hover:bg-blue-500 text-white opacity-80'
                }`}
                data-testid="facial-identify-button"
              >
                <span className={loading ? 'flex items-center gap-2' : 'hidden'}>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {loadingStatus || 'Identificando...'}
                </span>
                <span className={!loading && faceValid ? 'flex items-center gap-2' : 'hidden'}>
                  <CheckCircle2 className="w-6 h-6" />
                  Capturar Agora (ou aguarde)
                </span>
                <span className={!loading && !faceValid && faceDetected ? 'flex items-center gap-2' : 'hidden'}>
                  <ScanFace className="w-6 h-6" />
                  Ajuste a Posição
                </span>
                <span className={!loading && !faceValid && !faceDetected ? 'flex items-center gap-2' : 'hidden'}>
                  <ScanFace className="w-6 h-6" />
                  Aguardando Rosto...
                </span>
              </button>
            </div>
          </div>
        </div>

        <div 
          className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          style={{ display: step === 'facial' ? 'block' : 'none' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 flex-1">
              <p className="font-medium">Colaborador não reconhecido?</p>
              <p className="mb-3">Se o colaborador não for identificado, selecione manualmente:</p>
              <select
                onChange={async (e) => {
                  if (!e.target.value) return;
                  const employee = allEmployees.find(emp => emp.id === e.target.value);
                  if (employee) {
                    setSelectedEmployee(employee);
                    await fetchEmployeeHistory(employee.id);
                    setShowWebcam(false);
                    setStep('delivery');
                    toast.success(`${employee.full_name} selecionado manualmente`);
                  }
                }}
                className="w-full p-2 rounded border border-amber-300 bg-white text-sm"
                data-testid="manual-employee-select"
              >
                <option value="">Selecionar colaborador...</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.cpf || emp.registration || 'Sem CPF'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ETAPA 2: ENTREGA/DEVOLUÇÃO */}
        <div 
          className="space-y-6"
          style={{ display: step === 'delivery' && selectedEmployee ? 'block' : 'none' }}
        >
          {/* Info do Colaborador */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-emerald-200 shadow-md flex-shrink-0">
                {(capturedPhoto || selectedEmployee?.photo_path) ? (
                  <img 
                    src={capturedPhoto || getUploadUrl(selectedEmployee.photo_path)}
                    alt={selectedEmployee?.full_name || ''}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-10 h-10 text-emerald-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xl text-slate-900">{selectedEmployee?.full_name || ''}</p>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    Verificado
                  </span>
                </div>
                <p className="text-sm text-slate-600">Matrícula: {selectedEmployee?.registration_number || 'N/A'}</p>
                <p className="text-sm text-slate-600">Setor: {selectedEmployee?.department || 'N/A'}</p>
              </div>
              <button
                onClick={() => setShowHistoryDialog(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md px-4 py-2 flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
            </div>

            {/* EPIs em uso */}
            <div className={employeeCurrentItems.length > 0 ? 'p-4 bg-amber-50 border border-amber-200 rounded-lg' : 'hidden'}>
              <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                EPIs em Uso Atualmente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {employeeCurrentItems.map((item, idx) => (
                  <div key={item.id || `item-${item.name}-${idx}`} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                    <span className="text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="text-sm text-amber-700">Qtd: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seleção de Itens */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Registrar Movimentação</h2>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`flex-1 py-3 rounded-md font-medium transition-all ${
                  deliveryType === 'delivery'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="delivery-type-delivery"
              >
                Entrega
              </button>
              <button
                onClick={() => setDeliveryType('return')}
                className={`flex-1 py-3 rounded-md font-medium transition-all ${
                  deliveryType === 'return'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="delivery-type-return"
              >
                Devolução
              </button>
            </div>

            {/* Seleção de Kit */}
            <div className={kits.length > 0 ? 'mb-4' : 'hidden'}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Entregar Kit Completo:
              </label>
              <select
                onChange={(e) => {
                  const kit = kits.find(k => k.id === e.target.value);
                  if (kit) addKit(kit);
                  e.target.value = '';
                }}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                data-testid="select-kit"
              >
                <option value="">Selecione um Kit...</option>
                {kits.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.name} {kit.sector ? `(${kit.sector})` : ''} - {kit.items?.length || 0} itens
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={startQRScanner}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-md px-4 py-3 flex items-center justify-center gap-2 mb-4"
              data-testid="start-qr-scanner"
              style={{ display: showQRScanner ? 'none' : 'flex' }}
            >
              <QrCode className="w-5 h-5" />
              Escanear QR Code
            </button>

            {/* QR Scanner Container */}
            <div 
              className="mb-4"
              style={{ display: showQRScanner ? 'block' : 'none' }}
            >
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">Escaneando QR Code...</span>
                  <button
                    onClick={stopQRScanner}
                    className="text-slate-500 hover:text-slate-700 p-1"
                    data-testid="stop-qr-scanner"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div 
                  id="qr-reader" 
                  className="mx-auto overflow-hidden rounded-lg"
                  style={{ maxWidth: '300px' }}
                ></div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Aponte a câmera para o QR Code do EPI
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ou selecione item individual:
              </label>
              <select
                onChange={(e) => {
                  const epi = epis.find(ep => ep.id === e.target.value);
                  if (epi) addItem(epi);
                  e.target.value = '';
                }}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                data-testid="select-epi"
              >
                <option value="">Selecione um EPI...</option>
                {epis.map((epi) => (
                  <option key={epi.id} value={epi.id}>
                    {epi.name} - CA: {epi.ca_number} - Estoque: {epi.current_stock}
                  </option>
                ))}
              </select>
            </div>

            <div className={selectedItems.length > 0 ? 'space-y-2 mb-6' : 'hidden'}>
              <p className="text-sm font-medium text-slate-700">Itens selecionados ({selectedItems.length}):</p>
              {selectedItems.map((item, index) => (
                <div key={item.id || `selected-${item.name}-${index}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">
                      CA: {item.ca_number || 'N/A'} | Qtd: {item.quantity}
                      <span className={item.from_kit ? 'text-blue-600 ml-2' : 'hidden'}>(Kit: {item.from_kit})</span>
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelivery}
                disabled={loading || selectedItems.length === 0}
                data-testid="complete-delivery"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{loading ? 'Processando...' : 'Confirmar'}</span>
              </button>
              <button
                onClick={resetForm}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md px-6 py-3"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        {/* Dialog de Histórico */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico - {selectedEmployee?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className={employeeHistory.length === 0 ? 'text-center text-slate-500 py-8' : 'hidden'}>
                Nenhuma movimentação registrada
              </p>
              <div className={employeeHistory.length > 0 ? 'space-y-3' : 'hidden'}>
                {employeeHistory.map((delivery, idx) => (
                  <div key={delivery.id || `delivery-${delivery.created_at}-${idx}`} className={`p-4 rounded-lg border ${delivery.is_return ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${delivery.is_return ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {delivery.is_return ? 'Devolução' : 'Entrega'}
                      </span>
                      <span className="text-sm text-slate-600">
                        {new Date(delivery.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {delivery.items?.map((item, i) => (
                        <p key={`${delivery.id || delivery.created_at}-item-${i}`} className="text-sm text-slate-700">
                          • {item.epi_name || item.name} (Qtd: {item.quantity})
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
