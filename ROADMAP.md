# ROADMAP — FrotaPro V1

## Auditoria das etapas 17–20 — 07/09/2026

Relatório e matrizes: [AUDITORIA_PRODUCAO.md](AUDITORIA_PRODUCAO.md).

- **CONCLUÍDO:** infraestrutura Modal e migração de ChecklistPhotosModal/VehicleDetailsModal; testes com DOM simulado. ConfirmModal preservado.
- **CONCLUÍDO:** remoção da action create-vehicle e do módulo de schemas sem consumidores; remoção do agregado totalDistance não utilizado em manager/fuel.
- **CONCLUÍDO:** auditoria estática das rotas, quatro APIs, quatro migrations e snapshot local; checkpoints de lint/build/TypeScript executados. Isto não certifica o banco aplicado.
- **RESOLVIDO NO CÓDIGO S01:** dashboard usa somente assignment oficial; erro, múltiplos resultados, veículo ausente e base divergente exibem erro, ausência de assignment exibe estado sem veículo. Dez testes com mocks, lint e build passaram; integração real depende de S02.
- **BLOQUEADOR S02:** RLS/grants/triggers/índices efetivos e isolamento entre bases/motoristas não comprovados; confirmar migrations aplicadas e executar testes negativos em homologação mediante autorização.
- **RESOLVIDO NO CÓDIGO S03:** callback/confirm usam internalRedirect, validam caminhos ambíguos e origem normalizada; oito testes locais passaram, além de lint/build.
- **RESOLVIDO S04:** somente ws transitivo atualizado de 8.20.0 para 8.21.3, compatível com realtime-js; package.json preservado, audit de produção sem vulnerabilidades, lint/build aprovados.
- **S05 CONFIRMADO PELO USUÁRIO:** correção aplicada e confirmada no banco, conforme relato no pedido S02. O agente não reaplicou nem executou SQL.
- **S02 EM PREPARAÇÃO:** [S02_SEGURANCA.md](S02_SEGURANCA.md) contém matriz com lacunas explícitas, inventário de consumidores e dez testes negativos. Três migrations locais propostas: isolamento de legados, guard de upload e revokes estruturais. Nenhuma aplicada; leitura pública de fotos e prova de isolamento continuam bloqueadores. Resultado completo da auditoria real solicitado para completar policies/grants por operação.
- **PREPARADO S02:** supabase/audits/production-read-only.sql reúne catálogo de RLS, policies, grants, funções, triggers, índices e Storage. Não executado; aguarda resultado do banco real e testes de isolamento.
- **PENDENTE:** testes reais de auth, quatro roles, assignments concorrentes, checklist com avaria, combustível, manutenção/liberação e Storage.
- **PENDENTE:** navegador mobile/tablet/desktop, teclado, leitor de tela, contraste, foco e sobreposição de modais; validação do ambiente Vercel, redirects, SMTP e backup.
- **DÍVIDA TÉCNICA:** modal de assignments e menu mobile sem infraestrutura completa de foco; busca sem label em manager/checklists; README desatualizado; validação manual em APIs; aliases de roles; DeleteVehicleModal sem consumidores.
- **DECISÃO:** NÃO PRONTO PARA PRODUÇÃO. Nenhum SQL, migration, alteração de grants/RLS ou deploy executado nesta auditoria.

Legenda:

✅ concluído ou já implementado em boa parte
🟡 existente, porém precisa revisão/conclusão
⬜ pendente
🚫 fora da V1

---

# FASE 0 — Estado atual

✅ Projeto Next.js configurado

✅ TypeScript

✅ Tailwind CSS

✅ Supabase integrado

✅ autenticação existente

✅ estrutura App Router

✅ projeto no GitHub

✅ deploy/estrutura preparada para Vercel

✅ branch de evolução enterprise criada

---

# FASE 1 — Fundação Enterprise

🟡 Revisar arquitetura atual

🟡 Revisar componentes compartilhados

🟡 Revisar layout do dashboard

🟡 Revisar middleware/proteção de rotas

🟡 Revisar redirecionamento por perfil

⬜ Eliminar código duplicado

⬜ Eliminar referências obsoletas

⬜ Atualizar documentação

⬜ Revisar tratamento global de erros

⬜ Revisar loading states

⬜ Revisar empty states

---

# FASE 2 — Papéis e autorização

✅ Estrutura inicial de roles existente

Roles oficiais:

- admin
- fleet_manager
- branch_manager
- driver

⬜ Auditar todas as páginas por role

⬜ Auditar Server Actions

⬜ Auditar Route Handlers

⬜ Confirmar que driver não acessa gestor

⬜ Confirmar que branch_manager não acessa outra base

⬜ Confirmar visão global correta do fleet_manager

⬜ Remover referências ao papel mechanic onde estiverem obsoletas

---

# FASE 3 — Estados e bases

🟡 Estrutura de bases já iniciada

🟡 Gerenciamento de bases já possui implementação

⬜ Revisar tabela states

⬜ Revisar tabela branches

⬜ Garantir relacionamento estado → base

⬜ Garantir código único/adequado da base

⬜ Garantir status ativo/inativo

⬜ Validar unidade São Geraldo

⬜ Criar/ajustar interface de gestão de estados

⬜ Criar/ajustar interface de gestão de bases

⬜ Garantir segregação de dados

---

# FASE 4 — Motoristas

✅ Cadastro inicial existente

✅ convite de motorista existente

✅ fluxo de configuração de senha existente

✅ reenvio de convite existente

🟡 gestão de motoristas existente

⬜ revisão completa do formulário

⬜ ativar motorista

⬜ desativar motorista

⬜ editar motorista

⬜ trocar base

⬜ trocar estado

⬜ associação com veículo

⬜ troca de veículo

⬜ histórico de motorista

⬜ validações Zod completas

⬜ permissões server-side completas

---

# FASE 5 — Veículos

✅ cadastro de veículo existente

🟡 gerenciamento já iniciado

⬜ revisar formulário completo

⬜ editar veículo

⬜ status padronizado

⬜ quilometragem

⬜ base atual

⬜ motorista atual

⬜ associar motorista

⬜ trocar motorista

⬜ transferir veículo de base

⬜ histórico do veículo

⬜ filtros

⬜ busca

⬜ paginação se necessária

⬜ validação de placa

⬜ validação de quilometragem

---

# FASE 6 — Painel do motorista

✅ painel inicial existe

🟡 fluxo foi expandido recentemente

⬜ revisar UX completa

⬜ revisar responsividade celular

⬜ veículo atual

⬜ pendências atuais

⬜ checklist do dia

⬜ último checklist

⬜ acesso ao abastecimento

⬜ histórico de abastecimentos

⬜ abrir manutenção

⬜ acompanhar manutenção

⬜ alertas

⬜ mensagens claras quando não houver veículo associado

---

# FASE 7 — Checklist diário

✅ checklist já possui implementação

🟡 fluxo motorista/gestor já iniciado

⬜ revisar regra de checklist diário obrigatório

⬜ impedir duplicidade indevida no mesmo período

⬜ validar quilometragem

⬜ revisar todos os itens obrigatórios

⬜ registrar problema

⬜ registrar observação

⬜ fotos somente quando previstas

⬜ relacionar corretamente driver_id

⬜ relacionar vehicle_id

⬜ relacionar branch_id

⬜ gestor visualizar checklist

⬜ filtros por data

⬜ filtros por motorista

⬜ filtros por veículo

⬜ situação com problema

⬜ integrar problema grave ao fluxo de manutenção

⬜ histórico

---

# FASE 8 — Combustível

✅ módulo inicial criado

✅ fluxo motorista/gestor iniciado

⬜ adicionar/revisar valor do abastecimento

⬜ adicionar/revisar posto

⬜ combustível

⬜ litros

⬜ km anterior

⬜ km atual

⬜ validação km atual > km anterior

⬜ impedir valores inválidos

⬜ relacionar motorista

⬜ relacionar veículo

⬜ relacionar base

⬜ histórico

⬜ filtro por veículo

⬜ filtro por motorista

⬜ filtro por período

⬜ custo total

⬜ custo por km

⬜ consumo médio

⬜ dashboard de combustível

🚫 foto obrigatória do abastecimento

---

# FASE 9 — Manutenção

✅ estrutura inicial existe

✅ página/módulo iniciado

⬜ abertura pelo motorista

⬜ abertura pelo gestor

⬜ definir status oficiais

⬜ descrição do problema

⬜ veículo relacionado

⬜ base relacionada

⬜ motorista relacionado quando aplicável

⬜ colocar veículo em manutenção

⬜ acompanhamento

⬜ observação do gestor

⬜ conclusão

⬜ liberação

⬜ responsável pela liberação

⬜ data de conclusão

⬜ histórico

⬜ filtros

⬜ alertas

---

# FASE 10 — Transferências

⬜ tabela/estrutura de histórico de transferências

⬜ motorista entre bases

⬜ motorista entre estados

⬜ veículo entre bases

⬜ motorista trocando de veículo

⬜ registrar origem

⬜ registrar destino

⬜ registrar usuário responsável

⬜ registrar data

⬜ preservar histórico

---

# FASE 11 — Dashboard do gestor

✅ painel principal do gestor existente

🟡 informações operacionais já iniciadas

⬜ total de veículos

⬜ veículos ativos

⬜ veículos em manutenção

⬜ motoristas

⬜ checklists de hoje

⬜ checklists com problema

⬜ abastecimentos

⬜ gasto no período

⬜ manutenções abertas

⬜ alertas

⬜ últimas atividades

⬜ filtros por período

⬜ responsividade completa

---

# FASE 12 — Dashboard global / Fleet Manager

⬜ visão nacional

⬜ total de estados

⬜ total de bases

⬜ total de veículos

⬜ total de motoristas

⬜ combustível geral

⬜ manutenção geral

⬜ comparativo entre bases

⬜ comparativo entre estados

⬜ filtros

⬜ indicadores

⬜ alertas globais

---

# FASE 13 — Histórico e auditoria

⬜ definir estrutura de audit log

⬜ registrar alterações críticas

⬜ usuário responsável

⬜ data/hora

⬜ entidade

⬜ entidade_id

⬜ ação

⬜ valor anterior quando necessário

⬜ valor novo quando necessário

⬜ tela de auditoria para perfil autorizado

---

# FASE 14 — Alertas

⬜ checklist pendente

⬜ checklist com problema

⬜ manutenção aberta

⬜ manutenção atrasada

⬜ consumo fora do padrão

⬜ quilometragem relevante

⬜ problemas recorrentes

⬜ alertas no dashboard

---

# FASE 15 — Banco e RLS

🟡 Supabase já possui estrutura e políticas

⬜ auditoria completa do schema

⬜ auditar profiles

⬜ auditar vehicles

⬜ auditar driver_checklists

⬜ auditar fuel_records

⬜ auditar maintenance

⬜ auditar states

⬜ auditar branches

⬜ revisar foreign keys

⬜ revisar índices

⬜ revisar constraints

⬜ revisar tipos

⬜ revisar timestamps

⬜ revisar funções SQL

⬜ revisar policies RLS

⬜ testar driver

⬜ testar branch_manager

⬜ testar fleet_manager

⬜ testar admin

⬜ impedir acesso cruzado entre bases

---

# FASE 16 — Segurança da aplicação

⬜ revisar autenticação

⬜ revisar sessão

⬜ revisar middleware/proxy conforme Next.js atual

⬜ revisar Server Actions

⬜ revisar APIs

⬜ revisar variáveis de ambiente

⬜ garantir service role somente servidor

⬜ validação Zod em entradas críticas

⬜ tratamento de erro sem vazar detalhes sensíveis

⬜ autorização independente do frontend

---

# FASE 17 — UX profissional

⬜ desktop

⬜ tablet

⬜ celular

⬜ sidebar responsiva

⬜ menu mobile

⬜ tabelas responsivas

⬜ formulários responsivos

⬜ modais responsivos

⬜ feedback de sucesso

⬜ feedback de erro

⬜ loading

⬜ skeleton quando adequado

⬜ estados vazios

⬜ confirmação para operações destrutivas

⬜ acessibilidade

---

# FASE 18 — Indicadores

⬜ consumo médio por veículo

⬜ custo por veículo

⬜ custo por km

⬜ gasto por base

⬜ gasto por estado

⬜ manutenção por veículo

⬜ veículo com mais ocorrências

⬜ motoristas/checklists

⬜ evolução por período

---

# FASE 19 — Inteligência Artificial

Somente iniciar depois dos dados e indicadores estarem confiáveis.

⬜ detectar consumo anormal

⬜ detectar veículo com manutenção recorrente

⬜ comparar gasto gasolina/etanol quando aplicável

⬜ identificar tendências

⬜ gerar recomendações operacionais

⬜ explicar motivos da recomendação

⬜ evitar decisões automáticas de alto impacto

---

# FASE 20 — Testes e qualidade

⬜ lint sem erros

⬜ build sem erros

⬜ revisar TypeScript

⬜ testes de regras críticas

⬜ testes de permissões

⬜ testes mobile

⬜ testar fluxos completos

Fluxos mínimos:

login
→ dashboard

motorista
→ checklist

motorista
→ abastecimento

motorista
→ manutenção

gestor
→ motoristas

gestor
→ veículos

gestor
→ checklist

gestor
→ manutenção

gestor
→ transferências

---

# FASE 21 — Produção

⬜ revisar README

⬜ remover documentação antiga

⬜ README refletir Next.js 16

⬜ retirar referência a mechanic como role ativo

⬜ documentação de instalação

⬜ documentação Supabase

⬜ configurar ambientes

⬜ revisar Vercel

⬜ revisar logs

⬜ build final

⬜ teste final de produção

⬜ backup/estratégia de banco

⬜ release V1

---

# FORA DA V1

🚫 Stripe

🚫 assinatura

🚫 pagamento SaaS

🚫 módulo separado de mecânico

🚫 Flutter/app mobile nativo

🚫 white-label completo

🚫 customização avançada de logos

Esses itens somente poderão entrar após aprovação futura.

---

# REGRA DE EXECUÇÃO DO CODEX

O Codex deve trabalhar seguindo este roadmap.

Não executar todas as fases de uma só vez.

Para cada tarefa:

1. localizar o primeiro item relevante pendente;
2. analisar código existente;
3. implementar de forma incremental;
4. executar lint;
5. executar build;
6. atualizar este ROADMAP.md apenas se a tarefa realmente estiver concluída;
7. informar o que foi feito;
8. sugerir o próximo item.

Nunca marcar como ✅ algo que não tenha sido implementado e validado.
