# Roy's Pães Control V2 — acessos por loja e fechamento auditável

**Data:** 11 de agosto de 2026
**Status:** desenho aprovado em conversa; aguardando revisão do documento
**Escopo:** autenticação administrativa e operacional, funcionários por unidade, fechamento definitivo, alertas, banco de dados, experiência móvel e instalação nos computadores das lojas.

## Objetivo

Transformar a V2 em um aplicativo centralizado e seguro, no qual cada loja possui uma credencial compartilhada e acessa somente o fluxo operacional de fechamento. O administrador-mestre controla unidades, credenciais, funcionários, fechamentos, correções, métricas e auditoria.

O sistema deve informar à colaboradora o resultado do fechamento sem permitir que ela altere os números depois de conhecer a divergência.

## Decisões confirmadas

- Existe uma conta administrativa principal, recuperável pelo e-mail comercial da Roy's.
- Cada loja possui um login e uma senha compartilhados, definidos pelo administrador.
- O login operacional não precisa ser um e-mail.
- A conta operacional fica vinculada a uma única unidade e não permite escolher outra loja.
- O funcionário responsável é selecionado dentro do fluxo de fechamento.
- A loja pode cadastrar um funcionário que ainda não esteja na lista de sua unidade.
- O administrador pode cadastrar, editar, ativar e desativar funcionários de qualquer unidade.
- Um funcionário associado a fechamentos anteriores não é apagado; é apenas desativado.
- A colaboradora vê o resultado resumido somente depois que os números são gravados e bloqueados.
- Toda divergência exige motivo e justificativa.
- Alertas mais graves usam textos mais firmes e recebem maior destaque administrativo.
- O lançamento original é imutável. Correções são novas revisões administrativas vinculadas ao original.

## Alternativas consideradas

### Supabase Auth com identidade técnica — escolhida

O login informado pela loja é convertido internamente em uma identidade técnica do Supabase Auth. O e-mail técnico não aparece para a colaboradora. A senha é validada pelo Supabase, e as autorizações são aplicadas no servidor e no banco.

Vantagens: segurança consolidada, bloqueio de sessões, integração com o banco, baixo custo operacional e nenhuma senha armazenada manualmente pela aplicação.

### Tabela própria de senhas — rejeitada

Ofereceria liberdade total de formato, mas exigiria implementar armazenamento de senha, sessões, bloqueios, recuperação e controles de segurança que o Supabase já fornece.

### PIN simples por unidade — rejeitada

Seria mais rápido, porém inadequado para dados operacionais e mais fácil de compartilhar ou descobrir.

## Ambientes e navegação

O mesmo projeto publicado terá dois ambientes isolados:

- `/loja`: login operacional e lançamentos;
- `/admin`: login administrativo, gestão e análises.

Não são dois bancos nem dois aplicativos independentes. A separação de acesso será aplicada tanto na interface quanto nas políticas do banco. Conhecer o endereço `/admin` não concede permissão administrativa.

O atalho instalado no computador de cada unidade abrirá diretamente `/loja`. A aplicação será configurada como PWA para poder ser instalada pelo Edge ou Chrome e aberta em uma janela própria. Também poderá ser criado um atalho `.url` quando a instalação PWA não estiver disponível.

## Conta administrativa

A conta mestre usa o e-mail `comercial@roys.com.br` para autenticação e recuperação de senha. A senha nunca será gravada no código, no repositório ou em variáveis públicas.

O administrador poderá:

- criar e editar unidades;
- definir e trocar o login e a senha de cada loja;
- ativar ou bloquear o acesso de uma loja;
- encerrar sessões operacionais quando necessário;
- consultar o último acesso de cada conta;
- gerenciar funcionários por unidade;
- consultar fechamentos e documentos;
- filtrar por período, unidade, turno, funcionário, status e nível de alerta;
- consultar indicadores e desempenho por loja;
- criar correções auditáveis;
- exportar dados permitidos;
- consultar o histórico das ações administrativas.

A criação, troca de senha e bloqueio das contas de loja será executada por uma função segura no servidor. A chave administrativa do Supabase nunca será entregue ao navegador.

## Conta operacional da loja

Depois da autenticação, o sistema obtém a unidade vinculada à credencial. A colaboradora não pode trocar essa unidade nem acessar informações de outras lojas.

A área operacional permite somente:

- selecionar ou cadastrar o funcionário responsável;
- informar o dia operacional e o turno;
- registrar a contagem física;
- importar foto ou PDF;
- revisar os itens reconhecidos pelo OCR;
- preencher manualmente quando necessário;
- confirmar os dados;
- justificar uma divergência;
- consultar o resultado e o protocolo do envio recém-concluído.

A área operacional não exibe dashboard, métricas, desempenho, histórico de divergências, documentos antigos, resultados de outras lojas ou ferramentas administrativas.

Como o login é compartilhado, o sistema comprova qual conta de loja realizou o envio. O nome selecionado registra o responsável informado pela operação, mas não equivale a uma autenticação individual do funcionário.

## Funcionários por unidade

Cada funcionário possui nome, unidade, situação ativa ou inativa, data de cadastro e origem do cadastro (`loja` ou `admin`).

Na abertura de um fechamento, a lista mostra somente funcionários ativos da unidade autenticada. A opção “Cadastrar funcionário” permite incluir rapidamente um nome ausente. O sistema normaliza espaços e impede duplicidades evidentes na mesma unidade.

O administrador poderá corrigir o nome ou desativar o cadastro. Registros históricos continuarão apontando para o funcionário usado no momento do fechamento.

## Fluxo definitivo do fechamento

1. A loja entra com seu login e senha.
2. O sistema identifica e fixa a unidade.
3. A colaboradora seleciona ou cadastra o funcionário responsável.
4. Informa data operacional, turno e contagem física.
5. Importa foto/PDF ou preenche o relatório manualmente.
6. Revisa somente os dados informados e reconhecidos, sem visualizar a divergência.
7. Confirma que as informações estão corretas e entende que os números serão bloqueados.
8. O servidor grava o fechamento original e calcula a conferência.
9. Os números ficam imutáveis para a conta da loja.
10. O sistema mostra o resultado resumido.
11. Se houver divergência, exige motivo e justificativa antes de concluir o atendimento.
12. O sistema apresenta protocolo, resultado, observação, data e hora do envio.

Se a internet cair após o passo 8, o servidor já terá preservado o fechamento. Ao reconectar, a loja retorna à etapa de justificativa ou ao comprovante, sem criar uma duplicidade.

## Resultado apresentado à colaboradora

O texto usa equivalentes de pão para contemplar itens de 15 cm, 30 cm, ofertas e promoções com equivalências diferentes.

- Zero: “Tudo correto. A contagem física bateu com o sistema.”
- Consumo físico maior que o sistema: “Faltaram lançar X equivalentes de pão no sistema.”
- Sistema maior que o consumo físico: “Sobraram X equivalentes de pão na conferência física.”

O comprovante não apresenta fórmulas, gráfico, ranking ou histórico. Ele mostra apenas o resultado daquele fechamento, a justificativa, o protocolo e o horário.

## Níveis de alerta

O nível usa o valor absoluto da divergência em equivalentes de pão:

| Divergência | Nível | Tratamento visual | Texto-base |
|---:|---|---|---|
| `0` | Correto | Verde | “Tudo correto. A contagem física bateu com o sistema.” |
| acima de `0` até `2` | Pequena | Amarelo suave | “Encontramos uma pequena diferença de X. Informe brevemente o que pode ter acontecido.” |
| acima de `2` até `5` | Atenção | Amarelo destacado | “Atenção: faltaram/sobraram X. Confira o ocorrido e registre uma explicação clara.” |
| acima de `5` até `10` | Relevante | Laranja | “Diferença relevante de X. Descreva com detalhes o que aconteceu. A administração será avisada.” |
| acima de `10` | Crítica | Vermelho | “Alerta crítico: faltaram/sobraram X. O fechamento será enviado para análise administrativa.” |

Os limites iniciais são 2, 5 e 10. A estrutura do banco permitirá torná-los configuráveis no painel em uma evolução futura, sem bloquear o lançamento desta versão.

## Motivo e justificativa

Qualquer valor diferente de zero exige a seleção de um motivo:

- avaria ou descarte não lançado;
- cortesia não lançada;
- possível erro de contagem;
- possível erro no sistema;
- transferência entre lojas;
- consumo interno;
- outro motivo.

Também é obrigatória uma explicação em texto. O sistema rejeita conteúdo vazio ou composto somente por espaços. Para alertas relevantes e críticos, a interface solicita uma descrição mais detalhada e informa que a administração será sinalizada.

A justificativa é anexada ao registro bloqueado. Ela não libera a edição dos números e também recebe data e hora do servidor.

## Dados e horários

O banco distinguirá explicitamente:

- `business_date`: dia operacional que está sendo fechado;
- `shift`: turno informado;
- `submitted_at`: data e hora em que os números foram recebidos pelo servidor;
- `justified_at`: data e hora em que a justificativa foi concluída;
- `client_local_at`: horário informado pelo dispositivo, usado apenas como apoio diagnóstico;
- unidade autenticada;
- funcionário selecionado;
- usuário autenticado que enviou;
- protocolo e revisão.

`submitted_at` e `justified_at` são gerados pelo servidor. A exibição usa o fuso `America/Sao_Paulo`. O horário do computador ou celular não será a fonte oficial da auditoria.

## Segurança e integridade

- As permissões serão garantidas por Row Level Security no Supabase.
- Contas de loja inserem dados somente para sua própria unidade.
- Contas de loja não consultam fechamentos históricos nem métricas.
- O servidor calcula totais, diferença, status e nível de alerta a partir dos dados brutos.
- Campos derivados enviados pelo navegador não são considerados confiáveis.
- O fechamento original não aceita atualização ou exclusão.
- Correções administrativas criam uma nova revisão vinculada ao original.
- Logins são únicos sem diferenciar letras maiúsculas e minúsculas.
- A chave de serviço do Supabase fica exclusivamente no servidor.
- O acesso administrativo usa sessão com expiração e recuperação pelo e-mail comercial.

## Erros e estados incompletos

- Login inválido: mensagem genérica, sem revelar se o usuário existe.
- Conta bloqueada: mensagem para procurar a administração.
- Funcionário duplicado: selecionar o cadastro já existente.
- Fechamento duplicado para unidade, dia e turno: impedir novo original e orientar contato com o administrador.
- OCR inconclusivo: destacar itens de baixa confiança e permitir revisão manual antes do bloqueio.
- Falha de rede antes da gravação: manter rascunho local e permitir reenviar.
- Falha de rede depois da gravação: recuperar o mesmo protocolo por chave de idempotência.
- Justificativa pendente: reabrir somente a etapa de justificativa, nunca os números.

## Experiência móvel e instalação

A validação cobrirá larguras de 375, 390 e 430 pixels, além de tablet e desktop. Serão testados login, cadastro e seleção de funcionário, todos os campos numéricos, câmera/arquivo, OCR, confirmação, justificativa e comprovante.

Os botões terão área de toque adequada, os campos não provocarão zoom indevido no iPhone, e nenhuma tabela administrativa será reutilizada na experiência da loja.

Após o deploy de produção, será preparado o procedimento de instalação do ícone no desktop de cada loja. O atalho sempre apontará para a URL oficial `/loja`, evitando cópias locais desatualizadas.

## Critérios de aceitação

- O administrador cria uma credencial operacional sem usar e-mail visível.
- A credencial abre somente a unidade vinculada.
- A loja seleciona ou cadastra um funcionário de sua unidade.
- A colaboradora não conhece a divergência antes do bloqueio dos números.
- Depois do bloqueio, o resultado informa claramente se faltou, sobrou ou bateu.
- Toda divergência exige motivo e justificativa.
- O alerta correto é aplicado nos limites 2, 5 e 10.
- Recarregar a página não permite editar um fechamento já gravado.
- O banco registra dia operacional, turno e horários oficiais do servidor.
- O administrador consulta métricas e desempenho por unidade.
- O app funciona no celular e pode ser instalado como ícone no computador.
- Nenhuma permissão administrativa depende apenas de elementos escondidos na interface.

## Fora do escopo imediato

- Login individual para cada funcionário.
- Aprovação obrigatória da gerente antes do envio.
- Notificações por WhatsApp.
- Alteração dos limites de alerta pelo painel nesta primeira entrega.
- Aplicativos nativos separados para Android ou iOS.
