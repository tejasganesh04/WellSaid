import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Setup from './pages/Setup'
import DeviceCheck from './pages/DeviceCheck'
import InterviewRoom from './pages/InterviewRoom'
import Report from './pages/Report'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/device-check" element={<DeviceCheck />} />
        <Route path="/interview" element={<InterviewRoom />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </BrowserRouter>
  )
}
