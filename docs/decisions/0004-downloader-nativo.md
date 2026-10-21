# ADR 0004 — Downloader nativo próprio (TurboModule + OkHttp)

- **Status**: aceito · **Data**: 2026-10-21

## Contexto
Requisitos: progresso, pausa/retomada real, arquivo temporário, validação, cancelamento e
recuperação após morte do processo. `react-native-fs` não retoma downloads no Android;
`react-native-blob-util` tem suporte instável à nova arquitetura.

## Decisão
TurboModule Kotlin mínimo (`start`/`stop` + eventos) com OkHttp (já presente no RN) e
retomada via HTTP Range. Toda a política (fila, concorrência, retries, integridade, espaço,
persistência) fica no `DownloadManager` em TypeScript, testável.

## Consequências
+ Comportamento previsível e testado; código nativo pequeno.
− Sem WorkManager: downloads dependem do processo vivo; retomam na próxima abertura (documentado).
