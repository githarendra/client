// client/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';  // Import the new Home file
import Host from './Host';
import Viewer from './Viewer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:roomId" element={<Host />} />
        <Route path="/viewer/:roomId" element={<Viewer />} />
      </Routes>
    </BrowserRouter>
  );
}
