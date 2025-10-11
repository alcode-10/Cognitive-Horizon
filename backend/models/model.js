// server/models/airportModel.js
import mongoose from "mongoose";

const AirportSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    runwayFt: { type: Number },
});

const Airport = mongoose.models.Airport || mongoose.model("Airport", AirportSchema);
export default Airport;
