# Store screenshots

Images shown on the Excultus page on Zapstore (listed in `zapstore.yaml`) and in the
project README.

## Files

| File | Screen |
|---|---|
| `01-home.jpg` | Home: continue listening, library shortcuts and mini player |
| `02-collections.jpg` | Collections |
| `03-player.jpg` | Full-screen player |
| `04-downloads.jpg` | Downloads, with storage usage |

## Specs

- Portrait JPG or PNG at the device's native resolution (e.g. 1080 × 2340), no device frame.
- Only show content that can be published (e.g. public-domain Internet Archive items), with no
  personal data.

## Capturing

```bash
adb exec-out screencap -p > store/screenshots/01-home.png
```

When adding, renaming or removing a screenshot, update the `images:` list in `zapstore.yaml`
and the screenshot gallery in the README.
