# Plano de implementação

Fases da especificação (`docs/PROJECT_SPEC.md`), na ordem em que foram executadas, com o
critério de aceite e como foi verificado.

| Fase | Escopo | Critério de aceite | Verificação |
|---|---|---|---|
| 1. Fundação | TS strict, ESLint (fronteiras), Prettier, Jest/RNTL, aliases, navegação, DI, Design System, componentes base, docs | App inicia, navegação funciona, componentes com testes | Emulador API 36; `App.test.tsx`; `components.test.tsx` |
| 2. Persistência e coleções | op-sqlite, migrações, repositórios, CRUD de coleções, relação N:N, telas | Coleções persistem após reiniciar | Testes de repositório/migração; Maestro 01; manual |
| 3. Player | Track Player + patches, `PlayerController`, fila, mini/full player, notificação, progresso, sessão | Áudio local em segundo plano, progresso persistente, controles de mídia | `PlayerController.test.ts`; emulador (notificação foreground `transport`, retomada após force-stop) |
| 4. Archive.org | provider, parsing de URL, metadados, seleção, tela de importação | Consultar COFemAudio e selecionar arquivos | `ArchiveOrgProvider.test.ts` (fixture real); emulador (589 itens) |
| 5. Downloads | TurboModule Kotlin, `DownloadManager`, fila persistente, pausa/retomada, integridade, tela | Baixar do Archive.org, fechar/reabrir e ouvir sem internet | `DownloadManager.test.ts`; emulador (MD5 ok, reprodução com Wi‑Fi e dados desligados) |
| 6. Biblioteca avançada | favoritos, playlists, marcadores, histórico, busca FTS5, filtros, ordenação, continuar ouvindo | Persistência + UI + testes | testes de repositório/integração; emulador |
| 7. Fontes adicionais | arquivos locais (SAF), link direto, YouTube (metadados) | Novas fontes sem alterar núcleo | `importFlow.test.ts`; registry de providers |
| 8. Polimento | acessibilidade, lint 0 avisos, performance (1.500 áudios), APK release, docs, E2E | App estável e instalável | `npm run validate`; `assembleRelease`; Maestro |

## Riscos identificados e tratamento

- Compatibilidade de libs nativas com RN 0.88 (nova arquitetura obrigatória) → build de fumaça
  logo no início; Track Player corrigido por patch (ADR 0003).
- Downloads robustos sem lib adequada → módulo nativo próprio (ADR 0004).
- Bibliotecas grandes (COFemAudio: 589 itens, 41 GB) → listas virtualizadas, paginação SQL,
  estimativa de espaço e alerta antes de baixar.
