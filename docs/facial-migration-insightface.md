# Migracao Facial para InsightFace

## Objetivo

Trocar o reconhecimento facial legado do navegador por reconhecimento no backend com InsightFace, mantendo a entrega de EPI juridicamente vinculada a uma validacao facial aprovada.

## O que ja esta no projeto

- Endpoint de cadastro: `POST /api/facial/enroll`
- Endpoint de identificacao: `POST /api/facial/identify-fast`
- Endpoint de liveness: `POST /api/facial/liveness-check`
- Endpoint de auditoria da migracao: `GET /api/facial/migration-status`
- Endpoint de recarga do cache: `POST /api/facial/reload-cache`
- PWA basico instalavel no Android
- EntregaEPI enviando a melhor imagem para o backend facial

## Ponto critico

Os templates antigos do `face-api.js` nao sao equivalentes aos embeddings do InsightFace.

Na pratica:

- templates com 128 dimensoes sao tratados como legados
- templates com 512 dimensoes sao tratados como compativeis com InsightFace
- apenas templates compativeis entram no cache de identificacao backend

## Ordem segura de implantacao

1. Fazer backup da colecao `facial_templates` no MongoDB.
2. Atualizar o backend da VM com as dependencias novas:
   - `insightface==0.7.3`
   - `onnxruntime==1.23.2`
3. Subir a API e validar se o servico facial ficou disponivel.
4. Consultar `GET /api/facial/migration-status`.
5. Confirmar quantos colaboradores ainda precisam de recadastro.
6. Recadastrar biometria dos colaboradores no fluxo novo:
   - frontal
   - leve angulo esquerdo
   - leve angulo direito
7. Recarregar o cache com `POST /api/facial/reload-cache` se necessario.
8. Testar a tela EntregaEPI com pelo menos:
   - aprovacao direta
   - faixa de retry com segunda captura
   - bloqueio por baixa similaridade
9. So depois disso considerar remover templates legados.

## Como interpretar a auditoria

`GET /api/facial/migration-status` retorna:

- `service_available`: se o InsightFace subiu corretamente
- `cache_size`: quantos embeddings compativeis estao carregados em memoria
- `compatible_templates`: quantos templates novos existem
- `legacy_templates`: quantos templates antigos ainda existem
- `employees_ready`: colaboradores com pelo menos um template compativel
- `employees_needing_reenrollment`: colaboradores que ainda precisam de recadastro

## Recomendacao operacional

- Nao apagar templates legados antes de validar o recadastro.
- Recadastrar primeiro os colaboradores mais frequentes no almoxarifado.
- Validar camera, iluminacao e enquadramento no posto de entrega.
- Registrar um periodo curto de operacao assistida antes de considerar a migracao concluida.
