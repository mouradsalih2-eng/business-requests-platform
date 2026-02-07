import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FeatureFlagProvider } from './context/FeatureFlagContext'
import { ProjectProvider } from './context/ProjectContext'
import { ToastProvider } from './components/ui/Toast'
import { queryClient } from './lib/queryClient'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ProjectProvider>
              <FeatureFlagProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </FeatureFlagProvider>
            </ProjectProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
