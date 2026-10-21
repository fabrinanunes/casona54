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

### 8. Revisar a experiência nos celulares — concluída

- Conferir login, lista, filtros, modal e botões em telas estreitas.
- Ajustar espaçamentos, campos e ações que ficarem difíceis de usar por toque.
- Conferir especialmente o teclado decimal do celular no campo de valor.
- Revisão visual confirmada pela usuária; sem ajustes adicionais necessários nesta etapa.

**Por que veio antes da publicação:** o objetivo é usar a aplicação em dois celulares; a interface precisa funcionar bem neles antes da hospedagem.

### 9. Tratar erros e encerramento do backend — concluída

- Passar `r.Context()` às consultas iniciadas por requisições HTTP, em vez de `context.Background()`.
- Verificar `rows.Err()` depois de percorrer resultados em `getPayments`.
- Configurar timeouts HTTP e encerramento gracioso do servidor.
- Padronizar logs e respostas de erro sem devolver detalhes internos ao cliente.
- A aplicação usa o contexto HTTP nas operações de banco iniciadas por requisições, verifica erros ao percorrer pagamentos e encerra o servidor e o agendador ao receber sinal de parada.
- Encerramento e inicialização do servidor conferidos localmente pela usuária.

**Por que foi necessária:** isso evita consultas sem necessidade após uma requisição ser cancelada e melhora a estabilidade do serviço.

### 10. Atualizar a documentação do projeto — concluída

- `README.md` agora explica como iniciar banco, backend, usuário admin e frontend localmente.
- `backend/README.md` documenta rotas e autenticação reais, campos e formatos da API, recorrências, migrations e limitações atuais de CORS/cookie para hospedagem.
- `frontend/README.md` aponta para o guia principal e explica a configuração de `VITE_API_URL`, substituindo as instruções padrão do template Vite.

**Por que veio antes de publicar:** a documentação deve descrever o comportamento atual e permitir reconstruir o ambiente.

### 11. Revisar a qualidade do código e as instruções do projeto sem alterar comportamento — concluída

- Aplicar `gofmt` aos arquivos Go e uniformizar a formatação, a ordem dos imports e a legibilidade de trechos TS/TSX.
- Remover verificações de frequência duplicadas nos handlers de criação e edição: `validatePayment` já faz essa validação antes.
- Reutilizar `getTodayForDateInput` no cálculo de atraso, mantendo a mesma data local usada pela aplicação.
- Tornar `apiUrl` privada ao módulo, pois nenhum outro arquivo importa esse valor.
- Atualizar `AGENTS.md` e `CLAUDE.md`, que ainda descreviam migrations manuais, rotas antigas e um roteiro defasado.
- Conferir ESLint do frontend e `go vet` do backend; ambos passaram.
- Conferir também os builds do frontend e backend; ambos passaram.
- Nenhuma alteração desta etapa muda o comportamento da aplicação.

**Por que veio antes das próximas funcionalidades:** uma base consistente facilita revisar e manter as mudanças seguintes.

### 12. Configurar duração e encerramento de pagamentos recorrentes — concluída

- Permitir escolher no frontend a duração da recorrência em meses para frequências semanais, mensais e anuais (por exemplo: 3, 5, 6 ou 30 meses).
- Persistir a duração ou a data final na regra de recorrência e fazer o gerador respeitar esse limite, inclusive nas execuções diárias.
- Contar o vencimento inicial como o primeiro mês da duração; por exemplo, uma recorrência mensal de 3 meses gera 3 pagamentos. Para frequências semanal e anual, gerar somente vencimentos que caibam nessa mesma janela de meses.
- Definir e implementar como editar uma ocorrência, alterar os dados/frequência da regra ou encerrar uma série sem deixar a regra e os pagamentos futuros inconsistentes.
- Ao excluir uma ocorrência recorrente, remover do banco essa ocorrência e todas as posteriores, preservar as anteriores e desativar a regra para que o agendador não recrie os pagamentos excluídos.
- Pedir confirmação no frontend antes de excluir a ocorrência e os pagamentos seguintes.
- Implementado: migration 007 adiciona a duração em meses; o formulário envia essa duração para qualquer frequência recorrente e o backend rejeita valores menores que 1.
- Implementado: o gerador usa o primeiro vencimento como início e uma data final exclusiva; regras com duração concluída são desativadas, inclusive quando o gerador diário alcança o limite.
- Implementado: editar uma ocorrência altera somente aquele pagamento; frequência e duração da regra permanecem iguais.
- Implementado: excluir uma ocorrência recorrente remove ela e as posteriores e desativa a regra na mesma transação; a confirmação informa que os pagamentos anteriores serão mantidos.
- Verificações estáticas: ESLint, build do frontend, `go vet ./...` e `go build ./...` passaram.

**Por que veio nesta ordem:** é uma nova configuração de recorrência solicitada depois do roteiro inicial e depende da geração recorrente da etapa 2.

### 13. Restringir as opções de responsável — concluída

- Trocar o campo de responsável na modal por uma seleção com somente `Fabrina` e `Eduardo`; não permitir outros valores digitados.
- Validar também no backend que o responsável recebido seja uma dessas duas opções, para impedir valores diferentes enviados diretamente à API.
- Conferir como tratar pagamentos já salvos com outro responsável antes de aplicar a restrição.
- Implementado: a modal usa as opções definidas em `responsibleConstants.ts`, e a API rejeita responsáveis diferentes tanto na criação quanto na edição.
- A documentação do backend agora registra as opções aceitas.

**Por que entrou no final:** limita os responsáveis aos dois usuários que utilizarão o aplicativo.

### 14. Formatar o valor como moeda brasileira durante a digitação — concluída

- Na modal, formatar o valor como moeda brasileira enquanto a pessoa digita, sem esperar que o campo perca o foco; exibir símbolo, separadores e duas casas decimais (por exemplo, `R$ 12,40`).
- Manter a conversão para o valor numérico em reais usado pela API e pelo backend (`R$ 12,40` representa `12.4`), sem enviar centavos (`1240`) nem a string formatada.
- Conferir a edição de pagamentos existentes, a digitação no celular e valores com centavos terminados em zero.
- Implementado: o campo mostra `R$`, separa milhares e mantém os centavos sendo digitado; a normalização converte vírgula ou ponto decimal para o formato que `parseCurrencyInput` já aceita.
- A camada de serviço continua enviando o valor numérico em reais, sem enviar o texto formatado nem converter para centavos.

**Por que entrou no final:** a modal atualmente pode mostrar `12,4` quando a pessoa espera ver `R$ 12,40`.

### 15. Melhorar a exibição das opções de frequência no celular — adicionada ao final

- Aumentar a legibilidade e a área de toque das opções de frequência na modal.
- Fazer com que a lista de opções apareça logo abaixo do campo de frequência em telas estreitas.
- Conferir o comportamento do seletor nativo no celular; se ele não permitir controlar a posição ou o tamanho da lista, avaliar uma lista customizada acessível.

**Por que entrou no final:** no celular, as opções atuais ficam pequenas e não aparecem logo abaixo do campo de frequência.

### 16. Preparar e publicar a aplicação

- Escolher hospedagem para frontend, backend e PostgreSQL gerenciado.
- Configurar variáveis de ambiente, HTTPS, origem permitida pelo CORS e cookie seguro.
- Aplicar as migrações no banco hospedado e criar o usuário admin.
- Configurar backups do banco e verificar restauração.
- Publicar e conferir login, pagamentos e recorrências nos dois celulares.

**Por que fica por último:** a publicação depende da conclusão das funcionalidades, segurança, experiência móvel e migrações.

## Melhorias encontradas na revisão

- A configuração atual de CORS aponta para `localhost`; ela precisará ser configurável para a hospedagem.
- O cookie de sessão ainda não configura `Secure`, necessário quando servido por HTTPS.
