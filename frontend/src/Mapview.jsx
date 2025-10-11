import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Plane Icon
const planeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/13696/13696909.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Airport Icon
const airportIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Emergency Airport Icon
const emergencyAirportIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/190/190411.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const AnimatedMarker = ({ position }) => {
  const markerRef = useRef(null);
  const map = useMap();
  const previousPosition = useRef(null);

  useEffect(() => {
    if (markerRef.current && position) {
      const newLatLng = L.latLng(position[0], position[1]);

      if (previousPosition.current) {
        const distance = previousPosition.current.distanceTo(newLatLng);
        if (distance < 50000) { // Threshold for smooth animation vs. jump
          markerRef.current.setLatLng(newLatLng);
          map.flyTo(newLatLng, map.getZoom(), {
            animate: true,
            duration: 1.8,
            easeLinearity: 0.25,
          });
        } else {
          markerRef.current.setLatLng(newLatLng);
          map.setView(newLatLng, map.getZoom());
        }
      } else {
        markerRef.current.setLatLng(newLatLng);
        map.setView(newLatLng, map.getZoom());
      }

      previousPosition.current = newLatLng;
    }
  }, [position, map]);

  if (!position || !Array.isArray(position) || position.length < 2) return null;

  return (
    <Marker ref={markerRef} position={position} icon={planeIcon}>
      <Popup>
        <div>
          <b>Aircraft Position</b>
          <br />
          <strong>Lat:</strong> {position[0].toFixed(4)}
          <br />
          <strong>Lon:</strong> {position[1].toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
};

const MapView = ({ planePosition, aiResponse }) => {
  const center = planePosition
    ? [planePosition.lat, planePosition.lon]
    : [28.6139, 77.209];

  const validateCoordinates = (lat, lon) =>
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  const getAirportCoordinates = (airport) => {
    if (!airport) return null;
    const lat = airport.lat ?? airport.latitude;
    const lon = airport.lon ?? airport.lng ?? airport.longitude;
    return validateCoordinates(lat, lon) ? [lat, lon] : null;
  };


  const chosenAirportCoords = getAirportCoordinates(aiResponse?.chosenAirport);
  const planeCoords = planePosition ? [planePosition.lat, planePosition.lon] : null;

  // Manually construct the full flight path to ensure it's complete
  const flightPath = [];
  if (planeCoords && chosenAirportCoords) {
    // 1. Add the starting point (the plane)
    flightPath.push(planeCoords);

    // 2. Add any intermediate points from the AI (if they exist)
    if (aiResponse?.flightPathCoordinates && Array.isArray(aiResponse.flightPathCoordinates)) {
      const intermediatePoints = aiResponse.flightPathCoordinates
        .filter((coord) => Array.isArray(coord) && coord.length >= 2)
        .map(([lat, lon]) => [lat, lon]);
      flightPath.push(...intermediatePoints);
    }

    // 3. Add the final destination (the airport)
    flightPath.push(chosenAirportCoords);
  }

  const glideRadius =
    aiResponse?.glideDistanceKm && !isNaN(aiResponse.glideDistanceKm)
      ? aiResponse.glideDistanceKm * 1000
      : null;

  return (
    <MapContainer center={center} zoom={6} style={{ height: "100vh", width: "100vw" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {/* Plane Marker */}
      {planePosition && validateCoordinates(planePosition.lat, planePosition.lon) && (
        <AnimatedMarker position={[planePosition.lat, planePosition.lon]} />
      )}

      {glideRadius && planePosition && (
        <Circle
          center={[planePosition.lat, planePosition.lon]}
          radius={glideRadius}
          pathOptions={{ color: "yellow", fillColor: "orange", fillOpacity: 0.2 }}
        />
      )}

      {/* Emergency Flight Path */}
      {flightPath.length >= 2 && (
        <Polyline
          positions={flightPath}
          pathOptions={{
            color: "red",
            weight: 5,
            dashArray: "10, 10",
            opacity: 0.8,
          }}
        />
      )}

      {chosenAirportCoords && (
        <Marker position={chosenAirportCoords} icon={emergencyAirportIcon}>
          <Popup>
            <div>
              <b>{aiResponse.chosenAirport.name || "Emergency Airport"}</b>
              <br />
              <strong>Code:</strong> {aiResponse.chosenAirport.code || "N/A"}
              <br />
              <strong>Emergency Landing Site</strong>
              {aiResponse.chosenAirport.distKm && (
                <>
                  <br />
                  <strong>Distance:</strong> {aiResponse.chosenAirport.distKm.toFixed(1)} km
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {aiResponse?.nearbyAirports &&
        Array.isArray(aiResponse.nearbyAirports) &&
        aiResponse.nearbyAirports.map((airport, i) => {
          const coords = getAirportCoordinates(airport);
          if (!coords) return null;
          // Don't render a nearby airport if it's the chosen one
          if (aiResponse.chosenAirport && airport.code === aiResponse.chosenAirport.code) {
            return null;
          }

          return (
            <Marker key={`nearby-${i}-${airport.code || i}`} position={coords} icon={airportIcon}>
              <Popup>
                <div>
                  <b>{airport.name || "Unknown Airport"}</b>
                  {airport.code && (
                    <>
                      <br />
                      <strong>Code:</strong> {airport.code}
                    </>
                  )}
                  {typeof airport.distKm === "number" && (
                    <>
                      <br />
                      <strong>Distance:</strong> {airport.distKm.toFixed(1)} km
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
};

export default MapView;