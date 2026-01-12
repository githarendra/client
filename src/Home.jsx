// client/src/Home.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");

  const createRoom = () => {
    navigate(`/host/${uuidV4()}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (joinId.trim()) navigate(`/viewer/${joinId}`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-violet-500/30 flex items-center justify-center relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]"></div>
      
      <div className="z-10 max-w-4xl w-full px-6 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Watch <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Together.</span>
          </h1>
          <p className="text-zinc-400 text-lg">Stream your local movies to friends in perfect sync.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <button onClick={createRoom} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-4 rounded-xl hover:scale-[1.02] transition shadow-lg mb-6">
            ✨ Create New Party
          </button>
          
          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-bold uppercase">Or Join Room</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={joinRoom} className="flex gap-2">
            <input type="text" placeholder="Paste Room ID..." value={joinId} onChange={(e) => setJoinId(e.target.value)} className="flex-1 bg-black/50 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:border-violet-500 outline-none" />
            <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold border border-white/5">Join</button>
          </form>
        </div>
      </div>
    </div>
  );
}
