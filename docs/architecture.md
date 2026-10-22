# Arquitetura

Clean Architecture com módulos por funcionalidade. As dependências apontam para dentro:

```text
presentation ──► application ──► domain
      │                ▲
      └──► app (DI) ───┤
infrastructure ────────┘  (implementa portas definidas em domain/application)
```

## Camadas

| Camada | Onde | Contém | Não pode depender de |
|---|---|---|---|
| Domain | `features/*/domain`, `core/domain` | entidades, value objects, regras puras, contratos de repositório | React, RN, SQLite, HTTP |
| Application | `features/*/application`, `core/application` | casos de uso, serviços (`PlayerController`, `DownloadManager`), portas | React, RN, infraestrutura |
| Infrastructure | `src/infrastructure` | SQLite (op-sqlite), RNFS, fetch, Track Player, downloader nativo, providers | presentation |
| Presentation | `features/*/presentation`, `design-system`, `shared` | telas, componentes, hooks, view-models, stores Zustand | infraestrutura (apenas via DI) |

As fronteiras são **verificadas pelo ESLint** (`.eslintrc.js`): domain/application não podem
importar frameworks nem camadas externas; features só são importadas pela API pública
(`@features/x` para domain+application, `@features/x/presentation` para UI).

## Composition root e DI

`src/app/dependency-injection/createContainer.ts` é o único lugar que conhece implementações
concretas. Recebe `PlatformAdapters` (driver SQLite, storage, picker, rede, downloader, engine,
HTTP, logger) — os testes passam fakes e o app passa os adapters nativos
(`app/bootstrap/productionAdapters.ts`). A UI acessa casos de uso via `useDependencies()`.

## Fluxo de dados e estado

- **SQLite é a fonte da verdade** dos dados persistidos.
- Casos de uso emitem tópicos no `EventBus` (`library`, `collections`, `downloads`...) após mutações;
  `useQuery`/`usePaginatedQuery` refazem a consulta (ou marcam como obsoleta se a tela estiver
  fora de foco).
- **Estado de reprodução**: o `PlayerController` é a única fonte; `usePlayerStore` (Zustand) é
  uma projeção somente leitura, consumida com seletores estreitos.
- **Estado da fila de downloads**: o `DownloadManager` mantém o espelho em memória dos downloads
  ativos; `useDownloadsStore` é a projeção para progresso ao vivo.
- Estado temporário de UI: `useState`, `feedbackStore` (toasts), `audioActionsStore` (menu).

## Features

| Feature | Responsabilidade |
|---|---|
| audios | entidade `Audio`, formatos suportados, read-model `AudioLibraryItem`, favoritos, componentes de áudio |
| collections | CRUD, membros ordenados, estatísticas, capa, exclusão com política de arquivos |
| downloads | máquina de estados, políticas de fila/espaço/integridade, `DownloadManager`, manutenção de armazenamento |
| imports | contrato `AudioSourceProvider`, registry (Strategy), seleção, importação transacional |
| player | fila (pura), progresso, timer, `PlayerController`, portas do engine |
| playlists / bookmarks / history / search / settings | conforme o nome |
| library *(apresentação)* | linhas de áudio com estado ao vivo, menu global de ações, busca, seletor |
| home *(apresentação)* | tela inicial (continuar ouvindo, atalhos, coleções, recentes) |

`library` e `home` existem para compor UI de várias features sem criar dependências circulares
entre apresentações (grafo acíclico: audios → player/downloads → library → collections/playlists/... → home).

## Como criar uma nova feature

1. `src/features/<nome>/domain` — entidades e contrato do repositório (TS puro).
2. `application/` — casos de uso como factory `create<Nome>UseCases(deps)` recebendo portas.
3. `index.ts` exportando domain + application; `presentation/index.ts` exportando telas/componentes.
4. Repositório SQLite em `infrastructure/database/repositories` + migração nova em `migrations.ts`.
5. Registrar no `createContainer` e, se houver tela, em `app/navigation/routes.ts` + `RootNavigator`.
6. Testes: domínio (puro), integração com `createTestApp()` e componentes com `renderWithTheme`.

## Tratamento de erros

`core/errors` define `AppError` com `code` estável e subclasses (`NetworkError`,
`InvalidSourceUrlError`, `SourceUnavailableError`, `UnsupportedFormatError`,
`InsufficientStorageError`, `DownloadFailedError`, `AudioPlaybackError`, `DatabaseError`,
`FileNotFoundError`, `PermissionDeniedError`, ...). A UI só exibe `getUserMessage(error)`
(pt-BR); detalhes técnicos vão para o log estruturado (`ConsoleLogger`, JSON por linha no logcat).

## Idiomas

Inglês (padrão) e português, seguindo o idioma do aparelho ou a escolha em Ajustes → Idioma.
Textos ficam em `src/core/i18n/locales` e são lidos com `t('chave')`; componentes usam
`useTranslation()` para re-renderizar na troca de idioma. Detalhes no
[ADR 0007](decisions/0007-internacionalizacao.md).
