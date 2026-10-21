# Frontend do Casona54

Interface em React + TypeScript usando Vite. Para iniciar a aplicação localmente, siga a seção **Rodar localmente** no [README principal](../README.md).

Use Node.js 20.19+, 22.13+ ou 24+. A versão padrão do projeto está indicada em `.nvmrc`.

O endereço da API é configurado pela variável `VITE_API_URL`. Para desenvolvimento local, copie `.env.example` para `.env`; o valor aponta para `http://localhost:8080`. Em produção, o padrão é `/api`, encaminhado por uma Cloudflare Pages Function ao backend Go.
