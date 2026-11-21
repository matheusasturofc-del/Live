# Live infinita 24/7 (sem aparecer, sem precisar mexer)

Transmite para **YouTube, Twitch, Kick, Facebook** (qualquer plataforma com RTMP) em loop infinito,
usando só o FFmpeg. Se a conexão cair, ele **reconecta sozinho**; se o servidor reiniciar, a live **volta sozinha**.

Dois modos:

| Modo | O que aparece na live | Ideal para |
|------|----------------------|------------|
| `videos` | Seus vídeos tocando em loop (ordem embaralhada) | Compilados, gameplays gravados, cortes, paisagens |
| `imagem` | Uma imagem fixa + playlist de músicas em loop | Rádio lofi, música para estudar/dormir, sons de chuva |

---

## Por que precisa de um servidor (VPS)?

Se a live rodar no seu PC, ela só fica no ar enquanto o PC estiver ligado e com internet.
Para ficar **24 horas sem você mexer**, rode num servidor na nuvem (VPS). Opções:

- **Oracle Cloud – Always Free**: máquina ARM gratuita (até 4 núcleos / 24 GB). Dá conta de 720p tranquilo.
- **VPS pago barato** (Hetzner, Contabo, DigitalOcean, Vultr etc.): de ~R$ 25 a R$ 60/mês.
  - Modo `imagem` em 720p: 1–2 vCPUs bastam.
  - Modo `videos` recodificando em 720p: 2 vCPUs. Em 1080p: 4 vCPUs.
  - Usando `./preparar.sh` + `COPIAR_SEM_RECODIFICAR=1`: **qualquer VPS de 1 vCPU** serve (quase não usa CPU).
- Precisa de upload estável de ~4–7 Mbps (todo VPS tem de sobra).

Escolha Ubuntu ou Debian ao criar o servidor.

---

## Passo a passo

### 1. Pegue a chave de transmissão
- **YouTube**: YouTube Studio → *Criar* → *Transmitir ao vivo* → aba *Stream*. Copie a **chave da stream**.
  Em *Configurações da stream*, **ative** "Ativar início automático" e **desative** "Ativar término automático",
  para a live reabrir sozinha se cair. (A conta precisa estar verificada e liberada para lives, o que pode levar 24h na primeira vez.)
- **Twitch**: Painel do criador → *Configurações* → *Transmissão* → *Chave de transmissão primária*.

> Nunca mostre essa chave para ninguém: com ela qualquer um transmite no seu canal.

### 2. Instale no servidor
```bash
sudo apt update && sudo apt install -y ffmpeg git
sudo git clone https://github.com/matheusasturofc-del/live.git /opt/live
cd /opt/live
cp config.env.example config.env
nano config.env      # cole a STREAM_KEY e escolha o MODO
```

### 3. Envie suas mídias para o servidor
Do seu computador (troque `IP_DO_SERVIDOR`):
```bash
scp meus-videos/*.mp4  root@IP_DO_SERVIDOR:/opt/live/midia/videos/
scp capa.jpg           root@IP_DO_SERVIDOR:/opt/live/midia/imagem/
scp musicas/*.mp3      root@IP_DO_SERVIDOR:/opt/live/midia/musicas/
```
(No Windows dá para usar o programa **WinSCP**, arrastando os arquivos.)

### 4. Teste
```bash
./live.sh
```
Abra o YouTube Studio / Twitch e veja a live entrando. `Ctrl + C` para parar.

### 5. Deixe rodando para sempre
```bash
sudo cp live.service /etc/systemd/system/live.service
sudo systemctl daemon-reload
sudo systemctl enable --now live
```
Pronto: pode fechar tudo e desligar seu PC. Comandos úteis:
```bash
sudo systemctl status live     # está rodando?
journalctl -u live -f          # ver o log ao vivo
sudo systemctl restart live    # reiniciar (ex.: depois de adicionar vídeos)
sudo systemctl stop live       # parar a live
```

**Alternativa com Docker:** `docker compose up -d --build` (já vem com `restart: always`).

---

## Economizar CPU (servidor mais barato)
Recodificar vídeo ao vivo pesa. Converta tudo **uma vez** antes:
```bash
./preparar.sh                                  # gera midia/preparados/*.mp4 no formato certo
sed -i 's/COPIAR_SEM_RECODIFICAR=0/COPIAR_SEM_RECODIFICAR=1/' config.env
sudo systemctl restart live
```
O `preparar.sh` também adiciona áudio silencioso em vídeos sem som (a live precisa de áudio contínuo).
Rode de novo sempre que adicionar vídeos novos.

---

## Cuidados importantes (para o canal não ser derrubado)
- **Direitos autorais**: use só vídeos/músicas seus, livres de direitos (ex.: Biblioteca de Áudio do YouTube,
  Pixabay, músicas com licença para streaming) ou com permissão. Live com música protegida é derrubada rápido e gera strike.
- **Conteúdo repetitivo**: o YouTube pode não monetizar lives que são só reprise sem valor agregado.
  Coloque algo próprio: uma arte/identidade visual, playlists bem curadas, tema bem definido (estudo, dormir, chuva...).
- **YouTube** só guarda a gravação (VOD) das últimas 12h de uma live longa — normal para live 24/7.
- Às vezes a plataforma encerra uma live muito longa; o script reconecta sozinho e, com "início automático"
  ativado, ela volta (no YouTube pode gerar um novo link de live).

## Arquivos
| Arquivo | Para que serve |
|---------|---------------|
| `live.sh` | Script principal: monta a playlist e transmite em loop, reconectando se cair |
| `preparar.sh` | Converte os vídeos para o modo de baixo consumo de CPU |
| `config.env.example` | Modelo de configuração (copie para `config.env`) |
| `live.service` | Serviço que liga a live junto com o servidor |
| `Dockerfile`, `docker-compose.yml` | Opção de rodar via Docker |
