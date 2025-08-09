export interface Options {
  retry?: number
  cache?: boolean | {
    location: string
    /**
     * The maximum age of the cache in seconds.
     * If not specified, defaults to 7 days (604800 seconds).
     */
    maxAge?: number
  }
  aliases: Array<{
    regex: RegExp
    replacement: string
  }>
}
