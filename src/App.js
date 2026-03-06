
import React, { useState } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import VideoCall from "./components/VideoCall";
import Chat from "./components/Chat";
import ScreenShare from "./components/ScreenShare";
import Participants from "./components/Participants";
import Scheduler from "./components/Scheduler";
import "./styles.css";

function App() {
  const [user, setUser] = useState(null);

  const loginGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="app">
      {!user ? (
        <button onClick={loginGoogle}>Login with Google</button>
      ) : (
        <>
          <header>
            <h1>Nexus</h1>
            <button onClick={logout}>Logout</button>
          </header>
          <main>
            <VideoCall user={user} />
            <ScreenShare />
            <Chat user={user} />
            <Participants />
            <Scheduler user={user} />
          </main>
        </>
      )}
    </div>
  );
}

export default App;
