/**
 * FitCore IoT — Sistema de seguridad
 * NodeMCU ESP8266 · HC-SR501 PIR · Buzzer · Firebase RTDB
 *
 * Dependencias (Library Manager):
 *   - ArduinoJson  (Benoit Blanchon) >= 6.x
 *   - ESP8266 board package 3.x
 *
 * Antes de compilar: copiar secrets.h.example → secrets.h
 *
 * Cambio v1.1: HC-SR04 → HC-SR501 PIR
 *   - Sin divisor de voltaje
 *   - Sin cálculo de distancia
 *   - Lectura digital simple: HIGH = movimiento, LOW = sin movimiento
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "secrets.h"

// ─── Pinout ──────────────────────────────────────────────────────────────────
#define PIN_PIR     D2   // HC-SR501 OUT  (3.3 V tolerant, directo al pin)
#define PIN_BUZZER  D5   // Buzzer activo

// ─── Tiempos ─────────────────────────────────────────────────────────────────
#define PIR_WARMUP_MS        30000UL  // HC-SR501 necesita ~30 s de calentamiento
#define FIREBASE_POST_MS      1000UL  // frecuencia de escritura al RTDB
#define FIREBASE_READ_MS      2000UL  // frecuencia de lectura de /config
#define ALARM_CONFIRM_MS      3000UL  // tiempo de movimiento continuo → ALARM
#define MOTION_CLEAR_MS       5000UL  // tiempo sin movimiento → volver a ARMED

// ─── Máquina de estados ──────────────────────────────────────────────────────
enum class State : uint8_t { WARMUP, DISARMED, ARMED, ALERT, ALARM };

const char* stateLabel[] = { "calentando", "desarmado", "armado", "alerta", "alarma" };

State        state          = State::WARMUP;
bool         motionDetected = false;
bool         buzzerActive   = false;
unsigned long alertTs       = 0;
unsigned long clearTs       = 0;

// ─── Timers ──────────────────────────────────────────────────────────────────
unsigned long tPost  = 0;
unsigned long tRead  = 0;
unsigned long tBoot  = 0;

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

// ─── Firebase helpers ────────────────────────────────────────────────────────
WiFiClientSecure tlsClient;

bool fbPUT(const String& path, const String& body) {
  HTTPClient http;
  String url = "https://" FIREBASE_HOST + path + ".json?auth=" FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(body);
  http.end();
  return (code == 200);
}

String fbGET(const String& path) {
  HTTPClient http;
  String url = "https://" FIREBASE_HOST + path + ".json?auth=" FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) return "null";
  int  code = http.GET();
  String resp = (code == 200) ? http.getString() : "null";
  http.end();
  return resp;
}

bool fbPOST(const String& path, const String& body) {
  HTTPClient http;
  String url = "https://" FIREBASE_HOST + path + ".json?auth=" FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  http.end();
  return (code == 200);
}

// ─── Leer configuración remota ───────────────────────────────────────────────
void syncConfig() {
  String resp = fbGET("/config");
  if (resp == "null") return;

  JsonDocument doc;
  if (deserializeJson(doc, resp) != DeserializationError::Ok) return;

  if (!doc["armado"].isNull()) {
    bool armado = doc["armado"].as<bool>();

    if (!armado && state != State::DISARMED && state != State::WARMUP) {
      state = State::DISARMED;
      digitalWrite(PIN_BUZZER, LOW);
      buzzerActive = false;
      Serial.println("[Config] Desarmado remotamente");
    } else if (armado && state == State::DISARMED) {
      state = State::ARMED;
      Serial.println("[Config] Armado remotamente");
    }
  }
}

// ─── Publicar estado del sensor ──────────────────────────────────────────────
void postSensorData() {
  JsonDocument doc;
  doc["movimiento"]  = motionDetected;
  doc["estado"]      = stateLabel[static_cast<uint8_t>(state)];
  doc["alerta"]      = (state == State::ALERT || state == State::ALARM);
  doc["timestamp"]   = millis();

  String body;
  serializeJson(doc, body);
  fbPUT("/sensor", body);
}

// ─── Guardar evento en historial ─────────────────────────────────────────────
void pushEvent(const char* tipo) {
  JsonDocument doc;
  doc["tipo"]        = tipo;
  doc["timestamp"]   = millis();

  String body;
  serializeJson(doc, body);
  fbPOST("/alertas", body);  // POST genera pushId único automáticamente
  Serial.printf("[Event] %s → /alertas\n", tipo);
}

// ─── Control buzzer ───────────────────────────────────────────────────────────
void setBuzzer(bool on) {
  if (on == buzzerActive) return;
  buzzerActive = on;
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
}

// ─── Máquina de estados ──────────────────────────────────────────────────────
void updateFSM(unsigned long now) {
  switch (state) {

    case State::WARMUP:
      // El PIR necesita ~30 s para estabilizarse; no leer señales hasta entonces
      if (now - tBoot >= PIR_WARMUP_MS) {
        state = State::ARMED;
        Serial.println("[FSM] Calentamiento listo → ARMED");
      }
      break;

    case State::DISARMED:
      setBuzzer(false);
      break;

    case State::ARMED:
      if (motionDetected) {
        state   = State::ALERT;
        alertTs = now;
        Serial.println("[FSM] Movimiento detectado → ALERT");
        pushEvent("alerta");
      }
      break;

    case State::ALERT:
      if (!motionDetected) {
        // El PIR mantiene HIGH un tiempo después del último movimiento;
        // si baja antes de ALARM_CONFIRM_MS fue breve, volvemos a ARMED
        state = State::ARMED;
        Serial.println("[FSM] Movimiento breve → ARMED");
      } else if (now - alertTs >= ALARM_CONFIRM_MS) {
        state = State::ALARM;
        Serial.println("[FSM] Movimiento sostenido → ALARM");
        pushEvent("alarma");
      }
      break;

    case State::ALARM:
      setBuzzer(true);
      if (!motionDetected) {
        if (clearTs == 0) {
          clearTs = now;
        } else if (now - clearTs >= MOTION_CLEAR_MS) {
          // Sin movimiento por 5 s → apagar alarma
          state   = State::ARMED;
          clearTs = 0;
          setBuzzer(false);
          Serial.println("[FSM] Zona despejada → ARMED");
          pushEvent("despejado");
        }
      } else {
        clearTs = 0; // reiniciar timer si vuelve a detectar
      }
      break;
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[Boot] FitCore IoT Security v1.1 — PIR edition");

  pinMode(PIN_PIR,    INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  tlsClient.setInsecure(); // proyecto académico; usar fingerprint en producción

  connectWiFi();
  tBoot = millis();

  Serial.printf("[PIR] Calentando %lu s...\n", PIR_WARMUP_MS / 1000);
}

// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Reconexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconectando...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // Leer PIR (alta prioridad, sin debounce necesario — el sensor ya lo hace)
  motionDetected = (digitalRead(PIN_PIR) == HIGH);

  // Máquina de estados
  updateFSM(now);

  Serial.printf("[PIR] %s · %s\n",
    motionDetected ? "MOVIMIENTO" : "sin movimiento",
    stateLabel[static_cast<uint8_t>(state)]);

  // Publicar a Firebase
  if (now - tPost >= FIREBASE_POST_MS) {
    tPost = now;
    postSensorData();
  }

  // Leer comandos (armar/desarmar) desde Firebase
  if (now - tRead >= FIREBASE_READ_MS) {
    tRead = now;
    syncConfig();
  }

  delay(100); // el PIR no necesita polling tan agresivo como el ultrasonido
}
