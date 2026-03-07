import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "messages"), (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, []);

  const sendMessage = async () => {
    await addDoc(collection(db, "messages"), {
      text: input,
      user: user.email,
      timestamp: serverTimestamp()
    });
    setInput("");
  };

  return (
    <div className="chat">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((msg, i) => (
          <p key={i}><strong>{msg.user}:</strong> {msg.text}</p>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
