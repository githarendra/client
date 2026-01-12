import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Chat from './Chat';

// ✅ Connect to Render
const socket = io('https://watch-party-server-1o5x.onrender.com', { withCredentials: true, autoConnect: true });

export default function Viewer() {
  const { roomId } = useParams();
  
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false); 
  const [isKicked, setIsKicked] = useState(false);
  
  const videoRef = useRef();
  const myPeer = useRef();
  const nameInputRef = useRef();
  const retryInterval = useRef(null);
  const receivingCall = useRef(false);
  
  const hostState = useRef({ type: 'PAUSE', time: 0 }); 
  const isWatching = useRef(false);

  const handleLogin = (e) => {
      e.preventDefault();
      const name = nameInputRef.current.value;
      if(name.trim()) { setUsername(name); setIsLoggedIn(true); }
  };

  useEffect(() => {
    if(!isLoggedIn) return;

    myPeer.current = new Peer(undefined, {
      host: 'watch-party-server-1o5x.onrender.com',
      port: 443,
      secure: true,
      path: '/peerjs' 
    });
    
    myPeer.current.on('open', (id) => {
      setStatus("Waiting for Host...");
      socket.emit('join-room', roomId, id, username); 
      retryInterval.current = setInterval(() => {
          if(!receivingCall.current) {
             console.log("Pinging Host...");
             socket.emit('join-room', roomId, id, username); 
          }
      }, 2000);
    });

    myPeer.current.on('call', (call) => {
      if (receivingCall.current) return;
      receivingCall.current = true;
      clearInterval(retryInterval.current);
      setIsEnded(false); 

      call.answer(); 
      call.on('stream', (hostStream) => {
        if(videoRef.current) {
            videoRef.current.srcObject = hostStream;
            // Autoplay Muted
            videoRef.current.muted = true;
            videoRef.current.play().catch(e => console.log("Waiting for user interaction..."));
            setStatus("Ready to Join");
            setShowPlayButton(true);
        }
      });
    });

    socket.on('kicked', () => {
        setIsKicked(true);
        isWatching.current = false;
        if(videoRef.current) videoRef.current.pause();
        if(myPeer.current) myPeer.current.destroy();
        socket.emit('leave-room');
    });

    socket.on('stream-forced-refresh', () => {
        setIsEnded(false);
        receivingCall.current = false;
        if(myPeer.current) socket.emit('join-room', roomId, myPeer.current.id, username);
    });

    socket.on('video-sync', (data) => {
        hostState.current = data; 
        
        if (videoRef.current && isWatching.current) {
            if(Math.abs(videoRef.current.currentTime - data.time) > 0.5) {
                videoRef.current.currentTime = data.time;
            }

            if(data.type === 'PAUSE') {
                videoRef.current.pause();
                setIsPaused(true);
                setStatus("Host Paused");
                socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
            } else if(data.type === 'PLAY') {
                videoRef.current.play().catch(() => {});
                setIsPaused(false);
                setStatus("LIVE");
                socket.emit('viewer-status-update', { roomId, status: 'LIVE' });
            }
        }
    });

    socket.on('broadcast-stopped', () => {
        setIsEnded(true);
        setStatus("Host Disconnected");
        isWatching.current = false; 
        receivingCall.current = false;
        if(videoRef.current) videoRef.current.srcObject = null;
    });

    return () => {
      socket.emit('leave-room'); 
      clearInterval(retryInterval.current);
      socket.off('video-sync');
      socket.off('broadcast-stopped');
      socket.off('stream-forced-refresh');
      socket.off('kicked');
      if(myPeer.current) myPeer.current.destroy();
    };
  }, [isLoggedIn, roomId]);

  const handleManualPlay = () => {
    if (!videoRef.current) return;
    
    setShowPlayButton(false);
    setStatus("Connected");
    isWatching.current = true; 
    
    // Unmute
    videoRef.current.muted = false;

    const { type, time } = hostState.current;
    if (Number.isFinite(time)) videoRef.current.currentTime = time;

    // ✅ FIX: Force update status immediately so Host sees "Watching"
    if (type === 'PAUSE') {
        videoRef.current.pause();
        setIsPaused(true);
        setStatus("Host Paused");
        socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
    } else {
        setIsPaused(false);
        setStatus("LIVE");
        socket.emit('viewer-status-update', { roomId, status: 'LIVE' });
        videoRef.current.play().catch(e => console.log("Play error", e));
    }
  };

  if (isKicked) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans">
              <div className="text-center p-10 border border-red-500/30 rounded-3xl bg-red-950/20 shadow-2xl backdrop-blur-md">
                  <div className="text-6xl mb-4">🚫</div>
                  <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
                  <Link to="/" className="inline-block px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition">Back to Home</Link>
              </div>
          </div>
      );
  }

  // ✅ THEME FIX: Exact "Midnight Violet" Login UI from Host
  if (!isLoggedIn) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black"></div>
              <div className="absolute top-6 left-6 z-10"><Link to="/" className="text-zinc-400 hover:text-white flex items-center gap-2 transition group"><span className="text-xl group-hover:-translate-x-1 transition">←</span> <span className="font-bold">Home</span></Link></div>
              
              <form onSubmit={handleLogin} className="z-10 bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl border border-white/10 flex flex-col gap-6 w-96 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                  <div className="text-center">
                      <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎫</div>
                      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Join Party</h1>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Room ID</p>
                      <div className="font-mono text-violet-300 text-sm mt-1">{roomId}</div>
                  </div>
                  <div className="flex flex-col gap-2 text-left">
                      <label className="text-zinc-400 text-xs uppercase tracking-wide font-bold ml-1">Your Alias</label>
                      <input ref={nameInputRef} type="text" placeholder="e.g. Viewer Vinny" className="bg-black/50 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:border-violet-500 outline-none transition" autoFocus />
                  </div>
                  <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/20">Enter Cinema</button>
              </form>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      <div className="h-16 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
         <div className="flex items-center gap-6"><Link to="/" className="flex items-center gap-2 group"><span className="text-xl group-hover:scale-110 transition">🏠</span><h1 className="text-lg font-bold tracking-tighter hidden md:block text-zinc-300">Party<span className="text-blue-500">View</span></h1></Link><div className="h-6 w-px bg-white/10 hidden md:block"></div><div className="flex flex-col"><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Watching</span><span className="text-sm font-mono text-white leading-none">{roomId}</span></div></div>
         <div className="flex items-center gap-3">
             {!showChat && !isEnded && <button onClick={() => setShowChat(true)} className="text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-full border border-white/10 transition flex items-center gap-2"><span>💬</span> Chat</button>}
             <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-full flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isEnded ? 'bg-red-500' : status === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div><span className="text-xs font-bold uppercase text-zinc-400">{status}</span></div>
         </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-row relative overflow-hidden bg-black">
        <div className="flex-1 flex items-center justify-center relative min-w-0">
          <video 
            ref={videoRef} 
            controls 
            className="max-h-full max-w-full shadow-2xl" 
            onPause={() => socket.emit('viewer-status-update', { roomId, status: 'PAUSE' })} 
            onPlay={() => socket.emit('viewer-status-update', { roomId, status: 'LIVE' })}
          />
          {showPlayButton && !isEnded && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-6 animate-pulse"><span className="text-4xl">🍿</span></div>
                <h2 className="text-3xl font-bold text-white mb-2">Ready to Watch</h2>
                <button onClick={handleManualPlay} className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-zinc-200 transition transform hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">Join Stream</button>
              </div>
            </div>
          )}
          {isPaused && !isEnded && !showPlayButton && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-black/60 p-8 rounded-full backdrop-blur-md border border-white/10"><svg className="w-16 h-16 text-white/90 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div></div>}
          {isEnded && <div className="absolute inset-0 z-[100] flex items-center justify-center bg-zinc-950"><div className="text-center p-12 border border-zinc-800 rounded-3xl bg-black shadow-2xl"><div className="text-6xl mb-6 grayscale opacity-50">📺</div><h1 className="text-2xl font-bold text-zinc-300 mb-2">Host Offline</h1><p className="text-zinc-600">Waiting for signal...</p></div></div>}
        </div>
        {showChat && <Chat socket={socket} roomId={roomId} toggleChat={() => setShowChat(false)} username={username} />}
      </div>
    </div>
  );
}
