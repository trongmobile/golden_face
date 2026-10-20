import { Fragment, type ReactNode } from 'react'

export type RichTags = Record<string, (children: ReactNode) => ReactNode>

/**
 * Renders a message that contains simple `<tag>text</tag>` markup, e.g.
 * `"<b>Storage.</b> Nothing is saved."`, by passing each tagged part to `tags[tag]`.
 * Unknown tags are rendered as plain text. Tags may be nested but not self-closing.
 */
export function renderRich(text: string, tags: RichTags): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g
  let last = 0
  let index = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const render = tags[match[1]!]
    const inner = renderRich(match[2]!, tags)
    out.push(<Fragment key={index++}>{render ? render(inner) : inner}</Fragment>)
    last = pattern.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
