import type { Dict } from '../../types'
import { about } from './about'
import { analysisErrors } from './analysisErrors'
import { analysisPage } from './analysisPage'
import { blog } from './blog'
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

export const vi: Dict = {
  common,
  layout,
  home,
  about,
  blog,
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
