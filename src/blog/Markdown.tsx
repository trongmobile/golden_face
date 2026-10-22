import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from '@/i18n'

/**
 * Renders a blog post. Raw HTML in the markdown is not interpreted. Links that start with `/` go through
 * the router, so they keep the visitor's language and the site's base path; anything else opens as a normal link.
 */
const components: Components = {
  h1: ({ children }) => <h1 className="font-display text-4xl leading-tight font-medium text-ink sm:text-5xl">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-14 font-display text-3xl font-medium text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 font-display text-xl font-medium text-ink">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-relaxed text-muted">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-muted marker:text-accent-700">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 leading-relaxed text-muted marker:text-accent-700">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-xl border border-accent-200 bg-accent-50 px-5 py-3 font-display text-lg text-ink [&>p]:mt-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-line" />,
  a: ({ href, children }) =>
    href?.startsWith('/') && !href.startsWith('//') ? (
      <Link to={href} className="font-medium text-accent-700 underline underline-offset-2 hover:text-ink">
        {children}
      </Link>
    ) : (
      <a href={href} className="font-medium text-accent-700 underline underline-offset-2 hover:text-ink" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-card border border-line bg-paper" tabIndex={0}>
      <table className="w-full min-w-[28rem] text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-line bg-mist text-xs text-muted">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-line align-top">{children}</tbody>,
  th: ({ children }) => <th className="px-4 py-3 font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 text-muted">{children}</td>,
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}
