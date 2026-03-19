import os
import sys
import ipaddress
from statistics import mean
from typing import Any, Dict, List

import uvicorn
import dns.resolver
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from icmplib import ping
from pydantic import BaseModel


def resolve_dist_path() -> str:
    if getattr(sys, "frozen", False):
        # PyInstaller runtime extraction path
        base_path = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
        return os.path.join(base_path, "dist")

    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")


DIST_PATH = resolve_dist_path()

# Create FastAPI app
app = FastAPI()

# Allow CORS for development (React localhost -> Python localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class NetworkProfile(BaseModel):
    host: str = "8.8.8.8"
    targets: List[str] = []
    samples: int = 8

# --- Network Logic ---

DEFAULT_GAME_TARGETS = [
    "api.steampowered.com",
    "steamcommunity.com",
    "auth.riotgames.com",
    "status.riotgames.com",
    "status.epicgames.com",
    "www.rocketleague.com",
    "rust.facepunch.com",
    "playrust.com",
    "1.1.1.1",
    "8.8.8.8",
    "9.9.9.9",
]


def is_valid_target(target: str) -> bool:
    cleaned = target.strip()
    if not cleaned:
        return False

    try:
        ipaddress.ip_address(cleaned)
        return True
    except ValueError:
        pass

    try:
        dns.resolver.resolve(cleaned, "A", lifetime=1.6)
        return True
    except Exception:
        return False


def build_candidate_pool(primary: str, extra_targets: List[str]) -> List[str]:
    ordered = [primary, *extra_targets, *DEFAULT_GAME_TARGETS]
    deduped = []
    seen = set()
    for item in ordered:
        candidate = item.strip()
        if candidate and candidate not in seen:
            seen.add(candidate)
            deduped.append(candidate)

    valid = [item for item in deduped if is_valid_target(item)]
    if not valid:
        return ["1.1.1.1", "8.8.8.8", "9.9.9.9"]
    return valid


def select_pass_targets(pool: List[str], pass_index: int, pass_size: int = 3) -> List[str]:
    if not pool:
        return []

    offset = (pass_index * pass_size) % len(pool)
    targets = []
    for i in range(min(pass_size, len(pool))):
        targets.append(pool[(offset + i) % len(pool)])
    return targets


def probe_host(host: str, samples: int) -> Dict[str, Any]:
    safe_samples = max(3, min(samples, 16))
    try:
        result = ping(
            host,
            count=safe_samples,
            interval=0.2,
            timeout=1.8,
            privileged=False,
        )

        pings = [float(value) for value in result.rtts]
        if not pings:
            return {
                "host": host,
                "reachable": False,
                "ping": 0.0,
                "jitter": 0.0,
                "packet_loss": 100.0,
                "p95": 0.0,
                "samples": [],
            }

        pings_sorted = sorted(pings)
        p95_index = max(0, int(len(pings_sorted) * 0.95) - 1)
        return {
            "host": host,
            "reachable": True,
            "ping": round(float(result.avg_rtt), 1),
            "jitter": round(float(result.jitter), 1),
            "packet_loss": round(float(result.packet_loss), 1),
            "p95": round(float(pings_sorted[p95_index]), 1),
            "samples": [round(v, 1) for v in pings],
        }
    except Exception:
        return {
            "host": host,
            "reachable": False,
            "ping": 0.0,
            "jitter": 0.0,
            "packet_loss": 100.0,
            "p95": 0.0,
            "samples": [],
        }


def score_quality(ping_ms: float, jitter_ms: float, packet_loss: float) -> int:
    score = 100
    score -= min(50, int(ping_ms / 2.2))
    score -= min(25, int(jitter_ms * 1.4))
    score -= min(30, int(packet_loss * 1.5))
    return max(0, min(100, score))


def status_from_score(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Fair"
    return "Poor"


def recommendation_from_metrics(ping_ms: float, jitter_ms: float, packet_loss: float) -> str:
    if packet_loss >= 2:
        return "Packet loss is noticeable. Use wired Ethernet and close background downloads."
    if jitter_ms >= 15:
        return "Jitter is high. Reduce concurrent traffic and select a closer region/server."
    if ping_ms >= 70:
        return "Latency is elevated. Try another game region or improve ISP routing path."
    return "Connection quality is stable for competitive play. Keep this setup for best results."


def run_three_pass_verification(primary: str, extra_targets: List[str], samples: int) -> Dict[str, Any]:
    pool = build_candidate_pool(primary, extra_targets)
    pass_reports: List[Dict[str, Any]] = []
    winners: List[Dict[str, Any]] = []

    for pass_index in range(3):
        targets = select_pass_targets(pool, pass_index, pass_size=3)
        probes = [probe_host(target, samples) for target in targets]

        reachable = [item for item in probes if item["reachable"]]
        winner = min(reachable, key=lambda item: item["ping"]) if reachable else None
        if winner:
            winners.append(winner)

        pass_reports.append(
            {
                "pass": pass_index + 1,
                "targets": targets,
                "probes": probes,
                "winner": winner["host"] if winner else None,
            }
        )

    if not winners:
        return {
            "ping": 0.0,
            "jitter": 0.0,
            "packetLoss": 100.0,
            "p95": 0.0,
            "spikeRate": 100.0,
            "bufferbloat": 0.0,
            "score": 0,
            "status": "Poor",
            "recommendation": "No game server targets are reachable right now.",
            "testedHost": primary,
            "verification": {"passes": pass_reports},
        }

    ping_values = [float(item["ping"]) for item in winners]
    jitter_values = [float(item["jitter"]) for item in winners]
    loss_values = [float(item["packet_loss"]) for item in winners]
    p95_values = [float(item["p95"]) for item in winners]

    final_ping = round(mean(ping_values), 1)
    final_jitter = round(mean(jitter_values), 1)
    final_loss = round(mean(loss_values), 1)
    final_p95 = round(max(p95_values), 1)
    final_bufferbloat = round(max(0.0, final_p95 - final_ping), 1)

    spikes = sum(1 for value in ping_values if value > max(80.0, final_ping * 1.5))
    spike_rate = round((spikes / len(ping_values)) * 100.0, 1)

    score = score_quality(final_ping, final_jitter, final_loss)
    status = status_from_score(score)
    recommendation = recommendation_from_metrics(final_ping, final_jitter, final_loss)

    best_winner = min(winners, key=lambda item: item["ping"])
    return {
        "ping": final_ping,
        "jitter": final_jitter,
        "packetLoss": final_loss,
        "p95": final_p95,
        "spikeRate": spike_rate,
        "bufferbloat": final_bufferbloat,
        "score": score,
        "status": status,
        "recommendation": recommendation,
        "testedHost": best_winner["host"],
        "verification": {"passes": pass_reports},
    }

# --- API Endpoints ---
@app.get("/api/status")
def read_root():
    return {"status": "Online", "service": "Esports Monitor Backend"}

@app.post("/api/start-test")
def start_test(profile: NetworkProfile):
    final_results = run_three_pass_verification(
        primary=profile.host,
        extra_targets=profile.targets,
        samples=profile.samples,
    )

    return {
        "status": "Finished",
        "results": final_results,
    }

# Mount static files at root AFTER API routes
# This serves the React App
if os.path.exists(DIST_PATH):
    app.mount("/", StaticFiles(directory=DIST_PATH, html=True), name="static")
else:
    print(f"Warning: Dist folder not found at {DIST_PATH}")

def start_server(host="127.0.0.1", port=8000):
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    start_server()
