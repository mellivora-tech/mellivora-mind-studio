import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout'
import Dashboard from '@/pages/Dashboard'
import DataSourcesPage from '@/pages/datasources'
import DataSetsPage from '@/pages/datasets'
import PipelinesPage from '@/pages/pipelines'
import SchedulesPage from '@/pages/schedules'
import ExecutionsPage from '@/pages/executions'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="datasources" element={<DataSourcesPage />} />
            <Route path="datasets" element={<DataSetsPage />} />
            <Route path="pipelines" element={<PipelinesPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="executions" element={<ExecutionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
