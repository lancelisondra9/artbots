import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <Auth0Provider
      domain="dev-zcwjkuoda50t70df.us.auth0.com"
      clientId="VaRvdVpiIYk266AdMjCYWEB3dtHvdIbl"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: 'https://artbots-api',
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
