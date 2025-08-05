/* eslint-disable no-console */
import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mime from 'mime'

import { digest } from 'ohash'
import { createUnplugin } from 'unplugin'

import { name } from '../package.json'

const cache = new Map<string, Promise<string>>()

async function download(url: URL): Promise<string> {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`Asset \"${url}\" threw an error: ${response.status} ${response.statusText}`, { cause: response })

  const contentType = response.headers.get('content-type')
  const extension = mime.getExtension(contentType || 'application/octet-stream')

  // url.pathname = url.pathname.replace(/\.[^/.]+$/, '') + (extension ? `.${extension}` : '')

  const filename = `${digest(url.href.replace(url.origin, ''))}.${extension || 'bin'}`
  const pathname = path.resolve('node_modules', '.cache', name, digest(url.origin), filename)

  await mkdir(path.dirname(pathname), { recursive: true })
  await writeFile(pathname, Buffer.from(await response.arrayBuffer()))

  return pathname
}

function resolveAliases(data: string, aliases: Options['aliases']): URL {
  try {
    return new URL(data)
  }
  catch (reason) {
    for (const { regex, replacement } of aliases) {
      const match = data.match(regex)
      if (!match)
        continue

      const value = data.replace(regex, replacement)
      try {
        return new URL(value)
      }
      catch (reason) {
        throw new Error(`Asset \"${data}\" matched \"${regex}\" but was not valid: ${value}`, { cause: reason })
      }
    }

    throw new Error(`Asset failed to resolve: ${data}`, { cause: reason })
  }
}

export const unpluginFactory: UnpluginFactory<Options> = ({ retry: maximumRetryCount = 3, aliases }) => ({
  name,
  async buildEnd() {
    if (cache.size === 0)
      return

    for (const [url] of cache)
      console.log('✓', url)

    cache.clear()
  },
  async resolveId(id: string) {
    const [, data] = /^virtual:remote\/(.+)$/.exec(id) || []
    if (!data)
      return null

    const url = resolveAliases(data, aliases)
    if (cache.has(url.href))
      return await cache.get(url.href)!

    const { promise, resolve } = Promise.withResolvers<string>()
    cache.set(url.href, promise)

    let attempts = 0
    while (attempts < maximumRetryCount) {
      attempts++

      try {
        const pathname = await download(url)
        resolve(pathname)

        return pathname
      }
      catch (reason) {
        if (attempts >= maximumRetryCount)
          throw new Error(`Asset \"${url}\" failed to resolve after ${maximumRetryCount} attempts`, { cause: reason })
      }
    }
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
