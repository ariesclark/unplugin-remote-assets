# unplugin-remote-assets
Bundle remote assets like images, fonts, and more.

[![NPM version](https://img.shields.io/npm/v/unplugin-remote-assets?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-remote-assets)

## Install

```bash
pnpm i unplugin-remote-assets
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import remoteAssets from 'unplugin-remote-assets/vite'

export default defineConfig({
  plugins: [
    remoteAssets({ /* options */ }),
  ],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import remoteAssets from 'unplugin-remote-assets/rollup'

export default {
  plugins: [
    remoteAssets({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-remote-assets/webpack')({ /* options */ })
  ]
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.js
export default defineNuxtConfig({
  modules: [
    ['unplugin-remote-assets/nuxt', { /* options */ }],
  ],
})
```

> This module works for both Nuxt 2 and [Nuxt Vite](https://github.com/nuxt/vite)

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-remote-assets/webpack')({ /* options */ }),
    ],
  },
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import remoteAssets from 'unplugin-remote-assets/esbuild'

build({
  plugins: [remoteAssets()],
})
```

<br></details>

## Usage
```ts
// vite.config.js
import remoteAssets from 'unplugin-remote-assets/vite'
import { imagetools } from 'vite-imagetools'

export default defineConfig({
  plugins: [
    remoteAssets({
      // will only match non-valid URLs.
      aliases: [
        {
          regex: /^(.+)/,
          replacement: 'https://files.aries.fyi/$1'
        }
      ]
    }),
    // unplugin-remote-assets makes no assumptions about content,
    // and can be paired with other plugins, ie: an optimizer.
    imagetools({
      defaultDirectives: () =>
        new URLSearchParams({
          quality: '90',
          effort: 'max',
          format: 'webp'
        })
    }),
  ],
})
```

```ts
// was a png, but converted at build time to a webp via imagetools.
import WebpImage from 'virtual:remote/2025/08/09/7ff1371c7f1556a4.png'

// any search parameters are passed through.
import AvifImage from 'virtual:remote/2025/08/09/7ff1371c7f1556a4.png?format=avif'

// without alias, equivalent to above.
import Image from 'virtual:remote/https://files.aries.fyi/2025/08/09/7ff1371c7f1556a4.png'
```
