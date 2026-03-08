import React, { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc } from 'firebase/firestore';

const MeetingRoom = ({ roomId }) => {
  const [participants, setParticipants] = useState(0);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  }));

  useEffect(() => {
    const startCall = async () => {
      // 1. Get Camera/Mic
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      // 2. Enforce 10-participant limit via Firestore
      const roomRef = doc(db, "rooms", roomId);
      onSnapshot(roomRef, (snapshot) => {
        const data = snapshot.data();
        if (data && data.count >= 10) {
          alert("Meeting is full (Max 10 participants)");
          window.location.href = "/";
        }
      });
    };

    startCall();
  }, [roomId]);

  return (
    <div className="h-screen bg-slate-900 p-4 flex flex-col">
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Local Video */}
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border-2 border-blue-500">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">You</span>
        </div>
        {/* Remote Videos would map here */}
      </div>
      
      {/* Controls */}
      <div className="h-20 bg-slate-800 rounded-2xl mt-4 flex items-center justify-center gap-6">
        <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-full text-white">Mic</button>
        <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-full text-white">Cam</button>
        <button className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white px-8 font-bold">Leave</button>
      </div>
    </div>
  );
};

export default MeetingRoom;
