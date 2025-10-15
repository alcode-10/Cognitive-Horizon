import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { CohereClientV2 } from 'cohere-ai';
import Airport from "./models/model.js";
import gliderouter from "./routes/glide.js";

dotenv.config();
const { MONGO_DB_URI, API_KEY, PORT = 5000 } = process.env;
const cohere = new CohereClientV2({ token: API_KEY });

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", gliderouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["https://cognitive-horizon-lite-hde1.onrender.com", "http://localhost:5173/"] },
  methods: ["GET", "POST"],
  credentials: true
});
app.set("io", io);

if (MONGO_DB_URI) {
  mongoose
    .connect(MONGO_DB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) =>
      console.warn("MongoDB connection failed — using fallback airports.", err.message)
    );
} else {
  console.log("No MONGO_DB_URI — using fallback airports.");
}

// --- Flight simulation variables ---
const initialLat = 25 + Math.random() * 6;
const initialLon = 75 + Math.random() * 8;
let currentPosition = { lat: initialLat, lon: initialLon };
let targetPosition = { lat: initialLat, lon: initialLon };
let flightProgress = 0;
const totalFlightTime = 60; // seconds
const updateInterval = 2; // seconds
const progressIncrement = updateInterval / totalFlightTime;

let isEmergencyActive = false;
let emergencyDestination = null;
let hasArrived = false; // Track if plane has arrived
const ARRIVAL_THRESHOLD_KM = 0.5;

function interpolate(start, end, progress) {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lon: start.lon + (end.lon - start.lon) * progress,
  };
}

function calculateHeading(from, to) {
  const dLon = (to.lon - from.lon) * (Math.PI / 180);
  const lat1 = from.lat * (Math.PI / 180);
  const lat2 = to.lat * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Flight simulation every 2 seconds ---
setInterval(() => {
  //  Stop all movement if arrived
  if (hasArrived) {
    console.log("Plane has arrived. No more movement.");
    return;
  }

  if (!isEmergencyActive) {
    // Small random drift
    currentPosition.lat += (Math.random() - 0.5) * 0.3;
    currentPosition.lon += (Math.random() - 0.5) * 0.4;
    targetPosition = { ...currentPosition };
  } else {
    const distanceToTarget = haversineDistance(
      currentPosition.lat,
      currentPosition.lon,
      targetPosition.lat,
      targetPosition.lon
    );

    // Calculate how much to move per update (based on speed)
    const speedKmPerHour = 1500; // 800 km/h typical cruising speed
    const speedKmPerSecond = speedKmPerHour / 3600;
    const distancePerUpdate = speedKmPerSecond * updateInterval;

    if (distanceToTarget > distancePerUpdate) {
      // Move toward target smoothly
      const progressStep = distancePerUpdate / distanceToTarget;
      currentPosition = interpolate(currentPosition, targetPosition, progressStep);
    } else {
      // Close enough - snap to target
      currentPosition = { ...targetPosition };
    }
  }

  // Altitude simulation
  const cruiseAlt = 35000;
  const finalAlt = 3000;
  let altitude = flightProgress < 0.7
    ? cruiseAlt
    : cruiseAlt - (cruiseAlt - finalAlt) * ((flightProgress - 0.7) / 0.3);

  // Airspeed simulation
  let airspeed;
  if (flightProgress < 0.1) airspeed = 250 + (flightProgress / 0.1) * 230;
  else if (flightProgress < 0.7) airspeed = 480;
  else airspeed = 480 - ((flightProgress - 0.7) / 0.3) * 230;

  const heading = calculateHeading(currentPosition, targetPosition);

  // Calculate distance to destination
  let distanceToDestination = null;
  if (isEmergencyActive && emergencyDestination) {
    distanceToDestination = haversineDistance(
      currentPosition.lat,
      currentPosition.lon,
      emergencyDestination.lat,
      emergencyDestination.lon
    );
  }

  // Emit live flight data
  io.emit("flightData", {
    lat: currentPosition.lat,
    lon: currentPosition.lon,
    altitude: Math.round(altitude),
    airspeed: Math.round(airspeed),
    heading: Math.round(heading),
    flightProgress: Math.round(flightProgress * 100),
    isEmergency: isEmergencyActive,
    distanceToDestination: distanceToDestination?.toFixed(2) || null,
    hasArrived,
  });

  console.log("Flight Update:", {
    currentPosition,
    targetPosition,
    isEmergencyActive,
    distanceToDestination
  });

  //  Check arrival
  if (isEmergencyActive && emergencyDestination && !hasArrived) {
    if (distanceToDestination <= ARRIVAL_THRESHOLD_KM) {
      console.log(` ARRIVED at ${emergencyDestination.name}!`);

      hasArrived = true;

      io.emit("flightArrived", {
        message: `Flight has safely landed at ${emergencyDestination.name} (${emergencyDestination.code})`,
        airport: emergencyDestination,
        finalPosition: currentPosition
      });

      // Keep emergency active but stop movement
      flightProgress = 0;
    }
  }

  flightProgress += progressIncrement;
  if (flightProgress >= 1) flightProgress = 0;

}, updateInterval * 1000);

const FALLBACK_AIRPORTS = [
  { name: "Indira Gandhi Intl", code: "DEL", lat: 28.5562, lon: 77.1000, runwayFt: 12192 },
  { name: "Chhatrapati Shivaji Intl", code: "BOM", lat: 19.0896, lon: 72.8656, runwayFt: 12467 },
  { name: "Kempegowda Intl", code: "BLR", lat: 13.1979, lon: 77.7066, runwayFt: 13000 },
  { name: "Rajiv Gandhi Intl", code: "HYD", lat: 17.2403, lon: 78.4294, runwayFt: 12800 },
  { name: "Chennai Intl", code: "MAA", lat: 12.9941, lon: 80.1709, runwayFt: 12329 },
  { name: "Sardar Vallabhbhai Patel Intl", code: "AMD", lat: 23.0770, lon: 72.6347, runwayFt: 9843 },
  { name: "Jaipur Intl", code: "JAI", lat: 26.8242, lon: 75.8122, runwayFt: 9100 },
  { name: "Lucknow", code: "LKO", lat: 26.7611, lon: 80.8890, runwayFt: 9100 },
  { name: "Pune Intl", code: "PNQ", lat: 18.5820, lon: 73.9197, runwayFt: 9750 },
  { name: "Goa Intl", code: "GOI", lat: 15.3800, lon: 73.8316, runwayFt: 9990 },
];

function cleanAIResponse(raw) {
  if (!raw) return null;

  try {
    let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON block found");

    const jsonText = jsonMatch[0]
      .replace(/[\u0000-\u001F]+/g, "")
      .replace(/,(\s*[}\]])/g, "$1");

    const parsed = JSON.parse(jsonText);
    console.log("Successfully parsed AI JSON");
    return parsed;
  } catch (e) {
    console.error("cleanAIResponse failed:", e.message);
    return null;
  }
}

app.get("/", (_, res) => res.send("Cognitive Horizon backend running"));
app.get("/health", (_, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    isEmergencyActive,
    hasArrived,
    currentPosition
  });
});

app.post("/api/emergency", async (req, res) => {
  try {
    const { lat, lon, altitude = 35000, type = "Engine failure" } = req.body;
    console.log(" Emergency received:", { lat, lon, altitude, type });

    // Reset states
    currentPosition = { lat, lon };
    flightProgress = 0;
    hasArrived = false;

    // Load airports
    let airports;
    try {
      airports = await Airport.find({});
      if (!airports?.length) throw new Error("no airports");
      airports = airports.map((a) => ({
        name: a.name,
        code: a.code,
        lat: a.location.lat,
        lon: a.location.lon,
        runwayFt: a.runwayFt || a.runwayFeet || 10000,
      }));
      console.log(`Loaded ${airports.length} airports from database`);
    } catch {
      airports = FALLBACK_AIRPORTS;
      console.log(` Using ${airports.length} fallback airports`);
    }

    //  Get ACTUAL nearest airports, don't shuffle
    const withDist = airports.map((a) => ({
      ...a,
      distKm: haversineDistance(lat, lon, a.lat, a.lon),
    }));
    withDist.sort((a, b) => a.distKm - b.distKm);
    const nearby = withDist.slice(0, 5);

    console.log(" Nearest airports:");
    nearby.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.code}) - ${a.distKm.toFixed(1)} km`));

    const masterPrompt = `You are an expert aviation emergency response AI. A critical emergency has occurred.

**EMERGENCY DETAILS:**
- Type: ${type}
- Current Position: Latitude ${lat.toFixed(4)}°, Longitude ${lon.toFixed(4)}°
- Altitude: ${altitude} feet
- Situation: CRITICAL - Immediate diversion required

**NEARBY AIRPORTS (sorted by distance):**
${nearby
        .map((a, i) => `${i + 1}. ${a.name} (${a.code})
   - Distance: ${a.distKm.toFixed(1)} km
   - Runway: ${a.runwayFt} ft
   - Location: ${a.lat.toFixed(4)}°N, ${a.lon.toFixed(4)}°E`)
        .join("\n")}

**SELECTION CRITERIA:**
1. Distance (closer is better for critical emergencies)
2. Runway length (minimum 8000 ft preferred for commercial jets)
3. DO NOT always choose the same airport
4. Consider the severity: "${type}" - if critical, prioritize distance over runway length

**IMPORTANT:** Analyze the emergency type and location. Choose the MOST APPROPRIATE airport, not always Delhi.

Provide a detailed emergency checklist with 8-10 specific steps for handling "${type}".

**RESPOND WITH ONLY THIS EXACT JSON FORMAT:**
{
  "chosenAirport": {
    "name": "Full Airport Name",
    "code": "IATA Code",
    "lat": latitude_number,
    "lon": longitude_number
  },
  "reasoning": "Why this airport was chosen (1 line, mention distance and runway)",
  "checklist": [
    "1. Immediate action for ${type}",
    "2. Emergency declaration - squawk 7700",
    "3. Aircraft configuration",
    "4. Descent procedure",
    "5. Speed management",
    "6. ATC coordination",
    "7. Approach preparation",
    "8. Landing configuration"
  ],
  "flightPathCoordinates": [
    [${lat}, ${lon}],
    [destination_lat, destination_lon]
  ],
  "atcCall": "Professional emergency radio call"
}`;

    let aiJson;

    if (API_KEY) {
      try {
        console.log("Calling Cohere AI...");

        const response = await cohere.chat({
          messages: [{ role: "user", content: masterPrompt }],
          temperature: 0.5, // Higher temperature for variety
          model: "command-r7b-12-2024",
          response_format: { type: "json_object" },
        });

        const output = response?.message?.content?.[0]?.text || "";
        console.log(" AI Response received");

        aiJson = cleanAIResponse(output);

        if (!aiJson || !aiJson.chosenAirport) {
          throw new Error("Invalid AI response structure");
        }

        console.log("AI selected:", aiJson.chosenAirport.name);
        console.log("Reasoning:", aiJson.reasoning);

        aiJson.nearbyAirports = nearby;
        if (!aiJson.atcCall) {
          aiJson.atcCall = `Mayday Mayday Mayday, ${type}, position ${lat.toFixed(2)}N ${lon.toFixed(2)}E, requesting immediate diversion to ${aiJson.chosenAirport.name}`;
        }

        if (!Array.isArray(aiJson.flightPathCoordinates) || aiJson.flightPathCoordinates.length < 2) {
          aiJson.flightPathCoordinates = [
            [lat, lon],
            [aiJson.chosenAirport.lat, aiJson.chosenAirport.lon],
          ];
        }

        // Activate emergency
        targetPosition = {
          lat: aiJson.chosenAirport.lat,
          lon: aiJson.chosenAirport.lon,
        };
        isEmergencyActive = true;
        emergencyDestination = aiJson.chosenAirport;

        console.log(` Emergency activated → ${aiJson.chosenAirport.name}`);

      } catch (err) {
        console.error(" Cohere AI failed:", err.message);

        const chosen = nearby[0];
        aiJson = {
          chosenAirport: chosen,
          reasoning: `Nearest suitable airport at ${chosen.distKm.toFixed(1)} km with ${chosen.runwayFt} ft runway`,
          checklist: [
            "1. Maintain aircraft control - wings level",
            "2. Declare emergency - squawk 7700 on 121.5 MHz",
            "3. Secure affected systems",
            "4. Begin descent to 10,000 ft MSL",
            "5. Reduce speed to single-engine best glide",
            "6. Request ATC vectors to nearest airport",
            "7. Configure for emergency approach",
            "8. Complete emergency landing checklist",
          ],
          flightPathCoordinates: [
            [lat, lon],
            [chosen.lat, chosen.lon],
          ],
          nearbyAirports: nearby,
          atcCall: `Mayday Mayday Mayday, ${type}, diverting to ${chosen.name}`,
        };

        targetPosition = { lat: chosen.lat, lon: chosen.lon };
        isEmergencyActive = true;
        emergencyDestination = chosen;
      }
    } else {
      console.warn(" No API key - using fallback");
      const chosen = nearby[0];
      aiJson = {
        chosenAirport: chosen,
        reasoning: "No AI available",
        checklist: [
          "1. Maintain control",
          "2. Declare emergency",
          "3. Divert to nearest airport",
        ],
        flightPathCoordinates: [[lat, lon], [chosen.lat, chosen.lon]],
        nearbyAirports: nearby,
        atcCall: `Mayday, diverting to ${chosen.name}`,
      };

      targetPosition = { lat: chosen.lat, lon: chosen.lon };
      isEmergencyActive = true;
      emergencyDestination = chosen;
    }

    io.emit("solutionUpdate", aiJson);
    return res.json(aiJson);

  } catch (err) {
    console.error("Emergency endpoint error:", err);
    return res.status(500).json({ error: "server error", message: err.message });
  }
});

server.listen(PORT, () =>
  console.log(` Server running on http://localhost:${PORT}`)
);
