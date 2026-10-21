# ADR 0003 — React Native Track Player 4.1.2 com patches para RN 0.88

- **Status**: aceito (revisar quando houver release estável compatível) · **Data**: 2026-10-21

## Contexto
A especificação exige Track Player. A versão estável (4.1.2) não compila/roda no RN 0.88
(nova arquitetura obrigatória): nulabilidade de `Bundle`, `@ReactMethod` retornando `Job`,
e `MusicService` usando `ReactNativeHost` (inexistente em bridgeless). A 5.x está em nightly.

## Decisão
Manter 4.1.2 com `patch-package` (`patches/`), aplicado no `postinstall`, com 3 correções
mínimas e mecânicas. O engine fica isolado atrás de `AudioPlaybackEngine`.

## Consequências
+ Reprodução em segundo plano, notificação, tela bloqueada, foco de áudio e fones funcionando (validado no emulador).
− Patch a manter ao atualizar; trocar de engine exige só um novo adapter.
