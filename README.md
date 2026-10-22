# Excultus

<p align="center">
  <img src="android/app/src/main/ic_launcher-playstore.png" alt="Ícone do Excultus" width="120" />
</p>

Aplicativo Android de código aberto para importar, organizar, baixar e ouvir conteúdos de áudio
(cursos, audiolivros, podcasts e músicas). É **offline-first**: não tem conta, backend nem
analytics. Tudo fica no seu aparelho.

Feito com React Native CLI (**sem Expo**), nova arquitetura (TurboModules) e TypeScript estrito.

## Funcionalidades

- **Importação**
  - itens do **Internet Archive** (ex.: `https://archive.org/details/COFemAudio`);
  - links diretos de áudio;
  - arquivos do próprio dispositivo;
  - vídeos e playlists do **YouTube**: o áudio é baixado em M4A e o app avisa quando um vídeo
    não pode ser baixado (o link nunca é salvo sozinho).
- **Downloads persistentes**
  - fila com concorrência configurável, pausa e retomada por HTTP Range, e novas tentativas
    com backoff;
  - validação de integridade (tamanho e MD5) e controle de espaço em disco.
- **Player em segundo plano**
  - notificação de mídia, tela bloqueada e controles de fone;
  - velocidade, saltos, repetir e aleatório, fila, temporizador, marcadores e retomada de onde
    parou;
  - áudios que não podem tocar no momento (sem arquivo ou sem internet) são pulados
    automaticamente.
- **Organização:** coleções, playlists, favoritos, histórico, busca de texto completo (SQLite
  FTS5), filtros e ordenação.
- **Manutenção:** backup e restauração em JSON, verificação e limpeza do armazenamento.

## Stack

| Área | Tecnologia |
|---|---|
| App | React Native 0.88, React 19, TypeScript, React Navigation 7 |
| Estado e formulários | Zustand, React Hook Form + Zod |
| Banco de dados | SQLite via `@op-engineering/op-sqlite` (FTS5, migrações versionadas) |
| Áudio | `react-native-track-player` (com patches em `patches/`) |
| Nativo (Kotlin) | Downloader com OkHttp (download em blocos e remux de MP4 fragmentado); resolução do YouTube com [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) |
| Testes | Jest, React Native Testing Library, SQLite real em Node, Maestro (E2E) |

## Requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | 22.22+ (`.nvmrc`); o RN 0.88 exige ≥ 22.11 |
| JDK | 17 ou 21 **completo** (com `javac`), por exemplo o JBR do Android Studio |
| Android SDK | Platform 36, Build-Tools 36, NDK 27.1.12297006 |
| Dispositivo | Android 7.0+ (minSdk 24) |

> Se o Java padrão do sistema for só um JRE, o Gradle falha com um erro de toolchain sem
> `JAVA_COMPILER`. Fixe o JDK em `~/.gradle/gradle.properties`:
>
> ```properties
> org.gradle.java.home=/caminho/do/jdk
> org.gradle.java.installations.auto-detect=false
> org.gradle.java.installations.paths=/caminho/do/jdk
> ```
>
> Depois rode `cd android && ./gradlew --stop`.

## Como rodar

```bash
nvm use            # Node 22
npm install        # também aplica patches/ (patch-package no postinstall)
npm start          # Metro
npm run android    # build debug e instala no emulador ou dispositivo
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run validate` | typecheck, lint e testes |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint, incluindo regras de fronteira entre camadas |
| `npm test` / `npm run test:coverage` | Jest (unitários, integração com SQLite e componentes) |
| `npm run e2e` / `npm run e2e:offline` | Fluxos Maestro (ver [`docs/testing.md`](docs/testing.md)) |
| `npm run android:release` | APK de release |

Hooks Git (Husky): o `pre-commit` roda lint-staged e typecheck; o `pre-push` roda os testes.

## Build de release (APK e AAB)

O release é assinado com uma chave que **nunca entra no repositório**. Crie a sua:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ~/.android/excultus-release.jks \
  -alias excultus -keyalg RSA -keysize 4096 -validity 10000
```

Depois informe o caminho e as senhas em `~/.gradle/gradle.properties`, fora do projeto:

```properties
EXCULTUS_RELEASE_STORE_FILE=/home/<você>/.android/excultus-release.jks
EXCULTUS_RELEASE_STORE_PASSWORD=...
EXCULTUS_RELEASE_KEY_ALIAS=excultus
EXCULTUS_RELEASE_KEY_PASSWORD=...
```

Para gerar o APK e o AAB:

```bash
cd android && ./gradlew assembleRelease bundleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk    (instalação direta)
# AAB: android/app/build/outputs/bundle/release/app-release.aab  (Play Store)
```

- **Sem as propriedades:** o build usa a chave de debug e avisa no log. Esse resultado não serve
  para publicação.
- **Backup:** guarde o keystore e as senhas. Sem eles não dá para publicar atualizações.
- **Nova versão:** incremente `versionCode` e `versionName` em `android/app/build.gradle`.
- **Trocar de debug para release:** um app debug instalado tem outra assinatura, então é preciso
  desinstalá-lo antes de instalar o release no mesmo aparelho, e isso apaga os dados locais.

## Ícone do app

A arte original está em `AppIcon.png`. Todos os ícones são gerados a partir dela por
`python3 scripts/app-icon/generate.py` (requer Pillow):

- ícone adaptativo do Android (camadas de frente, fundo e monocromática), com o símbolo dentro
  da zona segura para que nenhuma máscara corte;
- ícones legados do Android 7;
- ícone da Play Store e ícones do iOS;
- ícone branco da notificação de mídia.

Para trocar o ícone, substitua `AppIcon.png` e rode o script.

## Estrutura

```text
src/
├── app/            composition root (DI), bootstrap, navegação, providers
├── core/           erros tipados, portas compartilhadas, utilitários puros
├── design-system/  tokens, tema, ícones, tipografia, animações e componentes App*
├── features/       audios, collections, downloads, imports, player, playlists, bookmarks,
│                   history, search, settings (+ library e home: composição de UI)
├── infrastructure/ SQLite, sistema de arquivos, HTTP, fontes externas (Archive, YouTube),
│                   áudio, downloader
└── shared/         hooks de apresentação, formulários, feedback (toast/snackbar)
specs/              specs TurboModule (codegen): downloader e YouTube
android/app/src/main/java/com/excultus/
├── downloads/      downloader OkHttp e remux de MP4 fragmentado
└── youtube/        resolução de vídeos e playlists com NewPipeExtractor
scripts/app-icon/   gerador de ícones
test/               fixtures, fakes e suporte de testes
e2e/flows/          fluxos Maestro
```

A arquitetura é limpa e organizada por feature: domínio e aplicação não conhecem React Native, e
as dependências de plataforma entram por portas e adaptadores. Os detalhes estão em
[`docs/architecture.md`](docs/architecture.md) e as decisões em
[`docs/decisions/`](docs/decisions).

## Documentação

- [Arquitetura](docs/architecture.md) · [Design System](docs/design-system.md) · [Banco de dados](docs/database.md)
- [Player](docs/audio-player.md) · [Downloads](docs/downloads.md) · [Fontes externas](docs/external-sources.md)
- [Testes](docs/testing.md) · [Plano](docs/implementation-plan.md) · [Progresso](docs/progress.md) · [Problemas conhecidos](docs/known-issues.md)

## Privacidade

- **Rede:** o app só faz requisições às fontes que você importa. Não há analytics nem conta.
- **Armazenamento:** os arquivos ficam em diretórios privados do app.
- **Arquivos do dispositivo:** entram pelo seletor do sistema (SAF), sem permissões amplas de
  armazenamento.

## Uso responsável

O Excultus é uma ferramenta para montar sua biblioteca pessoal. Baixe apenas conteúdo que você
tem direito de usar e respeite os termos de serviço de cada fonte, inclusive os do YouTube. A
extração do YouTube depende da NewPipeExtractor e pode parar de funcionar quando o site muda,
até que a biblioteca seja atualizada.

## Contribuindo

Issues e pull requests são bem-vindos. Antes de abrir um PR:

1. rode `npm run validate` (typecheck, lint e testes precisam passar);
2. cubra o comportamento novo com testes;
3. registre decisões de arquitetura relevantes em `docs/decisions/`.

## Licença

Copyright © 2026 Mises Dev

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da
**GNU General Public License**, publicada pela Free Software Foundation, na versão 3 ou (a seu
critério) qualquer versão posterior (**GPL-3.0-or-later**). Ele é distribuído na esperança de
ser útil, mas **sem nenhuma garantia**. Veja o texto completo em [`LICENSE`](LICENSE).

A GPLv3 é necessária porque o app inclui a
[NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor), licenciada sob GPLv3. As
demais dependências usam licenças compatíveis (MIT, Apache-2.0 e similares).
