import { useParams } from 'react-router-dom'
import { Markdown } from '@/blog/Markdown'
import { getPost, type BlogPost } from '@/blog/posts'
import { Link, useI18n } from '@/i18n'
import { formatDate } from '@/utils/format'
import { usePageMeta } from '@/utils/usePageMeta'
import { NotFoundPage } from './NotFound'

function Article({ post }: { post: BlogPost }) {
  const { t, lang } = useI18n()
  usePageMeta(post.metaTitle, post.metaDescription)

  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <p className="mb-6 text-sm">
        <Link to="/blog" className="font-medium text-accent-700 underline underline-offset-2 hover:text-ink">
          ← {t('blog.allArticles')}
        </Link>
      </p>
      <p className="mb-4 text-xs text-muted">
        <time dateTime={post.published}>{t('blog.published', { date: formatDate(post.published, lang) })}</time>
      </p>
      <Markdown>{post.body}</Markdown>
    </article>
  )
}

export function BlogPostPage() {
  const { lang } = useI18n()
  const { slug } = useParams()
  const post = slug ? getPost(lang, slug) : undefined
  return post ? <Article post={post} /> : <NotFoundPage />
}
