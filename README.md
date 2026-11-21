# 🌍 Country Battle Royale

Live **vertical** no YouTube Shorts, interativa, que roda **sozinha 24h** num servidor na nuvem.

✅ Não precisa de computador
✅ Não precisa do celular ligado
✅ Tudo se configura pelo celular

---

## 📋 Resumo rápido

1. Liberar live no YouTube
2. Criar um servidor grátis na Oracle
3. Conectar pelo app Termux
4. Colar 1 comando
5. Mandar as músicas pelo painel

Cada passo está explicado abaixo 👇

---

## 1️⃣ YouTube

**a)** Abra o navegador do celular.

**b)** Toque nos 3 pontinhos ⋮ e marque **"Versão para computador"**.

**c)** Entre em:
```
studio.youtube.com
```

**d)** Toque em **Criar → Transmitir ao vivo**.

> Na 1ª vez o YouTube pode pedir verificação por SMS e levar **até 24h** pra liberar.

**e)** Na aba **Stream**, copie a **chave da stream**.

> 🔒 Não mostre essa chave pra ninguém.

**f)** Nas configurações da stream:
- **Início automático:** ligado ✅
- **Término automático:** desligado ❌

**g)** Pegue o **ID do canal** neste link (começa com `UC`):
```
youtube.com/account_advanced
```

📝 **Anote:** chave da stream + ID do canal.

---

## 2️⃣ Servidor grátis (Oracle Cloud)

O servidor é um "computador na nuvem" que fica ligado pra sempre. A Oracle dá um **grátis pra sempre**.

> 💳 Pedem cartão de crédito só pra confirmar que você é uma pessoa. A conta grátis **não cobra nada**.

### a) Preparar o Termux (Android)
Instale o app **Termux** (F-Droid ou Play Store), abra e rode um comando por vez:
```
pkg install openssh
```
```
ssh-keygen -t ed25519
```
(aperte Enter 3 vezes)
```
cat ~/.ssh/id_ed25519.pub
```
Vai aparecer uma linha começando com `ssh-ed25519`. **Segure o dedo nela pra copiar.** Essa é a sua "chave".

### b) Criar a conta
Abra no navegador:
```
oracle.com/cloud/free
```
- Toque em **Start for free**.
- **Home Region:** escolha com calma, porque **não dá pra mudar depois**. Se uma região der erro de "capacity" depois, as menos lotadas costumam funcionar melhor.
- Confirme o e-mail e o cartão.

### c) Criar o servidor
No painel da Oracle: **☰ → Compute → Instances → Create instance**

- **Name:** `live`
- **Image:** toque em *Change image* → **Ubuntu** → **24.04** (não escolha a versão "Minimal")
- **Shape:** toque em *Change shape* → **Ampere** → **VM.Standard.A1.Flex**
  - **OCPU:** 4
  - **Memory:** 24 GB
  - (aparece a etiqueta *Always Free-eligible* ✅)
- **SSH keys:** escolha **Paste public keys** e cole a chave do passo **a**.
- Toque em **Create**.

> ❗ Deu erro **"Out of capacity"**? É falta de vaga na região. Tente com **2 OCPU / 12 GB**, tente outro *Availability domain* ou tente de novo mais tarde.

Quando ficar **verde (Running)**, anote o **Public IP address**.

### d) Liberar o painel /admin
**☰ → Networking → Virtual cloud networks** → toque na rede → **Security** (ou *Security Lists*) → **Default Security List** → **Add Ingress Rules**:
- **Source CIDR:** `0.0.0.0/0`
- **Destination port range:** `80`
- Toque em **Add**.

---

## 3️⃣ Conectar no servidor

No Termux (troque pelo IP do servidor):
```
ssh ubuntu@SEU_IP
```
Digite `yes` quando perguntar. Pronto, você está dentro do servidor.

> Usa outro servidor que não é da Oracle e que tem senha? Aí é `ssh root@SEU_IP` e a senha.

> No iPhone, use o app **Termius**.

---

## 4️⃣ Instalar (1 comando)

Toque no ícone de **copiar** do bloco abaixo, cole no Termux e aperte Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/claude/live-infinita-automatizada-ns6yq7/instalar.sh | sudo bash
```

Ele pergunta 3 coisas:
1. Chave da stream
2. ID do canal
3. Uma senha nova pro painel

⏳ Espere alguns minutos.

🎉 **Pronto!** A live entra no ar e fica pra sempre, mesmo se o servidor reiniciar.

---

## 5️⃣ Painel no celular

Abra no navegador (troque pelo seu IP):
```
http://SEU_IP/admin
```

Digite a senha. No painel você pode:
- 🎵 Mandar a **música de fundo** (MP3)
- 💸 Mandar o **som de doação** (MP3)
- 🧪 **Testar** a notificação de doação
- 📊 Ver o **status** da live

> Sem música enviada, toca a trilha original do jogo (sem direitos autorais).

> ⚠️ Músicas de outras pessoas podem fazer o YouTube **silenciar a live, dar strike ou derrubar o canal**.

Pra ver o jogo direto (sem o YouTube):
```
http://SEU_IP/
```

---

## 🎮 Como o jogo funciona

- Cada país é uma bolinha com a bandeira.
- 🧱 **Bateu na parede:** cria **3 fios**.
- ✂️ **Passou no fio de outro país:** destrói o fio.
- 💀 **Ficou sem fios:** eliminado.
- 🏆 **Último que sobrar:** vence.

---

## 💬 Votos pelo chat

- Comentou um país → vira voto.
- Entende **25+ línguas** e emojis de bandeira 🇧🇷.
- Os **5 mais votados** lutam na próxima rodada.
- 1 voto por pessoa por país (spam não adianta).
- O país pode repetir em outra rodada, mas não na mesma.
- Ninguém comentou? Entram **países sorteados**.
- Mensagem só com **"67"** é bloqueada.

🤖 **A cada 5 minutos o bot fala e mostra na tela, intercalando:**
- "DON'T SPAM 67!"
- "COMMENT WHAT NEXT COUNTRY!"

---

## 🏆 Campeonato

**Chave:**
1. 20 rodadas de 5 países
2. 20 vencedores → 4 grupos de 5
3. 4 vencedores → 2 semifinais
4. Final → **campeão da chave**

**Copa:**
- Chave A + Chave B → final → **campeão da copa**

**Grande final:**
- 5 copas → os 5 campeões lutam → **GRAND CHAMPION** 👑

Depois disso:
- O campeão vai pro topo, em **PAST CHAMPIONS**.
- **Todo o resto reseta** e começa de novo.

⏱ Um ciclo completo leva umas 4 a 5 horas.
💾 Se o servidor reiniciar, continua de onde parou.

---

## 💸 Doações

Super Chat, Super Sticker ou novo membro:
- Aparece **"THANKS FOR THE DONATION!"** + nome + valor
- Som de moedas + voz do bot + o seu som de doação
- Entra no ranking **TOP DONATORS** (fica salvo)

> ⚠️ Os "presentes"/Jewels do Shorts ainda não chegam no chat que o bot lê.

---

## 🛠 Comandos úteis

Digite no Termux, já conectado no servidor.

**Ver o que está acontecendo:**
```
docker logs -f live
```
(pra sair: Ctrl + C)

**Reiniciar a live:**
```
docker restart live
```

**Parar a live:**
```
docker stop live
```

**Atualizar o jogo:** cole de novo o comando do passo 4️⃣.

**Trocar chave, canal ou senha:**
```
nano /opt/live.env
```
Depois de salvar:
```
docker restart live
```

---

## ❓ Problemas comuns

**A live não aparece no YouTube**
- Confira se a chave está certa: `nano /opt/live.env`
- Veja os erros: `docker logs -f live`

**"Out of capacity" na Oracle**
- Tente 2 OCPU / 12 GB, outro *Availability domain*, ou tente de novo mais tarde (às vezes em outro horário).

**Os votos não aparecem**
- Confira o ID do canal (começa com `UC`).
- O chat só conecta depois que a live está no ar. Espere 1 minuto.

**O painel /admin não abre**
- Confira se digitou `http://` (sem o "s").
- Na Oracle, confira a regra da porta 80 (passo 2️⃣ d).

---

<details>
<summary>👨‍💻 Para quem for mexer no código</summary>

- `public/batalha.js`: física e regras (fios por batida, velocidade, tempos)
- `public/torneio.js`: estrutura do campeonato
- `public/jogo.js`: tela, fases, bot, notificações
- `public/sons.js`: efeitos sonoros e trilha original
- `servidor/paises.js`: países e detecção nas várias línguas
- `servidor/chat.js`: leitura do chat do YouTube (sem chave de API)
- `servidor/server.js`: votos, doações, salvamento, painel /admin
- `transmitir.sh`: tela virtual + navegador + FFmpeg → YouTube
- `instalar.sh` e `Dockerfile`: instalação no servidor

Testar no computador:
```
npm install
npm run teste
```
Depois abra `http://localhost:3000` (usa um chat simulado).

</details>
