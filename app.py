"""
Smart Campus Net-Zero Command Center
Flask Backend with Mock IoT Simulator
─────────────────────────────────────
Works in two modes:
  1. MongoDB mode   — if MONGO_URI is reachable, data persists in MongoDB
  2. In-Memory mode — automatic fallback; all data lives in Python lists/dicts
"""

import math
import os
import random
import threading
import time
from collections import deque
from datetime import datetime, timedelta

import numpy as np
import requests as http_requests          # for weather API
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.linear_model import LinearRegression

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB = os.getenv("MONGO_DB", "smart_campus")
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

SIMULATOR_INTERVAL_SECONDS = 5
SURGE_THRESHOLD_KW = 500

# ---------------------------------------------------------------------------
# Flask App
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Storage — MongoDB or In-Memory
# ---------------------------------------------------------------------------
USE_MONGO = False
mongo_client = None
mongo_db = None
blocks_col = None
energy_col = None
kpi_col = None

# In-memory fallback stores
MEM_BLOCKS = []
MEM_ENERGY = deque(maxlen=5000)
MEM_KPIS = {}
_mem_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Battery Storage Simulation State
# ---------------------------------------------------------------------------
_battery = {
    "capacity_kwh": 200,           # total capacity
    "soc_pct": 65.0,               # state of charge (%)
    "max_charge_kw": 50,
    "max_discharge_kw": 60,
    "current_kw": 0.0,             # +ve = discharging, -ve = charging
}
_battery_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Weather Cache  (to avoid hammering the free API every 5 s)
# ---------------------------------------------------------------------------
_weather_cache = {"data": None, "lat": None, "lon": None, "ts": 0}
WEATHER_CACHE_TTL = 120            # seconds


def _try_connect_mongo():
    """Attempt to connect to MongoDB. Returns True on success."""
    global USE_MONGO, mongo_client, mongo_db, blocks_col, energy_col, kpi_col
    if not MONGO_URI:
        return False
    try:
        from pymongo import MongoClient, DESCENDING
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        mongo_client.admin.command("ping")
        mongo_db = mongo_client[MONGO_DB]
        blocks_col = mongo_db["Campus_Blocks"]
        energy_col = mongo_db["Energy_Logs"]
        kpi_col = mongo_db["Daily_KPIs"]
        energy_col.create_index([("Timestamp", DESCENDING)])
        energy_col.create_index([("Block_ID", 1), ("Timestamp", DESCENDING)])
        kpi_col.create_index([("Date", DESCENDING)], unique=True)
        blocks_col.create_index([("Name", 1)], unique=True)
        USE_MONGO = True
        print("[Setup] Connected to MongoDB")
        return True
    except Exception as exc:
        print(f"[Setup] MongoDB unavailable ({exc})")
        print("[Setup] -> Using IN-MEMORY storage. Dashboard works with simulated data.")
        USE_MONGO = False
        return False


# ---------------------------------------------------------------------------
# Block Profiles
# ---------------------------------------------------------------------------
BLOCK_SEEDS = [
    {"_id": "block_engineering", "Name": "Engineering", "Square_Footage": 45000},
    {"_id": "block_library",     "Name": "Library",     "Square_Footage": 30000},
    {"_id": "block_cafeteria",   "Name": "Cafeteria",   "Square_Footage": 12000},
]

BLOCK_PROFILES = {
    "Engineering": {"base_grid_kw": 120, "solar_capacity_kw": 80, "base_hvac_kw": 60},
    "Library":     {"base_grid_kw": 55,  "solar_capacity_kw": 40, "base_hvac_kw": 30},
    "Cafeteria":   {"base_grid_kw": 70,  "solar_capacity_kw": 20, "base_hvac_kw": 25},
}


def _seed_blocks():
    if USE_MONGO:
        for s in BLOCK_SEEDS:
            if not blocks_col.find_one({"Name": s["Name"]}):
                blocks_col.insert_one({"Name": s["Name"], "Square_Footage": s["Square_Footage"]})
        print(f"[Setup] Blocks seeded in MongoDB ({blocks_col.count_documents({})}).")
    else:
        MEM_BLOCKS.clear()
        for s in BLOCK_SEEDS:
            MEM_BLOCKS.append(dict(s))
        print(f"[Setup] Blocks seeded in memory ({len(MEM_BLOCKS)}).")


# ---------------------------------------------------------------------------
# Energy Generation Helpers
# ---------------------------------------------------------------------------
def _solar_factor(hour):
    if hour < 6 or hour >= 19:
        return 0.0
    return max(0.0, round(math.exp(-0.5 * ((hour - 13) / 3) ** 2), 3))


def _hvac_factor(hour):
    if 12 <= hour <= 15:
        return random.uniform(1.4, 1.8)
    elif 9 <= hour <= 17:
        return random.uniform(0.9, 1.3)
    elif 6 <= hour <= 8 or 18 <= hour <= 21:
        return random.uniform(0.5, 0.8)
    else:
        return random.uniform(0.3, 0.5)


def _occupancy_factor(hour):
    if 9 <= hour <= 17:
        return random.uniform(0.9, 1.2)
    elif 7 <= hour <= 8 or 18 <= hour <= 21:
        return random.uniform(0.5, 0.8)
    else:
        return random.uniform(0.15, 0.35)


def generate_energy_reading(block_name, now):
    profile = BLOCK_PROFILES[block_name]
    hour = now.hour

    solar_kw = profile["solar_capacity_kw"] * _solar_factor(hour)
    solar_kw *= random.uniform(0.85, 1.10)
    solar_kw = max(0.0, round(solar_kw, 2))

    hvac_kw = profile["base_hvac_kw"] * _hvac_factor(hour)
    hvac_kw = round(hvac_kw, 2)

    grid_kw = profile["base_grid_kw"] * _occupancy_factor(hour)
    grid_kw += hvac_kw
    grid_kw -= solar_kw * random.uniform(0.6, 0.9)
    grid_kw += random.uniform(-5, 5)
    grid_kw = max(0.0, round(grid_kw, 2))

    return {
        "Grid_Power_Draw_kW": grid_kw,
        "Solar_Power_Generated_kW": solar_kw,
        "HVAC_Power_kW": hvac_kw,
    }


# ---------------------------------------------------------------------------
# IoT Simulator
# ---------------------------------------------------------------------------
def iot_simulator():
    print("[IoT Simulator] Starting ...")
    while True:
        try:
            now = datetime.now()
            if USE_MONGO:
                _simulate_mongo(now)
            else:
                _simulate_memory(now)
        except Exception as exc:
            print(f"[IoT Simulator] ERROR: {exc}")
        time.sleep(SIMULATOR_INTERVAL_SECONDS)


def _simulate_mongo(now):
    blocks = list(blocks_col.find())
    docs = []
    for block in blocks:
        reading = generate_energy_reading(block["Name"], now)
        docs.append({
            "Block_ID": str(block["_id"]),
            "Block_Name": block["Name"],
            "Timestamp": now,
            **reading,
        })
    if docs:
        energy_col.insert_many(docs)
    start = datetime(now.year, now.month, now.day)
    end = start + timedelta(days=1)
    pipe = [
        {"$match": {"Timestamp": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None,
                    "total_grid": {"$sum": "$Grid_Power_Draw_kW"},
                    "total_solar": {"$sum": "$Solar_Power_Generated_kW"}}},
    ]
    result = list(energy_col.aggregate(pipe))
    if result:
        g_kwh = (result[0]["total_grid"] * SIMULATOR_INTERVAL_SECONDS) / 3600
        s_kwh = (result[0]["total_solar"] * SIMULATOR_INTERVAL_SECONDS) / 3600
        ds = now.strftime("%Y-%m-%d")
        kpi_col.update_one({"Date": ds}, {"$set": {"Date": ds,
                           "Total_Carbon_Emissions": round(g_kwh * 0.82, 2),
                           "Net_Savings_INR": round(s_kwh * 6.50, 2)}}, upsert=True)
    print(f"[IoT] {now.strftime('%H:%M:%S')} — {len(docs)} readings -> MongoDB")


def _simulate_memory(now):
    with _mem_lock:
        for block in MEM_BLOCKS:
            reading = generate_energy_reading(block["Name"], now)
            MEM_ENERGY.append({
                "Block_ID": block["_id"],
                "Block_Name": block["Name"],
                "Timestamp": now,
                **reading,
            })
    print(f"[IoT] {now.strftime('%H:%M:%S')} — {len(MEM_BLOCKS)} readings -> Memory ({len(MEM_ENERGY)} total)")


# ---------------------------------------------------------------------------
# Memory helpers
# ---------------------------------------------------------------------------
def _mem_get_blocks():
    return list(MEM_BLOCKS)


def _mem_latest_per_block():
    latest = {}
    with _mem_lock:
        for log in reversed(MEM_ENERGY):
            bid = log["Block_ID"]
            if bid not in latest:
                latest[bid] = log
            if len(latest) == len(MEM_BLOCKS):
                break
    return latest


def _mem_recent_logs(n=100):
    with _mem_lock:
        items = list(MEM_ENERGY)
    return items[-n:]


def _get_today_logs(now):
    start = datetime(now.year, now.month, now.day)
    if USE_MONGO:
        end = start + timedelta(days=1)
        return list(energy_col.find({"Timestamp": {"$gte": start, "$lt": end}}))
    with _mem_lock:
        return [lg for lg in MEM_ENERGY if lg["Timestamp"] >= start]


# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({
        "service": "Smart Campus Net-Zero Command Center",
        "storage": "MongoDB" if USE_MONGO else "In-Memory",
        "status": "running",
        "endpoints": ["/blocks", "/energy-logs", "/api/live-status",
                      "/api/kpis", "/api/overview", "/api/renewable-mix",
                      "/api/predict-surge"],
    })


@app.route("/blocks")
def get_blocks():
    if USE_MONGO:
        blocks = list(blocks_col.find())
        for b in blocks:
            b["_id"] = str(b["_id"])
        return jsonify(blocks)
    return jsonify(_mem_get_blocks())


@app.route("/energy-logs")
def get_energy_logs():
    logs = _mem_recent_logs(100) if not USE_MONGO else list(
        energy_col.find().sort("Timestamp", -1).limit(100))
    result = []
    for lg in logs:
        entry = dict(lg)
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
        entry["Timestamp"] = entry["Timestamp"].isoformat()
        result.append(entry)
    return jsonify(result)


@app.route("/latest-readings")
def get_latest_readings():
    if USE_MONGO:
        from pymongo import DESCENDING as DESC
        blocks = list(blocks_col.find())
        result = []
        for block in blocks:
            log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
            if log:
                log["_id"] = str(log["_id"])
                log["Timestamp"] = log["Timestamp"].isoformat()
                log["Block_Name"] = block["Name"]
                result.append(log)
        return jsonify(result)
    latest = _mem_latest_per_block()
    return jsonify([{**v, "Timestamp": v["Timestamp"].isoformat()} for v in latest.values()])


# ── /api/live-status ──────────────────────────────────────────
@app.route("/api/live-status")
def api_live_status():
    if USE_MONGO:
        from pymongo import DESCENDING as DESC
        blocks = list(blocks_col.find())
        payload = []
        for block in blocks:
            log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
            if log:
                payload.append({
                    "Block_ID": str(block["_id"]),
                    "Block_Name": block["Name"],
                    "Square_Footage": block["Square_Footage"],
                    "Timestamp": log["Timestamp"].isoformat(),
                    "Grid_Power_Draw_kW": round(log["Grid_Power_Draw_kW"], 2),
                    "Solar_Power_Generated_kW": round(log["Solar_Power_Generated_kW"], 2),
                    "HVAC_Power_kW": round(log["HVAC_Power_kW"], 2),
                    "Net_Power_kW": round(log["Grid_Power_Draw_kW"] - log["Solar_Power_Generated_kW"], 2),
                })
        return jsonify({"status": "ok", "blocks": payload})

    # Memory mode
    latest = _mem_latest_per_block()
    payload = []
    for block in MEM_BLOCKS:
        log = latest.get(block["_id"])
        if log:
            payload.append({
                "Block_ID": block["_id"],
                "Block_Name": block["Name"],
                "Square_Footage": block["Square_Footage"],
                "Timestamp": log["Timestamp"].isoformat(),
                "Grid_Power_Draw_kW": round(log["Grid_Power_Draw_kW"], 2),
                "Solar_Power_Generated_kW": round(log["Solar_Power_Generated_kW"], 2),
                "HVAC_Power_kW": round(log["HVAC_Power_kW"], 2),
                "Net_Power_kW": round(log["Grid_Power_Draw_kW"] - log["Solar_Power_Generated_kW"], 2),
            })
    return jsonify({"status": "ok", "blocks": payload})


# ── /api/kpis ─────────────────────────────────────────────────
@app.route("/api/kpis")
def api_kpis():
    now = datetime.now()
    today_logs = _get_today_logs(now)

    total_grid_kw = sum(lg["Grid_Power_Draw_kW"] for lg in today_logs)
    total_solar_kw = sum(lg["Solar_Power_Generated_kW"] for lg in today_logs)
    count = len(today_logs)

    grid_kwh = (total_grid_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
    solar_kwh = (total_solar_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
    total_kwh = grid_kwh + solar_kwh

    return jsonify({
        "status": "ok",
        "date": now.strftime("%Y-%m-%d"),
        "readings_today": count,
        "Total_Carbon_Offset_kg": round(solar_kwh * 0.82, 2),
        "Grid_Independence_Pct": round((solar_kwh / total_kwh * 100), 2) if total_kwh > 0 else 0.0,
        "Financial_Savings_INR": round(solar_kwh * 6.50, 2),
    })


# ── /api/overview ─────────────────────────────────────────────
@app.route("/api/overview")
def api_overview():
    """Comprehensive overview — works with both MongoDB and in-memory data."""
    try:
        now = datetime.now()
        today_logs = _get_today_logs(now)

        # 1. Block-level readings
        latest = {}
        if USE_MONGO:
            from pymongo import DESCENDING as DESC
            for block in blocks_col.find():
                log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
                if log:
                    latest[block["Name"]] = {"log": log, "sqft": block.get("Square_Footage", 1)}
        else:
            latest_per_block = _mem_latest_per_block()
            for block in MEM_BLOCKS:
                log = latest_per_block.get(block["_id"])
                if log:
                    latest[block["Name"]] = {"log": log, "sqft": block.get("Square_Footage", 1)}

        block_data = []
        total_grid = total_solar = total_hvac = total_sqft = 0

        for name, info in latest.items():
            log = info["log"]
            sqft = info["sqft"]
            grid = log.get("Grid_Power_Draw_kW", 0)
            solar = log.get("Solar_Power_Generated_kW", 0)
            hvac = log.get("HVAC_Power_kW", 0)
            total_grid += grid
            total_solar += solar
            total_hvac += hvac
            total_sqft += sqft

            eui = (grid / sqft) * 1000 if sqft else 0
            eff_score = max(0, min(100, round(100 - eui * 15)))

            block_data.append({
                "name": name,
                "grid_kw": round(grid, 2),
                "solar_kw": round(solar, 2),
                "hvac_kw": round(hvac, 2),
                "sqft": sqft,
                "efficiency_score": eff_score,
                "eui": round(eui, 2),
            })

        # 2. Day aggregated KPIs
        sum_grid = sum(lg["Grid_Power_Draw_kW"] for lg in today_logs)
        sum_solar = sum(lg["Solar_Power_Generated_kW"] for lg in today_logs)
        max_grid = max((lg["Grid_Power_Draw_kW"] for lg in today_logs), default=0)

        day_grid_kwh = (sum_grid * SIMULATOR_INTERVAL_SECONDS) / 3600
        day_solar_kwh = (sum_solar * SIMULATOR_INTERVAL_SECONDS) / 3600
        day_total_kwh = day_grid_kwh + day_solar_kwh
        renewable_pct = round((day_solar_kwh / day_total_kwh * 100), 1) if day_total_kwh > 0 else 0
        carbon_saved_kg = round(day_solar_kwh * 0.82, 2)
        savings_inr = round(day_solar_kwh * 6.50, 2)

        # Peak demand
        peak_demand_kw = round(max_grid, 2)
        peak_log = max(today_logs, key=lambda x: x["Grid_Power_Draw_kW"]) if today_logs else None
        peak_demand_time = peak_log["Timestamp"].strftime("%H:%M") if peak_log else now.strftime("%H:%M")

        # 3. Net-Zero Score
        net_zero_progress = min(100, round(
            renewable_pct * 1.3 +
            (100 - (total_grid / max(total_sqft, 1)) * 500) * 0.2, 1))
        net_zero_progress = max(0, net_zero_progress)

        avg_eff = (sum(b["efficiency_score"] for b in block_data) / max(len(block_data), 1))
        sus_score = min(100, round(
            renewable_pct * 0.4 +
            min(50, carbon_saved_kg / 5) * 0.3 +
            avg_eff * 0.3))

        if sus_score >= 90: grade = "A+"
        elif sus_score >= 80: grade = "A"
        elif sus_score >= 70: grade = "B+"
        elif sus_score >= 60: grade = "B"
        elif sus_score >= 50: grade = "C"
        else: grade = "D"

        # 4. Hourly Energy Profile
        hourly_buckets = {}
        for lg in today_logs:
            h = lg["Timestamp"].hour
            if h not in hourly_buckets:
                hourly_buckets[h] = {"grid": [], "solar": [], "hvac": []}
            hourly_buckets[h]["grid"].append(lg["Grid_Power_Draw_kW"])
            hourly_buckets[h]["solar"].append(lg["Solar_Power_Generated_kW"])
            hourly_buckets[h]["hvac"].append(lg["HVAC_Power_kW"])

        hourly_profile = []
        for h in sorted(hourly_buckets.keys()):
            b = hourly_buckets[h]
            hourly_profile.append({
                "hour": f"{h:02d}:00",
                "grid": round(sum(b["grid"]) / len(b["grid"]), 1),
                "solar": round(sum(b["solar"]) / len(b["solar"]), 1),
                "hvac": round(sum(b["hvac"]) / len(b["hvac"]), 1),
            })

        # 5. Activity Feed
        recent = sorted(today_logs, key=lambda x: x["Timestamp"], reverse=True)[:20]
        activity_feed = []
        for lg in recent:
            gk = lg.get("Grid_Power_Draw_kW", 0)
            sk = lg.get("Solar_Power_Generated_kW", 0)
            bn = lg.get("Block_Name", "Unknown")
            ts = lg["Timestamp"].strftime("%H:%M:%S")
            if gk > 200:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"High grid draw: {gk:.0f} kW", "type": "warning"})
            elif sk > 50:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"Strong solar output: {sk:.0f} kW", "type": "success"})
            else:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"Normal — Grid: {gk:.0f} kW, Solar: {sk:.0f} kW", "type": "info"})

        # 6. Weather (simulated)
        hour = now.hour
        base_temp = 28 + 6 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else 22
        weather = {
            "temp_c": round(base_temp + random.uniform(-1, 1), 1),
            "humidity": round(55 + random.uniform(-10, 15)),
            "condition": random.choice(["Clear Sky", "Partly Cloudy", "Sunny", "Overcast"]),
            "wind_kmh": round(random.uniform(5, 20), 1),
            "solar_irradiance_w_m2": round(max(0, 800 * _solar_factor(hour) + random.uniform(-30, 30))),
        }

        return jsonify({
            "status": "ok",
            "timestamp": now.isoformat(),
            "storage_mode": "MongoDB" if USE_MONGO else "In-Memory",
            "net_zero_progress": net_zero_progress,
            "sustainability_score": sus_score,
            "sustainability_grade": grade,
            "carbon_saved_today_kg": carbon_saved_kg,
            "financial_savings_inr": savings_inr,
            "peak_demand_kw": peak_demand_kw,
            "peak_demand_time": peak_demand_time,
            "peak_target_kw": SURGE_THRESHOLD_KW,
            "renewable_pct": renewable_pct,
            "grid_pct": round(100 - renewable_pct, 1),
            "total_consumption_kwh": round(day_total_kwh, 1),
            "total_solar_kwh": round(day_solar_kwh, 1),
            "total_grid_kwh": round(day_grid_kwh, 1),
            "campus_eui": round((day_total_kwh / max(total_sqft, 1)) * 1000, 2),
            "blocks": block_data,
            "hourly_profile": hourly_profile,
            "weather": weather,
            "activity_feed": activity_feed[:15],
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(exc)}), 500



# ── Weather Fetch (Open-Meteo — free, no API key) ────────────
def _fetch_weather(lat, lon):
    """Return current weather dict from Open-Meteo or a simulation fallback."""
    global _weather_cache
    now_ts = time.time()

    # Return cache if fresh enough AND coords roughly same
    if (_weather_cache["data"]
            and abs((lat or 0) - (_weather_cache["lat"] or 0)) < 0.05
            and abs((lon or 0) - (_weather_cache["lon"] or 0)) < 0.05
            and (now_ts - _weather_cache["ts"]) < WEATHER_CACHE_TTL):
        return _weather_cache["data"]

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,"
            f"cloud_cover,wind_speed_10m,weather_code"
        )
        resp = http_requests.get(url, timeout=5)
        resp.raise_for_status()
        j = resp.json().get("current", {})

        wmo = j.get("weather_code", 0)
        if wmo == 0:
            condition = "Clear Sky"
        elif wmo <= 3:
            condition = "Partly Cloudy"
        elif wmo <= 48:
            condition = "Foggy"
        elif wmo <= 67:
            condition = "Rainy"
        elif wmo <= 77:
            condition = "Snowy"
        elif wmo <= 82:
            condition = "Showers"
        elif wmo <= 99:
            condition = "Thunderstorm"
        else:
            condition = "Unknown"

        data = {
            "source": "live",
            "temp_c": j.get("temperature_2m", 28),
            "humidity_pct": j.get("relative_humidity_2m", 55),
            "cloud_cover_pct": j.get("cloud_cover", 0),
            "wind_kmh": j.get("wind_speed_10m", 10),
            "condition": condition,
        }
        _weather_cache = {"data": data, "lat": lat, "lon": lon, "ts": now_ts}
        return data

    except Exception as exc:
        print(f"[Weather] API error ({exc}) — using simulation")
        hour = datetime.now().hour
        cloud = random.randint(10, 80)
        data = {
            "source": "simulated",
            "temp_c": round(28 + 6 * math.sin(math.pi * max(0, hour - 6) / 12) + random.uniform(-1, 1), 1),
            "humidity_pct": round(55 + random.uniform(-10, 15)),
            "cloud_cover_pct": cloud,
            "wind_kmh": round(random.uniform(5, 20), 1),
            "condition": "Partly Cloudy" if cloud < 50 else "Overcast",
        }
        _weather_cache = {"data": data, "lat": lat, "lon": lon, "ts": now_ts}
        return data


# ── Battery Simulation Tick ───────────────────────────────────
def _battery_tick(total_solar_kw, total_grid_kw):
    """Update battery state-of-charge based on current generation vs demand."""
    with _battery_lock:
        excess_solar = total_solar_kw - total_grid_kw * 0.3  # surplus threshold
        if excess_solar > 5:
            # Charge the battery
            charge_kw = min(excess_solar * 0.6, _battery["max_charge_kw"])
            delta_kwh = (charge_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
            new_soc = _battery["soc_pct"] + (delta_kwh / _battery["capacity_kwh"]) * 100
            _battery["soc_pct"] = min(100.0, round(new_soc, 2))
            _battery["current_kw"] = -round(charge_kw, 2)  # negative = charging
        elif total_grid_kw > total_solar_kw * 1.5 and _battery["soc_pct"] > 10:
            # Discharge the battery to help
            discharge_kw = min(
                (total_grid_kw - total_solar_kw) * 0.4,
                _battery["max_discharge_kw"],
            )
            delta_kwh = (discharge_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
            new_soc = _battery["soc_pct"] - (delta_kwh / _battery["capacity_kwh"]) * 100
            _battery["soc_pct"] = max(0.0, round(new_soc, 2))
            _battery["current_kw"] = round(discharge_kw, 2)  # positive = discharging
        else:
            _battery["current_kw"] = 0.0

        return dict(_battery)


# ── /api/renewable-mix ────────────────────────────────────────
@app.route("/api/renewable-mix")
def api_renewable_mix():
    """
    Energy-Mix Visualiser endpoint.
    Accepts ?lat=XX&lon=YY for live-location weather integration.
    Returns:  grid kW, solar kW (weather-adjusted), battery kW, weather info.
    """
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)

        # ── Weather ──
        if lat is not None and lon is not None:
            weather = _fetch_weather(lat, lon)
        else:
            weather = {
                "source": "default",
                "temp_c": 30,
                "humidity_pct": 55,
                "cloud_cover_pct": 25,
                "wind_kmh": 12,
                "condition": "Partly Cloudy",
            }

        cloud_pct = weather.get("cloud_cover_pct", 0)
        solar_multiplier = max(0.05, (100 - cloud_pct) / 100)

        # ── Latest readings ──
        if USE_MONGO:
            from pymongo import DESCENDING as DESC
            blocks = list(blocks_col.find())
            latest_map = {}
            for b in blocks:
                log = energy_col.find_one(
                    {"Block_ID": str(b["_id"])}, sort=[("Timestamp", DESC)]
                )
                if log:
                    latest_map[b["Name"]] = log
        else:
            latest_per = _mem_latest_per_block()
            latest_map = {}
            for b in MEM_BLOCKS:
                lg = latest_per.get(b["_id"])
                if lg:
                    latest_map[b["Name"]] = lg

        total_grid = sum(lg["Grid_Power_Draw_kW"] for lg in latest_map.values())
        raw_solar = sum(lg["Solar_Power_Generated_kW"] for lg in latest_map.values())
        adjusted_solar = round(raw_solar * solar_multiplier, 2)

        # ── Battery tick ──
        bat = _battery_tick(adjusted_solar, total_grid)
        battery_kw = bat["current_kw"]  # +ve = discharging to grid

        # Net grid after solar & battery offset
        net_grid = max(0, round(total_grid - adjusted_solar - max(0, battery_kw), 2))

        # Per-block detail
        block_detail = []
        for name, lg in latest_map.items():
            raw_s = lg["Solar_Power_Generated_kW"]
            adj_s = round(raw_s * solar_multiplier, 2)
            block_detail.append({
                "name": name,
                "grid_kw": round(lg["Grid_Power_Draw_kW"], 2),
                "solar_raw_kw": round(raw_s, 2),
                "solar_adjusted_kw": adj_s,
                "hvac_kw": round(lg["HVAC_Power_kW"], 2),
            })

        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "weather": weather,
            "solar_multiplier": round(solar_multiplier, 3),
            "energy_mix": {
                "grid_kw": round(net_grid, 2),
                "solar_kw": round(adjusted_solar, 2),
                "battery_kw": round(battery_kw, 2),
                "total_demand_kw": round(total_grid, 2),
            },
            "battery": {
                "soc_pct": bat["soc_pct"],
                "capacity_kwh": bat["capacity_kwh"],
                "current_kw": bat["current_kw"],
                "status": "Charging" if bat["current_kw"] < 0
                          else "Discharging" if bat["current_kw"] > 0
                          else "Idle",
            },
            "blocks": block_detail,
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(exc)}), 500


# ── /api/predict-surge ────────────────────────────────────────
@app.route("/api/predict-surge")
def api_predict_surge():
    try:
        if USE_MONGO:
            logs = list(energy_col.find().sort("Timestamp", -1).limit(100))
        else:
            logs = _mem_recent_logs(100)

        if len(logs) < 10:
            return jsonify({
                "status": "ok",
                "model": "LinearRegression",
                "data_points_used": len(logs),
                "predicted_Grid_Power_Draw_kW": 0,
                "prediction_horizon": "1 hour",
                "surge_threshold_kW": SURGE_THRESHOLD_KW,
                "anomaly_alert": False,
                "message": f"Accumulating data ({len(logs)}/10 readings so far).",
            })

        logs_sorted = sorted(logs, key=lambda x: x["Timestamp"])
        base_ts = logs_sorted[0]["Timestamp"].timestamp()

        X = np.array([
            [(lg["Timestamp"].timestamp() - base_ts) / 3600,
             lg["HVAC_Power_kW"],
             lg["Solar_Power_Generated_kW"]]
            for lg in logs_sorted
        ])
        y = np.array([lg["Grid_Power_Draw_kW"] for lg in logs_sorted])

        model = LinearRegression()
        model.fit(X, y)

        last = logs_sorted[-1]
        future_hours = (last["Timestamp"].timestamp() - base_ts) / 3600 + 1.0
        X_pred = np.array([[future_hours, last["HVAC_Power_kW"], last["Solar_Power_Generated_kW"]]])
        predicted_kw = round(float(model.predict(X_pred)[0]), 2)

        is_surge = predicted_kw > SURGE_THRESHOLD_KW
        response = {
            "status": "ok",
            "model": "LinearRegression",
            "data_points_used": len(logs_sorted),
            "predicted_Grid_Power_Draw_kW": predicted_kw,
            "prediction_horizon": "1 hour",
            "surge_threshold_kW": SURGE_THRESHOLD_KW,
            "anomaly_alert": is_surge,
        }
        if is_surge:
            response["alert"] = {
                "severity": "HIGH",
                "message": (f"Predicted grid draw of {predicted_kw} kW exceeds "
                            f"the {SURGE_THRESHOLD_KW} kW threshold. "
                            "Consider activating demand-response protocols."),
                "recommended_actions": [
                    "Shift non-critical loads to off-peak",
                    "Increase battery discharge rate",
                    "Pre-cool buildings to reduce upcoming HVAC demand",
                ],
            }
        return jsonify(response)

    except Exception as exc:
        return jsonify({
            "status": "ok",
            "model": "LinearRegression",
            "data_points_used": 0,
            "predicted_Grid_Power_Draw_kW": 0,
            "prediction_horizon": "1 hour",
            "surge_threshold_kW": SURGE_THRESHOLD_KW,
            "anomaly_alert": False,
            "message": f"Prediction unavailable: {exc}",
        })


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
def initialise():
    _try_connect_mongo()
    _seed_blocks()

    simulator_thread = threading.Thread(target=iot_simulator, daemon=True)
    simulator_thread.start()
    print("[Setup] IoT simulator thread launched.")
    print(f"[Setup] Storage: {'MongoDB' if USE_MONGO else 'In-Memory (no DB needed)'}")
    print(f"[Setup] Server: http://{FLASK_HOST}:{FLASK_PORT}")


if __name__ == "__main__":
    initialise()
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False)
