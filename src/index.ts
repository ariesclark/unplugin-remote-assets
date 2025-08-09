/* eslint-disable no-console */
import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mime from 'mime'

import { digest } from 'ohash'
import { createUnplugin } from 'unplugin'

import { name as packageName } from '../package.json'

const sevenDaysInSeconds = 604800

interface Download { pathname: string, expires: Date }

export const unpluginFactory: UnpluginFactory<Options> = ({ cache = true, retry: maximumRetryCount = 3, aliases }) => {
  let resolvedAssets: Map<string, Download | Promise<Download>> = new Map()
  const useCache = !!cache

  const cacheDirectory = (cache && typeof cache === 'object' && 'location' in cache)
    ? cache.location
    : path.resolve('node_modules', '.cache', packageName)
  const cacheMaxAge = (((cache && typeof cache === 'object' && 'maxAge' in cache)
    ? (cache.maxAge)
    : sevenDaysInSeconds) || sevenDaysInSeconds) * 1000
  const cacheIndex = path.resolve(cacheDirectory, 'index.json')

  async function restoreCache(): Promise<void> {
    try {
      const content = await readFile(cacheIndex, 'utf-8').catch(() => '{}')
      const data = JSON.parse(content)

      resolvedAssets = new Map(Object.entries(data))
    }
    catch (reason) {
      console.warn(new Error(`Could not restore cache`, { cause: reason }))
    }
  }

  async function writeCache(): Promise<void> {
    await mkdir(path.dirname(cacheIndex), { recursive: true })

    const content = Object.fromEntries(await Promise.all(
      resolvedAssets
        .entries()
        .map(async ([key, promiseValue]) => {
          const value = await promiseValue
          resolvedAssets.set(key, value)

          return [key, value] as const
        }),
    ))

    await writeFile(cacheIndex, JSON.stringify(content))
  }

  async function downloadAsset(url: URL): Promise<Download> {
    console.log(`↓ ${url}`)

    const response = await fetch(url)
    if (!response.ok)
      throw new Error(`Asset \"${url}\" threw an error: ${response.status} ${response.statusText}`, { cause: response })

    const contentType = response.headers.get('content-type')
    const extension = mime.getExtension(contentType || 'application/octet-stream')

    const filename = `${digest(url.href)}.${extension || 'bin'}`
    const pathname = path.resolve(cacheDirectory, filename)

    await mkdir(path.dirname(pathname), { recursive: true })
    await writeFile(pathname, Buffer.from(await response.arrayBuffer()))

    const cacheControl = response.headers.get('cache-control')
    let expires = new Date(Date.now() + cacheMaxAge)
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        const maxAge = Number.parseInt(maxAgeMatch[1], 10)
        expires = new Date(Date.now() + maxAge * 1000)
      }
    }

    return { pathname, expires }
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
          throw new Error(`Asset \"${data}\" matched \"${regex}\" but was transformed into an unresolvable URL: ${value}`, { cause: reason })
        }
      }

      throw new Error(`Asset failed to resolve: ${data}`, { cause: reason })
    }
  }

  return {
    name: packageName,
    async buildStart() {
      if (useCache)
        await restoreCache()
    },
    async writeBundle() {
      if (useCache)
        await writeCache()
    },
    async resolveId(id: string) {
      const [, data] = /^virtual:remote\/(.+)$/.exec(id) || []
      if (!data)
        return null

      const url = resolveAliases(data, aliases)

      const cachedAsset = await resolvedAssets.get(url.href)
      if (cachedAsset && typeof cachedAsset?.pathname === 'string')
        return `${cachedAsset.pathname}${url.search}`

      const { promise, resolve } = Promise.withResolvers<Download>()
      resolvedAssets.set(url.href, promise)

      let attempts = 0
      while (attempts < maximumRetryCount) {
        attempts++

        try {
          const download = await downloadAsset(url)

          resolve(download)
          resolvedAssets.set(url.href, download)

          return `${download.pathname}${url.search}`
        }
        catch (reason) {
          if (attempts >= maximumRetryCount)
            throw new Error(`Asset \"${url}\" failed to resolve after ${maximumRetryCount} attempts`, { cause: reason })
        }
      }
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
