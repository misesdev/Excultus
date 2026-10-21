# PROMPT MESTRE — DESENVOLVIMENTO DE APLICATIVO DE GERENCIAMENTO DE ÁUDIOS

## 1. Papel e responsabilidade do agente

Você é um engenheiro de software sênior especializado em React Native, TypeScript, arquitetura de software, desenvolvimento mobile Android, design systems e aplicações offline-first.

Sua responsabilidade é **projetar, implementar, testar e entregar um aplicativo completo de gerenciamento e reprodução de conteúdos de áudio**, com código de qualidade profissional, arquitetura sustentável e experiência visual moderna.

O aplicativo será inicialmente pessoal, totalmente local e sem necessidade de backend.

**Não desenvolva apenas um protótipo visual ou uma aplicação que simplesmente funcione. Desenvolva um produto real, utilizável, testável, extensível e bem estruturado.**

O código deverá seguir rigorosamente:

- Clean Architecture.
- SOLID.
- Clean Code.
- Separation of Concerns.
- DRY, KISS e YAGNI.
- Composition over Inheritance.
- Dependency Inversion e Dependency Injection.
- Repository Pattern.
- Adapter Pattern.
- Strategy Pattern, quando aplicável.
- Factory Pattern, quando necessário.
- Component-Based Architecture.
- Design System centralizado.
- Offline-First Architecture.
- Type Safety.
- Test-Driven Development sempre que apropriado.

Evite abstrações desnecessárias, mas nunca sacrifique a organização, a testabilidade e a manutenibilidade em nome de implementações rápidas.

---

# 2. Visão geral do produto

Desenvolver um aplicativo mobile Android utilizando React Native com TypeScript, **sem Expo**, para gerenciamento, organização, importação, download e reprodução de conteúdos de áudio.

O aplicativo deverá funcionar como uma combinação de:

- Gerenciador de podcasts.
- Player de audiolivros.
- Biblioteca pessoal de músicas.
- Gerenciador de cursos em áudio.
- Player offline.
- Organizador de conteúdos provenientes de diferentes fontes.

O usuário poderá criar coleções, importar conteúdos de fontes externas, baixar arquivos autorizados, organizar áudios e reproduzi-los com uma experiência superior à oferecida pelos sites originais.

### Caso de uso principal

O usuário deseja importar o conteúdo:

https://archive.org/details/COFemAudio

O aplicativo deverá:

1. Receber a URL do Internet Archive.
2. Identificar automaticamente o item.
3. Consultar seus metadados.
4. Identificar os arquivos de áudio disponíveis.
5. Apresentar os arquivos em uma interface organizada.
6. Permitir selecionar arquivos individualmente ou todos.
7. Permitir escolher uma coleção de destino.
8. Baixar os arquivos para o armazenamento local.
9. Registrar os metadados no banco SQLite.
10. Permitir reprodução offline.
11. Salvar automaticamente o progresso de reprodução.
12. Oferecer controles avançados de áudio.

A arquitetura deverá permitir adicionar outras fontes futuramente sem modificar o núcleo da aplicação.

---

# 3. Stack tecnológica

Utilizar:

| Responsabilidade | Tecnologia |
|---|---|
| Framework | React Native CLI |
| Linguagem | TypeScript com strict mode |
| Plataforma inicial | Android |
| Navegação | React Navigation |
| Estado global | Zustand |
| Persistência | SQLite |
| Reprodução | React Native Track Player |
| Armazenamento | Sistema de arquivos local |
| Requisições HTTP | Cliente HTTP tipado |
| Formulários | React Hook Form + Zod |
| Validação | Zod |
| Ícones | React Native Vector Icons / Ionicons |
| Testes unitários | Jest |
| Testes de componentes | React Native Testing Library |
| Testes E2E | Maestro ou Detox |
| Qualidade | ESLint + Prettier |
| Hooks Git | Husky + lint-staged |

Utilize versões estáveis e compatíveis entre si, verificando os requisitos da versão do React Native escolhida.

Não utilizar Expo nem bibliotecas dependentes obrigatoriamente de Expo.

Priorizar bibliotecas ativamente mantidas.

Caso alguma biblioteca não atenda aos requisitos de background playback, downloads ou armazenamento, implementar um adapter nativo Android isolado da camada de domínio.

Não adicionar bibliotecas desnecessárias.

---

# 4. Arquitetura do projeto

Implementar Clean Architecture com organização modular por funcionalidade.

As dependências devem apontar para as camadas internas.

A camada de domínio não pode depender de React Native, SQLite, bibliotecas HTTP, componentes visuais ou APIs do Android.

### Camadas

**Domain**

Responsável por:

- Entidades.
- Value Objects.
- Regras de negócio.
- Contratos de repositórios.
- Erros de domínio.
- Políticas de validação independentes de frameworks.

**Application**

Responsável por:

- Use Cases.
- Orquestração de operações.
- Contratos de serviços externos.
- DTOs de entrada e saída.
- Regras de aplicação.
- Controle de fluxos transacionais.

**Infrastructure**

Responsável por:

- SQLite.
- Sistema de arquivos.
- APIs externas.
- Downloads.
- Adapters de áudio.
- Implementações de repositórios.
- Mappers de persistência.
- Integrações nativas.

**Presentation**

Responsável por:

- Screens.
- Components.
- Hooks.
- ViewModels.
- Navigation.
- Design System.
- Estado de apresentação.
- Feedback visual.

### Estrutura sugerida

```text
src/
├── app/
│   ├── navigation/
│   ├── providers/
│   ├── bootstrap/
│   └── dependency-injection/
│
├── core/
│   ├── domain/
│   ├── application/
│   ├── errors/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── design-system/
│   ├── tokens/
│   ├── theme/
│   ├── components/
│   ├── typography/
│   ├── icons/
│   └── animations/
│
├── features/
│   ├── collections/
│   ├── audios/
│   ├── player/
│   ├── downloads/
│   ├── imports/
│   ├── playlists/
│   ├── bookmarks/
│   ├── history/
│   ├── search/
│   └── settings/
│
├── infrastructure/
│   ├── database/
│   ├── filesystem/
│   ├── http/
│   ├── audio/
│   ├── downloads/
│   ├── metadata/
│   └── external-sources/
│
└── shared/
    ├── hooks/
    ├── helpers/
    └── types/
```

Cada feature deverá conter apenas as camadas necessárias:

```text
features/collections/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── value-objects/
├── application/
│   ├── use-cases/
│   └── dto/
├── presentation/
│   ├── screens/
│   ├── components/
│   ├── hooks/
│   └── view-models/
└── index.ts
```

Evitar dependências circulares.

Não duplicar conceitos entre `core`, `shared` e `features`.

Definir explicitamente os limites de cada módulo e suas interfaces públicas.

Não permitir imports arbitrários de arquivos internos de outras features.

Utilizar uma composition root para instanciar dependências concretas.

---

# 5. Design System e identidade visual

A interface deve ser moderna, elegante, minimalista, fluida e visualmente consistente.

Referências de experiência:

- Spotify.
- Apple Music.
- Pocket Casts.
- Audible.
- Aplicativos modernos de reprodução de audiolivros.

Não copiar interfaces literalmente. Criar uma identidade própria.

## 5.1 Tema visual

Tema escuro como padrão.

Paleta inicial sugerida:

```typescript
const colors = {
  background: '#0B0D10',
  surface: '#15191E',
  surfaceElevated: '#1D232A',
  surfaceHighlight: '#272F38',

  primary: '#38BDF8',
  primaryPressed: '#0284C7',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  border: '#29313B',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};
```

Centralizar todos os tokens visuais.

Preparar a arquitetura para suportar futuramente outros temas.

Nunca espalhar cores, tamanhos, fontes e espaçamentos arbitrários pelos componentes.

## 5.2 Design tokens

Definir:

- Colors.
- Typography.
- Spacing.
- Border radius.
- Shadows.
- Elevation.
- Opacity.
- Animation duration.
- Animation easing.
- Icon sizes.
- Component sizes.

Utilizar uma escala consistente de espaçamento.

Exemplo:

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};
```

## 5.3 Componentes reutilizáveis

Criar uma biblioteca de componentes compartilhados.

Componentes mínimos:

```text
AppScreen
AppHeader
AppText
AppButton
AppIconButton
AppTextInput
AppSearchInput
AppCard
AppModal
AppBottomSheet
AppDialog
AppToast
AppSnackbar
AppBadge
AppChip
AppDivider
AppSkeleton
AppLoadingIndicator
AppEmptyState
AppErrorState
AppProgressBar
AppSlider
AppSwitch
AppCheckbox
AppListItem
AppSectionHeader
AppContextMenu
AppArtwork
AppAvatar
AppTabBar
```

Componentes específicos de áudio:

```text
AudioCard
AudioListItem
AudioArtwork
AudioMetadata
AudioDuration
AudioProgress
AudioWaveform
AudioActionsMenu
CollectionCard
CollectionGrid
CollectionHeader
MiniPlayer
FullPlayer
PlaybackControls
PlaybackSpeedSelector
PlaybackQueue
DownloadProgress
DownloadItem
ImportPreview
```

Não duplicar componentes visualmente semelhantes em diferentes telas.

Utilizar composição e variantes de componentes.

Todos os componentes interativos devem possuir estados:

- Default.
- Pressed.
- Disabled.
- Loading, quando aplicável.
- Error, quando aplicável.
- Selected, quando aplicável.

Garantir áreas de toque adequadas, acessibilidade, contraste, suporte a fontes ampliadas e feedback visual.

## 5.4 Experiência de navegação

Criar navegação inferior com quatro abas:

1. Início.
2. Coleções.
3. Downloads.
4. Configurações.

O miniplayer deverá permanecer visível acima da navegação inferior sempre que houver um áudio ativo.

O player completo deverá ser apresentado como uma tela imersiva.

Implementar:

- Transições suaves.
- Gestos naturais.
- Feedback háptico quando apropriado.
- Bottom sheets.
- Skeleton loading.
- Empty states bem elaborados.
- Mensagens de erro amigáveis.
- Indicadores de progresso.
- Safe areas.
- Suporte ao botão voltar do Android.

A experiência deverá permanecer consistente em todas as telas.

---

# 6. Gerenciamento de coleções

Implementar CRUD completo de coleções.

Uma coleção deverá possuir:

```typescript
interface Collection {
  id: string;
  name: string;
  description?: string;
  artworkPath?: string;
  createdAt: string;
  updatedAt: string;
}
```

Funcionalidades:

- Criar coleção.
- Editar coleção.
- Excluir coleção.
- Escolher capa.
- Adicionar áudio.
- Remover áudio.
- Reordenar áudios.
- Pesquisar dentro da coleção.
- Ordenar por nome, data, duração e ordem personalizada.
- Exibir duração total.
- Exibir quantidade de áudios.
- Exibir quantidade de arquivos offline.
- Exibir progresso geral de conteúdos longos.

Uma mesma faixa poderá pertencer a múltiplas coleções.

A exclusão de uma coleção não deverá excluir automaticamente arquivos compartilhados com outras coleções.

Ao excluir uma coleção, oferecer opções claras sobre a manutenção dos arquivos locais.

---

# 7. Entidade de áudio

Implementar uma entidade central de áudio independente da origem.

Campos sugeridos:

```typescript
interface Audio {
  id: string;
  title: string;
  description?: string;

  artist?: string;
  album?: string;

  durationMs?: number;

  artworkPath?: string;

  sourceType:
    | 'archive'
    | 'youtube'
    | 'local'
    | 'direct';

  sourceId?: string;
  sourceUrl?: string;

  localPath?: string;

  mimeType?: string;
  fileSize?: number;

  createdAt: string;
  updatedAt: string;
}
```

A disponibilidade offline deverá ser determinada por um estado consistente de armazenamento e verificação do arquivo, não apenas pela presença de um caminho.

Utilizar IDs estáveis.

Separar metadados do áudio, associação às coleções, progresso e estado de download.

Evitar duplicação de arquivos e registros.

---

# 8. Integração com Internet Archive

Implementar um módulo desacoplado para importação de conteúdos do Archive.org.

Endpoint inicial:

```text
GET https://archive.org/metadata/{identifier}
```

Exemplo:

```text
https://archive.org/metadata/COFemAudio
```

Criar uma abstração:

```typescript
interface AudioSourceProvider {
  canHandle(url: string): boolean;

  getMetadata(
    url: string
  ): Promise<SourceMetadata>;

  getAudioItems(
    url: string
  ): Promise<SourceAudioItem[]>;
}
```

Separar a descoberta de metadados da obtenção de arquivos.

O provider deverá:

- Identificar URLs compatíveis.
- Extrair o identificador do item.
- Consultar metadados.
- Identificar arquivos de áudio.
- Ignorar arquivos não suportados.
- Reconhecer formatos compatíveis.
- Identificar título, duração e tamanho quando disponíveis.
- Construir URLs válidas de download.
- Preservar metadados originais.
- Tratar erros de rede.
- Tratar respostas inesperadas.
- Tratar arquivos indisponíveis.
- Respeitar restrições de acesso e direitos de uso.

Não presumir que todos os arquivos possuem metadados completos.

Não presumir que todos os arquivos são públicos ou podem ser baixados.

Implementar o provider de maneira independente da interface.

## 8.1 Tela de importação

Fluxo:

1. Usuário abre a opção de importar.
2. Cola a URL.
3. Aplicativo identifica a fonte.
4. Exibe carregamento.
5. Consulta os metadados.
6. Apresenta os arquivos encontrados.
7. Permite selecionar arquivos.
8. Permite escolher a coleção.
9. Exibe espaço total estimado.
10. Confirma a importação.
11. Inicia os downloads.
12. Atualiza a biblioteca local.

A tela deve permitir selecionar todos, desmarcar todos e importar apenas arquivos específicos.

Evitar bloquear a interface durante downloads.

---

# 9. Integração com YouTube

Preparar um provider para conteúdos do YouTube.

O aplicativo deverá reconhecer URLs de vídeos e playlists e permitir armazenar links e metadados.

A integração deverá respeitar as regras de acesso e reprodução da plataforma.

Não implementar extração não autorizada de áudio ou mecanismos de contorno de restrições do YouTube.

Para conteúdos com arquivos disponibilizados legitimamente para download, permitir importação por meio da fonte autorizada.

A arquitetura deverá permitir providers adicionais futuramente.

Exemplos:

```text
ArchiveOrgProvider
YouTubeMetadataProvider
LocalFileProvider
DirectAudioProvider
```

Cada provider deverá implementar contratos bem definidos.

---

# 10. Gerenciador de downloads

Implementar um sistema de downloads robusto, persistente e desacoplado da interface.

Estados:

```typescript
type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

Funcionalidades:

- Fila de downloads.
- Downloads simultâneos configuráveis.
- Progresso individual.
- Progresso agregado.
- Pausar.
- Retomar.
- Cancelar.
- Tentar novamente.
- Detectar falhas.
- Validar integridade.
- Detectar falta de espaço.
- Evitar downloads duplicados.
- Preservar arquivos parciais quando apropriado.
- Limpar arquivos temporários.
- Recuperar downloads interrompidos.

O download deverá ser gravado inicialmente em arquivo temporário e movido para o destino definitivo após validação.

Implementar persistência do estado da fila.

Considerar que o Android pode encerrar o processo da aplicação.

Utilizar mecanismos nativos apropriados, como WorkManager ou serviços Android quando necessários, respeitando restrições de execução em segundo plano.

Não prometer downloads contínuos em background sem implementar e testar o mecanismo nativo correspondente.

### Armazenamento

Salvar arquivos em diretórios controlados pelo aplicativo.

Utilizar identificadores internos estáveis para evitar conflitos de nomes.

Não depender do título original como identificador físico do arquivo.

Implementar controle de espaço utilizado.

Permitir excluir arquivos baixados sem necessariamente excluir seus metadados.

---

# 11. Player de áudio

Implementar um player completo utilizando React Native Track Player, com integração nativa quando necessária.

O player deverá funcionar em segundo plano.

Funcionalidades obrigatórias:

- Play.
- Pause.
- Stop quando necessário.
- Próxima faixa.
- Faixa anterior.
- Avançar 10, 15 e 30 segundos.
- Retroceder 10, 15 e 30 segundos.
- Seek.
- Velocidade de reprodução.
- Repetir faixa.
- Repetir coleção ou fila.
- Reprodução aleatória.
- Fila de reprodução.
- Reprodução sequencial.
- Controles na notificação.
- Controles na tela bloqueada.
- Integração com controles de mídia do Android.
- Retomada da reprodução.
- Tratamento de interrupções de áudio.
- Tratamento de chamadas telefônicas.
- Tratamento de desconexão de fones.
- Temporizador para desligamento automático.

### Progresso

Persistir:

```typescript
interface PlaybackProgress {
  audioId: string;
  positionMs: number;
  durationMs?: number;
  completed: boolean;
  lastPlayedAt: string;
}
```

Salvar periodicamente durante a reprodução e em eventos importantes:

- Pausa.
- Troca de faixa.
- Encerramento da sessão, quando observável.
- Mudança de posição.
- Finalização.

Não depender exclusivamente do evento de encerramento do aplicativo.

Evitar escritas excessivas no banco.

Ao abrir um áudio já iniciado, permitir continuar da posição salva.

Definir uma política configurável para marcar um áudio como concluído.

### Arquitetura do player

Criar uma interface:

```typescript
interface AudioPlayerService {
  play(audioId: string): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
}
```

A implementação concreta deverá encapsular a biblioteca de reprodução.

Não permitir que componentes visuais dependam diretamente das APIs do Track Player.

Centralizar a máquina de estados de reprodução e a sincronização com o player nativo.

Evitar múltiplas fontes de verdade.

---

# 12. MiniPlayer e FullPlayer

## MiniPlayer

Deverá permanecer visível enquanto houver conteúdo ativo.

Exibir:

- Capa.
- Título.
- Informações secundárias.
- Botão play/pause.
- Indicador de progresso.

Ao tocar no miniplayer, abrir o FullPlayer.

## FullPlayer

Tela imersiva com:

- Capa em destaque.
- Nome da faixa.
- Nome da coleção.
- Barra de progresso.
- Tempo decorrido.
- Tempo restante.
- Play/pause centralizado.
- Próxima e anterior.
- Avançar e retroceder.
- Velocidade.
- Temporizador.
- Favoritos.
- Fila de reprodução.
- Menu de opções.

Utilizar animações discretas.

Não sobrecarregar a interface.

Priorizar legibilidade e facilidade de uso com uma mão.

---

# 13. Favoritos, playlists e marcadores

Implementar favoritos independentes das coleções.

Permitir criar playlists personalizadas.

Diferenciar:

- Coleção: organização permanente de conteúdos.
- Playlist: sequência personalizada de reprodução.
- Fila: sequência temporária ativa no player.

Implementar marcadores de reprodução.

Exemplo:

```typescript
interface AudioBookmark {
  id: string;
  audioId: string;
  positionMs: number;
  title?: string;
  note?: string;
  createdAt: string;
}
```

O usuário poderá salvar um ponto específico de uma aula, adicionar uma anotação e retornar posteriormente.

---

# 14. Histórico e retomada

Criar uma seção "Continuar ouvindo" na tela inicial.

Exibir conteúdos reproduzidos recentemente.

Implementar:

- Histórico de reprodução.
- Última posição.
- Data da última reprodução.
- Conteúdos concluídos.
- Conteúdos em andamento.
- Limpeza do histórico.
- Retomada rápida.

A tela inicial deverá priorizar conteúdos relevantes para continuidade.

---

# 15. Pesquisa e organização

Implementar busca local rápida.

Pesquisar por:

- Título.
- Artista.
- Álbum.
- Coleção.
- Descrição.
- Origem.

Implementar filtros:

- Todos.
- Baixados.
- Não baixados.
- Favoritos.
- Em andamento.
- Concluídos.

Implementar ordenação por:

- Nome.
- Data de adição.
- Última reprodução.
- Duração.
- Ordem personalizada.

Utilizar índices adequados no SQLite.

Para bibliotecas grandes, considerar FTS5, conforme suporte da versão SQLite utilizada.

Não carregar milhares de registros na memória desnecessariamente.

---

# 16. Persistência e SQLite

Criar um banco de dados local com migrações versionadas.

Entidades principais:

```text
collections
audios
collection_audios
playlists
playlist_audios
playback_progress
downloads
bookmarks
favorites
playback_history
settings
```

Requisitos:

- Chaves primárias.
- Chaves estrangeiras.
- Índices.
- Constraints.
- Integridade referencial.
- Migrações.
- Transações.
- Controle de versões do schema.

Ativar e validar foreign keys.

Implementar repositories tipados.

Não executar queries SQL diretamente nas telas.

Não misturar modelos de persistência com entidades de domínio.

Criar mappers explícitos quando necessário.

Testar migrações e integridade referencial.

---

# 17. Gerenciamento de estado

Utilizar Zustand de maneira criteriosa.

Separar:

- Estado persistido no SQLite.
- Estado de domínio.
- Estado temporário de apresentação.
- Estado de reprodução.
- Estado da fila de downloads.

Não utilizar Zustand como substituto indiscriminado do banco de dados.

Não duplicar informações sem necessidade.

Utilizar selectors para minimizar renderizações.

Evitar stores monolíticas.

Manter os efeitos colaterais fora dos componentes visuais sempre que possível.

---

# 18. Tratamento de erros

Implementar erros tipados.

Exemplos:

```text
NetworkError
InvalidSourceUrlError
SourceUnavailableError
UnsupportedFormatError
InsufficientStorageError
DownloadFailedError
AudioPlaybackError
DatabaseError
FileNotFoundError
PermissionDeniedError
```

Separar erros técnicos das mensagens exibidas ao usuário.

Nunca apresentar stack traces na interface.

Não ocultar falhas silenciosamente.

Implementar logs estruturados para diagnóstico.

Não registrar informações sensíveis desnecessárias.

Todas as operações assíncronas deverão possuir tratamento adequado de falhas.

---

# 19. Performance

O aplicativo deverá continuar fluido com bibliotecas grandes.

Implementar:

- FlatList ou FlashList conforme necessidade.
- Renderização virtualizada.
- Paginação quando apropriada.
- Imagens com cache.
- Carregamento progressivo.
- Selectors eficientes.
- Memoização justificada por medição.
- Operações pesadas fora da thread de UI.
- Consultas SQLite otimizadas.
- Debounce em pesquisas.
- Redução de renderizações desnecessárias.

Evitar otimizações prematuras.

Medir antes de introduzir complexidade.

Testar listas com pelo menos 1.000 áudios.

---

# 20. Segurança e privacidade

O aplicativo será inicialmente local, sem autenticação.

Requisitos:

- Não coletar dados pessoais desnecessários.
- Não utilizar analytics externos por padrão.
- Não expor arquivos privados involuntariamente.
- Validar URLs externas.
- Utilizar HTTPS.
- Evitar path traversal.
- Sanitizar nomes de arquivos.
- Validar MIME type e extensão.
- Evitar execução de conteúdo recebido.
- Tratar permissões Android corretamente.
- Não solicitar permissões desnecessárias.

O aplicativo deverá funcionar sem conta e sem conexão com servidor próprio.

---

# 21. Configurações

Criar uma tela de configurações organizada em seções.

### Reprodução

- Velocidade padrão.
- Intervalo de avanço.
- Intervalo de retrocesso.
- Reprodução automática da próxima faixa.
- Comportamento de conclusão.
- Retomada automática.

### Downloads

- Quantidade máxima de downloads simultâneos.
- Download somente por Wi-Fi.
- Tentativas automáticas.
- Gerenciamento de espaço.

### Armazenamento

- Espaço utilizado.
- Arquivos baixados.
- Limpeza de arquivos temporários.
- Exclusão de downloads.
- Verificação de arquivos ausentes.

### Aparência

- Tema escuro.
- Tema claro futuramente.
- Cor de destaque futuramente.

### Dados

- Exportação de metadados.
- Backup local.
- Restauração.
- Limpeza de histórico.

---

# 22. Testes automatizados

Testes não são opcionais.

## Unitários

Testar:

- Entidades.
- Value Objects.
- Use Cases.
- Regras de coleção.
- Deduplicação.
- Progresso.
- Ordenação.
- Validação de URLs.
- Mapeamento de metadados.
- Regras de downloads.
- Regras de fila.

## Integração

Testar:

- Repositórios SQLite.
- Migrações.
- Persistência de progresso.
- Providers de importação.
- Downloads com HTTP mockado.
- Interação com sistema de arquivos.
- Adapters de reprodução quando viável.

## Componentes

Testar:

- Estados visuais.
- Interações.
- Navegação.
- Formulários.
- Erros.
- Loading.
- Empty states.
- Acessibilidade básica.

## E2E

Testar os fluxos principais:

1. Criar coleção.
2. Importar conteúdo.
3. Selecionar áudios.
4. Baixar.
5. Reproduzir.
6. Pausar.
7. Fechar e reabrir.
8. Retomar da posição salva.
9. Adicionar favorito.
10. Excluir download.

Usar fixtures determinísticas e servidor de testes controlado.

Não depender de serviços externos reais para toda a suíte de testes.

---

# 23. Qualidade de código

Estabelecer as seguintes regras:

1. Não utilizar `any` indiscriminadamente.
2. Não utilizar `@ts-ignore` para esconder problemas.
3. Não criar componentes gigantes.
4. Não concentrar lógica de negócio em screens.
5. Não acessar SQLite diretamente da UI.
6. Não acessar APIs externas diretamente da UI.
7. Não duplicar lógica de negócio.
8. Não criar helpers genéricos sem necessidade.
9. Não utilizar números mágicos.
10. Não espalhar strings de navegação.
11. Não criar dependências circulares.
12. Não utilizar classes abstratas desnecessárias.
13. Não criar interfaces sem uma responsabilidade clara.
14. Não capturar exceções para ignorá-las.
15. Não adicionar TODOs para funcionalidades obrigatórias sem registrar pendências.
16. Não deixar código morto.
17. Não utilizar mocks como implementação de produção.
18. Não criar funcionalidades visualmente prontas, mas sem comportamento real.
19. Não ignorar problemas de concorrência em downloads e reprodução.
20. Não implementar soluções provisórias sem justificativa técnica.

Aplicar SOLID de forma pragmática.

Arquitetura limpa não significa criar uma quantidade excessiva de arquivos e interfaces para operações triviais.

Cada abstração deverá ter uma justificativa.

---

# 24. Documentação

Criar:

```text
README.md
docs/
├── architecture.md
├── design-system.md
├── database.md
├── audio-player.md
├── downloads.md
├── external-sources.md
├── testing.md
└── decisions/
```

Documentar:

- Instalação.
- Requisitos.
- Execução Android.
- Estrutura do projeto.
- Arquitetura.
- Fluxos principais.
- Dependências.
- Decisões arquiteturais.
- Como criar uma nova feature.
- Como criar um novo provider de conteúdo.
- Como executar testes.
- Como gerar APK de release.

Utilizar ADRs para decisões arquiteturais importantes.

---

# 25. Etapas de implementação

O desenvolvimento deverá ser incremental, respeitando dependências entre módulos.

## Fase 1 — Fundação

- Inicializar React Native CLI.
- Configurar TypeScript strict.
- Configurar ESLint e Prettier.
- Configurar testes.
- Configurar navegação.
- Configurar DI.
- Criar estrutura modular.
- Implementar Design System.
- Criar componentes básicos.
- Criar documentação inicial.

**Critério de aceite:** aplicação inicia corretamente, navegação funciona e componentes básicos possuem testes.

## Fase 2 — Persistência e coleções

- Configurar SQLite.
- Criar migrações.
- Implementar entidades.
- Implementar repositories.
- Implementar CRUD de coleções.
- Implementar relacionamento coleção/áudio.
- Criar telas de coleções.
- Criar testes.

**Critério de aceite:** coleções e seus metadados persistem corretamente após reiniciar o aplicativo.

## Fase 3 — Player

- Integrar Track Player.
- Implementar AudioPlayerService.
- Implementar fila.
- Implementar MiniPlayer.
- Implementar FullPlayer.
- Implementar controles Android.
- Implementar progresso.
- Implementar retomada.
- Implementar testes.

**Critério de aceite:** áudio local reproduz em segundo plano, com progresso persistente e controles de mídia funcionais.

## Fase 4 — Archive.org

- Criar provider.
- Implementar parsing de URLs.
- Consultar metadados.
- Identificar arquivos.
- Criar tela de importação.
- Implementar seleção.
- Associar áudios às coleções.
- Implementar testes.

**Critério de aceite:** usuário consegue consultar o item COFemAudio e selecionar arquivos disponíveis.

## Fase 5 — Downloads

- Implementar fila persistente.
- Implementar downloads nativos.
- Implementar progresso.
- Implementar pausa e retomada quando suportadas.
- Implementar recuperação de falhas.
- Implementar gerenciamento de arquivos.
- Criar tela de downloads.
- Implementar testes.

**Critério de aceite:** usuário consegue baixar um áudio do Archive.org, fechar e reabrir o aplicativo e reproduzi-lo sem internet.

## Fase 6 — Biblioteca avançada

- Favoritos.
- Playlists.
- Marcadores.
- Histórico.
- Busca.
- Filtros.
- Ordenação.
- Continuar ouvindo.

**Critério de aceite:** todas as funcionalidades possuem persistência, integração visual e testes.

## Fase 7 — Fontes adicionais

- Importação de arquivos locais.
- Provider de áudio direto.
- Reconhecimento de links do YouTube.
- Metadados e integração autorizada do YouTube.
- Extensibilidade de providers.

**Critério de aceite:** diferentes fontes podem ser adicionadas sem alterar regras centrais de coleções e reprodução.

## Fase 8 — Polimento e entrega

- Revisar UI/UX.
- Revisar acessibilidade.
- Corrigir inconsistências visuais.
- Testar diferentes tamanhos de tela.
- Otimizar performance.
- Executar testes E2E.
- Revisar armazenamento.
- Validar funcionamento offline.
- Gerar APK de release.
- Atualizar documentação.

**Critério de aceite:** aplicativo estável, utilizável e pronto para instalação pessoal.

---

# 26. Regras de execução para agentes de IA

Estas instruções são obrigatórias durante todo o desenvolvimento.

### Planejamento

Antes de implementar cada fase:

1. Inspecionar a estrutura existente.
2. Identificar módulos afetados.
3. Verificar componentes reutilizáveis.
4. Verificar contratos existentes.
5. Definir o plano técnico.
6. Identificar riscos e dependências.
7. Implementar de forma incremental.

Não reestruturar partes estáveis do projeto sem justificativa.

### Implementação

- Implementar funcionalidades completas.
- Reutilizar componentes existentes.
- Preservar padrões arquiteturais.
- Manter consistência visual.
- Criar testes junto com as funcionalidades.
- Não introduzir dependências desnecessárias.
- Não substituir implementações reais por mocks.
- Não ignorar erros de compilação.
- Não implementar funcionalidades fora do escopo sem necessidade.

### Validação

Após cada etapa:

1. Executar TypeScript typecheck.
2. Executar ESLint.
3. Executar testes relacionados.
4. Validar build Android quando aplicável.
5. Verificar regressões.
6. Atualizar documentação.
7. Registrar pendências reais.

Não declarar uma funcionalidade concluída sem validação.

Se o ambiente não permitir executar um teste, registrar claramente a limitação.

### Continuidade entre agentes

Manter arquivos de acompanhamento:

```text
docs/implementation-plan.md
docs/progress.md
docs/known-issues.md
```

O arquivo `progress.md` deverá registrar:

- Fase atual.
- Funcionalidades concluídas.
- Funcionalidades pendentes.
- Decisões importantes.
- Testes executados.
- Problemas conhecidos.
- Próxima tarefa recomendada.

Antes de iniciar uma nova sessão, o agente deverá ler esses arquivos.

Não confiar exclusivamente no histórico da conversa para recuperar decisões arquiteturais.

---

# 27. Definition of Done

Uma funcionalidade somente poderá ser considerada concluída quando:

- Estiver implementada de ponta a ponta.
- Seguir a arquitetura definida.
- Utilizar componentes reutilizáveis.
- Respeitar o Design System.
- Possuir tratamento de erros.
- Possuir estados de loading e empty quando aplicáveis.
- Possuir testes relevantes.
- Não introduzir erros de TypeScript.
- Não introduzir erros de lint.
- Não causar regressões conhecidas.
- Estiver documentada quando necessário.
- Funcionar em dispositivo Android ou em ambiente equivalente adequado ao tipo de teste.

Não confundir código compilável com funcionalidade concluída.

---

# 28. Resultado esperado

Ao final, entregar um aplicativo Android com:

- Interface escura moderna.
- Design consistente.
- Coleções personalizadas.
- Importação do Internet Archive.
- Downloads offline.
- Player avançado.
- Reprodução em segundo plano.
- Progresso persistente.
- Favoritos.
- Playlists.
- Marcadores.
- Histórico.
- Busca.
- Configurações.
- Importação de arquivos locais.
- Arquitetura extensível para outras fontes.
- Banco SQLite local.
- Código modular.
- Componentes reutilizáveis.
- Testes automatizados.
- Documentação.
- APK instalável.

O aplicativo não deverá depender de backend para suas funcionalidades principais.

---

# 29. Diretriz final

A prioridade deste projeto é:

**Qualidade arquitetural + experiência do usuário + confiabilidade + manutenção a longo prazo.**

Não priorize velocidade de implementação em detrimento da qualidade.

Não crie código macarrônico.

Não crie telas isoladas com estilos inconsistentes.

Não crie implementações excessivamente acopladas.

Não utilize soluções improvisadas quando existir uma abordagem arquitetural adequada.

Ao mesmo tempo, evite overengineering.

O objetivo é criar uma base sólida, profissional e preparada para evolução.

**Comece analisando os requisitos, definindo a arquitetura final e elaborando o plano de implementação. Em seguida, execute as fases sequencialmente, validando cada uma antes de avançar. Não interrompa a implementação após o planejamento, salvo quando houver um impedimento real ou uma decisão essencial que exija intervenção do usuário.** 
