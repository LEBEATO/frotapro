# Auditoria de produção - FrotaPro

Data: 08/09/2026. Escopo: fechamento documental de S01-S05 após os testes informados do banco real e da Vercel. Nesta atualização não foi executado SQL, nenhuma migration, RLS ou código da aplicação foi alterado, e não houve commit ou push.

## A. Status S01-S05

| Item | Estado | Fato comprovado |
|---|---|---|
| S01 | [PASS] RESOLVIDO | O dashboard usa somente `driver_vehicle_assignments`; falha da consulta oficial não usa fallback legado. |
| S02 | [PASS] RESOLVIDO | RLS, isolamento entre motoristas e bases, grants estruturais, tabelas legadas, assignments, checklist, fuel, manutenção e Storage privado foram testados. |
| S03 | [PASS] RESOLVIDO | Open redirect corrigido e testado. |
| S04 | [PASS] RESOLVIDO | Dependência `ws` atualizada; `npm audit --omit=dev` ficou sem vulnerabilidades. |
| S05 | [PASS] RESOLVIDO | RPC de manutenção rejeita `p_action` nulo ou inválido no banco real. |

`checklist-photos` foi testado na Vercel antes e depois de ficar privado: proprietário autorizado = 1, `anon` = 0 e motorista de outra base = 0; signed URL funcionou. As 17 referências históricas sem objeto no Storage são dívida de dados históricos, não falha da nova segurança.

## B. Checklist de produção

| Item | Estado | Evidência ou pendência |
|---|---|---|
| Build | [PASS] | `npm run build` passou com compilação, TypeScript e geração das páginas. O aviso do lockfile externo permaneceu. |
| Lint | [PASS] | `npm run lint` passou sem saída de erro. |
| Auth | [MANUAL] | Testar login, convite, recuperação, sessão, expiração e perfil inativo com usuários reais. |
| Roles | [MANUAL] | Exercitar `admin`, `fleet_manager`, `branch_manager` e `driver` no navegador. |
| RLS | [PASS] | RLS ativo e testes reais de isolamento e negação passaram. |
| Branch isolation | [PASS] | JTG não acessa a Base São Paulo; escritas cross-branch foram bloqueadas. |
| Assignments | [PASS] | Assignment oficial, isolamento entre motoristas e escrita direta bloqueada foram confirmados. |
| Checklist | [PASS] | Checklist para veículo alheio foi bloqueado e fotos privadas foram autorizadas corretamente. |
| Fuel | [PASS] | Fuel para veículo alheio foi bloqueado. |
| Maintenance | [PASS] | RPC bloqueia outra base e `p_action` nulo/inválido é rejeitado. |
| Modals | [MANUAL] | Confirmar foco, teclado, sobreposição, loading e mobile em navegador real. |
| Mobile | [MANUAL] | Testar celular, tablet, desktop, zoom e teclado virtual. |
| Accessibility | [MANUAL] | Testar teclado, leitor de tela, contraste, foco e labels. |
| Env produção | [MANUAL] | Confirmar variáveis, URL canônica, secrets server-side, SMTP, domínio e allowlists. |
| Deploy | [MANUAL] | Confirmar Vercel, smoke test, logs, backup e restauração. |
| Dependências | [PASS] | S04 resolvido; audit de produção sem vulnerabilidades. Audit completo ainda pode conter dependências de desenvolvimento pendentes. |

## C. Bloqueadores reais restantes

Nenhum bloqueador real foi identificado após o fechamento de S01-S05.

Os itens `[MANUAL]` acima são validações pendentes, não foram promovidos a `[PASS]` e não constituem bloqueadores de segurança comprovados.

## D. Testes manuais restantes

- Auth e os quatro roles em navegador.
- Fluxos completos de login, assignment, checklist, fuel e maintenance.
- Concorrência de assignments e transições.
- Modais, mobile e acessibilidade.
- Ambiente de produção, deploy, SMTP, domínio, logs, backup e restauração.

## E. Dívidas técnicas restantes

- 17 referências históricas de fotos sem objeto no Storage.
- Foco e teclado de overlays remanescentes.
- Logs, validações de APIs e aliases de roles.
- README desatualizado.

Melhorias futuras do ROADMAP, como indicadores, alertas, auditoria de produto, transferências completas e IA, não são bloqueadores desta auditoria.

## F. Arquivos alterados

- [ROADMAP.md](ROADMAP.md)
- [AUDITORIA_PRODUCAO.md](AUDITORIA_PRODUCAO.md)
- [S02_SEGURANCA.md](S02_SEGURANCA.md)

## G. Validação desta atualização

- `npm run lint`: passou.
- `npm run build`: passou.
- `git diff --check`: passou sem saída.

## H. Decisão atual

**PRONTO COM TESTES MANUAIS PENDENTES**
