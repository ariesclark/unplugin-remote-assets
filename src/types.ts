export interface Options {
  retry?: number
  aliases: Array<{
    regex: RegExp
    replacement: string
  }>
}
