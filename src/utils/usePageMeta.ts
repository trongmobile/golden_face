import { useEffect } from 'react'

/** Keeps the document title and meta description in sync with the current route. */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title
    if (description) {
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description)
    }
  }, [title, description])
}
