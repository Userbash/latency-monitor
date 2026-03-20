use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::{sleep, timeout};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};

const DEFAULT_TARGET: &str = "8.8.8.8";
const DEFAULT_SAMPLES: usize = 8;
const MIN_SAMPLES: usize = 3;
const MAX_SAMPLES: usize = 16;
const PASS_COUNT: usize = 3;
const PASS_SIZE: usize = 3;
const MAX_TARGETS: usize = 24;
const CONNECT_TIMEOUT: Duration = Duration::from_millis(1800);
const SAMPLE_DELAY: Duration = Duration::from_millis(200);
const DEFAULT_PORT: u16 = 443;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct NetworkProfile {
    #[serde(default = "default_host")]
    host: String,
    #[serde(default)]
    targets: Vec<String>,
    #[serde(default = "default_samples")]
    samples: usize,
}

#[derive(Debug, Serialize)]
struct StatusResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Debug, Serialize)]
struct StartTestResponse {
    status: &'static str,
    results: NetworkResults,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProbeResult {
    host: String,
    reachable: bool,
    ping: f64,
    jitter: f64,
    packet_loss: f64,
    p95: f64,
    samples: Vec<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct PassReport {
    pass: usize,
    targets: Vec<String>,
    probes: Vec<ProbeResult>,
    winner: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct Verification {
    passes: Vec<PassReport>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkResults {
    ping: f64,
    jitter: f64,
    packet_loss: f64,
    p95: f64,
    spike_rate: f64,
    bufferbloat: f64,
    score: i32,
    status: String,
    recommendation: String,
    tested_host: String,
    verification: Verification,
}

fn default_host() -> String {
    DEFAULT_TARGET.to_string()
}

fn default_samples() -> usize {
    DEFAULT_SAMPLES
}

#[tokio::main]
async fn main() {
    let dist_path = std::env::var("DIST_PATH").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("dist"));

    let api = Router::new()
        .route("/api/status", get(read_status))
        .route("/api/start-test", post(start_test))
        .layer(CorsLayer::permissive());

    // Serve SPA assets when build output is present; keep pure-API mode for local backend-only runs.
    let app = if dist_path.exists() {
        let index_path = dist_path.join("index.html");
        let static_files = ServeDir::new(dist_path).fallback(ServeFile::new(index_path));
        api.fallback_service(static_files)
    } else {
        api
    };

    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|raw| raw.parse::<u16>().ok())
        .unwrap_or(8000);

    let addr: SocketAddr = format!("{host}:{port}").parse().expect("invalid HOST/PORT");
    println!("Starting Rust backend on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind TCP listener");

    axum::serve(listener, app).await.expect("server crashed");
}

async fn read_status() -> impl IntoResponse {
    Json(StatusResponse {
        status: "Online",
        service: "Esports Monitor Backend (Rust)",
    })
}

async fn start_test(Json(mut profile): Json<NetworkProfile>) -> impl IntoResponse {
    sanitize_profile(&mut profile);

    let results = run_three_pass_verification(profile.host, profile.targets, profile.samples).await;

    (
        StatusCode::OK,
        Json(StartTestResponse {
            status: "Finished",
            results,
        }),
    )
}

fn sanitize_profile(profile: &mut NetworkProfile) {
    // Normalize user input once so downstream probe logic can rely on bounded values.
    profile.host = normalize_host(&profile.host);
    profile.targets = sanitize_targets(&profile.targets);
    if profile.targets.is_empty() {
        profile.targets.push(profile.host.clone());
    }

    profile.samples = profile.samples.clamp(MIN_SAMPLES, MAX_SAMPLES);
}

fn normalize_host(raw_host: &str) -> String {
    let trimmed = raw_host.trim();
    if trimmed.is_empty() {
        DEFAULT_TARGET.to_string()
    } else {
        trimmed.to_string()
    }
}

fn sanitize_targets(raw_targets: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();

    // Keep target order stable, remove duplicates, and cap payload size.
    raw_targets
        .iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .filter(|item| seen.insert(item.clone()))
        .take(MAX_TARGETS)
        .collect()
}

async fn is_valid_target(target: &str) -> bool {
    let cleaned = target.trim();
    if cleaned.is_empty() {
        return false;
    }

    if cleaned.parse::<IpAddr>().is_ok() {
        return true;
    }

    let lookup_future = tokio::net::lookup_host((cleaned, DEFAULT_PORT));
    match timeout(Duration::from_millis(1600), lookup_future).await {
        Ok(Ok(mut resolved)) => resolved.next().is_some(),
        _ => false,
    }
}

fn default_game_targets() -> Vec<&'static str> {
    vec![
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
}

fn fallback_targets() -> Vec<String> {
    vec!["1.1.1.1".to_string(), "8.8.8.8".to_string(), "9.9.9.9".to_string()]
}

async fn build_candidate_pool(primary: &str, extra_targets: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut ordered = Vec::new();

    for item in std::iter::once(primary)
        .chain(extra_targets.iter().map(String::as_str))
        .chain(default_game_targets().into_iter())
    {
        let candidate = item.trim();
        if !candidate.is_empty() && seen.insert(candidate.to_string()) {
            ordered.push(candidate.to_string());
        }
    }

    // Validate all candidates upfront to avoid spending probe passes on known-invalid hosts.
    let mut valid = Vec::new();
    for candidate in ordered {
        if is_valid_target(&candidate).await {
            valid.push(candidate);
        }
    }

    if valid.is_empty() {
        fallback_targets()
    } else {
        valid
    }
}

fn select_pass_targets(pool: &[String], pass_index: usize, pass_size: usize) -> Vec<String> {
    if pool.is_empty() {
        return Vec::new();
    }

    // Rotate through the pool so each pass samples different targets while staying deterministic.
    let offset = (pass_index * pass_size) % pool.len();
    let take = pass_size.min(pool.len());

    (0..take)
        .map(|i| pool[(offset + i) % pool.len()].clone())
        .collect()
}

fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

fn calculate_p95(samples: &[f64]) -> f64 {
    if samples.is_empty() {
        return 0.0;
    }

    let mut sorted = samples.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));
    let index = ((sorted.len() as f64) * 0.95).floor() as usize;
    let safe_index = index.saturating_sub(1).min(sorted.len() - 1);
    round1(sorted[safe_index])
}

fn calculate_jitter(samples: &[f64]) -> f64 {
    if samples.len() < 2 {
        return 0.0;
    }

    let mut sum = 0.0;
    for i in 1..samples.len() {
        sum += (samples[i] - samples[i - 1]).abs();
    }

    round1(sum / (samples.len() as f64 - 1.0))
}

fn calculate_packet_loss(total: usize, successful: usize) -> f64 {
    if total == 0 {
        return 0.0;
    }

    round1(((total.saturating_sub(successful)) as f64 / total as f64) * 100.0)
}

fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        0.0
    } else {
        values.iter().sum::<f64>() / values.len() as f64
    }
}

async fn measure_tcp_ping(host: &str, port: u16, request_timeout: Duration) -> Option<f64> {
    let start = Instant::now();
    let address = format!("{host}:{port}");

    match timeout(request_timeout, TcpStream::connect(address)).await {
        Ok(Ok(_)) => Some(start.elapsed().as_secs_f64() * 1000.0),
        _ => None,
    }
}

async fn probe_host(host: &str, samples: usize) -> ProbeResult {
    let safe_samples = samples.clamp(MIN_SAMPLES, MAX_SAMPLES);
    let mut pings = Vec::new();

    for i in 0..safe_samples {
        if let Some(latency) = measure_tcp_ping(host, DEFAULT_PORT, CONNECT_TIMEOUT).await {
            if latency.is_finite() && latency >= 0.0 {
                pings.push(latency);
            }
        }

        if i + 1 < safe_samples {
            sleep(SAMPLE_DELAY).await;
        }
    }

    if pings.is_empty() {
        return ProbeResult {
            host: host.to_string(),
            reachable: false,
            ping: 0.0,
            jitter: 0.0,
            packet_loss: 100.0,
            p95: 0.0,
            samples: Vec::new(),
        };
    }

    let avg = round1(mean(&pings));
    let jitter = calculate_jitter(&pings);
    let packet_loss = calculate_packet_loss(safe_samples, pings.len());
    let p95 = calculate_p95(&pings);

    ProbeResult {
        host: host.to_string(),
        reachable: true,
        ping: avg,
        jitter,
        packet_loss,
        p95,
        samples: pings.into_iter().map(round1).collect(),
    }
}

fn score_quality(ping_ms: f64, jitter_ms: f64, packet_loss: f64) -> i32 {
    let mut score = 100_i32;
    score -= (ping_ms / 2.2).floor().min(50.0) as i32;
    score -= (jitter_ms * 1.4).floor().min(25.0) as i32;
    score -= (packet_loss * 1.5).floor().min(30.0) as i32;
    score.clamp(0, 100)
}

fn status_from_score(score: i32) -> String {
    if score >= 85 {
        "Excellent".to_string()
    } else if score >= 70 {
        "Good".to_string()
    } else if score >= 50 {
        "Fair".to_string()
    } else {
        "Poor".to_string()
    }
}

fn recommendation_from_metrics(ping_ms: f64, jitter_ms: f64, packet_loss: f64) -> String {
    if packet_loss >= 2.0 {
        "Packet loss is noticeable. Use wired Ethernet and close background downloads.".to_string()
    } else if jitter_ms >= 15.0 {
        "Jitter is high. Reduce concurrent traffic and select a closer region/server.".to_string()
    } else if ping_ms >= 70.0 {
        "Latency is elevated. Try another game region or improve ISP routing path.".to_string()
    } else {
        "Connection quality is stable for competitive play. Keep this setup for best results.".to_string()
    }
}

async fn run_three_pass_verification(primary: String, extra_targets: Vec<String>, samples: usize) -> NetworkResults {
    let pool = build_candidate_pool(&primary, &extra_targets).await;
    let mut pass_reports = Vec::new();
    let mut winners = Vec::new();

    // Each pass compares a small slice of targets; pass winners are then aggregated into final metrics.
    for pass_index in 0..PASS_COUNT {
        let targets = select_pass_targets(&pool, pass_index, PASS_SIZE);
        let mut probes = Vec::new();

        for target in &targets {
            probes.push(probe_host(target, samples).await);
        }

        let winner = probes
            .iter()
            .filter(|probe| probe.reachable)
            .min_by(|a, b| a.ping.total_cmp(&b.ping))
            .cloned();

        if let Some(w) = &winner {
            winners.push(w.clone());
        }

        pass_reports.push(PassReport {
            pass: pass_index + 1,
            targets,
            probes,
            winner: winner.map(|w| w.host),
        });
    }

    if winners.is_empty() {
        return NetworkResults {
            ping: 0.0,
            jitter: 0.0,
            packet_loss: 100.0,
            p95: 0.0,
            spike_rate: 100.0,
            bufferbloat: 0.0,
            score: 0,
            status: "Poor".to_string(),
            recommendation: "No game server targets are reachable right now.".to_string(),
            tested_host: primary,
            verification: Verification { passes: pass_reports },
        };
    }

    let ping_values: Vec<f64> = winners.iter().map(|w| w.ping).collect();
    let jitter_values: Vec<f64> = winners.iter().map(|w| w.jitter).collect();
    let loss_values: Vec<f64> = winners.iter().map(|w| w.packet_loss).collect();
    let p95_values: Vec<f64> = winners.iter().map(|w| w.p95).collect();

    let final_ping = round1(mean(&ping_values));
    let final_jitter = round1(mean(&jitter_values));
    let final_loss = round1(mean(&loss_values));
    let final_p95 = round1(p95_values.iter().cloned().fold(0.0, f64::max));
    let final_bufferbloat = round1((final_p95 - final_ping).max(0.0));

    // Define spikes relative to baseline latency to avoid treating low-latency noise as instability.
    let spike_threshold = 80.0_f64.max(final_ping * 1.5);
    let spikes = ping_values.iter().filter(|value| **value > spike_threshold).count();
    let spike_rate = round1((spikes as f64 / ping_values.len() as f64) * 100.0);

    let score = score_quality(final_ping, final_jitter, final_loss);
    let status = status_from_score(score);
    let recommendation = recommendation_from_metrics(final_ping, final_jitter, final_loss);

    let tested_host = winners
        .iter()
        .min_by(|a, b| a.ping.total_cmp(&b.ping))
        .map(|probe| probe.host.clone())
        .unwrap_or(primary);

    NetworkResults {
        ping: final_ping,
        jitter: final_jitter,
        packet_loss: final_loss,
        p95: final_p95,
        spike_rate,
        bufferbloat: final_bufferbloat,
        score,
        status,
        recommendation,
        tested_host,
        verification: Verification { passes: pass_reports },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculate_packet_loss_works() {
        assert_eq!(calculate_packet_loss(100, 90), 10.0);
        assert_eq!(calculate_packet_loss(0, 0), 0.0);
        assert_eq!(calculate_packet_loss(10, 15), 0.0);
    }

    #[test]
    fn calculate_jitter_works() {
        let pings = [10.0, 20.0, 30.0, 40.0];
        assert_eq!(calculate_jitter(&pings), 10.0);
    }

    #[test]
    fn calculate_p95_works() {
        let pings = [
            5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0, 70.0,
            75.0, 80.0, 85.0, 90.0, 95.0, 100.0,
        ];
        assert_eq!(calculate_p95(&pings), 95.0);
    }

    #[test]
    fn score_quality_is_bounded() {
        assert_eq!(score_quality(0.0, 0.0, 0.0), 100);
        assert_eq!(score_quality(9999.0, 9999.0, 9999.0), 0);
    }

    #[test]
    fn sanitize_profile_normalizes_and_limits_input() {
        let mut profile = NetworkProfile {
            host: "   ".to_string(),
            targets: vec![
                "  ".to_string(),
                "8.8.8.8".to_string(),
                "8.8.8.8".to_string(),
                "1.1.1.1".to_string(),
            ],
            samples: 0,
        };

        sanitize_profile(&mut profile);

        assert_eq!(profile.host, DEFAULT_TARGET);
        assert_eq!(profile.targets, vec!["8.8.8.8".to_string(), "1.1.1.1".to_string()]);
        assert_eq!(profile.samples, MIN_SAMPLES);
    }
}
