# 🌍 Country Battle Royale: live interativa 24/7 no YouTube Shorts

Uma live **vertical** (aparece no feed do Shorts) que roda **sozinha, 24 horas**, num servidor na nuvem.
Não precisa de computador nem do seu celular ligado.

## Como o jogo funciona
- Cada país é uma bolinha com a bandeira, quicando dentro de um círculo.
- **Bateu na parede → cria 3 fios** (da parede até a bandeira).
- **Passou por cima do fio de outro país → destrói o fio.**
- Ficou sem fios → **eliminado**. O último que sobrar vence.
- Sons próprios pra tudo: fio estourando, eliminação, contagem regressiva, vitória e campeão.

### Votação pelo chat
- O bot lê o chat e reconhece nomes de países em **mais de 25 línguas** (inglês, português, espanhol,
  francês, alemão, árabe, hindi, russo, turco, japonês, coreano, chinês…) e também **emojis de bandeira** 🇧🇷.
- **Os 5 mais comentados lutam na próxima rodada.** Cada pessoa conta 1 voto por país (spam não adianta).
- O mesmo país pode voltar em outras rodadas, mas nunca 2 vezes na mesma.
- Se ninguém comentar, entram **países padrão** (sorteados entre todos os ~200).
- Mensagens só com **"67"** são bloqueadas (aparece um contador na tela).
- A cada **5 minutos** o bot fala e mostra na tela, intercalando: **"DON'T SPAM 67!"** e **"COMMENT WHAT NEXT COUNTRY!"**

### Campeonato
1. **20 rodadas classificatórias** de 5 países → 20 vencedores
2. **Fase de grupos**: 4 lutas de 5 contra 5 → 4 vencedores
3. **Semifinais** (2 duelos) → **final** → campeão da **Chave A**
4. Tudo de novo → campeão da **Chave B** → **final da Copa** (A x B) → **campeão da Copa**
5. Isso se repete **5 vezes** (5 copas) → os 5 campeões lutam na **GRANDE FINAL** → **GRAND CHAMPION** 🏆
6. O grande campeão vai para **PAST CHAMPIONS** no topo da tela e **tudo reseta**.

Um ciclo completo tem 276 batalhas (cerca de 4 a 5 horas). O progresso fica salvo: se o servidor reiniciar, continua de onde parou.

### Doações
- **Super Chat, Super Sticker e novos membros** → notificação na tela **"THANKS FOR THE DONATION!"**
  com o nome e o valor, som de moedas, a voz do bot agradecendo e o seu som de doação.
- **TOP DONATORS**: ranking dos maiores doadores (valores convertidos para dólar só pra ordenar), salvo pra sempre.
- ⚠️ Os "presentes"/Jewels do Shorts ainda não aparecem no chat que o bot consegue ler. Por enquanto valem Super Chat, Super Sticker e membros.

---

## Passo a passo (tudo pelo celular)

### 1. Liberar live no YouTube
1. No navegador do celular, abra **studio.youtube.com** em **"versão para computador"**.
2. **Criar → Transmitir ao vivo**. Na primeira vez o YouTube pode pedir verificação por telefone e
   **levar até 24h** pra liberar.
3. Na aba **Stream**, copie a **chave da stream**. Não mostre pra ninguém.
4. Em configurações da stream, **ative o "Início automático"** e **desative o "Término automático"**.
5. Pegue o **ID do canal** em **youtube.com/account_advanced** (começa com `UC…`).

A live sai em 720x1280 (vertical), então o YouTube já mostra no feed do Shorts.

### 2. Criar o servidor (VPS)
Precisa de um servidor Linux com **2 núcleos e 2 GB de RAM ou mais**, com **Ubuntu 24.04**:
- **Hetzner** (modelo CX22): cerca de €5/mês, dá pra criar pelo navegador do celular.
- **Oracle Cloud "Always Free"**: grátis, mas o cadastro é mais chato e às vezes falta vaga.
- Qualquer outro VPS com Ubuntu/Debian serve.

Anote o **IP** e a **senha de root** que o site mostrar.

### 3. Conectar no servidor pelo celular
- **Android**: instale o app **Termux** (pela F-Droid ou Play Store) e digite:
  ```
  pkg install openssh
  ssh root@SEU_IP
  ```
- **iPhone**: use um app de SSH, como o Termius.
- Ou use o botão **"Console"** do painel do próprio VPS.

### 4. Instalar com um comando
Cole isto e aperte Enter:
```bash
curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/claude/live-infinita-automatizada-ns6yq7/instalar.sh | sudo bash
```
Ele vai perguntar 3 coisas: a **chave da stream**, o **ID do canal** e uma **senha pro painel**.
Em alguns minutos a live entra no ar e **fica pra sempre**, mesmo se o servidor reiniciar.

### 5. Painel pelo celular
Abra **http://SEU_IP/admin**, digite a senha e você pode:
- enviar a **música de fundo** (MP3);
- enviar o **som depois de doação** (MP3);
- **testar a notificação de doação**;
- ver o **status** (chat conectado, fase do campeonato, campeões, doadores).

Sem música enviada, toca a **trilha original do jogo** (feita do zero, sem direitos autorais).
⚠️ **Músicas de outras pessoas** podem fazer o YouTube **silenciar a live, dar strike ou derrubar o canal**.

Pra ver o jogo direto (sem o YouTube): **http://SEU_IP/**

---

## Comandos úteis (no servidor)
| O que | Comando |
|------|---------|
| Ver o que está acontecendo | `docker logs -f live` |
| Reiniciar a live | `docker restart live` |
| Parar a live | `docker stop live` |
| Atualizar o jogo | rodar o comando de instalação de novo |
| Trocar chave/canal/senha | `nano /opt/live.env` e depois `docker restart live` |

## Para quem for mexer no código
| Arquivo | O que faz |
|---------|-----------|
| `public/batalha.js` | Física e regras da luta (fios por batida, velocidade, tempos) |
| `public/torneio.js` | Estrutura do campeonato |
| `public/jogo.js` | Tela, fases, bot e notificações |
| `public/sons.js` | Efeitos sonoros e trilha original |
| `servidor/paises.js` | Lista de países e detecção nas várias línguas |
| `servidor/chat.js` | Leitura do chat do YouTube (sem chave de API) |
| `servidor/server.js` | Votos, doações, salvamento e painel /admin |
| `transmitir.sh` | Tela virtual + navegador + FFmpeg → YouTube |
| `instalar.sh` / `Dockerfile` | Instalação no servidor |

Testar no computador: `npm install && npm run teste` e abrir `http://localhost:3000` (usa um chat simulado).
