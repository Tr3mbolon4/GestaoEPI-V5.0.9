import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ArrowLeft, User, Package, AlertTriangle, Calendar, History, ScanFace, CheckCircle, Trash2, Loader2, Camera, Upload, Printer, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { getUploadUrl, logImageError } from '@/utils/imageUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Threshold para verificação de duplicidade
const DUPLICATE_THRESHOLD = 0.40;

// Configurações otimizadas para captura rápida
const FAST_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,       // Menor = mais rápido para detecção em tempo real
  scoreThreshold: 0.5   // Threshold médio para boa detecção
});

export default function ColaboradorDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [colaborador, setColaborador] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [itemsEmUso, setItemsEmUso] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumo');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoWebcam, setShowPhotoWebcam] = useState(false);
  const photoInputRef = useRef(null);
  const photoWebcamRef = useRef(null);
  
  // Estados para alertas do colaborador
  const [employeeAlerts, setEmployeeAlerts] = useState({ pending_epis: [], replacement_due: [], total_alerts: 0 });
  
  // Estados para biometria facial
  const [facialTemplates, setFacialTemplates] = useState([]);
  const [webcamActive, setWebcamActive] = useState(false);  // Controla visibilidade via CSS
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturingFace, setCapturingFace] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);  // Canvas fixo para overlay
  const detectionIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastFaceStatusRef = useRef(null);
  const processingRef = useRef(false);
  
  // Estados para consentimento LGPD
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [pendingDescriptor, setPendingDescriptor] = useState(null);
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  
  // Estados para verificação de duplicidade
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    loadFaceModels();
    
    return () => {
      isMountedRef.current = false;
      
      // Limpar intervalo ao desmontar
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      
      // Limpar canvas (não remover, só limpar conteúdo)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      // Parar media streams
      [photoWebcamRef, webcamRef].forEach(ref => {
        if (ref.current?.video?.srcObject) {
          const stream = ref.current.video.srcObject;
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [id]);
  
  // Controlar detecção quando tab muda (só desativa, não desmonta)
  useEffect(() => {
    if (activeTab !== 'biometria') {
      // Parar detecção mas NÃO desmontar webcam
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setWebcamActive(false);
      setFaceDetected(false);
      // Parar câmera quando sai da tab
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [activeTab]);
  
  // Detecção contínua de rosto para feedback em tempo real
  useEffect(() => {
    if (webcamActive && modelsLoaded && webcamRef.current) {
      let isActive = true;
      
      detectionIntervalRef.current = setInterval(async () => {
        // NÃO executar se estiver processando ou inativo
        if (!isActive || !isMountedRef.current || !webcamRef.current || capturingFace || processingRef.current) return;
        
        try {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc && isActive && isMountedRef.current && !processingRef.current) {
            // Criar imagem manualmente (não usar faceapi.fetchImage que pode manipular DOM)
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = imageSrc;
            });
            
            const detection = await faceapi.detectSingleFace(img, FAST_DETECTOR_OPTIONS);
            const detected = !!detection && detection.score > 0.6;
            
            // Só atualizar estado se mudou E não está processando
            if (isActive && isMountedRef.current && lastFaceStatusRef.current !== detected && !processingRef.current) {
              lastFaceStatusRef.current = detected;
              setFaceDetected(detected);
            }
          }
        } catch (e) {
          // Ignorar erros silenciosos durante detecção contínua
        }
      }, 500);
      
      return () => {
        isActive = false;
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      };
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      lastFaceStatusRef.current = null;
    }
  }, [webcamActive, modelsLoaded, capturingFace]);
  
  const loadFaceModels = useCallback(async () => {
    try {
      // Usar CDN para modelos oficiais do face-api.js
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar modelos faciais:', error);
    }
  }, []);
  
  const fetchFacialTemplates = async () => {
    try {
      const res = await axios.get(`${API}/employees/${id}/facial-templates`, { headers: getAuthHeader() });
      setFacialTemplates(res.data);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [colabRes, deliveriesRes, templatesRes, consentRes, alertsRes] = await Promise.all([
        axios.get(`${API}/employees/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/deliveries?employee_id=${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/employees/${id}/facial-templates`, { headers: getAuthHeader() }).catch(() => ({ data: [] })),
        axios.get(`${API}/employees/${id}/biometric-consent`, { headers: getAuthHeader() }).catch(() => ({ data: { has_consent: false } })),
        axios.get(`${API}/alerts/employee/${id}`, { headers: getAuthHeader() }).catch(() => ({ data: { pending_epis: [], replacement_due: [], total_alerts: 0 } }))
      ]);
      
      setColaborador(colabRes.data);
      setHistorico(deliveriesRes.data);
      setFacialTemplates(templatesRes.data);
      setHasConsent(consentRes.data.has_consent || colabRes.data.facial_consent || false);
      setEmployeeAlerts(alertsRes.data);
      
      // Calcular itens em uso
      const itemsMap = {};
      deliveriesRes.data.forEach(delivery => {
        if (delivery.items) {
          delivery.items.forEach(item => {
            const key = item.epi_id || item.tool_id || item.name;
            const name = item.epi_name || item.tool_name || item.name;
            if (!itemsMap[key]) {
              itemsMap[key] = { 
                name, 
                quantity: 0, 
                lastDelivery: null,
                epiData: item
              };
            }
            if (delivery.is_return) {
              itemsMap[key].quantity -= item.quantity;
            } else {
              itemsMap[key].quantity += item.quantity;
              itemsMap[key].lastDelivery = delivery.created_at;
            }
          });
        }
      });
      
      const items = Object.entries(itemsMap)
        .filter(([_, v]) => v.quantity > 0)
        .map(([id, v]) => ({ id, ...v }));
      setItemsEmUso(items);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do colaborador');
    } finally {
      setLoading(false);
    }
  };

  const isNearExpiry = (date) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };
  
  // Função otimizada de captura - RÁPIDA e com feedback
  const captureFacialTemplate = useCallback(async () => {
    // 🔒 LOCK: Evitar múltiplas execuções simultâneas
    if (processingRef.current) {
      console.log('⚠️ CAPTURA JÁ EM ANDAMENTO - IGNORANDO');
      return;
    }
    
    if (!isMountedRef.current || !webcamRef.current || !modelsLoaded) {
      toast.error('Câmera ou modelos não carregados');
      return;
    }
    
    if (!faceDetected) {
      toast.error('Posicione o rosto na área verde antes de capturar');
      return;
    }
    
    console.log('🔒 INICIANDO CAPTURA - TRAVANDO PROCESSAMENTO');
    processingRef.current = true;  // 🔒 TRAVAR
    
    // 🔴 CRÍTICO: Parar o loop ANTES de qualquer coisa
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      console.log('✅ Loop de detecção PARADO');
    }
    
    setCapturingFace(true);
    setCaptureStatus('Capturando imagem...');
    setDuplicateError(null);
    
    // Aguardar para garantir que o intervalo parou
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      // Capturar screenshot de alta qualidade
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Não foi possível capturar a imagem da câmera');
        if (isMountedRef.current) {
          setCapturingFace(false);
          setCaptureStatus('');
        }
        return;
      }
      
      if (isMountedRef.current) {
        setCaptureStatus('Processando imagem...');
      }
      
      // 🔥 NÃO usar faceapi.fetchImage() - criar Image manualmente
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });
      
      if (!isMountedRef.current) return;
      
      setCaptureStatus('Detectando face...');
      
      // Usar configuração otimizada para detecção
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 608,
        scoreThreshold: 0.4
      });
      
      const detection = await faceapi
        .detectSingleFace(img, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!isMountedRef.current) return;
      
      if (!detection) {
        toast.error('Rosto não detectado. Certifique-se de que o rosto está bem iluminado e centralizado.');
        if (isMountedRef.current) {
          setCapturingFace(false);
          setCaptureStatus('');
        }
        return;
      }
      
      console.log('Detecção:', {
        score: detection.detection.score,
        landmarks: detection.landmarks.positions.length,
        descriptor: detection.descriptor.length
      });
      
      // Verificar qualidade mínima
      if (detection.detection.score < 0.5) {
        toast.error(`Qualidade baixa (${Math.round(detection.detection.score * 100)}%). Melhore a iluminação e tente novamente.`);
        if (isMountedRef.current) {
          setCapturingFace(false);
          setCaptureStatus('');
        }
        return;
      }
      
      if (!isMountedRef.current) return;
      
      // Converter descriptor para array
      const descriptorArray = Array.from(detection.descriptor);
      const descriptorJson = JSON.stringify(descriptorArray);
      
      // VERIFICAR DUPLICIDADE
      setCaptureStatus('Verificando duplicidade...');
      setCheckingDuplicate(true);
      
      try {
        const duplicateCheck = await axios.post(
          `${API}/biometric/check-duplicate`,
          { 
            descriptor: descriptorJson,
            employee_id: id  // Ignorar o próprio colaborador
          },
          { headers: getAuthHeader() }
        );
        
        if (duplicateCheck.data.is_duplicate) {
          setDuplicateError(duplicateCheck.data);
          toast.error(`Biometria duplicada! Esta foto pertence a: ${duplicateCheck.data.duplicate_employee_name}`);
          if (isMountedRef.current) {
            setCapturingFace(false);
            setCaptureStatus('');
            setCheckingDuplicate(false);
          }
          return;
        }
      } catch (dupError) {
        console.error('Erro na verificação de duplicidade:', dupError);
        // Continuar mesmo se a verificação falhar
      }
      
      setCheckingDuplicate(false);
      
      // VERIFICAR CONSENTIMENTO LGPD
      if (!hasConsent) {
        // Guardar dados para depois do consentimento
        setPendingDescriptor(descriptorJson);
        setPendingImageSrc(imageSrc);
        setShowConsentDialog(true);
        setCaptureStatus('Aguardando consentimento...');
        return;
      }
      
      // Já tem consentimento, salvar diretamente
      await saveFacialTemplate(descriptorJson);
      
    } catch (error) {
      console.error('Erro ao processar facial:', error);
      if (error.response?.data?.detail) {
        toast.error(`Erro: ${error.response.data.detail}`);
      } else if (error.message) {
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.error('Erro ao processar reconhecimento facial. Tente novamente.');
      }
    } finally {
      if (isMountedRef.current) {
        setCapturingFace(false);
        setCaptureStatus('');
      }
      console.log('🔓 LIBERANDO LOCK DE PROCESSAMENTO');
      processingRef.current = false;  // 🔓 LIBERAR
    }
  }, [faceDetected, modelsLoaded, id, hasConsent]);
  
  // Função para salvar o template facial após validações
  const saveFacialTemplate = async (descriptorJson) => {
    setCaptureStatus('Salvando template...');
    
    try {
      const response = await axios.post(
        `${API}/employees/${id}/facial-templates`,
        { descriptor: descriptorJson },
        { headers: getAuthHeader() }
      );
      
      if (!isMountedRef.current) return;
      
      if (response.status === 200 || response.status === 201) {
        toast.success('✓ Template facial cadastrado com sucesso!');
        
        console.log('✅ CAPTURA CONCLUÍDA COM SUCESSO');
        
        // Parar o loop de detecção
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
        
        // Parar a câmera
        if (webcamRef.current?.video?.srcObject) {
          const stream = webcamRef.current.video.srcObject;
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Limpar canvas (não remover, só limpar)
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        // Limpar estados - SEM desmontar componentes
        setCaptureStatus('');
        setCapturingFace(false);
        setFaceDetected(false);
        lastFaceStatusRef.current = null;
        processingRef.current = false;
        setPendingDescriptor(null);
        setPendingImageSrc(null);
        
        // Esconder webcam via CSS (não desmonta)
        setWebcamActive(false);
        
        // Recarregar templates
        setTimeout(() => fetchFacialTemplates(), 200);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template facial');
      throw error;
    }
  };
  
  // Função para processar consentimento e salvar template
  const handleConsentAccept = async () => {
    if (!consentAccepted) {
      toast.error('Você precisa aceitar o termo para continuar');
      return;
    }
    
    try {
      // Registrar consentimento no backend
      await axios.post(
        `${API}/employees/${id}/biometric-consent`,
        { accepted: true },
        { headers: getAuthHeader() }
      );
      
      setHasConsent(true);
      setShowConsentDialog(false);
      
      // Salvar o template que estava pendente
      if (pendingDescriptor) {
        await saveFacialTemplate(pendingDescriptor);
      }
      
      toast.success('Consentimento registrado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
      toast.error('Erro ao registrar consentimento');
    }
  };
  
  // Cancelar consentimento
  const handleConsentCancel = () => {
    setShowConsentDialog(false);
    setConsentAccepted(false);
    setPendingDescriptor(null);
    setPendingImageSrc(null);
    setCapturingFace(false);
    setCaptureStatus('');
    processingRef.current = false;
  };
  
  const deleteFacialTemplate = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template facial?')) return;
    
    try {
      await axios.delete(`${API}/employees/${id}/facial-templates/${templateId}`, { headers: getAuthHeader() });
      toast.success('Template excluído');
      fetchFacialTemplates();
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };
  
  // Upload de foto do colaborador
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }
    
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    
    await uploadPhoto(file);
  };
  
  // Capturar foto da webcam
  const capturePhotoFromWebcam = async () => {
    if (!photoWebcamRef.current) return;
    
    const imageSrc = photoWebcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error('Não foi possível capturar a imagem');
      return;
    }
    
    // Converter base64 para arquivo
    const res = await fetch(imageSrc);
    const blob = await res.blob();
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    // Parar a câmera antes de desmontar o componente
    if (photoWebcamRef.current?.video?.srcObject) {
      const stream = photoWebcamRef.current.video.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Aguardar um frame antes de fechar a webcam para evitar erro de DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setShowPhotoWebcam(false);
    
    // Aguardar o componente desmontar antes de fazer upload
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await uploadPhoto(file);
  };
  
  // Função comum de upload
  const uploadPhoto = async (file) => {
    setUploadingPhoto(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API}/employees/${id}/photo`,
        formData,
        { 
          headers: { 
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      // Atualizar estado local imediatamente
      setColaborador(prev => ({
        ...prev,
        photo_path: response.data.photo_path
      }));
      
      toast.success('Foto do colaborador atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  // Função para imprimir a Ficha de EPI do colaborador com autenticação digital
  const printFichaEPI = async () => {
    // Filtrar apenas entregas (não devoluções) para a ficha
    const entregas = historico.filter(h => !h.is_return);
    
    setLoading(true);
    
    try {
      // Gerar código de autenticação via API
      const authResponse = await axios.post(
        `${API}/ficha-auth/generate`,
        {
          employee_id: colaborador.id,
          include_all_history: true
        },
        { headers: getAuthHeader() }
      );
      
      const authData = authResponse.data;
      const authCode = authData.auth_code;
      const authDate = new Date(authData.created_at).toLocaleString('pt-BR');
      const biometricValidated = authData.biometric_validated;
      const biometricScore = authData.biometric_score;
      
      // Gerar QR Code como SVG inline
      const qrCodeData = JSON.stringify({
        type: "EPI_FICHA_AUTH",
        code: authCode,
        employee: colaborador.full_name,
        date: authData.created_at,
        biometric: biometricValidated
      });
      
      // URL para verificação (usando API pública)
      const verifyUrl = `${BACKEND_URL}/api/ficha-auth/verify/${authCode}`;
      
      // Criar conteúdo HTML para impressão com autenticação
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Ficha de EPI - ${colaborador.full_name}</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px;
              line-height: 1.4;
              padding: 15px;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header h1 { 
              font-size: 16px; 
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .header h2 { 
              font-size: 12px;
              font-weight: normal;
            }
            .info-section {
              display: flex;
              gap: 20px;
              margin-bottom: 15px;
              border: 1px solid #ccc;
              padding: 10px;
            }
            .info-section .photo {
              width: 80px;
              height: 100px;
              border: 1px solid #999;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f5f5f5;
              flex-shrink: 0;
            }
            .info-section .photo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: cover;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              flex: 1;
            }
            .info-item label {
              font-weight: bold;
              font-size: 9px;
              text-transform: uppercase;
              color: #555;
              display: block;
            }
            .info-item span {
              font-size: 11px;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              background: #333;
              color: white;
              padding: 5px 10px;
              margin: 15px 0 10px 0;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #999;
              padding: 5px 8px;
              text-align: left;
            }
            th {
              background: #e5e5e5;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            .signature-section {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              gap: 40px;
            }
            .signature-box {
              flex: 1;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 9px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            .termo {
              font-size: 9px;
              text-align: justify;
              margin: 10px 0;
              padding: 8px;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            .epi-items-uso {
              background: #e8f5e9;
            }
            .auth-section {
              margin-top: 20px;
              padding: 15px;
              border: 2px solid #2563eb;
              border-radius: 8px;
              background: #eff6ff;
            }
            .auth-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px solid #93c5fd;
            }
            .auth-header .icon {
              width: 24px;
              height: 24px;
              background: #2563eb;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            }
            .auth-header h3 {
              font-size: 12px;
              color: #1e40af;
              margin: 0;
            }
            .auth-content {
              display: flex;
              gap: 20px;
              align-items: flex-start;
            }
            .auth-info {
              flex: 1;
            }
            .auth-info p {
              margin: 5px 0;
              font-size: 10px;
              color: #1e3a8a;
            }
            .auth-info .code {
              font-family: monospace;
              font-size: 14px;
              font-weight: bold;
              color: #1e40af;
              background: #dbeafe;
              padding: 5px 10px;
              border-radius: 4px;
              display: inline-block;
              margin: 5px 0;
            }
            .auth-info .biometric {
              color: ${biometricValidated ? '#059669' : '#dc2626'};
              font-weight: bold;
            }
            .qr-code {
              width: 100px;
              height: 100px;
              border: 1px solid #93c5fd;
              padding: 5px;
              background: white;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ficha de Controle de EPI</h1>
            <h2>Equipamento de Proteção Individual - NR-6</h2>
          </div>
          
          <div class="info-section">
            <div class="photo">
              ${colaborador.photo_path 
                ? `<img src="${getUploadUrl(colaborador.photo_path)}" alt="Foto" crossorigin="anonymous" />` 
                : '<span style="color:#999;font-size:9px;">Sem foto</span>'}
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label>Nome Completo</label>
                <span>${colaborador.full_name}</span>
              </div>
              <div class="info-item">
                <label>CPF</label>
                <span>${colaborador.cpf || '-'}</span>
              </div>
              <div class="info-item">
                <label>RG</label>
                <span>${colaborador.rg || '-'}</span>
              </div>
              <div class="info-item">
                <label>Matrícula</label>
                <span>${colaborador.registration_number || '-'}</span>
              </div>
              <div class="info-item">
                <label>Cargo</label>
                <span>${colaborador.position || '-'}</span>
              </div>
              <div class="info-item">
                <label>Setor</label>
                <span>${colaborador.department || '-'}</span>
              </div>
              <div class="info-item">
                <label>Data Admissão</label>
                <span>${colaborador.admission_date ? new Date(colaborador.admission_date).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
              <div class="info-item">
                <label>Telefone</label>
                <span>${colaborador.phone || '-'}</span>
              </div>
              <div class="info-item">
                <label>Status</label>
                <span>${colaborador.status === 'active' ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
          </div>
          
          <div class="termo">
            <strong>TERMO DE RESPONSABILIDADE:</strong> Declaro ter recebido gratuitamente os Equipamentos de Proteção Individual 
            (EPIs) relacionados abaixo, comprometendo-me a: usá-los apenas para a finalidade a que se destinam; 
            responsabilizar-me por sua guarda e conservação; comunicar ao empregador qualquer alteração que os torne 
            impróprios para uso; e devolvê-los quando solicitado ou ao término do contrato de trabalho. 
            Tenho ciência de que o uso é obrigatório conforme NR-6.
          </div>
          
          ${itemsEmUso.length > 0 ? `
            <div class="section-title">EPIs em Uso Atualmente</div>
            <table class="epi-items-uso">
              <thead>
                <tr>
                  <th>EPI</th>
                  <th>CA</th>
                  <th>Qtd</th>
                </tr>
              </thead>
              <tbody>
                ${itemsEmUso.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.ca_number || '-'}</td>
                    <td>${item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="section-title">Histórico de Entregas de EPI</div>
          ${entregas.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width:15%">Data</th>
                  <th style="width:35%">EPI</th>
                  <th style="width:10%">CA</th>
                  <th style="width:8%">Qtd</th>
                  <th style="width:17%">Responsável</th>
                  <th style="width:15%">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                ${entregas.flatMap(entrega => 
                  entrega.items?.map((item, idx) => `
                    <tr>
                      ${idx === 0 ? `<td rowspan="${entrega.items.length}">${new Date(entrega.created_at).toLocaleDateString('pt-BR')}</td>` : ''}
                      <td>${item.epi_name || item.name}</td>
                      <td>${item.ca_number || '-'}</td>
                      <td>${item.quantity}</td>
                      ${idx === 0 ? `
                        <td rowspan="${entrega.items.length}">${entrega.delivered_by_name || '-'}</td>
                        <td rowspan="${entrega.items.length}" style="text-align:center;">
                          ${entrega.facial_match_score ? `✓ Biométrica (${(entrega.facial_match_score * 100).toFixed(0)}%)` : '-'}
                        </td>
                      ` : ''}
                    </tr>
                  `) || []
                ).join('')}
              </tbody>
            </table>
          ` : '<p style="text-align:center;padding:20px;color:#666;">Nenhuma entrega registrada</p>'}
          
          <!-- Seção de Autenticação Digital -->
          <div class="auth-section">
            <div class="auth-header">
              <div class="icon">✓</div>
              <h3>AUTENTICAÇÃO DIGITAL - ASSINATURA BIOMÉTRICA</h3>
            </div>
            <div class="auth-content">
              <div class="auth-info">
                <p>Recebimento validado por reconhecimento facial (assinatura biométrica digital) registrado no sistema.</p>
                <p><strong>Código de Autenticação:</strong></p>
                <div class="code">${authCode}</div>
                <p><strong>Data/Hora da Validação:</strong> ${authDate}</p>
                <p class="biometric">
                  <strong>Status Biométrico:</strong> 
                  ${biometricValidated 
                    ? `✓ VALIDADO (${biometricScore ? (biometricScore * 100).toFixed(0) + '% de similaridade' : 'Confirmado'})` 
                    : '✗ Não validado biometricamente'}
                </p>
                <p style="font-size:9px;margin-top:10px;">
                  Para verificar a autenticidade deste documento, acesse:<br/>
                  <span style="font-family:monospace;color:#1e40af;">${verifyUrl}</span>
                </p>
              </div>
              <div class="qr-code" id="qrcode"></div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">
                Assinatura do Colaborador
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                Assinatura do Responsável / SESMT
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} | Sistema GestorEPI - Cipolatti</p>
            <p>Este documento atende à NR-6 do Ministério do Trabalho e Emprego</p>
            <p style="margin-top:5px;font-weight:bold;">Código de Autenticação: ${authCode}</p>
          </div>
          
          <script>
            // Gerar QR Code
            var qr = qrcode(0, 'M');
            qr.addData('${verifyUrl}');
            qr.make();
            document.getElementById('qrcode').innerHTML = qr.createImgTag(3, 0);
          </script>
        </body>
        </html>
      `;
      
      // Abrir janela de impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Aguardar carregamento de imagens e QR Code antes de imprimir
        setTimeout(() => {
          printWindow.print();
        }, 1000);
        
        toast.success(`Ficha gerada com código: ${authCode}`);
      } else {
        toast.error('Não foi possível abrir a janela de impressão. Verifique se popups estão bloqueados.');
      }
    } catch (error) {
      console.error('Erro ao gerar ficha:', error);
      toast.error('Erro ao gerar código de autenticação');
    } finally {
      setLoading(false);
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

  if (!colaborador) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Colaborador não encontrado</p>
          <button onClick={() => navigate('/colaboradores')} className="mt-4 text-emerald-600 hover:underline">
            Voltar para lista
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="colaborador-detalhes-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/colaboradores')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ficha do Colaborador</h1>
            <p className="text-slate-600 mt-1">Detalhes e histórico completo</p>
          </div>
        </div>

        {/* Informações do Colaborador */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start gap-6">
            {colaborador.photo_path ? (
              <img 
                src={`${getUploadUrl(colaborador.photo_path)}`}
                alt={colaborador.full_name}
                className="w-32 h-32 rounded-xl object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 bg-emerald-100 rounded-xl flex items-center justify-center border-4 border-slate-100 shadow-md">
                <User className="w-16 h-16 text-emerald-600" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{colaborador.full_name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">CPF</p>
                  <p className="font-mono text-slate-900">{colaborador.cpf}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">RG</p>
                  <p className="text-slate-900">{colaborador.rg || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Matrícula</p>
                  <p className="font-mono text-slate-900">{colaborador.registration_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    colaborador.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {colaborador.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Cargo</p>
                  <p className="text-slate-900">{colaborador.position || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Setor</p>
                  <p className="text-slate-900">{colaborador.department || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Telefone</p>
                  <p className="text-slate-900">{colaborador.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-slate-900">{colaborador.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('resumo');
            }}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'resumo'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            EPIs em Uso
          </button>
          <button
            onClick={() => {
              setActiveTab('biometria');
            }}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'biometria'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
            data-testid="tab-biometria"
          >
            <ScanFace className="w-4 h-4 inline mr-2" />
            Biometria Facial
            {facialTemplates.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {facialTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('historico');
            }}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'historico'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Histórico Completo
          </button>
        </div>

        {/* EPIs em Uso */}
        {activeTab === 'resumo' && (
          <div className="space-y-6">
            {/* NOVO: Alertas do Colaborador */}
            {employeeAlerts?.total_alerts > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-6">
                <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Alertas ({employeeAlerts.total_alerts})
                </h3>
                
                {/* EPIs Obrigatórios Pendentes */}
                {employeeAlerts.pending_epis?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-orange-700 mb-2">
                      EPIs Obrigatórios Pendentes {employeeAlerts.kit_name && `(Kit: ${employeeAlerts.kit_name})`}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {employeeAlerts.pending_epis.map((epi, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                        >
                          {epi.name} {epi.ca_number && `(CA: ${epi.ca_number})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trocas Periódicas Vencidas */}
                {employeeAlerts.replacement_due?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">Trocas Periódicas Vencidas</h4>
                    <div className="space-y-2">
                      {employeeAlerts.replacement_due.map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-red-100 p-2 rounded-lg">
                          <span className="text-sm font-medium text-red-800">{alert.epi_name}</span>
                          <span className="text-xs text-red-600">
                            {alert.days_overdue} dias de atraso
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* EPIs em uso */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                EPIs Atualmente com o Colaborador
              </h3>
              
              {itemsEmUso.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nenhum EPI em posse do colaborador</p>
              ) : (
                <div className="space-y-3">
                  {itemsEmUso.map((item) => (
                    <div 
                      key={item.id || `item-${item.name}`} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isExpired(item.epiData?.validity_date) 
                          ? 'bg-red-50 border-red-200' 
                          : isNearExpiry(item.epiData?.validity_date)
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isExpired(item.epiData?.validity_date) 
                            ? 'bg-red-100' 
                            : isNearExpiry(item.epiData?.validity_date)
                            ? 'bg-amber-100'
                            : 'bg-emerald-100'
                        }`}>
                          <Package className={`w-5 h-5 ${
                            isExpired(item.epiData?.validity_date) 
                              ? 'text-red-600' 
                              : isNearExpiry(item.epiData?.validity_date)
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-600">
                            Entregue em: {item.lastDelivery ? new Date(item.lastDelivery).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(isExpired(item.epiData?.validity_date) || isNearExpiry(item.epiData?.validity_date)) && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className={`w-4 h-4 ${isExpired(item.epiData?.validity_date) ? 'text-red-500' : 'text-amber-500'}`} />
                            <span className={`text-sm font-medium ${isExpired(item.epiData?.validity_date) ? 'text-red-600' : 'text-amber-600'}`}>
                              {isExpired(item.epiData?.validity_date) ? 'Vencido' : 'Próximo do vencimento'}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-700 bg-slate-200 px-3 py-1 rounded-full">
                          Qtd: {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Biometria Facial - SEMPRE renderizado, visibilidade via CSS */}
        <div 
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6"
          style={{ display: activeTab === 'biometria' ? 'block' : 'none' }}
        >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-blue-600" />
              Cadastro de Biometria Facial
            </h3>
            
            {/* Seção de Foto do Colaborador */}
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Foto do Colaborador
              </h4>
              
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Foto atual */}
                <div className="flex-shrink-0">
                  {colaborador.photo_path ? (
                    <img 
                      src={`${getUploadUrl(colaborador.photo_path)}?t=${Date.now()}`}
                      alt={colaborador.full_name}
                      className="w-32 h-32 rounded-xl object-cover border-2 border-emerald-300 shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentNode.querySelector('.photo-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`photo-fallback w-32 h-32 bg-slate-200 rounded-xl flex-col items-center justify-center border-2 border-dashed border-slate-300 ${colaborador.photo_path ? 'hidden' : 'flex'}`}
                  >
                    <User className="w-12 h-12 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Sem foto</span>
                  </div>
                </div>
                
                {/* Upload de foto */}
                <div className="flex-1">
                  <p className="text-sm text-slate-600 mb-3">
                    {colaborador.photo_path 
                      ? 'A foto é utilizada para identificação visual do colaborador. Você pode atualizar a foto a qualquer momento.'
                      : 'Nenhuma foto cadastrada. Cadastre uma foto para permitir o reconhecimento facial.'
                    }
                  </p>
                  
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  
                  {/* Webcam para tirar foto - renderização condicional */}
                  {showPhotoWebcam && (
                    <div className="mb-4">
                      {/* Webcam Container - Responsivo */}
                      <div 
                        className="relative mx-auto bg-slate-900 rounded-xl overflow-hidden"
                        style={{ 
                          maxWidth: '400px', 
                          aspectRatio: '4/3'
                        }}
                      >
                        <Webcam
                          key="photo-webcam"
                          ref={photoWebcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          forceScreenshotSourceSize={true}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg border-2 border-blue-300"
                          videoConstraints={{
                            facingMode: "user",
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                          }}
                          onUserMediaError={() => {
                            toast.error('Erro ao acessar câmera');
                            setShowPhotoWebcam(false);
                          }}
                        />
                      </div>
                      
                      {/* Botões fora do container da câmera */}
                      <div className="flex gap-2 mt-3 justify-center">
                        <button
                          onClick={capturePhotoFromWebcam}
                          disabled={uploadingPhoto}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Tirar Foto
                        </button>
                        <button
                          onClick={async () => {
                            // Parar a câmera antes de fechar
                            if (photoWebcamRef.current?.video?.srcObject) {
                              const stream = photoWebcamRef.current.video.srcObject;
                              stream.getTracks().forEach(track => track.stop());
                            }
                            await new Promise(resolve => setTimeout(resolve, 100));
                            setShowPhotoWebcam(false);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg px-4 py-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Botões quando webcam está fechada */}
                  {!showPhotoWebcam && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowPhotoWebcam(true)}
                        disabled={uploadingPhoto}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors disabled:opacity-50"
                        data-testid="capture-photo-btn"
                      >
                        <Camera className="w-4 h-4" />
                        Tirar Foto
                      </button>
                      
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors disabled:opacity-50"
                        data-testid="upload-photo-btn"
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Selecionar da Galeria
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Alerta se não tem foto */}
            {!colaborador.photo_path && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Foto não cadastrada</p>
                    <p className="text-sm text-amber-700">Cadastre uma foto acima antes de cadastrar o template facial para o reconhecimento biométrico.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Templates cadastrados */}
            <div className="mb-6">
              <h4 className="font-medium text-slate-700 mb-2">Templates Faciais Cadastrados</h4>
              <p className="text-sm text-slate-500 mb-4">
                O template facial é uma representação matemática das características do rosto do colaborador (128 pontos de referência). 
                Ele é usado para comparar com rostos capturados pela câmera durante a entrega de EPI, permitindo a identificação automática.
              </p>
              {facialTemplates.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <ScanFace className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum template facial cadastrado</p>
                  <p className="text-sm text-slate-400 mt-1">Cadastre ao menos um template para habilitar o reconhecimento facial</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {facialTemplates.map((template, idx) => (
                    <div 
                      key={template.id} 
                      className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Template Facial #{idx + 1}</p>
                          <p className="text-sm text-slate-600">
                            Cadastrado em: {new Date(template.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFacialTemplate(template.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir template"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Captura de novo template */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-700 mb-3">Cadastrar Novo Template via Câmera</h4>
              
              {!colaborador.photo_path && (
                <div className="p-4 bg-slate-100 rounded-lg text-center">
                  <p className="text-slate-600">Cadastre uma foto do colaborador primeiro para poder capturar o template facial.</p>
                </div>
              )}
              
              {colaborador.photo_path && !modelsLoaded && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
                  <span className="text-slate-600">Carregando modelos de reconhecimento...</span>
                </div>
              )}
              
              {colaborador.photo_path && modelsLoaded && (
                <div>
                  {/* Botão para iniciar - escondido quando webcam ativa */}
                  <button
                    onClick={() => setWebcamActive(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-4 flex items-center justify-center gap-2 transition-colors"
                    data-testid="start-facial-capture"
                    style={{ display: webcamActive ? 'none' : 'flex' }}
                  >
                    <Camera className="w-5 h-5" />
                    Iniciar Captura Facial
                  </button>
                  
                  {/* Webcam Container - SEMPRE no DOM, só esconde/mostra via CSS */}
                  <div 
                    id="webcam-biometria-permanent"
                    style={{ 
                      display: webcamActive ? 'block' : 'none',
                      visibility: webcamActive ? 'visible' : 'hidden'
                    }}
                  >
                    {/* Status da detecção */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-4 ${
                      faceDetected 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      {faceDetected ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700">
                            Rosto detectado - Pronto para capturar!
                          </span>
                        </>
                      ) : (
                        <>
                          <ScanFace className="w-5 h-5 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            Posicione o rosto na área marcada...
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Webcam Container - Responsivo */}
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
                        screenshotQuality={0.95}
                        forceScreenshotSourceSize={true}
                        className={`absolute inset-0 w-full h-full object-cover rounded-lg border-4 transition-colors ${
                          faceDetected ? 'border-emerald-400' : 'border-amber-300'
                        }`}
                        videoConstraints={{
                          facingMode: "user",
                          width: { ideal: 640 },
                          height: { ideal: 480 },
                          frameRate: { ideal: 30 }
                        }}
                        mirrored={true}
                        onUserMediaError={(err) => {
                          console.error('Webcam error:', err);
                          toast.error('Erro ao acessar câmera');
                        }}
                      />
                      
                      {/* Canvas overlay fixo */}
                      <canvas 
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ display: 'none' }}
                      />
                      
                      {/* Guia de posicionamento */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`w-32 h-40 sm:w-48 sm:h-60 md:w-56 md:h-72 border-4 border-dashed rounded-3xl transition-colors ${
                          faceDetected ? 'border-emerald-500 opacity-90' : 'border-amber-400 opacity-70'
                        }`}>
                        </div>
                      </div>
                      
                      {/* Status de processamento */}
                      <div 
                        className="absolute inset-0 bg-black/60 flex items-center justify-center"
                        style={{ display: captureStatus ? 'flex' : 'none' }}
                      >
                        <div className="bg-white px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          <span className="font-medium text-slate-700">{captureStatus}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dicas */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mt-4">
                      <p className="text-xs text-slate-600">
                        <strong>Dicas:</strong> Boa iluminação frontal • Olhe para a câmera • Rosto centralizado • Sem óculos escuros
                      </p>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={captureFacialTemplate}
                        disabled={capturingFace || !faceDetected}
                        className={`flex-1 font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all ${
                          faceDetected && !capturingFace
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                        data-testid="capture-facial-button"
                      >
                        {capturingFace ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5" />
                            {faceDetected ? 'Capturar Agora' : 'Aguardando rosto...'}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          // Parar o loop de detecção
                          if (detectionIntervalRef.current) {
                            clearInterval(detectionIntervalRef.current);
                            detectionIntervalRef.current = null;
                          }
                          
                          // Parar a câmera
                          if (webcamRef.current?.video?.srcObject) {
                            const stream = webcamRef.current.video.srcObject;
                            stream.getTracks().forEach(track => track.stop());
                          }
                          
                          // Limpar canvas
                          if (canvasRef.current) {
                            const ctx = canvasRef.current.getContext('2d');
                            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                          }
                          
                          // Limpar estados
                          setCapturingFace(false);
                          setCaptureStatus('');
                          setFaceDetected(false);
                          lastFaceStatusRef.current = null;
                          processingRef.current = false;
                          
                          // Esconder via CSS
                          setWebcamActive(false);
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg px-6 py-3 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Histórico Completo - SEMPRE renderizado, visibilidade via CSS */}
        <div 
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6"
          style={{ display: activeTab === 'historico' ? 'block' : 'none' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Histórico de Movimentações
            </h3>
            <button
              onClick={printFichaEPI}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-sm"
              data-testid="print-ficha-btn"
              title="Imprimir Ficha de EPI"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>
          </div>
          
        {historico.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-4">
            {historico.map((delivery) => (
              <div 
                key={delivery.id || `delivery-${delivery.created_at}`} 
                className={`p-4 rounded-lg border ${
                  delivery.is_return 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Foto da Assinatura Facial */}
                  {delivery.facial_photo_path && (
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <img 
                          src={`${getUploadUrl(delivery.facial_photo_path)}`}
                          alt="Assinatura facial"
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover border-2 border-emerald-300 shadow-sm"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ScanFace className="w-3 h-3" />
                          <span>{delivery.facial_match_score ? `${(delivery.facial_match_score * 100).toFixed(0)}%` : '✓'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 text-center mt-1">Assinatura</p>
                    </div>
                  )}
                  
                  {/* Detalhes da Entrega */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          delivery.is_return 
                            ? 'bg-blue-200 text-blue-800' 
                            : 'bg-emerald-200 text-emerald-800'
                        }`}>
                          {delivery.is_return ? 'Devolução' : 'Entrega'}
                        </span>
                        {!delivery.facial_photo_path && delivery.facial_match_score && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <ScanFace className="w-3 h-3" />
                            Verificação: {(delivery.facial_match_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(delivery.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {delivery.items?.map((item, i) => (
                        <div key={`${delivery.id || delivery.created_at}-item-${i}-${item.epi_id || item.tool_id || item.name}`} className="flex items-center gap-2 text-sm text-slate-700 bg-white/50 p-2 rounded">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{item.epi_name || item.tool_name || item.name}</span>
                          <span className="text-slate-500">(Qtd: {item.quantity})</span>
                        </div>
                      ))}
                    </div>
                    
                    {delivery.delivered_by_name && (
                      <p className="text-xs text-slate-500 mt-2">
                        Responsável: {delivery.delivered_by_name}
                      </p>
                    )}
                    {delivery.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">Obs: {delivery.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Dialog de Termo de Consentimento LGPD para Biometria Facial */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Termo de Consentimento para Coleta de Dados Biométricos
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
              <p className="mb-3">
                Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</strong>, 
                informamos que este sistema utiliza reconhecimento facial como identificação biométrica para 
                registro e confirmação do recebimento de Equipamentos de Proteção Individual (EPI).
              </p>
              
              <p className="mb-3">
                Ao autorizar a coleta da imagem facial, o colaborador consente com:
              </p>
              
              <ul className="list-disc list-inside mb-3 space-y-1 ml-2">
                <li>A captura e armazenamento de sua imagem facial</li>
                <li>A geração e armazenamento do vetor biométrico (descriptor facial)</li>
                <li>O uso como <strong>assinatura biométrica digital</strong> para entregas de EPI</li>
                <li>O uso para fins de controle interno, segurança do trabalho, auditoria e comprovação legal</li>
              </ul>
              
              <p className="mb-3">
                A imagem e os dados biométricos serão armazenados e tratados <strong>exclusivamente para esta 
                finalidade</strong>, respeitando as normas de segurança e proteção de dados aplicáveis.
              </p>
              
              <p className="mb-3">
                <strong>Direitos do Titular:</strong> O colaborador pode solicitar a qualquer momento a exclusão 
                de seus dados biométricos, conforme previsto na LGPD.
              </p>
              
              <p className="font-medium text-slate-800">
                Este consentimento é registrado uma única vez e será válido enquanto os dados biométricos 
                permanecerem cadastrados no sistema.
              </p>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                id="biometric-consent-checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="biometric-consent-checkbox" className="text-sm text-slate-700">
                Li e concordo com a coleta e uso dos meus dados biométricos faciais para identificação 
                no sistema de controle de EPI.
              </label>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConsentAccept}
                disabled={!consentAccepted}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Aceitar e Cadastrar Biometria
              </Button>
              <Button
                onClick={handleConsentCancel}
                variant="outline"
                className="px-6"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Alerta de Duplicidade Biométrica */}
      {duplicateError && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-300 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">Biometria Duplicada Detectada!</h4>
              <p className="text-sm text-red-700 mt-1">{duplicateError.message}</p>
              <p className="text-xs text-red-600 mt-2">
                Similaridade: {Math.round((duplicateError.similarity_score || 0) * 100)}%
              </p>
              <button 
                onClick={() => setDuplicateError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
