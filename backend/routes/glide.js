// backend/routes/glide.js
import express from "express";
const router = express.Router();

const FEET_TO_METERS = 0.3048;
const KNOTS_TO_MS = 0.51444;

router.post("/glide", (req, res) => {
    let { altitudeFt, speedKts, glideRatio = 15 } = req.body;

    
    altitudeFt = Number(altitudeFt);
    speedKts = Number(speedKts);
    glideRatio = Number(glideRatio);

    if (isNaN(altitudeFt) || isNaN(speedKts) || altitudeFt <= 0 || speedKts <= 0) {
        return res.status(400).json({ error: "Invalid or missing altitude/speed" });
    }

    
    const altitudeM = altitudeFt * FEET_TO_METERS;
    const speedMs = speedKts * KNOTS_TO_MS;

    const descentRate = speedMs / glideRatio;

    if (descentRate <= 0) {
        return res.status(400).json({ error: "Invalid glide ratio or speed" });
    }


    const timeSec = altitudeM / descentRate;
    const glideDistanceM = speedMs * timeSec;

    res.json({
        altitudeFt,
        speedKts,
        glideRatio,
        timeSec: Math.round(timeSec),                     // rounded seconds
        timeMin: +(timeSec / 60).toFixed(2),              // number, not string
        glideDistanceKm: +(glideDistanceM / 1000).toFixed(2), // km number
    });
});

export default router;
