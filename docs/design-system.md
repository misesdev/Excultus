# Design System

Tudo em `src/design-system`, importado **apenas** via `@design-system` (regra de lint).

## Tokens (`tokens/`)

- **Cores** (`colors.ts`): paleta semântica (`background`, `surface*`, `primary*`, `text*`, `border`,
  `success`, `warning`, `error`, `skeleton`...). Tema escuro padrão com a paleta da especificação.
  `artworkHues` gera capas determinísticas para itens sem arte.
- **Tipografia** (`typography.ts`): variantes `display`, `title`, `heading`, `subheading`, `body`,
  `bodyStrong`, `caption`, `captionStrong`, `overline`, `label` (rótulos curtos, ex.: abas), `button`, `mono` (números tabulares).
  `MAX_FONT_SIZE_MULTIPLIER = 1.6` mantém layouts usáveis com fonte ampliada.
- **Layout** (`layout.ts`): `spacing` (xs 4 → xxxl 48), `radius`, `opacity`, `iconSizes`,
  `componentSizes` (alvo de toque mínimo 48dp, alturas de botão/input/tab bar/mini player, tamanhos de capa).
- **Efeitos** (`effects.ts`): `shadows`/`elevation`, `durations`, `easings`.

## Tema

`ThemeProvider` + `useTheme()`; estilos via `makeStyles(theme => ({...}))` (memoizados por tema).
Novos temas = nova paleta + entrada em `themes` (`theme/theme.ts`); componentes não mudam.
`toNavigationTheme` adapta o tema ao React Navigation.

## Componentes

Base: `AppScreen`, `AppHeader`, `AppText`, `AppButton`, `AppIconButton`, `AppTextInput`,
`AppSearchInput`, `AppCard`, `AppModal`, `AppBottomSheet`, `AppDialog`, `AppToast`,
`AppSnackbar`, `AppBadge`, `AppChip`, `AppDivider`, `AppSkeleton`/`AppListSkeleton`,
`AppLoadingIndicator`, `AppEmptyState`, `AppErrorState`, `AppProgressBar`, `AppSlider`,
`AppSwitch`, `AppCheckbox`, `AppListItem`, `AppSectionHeader`, `AppContextMenu`, `AppArtwork`,
`AppAvatar`, `AppTabBar` (dock flutuante arredondado com destaque que desliza até a aba ativa; o mini player flutua acima dele como um card), `AppIcon` (Ionicons).

De áudio (nas features): `AudioCard`, `AudioListItem`, `AudioArtwork`, `AudioMetadata`,
`AudioDuration`, `AudioProgress`, `AudioWaveform`, `AudioActionsMenu`, `CollectionCard`,
`CollectionGrid`, `CollectionHeader`, `MiniPlayer`, `FullPlayerScreen`, `PlaybackControls`,
`PlaybackSpeedSelector`, `PlaybackQueue`, `DownloadProgress`, `DownloadItem`, `ImportPreview`.

## Regras

- Estados: default, pressed, disabled, loading, error e selected quando aplicáveis.
- Acessibilidade: `accessibilityRole`/`State`/`Label` em todos os interativos; botões só de ícone
  exigem `accessibilityLabel`; `AppSlider` é `adjustable` com incremento/decremento.
- Feedback háptico discreto (`haptic()`), respeitando as configurações do sistema.
- Animações curtas com `useNativeDriver` quando possível (`useFadeIn`, `usePulse`).
- Nada de cores, tamanhos ou fontes literais em telas — sempre tokens.
