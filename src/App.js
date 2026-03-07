import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import VideoCall from "./components/VideoCall";
import Chat from "./components/Chat";
import ScreenShare from "./components/ScreenShare";
import Participants from "./components/Participants";
import Scheduler from "./components/Scheduler";
import "./styles.css";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="App">
      {user ? (
        <>
          <header>
            <h1>Nexus</h1>
            <button onClick={() => signOut(auth)}>Logout</button>
          </header>
          <VideoCall user={user} />
          <ScreenShare />
          <Chat user={user} />
          <Participants />
          <Scheduler user={user} />
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
