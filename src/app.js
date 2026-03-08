import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/room/:roomId" element={<MeetingRoom />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
