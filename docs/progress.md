# Progresso

_Última atualização: 2026-10-21_

## Fase atual

Fases 1–8 implementadas. Pendências reais em [`known-issues.md`](known-issues.md).

## Concluído

- **Fundação**: RN 0.88 (nova arquitetura), TS strict (+`noUncheckedIndexedAccess`), aliases,
  ESLint com fronteiras de camadas, Prettier, Husky + lint-staged, Jest + RNTL 14, React Navigation 7.
- **Design System**: tokens, tema escuro, 30 componentes `App*`, haptics, animações.
- **Persistência**: op-sqlite + FTS5, migrações versionadas, FKs verificadas, repositórios tipados,
  unit of work, backup/restauração JSON validado com Zod.
- **Coleções**: CRUD, capa (SAF), membros N:N, reordenação, busca interna, ordenações,
  estatísticas (duração, offline, progresso), exclusão com política de arquivos.
- **Player**: `PlayerController` + Track Player (patch para RN 0.88), fila/aleatório/repetir,
  saltos configuráveis, velocidade, timer, marcadores, notificação/tela bloqueada, progresso
  persistente, sessão restaurada, mini player global, player imersivo.
- **Importação**: Internet Archive, link direto, arquivos locais, YouTube (download do áudio M4A via NewPipeExtractor).
- **Downloads**: TurboModule Kotlin (OkHttp, Range), `DownloadManager` (fila persistente,
  concorrência, Wi‑Fi, retries, MD5, espaço, recuperação), tela de downloads, manutenção.
- **Biblioteca**: favoritos, playlists, histórico, continuar ouvindo, busca paginada com filtros
  e ordenação, menu de ações contextual.
- **Configurações**: reprodução, downloads, armazenamento, aparência, dados.
- **Docs**: README, arquitetura, design system, banco, player, downloads, fontes, testes, 5 ADRs.

## Testes executados

- `npm run validate`: typecheck ✔, ESLint 0 problemas ✔, Prettier ✔, **Jest 14 suítes / 123 testes ✔**.
- Emulador Pixel 9a (API 36), build debug: importação real de `COFemAudio` (589 itens),
  download de 2 aulas com validação MD5, reprodução, +30 s, velocidade 1,5x, favorito,
  force-stop + reabertura (sessão restaurada), **reprodução offline** (Wi‑Fi e dados desligados)
  retomando da posição salva, notificação de mídia ativa (foreground service).
- `assembleRelease` ✔ → `android/app/build/outputs/apk/release/app-release.apk` (78 MB, 4 ABIs).
- **Maestro no APK de release (Pixel 9a, API 36)**: `01_create_collection` ✔ e
  `02_import_download_play_resume` ✔ (importar → selecionar → baixar → reproduzir → pausar →
  fechar/reabrir → retomar → favorito → excluir download).

## Decisões importantes

ADRs em [`decisions/`](decisions): arquitetura por feature (0001), SQLite/op-sqlite/FTS5 (0002),
Track Player com patches (0003), downloader nativo (0004), YouTube só metadados (0005, substituído),
YouTube com download de áudio (0006).

## Próxima tarefa recomendada

1. WorkManager para downloads em segundo plano com o processo encerrado (known-issues #1).
2. Servidor de fixtures para tornar o E2E de rede determinístico (known-issues #3).
3. Tema claro.
