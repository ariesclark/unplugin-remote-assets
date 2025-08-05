import type { Options } from './types'

import unplugin from '.'
import { name } from '../package.json'

export default (options: Options): any => ({
  name,
  hooks: {
    'astro:config:setup': async (astro: any) => {
      astro.config.vite.plugins ||= []
      astro.config.vite.plugins.push(unplugin.vite(options))
    },
  },
})
