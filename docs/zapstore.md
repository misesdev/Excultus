# Publishing on Zapstore

Excultus is published on [Zapstore](https://zapstore.dev), a decentralized Android app store
built on Nostr. Publishing uses [`zsp`](https://github.com/zapstore/zsp) (the successor of the
old `zapstore-cli`) and the configuration in [`zapstore.yaml`](../zapstore.yaml).

## How it works

`zsp` publishes three Nostr events signed with your key (`nsec`):

| Event | Kind | Content |
|---|---|---|
| App | 32267 | name, summary, description, icon, screenshots, license, tags |
| Release | 30063 | version and notes (the version's section in [`CHANGELOG.md`](../CHANGELOG.md)) |
| Asset | 3063 | APK URL, SHA-256, size, signing certificate hash |

The APK comes from the repository's **latest GitHub Release**. People installing from Zapstore
verify its integrity through the SHA-256 and the certificate recorded in the events, so
**every version must be signed with the same release key**.

## Automated flow (GitHub Actions)

The [`release.yml`](../.github/workflows/release.yml) workflow runs on every push to `main`:

1. reads the version from `package.json` and checks that it matches `versionName` in
   `android/app/build.gradle`;
2. if the `v<version>` tag already exists, it does nothing (regular pushes don't create
   releases);
3. checks that `CHANGELOG.md` has a section for the version;
4. builds the signed APK and checks that it carries the release certificate (it never
   publishes an APK signed with the debug key);
5. creates the GitHub Release `v<version>` with the APK and the notes;
6. publishes to Zapstore with `zsp publish` (only if the `SIGN_WITH` secret is set).

The [`ci.yml`](../.github/workflows/ci.yml) workflow runs `npm run validate` on pushes and PRs.

## One-time setup

### 1. Nostr key

Use the `nsec` of your Nostr identity (Primal, Damus, Amethyst…); the app is tied to that
profile. To generate a new one: `nak key generate` ([nak](https://github.com/fiatjaf/nak)).
Keep the `nsec` secret.

### 2. GitHub secrets

Under **GitHub → Settings → Environments → `Prod` → Environment secrets**:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w 0 ~/.android/excultus-release.jks` |
| `KEYSTORE_PASSWORD` | keystore password (`EXCULTUS_RELEASE_STORE_PASSWORD`) |
| `KEY_ALIAS` | `excultus` |
| `KEY_PASSWORD` | key password (`EXCULTUS_RELEASE_KEY_PASSWORD`) |
| `SIGN_WITH` | your `nsec1...` (or a `bunker://...` remote-signing URL, which is safer) |

The passwords are in `~/.gradle/gradle.properties`. To copy a value without printing it, pipe
it to the clipboard, e.g.
`base64 -w 0 ~/.android/excultus-release.jks | xclip -selection clipboard`. Never save these
values in any project file.

### 3. Link the signing key to your Nostr identity

This proves that whoever signs the APK also owns the Nostr profile; Zapstore shows this
verification to users. Run it once (and renew before it expires; the default is 1 year):

```bash
zsp identity --link-key ~/.android/excultus-release.jks --key-alias excultus
```

`zsp` asks for the keystore password and uses `SIGN_WITH` from the environment or `.env`.

### 4. Screenshots

They live in `store/screenshots/` (see the folder's README) and are listed under `images:` in
`zapstore.yaml`.

## Publishing a new version

```bash
# 1. Bump the version: package.json ("version") and android/app/build.gradle
#    (versionCode +1 and versionName equal to package.json)
# 2. Add a "## [x.y.z] - YYYY-MM-DD" section to CHANGELOG.md
# 3. Commit and push to main
git commit -am "Version x.y.z"
git push
```

Changes to the listing alone (description, screenshots) are published with the next version,
or right away with a manual publish (below).

## Manual publish (without CI)

Install `zsp` (Linux amd64; other platforms on the
[releases page](https://github.com/zapstore/zsp/releases)):

```bash
ZSP_VERSION=0.4.17
curl -fsSL -o zsp \
  "https://github.com/zapstore/zsp/releases/download/v${ZSP_VERSION}/zsp-${ZSP_VERSION}-linux-amd64"
chmod +x zsp && sudo mv zsp /usr/local/bin/zsp
```

Create `.env` from [`.env.example`](../.env.example) (`.env` is ignored by git) and, once the
version's GitHub Release exists:

```bash
npm run zapstore:check     # checks that zsp finds the arm64 APK in the GitHub Release
npm run zapstore:publish   # publishes (shows a preview and asks for confirmation)
```

## App page

Once published, the app is at `https://zapstore.dev/app/com.excultus` and shows up when
searching for "Excultus" in the Zapstore app.
