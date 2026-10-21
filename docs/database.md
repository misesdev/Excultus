# Banco de dados (SQLite)

Driver: **op-sqlite** (JSI, consultas fora da thread de UI), com FTS5 habilitado em
`package.json > "op-sqlite": { "fts5": true }`. Nos testes, o mesmo SQL roda no `node:sqlite`.

## Acesso

- `SqlDriver` (op-sqlite / node:sqlite) → `SerializedDatabase`: fila FIFO que serializa
  statements e transações na conexão única (evita que comandos externos caiam dentro de uma
  transação aberta) e converte falhas em `DatabaseError`.
- Repositórios tipados recebem um `SqlExecutor`; operações multi-statement usam
  `inTransaction` (junta-se à transação externa quando dentro de uma unit of work).
- `SqliteUnitOfWork` cria repositórios ligados à transação (ex.: importação atômica).
- Mappers explícitos (`mappers/`, `rowReaders.ts`) convertem linhas em entidades; tipos de linha
  nunca vazam para o domínio.
- **Nunca** `INSERT OR REPLACE`: REPLACE apaga a linha e dispara cascatas. Usar `ON CONFLICT DO UPDATE`.

## Migrações

`migrations/migrations.ts` (append-only). `runMigrations` aplica as pendentes, cada uma em
transação, gravando `PRAGMA user_version` junto. Banco mais novo que o app → erro explícito.
`PRAGMA foreign_keys = ON` é ativado **e verificado** na abertura.

## Esquema (v1)

| Tabela | Chave | Observações |
|---|---|---|
| `collections` | `id` | `sort_mode` (custom/title/addedAt/duration), CHECK nome não vazio |
| `audios` | `id` | `UNIQUE(source_type, source_id)` (deduplicação), CHECKs de duração/tamanho/origem |
| `collection_audios` | `(collection_id, audio_id)` | `position` (ordem personalizada), FKs CASCADE |
| `playlists`, `playlist_audios` | idem | |
| `playback_progress` | `audio_id` | posição, duração, concluído, última reprodução |
| `downloads` | `id`, `UNIQUE(audio_id)` | estado, bytes, MD5 esperado, caminhos temp/final; CHECK `completed ⇒ local_path` |
| `bookmarks` | `id` | posição, título, nota |
| `favorites` | `audio_id` | |
| `playback_history` | `id` autoincrement | entradas consecutivas do mesmo áudio (< 30 min) são mescladas |
| `settings` | `key` | JSON (ajustes e sessão do player) |
| `audios_fts` | FTS5 | título/artista/álbum/descrição, `unicode61 remove_diacritics 2`, mantido por triggers |

Índices cobrem ordenações e filtros usados (título NOCASE, created_at, duration, posição,
status de download, last_played_at, played_at).

## Busca

Termos do usuário são reduzidos a palavras (operadores FTS removidos) e viram prefixos entre
aspas (`"aula"* "filo"*`). A busca também casa nome de coleção e origem (`LIKE` com escape).
Paginação por `LIMIT/OFFSET` (`usePaginatedQuery` carrega 40 por vez). Testado com 1.500 áudios.
