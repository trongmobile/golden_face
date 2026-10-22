import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { listPosts } from '@/blog/posts'
import { Link, useI18n } from '@/i18n'
import { formatDate } from '@/utils/format'
import { usePageMeta } from '@/utils/usePageMeta'

export function BlogPage() {
  const { t, lang } = useI18n()
  usePageMeta(t('blog.metaTitle'), t('blog.metaDescription'))
  const posts = listPosts(lang)

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t('blog.heading.eyebrow')}
        title={t('blog.heading.title')}
        description={t('blog.heading.description')}
      />
      {posts.length === 0 ? (
        <p className="mt-12 text-muted">{t('blog.empty')}</p>
      ) : (
        <ul aria-label={t('blog.postsLabel')} className="mt-12 grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Card className="flex h-full flex-col">
                <p className="text-xs text-muted">{t('blog.published', { date: formatDate(post.published, lang) })}</p>
                <h2 className="mt-2 font-display text-2xl leading-snug font-medium text-ink">
                  <Link to={`/blog/${post.slug}`} className="hover:text-accent-700">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{post.metaDescription}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="mt-5 text-sm font-semibold text-accent-700 underline underline-offset-2 hover:text-ink"
                >
                  {t('blog.readArticle')}
                  <span className="sr-only">: {post.title}</span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
