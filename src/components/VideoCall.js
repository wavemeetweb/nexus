import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
/**
 * VideoCall Component
 * Zoom-style meeting room with video grid, controls, and Firebase presence tracking
 */
function VideoCall({ user }) {
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [meetingStart, setMeetingStart] = useState(Date.now());
  const [spotlight, setSpotlight] = useState(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  // Track participants in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "participants"), (snapshot) => {
      setParticipants(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Add current user to participants
  useEffect(() => {
    const joinMeeting = async () => {
      const docRef = await addDoc(collection(db, "participants"), {
        name: user.email,
        muted: false,
        cameraOn: true,
        joinedAt: new Date().toISOString()
      });
      return () => deleteDoc(doc(db, "participants", docRef.id));
    };
    joinMeeting();
  }, [user]);

  // WebRTC setup for local video
  useEffect(() => {
    const setupLocalVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera/mic:", err);
      }
    };
    setupLocalVideo();
  }, []);

  const toggleMute = async () => {
    setMuted(!muted);
    // Update Firestore
    const participant = participants.find((p) => p.name === user.email);
    if (participant) {
      await updateDoc(doc(db, "participants", participant.id), { muted: !muted });
    }
  };

  const toggleCamera = async () => {
    setCameraOn(!cameraOn);
    const participant = participants.find((p) => p.name === user.email);
    if (participant) {
      await updateDoc(doc(db, "participants", participant.id), { cameraOn: !cameraOn });
    }
  };

  const toggleShare = () => setSharing(!sharing);

  const leaveMeeting = () => {
    auth.signOut();
  };

  const elapsedMinutes = Math.floor((Date.now() - meetingStart) / 60000);

  const spotlightParticipant = (name) => {
    setSpotlight(name);
  };

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

      {/* Local video */}
      <div className="local-video">
        <video ref={localVideoRef} autoPlay muted playsInline />
        <p>You ({user.email})</p>
      </div>

      {/* Video grid */}
      <div className={`video-grid ${spotlight ? "spotlight-mode" : ""}`}>
        {participants.map((p) => (
          <div key={p.id} className={`video-tile ${spotlight === p.name ? "spotlight" : ""}`}>
            {p.cameraOn ? (
              <div className="video-feed">🎥 {p.name}'s Video</div>
            ) : (
              <div className="video-placeholder">{p.name}</div>
            )}
            <div className="status">
              {p.muted ? "🔇" : "🎤"} {p.cameraOn ? "📹" : "🚫"}
            </div>
            <button onClick={() => spotlightParticipant(p.name)}>Spotlight</button>
          </div>
        ))}
      </div>

      {/* Screen share */}
      {sharing && (
        <div className="shared-screen">
          <p>📺 {user.email} is sharing their screen</p>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
