import { about } from './about'
import { analysisErrors } from './analysisErrors'
import { analysisPage } from './analysisPage'
import { camera } from './camera'
import { common } from './common'
import { home } from './home'
import { layout } from './layout'
import { metrics } from './metrics'
import { notFound } from './notFound'
import { privacy } from './privacy'
import { quality } from './quality'
import { results } from './results'
import { upload } from './upload'

/** English is the source of truth: every other language must have exactly these keys. */
export const en = {
  common,
  layout,
  home,
  about,
  privacy,
  notFound,
  metrics,
  quality,
  results,
  analysisErrors,
  camera,
  upload,
  analysisPage,
}
