#define CONEXION_FIREBASE_H
#define CONEXION_FIREBASE_H

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>

#include "secrets.h"

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