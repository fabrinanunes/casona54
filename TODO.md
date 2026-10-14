# Roteiro do Casona54

Este arquivo é a fila oficial das próximas etapas. Vamos concluir cada etapa antes de avançar para a seguinte. Melhorias descobertas durante a revisão entram na posição adequada abaixo; novas funcionalidades pedidas durante o desenvolvimento só entram na fila depois de eu confirmar com você. Se você quiser incluí-las, serão acrescentadas ao final para preservar o roteiro.

## Próximas etapas

### 1. Concluir e commitar a frequência básica dos pagamentos — concluída

- A frequência está no banco, API, formulário e cartão do pagamento.
- A migração 005 foi confirmada no banco local.
- Commit: `636bced feat(payments): track payment frequency`.

**Por que vem primeiro:** a recorrência automática depende de cada pagamento guardar e devolver a frequência corretamente.

### 2. Gerar pagamentos futuros para frequências recorrentes — próxima etapa

- Criar a regra de recorrência para pagamentos semanais, mensais e anuais; pagamentos `once` não geram outros pagamentos.
- Proposta: manter sempre os próximos 12 meses gerados; preencher a série ao criá-la e repor diariamente pelo backend hospedado, sem depender do computador local ligado.
- Guardar a relação entre a regra recorrente e cada pagamento gerado, com proteção contra geração duplicada.
- Tratar calendário: meses com menos dias que o vencimento original, fevereiro e anos bissextos.
- Definir e implementar o comportamento ao editar um pagamento da série, alterar a frequência, excluir uma ocorrência ou encerrar a série.
- Conferir que a geração automática não altera pagamentos antigos que já foram pagos.

**Por que vem agora:** esta é a funcionalidade de negócio pedida para frequências semanais, mensais e anuais e depende da etapa 1.

### 3. Validar os dados de pagamento no backend

- Aceitar somente os status previstos (`pending` e `paid`) em criação e edição.
- Exigir descrição, categoria, responsável, vencimento e frequência; remover espaços nas pontas antes de validar.
- Validar o formato das datas antes de consultar o banco.
- Rejeitar valor menor ou igual a zero e verificar as regras de `paid_at` conforme o status.
- Retornar `400 Bad Request` para dados inválidos, em vez de deixar erros de conversão do PostgreSQL virarem `500`.

**Por que vem antes de publicar:** a interface ajuda a evitar erros, mas qualquer cliente HTTP pode chamar a API diretamente.

### 4. Garantir precisão monetária nos cálculos

- Revisar o uso de `float64` no backend e `number` no frontend para somas e totais de valores monetários.
- Escolher uma representação que evite erros de ponto flutuante nos cálculos e manter o contrato HTTP com valores em reais, como `12.34`.
- Conferir totais gerais, por categoria e por mês com valores que tenham centavos.

**Por que está na fila:** o banco já usa `NUMERIC(12,2)`, mas os cálculos da aplicação ainda passam por tipos de ponto flutuante.

### 5. Reforçar sessões e troca de senha

- Validar que a nova senha não esteja vazia e definir uma regra mínima de tamanho.
- Decidir e implementar o que acontece com as sessões existentes quando a senha é alterada.
- Tratar falhas de banco no logout, em vez de ignorá-las silenciosamente.
- Manter o atributo `Secure` do cookie ligado quando a aplicação estiver servida por HTTPS.
- Garantir que sessões expiradas não permaneçam acumuladas no banco.

**Por que vem antes da hospedagem:** os dois celulares usarão autenticação por cookie e a aplicação será acessada pela internet.

### 6. Automatizar e rastrear as migrações do banco

- Criar um mecanismo simples para registrar quais migrações já foram executadas.
- Fazer a aplicação falhar com uma mensagem clara se uma migração necessária estiver pendente ou falhar.
- Documentar a ordem e o comando usados para aplicar migrações em desenvolvimento e produção.

**Por que está na fila:** hoje as migrações são aplicadas manualmente, o que facilita esquecer uma etapa ao preparar outro ambiente.

### 7. Melhorar mensagens de erro e estados de carregamento no frontend

- Fazer `apiRequest` apresentar mensagens úteis da API, sem expor detalhes internos do servidor.
- Mostrar estados de carregamento e erro na verificação inicial de sessão; hoje `App` retorna `null` enquanto carrega.
- Conferir mensagens de erro ao criar, editar, excluir e marcar um pagamento como pago.

**Por que melhora o uso:** quando algo falha, a pessoa precisa saber se deve corrigir um campo, entrar novamente ou tentar mais tarde.

### 8. Revisar a experiência nos celulares

- Conferir login, lista, filtros, modal e botões em telas estreitas.
- Ajustar espaçamentos, campos e ações que ficarem difíceis de usar por toque.
- Conferir especialmente o teclado decimal do celular no campo de valor.

**Por que está na fila:** o objetivo é usar a aplicação em dois celulares; a interface precisa funcionar bem neles antes da publicação.

### 9. Tratar erros e encerramento do backend

- Passar `r.Context()` às consultas iniciadas por requisições HTTP, em vez de `context.Background()`.
- Verificar `rows.Err()` depois de percorrer resultados em `getPayments`.
- Configurar timeouts HTTP e encerramento gracioso do servidor.
- Padronizar logs e respostas de erro sem devolver detalhes internos ao cliente.

**Por que está na fila:** isso evita consultas sem necessidade após uma requisição ser cancelada e melhora a estabilidade do serviço.

### 10. Atualizar a documentação do projeto

- Atualizar `backend/README.md` para refletir as rotas reais, os campos atuais (`paid_at` e `frequency`) e os tipos de valor.
- Documentar como iniciar frontend, backend e banco local, criar o admin e aplicar migrações.
- Documentar o fluxo de recorrência depois que a etapa 2 estiver pronta.

**Por que vem antes de publicar:** a documentação deve descrever o comportamento final e permitir reconstruir o ambiente.

### 11. Preparar e publicar a aplicação

- Escolher hospedagem para frontend, backend e PostgreSQL gerenciado.
- Configurar variáveis de ambiente, HTTPS, origem permitida pelo CORS e cookie seguro.
- Aplicar as migrações no banco hospedado e criar o usuário admin.
- Configurar backups do banco e verificar restauração.
- Publicar e conferir login, pagamentos e recorrências nos dois celulares.

**Por que fica por último:** publicação depende de as funcionalidades, segurança, experiência móvel e migrações estarem concluídas.

## Melhorias encontradas na revisão

- `getPayments` não verifica `rows.Err()` após percorrer as linhas.
- O backend não valida todos os campos obrigatórios nem o conjunto permitido de status.
- Datas inválidas podem chegar ao PostgreSQL e virar erro interno `500`.
- A aplicação não mostra conteúdo durante a verificação inicial da sessão.
- O cliente HTTP transforma erros em uma mensagem genérica que não ajuda a corrigir a solicitação.
- Os cálculos de valores monetários usam ponto flutuante no backend e no frontend.
- O backend usa `context.Background()` nas consultas de requisições, em vez do contexto da própria requisição.
- A configuração atual de CORS aponta para `localhost`; ela precisará ser configurável para a hospedagem.
- O cookie de sessão ainda não configura `Secure`, necessário quando servido por HTTPS.
- `backend/README.md` está desatualizado em relação às rotas e aos campos implementados.
