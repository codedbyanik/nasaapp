// Ares Trail Rover — ESP32 + TB6612FNG/L298N + Ultrasonic (HC-SR04) + optional ToF
// Architecture (poster #7): Laptop (map+A*) --WiFi--> ESP32 --PWM--> motors, <--ultrasonic feedback
// Wiring: IN1=26 IN2=27 PWMA=14 (left), IN3=32 IN4=33 PWMB=12 (right), TRIG=5 ECHO=18
#include <WiFi.h>
#include <WebServer.h>
const char* SSID = "AresTrail";
const char* PASS = "mars2026";
WebServer srv(80);
const int IN1 = 26, IN2 = 27, PWMA = 14, IN3 = 32, IN4 = 33, PWMB = 12, TRIG = 5, ECHO = 18;
String cmds = "";
int ci = 0;
bool running = false;
void m(int l, int r) {  // -255..255
  digitalWrite(IN1, l > 0);
  digitalWrite(IN2, l < 0);
  ledcWrite(0, abs(l));
  digitalWrite(IN3, r > 0);
  digitalWrite(IN4, r < 0);
  ledcWrite(1, abs(r));
}
long dist() {
  digitalWrite(TRIG, 0);
  delayMicroseconds(2);
  digitalWrite(TRIG, 1);
  delayMicroseconds(10);
  digitalWrite(TRIG, 0);
  long d = pulseIn(ECHO, HIGH, 30000) / 58;
  return d == 0 ? 999 : d;
}
void setup() {
  Serial.begin(115200);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  ledcSetup(0, 1000, 8);
  ledcAttachPin(PWMA, 0);
  ledcSetup(1, 1000, 8);
  ledcAttachPin(PWMB, 1);
  WiFi.softAP(SSID, PASS);
  Serial.println(WiFi.softAPIP());
  srv.on("/route", HTTP_POST, [] {
    cmds = srv.arg("plain");
    ci = 0;
    running = true;
    srv.send(200, "OK " + String(cmds.length()));
  });
  srv.on("/stop", [] {
    running = false;
    m(0, 0);
    srv.send(200, "STOP");
  });
  srv.on("/", [] {
    srv.send(200, "text/html", "<h3>Ares Rover OK</h3><form method=POST action=/route><input name=plain value='F,F,L,F'><input type=submit></form>");
  });
  srv.begin();
}
void loop() {
  srv.handleClient();
  if (!running) return;
  if (dist() < 20) {
    m(0, 0);
    Serial.println("OBSTACLE");
    delay(800);
    m(-150, 150);
    delay(400);
    return;
  }  // avoid + feedback
  // toy protocol: comma steps F/L/R every 700ms (replace with waypoint follower)
  static long t = 0;
  if (millis() - t < 700) {
    m(150, 150);
    return;
  }
  t = millis();
  if (ci >= cmds.length()) {
    running = false;
    m(0, 0);
    Serial.println("DONE");
    return;
  }
  char c = cmds[ci++];
  if (c == 'L') m(-120, 120);
  else if (c == 'R') m(120, -120);
  else if (c == 'F') m(150, 150);
  else m(0, 0);
}
