# Player de áudio

## Componentes

- **`PlayerController`** (`features/player/application`): máquina de estados central e única
  fonte de verdade. Implementa `AudioPlayerService` (`play`, `pause`, `seekTo`, `setSpeed`,
  `skipToNext`, `skipToPrevious`) e mais: fila, repetir, aleatório, saltos, timer, sessão.
- **`AudioPlaybackEngine`** (porta) → **`TrackPlayerEngine`** (adapter do React Native Track
  Player / ExoPlayer). O engine toca **uma faixa por vez**; a fila vive no domínio
  (`PlaybackQueue`, imutável e testada).
- **Playback service** (`infrastructure/audio/playbackService.ts`, registrado em `index.js`):
  só encaminha comandos remotos (notificação, tela bloqueada, fone) para o controller.
- **`usePlayerStore`** (Zustand): projeção somente leitura do estado para a UI.

Comandos são serializados (mutex) para que toques rápidos nunca intercalem chamadas ao engine.

## Comportamentos

| Item | Implementação |
|---|---|
| Segundo plano / notificação / tela bloqueada | Track Player (foreground service `mediaPlayback`) |
| Chamadas e outros apps (audio focus) | `autoHandleInterruptions: true` |
| Desconectar fone | ExoPlayer "becoming noisy" (pausa) |
| Fonte | arquivo local verificado → `file://`; senão streaming do `mediaUrl` se online; senão erro amigável |
| Velocidade | 0,5x–3x; nova fila começa na velocidade padrão dos ajustes |
| Saltos | intervalos configuráveis (10/15/30 s), também na notificação |
| Anterior | reinicia a faixa se > 3 s; senão volta |
| Repetir | off → fila → faixa (faixa usa `RepeatMode.Track` nativo) |
| Timer | duração (5–90 min) ou fim da faixa; verificado nos ticks de progresso |
| Duração desconhecida | aprendida do engine e gravada no áudio |

## Progresso

Salvo: a cada 10 s durante a reprodução, ao pausar, buscar, trocar de faixa, terminar e parar.
Política de conclusão configurável (90/95/98/100%). Ao reabrir um áudio iniciado, retoma da
posição salva menos 2 s (se "Retomar de onde parou" estiver ativo e a posição > 5 s).

## Sessão

Fila, posição, repetir, velocidade e contexto são persistidos (`settings.player.session`).
Ao abrir o app, a sessão é restaurada **pausada** (mini player visível, sem tocar sozinho);
o primeiro "play" carrega a faixa na posição salva. Testado em `PlayerController.test.ts`
(reinício com o mesmo banco) e manualmente no emulador.

## Patches no Track Player 4.1.2

O RN 0.88 exige a nova arquitetura (bridgeless). `patches/react-native-track-player+4.1.2.patch`:
1. `Arguments.fromBundle` com `Bundle?` (nulabilidade Kotlin);
2. `@ReactMethod` retornando `Job` → corpo em bloco (`Unit`), exigido pela camada de interop;
3. `MusicService.emit` usa `reactContext` (compatível com bridgeless) em vez de `reactNativeHost`.
Ver ADR 0003.
