import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

import TelegramFloatingBtn from './components/TelegramFloatingBtn';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="bg-gray-50 min-h-screen font-sans relative">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
          <TelegramFloatingBtn />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
