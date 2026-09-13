FrotaPro

Sistema web de gestão de frotas para operação em múltiplas bases. Reúne veículos, motoristas, atribuições, checklist, abastecimento e manutenção.

Tecnologias

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 e Supabase (Auth, PostgreSQL, RLS e Storage). Os formulários usam React Hook Form e Zod.

Perfis

Os quatro perfis oficiais são admin, fleet_manager, branch_manager e driver. O gestor de base deve operar nos dados da própria unidade; o motorista acessa os dados necessários ao seu trabalho. A autorização depende de verificações no servidor e das políticas RLS, não apenas da interface.

Executar localmente

Requisitos: Node.js compatível com Next.js 16, npm e acesso a um projeto Supabase configurado com o esquema e as políticas necessários.

npm ci

Crie .env.local com as variáveis usadas pelo projeto:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

O nome NEXT_PUBLIC_SUPABASE_ANON_KEY é o utilizado pelo código atual. Mantenha SUPABASE_SERVICE_ROLE_KEY apenas no ambiente do servidor e nunca inclua .env.local no Git. Para convites e recuperação de senha, configure no Supabase as URLs de redirecionamento correspondentes ao ambiente.

npm run dev

Abra http://localhost:3000 após iniciar a aplicação.

Banco e validação

As migrations versionadas estão em supabase/migrations. Antes de aplicá-las a outro ambiente, compare o histórico de migrations e o esquema existente, e revise o SQL. O roteiro de consultas de auditoria somente leitura está em supabase/audits/production-read-only.sql. Não execute alterações no banco de produção com base apenas neste README.

npm run lint
npm run build

O estado verificado da auditoria e os testes manuais ainda pendentes estão em AUDITORIA_PRODUCAO.md. O planejamento mais amplo da V1 está em ROADMAP.md. Build e testes de RLS não substituem os testes manuais de autenticação, fluxos completos, responsividade e implantação listados na auditoria.