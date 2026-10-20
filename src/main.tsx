import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces/wght.css'
import './index.css'
import { App } from './App'
import { startAnalytics } from './utils/analytics'

startAnalytics()

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// The built pages ship with their content already in the HTML (so search engines and slow
// connections see it at once); the app then takes over that markup. The fallback page and the
// dev server start with an empty root.
if (container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
