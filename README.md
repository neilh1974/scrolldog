# Scroll Dog

A small dog that lives at the bottom of your endless feeds. The more you scroll, the more worried he gets.

Works on Reddit, YouTube, LinkedIn, Instagram, TikTok, Facebook, and X. Scroll totals are tracked per site in local browser storage and never leave your machine.

## Install (Chrome)

Open chrome://extensions, turn on developer mode, hit load unpacked, and pick this folder. Scroll a feed for a while and the dog shows up. Keep going and he cycles through worried, sad, and crying. The toolbar popup shows totals per site and has a reset button.

After updating the source files, click Reload on the Scroll Dog extension card before refreshing your feed.

## Safari

Run tools/convert_safari.sh. It validates the source, stages a clean extension folder, and generates the Xcode project. Apple requires Safari extensions to ship inside a signed container app, so the final build needs Xcode installed. To check the extension source on its own, run node tools/validate_extension.mjs.

## Why

I wanted to see how much I actually scroll. The answer was upsetting, hence the dog.
