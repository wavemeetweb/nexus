import React, { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import VideoCall from "./components/VideoCall";
import Chat from "./components/Chat";
import ScreenShare from "./components/ScreenShare";
import Participants from "./components/Participants";
import Scheduler from "./components/Scheduler";
import "./styles.css";

/**
 * App Component
 * Root of Nexus Zoom-style app
 * Handles authentication, layout, meeting context, and global notifications
 */
function App() {
  const [user, setUser] = useState(null);
  const [meetingContext, setMeetingContext] = useState({
    title: "Nexus Meeting",
    startTime: null,
    duration: 0,
    active: false
  });
  const [notifications, setNotifications] = useState([]);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Meeting timer
  useEffect(() => {
    let interval;
    if (meetingContext.active && meetingContext.startTime) {
      interval = setInterval(() => {
        setMeetingContext((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - prev.startTime) / 60000)
        }));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [meetingContext.active, meetingContext.startTime]);

  // Notifications
  const addNotification = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // Start meeting
  const startMeeting = () => {
    setMeetingContext({
      title: "Nexus Meeting",
      startTime: Date.now(),
      duration: 0,
      active: true
    });
    addNotification("Meeting started", "success");
  };

  // End meeting
  const endMeeting = () => {
    setMeetingContext({
      title: "Nexus Meeting",
      startTime: null,
      duration: 0,
      active: false
    });
    addNotification("Meeting ended", "warning");
  };

  return (
    <div className="App">
      {user ? (
        <>
          <header>
            <h1>{meetingContext.title}</h1>
            <div className="header-controls">
              {meetingContext.active ? (
                <span className="meeting-duration">
                  Duration: {meetingContext.duration} min
                </span>
              ) : (
                <span className="meeting-status">No active meeting</span>
              )}
              <button onClick={() => signOut(auth)}>Logout</button>
            </div>
          </header>

          <main className="main-layout">
            <section className="video-section">
              <VideoCall user={user} />
              <ScreenShare />
              <div className="meeting-controls">
                {!meetingContext.active ? (
                  <button onClick={startMeeting}>Start Meeting</button>
                ) : (
                  <button onClick={endMeeting}>End Meeting</button>
                )}
              </div>
            </section>

            <aside className="sidebar">
              <Chat user={user} />
              <Participants />
              <Scheduler user={user} />
            </aside>
          </main>

          {/* Notifications */}
          <div className="notifications">
            {notifications.map((n) => (
              <div key={n.id} className={`notification ${n.type}`}>
                {n.msg}
              </div>
            ))}
          </div>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
