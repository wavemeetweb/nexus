import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";

/**
 * Participants Component
 * Zoom-style participant list with roles, mute controls, hand-raise, and Firebase presence tracking
 */
function Participants() {
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState("");

  // Load participants from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "participants"), (snapshot) => {
      setParticipants(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Mute/unmute participant
  const toggleMute = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "participants", id), { muted: !currentStatus });
    } catch (err) {
      setError("Failed to update mute status: " + err.message);
    }
  };

  // Promote to co-host
  const promoteToCoHost = async (id) => {
    try {
      await updateDoc(doc(db, "participants", id), { role: "co-host" });
    } catch (err) {
      setError("Failed to promote participant: " + err.message);
    }
  };

  // Demote to participant
  const demoteToParticipant = async (id) => {
    try {
      await updateDoc(doc(db, "participants", id), { role: "participant" });
    } catch (err) {
      setError("Failed to demote participant: " + err.message);
    }
  };

  // Hand raise toggle
  const toggleHandRaise = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "participants", id), { handRaised: !currentStatus });
    } catch (err) {
      setError("Failed to update hand raise: " + err.message);
    }
  };

  // Remove participant
  const removeParticipant = async (id) => {
    try {
      await deleteDoc(doc(db, "participants", id));
    } catch (err) {
      setError("Failed to remove participant: " + err.message);
    }
  };

  return (
    <div className="participants-panel">
      <header className="participants-header">
        <h3>Participants ({participants.length})</h3>
      </header>

      {error && <p className="error-message">{error}</p>}

      <ul className="participants-list">
        {participants.map((p) => (
          <li key={p.id} className="participant-item">
            <div className="participant-info">
              <span className="participant-name">{p.name}</span>
              <span className="participant-role">
                {p.role === "host" ? "👑 Host" : p.role === "co-host" ? "⭐ Co-Host" : "👤 Participant"}
              </span>
            </div>

            <div className="participant-status">
              {p.muted ? "🔇" : "🎤"} {p.cameraOn ? "📹" : "🚫"}
              {p.handRaised && <span className="hand-raised">✋</span>}
            </div>

            <div className="participant-controls">
              <button onClick={() => toggleMute(p.id, p.muted)}>
                {p.muted ? "Unmute" : "Mute"}
              </button>
              {p.role === "participant" && (
                <button onClick={() => promoteToCoHost(p.id)}>Promote</button>
              )}
              {p.role === "co-host" && (
                <button onClick={() => demoteToParticipant(p.id)}>Demote</button>
              )}
              <button onClick={() => toggleHandRaise(p.id, p.handRaised)}>
                {p.handRaised ? "Lower Hand" : "Raise Hand"}
              </button>
              <button className="remove" onClick={() => removeParticipant(p.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Participants;
