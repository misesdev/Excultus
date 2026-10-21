# Downloads

## Peças

- **Downloader nativo** (`android/.../downloads/ExcultusDownloaderModule.kt`, TurboModule com
  spec em `specs/NativeExcultusDownloader.ts`): OkHttp em threads de background, somente HTTPS,
  grava em arquivo parcial, **retoma com `Range: bytes=N-`** (se o servidor ignorar o range,
  reescreve do zero), eventos de progresso a cada 500 ms, um evento terminal por tarefa,
  `stop` cancela mantendo o parcial, detecção de falta de espaço (ENOSPC).
- **`DownloadManager`** (application): fila persistente e regras. Toda mutação passa por um
  mutex FIFO para que comandos do usuário e eventos nativos nunca se intercalem.
- **Domínio**: máquina de estados (`queued → downloading → completed/failed/paused/cancelled`,
  transições inválidas lançam erro), políticas de seleção FIFO com limite de concorrência,
  margem de 100 MB de espaço livre, integridade (tamanho + MD5 opcional), backoff exponencial.

## Fluxo

1. `enqueue`: um registro por áudio (`UNIQUE(audio_id)`) — duplicados são ignorados; concluídos
   com arquivo presente não são baixados de novo.
2. `schedule`: respeita rede (somente Wi‑Fi opcional), concorrência e espaço livre.
3. Arquivo vai para `library/tmp/<downloadId>.part`.
4. Conclusão: valida tamanho esperado (fonte ou servidor) e MD5 (Archive.org fornece);
   inválido → apaga e marca falha (`integrity`); válido → move para
   `library/audio/<audioId>.<ext>` e marca `completed` + `verifiedAt`.
5. Falhas transitórias (rede, 5xx, 408/429, IO) → nova tentativa com backoff até o limite dos
   ajustes; demais → `failed` com código para mensagem amigável.

## Recuperação e processo encerrado

O estado da fila está no SQLite. Ao iniciar, registros `downloading` (processo morto) voltam a
`queued` e **retomam do arquivo parcial**. Perda de rede/Wi‑Fi pausa as tarefas em execução e
as reenfileira; a volta da rede retoma.

> **Limitação honesta**: downloads continuam enquanto o processo do app vive (inclusive em
> segundo plano, enquanto o Android não o encerra). Não há WorkManager/foreground service de
> download; se o sistema matar o processo, o download retoma na próxima abertura. Ver
> `known-issues.md`.

## Armazenamento

Diretórios privados (`DocumentDirectoryPath/library/{audio,artwork,tmp}`), nomes físicos derivados
de IDs internos validados (`[a-zA-Z0-9_-]`), sem path traversal. Ajustes → Armazenamento:
uso, limpar temporários órfãos, verificar arquivos (marca ausentes e remove órfãos), excluir
todos os downloads (metadados preservados). Excluir um download nunca exclui o áudio.
