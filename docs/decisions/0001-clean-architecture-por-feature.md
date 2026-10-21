# ADR 0001 — Clean Architecture modular por feature, com fronteiras verificadas

- **Status**: aceito · **Data**: 2026-10-21

## Contexto
O app precisa crescer (novas fontes, temas, features) sem que regras de negócio vazem para telas.

## Decisão
Camadas domain → application → infrastructure/presentation por feature, composition root único
(`createContainer`) e API pública por feature (`@features/x` e `@features/x/presentation`).
Fronteiras impostas por `no-restricted-imports` no ESLint. Casos de uso simples são factories de
funções (`create<X>UseCases`); serviços com estado (`PlayerController`, `DownloadManager`) são classes.

## Consequências
+ Testes de integração usam o container real trocando só portas nativas.
+ Violações de camada falham no lint/CI.
− Mais arquivos que um app "rápido"; features `library` e `home` (só apresentação) foram necessárias
  para evitar ciclos entre apresentações.
