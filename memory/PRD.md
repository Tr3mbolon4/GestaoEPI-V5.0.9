# PRD - GestaoEPI v5.1.0

## Sistema de Gestão de Equipamentos de Proteção Individual

### Original Problem Statement
Sistema de gestão de EPIs com melhorias solicitadas:
1. Kits por setor com vínculo obrigatório
2. Alertas de EPI obrigatório não entregue
3. Controle de periodicidade de troca de EPI  
4. Campo NBR no cadastro de EPI
5. Exibir responsável pela entrega no relatório

### User Personas
- **Administrador**: Gestão completa do sistema
- **Gestor**: Gestão de EPIs e entregas
- **RH**: Cadastro de colaboradores e empresas
- **Segurança do Trabalho**: Monitoramento de conformidade
- **Almoxarifado**: Operação de entregas

### Core Requirements (Static)
- Entrega de EPI via reconhecimento facial
- Controle de estoque de EPIs
- Gestão de colaboradores e empresas
- Relatórios e fichas de EPI
- Kits de EPI por setor

### What's Been Implemented (2026-03-23)

#### 1. Campo NBR no Cadastro de EPI
- Adicionado campo `nbr_number` no schema EPI
- Validação: obrigatório ter CA ou NBR (ou ambos)
- Exibição na tabela de EPIs e kits

#### 2. Periodicidade de Troca de EPI
- Campo `replacement_period`: weekly, biweekly, monthly, custom
- Campo `replacement_days` para período personalizado
- Alertas automáticos de troca vencida

#### 3. Kits por Setor Obrigatório
- Campo `sector` obrigatório no Kit
- Flag `is_mandatory` para kits obrigatórios do setor
- Associação automática colaborador → kit do setor

#### 4. Sistema de Alertas
- Nova página `/alertas` com central de alertas
- Endpoint `/api/alerts/all` consolidado
- Endpoint `/api/alerts/pending-epis` - EPIs obrigatórios pendentes
- Endpoint `/api/alerts/replacement-due` - Trocas vencidas
- Endpoint `/api/alerts/employee/{id}` - Alertas por colaborador
- Card de alertas no Dashboard
- Alertas na ficha do colaborador

#### 5. Responsável pela Entrega
- Campo `delivered_by_name` salvo em cada entrega
- Exibido no histórico de entregas
- Incluído no relatório PDF do colaborador

### Tech Stack
- **Frontend**: React 18, TailwindCSS, shadcn/ui
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB
- **Biometria**: face-api.js (reconhecimento facial)

### API Endpoints Implementados
```
GET  /api/alerts/all
GET  /api/alerts/pending-epis
GET  /api/alerts/replacement-due  
GET  /api/alerts/employee/{id}
GET  /api/kits/by-sector/{sector}
GET  /api/sectors/list
```

### Prioritized Backlog

#### P0 - Crítico
- [x] Alertas de EPIs pendentes
- [x] Campo NBR
- [x] Periodicidade de troca

#### P1 - Alta Prioridade
- [x] Kits obrigatórios por setor
- [x] Responsável pela entrega
- [ ] Notificações por email de alertas

#### P2 - Média Prioridade
- [ ] Dashboard de conformidade por setor
- [ ] Relatório de alertas em PDF
- [ ] Exportação de dados para Excel

### Next Tasks
1. Configurar notificações automáticas por email
2. Criar dashboard de conformidade
3. Implementar exportação de relatórios
4. Adicionar filtros avançados na central de alertas

### Test Results
- Backend: 100% (16/16 testes passaram)
- Frontend: 85% (funcional, login requer troca de senha)
