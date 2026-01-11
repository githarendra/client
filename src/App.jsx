import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Host from './Host';
import Viewer from './Viewer';

function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");

  const createRoom = () => {
    // Generate a random 6-character Room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/host/${roomId}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (joinId.trim()) {
      navigate(`/viewer/${joinId.toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-white font-sans overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center gap-10">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-white drop-shadow-2xl">
            WATCH<span className="text-white">PARTY</span>
          </h1>
          <p className="text-gray-400 text-lg tracking-wide uppercase">Stream movies with friends • Real-time Sync</p>
        </div>

        <div className="flex flex-col gap-6 w-full max-w-sm">
          
          {/* CREATE ROOM */}
          <button 
            onClick={createRoom} 
            className="w-full py-4 bg-blue-600 rounded-xl font-bold text-xl hover:scale-105 transition shadow-lg shadow-blue-900/50 flex items-center justify-center gap-3"
          >
            <span>📺</span> Create New Room
          </button>

          <div className="flex items-center gap-4 text-gray-500 text-sm font-bold">
            <div className="h-px bg-gray-800 flex-1"></div> OR <div className="h-px bg-gray-800 flex-1"></div>
          </div>

          {/* JOIN ROOM */}
          <form onSubmit={joinRoom} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-xl focus:border-blue-500 outline-none transition text-center tracking-widest font-mono uppercase"
            />
            <button 
              type="submit" 
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 rounded-xl font-bold border border-neutral-700 transition"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="w-full h-full">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Dynamic Routes for Room ID */}
          <Route path="/host/:roomId" element={<Host />} />
          <Route path="/viewer/:roomId" element={<Viewer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}