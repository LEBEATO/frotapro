# S02 - segurança e isolamento

Data: 08/09/2026. Este documento registra o fechamento baseado nos testes realizados no banco real e na Vercel. Nesta tarefa não foi executado SQL, nenhuma migration foi alterada e não houve commit ou push.

## Estado

**S02 está RESOLVIDO.**

Foram confirmados:

- RLS ativo nas tabelas operacionais.
- Isolamento entre motoristas: cada motorista vê apenas o próprio perfil, veículo e assignment.
- Isolamento entre bases: o `branch_manager` da JTG não vê motorista, veículo, assignment, checklist, fuel ou manutenção da Base São Paulo.
- `anon` não vê dados operacionais.
- Escrita cross-branch bloqueada.
- Escrita direta autenticada em `driver_vehicle_assignments` bloqueada.
- RPC de manutenção bloqueia operação de outra base.
- Motorista não envia checklist nem registra fuel para veículo alheio.
- Tabelas legadas `driver_assignments` e `motoristas` isoladas, sem grants para `anon`/`authenticated`, com `legacy_deny_application`.
- `MAINTAIN`, `TRUNCATE`, `REFERENCES` e `TRIGGER` removidos das oito tabelas auditadas para `anon`/`authenticated`.
- Nenhuma tabela ou dado foi apagado.

## Checklist-photos

O bucket `checklist-photos` é privado. O fluxo foi testado na Vercel antes e depois de ficar privado:

- acesso do proprietário autorizado: 1;
- `anon`: 0;
- motorista de outra base: 0;
- acesso por signed URL funcionando na Vercel.

As 17 referências de fotos históricas sem objeto no Storage não são falha da nova segurança. Ficam registradas somente como dívida de dados históricos.

## Testes comprovados

1. Motorista não vê outro motorista.
2. Motorista não vê veículo de outro motorista.
3. Motorista não vê assignment de outro motorista.
4. `branch_manager` não vê dados de outra base.
5. `anon` não vê tabelas operacionais.
6. `branch_manager` não altera veículo de outra base.
7. Escrita direta em assignment bloqueada.
8. RPC de manutenção bloqueia outra base.
9. Checklist para veículo alheio bloqueado.
10. Fuel para veículo alheio bloqueado.
11. Fotos privadas com autorização correta.

## Classificação atual

- **Bloqueador de produção:** nenhum bloqueador real restante identificado após S01-S05.
- **Teste manual pendente:** auth e os quatro roles em navegador; fluxos completos; concorrência; modais; mobile; acessibilidade; variáveis de produção; deploy, SMTP, domínio, backup e smoke test.
- **Dívida técnica:** 17 referências históricas sem objeto no Storage; foco e teclado de overlays remanescentes; logs e validações de APIs; aliases de roles; README desatualizado.
- **Melhoria futura:** indicadores, alertas, auditoria de produto, transferências completas e análises de IA conforme o ROADMAP.

## Limites

O fechamento de S02 comprova os testes listados acima. Não transforma testes manuais de navegador, ambiente ou deploy em PASS e não afirma que funcionalidades ainda pendentes do ROADMAP estejam concluídas.
