// client/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import the components
import Home from './Home';
import Host from './Host';
import Viewer from './Viewer';

export default function App() {
  return (
    // ✅ This BrowserWrapper provides the "Power" for useNavigate
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:roomId" element={<Host />} />
        <Route path="/viewer/:roomId" element={<Viewer />} />
      </Routes>
    </BrowserRouter>
  );
}
