import os
import requests
import time
import random
from datetime import datetime

# Multi-Tenant Configuration
API_URL = "http://localhost:5000/api/telemetry"
SEND_INTERVAL = 1.2  # Seconds between sensor pings
FACTORY_ID = os.getenv("FACTORY_ID", "Detroit")
MACHINE_PREFIX = "LINE-01-" + FACTORY_ID.upper()

def generate_sensor_data():
    temperature = round(random.uniform(175.0, 185.0), 2)
    pressure = round(random.uniform(40.0, 50.0), 2)
    # Simulate high precision offset
    tolerance_offset = round(random.uniform(0.01, 0.06), 4)
    
    status = "PASS"
    if tolerance_offset > 0.05:
        status = "FAIL"

    return {
        "machine_id": MACHINE_PREFIX,
        "factory_id": FACTORY_ID,
        "timestamp": datetime.now().isoformat(),
        "status": status,
        "data": {
            "temperature": temperature,
            "pressure": pressure,
            "tolerance_offset": tolerance_offset
        }
    }

def start_simulation():
    print(f"--- {FACTORY_ID} Factory Simulator Initialized ---")
    print(f"TARGET: {API_URL} | TENANT: {FACTORY_ID}")
    
    while True:
        data = generate_sensor_data()
        try:
            requests.post(API_URL, json=data, timeout=2)
            status_label = "FAIL" if data["status"] == "FAIL" else "PASS"
            print(f"[{status_label}] Machine: {data['machine_id']} | Offset: {data['data']['tolerance_offset']}mm")
        except requests.exceptions.ConnectionError:
            print("[ERROR] Lost connection to Backend API.")
            
        time.sleep(SEND_INTERVAL)

if __name__ == "__main__":
    start_simulation()