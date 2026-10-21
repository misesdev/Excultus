# Excultus

Aplicativo Android (React Native CLI, **sem Expo**) para importar, organizar, baixar e ouvir
conteúdos de áudio — cursos, audiolivros, podcasts e músicas — com funcionamento **offline-first**,
sem conta e sem backend.

- Importa itens do **Internet Archive** (ex.: `https://archive.org/details/COFemAudio`), links
  diretos de áudio, arquivos do dispositivo e links do **YouTube** (somente link + metadados).
- Downloads persistentes com fila, concorrência, pausa/retomada (HTTP Range), novas tentativas,
  validação de integridade (tamanho + MD5) e controle de espaço.
- Player completo em segundo plano (notificação, tela bloqueada, fones), velocidade, saltos,
  repetir/aleatório, fila, temporizador, marcadores e retomada automática.
- Coleções, playlists, favoritos, histórico, busca (FTS5), filtros e ordenação.
- Backup/restauração em JSON, verificação e limpeza de armazenamento.

## Requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | 22.22+ (`.nvmrc`) — o RN 0.88 exige ≥ 22.11 |
| JDK | 17 ou 21 **completo** (com `javac`). Ex.: JBR do Android Studio |
| Android SDK | Platform 36, Build-Tools 36, NDK 27.1.12297006 |
| Dispositivo | Android 7.0+ (minSdk 24) |

> Se o JDK padrão do sistema for apenas um JRE, exporte `JAVA_HOME` antes do Gradle:
> `export JAVA_HOME=/snap/android-studio/current/jbr` (ajuste o caminho).

## Instalação e execução

```bash
nvm use                    # Node 22
npm install                # aplica patches/ via patch-package (postinstall)
npm start                  # Metro
npm run android            # build debug + instala no emulador/dispositivo
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run validate` | typecheck + lint + testes |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (inclui regras de fronteira entre camadas) |
| `npm test` / `npm run test:coverage` | Jest (unitários, integração SQLite, componentes) |
| `npm run e2e` / `npm run e2e:offline` | Fluxos Maestro (ver `docs/testing.md`) |
| `npm run android:release` | APK de release |

Hooks Git (Husky): `pre-commit` roda lint-staged + typecheck; `pre-push` roda os testes.

## APK de release

```bash
cd android && ./gradlew assembleRelease
# saída: android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

O template assina o release com a chave de **debug** — suficiente para instalação pessoal.
Para distribuir, gere um keystore próprio (`keytool -genkeypair ...`), configure
`signingConfigs.release` em `android/app/build.gradle` e mantenha as senhas fora do Git
(`~/.gradle/gradle.properties`).

## Estrutura

```text
src/
├── app/            composition root (DI), bootstrap, navegação, providers
├── core/           erros tipados, portas compartilhadas, utilitários puros
├── design-system/  tokens, tema, ícones, tipografia, animações e componentes App*
├── features/       audios, collections, downloads, imports, player, playlists, bookmarks,
│                   history, search, settings (+ library e home: composição de UI)
├── infrastructure/ SQLite, sistema de arquivos, HTTP, providers externos, áudio, downloader
└── shared/         hooks de apresentação, formulários, feedback (toast/snackbar)
specs/              spec TurboModule (codegen) do downloader nativo
android/.../downloads/  módulo Kotlin (OkHttp) do downloader
test/               fixtures, fakes e suporte de testes
e2e/flows/          fluxos Maestro
```

Detalhes em [`docs/architecture.md`](docs/architecture.md). Decisões em [`docs/decisions/`](docs/decisions).

## Documentação

- [Arquitetura](docs/architecture.md) · [Design System](docs/design-system.md) · [Banco de dados](docs/database.md)
- [Player](docs/audio-player.md) · [Downloads](docs/downloads.md) · [Fontes externas](docs/external-sources.md)
- [Testes](docs/testing.md) · [Plano](docs/implementation-plan.md) · [Progresso](docs/progress.md) · [Problemas conhecidos](docs/known-issues.md)

## Privacidade

Nenhum dado sai do dispositivo além das requisições às fontes que você importa. Sem analytics,
sem conta. Arquivos ficam em diretórios privados do app; arquivos do dispositivo entram pelo
seletor do sistema (SAF), sem permissões amplas de armazenamento.
