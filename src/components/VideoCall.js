import React from "react";

function VideoCall({ user }) {
  return (
    <div className="video-call">
      <h2>Video Call</h2>
      <p>Welcome, {user?.email}</p>
      {/* Placeholder for video call UI */}
    </div>
  );
}

export default VideoCall;
