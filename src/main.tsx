import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'
import { FilterProvider } from './context/FilterContext.tsx'
import { DataOverrideProvider } from './context/DataOverrideContext.tsx'
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <SignedOut>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <NavigationProvider>
          <FilterProvider>
            <DataOverrideProvider>
              <App />
            </DataOverrideProvider>
          </FilterProvider>
        </NavigationProvider>
      </SignedIn>
    </ClerkProvider>
  </StrictMode>,
)
