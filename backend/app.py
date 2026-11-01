"""Optional route summary API. No calibrated hardware commands are generated."""
import math
from flask import Flask, request, jsonify
app = Flask(__name__)

def km(a, b):
    rad = math.pi / 180
    h = (math.sin((b[0]-a[0])*rad/2)**2
         + math.cos(a[0]*rad)*math.cos(b[0]*rad)
         * math.sin((b[1]-a[1])*rad/2)**2)
    return 2 * 3389.5 * math.asin(math.sqrt(min(1, max(0, h))))

@app.post('/route')
def route():
    data = request.get_json(silent=True)
    wps = data.get('waypoints') if isinstance(data, dict) else None
    if not isinstance(wps, list) or not 2 <= len(wps) <= 10000:
        return jsonify(error='Provide between 2 and 10000 waypoints.'), 400
    for p in wps:
        if (not isinstance(p, list) or len(p) != 2
            or any(isinstance(x, bool) or not isinstance(x, (int, float))
                   or not math.isfinite(x) for x in p)
            or not -90 <= p[0] <= 90 or not -180 <= p[1] <= 180):
            return jsonify(error='Waypoints must contain finite [latitude, longitude] pairs in valid ranges.'), 400
    dist = sum(km(a, b) for a, b in zip(wps, wps[1:]))
    if dist < 0.02:
        return jsonify(error='Route must be at least 20 meters long.'), 400
    hrs = dist / 3
    return jsonify(km=round(dist, 2), hours=round(hrs, 2),
                   o2kg=round(hrs * 0.8 * 1.3, 2), one_way=True,
                   prototype=True, esp32_cmds=None,
                   note='Summary only. Hazard checks run in the frontend. A calibrated waypoint follower is required for hardware execution.')

@app.get('/')
def health():
    return jsonify(service='Ares Trail route summary', status='ok', prototype=True)

if __name__ == '__main__':
    app.run(port=5000)
