# Auditoria de produção — FrotaPro

Data: 07/09/2026. Escopo: etapas 17–20 e correção dos bloqueadores. Decisão atual: **NÃO PRONTO — S02 PENDENTE**.

## Atualização S02 informada pelo usuário

O usuário confirmou execução da auditoria real, RLS operacional habilitado, escrita oficial de assignments por RPC e S05 corrigido/confirmado no banco. O resultado completo com policies/ACLs/definições não foi anexado nesta conversa; foi solicitado, sem consulta automática ao banco. S05 não foi reaplicado pelo agente.

Preparação e limites atuais: [S02_SEGURANCA.md](S02_SEGURANCA.md). Foram preparadas três migrations separadas, sem execução: isolamento de driver_assignments/motoristas sem consumidores no repositório; restrição de upload de checklist-photos mantendo leitura pública temporária; revogação apenas de privilégios estruturais sem uso operacional. S02 NÃO foi encerrado: catálogo detalhado, consumidores externos, privacidade de fotos, aplicação/revisão e testes reais de isolamento continuam pendentes. As referências a S05 pendente nas seções seguintes registram o estado anterior a essa confirmação do usuário.

## Correção dos bloqueadores — 07/09/2026

- **S03 resolvido no código:** internalRedirect valida caminho interno, rejeita barras/contrabarras ambíguas, controles e separadores codificados, faz parsing e confere a mesma origin. Callback e confirm preservam destinos internos, query/hash e fluxos de code/OTP. Oito testes locais de helper/endpoints passaram, incluindo sucesso e credenciais inválidas/ausentes. Não houve teste com Supabase real.
- **S01 resolvido no código:** removidos os fallbacks operacionais de vehicles.driver_id/driver_email somente do dashboard. Ausência oficial mostra “Nenhum veículo atribuído”; erro de consulta (inclusive múltiplos resultados), veículo ausente/invisível e base divergente mostram erro e não consultam legado. Dez testes com mocks passaram. Espelho vehicles.driver_id, checklist/fuel, RPC de assignment e histórico foram preservados.
- **S05 pendente de aplicação:** migration 20260907225305_reject_null_maintenance_action.sql criada pelo CLI, sem execução. A definição base foi 20260905120000_review_maintenance_release_flow.sql. Comparação textual do bloco função/grants confirmou somente `p_action is null or` acrescentado ao guard, antes de qualquer mutation. NULL, vazio e valores fora do enum são rejeitados pela condição; execução PL/pgSQL não testada. Conferir definição real antes de aplicar.
- **S02 bloqueado:** consulta única READ-ONLY em `supabase/audits/production-read-only.sql`, não executada. Coleta relações/RLS, policies public/private/storage, ACLs de tabela/coluna/schema (inclusive PUBLIC), privilégios efetivos dos três papéis de API, SECURITY DEFINER e helpers, triggers, memberships, índices e visibilidade de buckets. Grants não comprovam autorização por linha. Referência dos helpers de catálogo: [PostgreSQL](https://www.postgresql.org/docs/current/functions-info.html).
- **S04 resolvido:** @supabase/supabase-js@2.105.1 → @supabase/realtime-js@2.105.1 (`ws: ^8.18.2`) → ws atualizado 8.20.0 → 8.21.3. `npm update ws` compatível; package.json intacto. Somente versão/resolved/integrity de ws mudaram no lockfile. Metadados opcionais incidentais foram descartados; nenhum upgrade major. `npm audit --omit=dev`: antes exit 1/um pacote high; depois exit 0/zero vulnerabilidades.
- **Validações:** 18 testes Node com mocks passaram; checkpoints de lint e build/TypeScript passaram após S03, S01 e S04; diff check aprovado. O primeiro lint de S03 apontou nome de variável no teste, corrigido antes de prosseguir. Build mantém aviso preexistente do lockfile externo.
- **Fora do audit de produção:** audit completo ainda registra dois pacotes de desenvolvimento high (`brace-expansion` e `js-yaml`), sem alteração nesta correção transitiva de ws. Não confundir zero vulnerabilidades de produção com audit completo limpo.
- Nenhum SQL, aplicação de migration, alteração de produção, commit ou push. Alterações prévias de modais e limpeza preservadas. As seções das etapas 17–20 abaixo registram a auditoria inicial; o estado atual dos bloqueadores é o desta seção e do checklist final.

## Evidências e limites

- Working tree limpo no início das etapas 17–20. Na correção dos bloqueadores, alterações anteriores estavam presentes e foram preservadas.
- AGENTS.md e ROADMAP.md lidos. Arquitetura atual: Next.js App Router/React, páginas cliente, proxy de rotas, quatro APIs, Supabase Auth/Data API, componentes visuais compartilhados e domínios fuel/checklists/maintenance.
- Inspecionados os arquivos atuais de `src/`, as quatro migrations e `supabase-schema-current.sql` local. O snapshot se declara apenas contextual, não é versionado e não contém o catálogo de policies/grants/triggers.
- Nenhum SQL, migration, alteração de RLS/grants, acesso a produção, commit ou push executado. Não foi confirmada a aplicação das migrations no banco.
- Testes locais usaram mocks, DOM simulado e parser de URL. Não equivalem a teste integrado com usuários reais ou navegador/leitor de tela.
- Não existe script de testes ou typecheck em package.json. Esta correção acrescentou testes em `tests/`, executáveis com `node --test tests/*.test.mjs`, usando TypeScript já instalado e mocks explícitos. O build valida TypeScript. Nenhum framework instalado.

## Etapa 17 — modais

| Componente/local | Antes | Ação | Diferenças preservadas / pendências |
|---|---|---|---|
| ConfirmModal, usado em maintenance e manager/drivers | Dialog, identificação, foco inicial, trap de botões, Escape condicionado, restauração, scroll lock, altura limitada | Preservado | Não fecha pelo backdrop; loading bloqueia cancelamento. Confirmação sobreposta usa returnFocusRef e painel subjacente inert |
| ChecklistPhotosModal | Nome no fechar, alt nas fotos; sem infraestrutura de foco | Migrado para Modal | Continua sem fechamento por backdrop; heading, imagens, grid e textos preservados |
| VehicleDetailsModal, manager/fuel | Fechava no mousedown externo; sem foco/semântica de diálogo | Migrado para Modal | Continua fechando no backdrop, nunca em clique dentro; métricas e formatação preservadas |
| Modal local de assignments, manager/drivers | Painel subjacente inert quando há confirmação; fechar bloqueado em saving | Não migrado | Falta dialog/label no fechar/trap/Escape/scroll lock/limite de altura no painel principal. Exige revisão da interação com ConfirmModal |
| DeleteVehicleModal | Mutation própria, sem foco/semântica de diálogo | Mantido sem migração | Nenhum consumidor encontrado; classificado A na auditoria de legado, remoção recomendada separadamente |
| MobileSidebar | Aside e botões de fechar; rolagem interna | Não migrado | Drawer com layout próprio, sem trap/Escape/restauração/scroll lock. Revisão de teclado pendente |
| Toast e Sidebar desktop | Overlay de aviso / navegação fixa | Não tratados como modal | Não são diálogos |

Modal.tsx fornece role=dialog, aria-modal, labelledBy/description opcionais, foco no primeiro controle visível ou painel, Tab e Shift+Tab contidos, recuperação de foco externo, Escape condicionado, restauração do foco e do overflow anterior, fechamento externo opt-in e altura máxima de viewport. API limitada à infraestrutura; não possui acesso a dados. Destinado aos modais simples montados isoladamente nesta leva; não foi aplicado à sobreposição de assignments/ConfirmModal.

Teste com DOM simulado: foco inicial, Tab/Shift+Tab, painel sem controles, foco externo, Escape, bloqueio de fechamento, backdrop habilitado/desabilitado, clique interno, restauração, scroll e remoção de listeners passaram. Validar em navegador 320/375px, tablet e desktop, zoom 200%, imagens longas, leitor de tela e acionador removido do DOM. Nenhum teste visual alegado.

## Etapa 18 — legado

| Item | Classe | Consumidores/evidência | Ação e motivo |
|---|---|---|---|
| app/actions/create-vehicle.ts / createVehicleAndDriver | A | Apenas definição; nenhum import/chamada/rota atual encontrado | Removido com seu módulo de schemas. Usava service role sem autenticação interna; não era caminho atual e não se comprovou exposição como action no build |
| schemas/index.ts: vehicleSchema, VehicleFormData, loginSchema | A | Schema de veículo usado somente pela action morta; loginSchema sem consumidor | Módulo removido junto ao conjunto morto; schema de assignments mantido |
| DeleteVehicleModal | A | Apenas definição; nenhum consumidor em src | Mantido nesta execução; recomendado remover em limpeza posterior |
| driver_vehicle_assignments | B | Driver, gestores, admin, checklist/fuel, RPC e migrations | Mantido: fonte oficial do vínculo ativo (`ended_at IS NULL`) |
| vehicles.driver_id | C | Dashboard driver, listagens admin/manager e RPC manage_driver_vehicle_assignment | Mantido: espelho atualizado pela RPC, ainda consumido |
| vehicles.driver_email / driver_name | C | Dashboard usa e-mail como fallback; cadastro de veículo ainda envia campos nulos | Mantidos. Não equivalem aos campos históricos de checklist/fuel |
| driver_email de checklist/fuel | B | Listagens, formulários, tipos e triggers de normalização | Mantido: dado histórico consumido, não é vínculo oficial |
| vehicles.user_id | D | Coluna/FK no snapshot; não encontrado vínculo por user_id no dashboard | Sem alteração de banco; faltam consumidores externos/policies |
| driver_assignments | D | Tabela antiga no snapshot; não encontrada em consultas atuais de src/migrations | Não confundir com driver_vehicle_assignments. Sem DROP ou migration |
| motoristas | D | Tabela no snapshot; uso textual de “motoristas” na UI não é consulta à tabela | Sem alteração; ausência de consumidores do banco não comprovada |
| aliases gestor/manager/motorista em normalizeRole | C | Login, proxy e AppShell | Mantidos; mapear papel desconhecido para driver é dívida de fail-closed |
| totalDistance agregado em manager/fuel | A | Variável local sem leitura; helper calculateDistance continua consumido | Removido na etapa 20; nenhum indicador exibido foi removido |

Após remover action/schemas, busca sem referências restantes, lint, build/TypeScript e diff check passaram. Tipos de domínio ativos e demais arquivos foram preservados.

## Etapa 19 — achados de segurança

“Bloqueia” é a decisão desta auditoria para liberação; ausência de evidência não significa exploração comprovada em produção.

| ID | Severidade | Área / evidência | Achado e impacto | Recomendação | Bloqueia |
|---|---|---|---|---|---|
| S01 | ALTO | driver/page.tsx, consulta oficial e fallbacks na auditoria inicial | Erro oficial podia ser mascarado por veículo legado | Corrigido somente no dashboard; dez testes com mocks passaram | RESOLVIDO no código; banco depende de S02 |
| S02 | ALTO | Snapshot contextual e quatro migrations parciais | Não há prova dos grants/policies completos, aplicação das migrations, índices ativos e bindings dos triggers. Isolamento entre bases/motoristas não certificado | Obter catálogo aplicado e testar operações permitidas/negadas por role e base em homologação, mediante autorização específica | SIM |
| S03 | ALTO | auth/callback/route.ts, safeNext e new URL originais | Barra/contrabarra permitia origem externa; sem vazamento de token demonstrado | Helper de caminho/origin aplicado aos dois endpoints; oito testes locais passaram | RESOLVIDO no código |
| S04 | ALTO | supabase-js → realtime-js → ws | ws@8.20.0 vulnerável na auditoria inicial | ws@8.21.3 instalado, lock restrito; audit de produção zero, lint/build aprovados | RESOLVIDO |
| S05 | MÉDIO | migration review_maintenance_release_flow, transition_maintenance_record | `p_action NOT IN (...)` não rejeita NULL; o IF de start também não entra e o fluxo pode concluir manutenção em andamento para chamador autorizado. API Zod barra NULL, mas RPC tem EXECUTE para authenticated | Revisar validação explícita de NULL na RPC e testar chamada direta; confirmar definição aplicada antes de mudar banco | SIM, até revisar/corrigir a definição que será implantada |
| S06 | MÉDIO | normalizeRole / APIs / auth | Papel desconhecido vira driver; APIs de criar gestor e reenviar convite têm validações manuais/incompletas de tipos/UUID; erros de serviços podem ser expostos | Fail-closed de papéis após revisar compatibilidade; Zod e erros estáveis em etapa própria | NÃO; dívida técnica |
| S07 | MÉDIO | checklist migration / Storage | sync_vehicle_from_checklist depende de new.has_issue; não há recomputação dos itens nos scripts locais. Fotos usam getPublicUrl; acesso efetivo ao bucket e isolamento não foram verificados | Confirmar regras de consistência de avaria e policies/privacidade de fotos. Não declarar proteção por base para URLs públicas | Incluído em S02 |
| S08 | MÉDIO | assignments modal / MobileSidebar | Falta infraestrutura completa de teclado/foco nos overlays restantes | Migração específica com testes de sobreposição e mobile | NÃO; teste/revisão pendente |
| S09 | BAIXO | lib/supabase/admin.ts | Consumidores atuais são apenas APIs, mas falta barreira explícita server-only | Adicionar proteção contra import cliente em alteração própria; nenhuma exposição da chave constatada | NÃO |
| S10 | BAIXO | login / APIs de convite | Logs de perfil no navegador, respostas técnicas e nenhum rate limit da aplicação localizado | Reduzir logs e avaliar limites de convite/reenvio; não presumir inexistência de limites Supabase/plataforma | NÃO |
| S11 | INFORMATIVO | README/config/deploy | README cita Next 15 e mecânico; build avisa de lockfile externo ao Git; ambiente remoto não auditado | Atualizar documentação e conferir raiz/configuração Vercel, redirects, SMTP e backups | NÃO isoladamente |

Não foi confirmada exposição crítica de service role no cliente. Não há declaração de ausência de vulnerabilidades: esta é uma auditoria estática com limites explícitos.

### APIs atuais (todos os quatro endpoints)

APIs não constam do matcher do proxy: cada handler precisa se proteger e os quatro verificam getUser. Testes com mocks retornaram 401 sem criar cliente privilegiado/chamar RPC em todos os quatro.

| Endpoint POST | Autenticação/autorização | Branch/IDOR | Validação e mutation | Erros / service role |
|---|---|---|---|---|
| /api/admin/managers | getUser + perfil ativo + role admin | Base existente/ativa consultada no servidor; admin global pode selecionar base | Validação manual; cria Auth user e upsert profile branch_manager; deleteUser compensatório em falha | 401/403/400/500; alguns detalhes Auth retornados. Service role apenas depois das verificações; rollback não transacional |
| /api/manager/drivers | getUser + branch_manager ativo com branch_id | Ignora branch do payload; usa base do gestor e valida base ativa | Zod fullName/email, verifica e-mail existente, convite e upsert driver; deleteUser compensatório | 401/403/400/409/500. Service role somente após autorização. Testar concorrência de convites e falha compensatória |
| /api/manager/drivers/[id]/resend-invite | getUser + branch_manager ativo | Consulta driver por id + role driver + branch do gestor antes de admin.getUserById | Não valida UUID com Zod; verifica e-mail e conta não confirmada; reenvia convite. Seleciona active do driver mas não o valida, nem estado ativo da base | 401/403/404/409/500; erro Auth pode ser retornado. Service role após escopo. Revisar política para reenvio a inativos |
| /api/maintenance/[id]/transition | getUser no handler; role/branch/active delegados à RPC | UUID Zod; RPC verifica manutenção e veículo da base | Zod enum start/complete_and_release; POST chama transition_maintenance_record com sessão do usuário | Mapeia 42501→403, P0002→404, 23505/23514→409, 22023→400. Sem service role. Provar RPC aplicada e grants de escrita direta |

### Matriz de operações do banco

Legenda: **NC** = não comprovado no banco aplicado; **local** = evidência no script, condicionada à aplicação e aos demais grants/policies. Não foi executada nenhuma operação abaixo.

| Tabela | SELECT | INSERT | UPDATE | DELETE | Evidência e escopo a provar |
|---|---|---|---|---|---|
| profiles | NC | APIs com service role; RLS NC | Admin altera active via cliente; RLS NC | NC | Garantir próprio perfil sem editar role/branch; gestor somente base; globals conforme política |
| vehicles | NC | manager/vehicles/new direto; RLS NC | Admin direto + triggers/RPC; RLS NC | NC | current_branch_id, assignment ativo, proteção de driver_id/status; campos do payload não bastam |
| driver_vehicle_assignments | NC | RPC; grant direto revogado localmente | RPC; grant direto revogado localmente | Grant direto revogado localmente | Driver próprio vínculo, branch_manager própria base; índices únicos ativos são pré-requisito não definidos pela migration de RPC |
| driver_checklists | NC | Guard local + normalização identidade/assignment/KM | NC | NC | Policy INSERT permissiva não inventaria outras policies; trigger sync não é criado nesse script, binding precisa ser comprovado |
| fuel_records | NC | RLS habilitado localmente; policy restritiva + trigger de identidade | NC | NC | Policy restritiva exige política permissiva compatível; driver/gestor/global tratados no helper; outros privilégios não inventariados |
| maintenance_records | NC | Trigger de checklist local | RPC de transição local; grants diretos NC | NC | Leitura por base, criação e conclusão; completed_by adicionado pela proposta |
| maintenance_releases | NC | RPC local | NC | NC | Histórico por base, unicidade por maintenance_record_id proposta, negar adulteração direta |
| branches | NC | admin/branches/new direto; RLS NC | admin/branches direto; RLS NC | NC | Estado ativo e permissão global, sem acesso cruzado indevido |
| states | NC | NC | NC | NC | Consumida nas telas administrativas; catálogo aplicado ausente |
| vehicle_transfers | NC | NC | NC | NC | Apenas estrutura contextual; histórico deve ser protegido |
| driver_branch_transfers | NC | NC | NC | NC | Apenas estrutura contextual; histórico deve ser protegido |
| audit_logs | NC | NC | NC | NC | Escrita e imutabilidade não certificadas |
| vehicle_fuel_consumption_stats | NC | NC | NC | NC | Consumida em driver/fuel; definição da relação/view ausente do snapshot e migrations. Verificar security_invoker, grants e escopo se for view |
| transactions | NC | NC | NC | NC | Snapshot legado; consumidores externos desconhecidos |
| driver_assignments / motoristas | NC | NC | NC | NC | Não utilizadas pelas consultas atuais localizadas; não remover sem catálogo e consumidores externos |

Grants: migration de assignments revoga ALL de anon/PUBLIC, revoga INSERT/UPDATE/DELETE/TRUNCATE de authenticated e concede SELECT. Não revoga explicitamente REFERENCES/TRIGGER de authenticated. As demais tabelas não têm inventário completo de ACLs; não se pode afirmar que anon/PUBLIC não escrevem, ou que authenticated não altera identidade/status diretamente. Service role é privilegiada por desenho; seus grants efetivos também não foram consultados. RLS não substitui a revisão de grants ([documentação Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)).

### Funções SECURITY DEFINER localizadas

Todas as sete funções abaixo definem search_path vazio e qualificam tabelas por schema. Funções do pg_catalog aparecem em parte sem qualificação; não foi observado objeto público resolvido pelo search_path vazio. Proprietários e EXECUTE efetivos no banco não foram consultados.

| Função | Autorização/validação local | EXECUTE local | Limite/ação |
|---|---|---|---|
| normalize_driver_checklist_identity | auth.uid, driver ativo, base, assignment único, veículo, KM; sobrescreve identidade | Revogado PUBLIC/anon/authenticated | Trigger BEFORE INSERT criado; testar duplicidade, KM e dados adulterados |
| sync_vehicle_from_checklist | Confere identidade em NEW, perfil/base/assignment/veículo, KM; não compara diretamente auth.uid | Revogado PUBLIC/anon/authenticated | Depende da normalização e de binding de trigger preexistente; has_issue recebido decide manutenção |
| normalize_driver_fuel_identity | auth.uid/perfil ativo; driver validado por assignment/base/veículo e valores | Revogado PUBLIC/anon/authenticated | Papéis administrativos retornam NEW e dependem das policies |
| private.authorize_fuel_insert | auth.uid, perfil ativo; globals, gestor por branch; driver por identidade/assignment/base | PUBLIC/anon revogados; authenticated recebe EXECUTE e USAGE private | Retorna boolean; conferir schema private não exposto e políticas permissivas necessárias |
| sync_vehicle_from_fuel_record | Vehicle/base/KM monotônico; sem auth.uid próprio | Revogado PUBLIC/anon/authenticated | AFTER INSERT depende de guard/normalização anterior |
| transition_maintenance_record | auth.uid, papel, active, base, estados, locks manutenção/veículo, liberação única | authenticated após revogar PUBLIC/anon/authenticated | S05: NULL em p_action. Revisar concorrência com checklist e grants de tabelas |
| manage_driver_vehicle_assignment | auth.uid, gestor/base ativos, motorista/base, veículo Ativo/base, expected_assignment_id, revalidação | authenticated; owner postgres; PUBLIC/anon revogados | Advisory lock por driver; locks de veículos ordenados; NO KEY UPDATE assignment; exige unicidades ativas externas ao script |

Assignments: fonte oficial confirmada no código/migrations, espelho vehicles.driver_id atualizado em assign/replace/remove. Não foi encontrada escrita cliente residual direta em driver_vehicle_assignments. Concorrência foi revisada estaticamente, não testada no banco. História de grants, funções antigas e triggers fora das quatro migrations permanece desconhecida.

A condição NULL em S05 foi identificada por leitura estática, sem SQL: IF em PL/pgSQL executa o ramo somente quando a condição é true ([PostgreSQL](https://www.postgresql.org/docs/current/plpgsql-control-structures.html)). Não há p_action IS NULL no guard, e o caminho de conclusão fica depois do ramo start.

### Escritas cliente

| Local | Operação | Classificação |
|---|---|---|
| manager/vehicles/new | vehicles.insert | INCERTO: validação cliente não prova RLS/branch no banco |
| admin/vehicles | vehicles.update | INCERTO: comprovar role/global e restrição de campos |
| admin/managers | profiles.update(active) | INCERTO: comprovar proteção de profiles e autorização de alterações |
| admin/branches e admin/branches/new | branches.update / insert | INCERTO: comprovar RLS global |
| driver/checklist | driver_checklists.insert; upload Storage | Desenho protegido por trigger/guard local; INCERTO no banco aplicado e no Storage |
| driver/fuel | fuel_records.insert | Desenho protegido por RLS/trigger local; INCERTO no banco aplicado |
| manager/drivers | RPC manage_driver_vehicle_assignment | Mecanismo transacional correto no código; aplicação/grants/concorrência pendentes |
| DeleteVehicleModal | vehicles.delete | Sem consumidor; não é fluxo ativo localizado |

Não foi classificada nenhuma escrita como “segura via RLS” sem prova do ambiente. Não foram migradas automaticamente para servidor/RPC. APIs privilegiadas e alterações de senha em Supabase Auth foram auditadas separadamente, não confundidas com escrita direta em tabela.

## Etapa 20 — produção

### Rotas e autenticação

- `/` redireciona para `/login`. Login autentica, busca profile/active/role/base e usa getHomeByRole.
- `/admin/**`: proxy permite admin/fleet_manager. Inclui dashboard, states, branches/new, managers/new, vehicles, drivers, checklists, fuel. A API de criar gestor aceita somente admin; diferença de capacidade precisa permanecer explícita na UI.
- `/manager/**`: proxy permite branch_manager e globals; exige branch para gestor. Algumas páginas de base restringem a branch_manager e rejeitam globals, uma inconsistência de navegação/experiência a revisar, não prova de bypass.
- `/driver`, `/driver/checklist`, `/driver/fuel`: proxy permite driver. Fluxos de checklist/fuel atuais consomem assignment oficial; dashboard mantém S01.
- `/maintenance`: global ou gestor com base. API possui proteção independente.
- `/auth/callback`, `/auth/confirm`, `/auth/accept-invite`, `/reset-password`: públicas no proxy para permitir troca de código/OTP; alteração de senha depende da sessão Supabase. Confirm usa pathname em URL clonada; o redirecionamento externo reproduzido é no callback, que usa new URL(safeNext, base).
- Quatro endpoints API inventariados acima. Nenhuma rota mechanic localizada. Páginas e menus principais têm destinos presentes; navegação autenticada completa não foi exercitada.
- Proxy valida claims e consulta perfil; AppShell faz checagem adicional cliente. Não existe layout do grupo dashboard com autorização servidor. Segurança de dados depende do banco/API, não do AppShell.

### Fluxos críticos e testes pendentes

| Fluxo | Evidência local | Resultado |
|---|---|---|
| Login → perfil → destino | Proxy, login e roles auditados; APIs sem sessão retornaram 401 em mocks | Testes reais das quatro roles, perfil inativo/sem base, renovação/expiração e cookies pendentes |
| Assignment → dashboard | Fonte oficial + espelho na RPC | FAIL S01; teste com erro de fonte, ausência e dados legados obrigatório |
| Checklist com avaria | Trigger local atualiza veículo e insere maintenance_record com source_checklist_id único | BLOCKED S02; testar binding, itens inconsistentes/has_issue, identidade e KM manipulados |
| Fuel | Trigger local normaliza identidade e métricas, sincroniza KM | BLOCKED S02; testar concorrência com checklist, valores inválidos e isolamento |
| Maintenance | API → RPC; pending → in_progress → completed; release único; só Ativo sem outra pendência | BLOCKED S02/S05; testar NULL direto, transição repetida, múltiplas pendências e concorrência |
| Assign → replace → remove | RPC transacional com expected_assignment_id | BLOCKED S02; testar corrida entre dois gestores e stale assignment |
| Branch isolation | Filtros cliente + guards API/RPC locais | BLOCKED S02; testar SELECT/INSERT/UPDATE/DELETE com IDs de outra base via Data API e RPC |

### Ambiente, dependências e deploy

- Variáveis referenciadas: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL. As quatro estão presentes localmente; valores não foram impressos. Configuração de produção não confirmada.
- Não foi encontrada variável NEXT_PUBLIC contendo service role/secret. createAdminClient é importado somente pelas três APIs de usuários, após checagem de identidade/escopo. Não há import cliente localizado. `.env*` está ignorado no Git; nenhum env versionado localizado.
- NEXT_PUBLIC_APP_URL controla redirects de convite, com fallback para origem da request; validar URL canônica e allowlist Supabase/Vercel. next.config.ts restringe imagens ao host Supabase configurado, mas fotos atuais usam unoptimized/public URL; política do bucket precisa ser auditada.
- Instalado: Next 16.3.1, React/React DOM 19.2.8, Supabase JS 2.105.1 e SSR 0.10.2. package-lock.json versionado; package.json usa ranges. Nenhuma versão foi alterada.
- `npm audit --omit=dev --json`: exit 1, um pacote vulnerável (ws@8.20.0), vindo de @supabase/realtime-js. Não é erro de lint/build. Advisory alto [DoS, corrigido em 8.21.0](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p) e moderado [memória, corrigido em 8.20.1](https://github.com/websockets/ws/security/advisories/GHSA-58qx-3vcg-4xpx). Não foi demonstrado caminho explorável na aplicação; não há websocket server ou uso de channel em src localizado. Atualização controlada/avaliação de exposição pendente.
- Warning do build: lockfile em C:/Users/Note é externo ao repositório e foi ignorado. Não foi alterado arquivo fora do projeto ou turbopack.root sem necessidade.
- Não há configuração Vercel versionada localizada; confirmar projeto, root directory, Node runtime, env, domínio/HTTPS, allowlist, SMTP, backup e restauração. Nenhum deploy realizado.
- README ainda cita Next 15 e papel Mecânico. Documentação a atualizar sem confundir implementação com roadmap.
- Layouts usam sm/md/lg/xl e overflow nos cards/listas. Novos modais limitam altura a 100dvh menos margens. Overflow real, teclado virtual, contraste e zoom precisam de navegador. Busca de manager/checklists ainda depende de placeholder, modal de assignments e MobileSidebar requerem trabalho de acessibilidade.

### Validações

- Etapa 17: lint sem erros (warning preexistente), build/TypeScript e diff check aprovados; teste de DOM simulado aprovado.
- Etapa 18: remoção do conjunto legado seguida de busca de referências, lint sem erros (mesmo warning), build/TypeScript e diff check aprovados.
- Etapa 19: auditoria sem mudança de segurança; quatro testes 401 com mocks, três testes 403 para role incorreta nas APIs de usuários, teste 404 para motorista ausente no resultado autorizado da base e teste 400 para action NULL no handler de manutenção. Reprodução do redirecionamento externo com parser de URL. Mocks não provam isolamento RLS. Nenhum teste SQL/RLS executado.
- Etapa 20/final: npm run lint aprovado sem erros ou warnings; npm run build aprovado, incluindo TypeScript e geração das páginas; git diff --check aprovado. Permanece apenas o aviso do build sobre lockfile externo. totalDistance morto removido; calculateDistance e métricas efetivamente usadas permanecem. Não existe script typecheck separado.

## Checklist de produção

| Item | Estado | Condição |
|---|---|---|
| Build | PASS | Checkpoints e build final aprovados, incluindo TypeScript |
| Lint | PASS | Execução final sem erros ou warnings |
| Auth | PASS LOCAL | S03 corrigido; oito testes com mocks. Auth real ainda requer homologação |
| Roles | MANUAL | Guards auditados; exercitar quatro roles e revisar papel desconhecido |
| RLS | BLOCKED | S02: catálogo aplicado e testes negativos ausentes |
| Branch isolation | BLOCKED | S02: operações por base não certificadas |
| Assignments | BLOCKED | S01 corrigido e testado localmente; S02 para RPC/índices/isolamento |
| Checklist | BLOCKED | S02: triggers/policies/avaria/Storage |
| Fuel | BLOCKED | S02: policies/triggers aplicados |
| Maintenance | BLOCKED | S02/S05: migration corretiva preparada, aplicação e validação real pendentes |
| Modals | MANUAL | Dois migrados testados com mocks; teclado real e overlays restantes pendentes |
| Mobile | MANUAL | Sem teste visual em navegador |
| Accessibility | MANUAL | Lacunas documentadas; leitor de tela/contraste/foco real pendentes |
| Env | MANUAL | Presença local confirmada, produção não auditada |
| Deploy | BLOCKED | S02/S05 e validação remota pendente |
| Dependências | PASS PRODUÇÃO | S04 corrigido; audit --omit=dev zero. Audit completo possui dois pacotes dev high |

Bloqueadores atuais: S02 (comprovação do banco/isolamento) e S05 (aplicação e validação da correção da ação NULL na definição real). S01/S03/S04 foram corrigidos e validados localmente. Nenhuma proteção do banco foi declarada pronta apenas porque a UI esconde ações ou o build passa.
