# S02 - revisão de segurança baseada no banco real

Data: 07/09/2026. Escopo: resultado READ-ONLY fornecido pelo usuário, código versionado e as três migrations locais. Nenhum SQL foi executado, nenhuma migration foi aplicada e não houve commit/push.

## A. Estado real confirmado

- RLS está habilitado nas principais tabelas operacionais.
- `public.driver_assignments` existe e possui as policies legadas `Allow select for authenticated` e `Allow upsert for authenticated`. O resultado informado as classifica como acesso amplo para usuários autenticados.
- `public.motoristas` existe e possui `Motoristas podem ver seu próprio perfil`.
- `storage.objects` possui `Acesso público às fotos de checklists` e `Upload de fotos de checklists`.
- O bucket `checklist-photos` está com `public = true`.
- `anon`/`authenticated` possuem grants estruturais amplos, incluindo `TRUNCATE`, `REFERENCES` e `TRIGGER` em várias tabelas.
- A confirmação de RLS não prova isolamento por linha, nem substitui a revisão de grants, owners, memberships, policies completas e funções.
- Busca local não encontrou query, import, API, função/trigger versionado ou consumidor operacional de `driver_assignments`, `motoristas` ou `transactions`. Textos de interface sobre “motoristas” não são consumidores dessas tabelas. Isso não comprova ausência de views, funções, triggers ou consumidores externos no banco.
- O único uso de `getPublicUrl` encontrado é em `src/app/(dashboard)/driver/checklist/page.tsx`, no upload de fotos do checklist. O código persiste a URL pública, não apenas a chave do objeto.

## B. Problemas confirmados

| Área | Problema | Classificação |
|---|---|---|
| `driver_assignments` | Policies legadas permitem leitura e upsert amplos a `authenticated`; a tabela não tem consumidor local conhecido | REQUIRES MANUAL TEST |
| `motoristas` | Tabela legada e policy de leitura do próprio perfil ainda existem; consumidor local não encontrado | REQUIRES MANUAL TEST |
| Checklist photos | Bucket público e leitura pública permitem exposição entre motoristas; upload nominalmente amplo pode permitir escrita fora do escopo | DO NOT APPLY à correção temporária; REQUIRES FRONTEND CHANGE para a solução definitiva |
| Grants | Privilégios estruturais excessivos foram confirmados em várias tabelas; o conjunto efetivo por relação/role ainda deve ser confrontado antes de revogar | REQUIRES MANUAL TEST |
| `transactions` | A tabela foi localizada no snapshot/auditoria local, mas o resultado fornecido não informa ACLs/policies detalhadas; nenhum revoke é autorizado por suposição | DO NOT APPLY alteração adicional |

## C. Revisão da migration `20260907234111_isolate_legacy_tables.sql`

Consumidores: a busca local não encontrou uso das tabelas. Não há DROP, DELETE de dados ou alteração de colunas. A ausência local não elimina dependências externas do banco.

| Comando/bloco | Comparação com o estado real | Decisão |
|---|---|---|
| `BEGIN`/`COMMIT` e verificação de existência | As duas tabelas existem; a transação evita aplicação parcial | SAFE TO APPLY estruturalmente |
| Verificação de owner, `superuser` e `bypassrls` | Necessária para não tratar um papel de API privilegiado como isolado | REQUIRES MANUAL TEST |
| `ENABLE ROW LEVEL SECURITY` | Reforça o isolamento, mas não cria autorização útil por si só | SAFE TO APPLY |
| `DROP POLICY` nomeado | Remove exatamente `Allow select for authenticated`, `Allow upsert for authenticated` e `Motoristas podem ver seu próprio perfil`; também remove apenas as policies auxiliares desta proposta se existirem | REQUIRES MANUAL TEST |
| `REVOKE ALL` de `public`, `anon`, `authenticated` | Remove privilégios diretos de tabela nas duas tabelas; não resolve direitos herdados por memberships nem objetos que leiam a tabela | REQUIRES MANUAL TEST |
| `REVOKE` de colunas | Remove `SELECT`, `INSERT`, `UPDATE` e `REFERENCES` por coluna, inclusive grants que possam sobreviver ao revoke de tabela | REQUIRES MANUAL TEST |
| `GRANT ALL` para `service_role` e policy administrativa | Preserva administração, mas pode ampliar ACL se `service_role` não tivesse `ALL`; `postgres` permanece owner e não é alvo | REQUIRES MANUAL TEST |
| Policy restritiva `legacy_deny_application` | Nega `anon`/`authenticated` mesmo se outra policy permissiva permanecer; não afeta `postgres` | SAFE TO APPLY após conferência de policies |
| Verificação pós-revoke | Aborta se privilégios efetivos permanecerem; não altera memberships nem prova segurança de RPC/view | SAFE TO APPLY como guard |

**Resultado:** a migration é tecnicamente coerente para isolamento, mas não está liberada incondicionalmente. Antes dela, conferir catálogo de policies completo, ACLs efetivas, memberships, owners, views, funções e triggers. Preservar `postgres`/owner e `service_role` somente no escopo administrativo comprovado. Não deletar as tabelas.

## D. Revisão da migration de checklist photos

Arquivo: `supabase/migrations/20260907234219_harden_checklist_photo_storage.sql`.

O arquivo é uma proposta temporária rejeitada e **não deve ser aplicado**. Ele:

- cria guards restritivos para `INSERT`, upload autenticado por prefixo `auth.uid()`, negação de upload anônimo e negação de `UPDATE`/`DELETE`;
- não executa `UPDATE storage.buckets SET public = false`;
- não remove `Acesso público às fotos de checklists`;
- não cria `SELECT` autenticado por motorista/base/role;
- não substitui URLs públicas por chaves ou URLs assinadas.

Logo, aplicá-lo deixaria a leitura pública ativa e não resolveria o achado confirmado. Classificação: **DO NOT APPLY**.

A solução definitiva deve ser uma migration substituta, revisada junto com o frontend: bucket privado; remoção de toda policy pública de `SELECT`; upload autenticado somente para chave `<auth.uid()>/<uuid>.<ext>`; nenhum `UPDATE`/`DELETE`/move para clientes; `SELECT` baseado no checklist referenciado, no `branch_id` histórico e no role efetivo. Motorista acessa apenas seus objetos; `branch_manager`, apenas checklists da própria base; `fleet_manager`/`admin`, conforme escopo autorizado. Não confiar em path, role, base ou IDs enviados pelo cliente sem validar o vínculo no banco.

## E. Revisão da migration de grants

Arquivo: `supabase/migrations/20260907234227_tighten_safe_grants.sql`.

O script revoga `TRUNCATE`, `REFERENCES` e `TRIGGER` de `public`, `anon` e `authenticated` em `profiles`, `branches`, `vehicles`, `driver_vehicle_assignments`, `driver_checklists`, `fuel_records`, `maintenance_records` e `maintenance_releases`. Também revoga `REFERENCES` por coluna e aborta se privilégios estruturais efetivos permanecerem.

- Não revoga `SELECT`, `INSERT`, `UPDATE` ou `DELETE`; portanto preserva os DML necessários localizados no código.
- Não altera RLS, policies, funções, `EXECUTE`, owners, `service_role` ou FKs já criadas.
- Não inclui `transactions`, `states`, tabelas de transferência, `storage.objects` ou outras relações fora do escopo.
- `TRIGGER` é privilégio para criar/disparar mecanismos de trigger; não é necessário para uma operação DML normal. `REFERENCES` é necessário para criar FKs, não para inserir sob uma FK existente.
- O revoke de tabela não basta se o direito vier de membership, role herdada ou owner; o guard existente aborta nesses casos.

| Grupo | Decisão |
|---|---|
| Revokes estruturais nas oito tabelas listadas | SAFE TO APPLY quanto ao escopo, REQUIRES MANUAL TEST antes de homologação/produção |
| Revokes de DML não incluídos | DO NOT APPLY sem evidência de que não há consumidores |
| Revokes em `transactions` | DO NOT APPLY por enquanto; resultado efetivo específico não foi fornecido |
| RLS e policies | Avaliar separadamente; grants não comprovam autorização por linha |

## F. Impacto necessário no frontend para bucket privado

O fluxo atual de `src/app/(dashboard)/driver/checklist/page.tsx` chama `getPublicUrl` e grava URLs públicas em `photos[]`. Isso é incompatível com bucket privado.

Arquivos afetados no pacote coordenado:

- `src/app/(dashboard)/driver/checklist/page.tsx`: persistir object keys, mantendo previews locais; remover `getPublicUrl`.
- `src/app/(dashboard)/manager/checklists/page.tsx`: resolver referências autorizadas ao abrir a visualização, com loading/erro/expiração.
- `src/components/checklists/ChecklistPhotosModal.tsx`: renderizar URLs temporárias ou Blob URLs, sem fallback público.
- `src/components/checklists/types.ts`: separar referências persistidas de URLs temporárias de apresentação.
- `src/components/checklists/ManagerChecklistCard.tsx`: revisar o contrato do acionador.
- `src/lib/checklist-photos.ts`: novo helper para validar chave/URL histórica do host e bucket corretos, rejeitar path traversal e resolver acesso usando cliente autenticado.

Compatibilidade histórica: identificar URLs públicas já persistidas, aceitar somente host/bucket esperados, extrair a chave com validação estrita e não persistir signed URLs. Signed URLs podem ter prazo curto, por exemplo 300 segundos, renovadas ao abrir o modal. Não usar service role no navegador e não usar URL pública como fallback. O frontend não foi alterado nesta revisão porque a mudança precisa ser implantada junto com a migration definitiva.

## G. Migrations que podem ser aplicadas agora

Nenhuma deve ser aplicada diretamente em produção nesta revisão.

Como candidatas para homologação, após preflight do catálogo e autorização explícita:

- `20260907234111_isolate_legacy_tables.sql`: candidata condicionada a owners, memberships, policies completas, objetos dependentes e teste de administração `postgres`/`service_role`.
- `20260907234227_tighten_safe_grants.sql`: candidata condicionada à confirmação de que os oito alvos e seus privilégios estruturais não são usados por jobs, migrations, funções ou ferramentas externas.

“SAFE TO APPLY” acima descreve o comando isolado e o escopo local; não significa que a aplicação foi autorizada ou validada no banco.

## H. Migrations que não devem ser aplicadas ainda

- `20260907234219_harden_checklist_photo_storage.sql`: **DO NOT APPLY**, pois mantém bucket público e leitura pública.
- Qualquer migration nova que apenas altere `public` sem leitores autenticados prontos: **DO NOT APPLY**, pois quebraria o frontend atual sem concluir o controle de acesso.
- Qualquer revoke adicional em `transactions`, `profiles`, `vehicles`, `branches` ou DML operacional sem catálogo efetivo e comprovação de consumidor: **DO NOT APPLY**.

## I. Testes necessários depois da aplicação

Executar somente em homologação com fixtures e credenciais de teste:

1. Confirmar ACLs efetivas, owners, memberships, `BYPASSRLS`, policies completas, grants e existência de views/RPCs/triggers dependentes.
2. Para `driver_assignments` e `motoristas`, testar `SELECT`/`INSERT`/`UPDATE`/`DELETE` por `anon` e pelos quatro roles; confirmar ausência de efeitos e disponibilidade administrativa de `postgres`/`service_role`.
3. Para as oito tabelas de grants, confirmar que DML legítimo continua funcionando e que `TRUNCATE`/`REFERENCES`/`TRIGGER` não são concedidos aos papéis de API.
4. Testar `driver_checklists`, `fuel_records`, `maintenance_records` e `maintenance_releases` com identidade, veículo, base e IDs de outra base; verificar zero alteração indireta em KM, status, assignments e releases.
5. Testar `driver_vehicle_assignments` por RPC em assign/replace/remove, corrida e assignment obsoleto; confirmar isolamento por base.
6. Testar `profiles`, `vehicles`, `branches` e `transactions` com `SELECT` e DML de cada role, preservando apenas operações comprovadamente legítimas.
7. Após a solução privada de Storage, testar upload próprio, leitura própria, leitura de gestor da mesma base, leitura global autorizada e negação entre motoristas/bases; testar fotos históricas e novas, expiração de signed URL e ausência de URL pública.
8. Reexecutar `npm run lint`, `npm run build` e os testes locais; depois realizar teste manual em navegador para upload, modal, loading, erro, expiração e mobile.

## J. Decisão sobre S02

**S02 permanece aberto.** O estado real confirmou os bloqueadores de policies legadas, Storage público e grants estruturais amplos. As migrations de isolamento e grants são candidatas condicionais a homologação; a migration atual de Storage deve ser rejeitada e substituída por uma solução privada coordenada com o frontend. O bloqueador só pode ser encerrado após aplicação autorizada, testes negativos/positivos por role/base e validação de fotos novas e históricas.
