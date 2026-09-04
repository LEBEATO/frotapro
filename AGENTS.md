# AGENTS.md — FrotaPro

## 1. Regra principal

Este arquivo contém as regras obrigatórias para qualquer agente de IA que trabalhe neste projeto.

Antes de alterar qualquer arquivo:

1. Ler completamente este AGENTS.md.
2. Ler completamente ROADMAP.md.
3. Analisar o código existente antes de criar código novo.
4. Não alterar arquitetura ou regras de negócio sem necessidade.
5. Não substituir funcionalidades já funcionando apenas por preferência técnica.
6. Trabalhar por etapas pequenas e verificáveis.
7. Ao terminar uma tarefa, executar:
   - npm run lint
   - npm run build
8. Corrigir erros causados pela própria alteração antes de encerrar a tarefa.

---

# 2. Produto

Nome: FrotaPro

Sistema profissional de gestão de frotas para empresas de transporte com operação em múltiplos estados, cidades e bases.

Objetivo:

Permitir gestão segura e organizada de:

- usuários;
- gestores;
- motoristas;
- estados;
- bases;
- veículos;
- checklist diário;
- combustível;
- manutenção;
- transferências;
- alertas;
- indicadores;
- histórico e auditoria.

O produto deve possuir qualidade suficiente para comercialização.

---

# 3. Stack oficial

- Next.js 16
- App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- PostgreSQL
- Row Level Security — RLS
- React Hook Form
- Zod
- Lucide React
- Vercel

Não trocar essas tecnologias sem aprovação.

---

# 4. Padrão de desenvolvimento

Todo código deve:

- usar TypeScript corretamente;
- evitar `any` quando possível;
- possuir componentes reutilizáveis;
- evitar páginas gigantes quando houver possibilidade de componentização;
- evitar duplicação;
- separar UI, regra de negócio e acesso a dados;
- ser responsivo;
- possuir estados de loading;
- possuir estados de erro;
- possuir estados vazios;
- ter UX profissional;
- seguir acessibilidade básica;
- usar validação de entrada;
- proteger operações no servidor;
- nunca confiar apenas em bloqueios visuais do frontend.

---

# 5. Responsividade

O sistema deve funcionar corretamente em:

- desktop;
- notebook;
- tablet;
- celular.

Nenhuma funcionalidade pode depender apenas de desktop.

Menus, formulários, tabelas, cards, modais e dashboards devem ser responsivos.

---

# 6. Papéis oficiais

Existem quatro papéis:

## admin

Administração da plataforma conforme regras existentes.

## fleet_manager

Gestor global da frota.

Pode visualizar informações de múltiplos estados e bases autorizadas.

## branch_manager

Gestor da base.

Deve visualizar e alterar apenas dados pertencentes à sua unidade, salvo regra explicitamente autorizada.

## driver

Motorista.

Visualiza somente informações necessárias ao seu trabalho e ao veículo atualmente atribuído.

Não criar novos papéis sem aprovação.

---

# 7. Estrutura geográfica

Hierarquia principal:

Estado
→ Base
→ Usuários
→ Motoristas
→ Veículos
→ Operações

O FrotaPro deve permitir expansão para vários estados brasileiros e várias bases.

Dados devem possuir segregação adequada por base.

---

# 8. Segurança

Segurança é requisito obrigatório.

Toda implementação deve considerar:

- Supabase Auth;
- RLS;
- autorização server-side;
- validação Zod;
- proteção de Server Actions;
- proteção de Route Handlers;
- isolamento entre bases;
- princípio do menor privilégio;
- prevenção de acesso usando IDs manipulados pelo cliente;
- não exposição da service role no navegador;
- variáveis privadas somente no servidor;
- sanitização e validação de entradas.

Nunca utilizar apenas:

if (role === ...)

no frontend como mecanismo de segurança.

Frontend controla experiência.

Backend + Supabase/RLS controlam autorização real.

---

# 9. Estados e bases

O sistema deverá possuir:

- cadastro de estados;
- cadastro de bases;
- cidade;
- código da base;
- status ativo/inativo;
- associação de usuários;
- associação de veículos;
- transferências.

A unidade São Geraldo faz parte das unidades definidas anteriormente.

---

# 10. Motoristas

O módulo deve possuir:

- cadastro;
- convite;
- ativação;
- desativação;
- visualização;
- edição;
- associação à base;
- transferência de base;
- transferência de estado;
- associação a veículo;
- troca de veículo;
- histórico de movimentação.

Motorista não deve receber permissões administrativas.

---

# 11. Veículos

O módulo deve possuir:

- cadastro;
- edição;
- placa;
- modelo;
- ano;
- quilometragem;
- status;
- nível de combustível quando aplicável;
- base atual;
- motorista atual;
- transferência;
- histórico;
- manutenção.

Estados básicos incluem:

- ativo;
- manutenção;
- indisponível quando necessário.

Evitar strings inconsistentes para status.

---

# 12. Checklist diário

Checklist é uma função central.

O motorista deve realizar checklist diário obrigatório conforme regra de operação.

Checklist deve registrar:

- motorista;
- veículo;
- placa;
- base;
- data/hora;
- quilometragem;
- itens;
- problemas encontrados;
- observações;
- fotos quando previstas para checklist;
- status da inspeção.

Problemas importantes podem originar fluxo de manutenção.

Não utilizar foto obrigatória no abastecimento.

---

# 13. Combustível

Motorista poderá registrar abastecimento.

Registrar sempre que aplicável:

- motorista;
- veículo;
- placa;
- base;
- combustível;
- km anterior;
- km atual;
- litros;
- valor;
- posto;
- data/hora.

Combustíveis podem incluir:

- gasolina;
- etanol;
- diesel;
- outros conforme veículo.

Não exigir foto do abastecimento.

Dados devem permitir no futuro calcular:

- consumo;
- custo/km;
- média;
- comparação entre veículos;
- anomalias.

---

# 14. Manutenção

Manutenção poderá ser aberta por:

- motorista;
- gestor.

Fluxo esperado:

abertura
→ análise
→ manutenção
→ acompanhamento
→ liberação

Registrar:

- veículo;
- motorista quando aplicável;
- problema;
- responsável;
- observações;
- status;
- data de abertura;
- data de conclusão;
- responsável pela liberação.

Manter histórico.

---

# 15. Transferências

O sistema precisa suportar:

- motorista mudando de base;
- motorista mudando de estado;
- veículo mudando de base;
- motorista mudando de veículo.

Toda transferência importante deve gerar histórico.

Não apenas sobrescrever informação sem preservar rastreabilidade.

---

# 16. Dashboards

## Motorista

Exibir informações relevantes:

- veículo atual;
- checklist;
- combustível;
- manutenção;
- pendências;
- alertas.

## Gestor da base

Exibir:

- veículos;
- motoristas;
- status da frota;
- checklists;
- combustível;
- manutenção;
- pendências;
- alertas;
- indicadores da unidade.

## Fleet manager

Visão global:

- estados;
- bases;
- veículos;
- motoristas;
- manutenção;
- combustível;
- indicadores;
- comparações.

---

# 17. Alertas

Planejar estrutura para:

- checklist não realizado;
- veículo em manutenção;
- manutenção recorrente;
- veículo com consumo elevado;
- quilometragem relevante;
- problemas recorrentes;
- pendências da base.

---

# 18. Inteligência Artificial

IA não é prioridade antes da consolidação dos dados.

Depois da base funcional, implementar análises como:

- veículos com maior gasto;
- consumo fora do padrão;
- gasolina x etanol quando aplicável;
- veículos com maior índice de manutenção;
- tendências;
- recomendações.

Não implementar IA apenas como chatbot decorativo.

IA deve utilizar dados reais e gerar valor operacional.

---

# 19. Auditoria

Operações críticas devem possuir histórico quando aplicável.

Exemplos:

- transferência;
- troca de motorista;
- troca de veículo;
- mudança de status;
- manutenção;
- liberação;
- alterações administrativas.

Preferir registrar:

- quem realizou;
- quando;
- valor anterior;
- novo valor;
- entidade afetada.

---

# 20. Banco de dados

Antes de alterar tabelas:

1. verificar schema atual;
2. verificar FKs;
3. verificar RLS;
4. verificar código dependente;
5. evitar duplicação de tabelas;
6. evitar migrations destrutivas;
7. preservar dados existentes.

Não apagar coluna/tabela em produção sem análise.

---

# 21. Fora do escopo atual da V1

Não implementar neste momento:

- Stripe;
- cobrança;
- assinaturas;
- marketplace;
- módulo independente de mecânico;
- white-label completo;
- personalização avançada de logo;
- aplicativo Flutter;
- funcionalidades não relacionadas à gestão de frota.

Esses itens poderão ser avaliados posteriormente.

---

# 22. Código antigo

O projeto possui código e documentação criados em fases anteriores.

Não assumir que tudo está correto.

Antes de remover código antigo:

1. procurar referências;
2. verificar se ainda é utilizado;
3. verificar impacto;
4. somente remover se estiver claramente obsoleto.

Referências antigas ao papel `mechanic` devem ser analisadas.

O módulo independente de mecânico NÃO faz parte da V1 atual.

---

# 23. Regra contra mudanças de planejamento

O agente NÃO deve mudar por conta própria:

- stack;
- arquitetura principal;
- papéis;
- regras de acesso;
- modelo multi-base;
- fluxo de checklist;
- fluxo de combustível;
- fluxo de manutenção;
- estratégia de segurança.

Caso encontre uma necessidade arquitetural importante:

PARAR aquela mudança,
explicar o problema,
apresentar opções,
aguardar decisão.

---

# 24. Processo obrigatório para cada tarefa

Antes:

- ler AGENTS.md;
- ler ROADMAP.md;
- analisar arquivos envolvidos.

Durante:

- alterar somente arquivos necessários;
- preservar funcionalidades existentes;
- manter tipagem;
- manter segurança;
- manter responsividade.

Depois:

Executar:

npm run lint

npm run build

Quando aplicável:

npm test

Apresentar:

- tarefa realizada;
- arquivos alterados;
- decisões tomadas;
- erros encontrados;
- testes executados;
- resultado do build;
- próximo item sugerido do ROADMAP.

---

# 25. Git

Não fazer automaticamente:

- force push;
- reset --hard;
- exclusão de branches;
- apagar histórico;
- alterações destrutivas.

Preferir mudanças pequenas e rastreáveis.

---

# 26. Prioridade

A ordem geral é:

1. estabilidade;
2. segurança;
3. banco e permissões;
4. regras de negócio;
5. funcionalidades;
6. UX;
7. indicadores;
8. IA;
9. preparação para produção.

Nunca sacrificar segurança para acelerar desenvolvimento.