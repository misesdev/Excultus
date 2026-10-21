# ADR 0006 — YouTube: download do áudio via NewPipeExtractor

- **Status**: aceito · **Data**: 2026-10-21 · Substitui o ADR 0005

## Contexto
Guardar só o link e os metadados não tinha utilidade no app: "Reproduzir" falhava ou abria o
YouTube. O app é de uso pessoal e precisa ouvir o conteúdo offline.

## Decisão
- Resolver vídeos e playlists no Android com a NewPipeExtractor (`ExcultusYouTubeModule`),
  escolhendo o stream M4A (AAC) progressivo de maior bitrate da faixa original.
- Verificar cada vídeo na pré-visualização: se não houver áudio baixável, a importação mostra
  uma mensagem e **nada é salvo**. Em playlists, os vídeos indisponíveis não são selecionáveis.
- Guardar a página do vídeo em `mediaUrl`; o `DownloadManager` pede uma URL nova ao
  `MediaUrlResolver` antes de cada transferência (as URLs do googlevideo expiram em ~6 h). Se o
  tamanho anunciado mudar, o arquivo parcial é descartado.
- Baixar de `*.googlevideo.com` em blocos `Range` de 4 MiB: requisições sem limite são
  estranguladas à velocidade de reprodução (medido: 3,4 MB em 106 s × < 1 s com Range).
- O YouTube entrega M4A **fragmentado** (DASH: `moof`/`mdat` a cada ~10 s), que players locais
  tratam mal (busca/retomada presas ao fragmento, rebuffer a cada salto). Depois de validado, o
  arquivo é remuxado para MP4 comum (`Mp4Remuxer`: `MediaExtractor` → `MediaMuxer`, sem
  recodificar) pelo `DownloadedFileProcessor`; arquivos antigos são corrigidos ao abrir o app.
- Áudio do YouTube só toca a partir do arquivo baixado; tocar um item sem arquivo inicia o
  download.

## Consequências
- Contraria os termos de uso do YouTube; adequado apenas para uso pessoal.
- NewPipeExtractor é GPLv3 e quebra quando o YouTube muda: atualizar a versão em
  `android/app/build.gradle` (JitPack) quando a resolução começar a falhar.
- Exige core library desugaring (`desugar_jdk_libs_nio`) por causa do `minSdk` 24.
