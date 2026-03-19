import pytest
from server import calculate_packet_loss, calculate_jitter, calculate_p95

def test_calculate_packet_loss():
    assert calculate_packet_loss(100, 90) == pytest.approx(10)
    assert calculate_packet_loss(0, 0) == 0

def test_calculate_jitter():
    pings = [10, 20, 30, 40]
    assert calculate_jitter(pings) == pytest.approx(10)

def test_calculate_p95():
    pings = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    assert calculate_p95(pings) == 95
