import React, { useState, useEffect, useRef } from "react";

/**
 * ScreenShare Component
 * Handles WebRTC screen capture, permissions, multiple streams, and Zoom-style controls
 */
function ScreenShare() {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const videoRef = useRef(null);

  // Start screen share
  const startShare = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      setStreams((prev) => [...prev, stream]);
      setSelectedStream(stream);
      setSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Screen share failed: " + err.message);
    }
  };

  // Stop screen share
  const stopShare = () => {
    if (selectedStream) {
      selectedStream.getTracks().forEach((track) => track.stop());
    }
    setSharing(false);
    setSelectedStream(null);
  };

  // Switch between multiple streams
  const switchStream = (index) => {
    const stream = streams[index];
    setSelectedStream(stream);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    };
  }, [streams]);

  return (
    <div className="screen-share-panel">
      <header className="screen-share-header">
        <h3>Screen Share</h3>
        <div className="controls">
          {!sharing ? (
            <button onClick={startShare}>Start Sharing</button>
          ) : (
            <button onClick={stopShare}>Stop Sharing</button>
          )}
        </div>
      </header>

      {error && <p className="error-message">{error}</p>}

      {sharing && (
        <div className="screen-share-content">
          <video ref={videoRef} autoPlay playsInline />
          <p>📺 Your screen is live</p>
        </div>
      )}

      {streams.length > 1 && (
        <div className="stream-switcher">
          <h4>Available Streams</h4>
          {streams.map((s, i) => (
            <button key={i} onClick={() => switchStream(i)}>
              Stream {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScreenShare;
