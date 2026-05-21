/**
 * FitCore IoT — Sistema de seguridad
 * NodeMCU ESP8266 · HC-SR04 · Buzzer · Firebase RTDB
 *
 * Dependencias (Library Manager):
 *   - ArduinoJson  (Benoit Blanchon) >= 6.x
 *   - ESP8266 board package 3.x
 *
 * Antes de compilar: copiar secrets.h.example → secrets.h
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "secrets.h"

// ─── Pinout ──────────────────────────────────────────────────────────────────
#define PIN_TRIG    D1   // HC-SR04 TRIG
#define PIN_ECHO    D2   // HC-SR04 ECHO (con divisor 1kΩ + 2kΩ → 3.3 V)
#define PIN_BUZZER  D5   // Buzzer activo

// ─── Configuración por defecto ───────────────────────────────────────────────
#define DEFAULT_THRESHOLD_CM  120   // se sobrescribe desde /config/umbral
#define SENSOR_INTERVAL_MS    300   // frecuencia de lectura del sensor
#define FIREBASE_POST_MS     1000   // frecuencia de escritura a Firebase
#define FIREBASE_READ_MS     2000   // frecuencia de lectura del comando armar/desermar
#define ALARM_CONFIRM_MS     3000   // segundos en ALERT antes de pasar a ALARM

// ─── Máquina de estados ──────────────────────────────────────────────────────
enum class State : uint8_t { DISARMED, ARMED, ALERT, ALARM };

const char* stateLabel[] = { "desarmado", "armado", "alerta", "alarma" };

State state          = State::ARMED;
float threshold      = DEFAULT_THRESHOLD_CM;
float lastDistance   = 0.0f;
bool  buzzerActive   = false;
unsigned long alertTs = 0;

// ─── Timers ──────────────────────────────────────────────────────────────────
unsigned long tSensor   = 0;
unsigned long tPost     = 0;
unsigned long tRead     = 0;

// ─── WiFi ────────────────────────────────────────────────────────────────────
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WiFi] Conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] OK · IP: %s\n", WiFi.localIP().toString().c_str());
}

// ─── Sensor ──────────────────────────────────────────────────────────────────
float readDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 30000UL); // timeout 30 ms ≈ 5 m
  return (dur == 0) ? -1.0f : dur * 0.0170f;   // cm = µs × (0.034/2)
}

// ─── Firebase helpers ────────────────────────────────────────────────────────
WiFiClientSecure tlsClient;

bool fbPUT(const String& path, const String& body) {
  HTTPClient http;
  String url = "https://" FIREBASE_HOST + path + ".json?auth=" FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(body);
  http.end();
  return code == 200;
}

String fbGET(const String& path) {
  HTTPClient http;
  String url = "https://" FIREBASE_HOST + path + ".json?auth=" FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) return "null";
  int code = http.GET();
  String resp = (code == 200) ? http.getString() : "null";
  http.end();
  return resp;
}

// ─── Leer configuración desde Firebase ──────────────────────────────────────
void syncConfig() {
  String resp = fbGET("/config");
  if (resp == "null") return;

  JsonDocument doc;
  if (deserializeJson(doc, resp) != DeserializationError::Ok) return;

  if (!doc["umbral"].isNull())
    threshold = doc["umbral"].as<float>();

  if (!doc["armado"].isNull()) {
    bool armado = doc["armado"].as<bool>();
    if (!armado && state != State::DISARMED) {
      state = State::DISARMED;
      digitalWrite(PIN_BUZZER, LOW);
      buzzerActive = false;
      Serial.println("[Config] Sistema desarmado remotamente");
    } else if (armado && state == State::DISARMED) {
      state = State::ARMED;
      Serial.println("[Config] Sistema armado remotamente");
    }
  }
}

// ─── Publicar estado del sensor a Firebase ───────────────────────────────────
void postSensorData() {
  JsonDocument doc;
  doc["distancia_cm"] = serialized(String(lastDistance, 1));
  doc["alerta"]       = (state == State::ALERT || state == State::ALARM);
  doc["estado"]       = stateLabel[static_cast<uint8_t>(state)];
  doc["timestamp"]    = millis();

  String body;
  serializeJson(doc, body);

  if (!fbPUT("/sensor", body))
    Serial.println("[Firebase] Error al publicar sensor");
}

// ─── Publicar evento de alerta en /alertas ──────────────────────────────────
void pushAlert(State s) {
  JsonDocument doc;
  doc["tipo"]         = stateLabel[static_cast<uint8_t>(s)];
  doc["distancia_cm"] = serialized(String(lastDistance, 1));
  doc["timestamp"]    = millis();

  String body;
  serializeJson(doc, body);

  // POST a /alertas: Firebase genera un pushId único
  HTTPClient http;
  String url = "https://" FIREBASE_HOST "/alertas.json?auth=" FIREBASE_API_KEY;
  tlsClient.setInsecure();
  if (http.begin(tlsClient, url)) {
    http.addHeader("Content-Type", "application/json");
    http.POST(body);   // POST genera pushId automáticamente
    http.end();
  }
}

// ─── Lógica de la máquina de estados ────────────────────────────────────────
void updateStateMachine(unsigned long now) {
  if (state == State::DISARMED) return;

  bool intrusion = (lastDistance > 0 && lastDistance < threshold);

  switch (state) {
    case State::ARMED:
      if (intrusion) {
        state   = State::ALERT;
        alertTs = now;
        Serial.printf("[FSM] ALERT · dist=%.1f cm < umbral=%.0f\n", lastDistance, threshold);
        pushAlert(State::ALERT);
      }
      break;

    case State::ALERT:
      if (!intrusion) {
        state = State::ARMED;
        Serial.println("[FSM] Falsa alarma → ARMED");
      } else if (now - alertTs >= ALARM_CONFIRM_MS) {
        state = State::ALARM;
        Serial.println("[FSM] ALARM confirmada");
        pushAlert(State::ALARM);
      }
      break;

    case State::ALARM:
      if (!intrusion) {
        state = State::ARMED;
        digitalWrite(PIN_BUZZER, LOW);
        buzzerActive = false;
        Serial.println("[FSM] Intrusión terminada → ARMED");
      }
      break;

    default: break;
  }

  // Control buzzer
  bool shouldBuzz = (state == State::ALARM);
  if (shouldBuzz != buzzerActive) {
    digitalWrite(PIN_BUZZER, shouldBuzz ? HIGH : LOW);
    buzzerActive = shouldBuzz;
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[Boot] FitCore IoT Security v1.0");

  pinMode(PIN_TRIG,   OUTPUT);
  pinMode(PIN_ECHO,   INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  tlsClient.setInsecure(); // class project; usa fingerprint en producción

  connectWiFi();
  syncConfig(); // leer umbral y estado armado inicial desde Firebase
}

// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Reconectar WiFi si se cae
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconectando...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // Leer sensor
  if (now - tSensor >= SENSOR_INTERVAL_MS) {
    tSensor      = now;
    lastDistance = readDistance();
    updateStateMachine(now);
    Serial.printf("[Sensor] %.1f cm · %s\n", lastDistance, stateLabel[static_cast<uint8_t>(state)]);
  }

  // Publicar a Firebase
  if (now - tPost >= FIREBASE_POST_MS) {
    tPost = now;
    postSensorData();
  }

  // Leer comandos desde Firebase (armar/desarmar, umbral)
  if (now - tRead >= FIREBASE_READ_MS) {
    tRead = now;
    syncConfig();
  }
}
