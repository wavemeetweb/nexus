import React, { useState } from "react";
import "./Dashboard.css";

function Dashboard({ onStartMeeting, onJoinMeeting, onScheduleMeeting, onUpdateProfile }) {
  const [meetingCode, setMeetingCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePic, setProfilePic] = useState(null);

  const handleProfileUpdate = () => {
    onUpdateProfile({ name: profileName, pic: profilePic });
  };

  return (
    <div className="dashboard">
      <h2>Meeting Dashboard</h2>

      {/* Start Meeting */}
      <div className="card">
        <h3>Start a Meeting</h3>
        <button onClick={onStartMeeting}>Start Meeting</button>
      </div>

      {/* Join Meeting */}
      <div className="card">
        <h3>Join a Meeting</h3>
        <input
          type="text"
          placeholder="Enter meeting code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
        />
        <button onClick={() => onJoinMeeting(meetingCode)}>Join</button>
      </div>

      {/* Schedule Meeting */}
      <div className="card">
        <h3>Schedule a Meeting</h3>
        <button onClick={onScheduleMeeting}>Schedule</button>
      </div>

      {/* Profile Settings */}
      <div className="card">
        <h3>Profile Settings</h3>
        <input
          type="text"
          placeholder="Enter your name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProfilePic(e.target.files[0])}
        />
        <button onClick={handleProfileUpdate}>Save Profile</button>
      </div>
    </div>
  );
}

export default Dashboard;
