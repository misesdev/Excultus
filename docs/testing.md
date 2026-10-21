# Testes

```bash
npm test                 # toda a suíte Jest
npm run test:coverage    # com cobertura
npm run validate         # typecheck + lint + testes
```

## Camadas da suíte

| Tipo | Onde | Como |
|---|---|---|
| Unitários (domínio/utilitários) | `src/**/domain/__tests__`, `src/core/__tests__`, `src/features/__tests__/domainRules.test.ts` | funções puras |
| Integração SQLite | `src/infrastructure/database/__tests__` | SQL real no `node:sqlite` (migrações, FKs, CHECKs, cascatas, FTS5, transações, 1.500 áudios) |
| Integração de casos de uso | `DownloadManager.test.ts`, `PlayerController.test.ts`, `importFlow.test.ts` | `createTestApp()`: composition root real + SQLite em memória; fakes só para portas nativas (downloader, engine, storage, rede, picker, HTTP) |
| Providers | `ArchiveOrgProvider.test.ts` | fixture gravada do item `COFemAudio` (`test/fixtures`) + casos sintéticos |
| Componentes | `src/design-system/__tests__`, `featureComponents.test.tsx` | React Native Testing Library 14 (async) — estados, interações, acessibilidade |
| App (smoke) | `src/app/__tests__/App.test.tsx` | bootstrap real, navegação, formulários, erros |
| E2E | `e2e/flows/*.yaml` | Maestro no emulador/dispositivo |

Os fakes (`test/support/fakes.ts`, `FakePlaybackEngine.ts`) existem só nos testes; nenhum mock é
usado em produção.

## E2E (Maestro)

Instale o Maestro (https://maestro.mobile.dev), suba um emulador e instale o **APK de release**
(não depende do Metro):

```bash
npm run android:release
adb install -r android/app/build/outputs/apk/release/app-release.apk
npm run e2e:offline     # 01: criar coleção, validação de formulário, persistência após reinício
npm run e2e             # inclui 02 (requer internet)
```

| Fluxo | Cobre |
|---|---|
| `01_create_collection` (tag `offline`) | criar coleção, validação, persistir após fechar/reabrir |
| `02_import_download_play_resume` (tag `network`) | importar COFemAudio, selecionar, baixar + validar, reproduzir, pausar, fechar/reabrir e retomar, favoritar, excluir download |

O fluxo 02 usa o Archive.org real (ver `known-issues.md`); a lógica equivalente é coberta de
forma determinística pelos testes de integração com fixture.
