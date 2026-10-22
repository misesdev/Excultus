# Capturas de tela da loja

Imagens exibidas na página do Excultus no Zapstore (referenciadas em `zapstore.yaml`).

## Arquivos

| Arquivo | Tela |
|---|---|
| `01-inicio.png` | Início: "Continuar ouvindo", atalhos da biblioteca e coleções |
| `02-colecoes.png` | Coleções |
| `03-player.png` | Player em tela cheia |
| `04-downloads.png` | Downloads, com o uso de armazenamento |

## Especificação

- PNG em retrato, resolução nativa do aparelho (ex.: 1080 × 2400), sem moldura.
- Use conteúdo que possa ser divulgado (ex.: itens de domínio público do Internet Archive),
  sem dados pessoais nem capas de terceiros.

## Como capturar

```bash
adb exec-out screencap -p > store/screenshots/01-inicio.png
```

Depois de adicionar as imagens, descomente a lista `images:` no `zapstore.yaml`.
