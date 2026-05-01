import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'
import { FilterProvider } from './context/FilterContext.tsx'
import { DataOverrideProvider } from './context/DataOverrideContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <FilterProvider>
        <DataOverrideProvider>
          <App />
        </DataOverrideProvider>
      </FilterProvider>
    </NavigationProvider>
  </StrictMode>,
)
