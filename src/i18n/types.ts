import type { en } from './locales/en'

export type Lang = 'en' | 'vi'

/**
 * Values substituted for `{name}` placeholders in a message. A `Msg` (or a list of them, joined
 * with ", ") is translated first, so a message can embed other messages and still follow the
 * language when it changes.
 */
export type Params = Record<string, string | number | Msg | readonly Msg[]>

/** The shape of every dictionary. `en` is the source of truth; other languages must match it. */
export type Dict = typeof en

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`

type Leaves<T, P extends string = '', Leaf = string> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? Join<P, K>
    : T[K] extends readonly string[]
      ? never
      : T[K] extends object
        ? Leaves<T[K], Join<P, K>, Leaf>
        : never
}[keyof T & string]

type ListLeaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? Join<P, K>
    : T[K] extends string
      ? never
      : T[K] extends object
        ? ListLeaves<T[K], Join<P, K>>
        : never
}[keyof T & string]

/** Dotted path to a string message, e.g. `home.hero.title`. */
export type MsgKey = Leaves<Dict>

/** Dotted path to a list of strings. */
export type ListKey = ListLeaves<Dict>

/**
 * A language-independent message: analysis code returns these instead of English text,
 * and the UI turns them into the visitor's language when it renders.
 */
export interface Msg {
  key: MsgKey
  params?: Params
}

/** The shape of `t` from `useI18n()`, for code that receives a translator as an argument. */
export type Translate = (input: MsgKey | Msg, params?: Params) => string
