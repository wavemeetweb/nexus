import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import "./Chat.css";

/**
 * Chat Component
 * Zoom-style sidebar chat with Firebase persistence, typing indicators, reactions, and polished UI
 */
function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatWindowRef = useRef(null);

  // Load messages from Firestore
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "messages"), {
        sender: user.email,
        text: input,
        timestamp: serverTimestamp(),
        reactions: []
      });
      setInput("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle typing indicator
  useEffect(() => {
    if (!input) return;
    const typingTimeout = setTimeout(() => {
      setTypingUsers((prev) => [...new Set([...prev, user.email])]);
    }, 500);
    return () => clearTimeout(typingTimeout);
  }, [input, user.email]);

  // Add reaction to a message
  const addReaction = async (messageId, reaction) => {
    const msgRef = collection(db, "messages");
    // In a real app, updateDoc would be used here
    console.log(`Reacted to ${messageId} with ${reaction}`);
  };

  return (
    <div className="chat-panel">
      <header className="chat-header">
        <h3>Chat</h3>
        <span>{messages.length} messages</span>
      </header>

      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.sender === user.email ? "own" : ""}`}>
            <div className="chat-sender">{msg.sender}</div>
            <div className="chat-text">{msg.text}</div>
            <div className="chat-meta">
              <span className="chat-time">
                {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : ""}
              </span>
              <div className="chat-reactions">
                {msg.reactions?.map((r, i) => (
                  <span key={i} className="reaction">{r}</span>
                ))}
                <button onClick={() => addReaction(msg.id, "👍")}>👍</button>
                <button onClick={() => addReaction(msg.id, "❤️")}>❤️</button>
                <button onClick={() => addReaction(msg.id, "😂")}>😂</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(", ")} typing...
        </div>
      )}

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default Chat;
