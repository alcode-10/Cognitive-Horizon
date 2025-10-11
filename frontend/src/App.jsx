import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import MapView from "./Mapview";
import ControlPanel from "./Controlpanel";
import './Solutionpanel.css';
// import TelemetryPanel from "./TelemetryPanel";
import "./Cockpit.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GlideTimer from "./GlideTimer";
// import './voicecommand.css'

const socket = io("http://localhost:5000");

function App() {
  const [planePosition, setPlanePosition] = useState({
    lat: 28.61,
    lon: 77.20,
    altitude: 35000,
    airspeed : 450,
  });

  const [solution, setSolution] = useState(null);
  const [glideData, setGlideData] = useState(null);

  //  Speak checklist aloud safely
  const speakChecklist = (checklist) => {
    if (!("speechSynthesis" in window)) {
      alert("Speech Synthesis not supported in this browser.");
      return;
    }

    // Cancel any ongoing speech before starting new
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.text = checklist.join(". Next, ");
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    socket.on("flightData", (data) => {
      console.log("🔄 Live Flight Data Received:", data);
      setPlanePosition(data);
      
    });

    socket.on("solutionUpdate", (data) => {
      console.log("Solution Update via Socket:", data);
      setSolution(data);

      if (data.checklist) {
        speakChecklist(data.checklist);
      }
    });

    return () => {
      socket.off("flightData");
      socket.off("solutionUpdate");
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div>
      <MapView planePosition={planePosition} aiResponse={{
        ...solution,
        glideDistanceKm: glideData?.glideDistanceKm
      }}  />
      <ToastContainer position="bottom-right" autoClose={3000} />
      
      <ControlPanel planePosition={planePosition} onSolution={setSolution} />

      
      {solution && (
        <GlideTimer
          altitudeFt={planePosition?.altitude || 35000}
          speedKts={planePosition?.airspeed || 250}
          onGlideData={setGlideData}
        />
      )}

      {solution && (
        <div className="solution-panel">
          <h4>Solution</h4>
          <p><b>Chosen Airport:</b> {solution.chosenAirport?.name}</p>
          <ul>
            {Array.isArray(solution.checklist) &&
              solution.checklist.map((step, i) => <li key={i}>{step}</li>)}
          </ul>
          <button onClick={() => speakChecklist(solution.checklist)}>
            Repeat Checklist
          </button>
          <button onClick={() => window.speechSynthesis.cancel()}>
            Stop Speech
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
