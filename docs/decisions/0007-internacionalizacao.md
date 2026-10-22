# ADR 0007 — Internacionalização (inglês e português)

- **Status**: aceito · **Data**: 2026-10-21

## Contexto
O app nasceu só em pt-BR, mas é distribuído no Zapstore para um público internacional. Precisa
de inglês e português, seguindo o idioma do aparelho, com inglês como padrão.

## Decisão
- i18n próprio em `src/core/i18n`, sem dependências: catálogos `en` (fonte da verdade) e `pt`
  tipado como `Messages`, então uma chave faltando em `pt` quebra o `tsc`. `t(key, params)`
  faz interpolação `{{nome}}` e plural (`{ one, other }` escolhido por `params.count`).
- `t` lê o idioma atual no momento da chamada, então funciona em todas as camadas (mensagens
  de erro, provedores, use cases). Componentes chamam `useTranslation()` (`@design-system`,
  via `useSyncExternalStore`) para re-renderizar quando o idioma muda.
- Idioma do aparelho: `I18nManager.getConstants().localeIdentifier` (Android, ex. `pt_BR`),
  com `Intl` como reserva. `resolveLocale` usa só o idioma (`pt_PT` → `pt`) e cai em inglês
  quando não é suportado. É aplicado em `index.js`, antes da primeira tela.
- Preferência em Ajustes → Idioma (`general.language`: `system`, `en` ou `pt`), persistida com
  os demais ajustes; o container aplica o idioma ao carregar e a cada mudança.
- Números e datas acompanham o idioma (`formatDecimal`, `formatShortDate`, datas relativas).
- Os testes Jest existentes rodam em pt-BR (`test/setup/jest.setup.js`); os de i18n cobrem o
  inglês, a paridade de chaves e placeholders entre catálogos e a troca de idioma na interface.

## Consequências
- Textos novos na interface entram nos dois catálogos (`src/core/i18n/locales`).
- Nomes de itens salvos no banco (ex.: "Arquivos do dispositivo") ficam no idioma do momento da
  importação.
- Um novo idioma = novo catálogo tipado como `Messages` + entrada em `SUPPORTED_LOCALES`.
