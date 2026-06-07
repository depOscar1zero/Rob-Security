#define CONEXION_FIREBASE_H
#define CONEXION_FIREBASE_H

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>

// ================================
// Credenciales WiFi
// ================================
#define WIFI_SSID "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD"

// ================================
// Firebase
// ================================
#define API_KEY "TU_API_KEY"

#define DATABASE_URL "TU_DATABASE_URL"

#define USER_EMAIL "TU_CORREO"
#define USER_PASSWORD "TU_PASSWORD_FIREBASE"

// Objetos Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ================================
// Conectar WiFi
// ================================
void conectarWiFi() {

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi conectado");
}

// ================================
// Conectar Firebase
// ================================
void conectarFirebase() {

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Conectando Firebase...");

  delay(5000);

  if (Firebase.ready()) {
    Serial.println("Firebase conectado");
  } else {
    Serial.println("Firebase no conectado");
  }
}

#endif