import { LANGUAGES } from '@/i18n/translate'
import type { Lang } from '@/i18n/types'

/**
 * Blog posts are markdown files in `content/blog/<lang>/<slug>.md`. Every post exists in every
 * language under the same slug, so `/blog/x` and `/vi/blog/x` are translations of each other and the
 * language switcher can keep the visitor on the same article.
 */

export interface BlogPost {
  slug: string
  lang: Lang
  /** The article heading, also used in the post list. */
  title: string
  /** `<title>` of the page. */
  metaTitle: string
  metaDescription: string
  /** `YYYY-MM-DD`. */
  published: string
  /** The markdown after the front matter. */
  body: string
}

const files = import.meta.glob<string>('/content/blog/*/*.md', { query: '?raw', import: 'default', eager: true })

/** Reads the flat `key: value` lines of a front-matter block. Lists and nested values are authoring notes and are ignored. */
export function parseFrontMatter(source: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return { data: {}, body: source }
  const data: Record<string, string> = {}
  for (const line of match[1]!.split(/\r?\n/)) {
    const pair = /^([a-z_]+):\s*(.+)$/.exec(line)
    if (!pair) continue
    const value = pair[2]!.trim()
    data[pair[1]!] = /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value
  }
  return { data, body: source.slice(match[0].length) }
}

function toPost(path: string, source: string): BlogPost {
  const folder = /\/content\/blog\/([^/]+)\//.exec(path)?.[1]
  const lang = LANGUAGES.find((language) => language.code === folder)?.code
  if (!lang) throw new Error(`${path}: the folder must be a language code`)
  const { data, body } = parseFrontMatter(source)
  const required = ['slug', 'title', 'meta_title', 'meta_description', 'published'] as const
  for (const key of required) {
    if (!data[key]) throw new Error(`${path}: front matter is missing "${key}"`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.published!)) throw new Error(`${path}: "published" must be YYYY-MM-DD`)
  return {
    slug: data.slug!,
    lang,
    title: data.title!,
    metaTitle: data.meta_title!,
    metaDescription: data.meta_description!,
    published: data.published!,
    body,
  }
}

const ALL_POSTS: readonly BlogPost[] = Object.entries(files).map(([path, source]) => toPost(path, source))

/** Slugs of the posts that exist in every language, newest first. A post missing in a language is not published. */
export const BLOG_SLUGS: readonly string[] = [...new Set(ALL_POSTS.map((post) => post.slug))]
  .filter((slug) => LANGUAGES.every((language) => ALL_POSTS.some((post) => post.slug === slug && post.lang === language.code)))
  .sort((a, b) => {
    const date = (slug: string) => ALL_POSTS.find((post) => post.slug === slug)!.published
    return date(b).localeCompare(date(a)) || a.localeCompare(b)
  })

export function getPost(lang: Lang, slug: string): BlogPost | undefined {
  return BLOG_SLUGS.includes(slug) ? ALL_POSTS.find((post) => post.slug === slug && post.lang === lang) : undefined
}

/** All published posts in `lang`, newest first. */
export function listPosts(lang: Lang): BlogPost[] {
  return BLOG_SLUGS.map((slug) => getPost(lang, slug)!)
}
