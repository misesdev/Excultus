# ADR 0002 — SQLite com op-sqlite, FTS5 e fila serializada

- **Status**: aceito · **Data**: 2026-10-21

## Decisão
op-sqlite (JSI, nova arquitetura, FTS5 opcional) como driver; wrapper `SerializedDatabase` que
serializa statements/transações na conexão única; migrações versionadas via `PRAGMA user_version`;
FTS5 com conteúdo próprio indexado por `audio_id` (rowid implícito pode mudar após VACUUM).
Testes executam o mesmo SQL no `node:sqlite`.

## Alternativas
WatermelonDB/Realm (camada extra de ORM, menos controle de SQL); expo-sqlite (proibido: sem Expo).

## Consequências
+ Integridade referencial e constraints no banco; busca acentuação-insensível rápida.
− Escritas são serializadas (aceitável: SQLite já serializa numa conexão).
