declare type IPolyglotOptions = {
  phrases: Record<string, string>
  locale?: string
}

declare class Polyglot {
  constructor (options: IPolyglotOptions)
  t (key: string, options?: Record<string, unknown>): string
}

export = Polyglot
export = IPolyglotOptions
