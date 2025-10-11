import React, { useEffect, useState } from "react";
import axios from "axios";
import "./GlideTimer.css";

const GlideTimer = ({ altitudeFt, speedKts, onGlideData }) => {
    const [glideData, setGlideData] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!altitudeFt || !speedKts) return;

        axios.post("http://localhost:5000/api/glide", { altitudeFt, speedKts })
            .then((res) => {
                setGlideData(res.data);
                if (onGlideData) onGlideData(res.data); // ✅ send to parent
                setTimeout(() => setVisible(true), 100);
            })
            .catch((err) => console.error("Glide API Error:", err));
    }, [altitudeFt, speedKts, onGlideData]);

    if (!glideData) return null;

    return (
        <div className={`glide-timer ${visible ? "show" : ""}`}>
            <h4>Glide Performance</h4>
            <p>Glide Ratio: {glideData.glideRatio}:1</p>
            <p>Glide Distance: {glideData.glideDistanceKm} km</p>
            <p>Glide Time: {glideData.timeMin} minutes</p>
        </div>
    );
};

export default GlideTimer;