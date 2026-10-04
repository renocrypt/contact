# contact

Benji Peng's contact card at `benji.renocrypt.com`, published from
`renocrypt/contact` through GitHub Pages.

The professional card lives at `benji.appcubic.com` (`benjipeng/benji`). This
site is the experimental counterpart: avant-garde layout and motion, the same
person, and its own set of links.

## Stack

- Vite and TypeScript with no UI framework. `npm run build` type-checks and
  writes static output to `dist/`.
- anime.js v4 for motion.
- `.github/workflows/deploy.yml` deploys `dist/` to Pages on every push to `main`.

## Concept

"Cipher": the card is enciphered and a three-ring cipher wheel (canvas, `src/main.ts`)
sets the key B, E, N. Ring 1 locks on load; scrolling the `.track` turns rings 2
and 3, and each guarded line snaps to plaintext when its ring locks. The
"Scroll to unlock the links" bar between the role and the links runs the same
unlock for visitors who do not scroll, and turns into "Links unlocked" without
changing size.

- Links are grouped GitHub, AI Ventures, Design Systems, Social, Messages;
  every row is icon, name, destination. Icons are hand-drawn inline SVG on one 24-unit, 1.6-stroke pen:
  the shape says where (book = GitHub repo, window = AI venture site, frame =
  design system), the mark inside
  says who (lock or keyhole = Renocrypt, robot eyes = App Automaton). Each has a
  hover gesture in `src/main.ts` (`gestures()`) and they ink in when ring 3 locks.
- Responsive check: the card must fit the viewport, with no horizontal scroll or
  layout shift, at 360x640, 375x600, 390x664, 430x800, 768x1024, 844x390,
  1024x768, 1280x720, and 1920x1080.

- Day palette: violet ink on lilac paper. Night ("UV" toggle): fluorescent ink
  under a UV lamp. The owner rejected the earlier carmine/red palette.
- Type: no Google Fonts. The name is Gambarino (Fontshare, ITF Free Font
  License); everything else is Compagnon (Velvetyne, OFL) in Light, Roman, and
  Light Italic, the italic carrying the ciphertext. Compagnon is subset in
  `public/fonts/` with its license; Light's vertical metrics were normalized to
  match Roman so overlays line up. Do not use Compagnon Medium: its `e` and `k`
  break the 600-unit grid.
- Gambarino may be self-hosted but not modified or redistributed through a
  repository, so `scripts/fetch-fonts.mjs` downloads the official file from
  Fontshare on `predev`/`prebuild` into a gitignored path. Never commit it.
- Portrait: hand-drawn cute anime-style SVG in `public/benji.svg`, inlined into
  the hub by `vite.config.ts` and themed through `--pt-*` variables.

## Rules

- Every word of content and every link is real HTML in `index.html`. JavaScript
  adds motion only. The page must read completely with JavaScript disabled.
- Elements start hidden only under the `.motion` class, which the inline script
  in `index.html` adds when reduced motion is off. It removes the class if the
  module has not started within 2.5 seconds.
- Honor `prefers-reduced-motion` in every new effect.
- Ciphertext lives only in generated content (`.ch::before` per letter, `.name::before`
  for the proportional name) via `attr(data-c) / ""`.
  Never write cipher strings into text nodes; crawlers and screen readers must
  always read the real letters.
- When links or copy change, update the JSON-LD in `index.html`,
  `public/llms.txt`, and `public/sitemap.xml` together.
- Keep `public/CNAME` as `benji.renocrypt.com`.
- Mocubix (`/Users/ac/dev/agents/design/mocubix`, `renocrypt/mocubix`) is
  style inspiration only. Design this site's concept, mechanisms, and
  composition from scratch rather than porting its exhibits.
