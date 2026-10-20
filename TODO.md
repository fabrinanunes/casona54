# Roteiro do Casona54

Este arquivo é a fila oficial das próximas etapas. Vamos concluir cada etapa antes de avançar para a seguinte. Melhorias descobertas durante a revisão entram na posição adequada abaixo; novas funcionalidades pedidas durante o desenvolvimento só entram na fila depois de eu confirmar com você. Se você quiser incluí-las, serão acrescentadas ao final para preservar o roteiro.

## Próximas etapas

### 1. Concluir e commitar a frequência básica dos pagamentos — concluída

- A frequência está no banco, API, formulário e cartão do pagamento.
- A migração 005 foi confirmada no banco local.
- Commit: `636bced feat(payments): track payment frequency`.

**Por que vem primeiro:** a recorrência automática depende de cada pagamento guardar e devolver a frequência corretamente.

### 2. Gerar pagamentos futuros para frequências recorrentes — concluída

- Criar a regra de recorrência para pagamentos semanais, mensais e anuais; pagamentos `once` não geram outros pagamentos.
- Proposta: manter sempre os próximos 12 meses gerados; preencher a série ao criá-la e repor diariamente pelo backend hospedado, sem depender do computador local ligado.
- Guardar a relação entre a regra recorrente e cada pagamento gerado, com proteção contra geração duplicada.
- Tratar calendário: meses com menos dias que o vencimento original, fevereiro e anos bissextos.
- Implementação inicial: migration 006, criação transacional da regra e do primeiro pagamento, geração de até 12 meses e tentativa diária pelo backend.
- Migration 006 aplicada no banco local; geração mensal, semanal e comportamento `once` conferidos no frontend e no banco.
- Commit da implementação: `a6a1f55 feat(payments): generate recurring payments`.
- Duração configurável e exclusão/encerramento de uma série ficam para a etapa 12.

**Por que veio nesta ordem:** a geração recorrente depende da frequência persistida na etapa 1; os testes básicos foram concluídos.

### 3. Validar os dados de pagamento no backend — concluída

- Aceitar somente os status previstos (`pending` e `paid`) em criação e edição.
- Exigir descrição, categoria, responsável, vencimento e frequência; remover espaços nas pontas antes de validar.
- Validar o formato das datas antes de consultar o banco.
- Rejeitar valor menor ou igual a zero e verificar as regras de `paid_at` conforme o status.
- Retornar `400 Bad Request` para dados inválidos, em vez de deixar erros de conversão do PostgreSQL virarem `500`.

**Por que vem antes de publicar:** a interface ajuda a evitar erros, mas qualquer cliente HTTP pode chamar a API diretamente.

### 4. Garantir precisão monetária nos cálculos — concluída

- Fazer as somas de totais gerais, por categoria e por mês usando centavos inteiros durante os cálculos no frontend.
- Manter o valor em reais no contrato HTTP (por exemplo, `12.34`) e no banco `NUMERIC(12,2)`; converter centavos para reais ao retornar os totais para exibição.
- O backend atualmente não soma valores: `float64` é usado para receber/enviar o JSON, enquanto o banco guarda `NUMERIC(12,2)`. Evitar uma refatoração ampla do tipo `Amount` sem necessidade de cálculo no servidor.
- Conferir totais gerais, por categoria e por mês com valores que tenham centavos.

**Por que está na fila:** o banco já usa `NUMERIC(12,2)`, mas os cálculos da aplicação ainda passam por tipos de ponto flutuante.

### 5. Reforçar sessões e troca de senha — dispensada por decisão da usuária

- Validar que a nova senha não esteja vazia e definir uma regra mínima de tamanho.
- Decidir e implementar o que acontece com as sessões existentes quando a senha é alterada.
- Tratar falhas de banco no logout, em vez de ignorá-las silenciosamente.
- Manter o atributo `Secure` do cookie ligado quando a aplicação estiver servida por HTTPS.
- Garantir que sessões expiradas não permaneçam acumuladas no banco.

**Por que vem antes da hospedagem:** os dois celulares usarão autenticação por cookie e a aplicação será acessada pela internet.

### 6. Automatizar e rastrear as migrações do banco — concluída

- Implementação concluída: o backend registra as migrations em `schema_migrations` e aplica automaticamente as pendentes na inicialização; em caso de falha, identifica a migration no erro e interrompe o início.
- O README documenta o bootstrap de um banco local existente e a inicialização de um banco novo.
- Banco novo validado: as migrations `001` a `006` foram aplicadas, e uma segunda inicialização não reaplicou as migrations.

**Por que foi necessária:** o histórico de migrações torna a preparação de bancos existentes e novos mais segura e previsível.

### 7. Melhorar mensagens de erro e estados de carregamento no frontend — concluída

- Fazer `apiRequest` apresentar mensagens úteis da API, sem expor detalhes internos do servidor.
- Mostrar estados de carregamento e erro na verificação inicial de sessão, com opção para tentar novamente.
- Conferir mensagens de erro ao criar, editar, excluir e marcar um pagamento como pago.
- A tela de pagamentos informa falhas ao carregar e permite tentar novamente; o login diferencia credenciais inválidas de falha de conexão.

**Por que melhora o uso:** mensagens claras ajudam a pessoa a corrigir os dados ou tentar novamente quando há uma falha de conexão.

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

### 12. Configurar duração e encerramento de pagamentos recorrentes — adicionada ao final

- Permitir escolher no frontend a duração da recorrência em meses para frequências semanais, mensais e anuais (por exemplo: 3, 5, 6 ou 30 meses).
- Persistir a duração ou a data final na regra de recorrência e fazer o gerador respeitar esse limite, inclusive nas execuções diárias.
- Contar o vencimento inicial como o primeiro mês da duração; por exemplo, uma recorrência mensal de 3 meses gera 3 pagamentos. Para frequências semanal e anual, gerar somente vencimentos que caibam nessa mesma janela de meses.
- Definir e implementar como editar uma ocorrência, alterar os dados/frequência da regra ou encerrar uma série sem deixar a regra e os pagamentos futuros inconsistentes.
- Ao excluir uma ocorrência recorrente, remover do banco essa ocorrência e todas as posteriores, preservar as anteriores e desativar a regra para que o agendador não recrie os pagamentos excluídos.
- Pedir confirmação no frontend antes de excluir a ocorrência e os pagamentos seguintes.

**Por que entrou no final:** é uma nova configuração de recorrência solicitada depois do roteiro inicial e depende da geração recorrente da etapa 2.

### 13. Restringir as opções de responsável — adicionada ao final

- Trocar o campo de responsável na modal por uma seleção com somente `Fabrina` e `Eduardo`.
- Validar também no backend que o responsável recebido seja uma dessas duas opções, para impedir valores diferentes enviados diretamente à API.
- Conferir como tratar pagamentos já salvos com outro responsável antes de aplicar a restrição.

**Por que entrou no final:** limita os responsáveis aos dois usuários que utilizarão o aplicativo.

### 14. Formatar o valor como moeda brasileira durante a digitação — adicionada ao final

- Na modal, exibir o valor digitado no formato de real, incluindo símbolo, separadores e sempre duas casas decimais (por exemplo, `R$ 12,40`).
- Manter a conversão para o valor numérico em reais usado pela API e pelo backend (`R$ 12,40` representa `12.4`), sem enviar centavos (`1240`) nem a string formatada.
- Conferir a edição de pagamentos existentes, a digitação no celular e valores com centavos terminados em zero.

**Por que entrou no final:** a modal atualmente pode mostrar `12,4` quando a pessoa espera ver `R$ 12,40`.

## Melhorias encontradas na revisão

- `getPayments` não verifica `rows.Err()` após percorrer as linhas.
- O backend usa `context.Background()` nas consultas de requisições, em vez do contexto da própria requisição.
- A configuração atual de CORS aponta para `localhost`; ela precisará ser configurável para a hospedagem.
- O cookie de sessão ainda não configura `Secure`, necessário quando servido por HTTPS.
- `backend/README.md` está desatualizado em relação às rotas e aos campos implementados.
