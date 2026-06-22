# Scroll Dog

Scroll Dog is a browser extension for Chrome and Safari. It places a pixel dog on selected endless feed sites and stores local session scroll totals in browser storage.

## What this is

This is the source for the Scroll Dog browser extension and the small download page. Chrome can load this folder directly. Safari conversion is prepared through the local helper script, but the final Safari app archive requires Xcode because Apple signs Safari extensions through an Xcode container app.

## Verify

Run:

```sh
node tools/validate_extension.mjs
```

Expected result:

```text
ALL CHECKS PASSED
```

## Chrome Install

1. Open Chrome extensions.
2. Turn on developer mode.
3. Choose load unpacked.
4. Select this folder.
5. Visit a supported feed site and scroll.

## Safari Build

Run:

```sh
tools/convert_safari.sh
```

The helper validates the source, stages a clean browser extension folder at `Build/WebExtension`, then asks Apple tooling to create the Safari app project.

If the script says Xcode is required, install Xcode from the App Store, open it once, accept the license, make Xcode the active developer directory, then run the script again.

## Manual QA

1. Build and run the generated Scroll Dog app in Xcode.
2. Open Safari settings and allow Scroll Dog.
3. Visit Reddit, YouTube, LinkedIn, Instagram, TikTok, Facebook, or X.
4. Scroll until the dog appears.
5. Keep scrolling until the worried, sad, and crying states appear.
6. Open the toolbar popup and confirm site totals update.
7. Reset stats and confirm the empty state returns.

## Store Submission

1. Archive the app in Xcode.
2. Validate the archive.
3. Upload the archive to App Store Connect.
4. Complete the privacy answers as local storage only.
