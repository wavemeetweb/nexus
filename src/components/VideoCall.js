import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import "./VideoCall.css";

function VideoCall({ user }) {
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [meetingStart, setMeetingStart] = useState(Date.now());
  const videoRef = useRef(null);

  // Track participants in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "participants"), (snapshot) => {
      setParticipants(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, []);

  // Add current user to participants
  useEffect(() => {
    const joinMeeting = async () => {
      await addDoc(collection(db, "participants"), {
        name: user.email,
        muted: false,
        cameraOn: true,
        joinedAt: new Date().toISOString()
      });
    };
    joinMeeting();
  }, [user]);

  const toggleMute = () => setMuted(!muted);
  const toggleCamera = () => setCameraOn(!cameraOn);
  const toggleShare = () => setSharing(!sharing);

  const leaveMeeting = () => {
    auth.signOut();
  };

  const elapsedMinutes = Math.floor((Date.now() - meetingStart) / 60000);

  return (
    <div className="video-call">
      <header className="video-header">
        <h2>Meeting Room</h2>
        <div className="meeting-info">
          <span>Host: {user.email}</span>
          <span>Duration: {elapsedMinutes} min</span>
        </div>
        <div className="controls">
          <button onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
          <button onClick={toggleCamera}>{cameraOn ? "Stop Video" : "Start Video"}</button>
          <button onClick={toggleShare}>{sharing ? "Stop Share" : "Share Screen"}</button>
          <button className="leave" onClick={leaveMeeting}>Leave</button>
        </div>
      </header>

      <div className="video-grid">
        {participants.map((p, i) => (
          <div key={i} className="video-tile">
            {p.cameraOn ? (
              <div className="video-feed">🎥 {p.name}'s Video</div>
            ) : (
              <div className="video-placeholder">{p.name}</div>
            )}
            <div className="status">
              {p.muted ? "🔇" : "🎤"} {p.cameraOn ? "📹" : "🚫"}
            </div>
          </div>
        ))}
      </div>

      {sharing && (
        <div className="shared-screen">
          <p>📺 {user.email} is sharing their screen</p>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
