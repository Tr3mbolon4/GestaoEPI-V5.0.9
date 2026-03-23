from database import get_db
from auth import get_password_hash
from datetime import datetime, timedelta, timezone
import asyncio
import logging

logger = logging.getLogger(__name__)

async def seed_database():
    db = await get_db()
    
    # Criar admin (substitui super_admin)
    existing_user = await db.users.find_one({"username": "administrador"})
    if not existing_user:
        admin = {
            "username": "administrador",
            "email": "admin@cipolatti.com",
            "hashed_password": get_password_hash("LR1a2b3c4567@"),
            "role": "admin",  # Novo perfil
            "is_primary_admin": True,  # ADMINISTRADOR PRINCIPAL
            "must_change_password": True,
            "is_active": True,
            "password_changed_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(admin)
        logger.info("Administrador principal criado: administrador")
    else:
        # Atualizar para marcar como admin principal se for o primeiro admin
        update_fields = {}
        if existing_user.get('role') in ['super_admin', 'admin']:
            update_fields["role"] = "admin"
        if existing_user.get('is_primary_admin') is None:
            update_fields["is_primary_admin"] = True
        if update_fields:
            await db.users.update_one(
                {"_id": existing_user['_id']},
                {"$set": update_fields}
            )
    
    # Criar licença
    existing_license = await db.panel_license.find_one({})
    if not existing_license:
        license_doc = {
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            "is_blocked": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.panel_license.insert_one(license_doc)
        logger.info("Licença do painel criada: 30 dias")
    
    # 🧪 CRIAR DADOS DE TESTE
    # Criar empresa de teste
    existing_company = await db.companies.find_one({"cnpj": "00.000.000/0001-00"})
    if not existing_company:
        test_company = {
            "legal_name": "Empresa Teste LTDA",
            "trade_name": "Empresa Teste",
            "cnpj": "00.000.000/0001-00",
            "address": "Rua Teste, 123 - Centro - São Paulo/SP",
            "contact_person": "João Silva",
            "contact_phone": "(11) 99999-9999",
            "contact_email": "contato@empresateste.com.br",
            "notes": "Empresa criada automaticamente para testes",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        result = await db.companies.insert_one(test_company)
        company_id = result.inserted_id
        logger.info(f"✅ Empresa de teste criada: {test_company['legal_name']}")
    else:
        company_id = existing_company['_id']
        logger.info("Empresa de teste já existe")
    
    # Criar funcionário de teste
    existing_employee = await db.employees.find_one({"cpf": "000.000.000-00"})
    if not existing_employee:
        test_employee = {
            "full_name": "João da Silva",
            "cpf": "000.000.000-00",
            "company_id": str(company_id),
            "employee_code": "FUNC001",
            "admission_date": datetime.now(timezone.utc).date().isoformat(),
            "department": "Produção",
            "position": "Operador de Máquinas",
            "blood_type": "O+",
            "contact_phone": "(11) 98765-4321",
            "emergency_contact": "Maria da Silva - (11) 91234-5678",
            "status": "active",
            "facial_consent": True,  # Consentimento para biometria
            "notes": "Funcionário criado automaticamente para testes",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.employees.insert_one(test_employee)
        logger.info(f"✅ Funcionário de teste criado: {test_employee['full_name']}")
    else:
        logger.info("Funcionário de teste já existe")
    
    logger.info("Seed concluído com sucesso")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_database())
