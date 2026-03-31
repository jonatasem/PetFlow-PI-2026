# Plataforma Web para Gestao de Petshop

Projeto base para controle de agendamentos, cobrancas e comunicacao automatizada com clientes via WhatsApp.

## Acesso

- Login demo padrao: admin@brisapet.com
- Senha demo padrao: petshop123
- As credenciais podem ser alteradas em backend/.env com ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME
- A API protegida exige Bearer token valido nas rotas privadas depois do login

## O que esta implementado

- Dashboard com resumo operacional do petshop
- Cadastro visual de clientes, pets e servicos consumidos
- API interna para agendamentos, cobrancas e notificacoes
- Simulacao de envio de mensagens de confirmacao e lembretes via WhatsApp
- Estrutura preparada para MySQL, MongoDB e Firebase por configuracao
- Camada de repositorio no backend para trocar de banco sem reescrever as rotas

## Estrutura

- backend: API Node.js com Express e TypeScript
- frontend: interface React com TypeScript, TailwindCSS, SCSS e Bootstrap

## Como executar

1. Instale as dependencias:

```bash
npm run install:all
```

2. Configure os arquivos de ambiente:

- copie backend/.env.example para backend/.env
- copie frontend/.env.example para frontend/.env

3. Execute em dois terminais:

```bash
npm run dev:backend
npm run dev:frontend
```

## Como validar

Para validar o projeto inteiro com um comando:

```bash
npm run test
```

Esse fluxo executa:

- os testes automatizados do backend
- o build do frontend como validacao de tipagem e empacotamento

## Banco de dados

O projeto usa o modo memory por padrao para facilitar demonstracao. Para evoluir para persistencia real, altere a variavel DATABASE_PROVIDER no backend para:

- mysql
- mongodb
- firebase

A base do projeto ja inclui as configuracoes de ambiente para cada opcao.

Para MySQL, um schema inicial esta disponivel em [backend/database/mysql-schema.sql](backend/database/mysql-schema.sql).

## Integracao com WhatsApp

O servico de notificacao esta preparado para integrar com a API oficial do WhatsApp Cloud. Se as credenciais nao estiverem configuradas, o sistema responde em modo simulado, o que facilita demonstracoes e desenvolvimento local.

## Rotas principais da API

- GET /api/health
- POST /api/auth/login
- GET /api/dashboard
- GET /api/customers
- GET /api/pets
- GET /api/services
- GET /api/appointments
- POST /api/appointments
- PATCH /api/appointments/:id/status
- GET /api/charges
- POST /api/notifications/reminder/:appointmentId

## Autenticacao

- O login retorna um Bearer token assinado com expiracao configuravel
- As rotas privadas exigem header Authorization com Bearer token valido
- Configure AUTH_SECRET e AUTH_TOKEN_TTL_HOURS no backend para controlar seguranca e tempo de sessao
