import { useState } from 'react'
import StatusPage from './pages/StatusPage'
import PanelPage from './pages/PanelPage'

export type Page = 'status' | 'panel'

export default function App() {
  const [page, setPage] = useState<Page>('status')

  if (page === 'panel') {
    return <PanelPage onBack={() => setPage('status')} />
  }

  return <StatusPage onGoToPanel={() => setPage('panel')} />
}
