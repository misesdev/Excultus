# Publicação no Zapstore

O Excultus é publicado no [Zapstore](https://zapstore.dev), uma loja de apps Android
descentralizada construída sobre o Nostr. A publicação usa o
[`zsp`](https://github.com/zapstore/zsp) (sucessor do antigo `zapstore-cli`) e a
configuração em [`zapstore.yaml`](../zapstore.yaml).

## Como funciona

O `zsp` publica três eventos Nostr assinados com a sua chave (`nsec`):

| Evento | Kind | Conteúdo |
|---|---|---|
| App | 32267 | nome, resumo, descrição, ícone, capturas, licença, tags |
| Release | 30063 | versão e notas (seção da versão no [`CHANGELOG.md`](../CHANGELOG.md)) |
| Asset | 3063 | URL do APK, SHA-256, tamanho, hash do certificado de assinatura |

O APK vem do **GitHub Release mais recente** do repositório. Quem instala pelo Zapstore
confere a integridade pelo SHA-256 e pelo certificado gravados nos eventos. Por isso
**toda versão precisa ser assinada com a mesma chave de release**.

## Fluxo automático (GitHub Actions)

O workflow [`release.yml`](../.github/workflows/release.yml) roda a cada push na `main`:

1. lê a versão do `package.json` e confere se é igual ao `versionName` do
   `android/app/build.gradle`;
2. se a tag `v<versão>` já existe, não faz nada (pushes comuns não geram release);
3. confere se o `CHANGELOG.md` tem a seção da versão;
4. gera o APK assinado e confere se o certificado é o de release (nunca publica um APK
   assinado com a chave de debug);
5. cria o GitHub Release `v<versão>` com o APK e as notas;
6. publica no Zapstore com `zsp publish` (só se o secret `SIGN_WITH` existir).

O workflow [`ci.yml`](../.github/workflows/ci.yml) roda `npm run validate` em pushes e PRs.

## Configuração inicial (uma vez)

### 1. Chave Nostr

Use a `nsec` da sua identidade Nostr (Primal, Damus, Amethyst…); o app fica associado a
esse perfil. Para gerar uma nova: `nak key generate`
([nak](https://github.com/fiatjaf/nak)). Guarde a `nsec` em segredo.

### 2. Secrets do GitHub

Em **GitHub → Settings → Environments → `Prod` → Environment secrets**:

| Secret | Valor |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w 0 ~/.android/excultus-release.jks` |
| `KEYSTORE_PASSWORD` | senha do keystore (`EXCULTUS_RELEASE_STORE_PASSWORD`) |
| `KEY_ALIAS` | `excultus` |
| `KEY_PASSWORD` | senha da chave (`EXCULTUS_RELEASE_KEY_PASSWORD`) |
| `SIGN_WITH` | sua `nsec1...` (ou uma URL `bunker://...` de assinatura remota, mais segura) |

As senhas estão em `~/.gradle/gradle.properties`. Copie o resultado do `base64` direto para
o GitHub; não salve esse texto em nenhum arquivo do projeto.

### 3. Vincular a chave de assinatura à identidade Nostr

Prova que quem assina o APK é o mesmo dono do perfil Nostr. O Zapstore exibe essa
verificação aos usuários. Rode uma vez (e renove antes de expirar; o padrão é 1 ano):

```bash
zsp identity --link-key ~/.android/excultus-release.jks --key-alias excultus
```

O `zsp` pede a senha do keystore e usa o `SIGN_WITH` do ambiente ou do `.env`.

### 4. Capturas de tela

Adicione as imagens em `store/screenshots/` (veja o README da pasta) e descomente
`images:` no `zapstore.yaml`.

## Publicar uma nova versão

```bash
# 1. Suba a versão: package.json ("version") e android/app/build.gradle
#    (versionCode +1 e versionName igual ao package.json)
# 2. Adicione a seção "## [x.y.z] - AAAA-MM-DD" no CHANGELOG.md
# 3. Commit e push na main
git commit -am "Versão x.y.z"
git push
```

## Publicação manual (sem CI)

Instale o `zsp` (Linux amd64; outras plataformas na
[página de releases](https://github.com/zapstore/zsp/releases)):

```bash
ZSP_VERSION=0.4.17
curl -fsSL -o zsp \
  "https://github.com/zapstore/zsp/releases/download/v${ZSP_VERSION}/zsp-${ZSP_VERSION}-linux-amd64"
chmod +x zsp && sudo mv zsp /usr/local/bin/zsp
```

Crie o `.env` a partir do [`.env.example`](../.env.example) (o `.env` é ignorado pelo git) e,
com o GitHub Release da versão já criado:

```bash
npm run zapstore:check     # confere se o zsp encontra o APK arm64 no GitHub Release
npm run zapstore:publish   # publica (mostra uma prévia e pede confirmação)
```

## Página do app

Depois de publicado, o app aparece em `https://zapstore.dev/app/com.excultus` e na busca
do app Zapstore por "Excultus".
