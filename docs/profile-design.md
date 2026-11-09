# Perfil briandevbr — design do terminal CRT verde

> Especificação aprovada em 09/11/2026. Descreve como o perfil é montado e
> serve de manual para editar o conteúdo. Mockups: rascunhos publicados
> durante o design (banner, cards e README completo nos dois temas).

## 1. Objetivo

O perfil fala com dois públicos, em camadas:

1. **Topo (personalidade):** um banner animado de monitor CRT que prende quem
   abre o perfil.
2. **Conteúdo (recrutador):** seções curtas que se leem em 30 segundos — quem
   eu sou, o que uso, o que está no ar e como falar comigo.

Critérios de sucesso:

- O banner e os cards ficam legíveis no celular (tela de ~390 px).
- Nada repete o que a página do GitHub já mostra (repositórios fixados,
  seguidores, gráfico de contribuições).
- Nenhum serviço de terceiro desenha imagem do perfil; tudo sai do workflow
  deste repositório.
- Todo commit, inclusive os automáticos, é de `briandevbr`.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Conceito | Terminal |
| Banner | Monitor CRT: boot, nome em pixels, cargo digitado |
| Alcance do CRT | Perfil inteiro: todo card é uma telinha CRT, escura nos dois temas |
| Cor | Verde de terminal, da escala de contribuições do GitHub (mais frio que o verde-limão `#7EE32A`) |
| Prints dos sites | Cor real dentro da telinha |
| Construção | O gerador existente (`scripts/`) desenha tudo; nada de SVG feito à mão |
| Texto | About e títulos continuam Markdown (leitura, cópia, leitor de tela) |
| Idioma do README | Inglês |

Saem do perfil: a seção 📌 Projects (cards de repositório) e o `projects.json`,
a faixa de números (contribuições, repos, seguidores, desde), o card de streak
(serviço de terceiro), o typing SVG (as frases vão para o banner) e a linha
`ADS Student · …` (vai para o about).

## 3. Estrutura do README

```text
[ banner CRT ]
[ divisor ]
### `$ cat about.md`              texto: about + "working on", enxutos
[ divisor ]
### `$ ls ~/stack`                card: now/ e next/
[ divisor ]
### `$ ls ~/live-projects`        bloco gerado: um card por site + teclas LIVE SITE / SOURCE
[ divisor ]
### `$ stats`                     cards: linguagens e rosca, um embaixo do outro
[ divisor ]
### `$ ./snake --contributions`   cobrinha verde dentro da moldura CRT
[ divisor ]
### `$ contact --help`            teclas LINKEDIN e EMAIL
```

- Banner, divisores e cobrinha: `width="100%"`.
- Cards: `width="495"`, centralizados, um por linha (lado a lado, no celular,
  cada um cairia para ~175 px e ficaria ilegível).
- Teclas: `height="40"`, cada uma dentro do seu link.
- Imagens vêm da branch `output`
  (`https://raw.githubusercontent.com/briandevbr/briandevbr/output/<arquivo>.svg`).
  Como toda tela é escura nos dois temas, cada SVG tem uma versão só e o README
  usa `<img>` simples, sem `<picture>`.
- Só o bloco entre `<!-- showcase:start -->` e `<!-- showcase:end -->` é
  reescrito pelo workflow. O resto do README é editado à mão.

## 4. Kit CRT (`scripts/crt/kit.mjs`)

### Paleta

| Papel | Cor | Uso |
|---|---|---|
| `screen` | `#04100A` | fundo de toda tela |
| `bezel` | `#0F3D22` | borda arredondada da tela |
| `track` | `#0A2416` | trilho apagado das barras |
| `deep` | `#0E4429` | fatia "Other" da rosca, nível 1 da cobrinha |
| `mid` | `#1B7A3C` | fatia "Pull requests" |
| `dim` | `#4FAE6A` | texto secundário, boot, rótulos (contraste 7,0:1) |
| `phos` | `#39D353` | fósforo: nome, títulos, dados (9,8:1) |
| `hot` | `#8CFFA8` | destaque: `OK`, cursor, valores (15,7:1) |
| `pale` | `#D2FFDD` | fatia "Issues" |

Cobrinha: níveis `#0A1F12`, `#0E4429`, `#006D32`, `#26A641`, `#39D353`;
cobra `#8CFFA8`.

### Efeitos em dois níveis

| | Banner (forte) | Cards (leve) |
|---|---|---|
| Scanlines | opacidade .38 | opacidade .16 |
| Vinheta | .70 | .45 |
| Brilho de fósforo | blur 2,4 em todo o texto | nenhum em texto de dado |
| Piscada | sim (6 s, sutil) | não |
| Faixa de luz descendo | sim (7 s) | não |

### Tipografia

- **Fonte em pixels 5×7**, desenhada como retângulos: A–Z, 0–9 e
  `. - / : > < _` e espaço. Usada no nome, nos títulos dos cards, nos nomes
  dos sites, no total da rosca e nas teclas. Fica igual em qualquer sistema.
- **Monoespaçada com largura travada** (`textLength`, 0,6 × tamanho por
  caractere) para o resto. A pilha é
  `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace`.
  A largura travada mantém o layout e o efeito de digitação alinhados em
  qualquer fonte instalada.

### Regras

- **Legibilidade:** texto de card com no mínimo 14 px na largura nativa
  (495 px), o que dá ~10 px no celular. No banner, as linhas de cargo têm
  20 px; as linhas de boot (14 px) são decorativas.
- **Animação:** roda uma vez e fica no estado final. Só ficam em loop o cursor,
  a piscada e a faixa do banner, o pulso do divisor e a cobrinha.
- **Estado de repouso:** todo elemento animado tem como posição natural o
  estado final; a animação parte do estado inicial com `animation-fill-mode:
  both`. Com `prefers-reduced-motion: reduce`, todo SVG desliga as animações
  e mostra a tela pronta.
- **Digitação:** um retângulo da cor da tela cobre o texto e desliza um
  caractere por vez (`steps(n)`). A posição natural da capa é à direita do
  texto, onde não há nada.
- **Gráficos monocromáticos:** cada fatia ou barra se distingue por tom e por
  separação de 2–2,5 px na cor da tela, e todo valor vem escrito. Cor nunca é
  a única pista.
- **Acessibilidade:** todo SVG tem `role="img"`, `<title>` e `aria-label` com
  o conteúdo em texto; o README repete isso no `alt`.

## 5. Banner e divisor (`scripts/crt/banner.mjs`)

### Banner (720 × 276, efeitos fortes)

Ordem da animação:

1. 0,2 s, 0,55 s, 0,9 s: três linhas de boot `[ OK ] <mensagem>` (14 px, `dim`,
   `OK` em `hot`).
2. ~1,35 s: o nome acende letra por letra em pixels de 10 px (`phos`), com uma
   capa que desliza em `steps(<letras>)` por 0,9 s.
3. Em seguida, as linhas de cargo são digitadas (20 px, `hot`), 35 ms por
   caractere, uma depois da outra.
4. O cursor (bloco `hot`) aparece no fim da última linha e pisca em loop.

O tamanho do pixel do nome se ajusta para caber em 656 px
(`min(10, 656 / (6 × letras − 1))`).

### Divisor (720 × 14)

Faixa de tela com borda `bezel`, traço tracejado `dim` (8/6) e um pulso de luz
`hot` de 180 px que atravessa em 4,5 s, em loop.

## 6. Cards (`scripts/crt/cards.mjs`, efeitos leves)

Todo card tem a mesma linha de título: nome em pixels de 3 px (`phos`) à
esquerda e um comando em monoespaçada de 13 px (`dim`) à direita.

| Card | Arquivo | Conteúdo |
|---|---|---|
| Stack | `stack.svg` | `now/` (em `phos`) e `next/` (em `dim`), 3 colunas, marcador quadrado |
| Linguagens | `languages.svg` | 6 linguagens; barra de 20 blocos por linha, escala relativa à maior; `%` em `hot` |
| Contribuições | `contributions.svg` | rosca (commits `phos`, PRs `mid`, issues `pale`, other `deep`), total em pixels no centro com rótulo `TOTAL`, legenda com valor e `%`, nota "Other = new repos, reviews, private" |
| Site no ar | `showcase-<owner>-<repo>.svg` | `$ open <host>`, print 2:1 na cor real com moldura, nome em pixels, `[ STATUS ]`, descrição (até 3 linhas de 52 caracteres), linguagens |
| Teclas | `key-site.svg`, `key-repo.svg`, `key-linkedin.svg`, `key-email.svg` | `> LIVE SITE` acesa (fundo `phos`); as outras apagadas (contorno) |
| Cobrinha | `snake.svg` | moldura 912 × 252 com `$ ./snake --contributions` e o SVG do Platane/snk **embutido como elemento**, não como `<image>` (dentro de `<image>` a animação fica parada) |

A rosca separa os últimos 12 meses em commits, pull requests, issues e "Other"
(o resto até o total do calendário), como já faz hoje.

## 7. Dados

### `profile.json` (novo)

```json
{
  "name": "DAVID BRIAN",
  "boot": [
    "Started bash on tty1 (Pop!_OS)",
    "Mounted ~/dotfiles · bash · zsh · PowerShell",
    "Reached target backend.target (Node.js · Express)"
  ],
  "role": [
    "> BACKEND DEVELOPER // NODE.JS · EXPRESS",
    "> REST APIs & TERMINAL AUTOMATION"
  ],
  "stack": {
    "now": ["JavaScript", "Node.js", "Express", "REST APIs", "HTML", "CSS", "Git", "Bash", "Vitest"],
    "next": ["SQL", "TypeScript"]
  }
}
```

O gerador valida e para com mensagem clara quando:

- `name` tem caractere fora da fonte em pixels;
- uma linha de `boot` passa de 69 caracteres;
- uma linha de `role` passa de 54 caracteres;
- um item de `stack` passa de 15 caracteres.

### `showcase.json` (já existe, sem mudança de formato)

`repo`, `site`, `preview` (JPEG 2:1 em `assets/showcase/`), `description`,
`status`. O gerador para com erro se o nome do site em pixels encostar no
`[ STATUS ]` da mesma linha (hoje o maior caso, `PIZZARIA3IRMAOS` com
`LOCAL BUSINESS SITE`, cabe com folga).

### API do GitHub (no workflow)

- Linguagens: top 6 por bytes nos repositórios públicos próprios.
- Contribuições: `totalCommitContributions`, `totalPullRequestContributions`,
  `totalIssueContributions` e o total do calendário.
- Para cada site do `showcase.json`: nome canônico, URL e até 3 linguagens.

## 8. Arquivos

```text
profile.json
showcase.json
assets/showcase/*.jpg
scripts/
  generate-cards.mjs   orquestra: lê os dados, chama os desenhos, grava dist/ e o README
  github.mjs           consultas GraphQL
  readme.mjs           monta o bloco showcase e troca o conteúdo entre os marcadores
  crt/kit.mjs          paleta, fonte em pixels, mono, moldura CRT, linha do tempo
  crt/banner.mjs       banner e divisor
  crt/cards.mjs        stack, linguagens, rosca, sites, teclas, moldura da cobrinha
  test/*.test.mjs      testes com node:test
```

Saem: `projects.json` e, do gerador atual, os cards de projeto, a faixa de
números, os cards azuis claro/escuro e os botões antigos.

## 9. Workflow (`.github/workflows/snake.yml`)

Gatilhos: push na `main`, a cada 12 h e manual (os mesmos de hoje).

1. `actions/checkout`
2. `node --test scripts/test/`: falhou, para antes de publicar.
3. Platane/snk gera `dist/snake-raw.svg` com
   `color_snake=#8cffa8&color_dots=#0a1f12,#0e4429,#006d32,#26a641,#39d353`.
4. `node scripts/generate-cards.mjs`: grava todos os SVGs em `dist/`, embute a
   cobrinha na moldura (`dist/snake.svg`), apaga `dist/snake-raw.svg` e
   reescreve o bloco showcase do README.
5. Validação: todo `dist/*.svg` precisa ser XML bem formado
   (`python3` + `xml.etree`).
6. Publica `dist/` na branch `output` (autor e committer `briandevbr`). A
   branch é recriada a cada run, então arquivos antigos somem sozinhos.
7. Commita o README se o bloco mudou (autor `briandevbr`).

**Falhas:** se a API cair, um print sumir, um limite do `profile.json` for
estourado ou a cobrinha falhar, o workflow fica vermelho e a `output` continua
com a última versão boa. O perfil nunca aparece quebrado, só deixa de
atualizar até a correção.

## 10. Testes

`scripts/test/`, com `node:test` (sem dependência):

- **Kit:** a fonte cobre todos os caracteres usados nos dados; `textLength`
  igual a caracteres × 0,6 × tamanho; todo SVG gerado tem a regra de
  movimento reduzido, `<title>` e `role="img"`.
- **Contas:** a soma das fatias da rosca é igual ao total; "Other" nunca é
  negativo; a maior linguagem ocupa os 20 blocos e as outras são proporcionais;
  a quebra de linha respeita 52 caracteres e 3 linhas.
- **Validação dos dados:** cada limite da seção 7 gera erro com mensagem clara.
- **Cobrinha:** com um SVG de exemplo no formato do Platane/snk, a moldura
  contém um `<svg>` interno (e nenhum `<image>`) com o `viewBox` original.
- **README:** substituir o bloco duas vezes dá o mesmo resultado (o bot não
  commita à toa); marcador ausente gera erro.

Antes de qualquer push, também roda localmente: o gerador completo com a API
simulada, a validação dos SVGs e prints do README renderizado em desktop
(1280 px) e celular (390 px), nos temas claro e escuro, sem rolagem lateral e
sem imagem quebrada.

## 11. Fora do escopo

- Versão clara das telas (decisão: CRT escuro nos dois temas).
- GIF ou PNG do banner.
- README em português.
- Ícones de tecnologia ou serviços externos (skillicons, shields, streak).

## 12. Como editar

| Quero mudar… | Onde |
|---|---|
| Frases do banner, linhas de boot | `profile.json` → `boot`, `role` |
| Stack | `profile.json` → `stack.now`, `stack.next` |
| Sites no ar | `showcase.json` + print 2:1 em `assets/showcase/` |
| About, títulos, links de contato | `README.md` (fora do bloco showcase) |
| Cores ou intensidade dos efeitos | `scripts/crt/kit.mjs` |

Depois do push na `main`, o workflow regenera tudo em menos de um minuto.
