import React, { useEffect, useState, useRef } from 'react';

export default function Chat({ socket, roomId, toggleChat, username }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // ✅ Logic: Messages coming from the server are ALWAYS from someone else
    const handleReceive = (data) => {
      setMessages((prev) => [...prev, { ...data, isMe: false }]);
    };
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      const messageData = { 
        roomId, 
        username: username || "Guest", 
        text: msg, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // 1. Send to server (server will broadcast to others)
      socket.emit('send-message', messageData);
      
      // 2. Add to MY screen immediately as "Me" (Purple/Right)
      setMessages((prev) => [...prev, { ...messageData, isMe: true }]);
      setMsg("");
    }
  };

  return (
    <div className="flex flex-col h-full w-80 bg-zinc-950 border-l border-white/10 shadow-2xl z-40 relative">
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div><h2 className="text-white font-bold text-sm tracking-wide">Live Chat</h2><span className="text-[10px] text-emerald-400 flex items-center gap-1">● Online</span></div>
        <button onClick={toggleChat} className="text-zinc-500 hover:text-white transition p-2 rounded-full hover:bg-white/5">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm relative ${m.isMe ? 'bg-violet-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
              {/* ✅ Show Name ONLY if it's NOT me */}
              {!m.isMe && <span className="block text-[10px] text-violet-300 font-bold mb-1 opacity-80">{m.username}</span>}
              <p className="leading-relaxed">{m.text}</p>
            </div>
            <span className="text-[9px] text-zinc-600 mt-1 px-1 select-none">{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-zinc-900 border-t border-white/10">
        <div className="relative flex items-center">
          <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message..." className="w-full bg-black/50 text-white border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 text-sm transition placeholder-zinc-600" />
          <button type="submit" disabled={!msg.trim()} className="absolute right-1 p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition disabled:opacity-0 disabled:pointer-events-none transform active:scale-90">➤</button>
        </div>
      </form>
    </div>
  );
}
