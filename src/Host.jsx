import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Chat from './Chat';

const socket = io('https://watch-party-server-1o5x.onrender.com', { withCredentials: true, autoConnect: true });

export default function Host() {
  const { roomId } = useParams();
  const [username, setUsername] = useState(""); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState("Offline");
  
  const [users, setUsers] = useState([]);
  const [showUserPanel, setShowUserPanel] = useState(false);

  const [fileSelected, setFileSelected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  const videoRef = useRef();
  const myPeer = useRef();
  const streamRef = useRef(null);
  const nameInputRef = useRef();
  const calledPeers = useRef({});

  useEffect(() => {
      return () => {
          socket.emit('leave-room');
          if (isBroadcasting) socket.emit('stop-broadcast', roomId);
      };
  }, [isBroadcasting, roomId]);

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
      setStatus("Connected");
      socket.emit('join-room', roomId, id, username);
      socket.emit('host-started-stream', roomId);
    });

    socket.on('update-user-list', (updatedUsers) => {
        setUsers(updatedUsers.filter(u => u.username !== username));
    });
    
    socket.on('user-connected', (userId) => {
      if (streamRef.current) {
          connectToNewUser(userId, streamRef.current);
          if(videoRef.current) {
              const state = videoRef.current.paused ? 'PAUSE' : 'PLAY';
              socket.emit('video-sync', { roomId, type: state, time: videoRef.current.currentTime });
          }
      }
    });

    return () => {
        socket.off('user-connected');
        socket.off('update-user-list');
        if(myPeer.current) myPeer.current.destroy();
    }
  }, [isLoggedIn, roomId]);

  const connectToNewUser = (userId, stream) => {
      if (calledPeers.current[userId]) return;
      calledPeers.current[userId] = true;
      setTimeout(() => {
          try {
              myPeer.current.call(userId, stream);
              setTimeout(() => { calledPeers.current[userId] = false; }, 2000); 
          } catch(err) { calledPeers.current[userId] = false; }
      }, 500); 
  };

  const handleKick = (socketId, userName) => {
      if(window.confirm(`Kick ${userName}?`)) {
          socket.emit('kick-user', { roomId, socketId });
      }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileSelected(true);
      setTimeout(() => { if(videoRef.current) { videoRef.current.src = url; setStatus("Ready"); }}, 50);
    }
  };

  const startBroadcast = async () => {
    const video = videoRef.current; if (!video) return;
    try { 
        // ✅ CRITICAL FIX: Ensure audio is captured
        video.muted = false; 
        video.volume = 1.0; 
        
        let stream;
        if (video.captureStream) {
            stream = video.captureStream(30);
        } else if (video.mozCaptureStream) {
            stream = video.mozCaptureStream(30);
        } else {
            throw new Error("Browser not supported. Use Chrome or Firefox.");
        }
        
        streamRef.current = stream; 
        setIsBroadcasting(true); 
        setStatus("BROADCASTING (PAUSED)"); 
        socket.emit('host-started-stream', roomId); 

    } catch (err) { alert(err.message); }
  };

  const stopBroadcast = () => {
    socket.emit('stop-broadcast', roomId); 
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    setIsBroadcasting(false); setStatus("Stopped");
  };
  
  const handleSync = (type) => { 
      if(videoRef.current) {
          socket.emit('video-sync', { roomId, type, time: videoRef.current.currentTime }); 
          if(isBroadcasting) setStatus(type === 'PLAY' ? "BROADCASTING LIVE" : "BROADCASTING (PAUSED)");
      }
  };

  if (!isLoggedIn) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans relative">
              <div className="absolute top-6 left-6"><Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 transition"><span className="text-xl">🏠</span> <span className="font-bold">Back Home</span></Link></div>
              <form onSubmit={handleLogin} className="bg-neutral-900 p-10 rounded-2xl border border-neutral-800 flex flex-col gap-6 w-96 shadow-2xl">
                  <div className="text-center"><h1 className="text-3xl font-bold text-blue-500 tracking-wider mb-2">HOSTING</h1><p className="text-gray-400 text-sm">Room ID: <span className="font-mono text-white bg-neutral-800 px-2 py-1 rounded select-all">{roomId}</span></p></div>
                  <div className="flex flex-col gap-2"><label className="text-gray-400 text-xs uppercase tracking-wide font-bold">Your Name</label><input ref={nameInputRef} type="text" placeholder="e.g. Host Harry" className="bg-black border border-neutral-700 text-white px-4 py-3 rounded-lg focus:border-blue-500 outline-none transition" autoFocus /></div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition transform active:scale-95">Start Room</button>
              </form>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans">
      <div className="h-14 flex items-center justify-between px-6 bg-neutral-900 border-b border-neutral-800 shrink-0 z-20">
        <div className="flex items-center gap-6"><Link to="/" className="flex items-center gap-2 group"><span className="text-xl group-hover:scale-110 transition">🏠</span><h1 className="text-lg font-bold tracking-tighter hidden md:block"><span className="text-blue-500">WATCH</span><span className="text-white">PARTY</span></h1></Link><div className="h-6 w-px bg-neutral-700 hidden md:block"></div><div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Room ID</span><span className="text-sm font-mono text-white leading-none">{roomId}</span></div></div>
        <div className="flex gap-3 items-center">
            <button onClick={() => setShowUserPanel(!showUserPanel)} className="flex items-center gap-2 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition"><span>👥</span><span className="font-bold text-sm">{users.length}</span></button>
            <div className="px-3 py-1 bg-black border border-neutral-700 rounded-full"><span className={`text-xs font-bold uppercase ${isBroadcasting ? 'text-green-500 animate-pulse' : 'text-neutral-400'}`}>{status}</span></div>
            {!showChat && <button onClick={() => setShowChat(true)} className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded border border-neutral-700 transition">💬 Chat</button>}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-row relative overflow-hidden">
        <div className="flex-1 bg-black flex items-center justify-center relative min-w-0">
          {showUserPanel && (
            <div className="absolute top-4 right-4 z-50 w-72 bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-xl shadow-2xl flex flex-col max-h-[70%]">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center"><h3 className="font-bold text-white">Viewer Control</h3><button onClick={() => setShowUserPanel(false)} className="text-gray-400 hover:text-white">✕</button></div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {users.length === 0 && <p className="text-gray-500 text-xs text-center p-4">No viewers yet.</p>}
                    {users.map(u => (
                        <div key={u.socketId} className="flex items-center justify-between p-2 bg-black/40 rounded hover:bg-black/60 transition group">
                            <div className="flex flex-col"><div className="flex items-center gap-2"><span className="font-bold text-sm">{u.username}</span><span title={u.status === 'PAUSE' ? 'Viewer Paused' : 'Viewer Watching'} className="text-xs cursor-help">{u.status === 'PAUSE' ? '⏸️' : '🟢'}</span></div><span className="text-[10px] text-gray-500 uppercase tracking-wider">{u.status === 'PAUSE' ? 'Paused' : 'Live'}</span></div>
                            <button onClick={() => handleKick(u.socketId, u.username)} className="text-xs bg-red-900/30 text-red-400 border border-red-900/50 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition opacity-0 group-hover:opacity-100">Kick</button>
                        </div>
                    ))}
                </div>
            </div>
          )}
          {!fileSelected ? (
            <div className="text-neutral-600 text-center"><p className="text-5xl mb-4">🎬</p><p className="text-xl">Select a video to begin</p></div>
          ) : (
            <video ref={videoRef} controls className="h-full w-full object-contain" onPause={() => handleSync('PAUSE')} onPlay={() => handleSync('PLAY')} />
          )}
        </div>
        <div className={`${showChat ? 'block' : 'hidden'} h-full`}><Chat socket={socket} roomId={roomId} toggleChat={() => setShowChat(false)} username={username} /></div>
      </div>
      <div className="h-20 flex items-center justify-center gap-4 bg-neutral-900 border-t border-neutral-800 shrink-0 z-50">
        <label className={`cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 text-sm ${isBroadcasting ? 'opacity-50 pointer-events-none' : ''}`}>📂 Load Movie <input type="file" accept="video/mp4" onChange={handleFileChange} className="hidden" disabled={isBroadcasting} /></label>
        {!isBroadcasting ? (
            <button onClick={startBroadcast} disabled={!fileSelected} className={`px-5 py-2.5 rounded-lg font-bold transition text-sm ${fileSelected ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>Start Broadcast</button>
        ) : (
            <button onClick={stopBroadcast} className="px-5 py-2.5 rounded-lg font-bold transition text-sm bg-red-600 hover:bg-red-500 text-white animate-pulse">⏹ Stop Broadcast</button>
        )}
      </div>
    </div>
  );
}
