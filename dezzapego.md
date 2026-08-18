# Prompt Mestre — Implementação do Dezzapego Empresas + Marketplace Nacional Local-First

Quero evoluir o projeto **Dezzapego** para se tornar um **marketplace nacional com experiência local-first**, atendendo todo o Brasil, mas priorizando produtos, empresas e oportunidades próximas do usuário sempre que isso fizer sentido.

## Slogan oficial

> **Compre e venda perto de você. Ou em qualquer lugar do Brasil.**

O Dezzapego não deve ser apenas um clone da OLX. Quero que ele seja uma combinação de:

- marketplace;
- rede local;
- páginas profissionais;
- reputação;
- feed social;
- comunidades locais;
- vitrines de empresas;
- geração de leads;
- ferramentas simples de CRM.

---

# 1. ANTES DE IMPLEMENTAR

Primeiro faça uma auditoria completa do projeto atual.

Analise:

- stack;
- framework;
- banco de dados;
- autenticação;
- estrutura de usuários;
- estrutura de anúncios;
- localização;
- sistema de imagens;
- chat;
- favoritos;
- avaliações;
- feed;
- APIs existentes;
- migrations;
- arquitetura;
- componentes UI;
- rotas;
- SEO;
- painel do usuário;
- testes existentes.

NÃO recrie funcionalidades que já existam.

NÃO altere a stack sem necessidade.

NÃO quebre funcionalidades existentes.

NÃO faça uma aplicação paralela.

Toda implementação deve aproveitar e evoluir a arquitetura atual.

Antes de começar mudanças grandes, identifique quais conceitos existentes podem ser reaproveitados.

---

# 2. OBJETIVO DO PRODUTO

O Dezzapego deve funcionar em três níveis de descoberta:

1. **Perto de mim**
2. **Minha cidade / minha região**
3. **Brasil inteiro**

O marketplace precisa atender:

- usuários comuns;
- vendedores profissionais;
- lojas;
- imobiliárias;
- lojas de veículos;
- empresas locais.

A localização deve melhorar a experiência, mas nunca limitar o alcance nacional.

Exemplo:

Um sofá deve priorizar anúncios próximos.

Um Honda Civic específico pode mostrar ofertas no Brasil inteiro.

Um imóvel pode ser descoberto por bairro, cidade, estado ou nacionalmente.

A filosofia do produto deve sempre refletir o slogan oficial:

> **Compre e venda perto de você. Ou em qualquer lugar do Brasil.**

---

# 3. ARQUITETURA DE CONTAS

Não criar sistemas completamente separados para cada segmento.

Criar uma arquitetura base de empresas.

Estrutura conceitual:

```text
User
Business
 ├── RealEstateAgency
 ├── VehicleDealer
 ├── ProfessionalSeller
 └── Store
```

Cada Business deve ter:

- owner;
- membros/equipe;
- tipo;
- nome;
- slug;
- logo;
- imagem de capa;
- descrição;
- CNPJ opcional;
- status de verificação;
- telefone;
- WhatsApp;
- e-mail;
- site;
- Instagram;
- Facebook;
- endereço;
- cidade;
- estado;
- CEP;
- latitude;
- longitude;
- horário de funcionamento;
- opções de atendimento;
- avaliação;
- seguidores;
- número de anúncios;
- data de criação;
- configurações da página.

Criar estrutura preparada para novos tipos de empresas no futuro.

---

# 4. DEZZAPEGO EMPRESAS

Criar uma seção chamada:

**Dezzapego Empresas**

Uma empresa deve possuir uma página própria dentro da plataforma.

Exemplos de URL:

```text
/empresa/autostar
/loja/autostar
/imobiliaria/casa-rio
/veiculos/autostar
```

Escolha a estrutura de URLs mais consistente com o projeto atual.

---

# 5. PÁGINA DA EMPRESA

A página deve parecer praticamente um mini-site profissional dentro do Dezzapego.

Deve ser visualmente bonita, moderna e responsiva.

Inspirar-se conceitualmente em:

- Instagram;
- Google Business;
- Mercado Livre;
- páginas modernas de marketplace.

Cabeçalho da empresa:

- capa;
- logo;
- nome;
- selo de verificação;
- avaliação;
- localização;
- número de anúncios;
- seguidores.

CTAs:

- Seguir;
- Conversar;
- WhatsApp;
- Ver localização;
- Compartilhar.

Abas:

- Início;
- Produtos/Estoque;
- Sobre;
- Avaliações;
- Localização.

Dependendo do tipo da empresa, adicionar abas específicas.

---

# 6. PERSONALIZAÇÃO

Permitir:

- logo;
- capa;
- cor de destaque;
- descrição;
- fotos;
- vídeo institucional;
- redes sociais.

NÃO permitir customização visual exagerada.

Criar presets de layout/estilo.

Exemplo:

- Claro;
- Escuro;
- Elegante;
- Minimalista;
- Moderno.

Manter consistência visual com o Dezzapego.

---

# 7. EMPRESA VERIFICADA

Criar níveis de confiança.

### Identidade verificada

Usuário validado.

### Empresa verificada

CNPJ e dados empresariais validados.

### Empresa Pro

Empresa assinante.

### Destaque Dezzapego

Empresa com excelente reputação e critérios internos.

IMPORTANTE:

Pagamento NÃO deve comprar reputação.

Separar claramente:

- assinatura;
- verificação;
- reputação.

---

# 8. SEGUIDORES

Usuários devem poder seguir empresas.

Criar:

- follow;
- unfollow;
- contagem de seguidores.

Depois permitir preferências de notificações.

Exemplos:

- todos os novos anúncios;
- redução de preço;
- apenas categorias favoritas;
- anúncios dentro de determinada faixa de preço.

---

# 9. FEED SOCIAL DE EMPRESAS

Empresas devem poder publicar conteúdo no feed.

Exemplos:

```text
Acabou de chegar!

Honda Civic Touring 2022
38 mil km
```

Ou:

```text
Baixamos o preço deste imóvel em R$ 30 mil.
```

Posts empresariais podem conter:

- texto;
- fotos;
- anúncio vinculado;
- coleção;
- CTA.

Usuários podem:

- curtir;
- comentar;
- compartilhar;
- seguir a empresa.

O feed não deve virar apenas publicidade.

Aplicar limites e regras.

---

# 10. COLLECTIONS

Permitir que empresas criem coleções de anúncios.

Exemplos imobiliários:

- Apartamentos até R$ 500 mil;
- Imóveis perto da praia;
- Oportunidades para investidores;
- Lançamentos.

Exemplos automotivos:

- SUVs até R$ 100 mil;
- Primeiro carro;
- Carros econômicos;
- Premium;
- Ofertas da semana.

Cada collection deve possuir:

- nome;
- slug;
- descrição;
- imagem;
- ordem;
- anúncios vinculados.

---

# 11. IMOBILIÁRIAS

Criar especialização de Business:

**RealEstateAgency**

Informações específicas:

- CRECI PJ;
- áreas de atuação;
- bairros atendidos;
- corretores;
- tipos de imóvel;
- compra;
- aluguel;
- temporada;
- lançamentos.

---

# 12. CORRETORES

Criar cadastro de corretores vinculados à imobiliária.

Informações:

- nome;
- foto;
- CRECI;
- descrição;
- telefone;
- WhatsApp;
- avaliação;
- anúncios;
- status.

Cada imóvel pode ter:

```text
Imobiliária responsável
Corretor responsável
```

Permitir página individual do corretor dentro da imobiliária.

---

# 13. BUSCA INTERNA DA IMOBILIÁRIA

A página da imobiliária deve permitir pesquisar apenas dentro do estoque dela.

Filtros:

- comprar;
- alugar;
- temporada;
- lançamento;
- apartamento;
- casa;
- terreno;
- comercial;
- cidade;
- bairro;
- preço;
- quartos;
- banheiros;
- vagas;
- área mínima;
- área máxima;
- condomínio;
- características.

---

# 14. VITRINE DA IMOBILIÁRIA

Criar seções:

- Destaques;
- Recém-chegados;
- Mais vistos;
- Preço reduzido;
- Prontos para morar;
- Lançamentos.

Permitir à imobiliária selecionar anúncios em destaque.

---

# 15. BAIRROS ONDE ATUA

Mostrar automaticamente os bairros mais relevantes da imobiliária.

Exemplo:

```text
Barra da Tijuca — 142 imóveis
Recreio — 96 imóveis
Copacabana — 63 imóveis
Ipanema — 52 imóveis
```

Cada bairro deve ser clicável.

---

# 16. ANÚNCIO DE IMÓVEL

Criar campos próprios.

Principais:

- finalidade;
- tipo do imóvel;
- preço;
- condomínio;
- IPTU;
- área;
- área construída;
- quartos;
- suítes;
- banheiros;
- vagas;
- andar;
- elevador;
- mobiliado;
- aceita animais;
- piscina;
- academia;
- portaria;
- varanda;
- vista;
- endereço;
- bairro;
- cidade;
- estado;
- localização no mapa.

Galeria:

- fotos;
- vídeo;
- tour 360 no futuro.

---

# 17. AGENDAMENTO DE VISITA

Permitir ao usuário solicitar visita.

Fluxo:

```text
Usuário escolhe imóvel
↓
Escolhe data
↓
Escolhe horário
↓
Informa telefone
↓
Solicita visita
↓
Imobiliária recebe lead
↓
Corretor confirma
```

Estados:

- solicitada;
- confirmada;
- reagendada;
- cancelada;
- concluída.

---

# 18. LOJAS DE VEÍCULOS

Criar especialização:

**VehicleDealer**

Informações específicas:

- CNPJ;
- localização;
- horário;
- marcas trabalhadas;
- financiamento;
- aceita troca;
- entrega;
- veículos disponíveis.

---

# 19. BUSCA DENTRO DA LOJA

Filtros:

- marca;
- modelo;
- versão;
- ano;
- preço;
- quilometragem;
- câmbio;
- combustível;
- carroceria;
- cor;
- final da placa;
- blindado;
- único dono;
- aceita troca;
- financiamento.

---

# 20. VITRINE DA LOJA DE VEÍCULOS

Criar:

- Destaques;
- Recém-chegados;
- Mais procurados;
- Ofertas;
- SUVs;
- Automáticos;
- Até determinado valor;
- Premium.

---

# 21. ANÚNCIO DE VEÍCULO

Campos:

- marca;
- modelo;
- versão;
- ano fabricação;
- ano modelo;
- preço;
- quilometragem;
- câmbio;
- combustível;
- carroceria;
- cor;
- portas;
- potência;
- placa final;
- único dono;
- blindado;
- garantia;
- aceita troca;
- financiamento.

Equipamentos:

- ar condicionado;
- direção;
- bancos de couro;
- câmera de ré;
- sensores;
- teto solar;
- piloto automático;
- multimídia;
- Apple CarPlay;
- Android Auto;
- outros.

---

# 22. SIMULAÇÃO DE FINANCIAMENTO

Criar inicialmente uma simulação informativa.

Usuário informa:

- entrada;
- parcelas;
- valor do veículo.

Mostrar:

```text
Valor estimado de parcela
```

Deixar claro que é estimativa.

Preparar arquitetura para futura integração com financeiras.

---

# 23. "TENHO UM CARRO NA TROCA"

Criar um CTA:

**Tenho um veículo para dar na troca**

Formulário:

- marca;
- modelo;
- versão;
- ano;
- quilometragem;
- valor esperado;
- fotos;
- observações.

Gerar lead automaticamente.

---

# 24. TEST DRIVE

Permitir agendamento de test drive.

Fluxo parecido com agendamento imobiliário.

Estados:

- solicitado;
- confirmado;
- reagendado;
- cancelado;
- concluído.

---

# 25. ENTREGA E ALCANCE NACIONAL

Cada anúncio deve indicar claramente:

- retirada em mãos;
- entrega local;
- entrega pelo vendedor;
- envio nacional;
- transportadora;
- frete;
- apenas presencial.

Criar campo de alcance:

```text
LOCAL
REGIONAL
ESTADUAL
NACIONAL
```

Isso não deve limitar a descoberta.

Serve para definir como a transação pode acontecer.

---

# 26. BUSCA POR LOCALIZAÇÃO

O usuário deve conseguir alternar:

```text
Perto de mim
Até 10 km
Até 25 km
Até 50 km
Minha cidade
Meu estado
Brasil inteiro
```

Salvar preferência.

Se houver geolocalização autorizada, usar proximidade.

Caso contrário, usar localização cadastrada.

---

# 27. EMPRESAS PERTO DE VOCÊ

Criar descoberta local:

```text
Empresas perto de você
```

Mostrar:

- lojas;
- imobiliárias;
- empresas verificadas;
- distância;
- avaliação;
- categoria.

Filtros:

- distância;
- avaliação;
- categoria;
- verificada;
- aberta agora.

---

# 28. REPUTAÇÃO

Criar sistema robusto.

Não apenas uma estrela geral.

Para empresas:

- atendimento;
- transparência;
- produto conforme anúncio;
- pós-venda.

Para imobiliárias:

- atendimento;
- transparência;
- qualidade das informações;
- cumprimento de agenda.

Para lojas de veículos:

- atendimento;
- transparência;
- veículo conforme anúncio;
- pós-venda.

Exibir média.

---

# 29. COMPRA / NEGOCIAÇÃO VERIFICADA

Preparar sistema para marcar avaliações como:

**Negociação verificada**

Isso pode ser baseado em:

- lead;
- conversa;
- visita;
- venda registrada;
- transação futura.

Não inventar compra verificada sem evidência.

---

# 30. DEZZAPEGO BUSINESS

Criar painel empresarial.

Página:

```text
/business
```

ou equivalente.

Dashboard:

- visualizações;
- visitas ao perfil;
- contatos;
- WhatsApps;
- favoritos;
- seguidores;
- leads;
- visitas;
- test drives;
- anúncios ativos.

Gráficos:

- visualizações por período;
- leads;
- conversão;
- anúncios mais vistos;
- origem dos contatos.

---

# 31. CRM SIMPLES

Criar um mini CRM.

Pipeline:

```text
Novo
Contatado
Negociando
Visita/Test Drive
Proposta
Vendido
Perdido
```

Cada lead deve ter:

- nome;
- telefone;
- e-mail;
- origem;
- anúncio;
- data;
- responsável;
- status;
- notas;
- histórico.

Permitir mover lead entre colunas.

Criar visual Kanban se a UI atual comportar.

---

# 32. EQUIPE

Permitir que empresas adicionem membros.

Perfis:

```text
Owner
Admin
Manager
Sales
Agent
Viewer
```

Aplicar permissões.

---

# 33. IMPORTAÇÃO EM MASSA

Criar suporte progressivo:

### Fase inicial

CSV.

### Depois

Excel.

### Futuro

API.

Criar modelo de importação para:

- imóveis;
- veículos;
- produtos comuns.

Validar campos e mostrar erros por linha.

---

# 34. API BUSINESS

Preparar arquitetura para API futura.

Possíveis endpoints:

```text
/api/businesses
/api/businesses/:id
/api/businesses/:id/listings
/api/businesses/:id/leads
/api/businesses/:id/collections
```

Não criar API pública insegura.

Aplicar autenticação e rate limiting conforme padrões atuais.

---

# 35. PLANOS

Criar estrutura de planos.

### Empresa Free

- página empresarial;
- logo;
- capa;
- avaliações;
- chat;
- poucos anúncios;
- métricas básicas.

### Empresa Pro

- mais anúncios;
- collections;
- CRM;
- importação CSV;
- relatórios;
- membros da equipe;
- recursos avançados.

### Empresa Max

- anúncios amplos/ilimitados;
- mais usuários;
- API;
- métricas avançadas;
- mais recursos promocionais.

Não precisa implementar pagamento imediatamente se ainda não existir infraestrutura.

Mas deixar modelo de dados e feature flags preparados.

---

# 36. DESTAQUES E MONETIZAÇÃO

Preparar sistema para:

- destacar anúncio;
- destacar empresa;
- aparecer primeiro em determinada região;
- post patrocinado;
- destaque de categoria;
- campanha para seguidores.

Separar claramente:

```text
orgânico
patrocinado
```

Todo conteúdo pago deve ser identificado.

---

# 37. COMUNIDADES LOCAIS

O Dezzapego deve preservar seu conceito local.

Estrutura possível:

```text
Dezzapego Barra da Tijuca
Dezzapego Niterói
Dezzapego Copacabana
```

Dentro das comunidades:

- anúncios;
- pessoas;
- empresas;
- posts;
- recomendações.

Empresas podem aparecer como:

**Empresas desta comunidade**

Preparar para futuros patrocínios locais.

---

# 38. HOMEPAGE

Adaptar a homepage para comunicar claramente o conceito nacional + local.

Exibir o slogan oficial em posição de destaque:

> **Compre e venda perto de você. Ou em qualquer lugar do Brasil.**

Busca principal:

```text
O que você procura?
```

Controle de localização:

```text
Rio de Janeiro - RJ

Até 10 km
Até 50 km
Estado
Brasil inteiro
```

Seções:

- Perto de você;
- Na sua cidade;
- Empresas locais;
- Destaques no Brasil;
- Enviam para todo o Brasil;
- Categorias;
- Comunidades próximas.

---

# 39. SEO

Criar arquitetura SEO escalável.

Exemplos:

```text
/carros
/carros/rj
/carros/rj/rio-de-janeiro
/carros/honda
/carros/honda/civic

/imoveis
/imoveis/rj
/imoveis/rj/rio-de-janeiro
/imoveis/rj/rio-de-janeiro/botafogo

/imobiliarias/rj
/imobiliarias/rj/rio-de-janeiro

/lojas-de-carros/sp
```

Criar:

- title;
- description;
- canonical;
- Open Graph;
- schema.org;
- breadcrumbs;
- sitemap.

Evitar páginas SEO vazias.

Somente indexar páginas com conteúdo útil.

---

# 40. STRUCTURED DATA

Quando aplicável, usar Schema.org:

- Organization;
- LocalBusiness;
- RealEstateAgent;
- AutoDealer;
- Product;
- Offer;
- AggregateRating;
- BreadcrumbList.

Implementar apenas propriedades verdadeiras.

Não inventar ratings, localização ou disponibilidade.

---

# 41. DESIGN

Toda experiência deve ser:

- moderna;
- elegante;
- mobile-first;
- rápida;
- limpa;
- consistente.

Evitar telas lotadas.

Usar:

- cards grandes;
- fotos em destaque;
- bom espaçamento;
- hierarquia visual clara;
- CTAs evidentes;
- skeleton loading;
- estados vazios;
- feedback de sucesso/erro.

O perfil profissional deve parecer bom o suficiente para uma pequena empresa pensar:

> "Minha página no Dezzapego já funciona como meu site."

---

# 42. MOBILE

Prioridade alta.

No celular:

- botões de WhatsApp;
- conversar;
- seguir;
- ligar;
- agendar;
- mapa.

Devem ficar facilmente acessíveis.

Considerar sticky CTA em páginas de anúncios.

---

# 43. PERFORMANCE

Evitar:

- N+1;
- carregamento desnecessário;
- galerias pesadas;
- consultas gigantes;
- filtros sem índices.

Adicionar índices para:

- business;
- city;
- state;
- category;
- listing_type;
- price;
- location;
- brand;
- model;
- property_type;
- created_at.

Usar paginação.

Preferir cursor pagination onde fizer sentido.

---

# 44. SEGURANÇA

Aplicar:

- autorização por ownership;
- validação de inputs;
- rate limits;
- proteção contra spam;
- sanitização;
- upload seguro;
- controle de permissões.

Nenhuma empresa pode editar outra.

Nenhum membro sem permissão pode acessar dados administrativos.

Leads não devem ser expostos publicamente.

---

# 45. MIGRATIONS

Criar migrations seguras.

Não apagar dados atuais.

Não renomear colunas existentes sem necessidade.

Preferir mudanças aditivas.

Se mudanças destrutivas forem necessárias:

- explicar;
- criar migration segura;
- preservar dados.

---

# 46. DADOS EXISTENTES

Usuários e anúncios existentes devem continuar funcionando.

Se for necessário criar tipos:

```text
PERSONAL
BUSINESS
```

Migrar usuários atuais automaticamente para:

```text
PERSONAL
```

sem alteração visual para eles.

---

# 47. TESTES

Criar testes para os fluxos principais.

No mínimo:

### Empresa

- criar empresa;
- editar empresa;
- seguir;
- deixar de seguir;
- listar anúncios.

### Imobiliária

- criar imóvel;
- filtrar imóveis;
- vincular corretor;
- solicitar visita.

### Automóveis

- criar veículo;
- filtrar;
- solicitar test drive;
- enviar veículo para troca.

### CRM

- gerar lead;
- visualizar lead;
- mudar status;
- adicionar nota.

### Permissões

- usuário não pode editar empresa de outro usuário;
- membro sem permissão não pode acessar configurações.

---

# 48. DADOS DE DEMONSTRAÇÃO

Criar dados seed realistas para desenvolvimento.

Exemplo:

### Imobiliária

Casa Rio Imóveis

- imóveis;
- corretores;
- avaliações;
- bairros.

### Veículos

AutoStar Veículos

- Civic;
- Corolla;
- Compass;
- T-Cross;
- Creta.

Não usar dados reais de pessoas.

---

# 49. IMPLEMENTAÇÃO POR FASES

Não tente implementar tudo de forma desorganizada.

Executar nesta ordem.

## FASE 1 — CORE BUSINESS

- Business;
- tipos;
- banco;
- permissões;
- página da empresa;
- follow;
- verificação;
- localização;
- listagem de anúncios.

Testar tudo.

---

## FASE 2 — IMOBILIÁRIAS

- RealEstateAgency;
- campos de imóveis;
- corretores;
- filtros;
- página imobiliária;
- agendamento.

Testar tudo.

---

## FASE 3 — VEÍCULOS

- VehicleDealer;
- campos automotivos;
- filtros;
- página da loja;
- test drive;
- troca.

Testar tudo.

---

## FASE 4 — BUSINESS DASHBOARD

- métricas;
- leads;
- CRM;
- membros;
- collections.

Testar.

---

## FASE 5 — EXPERIÊNCIA LOCAL/NACIONAL

- geolocalização;
- raio;
- cidade;
- estado;
- Brasil inteiro;
- empresas próximas;
- homepage.

---

## FASE 6 — SEO

- URLs;
- metadata;
- sitemap;
- structured data;
- páginas por localização.

---

## FASE 7 — PLANOS E MONETIZAÇÃO

- Free;
- Pro;
- Max;
- feature flags;
- destaques.

---

# 50. REGRA DE EXECUÇÃO

Ao iniciar cada fase:

1. analise o que já existe;
2. faça um pequeno plano técnico;
3. implemente;
4. rode migrations;
5. rode lint;
6. rode typecheck;
7. rode testes;
8. corrija erros;
9. valide manualmente fluxos críticos;
10. somente então avance.

NÃO apenas escreva código.

Valide.

---

# 51. NÃO ACEITO

Não entregar:

- apenas telas mockadas;
- botões sem funcionar;
- dados hardcoded como solução final;
- páginas sem backend;
- backend sem interface;
- migrations quebradas;
- erros ignorados;
- componentes duplicados desnecessariamente;
- centenas de arquivos sem integração real.

---

# 52. CRITÉRIO DE PRONTO

Uma funcionalidade só está pronta quando:

- frontend funciona;
- backend funciona;
- banco funciona;
- autorização funciona;
- loading existe;
- erro é tratado;
- empty state existe;
- mobile funciona;
- testes relevantes passam.

---

# 53. RELATÓRIO AO FINAL DE CADA FASE

Ao concluir cada fase, me informe:

### Implementado

Liste o que realmente funciona.

### Arquivos alterados

Principais arquivos.

### Banco

Migrations criadas.

### Testes

Quais testes foram executados.

### Pendências

O que ainda falta.

### Próxima fase

Qual será o próximo passo.

---

# 54. OBJETIVO FINAL

O Dezzapego deve deixar de parecer apenas um site de classificados.

Quero que ele se torne:

> **Um marketplace nacional onde pessoas e empresas fazem negócios, descobrindo primeiro o que está perto e ampliando para todo o Brasil quando necessário.**

O slogan oficial deve permanecer:

> **Compre e venda perto de você. Ou em qualquer lugar do Brasil.**

A estrutura principal deve conectar:

```text
Pessoa
   ↓
Comunidade
   ↓
Produto
   ↓
Empresa
   ↓
Conversa
   ↓
Negociação
```

O componente local deve ser uma vantagem.

Nunca uma limitação.

Comece agora pela **auditoria completa do projeto atual**, apresente brevemente a arquitetura encontrada e então inicie a **FASE 1 — CORE BUSINESS**.
