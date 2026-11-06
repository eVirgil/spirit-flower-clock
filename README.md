# Spirit Flower Clock

A living Flower of Life clock that redraws sacred geometry each minute, using time-of-day color palettes in React and SVG.

Spirit Flower Clock is an experimental visual timepiece built with React, TypeScript, Vite, SVG, and Framer Motion. It draws the Flower of Life over a timed cycle, uses time-of-day palettes by default (with optional minute-by-minute palette cycling), and settles into a glowing animated state before the next redraw begins.

## Features

* Animated Flower of Life clock
* One-minute redraw cycle
* Day-phase palette selection by default; optional per-cycle, hourly, weekday, or fixed colors
* SVG-based sacred geometry
* Framer Motion animation
* Responsive visual layout
* Ambient, non-invasive UI
* Built as a lightweight static web app

## Tech Stack

* React
* TypeScript
* Vite
* SVG
* Framer Motion

## Getting Started

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

This project can be deployed as a static site using GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static hosting provider.

For GitHub Pages, the production build output is generated in:

```txt
dist/
```

## Support the Project

Spirit Flower Clock is a small experimental visual timepiece exploring sacred geometry, generative art, ambient UI, and spiritual-tech.

If you enjoy this project or want to support more open-source creative experiments, sponsorship helps fund continued work and future releases.

[Sponsor Eric Virgil](https://github.com/sponsors/eVirgil)

## Development checks

```bash
npm run lint
npm test
npm run build
```

## License

MIT. See the [LICENSE](LICENSE) file.

## Performance notes

The decorative starfield, minute ticks, and intersection-node animations are memoized independently of the clock's progress updates. Their rendering changes only when their visual inputs change (palette, current second, theme, geometry, or mode), while Framer Motion keeps their existing animations running between React updates. The clock's scheduling loop is fully suspended in hidden tabs when `pauseWhenHidden` is enabled and resumes on visibility changes.

The default visual settings are unchanged. Before merging performance changes, manually check a full minute cycle and try Dev Mode's background, palette, performance, and reduced-motion choices. No browser automation or screenshot-baseline infrastructure is required for this pass.
