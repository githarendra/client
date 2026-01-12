import React, { useEffect, useState, useRef } from 'react';

export default function Chat({ socket, roomId, toggleChat, username }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });
    return () => socket.off('receive-message');
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      const messageData = { roomId, username, text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      socket.emit('send-message', messageData);
      setMessages((prev) => [...prev, { ...messageData, isMe: true }]);
      setMsg("");
    }
  };

  return (
    <div className="flex flex-col h-full w-80 bg-zinc-950 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
        <div>
          <h2 className="text-white font-bold text-lg tracking-wide">Live Chat</h2>
          <span className="text-xs text-green-400 flex items-center gap-1">● Online</span>
        </div>
        <button onClick={toggleChat} className="text-zinc-400 hover:text-white transition p-2 rounded-full hover:bg-white/10">✕</button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-10">
            <p className="text-4xl mb-2">👋</p>
            <p className="text-sm">Say hello to the room!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm relative ${
                m.isMe 
                ? 'bg-violet-600 text-white rounded-br-none' 
                : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
              }`}>
              {!m.isMe && <span className="block text-[10px] text-violet-300 font-bold mb-1 opacity-80">{m.username}</span>}
              <p>{m.text}</p>
            </div>
            <span className="text-[10px] text-zinc-600 mt-1 px-1">{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-zinc-900/80 border-t border-white/10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-black/50 text-white border border-zinc-700 rounded-full py-3 pl-5 pr-12 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder-zinc-500"
          />
          <button 
            type="submit" 
            className="absolute right-2 p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!msg.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
