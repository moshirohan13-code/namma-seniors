import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentPage from './pages/StudentPage';
import AdminPage from './pages/AdminPage';
import MentorLogin from './pages/MentorLogin';
import MentorDashboard from './pages/MentorDashboard';

function App() {
  console.log('✅ App component loaded');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mentor-login" element={<MentorLogin />} />
        <Route path="/mentor-dashboard" element={<MentorDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;