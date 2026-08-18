# 🚛 Frota Pro

Sistema de gestão de frotas com checklists de segurança, controle de manutenção e painel para gestores e motoristas.

---

## 📋 Sobre o Projeto

O Frota Pro é uma aplicação web desenvolvida com Next.js (App Router), Supabase (autenticação e banco de dados) e Tailwind CSS. O sistema permite:

- Login com diferentes perfis: Gestor/Admin, Motorista e Mecânico
- Gestão de veículos e motoristas
- Realização de checklist pré‑viagem pelo motorista (com 9 itens obrigatórios)
- Identificação automática de pendências e criação de registros de manutenção
- Painel do gestor com:
  - Visão geral da frota (total, ativos, em manutenção)
  - Últimas inspeções realizadas
  - Atribuição de veículos a motoristas
  - Resolução de manutenções pendentes
- Armazenamento de fotos da inspeção (até 5 imagens)

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| [Next.js 15](https://nextjs.org) | Framework React com App Router e Server Components |
| [React 19](https://react.dev) | Biblioteca para interfaces de usuário |
| [TypeScript](https://www.typescriptlang.org) | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com) | Estilização utility-first |
| [Supabase](https://supabase.com) | Backend como serviço (Auth + PostgreSQL + Storage) |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Gerenciamento e validação de formulários |
| [Lucide React](https://lucide.dev) | Ícones SVG |

---

## 📁 Estrutura de Pastas (principais)