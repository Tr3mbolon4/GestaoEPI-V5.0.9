from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
from bson import ObjectId
import re

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

# Novos perfis de acesso
class UserRole(str, Enum):
    ADMIN = "admin"              # Administrador - acesso total
    GESTOR = "gestor"            # Gestor - acesso operacional total
    RH = "rh"                    # RH - colaboradores, empresas, usuários
    SEGURANCA_TRABALHO = "seguranca_trabalho"  # Seg. Trabalho - EPIs, fornecedores
    ALMOXARIFADO = "almoxarifado"  # Almoxarifado - entregas, movimentação

class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class StockMovementType(str, Enum):
    PURCHASE = "purchase"
    DELIVERY = "delivery"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
    DISCARD = "discard"

class ItemCondition(str, Enum):
    NEW = "new"
    USED = "used"
    DAMAGED = "damaged"

# ===================== AUTH =====================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    must_change_password: bool
    password_expired: bool = False
    role: UserRole
    is_primary_admin: bool = False  # True apenas para o admin principal

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('A senha deve ter no mínimo 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('A senha deve conter pelo menos um número')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('A senha deve conter pelo menos um caractere especial (!@#$%^&*)')
        return v

# ===================== USER =====================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.ALMOXARIFADO
    employee_id: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('A senha deve ter no mínimo 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('A senha deve conter pelo menos um número')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('A senha deve conter pelo menos um caractere especial (!@#$%^&*)')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    is_primary_admin: bool = False  # True apenas para o admin principal
    must_change_password: bool
    password_changed_at: Optional[datetime] = None
    employee_id: Optional[str] = None
    created_at: datetime

class UserInDB(BaseModel):
    username: str
    email: str
    hashed_password: str
    role: UserRole = UserRole.ALMOXARIFADO
    is_active: bool = True
    is_primary_admin: bool = False  # True apenas para o admin principal
    must_change_password: bool = True
    password_changed_at: Optional[datetime] = None
    employee_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===================== COMPANY =====================

class CompanyCreate(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    cnpj: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CompanyUpdate(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    legal_name: str
    trade_name: Optional[str] = None
    cnpj: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

# ===================== EMPLOYEE =====================

class EmployeeCreate(BaseModel):
    full_name: str
    cpf: str
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    address: Optional[str] = None
    registration_number: str  # Matrícula obrigatória
    company_id: str  # Empresa obrigatória
    department: Optional[str] = None
    position: Optional[str] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    facial_consent: bool = False
    tamanho_calcado: Optional[str] = None
    tamanho_luva: Optional[str] = None
    tamanho_camisa: Optional[str] = None
    tamanho_calca: Optional[str] = None
    notes: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    address: Optional[str] = None
    registration_number: Optional[str] = None
    company_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: Optional[EmployeeStatus] = None
    facial_consent: Optional[bool] = None
    facial_consent_date: Optional[datetime] = None
    facial_consent_ip: Optional[str] = None
    tamanho_calcado: Optional[str] = None
    tamanho_luva: Optional[str] = None
    tamanho_camisa: Optional[str] = None
    tamanho_calca: Optional[str] = None
    notes: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    full_name: str
    cpf: str
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    address: Optional[str] = None
    registration_number: Optional[str] = None
    company_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: EmployeeStatus
    photo_path: Optional[str] = None
    facial_consent: Optional[bool] = False
    facial_consent_date: Optional[datetime] = None
    facial_consent_ip: Optional[str] = None
    tamanho_calcado: Optional[str] = None
    tamanho_luva: Optional[str] = None
    tamanho_camisa: Optional[str] = None
    tamanho_calca: Optional[str] = None
    notes: Optional[str] = None
    admission_date: Optional[datetime] = None
    phone: Optional[str] = None
    created_at: datetime

# Resposta para perfis que não podem ver dados sensíveis
class EmployeePublicResponse(BaseModel):
    id: str
    full_name: str
    registration_number: Optional[str] = None
    company_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: EmployeeStatus
    photo_path: Optional[str] = None
    created_at: datetime

# ===================== SUPPLIER =====================

class SupplierCreate(BaseModel):
    name: str
    cnpj: str  # CNPJ obrigatório
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    cnpj: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class SupplierResponse(BaseModel):
    id: str
    name: str
    cnpj: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

# ===================== EPI =====================

class ReplacementPeriod(str, Enum):
    WEEKLY = "weekly"           # 7 dias
    BIWEEKLY = "biweekly"       # 14 dias
    MONTHLY = "monthly"         # 30 dias
    CUSTOM = "custom"           # dias personalizados

class EPICreate(BaseModel):
    name: str
    type_category: str
    category: Optional[str] = None
    description: Optional[str] = None
    obrigatorio_ca: bool = True
    nbr: Optional[str] = None
    possui_variacao_tamanho: bool = False
    epi_group_key: Optional[str] = None
    epi_group_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: Optional[str] = None  # Agora opcional (pode ter só NBR)
    nbr_number: Optional[str] = None  # NOVO: Número NBR
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[str] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: int = 0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: int = 0
    min_stock: int = 0
    max_stock: Optional[int] = None
    # NOVOS CAMPOS - Periodicidade de troca
    replacement_period: Optional[ReplacementPeriod] = None
    replacement_days: Optional[int] = None  # Para período custom
    
    variations: List[dict] = []

    @field_validator('ca_number', 'nbr_number')
    @classmethod
    def validate_ca_or_nbr(cls, v, info):
        # Pelo menos um deve ser preenchido (validação feita no endpoint)
        return v

class EPIUpdate(BaseModel):
    name: Optional[str] = None
    type_category: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    obrigatorio_ca: Optional[bool] = None
    nbr: Optional[str] = None
    possui_variacao_tamanho: Optional[bool] = None
    epi_group_key: Optional[str] = None
    epi_group_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: Optional[str] = None
    nbr_number: Optional[str] = None  # NOVO: Número NBR
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[str] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: Optional[int] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: Optional[int] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    # NOVOS CAMPOS - Periodicidade de troca
    replacement_period: Optional[ReplacementPeriod] = None
    replacement_days: Optional[int] = None
    variations: Optional[List[dict]] = None

class EPIResponse(BaseModel):
    id: str
    name: str
    type_category: str
    category: Optional[str] = None
    description: Optional[str] = None
    obrigatorio_ca: bool = True
    nbr: Optional[str] = None
    possui_variacao_tamanho: bool = False
    epi_group_key: Optional[str] = None
    epi_group_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: Optional[str] = None  # Agora opcional
    nbr_number: Optional[str] = None  # NOVO: Número NBR
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: int
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: int
    min_stock: int
    max_stock: Optional[int] = None
    stock_status: Optional[str] = None  # 'ok', 'low', 'out'
    validity_status: Optional[str] = None  # 'ok', 'expiring', 'expired'
    # NOVOS CAMPOS - Periodicidade de troca
    replacement_period: Optional[str] = None
    replacement_days: Optional[int] = None
    variations: List[dict] = []
    created_at: datetime

# ===================== KIT =====================

class KitItemInput(BaseModel):
    epi_base_id: Optional[str] = None
    epi_id: Optional[str] = None
    epi_group_key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    type_category: Optional[str] = None
    model: Optional[str] = None
    brand: Optional[str] = None
    quantity: int = 1

class KitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sector: str  # AGORA OBRIGATÓRIO - Setor: Marcenaria, Serralheria, etc.
    is_mandatory: bool = True  # Kit obrigatório para o setor
    items: List[KitItemInput] = []

class KitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sector: Optional[str] = None
    is_mandatory: Optional[bool] = None
    items: Optional[List[KitItemInput]] = None

class KitResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    is_mandatory: bool = True
    items: List[dict] = []
    created_at: datetime

# ===================== DELIVERY =====================

class DeliveryItemInput(BaseModel):
    epi_id: Optional[str] = None
    epi_group_key: Optional[str] = None
    epi_variation_id: Optional[str] = None
    kit_id: Optional[str] = None
    quantity: int = 1
    size: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    condition: ItemCondition = ItemCondition.NEW
    notes: Optional[str] = None

class DeliveryCreate(BaseModel):
    employee_id: str
    delivery_type: str
    is_return: bool = False
    facial_match_score: Optional[float] = None
    facial_photo_path: Optional[str] = None  # Foto de comprovante da entrega
    facial_validation_status: Optional[str] = None
    facial_validation_message: Optional[str] = None
    facial_liveness_status: Optional[str] = None
    facial_second_capture_used: bool = False
    notes: Optional[str] = None
    items: List[DeliveryItemInput]

class DeliveryResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    delivery_type: str
    is_return: bool
    photo_evidence_path: Optional[str] = None
    facial_match_score: Optional[float] = None
    facial_photo_path: Optional[str] = None
    facial_validation_status: Optional[str] = None
    facial_validation_message: Optional[str] = None
    facial_liveness_status: Optional[str] = None
    facial_second_capture_used: bool = False
    notes: Optional[str] = None
    items: List[dict] = []
    delivered_by: Optional[str] = None
    delivered_by_name: Optional[str] = None  # NOVO: Nome do responsável pela entrega
    created_at: datetime

class EPIVariationCreate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ca: Optional[str] = None
    supplier_id: Optional[str] = None
    fornecedor: Optional[str] = None
    validade_ca: Optional[datetime] = None
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    quantidade_estoque: int = 0
    valor_unitario: Optional[float] = None
    data_compra: Optional[datetime] = None
    lote: Optional[str] = None
    status: Optional[str] = "ativo"
    qr_code: Optional[str] = None
    internal_code: Optional[str] = None
    invoice_number: Optional[str] = None
    validity_date: Optional[datetime] = None
    material: Optional[str] = None
    technical_standard: Optional[str] = None

class DeliverySuggestionResponse(BaseModel):
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    kit_id: Optional[str] = None
    kit_name: Optional[str] = None
    items: List[dict] = []

# ===================== STOCK =====================

class StockMovementResponse(BaseModel):
    id: str
    movement_type: StockMovementType
    epi_id: Optional[str] = None
    quantity: int
    notes: Optional[str] = None
    created_at: datetime

# ===================== LICENSE =====================

class LicenseAddDaysRequest(BaseModel):
    days: int
    reason: Optional[str] = None

class LicenseResponse(BaseModel):
    id: str
    expires_at: datetime
    is_blocked: bool
    days_remaining: int

# ===================== FACIAL TEMPLATE =====================

class FacialTemplateCreate(BaseModel):
    descriptor: str
    pose_label: Optional[str] = None
    quality_score: Optional[float] = None
    detection_score: Optional[float] = None
    
    @field_validator('descriptor')
    @classmethod
    def validate_descriptor(cls, v):
        import json
        try:
            # Tentar parsear o JSON
            data = json.loads(v)
            # Verificar se é uma lista
            if not isinstance(data, list):
                raise ValueError('Descriptor deve ser uma lista')
            # Verificar tamanho (face-api.js usa 128 dimensões)
            if len(data) != 128:
                raise ValueError(f'Descriptor deve ter 128 valores, recebeu {len(data)}')
            # Verificar se são números
            for i, val in enumerate(data):
                if not isinstance(val, (int, float)):
                    raise ValueError(f'Valor na posição {i} não é número: {type(val)}')
            return v
        except json.JSONDecodeError as e:
            raise ValueError(f'Descriptor não é JSON válido: {e}')

class FacialTemplateResponse(BaseModel):
    id: str
    employee_id: str
    descriptor: str
    pose_label: Optional[str] = None
    quality_score: Optional[float] = None
    detection_score: Optional[float] = None
    created_at: datetime


class FacialEnrollRequest(BaseModel):
    employee_id: str
    image_base64: str
    pose_label: Optional[str] = "frontal"


class FacialEnrollResponse(BaseModel):
    status: str
    message: str
    employee_id: str
    template_id: Optional[str] = None
    pose_label: Optional[str] = None
    quality_score: Optional[float] = None
    detection_score: Optional[float] = None


class FacialIdentifyFastRequest(BaseModel):
    image_base64: str

class FacialIdentifyBurstRequest(BaseModel):
    images_base64: List[str]


class FacialIdentifyFastResponse(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    similarity_score: float = 0.0
    status: str
    message: str
    detection_confidence: Optional[float] = None
    liveness_required: bool = False
    matched_pose_label: Optional[str] = None


class FacialLivenessRequest(BaseModel):
    image_base64: str
    previous_image_base64: Optional[str] = None


class FacialLivenessResponse(BaseModel):
    status: str
    message: str
    passed: bool = False
    movement_delta: Optional[float] = None


class FacialMigrationEmployeeStatus(BaseModel):
    employee_id: str
    employee_name: str
    total_templates: int = 0
    compatible_templates: int = 0
    legacy_templates: int = 0
    needs_reenrollment: bool = False


class FacialMigrationStatusResponse(BaseModel):
    service_available: bool
    cache_size: int
    total_templates: int
    compatible_templates: int
    legacy_templates: int
    employees_with_templates: int
    employees_ready: int
    employees_needing_reenrollment: int
    employees: List[FacialMigrationEmployeeStatus] = []



# ===================== AUTENTICAÇÃO DE FICHA EPI =====================

class FichaAuthenticationCreate(BaseModel):
    """Dados para criar autenticação de ficha"""
    employee_id: str
    delivery_ids: List[str] = []  # Lista de IDs de entregas incluídas
    include_all_history: bool = True

class FichaAuthenticationResponse(BaseModel):
    """Resposta com código de autenticação"""
    id: str
    auth_code: str
    employee_id: str
    employee_name: str
    delivery_ids: List[str]
    biometric_validated: bool
    biometric_score: Optional[float] = None
    created_at: datetime
    created_by: str
    qr_code_data: str  # Dados para gerar QR Code

class FichaAuthenticationVerify(BaseModel):
    """Resposta de verificação de autenticidade"""
    valid: bool
    auth_code: str
    employee_name: Optional[str] = None
    validation_date: Optional[datetime] = None
    biometric_validated: Optional[bool] = None
    message: str


# ===================== VERIFICAÇÃO DE DUPLICIDADE BIOMÉTRICA =====================

class BiometricCheckRequest(BaseModel):
    """Request para verificar duplicidade biométrica"""
    descriptor: str  # JSON string do array de 128 floats
    employee_id: Optional[str] = None  # ID do colaborador (para ignorar na edição)

class BiometricCheckResponse(BaseModel):
    """Resposta da verificação de duplicidade"""
    is_duplicate: bool
    duplicate_employee_id: Optional[str] = None
    duplicate_employee_name: Optional[str] = None
    similarity_score: Optional[float] = None
    message: str

class BiometricDuplicateAudit(BaseModel):
    """Item de auditoria de duplicatas"""
    employee1_id: str
    employee1_name: str
    employee2_id: str
    employee2_name: str
    similarity_score: float

class BiometricConsentRequest(BaseModel):
    """Request para registrar consentimento biométrico"""
    accepted: bool
    ip_address: Optional[str] = None


# ===================== ALERTAS DE EPI =====================

class PendingEPIAlert(BaseModel):
    """Alerta de EPI obrigatório não entregue"""
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    kit_name: str
    missing_epis: List[dict] = []
    alert_type: str = "missing_mandatory_epi"
    message: str

class ReplacementDueAlert(BaseModel):
    """Alerta de troca periódica vencida"""
    employee_id: str
    employee_name: str
    epi_id: str
    epi_name: str
    last_delivery_date: datetime
    replacement_due_date: datetime
    days_overdue: int
    alert_type: str = "replacement_due"
    message: str

class AlertsResponse(BaseModel):
    """Resposta com todos os alertas"""
    pending_epis: List[PendingEPIAlert] = []
    replacement_due: List[ReplacementDueAlert] = []
    total_alerts: int = 0

# ===================== SETOR-KIT VINCULO =====================

class SectorKitCreate(BaseModel):
    """Vincula um setor a um kit obrigatório"""
    sector_name: str
    kit_id: str
    is_active: bool = True

class SectorKitResponse(BaseModel):
    """Resposta de vínculo setor-kit"""
    id: str
    sector_name: str
    kit_id: str
    kit_name: Optional[str] = None
    is_active: bool
    created_at: datetime
