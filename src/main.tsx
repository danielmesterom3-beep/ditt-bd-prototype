import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'
import { FilterProvider } from './context/FilterContext.tsx'
import { DataOverrideProvider } from './context/DataOverrideContext.tsx'
import { ViewModeProvider } from './context/ViewModeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <FilterProvider>
        <ViewModeProvider>
          <DataOverrideProvider>
            <App />
          </DataOverrideProvider>
        </ViewModeProvider>
      </FilterProvider>
    </NavigationProvider>
  </StrictMode>,
)
