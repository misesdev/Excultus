# Fontes externas

## Contrato

```ts
interface AudioSourceProvider {
  readonly id: string;
  readonly label: string;
  canHandle(url: string): boolean;
  getMetadata(url: string): Promise<SourceMetadata>;
  getAudioItems(url: string): Promise<SourceAudioItem[]>;
}
```

`SourceAudioItem.acquisition` define como obter a mídia: `download` (URL + MD5 opcional),
`copy` (arquivo local já copiado pelo seletor) ou `none` (itens restritos). `availability`:
`available` ou `restricted` (nunca selecionável/importado). Nenhuma fonte salva "só o link".
O `SourceProviderRegistry` (Strategy) escolhe o provider; só aceita HTTPS.

## Providers

| Provider | Reconhece | Observações |
|---|---|---|
| `ArchiveOrgProvider` | `archive.org/(details\|download\|metadata\|embed)/<id>` | `GET /metadata/<id>`; agrupa original + derivados e escolhe o melhor formato (MP3 > M4A > AAC > OGG/OPUS > FLAC > WAV); duração `length` (s ou hh:mm:ss); MD5; arquivos `private` e itens restritos/escuros tratados; descrição HTML → texto; capa `services/img/<id>`; cache de 5 min para não buscar duas vezes |
| `YouTubeProvider` | vídeos (`watch`, `youtu.be`, `shorts`, `live`) e playlists | TurboModule `ExcultusYouTube` (NewPipeExtractor). Cada vídeo é resolvido na pré-visualização: vídeo sem áudio baixável → erro com mensagem e nada é salvo; em playlists (até 200 vídeos, 4 em paralelo) os indisponíveis aparecem como "Indisponível". Áudio M4A (AAC) progressivo; `mediaUrl` guarda a página do vídeo e a URL de mídia (expira em horas) é resolvida pelo `YouTubeMediaUrlResolver` antes de cada download. Reprodução só a partir do arquivo baixado (ADR 0006) |
| `DirectAudioProvider` | HTTPS terminando em extensão de áudio suportada | HEAD opcional para tamanho/MIME; valida extensão × MIME |
| `LocalFileProvider` | seletor do sistema (SAF) | cópia local temporária; extensão + MIME validados; rejeitados são apagados; dedup por nome+tamanho |

## Caso COFemAudio

589 gravações (AAC original + VBR MP3 derivado), ~41 GB em MP3. A pré-visualização mostra total
estimado, espaço livre e alerta de espaço insuficiente; a lista é virtualizada e a seleção pode
ser feita item a item. Validado manualmente no emulador (importação, download com MD5,
reprodução offline e retomada após fechar o app).

## Como criar um novo provider

1. Implemente `AudioSourceProvider` em `src/infrastructure/external-sources/<nome>/`, validando a
   resposta com Zod via `HttpClient` e lançando erros tipados.
2. Gere `sourceId` **estáveis** por item (base da deduplicação) e preencha `acquisition`/`availability`.
3. Registre-o na lista do `SourceProviderRegistry` em `createContainer.ts`.
4. Teste com fixture gravada e `HttpClient` falso (ver `ArchiveOrgProvider.test.ts`).
Nada em coleções, downloads ou player precisa mudar.
