"""
Seed completo para teste do sistema de Gestão EPI
- 5 Empresas
- 10 EPIs diferentes
- 10 Colaboradores com dados realistas
- Kits de EPI por setor
"""

from database import get_db
from auth import get_password_hash
from datetime import datetime, timedelta, timezone
import asyncio
import logging

logger = logging.getLogger(__name__)

# 5 Empresas
EMPRESAS = [
    {
        "legal_name": "Cipolatti Indústria Metalúrgica Ltda",
        "trade_name": "Cipolatti Metalúrgica",
        "cnpj": "12.345.678/0001-90",
        "address": "Av. Industrial, 1500 - São Paulo, SP",
        "contact_person": "Carlos Roberto",
        "contact_phone": "(11) 99999-1234",
        "contact_email": "contato@cipolatti.com.br"
    },
    {
        "legal_name": "Construtech Engenharia e Construções SA",
        "trade_name": "Construtech",
        "cnpj": "23.456.789/0001-01",
        "address": "Rua das Obras, 500 - Campinas, SP",
        "contact_person": "Maria Santos",
        "contact_phone": "(19) 98888-5678",
        "contact_email": "rh@construtech.com.br"
    },
    {
        "legal_name": "Logistica Express Transportes Ltda",
        "trade_name": "Log Express",
        "cnpj": "34.567.890/0001-12",
        "address": "Rod. Anhanguera km 45 - Jundiaí, SP",
        "contact_person": "Pedro Almeida",
        "contact_phone": "(11) 97777-9012",
        "contact_email": "seguranca@logexpress.com.br"
    },
    {
        "legal_name": "Agroforte Produção Rural Ltda",
        "trade_name": "Agroforte",
        "cnpj": "45.678.901/0001-23",
        "address": "Fazenda Boa Vista s/n - Ribeirão Preto, SP",
        "contact_person": "José Ferreira",
        "contact_phone": "(16) 96666-3456",
        "contact_email": "rh@agroforte.com.br"
    },
    {
        "legal_name": "Tecno Eletric Instalações Elétricas ME",
        "trade_name": "Tecno Eletric",
        "cnpj": "56.789.012/0001-34",
        "address": "Rua dos Eletricistas, 200 - Sorocaba, SP",
        "contact_person": "Ana Paula",
        "contact_phone": "(15) 95555-7890",
        "contact_email": "adm@tecnoeletric.com.br"
    }
]

# 10 EPIs diferentes
EPIS = [
    {
        "name": "Capacete de Segurança Classe A",
        "type_category": "Proteção da Cabeça",
        "brand": "MSA",
        "model": "V-Gard 500",
        "color": "Amarelo",
        "size": "Único",
        "material": "Polietileno de alta densidade",
        "ca_number": "CA 498",
        "technical_standard": "NBR 8221",
        "current_stock": 50,
        "min_stock": 10,
        "max_stock": 100,
        "storage_location": "Almoxarifado A - Prateleira 1"
    },
    {
        "name": "Óculos de Proteção Ampla Visão",
        "type_category": "Proteção dos Olhos",
        "brand": "3M",
        "model": "GoggleGear 500",
        "color": "Transparente",
        "size": "Único",
        "material": "Policarbonato",
        "ca_number": "CA 29501",
        "technical_standard": "NBR 16036",
        "current_stock": 100,
        "min_stock": 20,
        "max_stock": 200,
        "storage_location": "Almoxarifado A - Prateleira 2"
    },
    {
        "name": "Protetor Auricular Plug",
        "type_category": "Proteção Auditiva",
        "brand": "3M",
        "model": "1100",
        "color": "Laranja",
        "size": "Único",
        "material": "Espuma de poliuretano",
        "ca_number": "CA 5674",
        "technical_standard": "NBR 16076",
        "current_stock": 500,
        "min_stock": 100,
        "max_stock": 1000,
        "storage_location": "Almoxarifado A - Prateleira 2"
    },
    {
        "name": "Luva de Vaqueta Cano Curto",
        "type_category": "Proteção das Mãos",
        "brand": "Marluvas",
        "model": "MV 251",
        "color": "Natural",
        "size": "M",
        "material": "Couro de vaqueta",
        "ca_number": "CA 13876",
        "technical_standard": "NBR 13712",
        "current_stock": 80,
        "min_stock": 20,
        "max_stock": 150,
        "storage_location": "Almoxarifado A - Prateleira 3"
    },
    {
        "name": "Botina de Segurança com Biqueira",
        "type_category": "Proteção dos Pés",
        "brand": "Bracol",
        "model": "B0283",
        "color": "Preto",
        "size": "42",
        "material": "Couro + Biqueira de Composite",
        "ca_number": "CA 26735",
        "technical_standard": "NBR 12594",
        "current_stock": 40,
        "min_stock": 10,
        "max_stock": 80,
        "storage_location": "Almoxarifado B - Prateleira 1"
    },
    {
        "name": "Respirador PFF2 sem Válvula",
        "type_category": "Proteção Respiratória",
        "brand": "3M",
        "model": "Aura 9320+BR",
        "color": "Branco",
        "size": "Único",
        "material": "Tecido não tecido",
        "ca_number": "CA 9357",
        "technical_standard": "NBR 13698",
        "current_stock": 200,
        "min_stock": 50,
        "max_stock": 500,
        "storage_location": "Almoxarifado A - Prateleira 4"
    },
    {
        "name": "Cinto de Segurança Tipo Paraquedista",
        "type_category": "Proteção Contra Quedas",
        "brand": "Carbografite",
        "model": "CG 500",
        "color": "Preto/Amarelo",
        "size": "G",
        "material": "Poliéster",
        "ca_number": "CA 35527",
        "technical_standard": "NBR 11370",
        "current_stock": 20,
        "min_stock": 5,
        "max_stock": 40,
        "storage_location": "Almoxarifado B - Prateleira 2"
    },
    {
        "name": "Avental de PVC",
        "type_category": "Proteção do Tronco",
        "brand": "Delta Plus",
        "model": "APAPVC",
        "color": "Branco",
        "size": "120cm",
        "material": "PVC",
        "ca_number": "CA 21702",
        "technical_standard": "NBR 15546",
        "current_stock": 30,
        "min_stock": 10,
        "max_stock": 60,
        "storage_location": "Almoxarifado A - Prateleira 5"
    },
    {
        "name": "Luva de Procedimento Nitrílica",
        "type_category": "Proteção das Mãos",
        "brand": "Supermax",
        "model": "Select Blue",
        "color": "Azul",
        "size": "M",
        "material": "Nitrilo",
        "ca_number": "CA 38506",
        "technical_standard": "NBR ISO 11193",
        "current_stock": 1000,
        "min_stock": 200,
        "max_stock": 2000,
        "storage_location": "Almoxarifado A - Prateleira 3"
    },
    {
        "name": "Protetor Facial Incolor",
        "type_category": "Proteção da Face",
        "brand": "MSA",
        "model": "V-Gard",
        "color": "Incolor",
        "size": "Único",
        "material": "Policarbonato",
        "ca_number": "CA 14611",
        "technical_standard": "NBR 14442",
        "current_stock": 25,
        "min_stock": 5,
        "max_stock": 50,
        "storage_location": "Almoxarifado A - Prateleira 2"
    }
]

# 10 Colaboradores
COLABORADORES = [
    {
        "full_name": "João Carlos Silva",
        "cpf": "123.456.789-00",
        "rg": "12.345.678-9",
        "registration_number": "EMP001",
        "department": "Produção",
        "position": "Operador de Máquinas",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Maria Aparecida Santos",
        "cpf": "234.567.890-11",
        "rg": "23.456.789-0",
        "registration_number": "EMP002",
        "department": "Qualidade",
        "position": "Inspetora de Qualidade",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Pedro Henrique Oliveira",
        "cpf": "345.678.901-22",
        "rg": "34.567.890-1",
        "registration_number": "EMP003",
        "department": "Manutenção",
        "position": "Mecânico Industrial",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Ana Carolina Ferreira",
        "cpf": "456.789.012-33",
        "rg": "45.678.901-2",
        "registration_number": "EMP004",
        "department": "Administração",
        "position": "Assistente Administrativo",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Lucas Rodrigues Almeida",
        "cpf": "567.890.123-44",
        "rg": "56.789.012-3",
        "registration_number": "EMP005",
        "department": "Logística",
        "position": "Operador de Empilhadeira",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Fernanda Lima Costa",
        "cpf": "678.901.234-55",
        "rg": "67.890.123-4",
        "registration_number": "EMP006",
        "department": "Produção",
        "position": "Soldadora",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Ricardo Souza Mendes",
        "cpf": "789.012.345-66",
        "rg": "78.901.234-5",
        "registration_number": "EMP007",
        "department": "Segurança do Trabalho",
        "position": "Técnico de Segurança",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Juliana Pereira Gomes",
        "cpf": "890.123.456-77",
        "rg": "89.012.345-6",
        "registration_number": "EMP008",
        "department": "RH",
        "position": "Analista de RH",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Carlos Eduardo Ramos",
        "cpf": "901.234.567-88",
        "rg": "90.123.456-7",
        "registration_number": "EMP009",
        "department": "Elétrica",
        "position": "Eletricista Industrial",
        "status": "active",
        "facial_consent": True
    },
    {
        "full_name": "Patrícia Andrade Dias",
        "cpf": "012.345.678-99",
        "rg": "01.234.567-8",
        "registration_number": "EMP010",
        "department": "Almoxarifado",
        "position": "Almoxarife",
        "status": "active",
        "facial_consent": True
    }
]

# Kits por setor
KITS = [
    {
        "name": "Kit Básico Produção",
        "description": "Kit padrão para funcionários da linha de produção",
        "sector": "Produção",
        "epi_names": ["Capacete de Segurança Classe A", "Óculos de Proteção Ampla Visão", 
                     "Protetor Auricular Plug", "Luva de Vaqueta Cano Curto", "Botina de Segurança com Biqueira"]
    },
    {
        "name": "Kit Soldador",
        "description": "Kit completo para operações de solda",
        "sector": "Soldagem",
        "epi_names": ["Capacete de Segurança Classe A", "Protetor Facial Incolor",
                     "Luva de Vaqueta Cano Curto", "Avental de PVC", "Botina de Segurança com Biqueira"]
    },
    {
        "name": "Kit Trabalho em Altura",
        "description": "Kit para atividades em altura",
        "sector": "Manutenção",
        "epi_names": ["Capacete de Segurança Classe A", "Cinto de Segurança Tipo Paraquedista",
                     "Botina de Segurança com Biqueira", "Luva de Vaqueta Cano Curto"]
    },
    {
        "name": "Kit Eletricista",
        "description": "Kit para trabalhos com eletricidade",
        "sector": "Elétrica",
        "epi_names": ["Capacete de Segurança Classe A", "Óculos de Proteção Ampla Visão",
                     "Botina de Segurança com Biqueira"]
    }
]

# Usuários de teste por perfil
USUARIOS_TESTE = [
    {
        "username": "gestor.teste",
        "email": "gestor@cipolatti.com",
        "password": "Gestor@2026!",
        "role": "gestor"
    },
    {
        "username": "rh.teste",
        "email": "rh@cipolatti.com",
        "password": "RH@2026teste!",
        "role": "rh"
    },
    {
        "username": "seguranca.teste",
        "email": "seguranca@cipolatti.com",
        "password": "Seguranca@2026!",
        "role": "seguranca_trabalho"
    },
    {
        "username": "almoxarifado.teste",
        "email": "almoxarifado@cipolatti.com",
        "password": "Almox@2026teste!",
        "role": "almoxarifado"
    }
]

async def seed_complete():
    db = await get_db()
    now = datetime.now(timezone.utc)
    
    # ===================== EMPRESAS =====================
    logger.info("Criando empresas...")
    company_ids = {}
    for emp in EMPRESAS:
        existing = await db.companies.find_one({"cnpj": emp["cnpj"]})
        if not existing:
            emp_data = {**emp, "created_at": now, "updated_at": now}
            result = await db.companies.insert_one(emp_data)
            company_ids[emp["legal_name"]] = str(result.inserted_id)
            logger.info(f"  - {emp['legal_name']}")
        else:
            company_ids[emp["legal_name"]] = str(existing["_id"])
    
    # ===================== FORNECEDORES =====================
    logger.info("Criando fornecedores...")
    fornecedores = [
        {"name": "3M do Brasil", "cnpj": "45.985.371/0001-08", "contact": "Vendas", "phone": "(11) 4321-1234"},
        {"name": "MSA do Brasil", "cnpj": "60.498.706/0001-76", "contact": "Comercial", "phone": "(11) 3142-5678"},
        {"name": "Marluvas", "cnpj": "17.192.451/0001-70", "contact": "Suporte", "phone": "(35) 3471-9012"}
    ]
    for forn in fornecedores:
        existing = await db.suppliers.find_one({"cnpj": forn["cnpj"]})
        if not existing:
            await db.suppliers.insert_one({**forn, "created_at": now})
            logger.info(f"  - {forn['name']}")
    
    # ===================== EPIs =====================
    logger.info("Criando EPIs...")
    epi_ids = {}
    for epi in EPIS:
        existing = await db.epis.find_one({"ca_number": epi["ca_number"]})
        if not existing:
            epi_data = {
                **epi,
                "quantity_purchased": epi["current_stock"],
                "ca_validity": now + timedelta(days=365*2),  # 2 anos de validade
                "validity_date": now + timedelta(days=365*2),
                "created_at": now,
                "updated_at": now
            }
            result = await db.epis.insert_one(epi_data)
            epi_ids[epi["name"]] = str(result.inserted_id)
            logger.info(f"  - {epi['name']} (CA: {epi['ca_number']})")
        else:
            epi_ids[epi["name"]] = str(existing["_id"])
    
    # ===================== KITS =====================
    logger.info("Criando Kits de EPI...")
    for kit in KITS:
        existing = await db.kits.find_one({"name": kit["name"]})
        if not existing:
            items = []
            for epi_name in kit["epi_names"]:
                if epi_name in epi_ids:
                    # Buscar dados do EPI
                    epi = await db.epis.find_one({"name": epi_name})
                    if epi:
                        items.append({
                            "epi_id": epi_ids[epi_name],
                            "name": epi_name,
                            "type_category": epi.get("type_category", ""),
                            "ca_number": epi.get("ca_number", ""),
                            "size": epi.get("size", ""),
                            "quantity": 1
                        })
            
            kit_data = {
                "name": kit["name"],
                "description": kit["description"],
                "sector": kit["sector"],
                "items": items,
                "created_at": now,
                "updated_at": now
            }
            await db.kits.insert_one(kit_data)
            logger.info(f"  - {kit['name']} ({len(items)} itens)")
    
    # ===================== COLABORADORES =====================
    logger.info("Criando colaboradores...")
    # Usar a primeira empresa para todos os colaboradores de teste
    first_company_id = list(company_ids.values())[0] if company_ids else None
    
    for colab in COLABORADORES:
        existing = await db.employees.find_one({"cpf": colab["cpf"]})
        if not existing:
            colab_data = {
                **colab,
                "company_id": first_company_id,
                "created_at": now,
                "updated_at": now
            }
            await db.employees.insert_one(colab_data)
            logger.info(f"  - {colab['full_name']} ({colab['registration_number']})")
    
    # ===================== USUÁRIOS DE TESTE =====================
    logger.info("Criando usuários de teste por perfil...")
    for user in USUARIOS_TESTE:
        existing = await db.users.find_one({"username": user["username"]})
        if not existing:
            user_data = {
                "username": user["username"],
                "email": user["email"],
                "hashed_password": get_password_hash(user["password"]),
                "role": user["role"],
                "must_change_password": False,  # Para testes, não exigir mudança
                "is_active": True,
                "password_changed_at": now,
                "created_at": now,
                "updated_at": now
            }
            await db.users.insert_one(user_data)
            logger.info(f"  - {user['username']} (Perfil: {user['role']})")
    
    logger.info("\n" + "="*50)
    logger.info("SEED COMPLETO FINALIZADO!")
    logger.info("="*50)
    logger.info(f"\nEmpresas: {len(EMPRESAS)}")
    logger.info(f"EPIs: {len(EPIS)}")
    logger.info(f"Kits: {len(KITS)}")
    logger.info(f"Colaboradores: {len(COLABORADORES)}")
    logger.info(f"Usuários de teste: {len(USUARIOS_TESTE)}")
    logger.info("\n" + "="*50)
    logger.info("CREDENCIAIS DE ACESSO:")
    logger.info("="*50)
    logger.info("Admin: administrador / LR1a2b3c4567@")
    logger.info("Gestor: gestor.teste / Gestor@2026!")
    logger.info("RH: rh.teste / RH@2026teste!")
    logger.info("Seg. Trabalho: seguranca.teste / Seguranca@2026!")
    logger.info("Almoxarifado: almoxarifado.teste / Almox@2026teste!")
    logger.info("="*50)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_complete())
