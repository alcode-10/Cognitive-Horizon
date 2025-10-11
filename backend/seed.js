// server/seed.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Airport from "./models/model.js";

const MONGO_DB_URI = process.env.MONGO_DB_URI;
if (!MONGO_DB_URI) {
    console.error("Set MONGO_DB_URI in .env to run seed.js");
    process.exit(1);
}

const airports = [
    { name: "Indira Gandhi Intl", code: "DEL", lat: 28.5562, lon: 77.1000, runwayFt: 12192 },
    { name: "Chhatrapati Shivaji Intl", code: "BOM", lat: 19.0896, lon: 72.8656, runwayFt: 12467 },
    { name: "Kempegowda Intl", code: "BLR", lat: 13.1979, lon: 77.7066, runwayFt: 13000 },
    { name: "Rajiv Gandhi Intl", code: "HYD", lat: 17.2403, lon: 78.4294, runwayFt: 12800 },
    { name: "Chennai Intl", code: "MAA", lat: 12.9941, lon: 80.1709, runwayFt: 12329 },
    { name: "Sardar Vallabhbhai Patel Intl", code: "AMD", lat: 23.0770, lon: 72.6347, runwayFt: 9843 },
    { name: "Cochin Intl", code: "COK", lat: 10.1520, lon: 76.4019, runwayFt: 10335 },
    { name: "Indira Gandhi Intl", code: "DEL", lat: 28.5562, lon: 77.1000, runwayFt: 12192 },
    { name: "Jaipur Intl", code: "JAI", lat: 26.8242, lon: 75.8122, runwayFt: 3658 },
    { name: "Agra", code: "AGR", lat: 27.1767, lon: 78.0081, runwayFt: 2743 },
    { name: "Lucknow", code: "LKO", lat: 26.7611, lon: 80.8890, runwayFt: 3086 },
    { name: "Varanasi", code: "VNS", lat: 25.4524, lon: 82.8593, runwayFt: 2960 },
    { name: "Chandigarh", code: "IXC", lat: 30.6735, lon: 76.7883, runwayFt: 3048 },
    { name: "Goa Intl", code: "GOI", lat: 15.3800, lon: 73.8316, runwayFt: 9990 },
    { name: "Trivandrum Intl", code: "TRV", lat: 8.4820, lon: 76.9205, runwayFt: 9884 },
    { name: "Pune Intl", code: "PNQ", lat: 18.5820, lon: 73.9197, runwayFt: 9750 },
    { name: "Patna", code: "PAT", lat: 25.5913, lon: 85.0876, runwayFt: 8930 },
    { name: "Bhuj", code: "BHJ", lat: 23.2863, lon: 69.6702, runwayFt: 8200 },
    { name: "Mangaluru Intl", code: "IXE", lat: 12.9636, lon: 74.8909, runwayFt: 9250 },
];


async function run() {
    await mongoose.connect(MONGO_DB_URI);
    console.log("connected to mongo");
    await Airport.deleteMany({});
    await Airport.insertMany(airports);
    console.log("seeded airports");
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
