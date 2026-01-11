import React, { useEffect, useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react'; // IMPORT LIBRARY

export default function Chat({ socket, roomId, toggleChat, username }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false); // Toggle Drawer
  const messagesEndRef = useRef(null);
  const pickerRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Click outside to close emoji drawer
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReceive = (data) => setMessages((prev) => [...prev, data]);
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [socket]);

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      roomId,
      username: username || "Guest",
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit('send-message', msgData);
    setMessages((prev) => [...prev, msgData]);
    setNewMessage("");
    setShowEmoji(false);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 w-80 shadow-xl z-40">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 h-14 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <h2 className="font-bold text-gray-200 tracking-wide">Live Chat</h2>
        <button onClick={toggleChat} className="text-gray-500 hover:text-white transition p-2">✕</button>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {messages.length === 0 && (
            <div className="text-center mt-10 opacity-50">
                <p className="text-4xl mb-2">👋</p>
                <p className="text-xs text-neutral-400">Say hello!</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.username === (username || "Guest");
          return (
            <div key={index} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-[10px] font-bold ${isMe ? "text-blue-400" : "text-gray-400"}`}>
                  {msg.username}
                </span>
                <span className="text-[9px] text-gray-600">{msg.time}</span>
              </div>
              <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words shadow-sm ${
                isMe 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-neutral-800 text-gray-200 rounded-tl-none border border-neutral-700"
              }`}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-neutral-900 border-t border-neutral-800 shrink-0 relative">
        
        {/* FULL EMOJI PICKER DRAWER */}
        {showEmoji && (
            <div ref={pickerRef} className="absolute bottom-16 right-2 z-50 shadow-2xl border border-neutral-700 rounded-xl overflow-hidden">
                <EmojiPicker 
                    theme="dark" 
                    onEmojiClick={onEmojiClick}
                    width={300}
                    height={350}
                    searchDisabled={false}
                    previewConfig={{ showPreview: false }}
                />
            </div>
        )}

        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-black border border-neutral-700 text-white rounded-full pl-4 pr-10 py-2.5 text-sm focus:border-blue-500 outline-none transition placeholder-gray-600"
            />
            
            {/* EMOJI TOGGLE BUTTON */}
            <button 
                type="button" 
                onClick={() => setShowEmoji(!showEmoji)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-yellow-400 transition text-lg leading-none"
            >
                😊
            </button>
          </div>

          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-4 h-4 fill-current transform translate-x-0.5 translate-y-0.5" viewBox="0 0 24 24">
               <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}