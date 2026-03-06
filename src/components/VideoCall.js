
import React, { useRef, useEffect } from "react";

function VideoCall({ user }) {
  const videoRef = useRef();

  useEffect(() => {
    async function initCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;
    }
    initCamera();
  }, []);

  return (
    <div className="video-call">
      <h2>Video Call</h2>
      <video ref={videoRef} autoPlay playsInline />
    </div>
  );
}

export default VideoCall;
