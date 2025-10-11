// frontend/src/components/ControlPanel.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Controlpanel.css";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const ControlPanel = ({ planePosition, onSolution }) => {
    const [loading, setLoading] = useState(false);
    const [distanceToDestination, setDistanceToDestination] = useState(null);

    useEffect(() => {
        socket.on("flightArrived", (data) => {
            console.log("Flight Arrived:", data);

            // Show success alert
            toast.success(
                ` ${data.message}`,
                {
                    position: "top-center",
                    autoClose: false, // Keep it visible until user closes
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                }
            );

            // Optional: Show browser alert as well
            alert(`FLIGHT LANDED!\n\n${data.message}\n\nAirport: ${data.airport.name} (${data.airport.code})`);

            // Reset distance display
            setDistanceToDestination(null);
        });

        socket.on("flightData", (data) => {
            // Update distance to destination if available
            if (data.distanceToDestination) {
                setDistanceToDestination(data.distanceToDestination);
            }
        });

        //  Cleanup on unmount
        return () => {
            socket.off("flightArrived");
            socket.off("flightData");
        };
    }, []);

    const triggerEmergency = async () => {
        toast.error("Engine Failure Declared to ATC!");
        setLoading(true);

        const payload = planePosition
            ? {
                lat: planePosition.lat,
                lon: planePosition.lon,
                altitude: planePosition.altitude || 35000,
                type: "Critical left engine failure",
            }
            : {
                lat: 28.61,
                lon: 77.20,
                altitude: 35000,
                type: "Critical left engine failure",
            };

        if (!planePosition) {
            toast.warning("No live data. Using default plane position.");
        }

        try {
            console.log(" Emergency Payload Sent:", payload);
            const res = await axios.post("http://localhost:5000/api/emergency", payload);
            console.log("AI Response:", res.data);
            onSolution(res.data);

            const airportName = res.data.chosenAirport?.name || "Unknown Airport";
            toast.success(`Nearest Airport Selected: ${airportName}`);
        } catch (err) {
            console.error("Emergency trigger error:", err);
            toast.error("Error triggering emergency");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="control-panel">
            <h3>🛠 Control Panel</h3>

            {planePosition ? (
                <>
                    <p>Lat: {planePosition.lat.toFixed(2)}</p>
                    <p>Lon: {planePosition.lon.toFixed(2)}</p>
                    <p>Altitude: {planePosition.altitude} ft</p>
                    <p>Airspeed: {planePosition.airspeed} knots</p>
                    <p>Heading: {planePosition.heading}°</p>

                    {distanceToDestination && (
                        <p className="distance-indicator">
                            Distance to Dest: <strong>{distanceToDestination} km</strong>
                        </p>
                    )}
                </>
            ) : (
                <p>Waiting for flight data...</p>
            )}

            <button onClick={triggerEmergency} disabled={loading}>
                {loading ? "Processing..." : "Trigger Engine Failure"}
            </button>
        </div>
    );
};

export default ControlPanel;