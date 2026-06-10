#include "ConexionFirebase.h"
#include "Buzzer.h"

// Pines
int motionSensor = D1;

unsigned long currentTime;
const unsigned long motionCheckInterval = 1200;
unsigned long previousMotionCheckTime = 0;

bool lastMotionState = false;

void setup() {
  Serial.begin(115200);

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  pinMode(motionSensor, INPUT);

  iniciarBuzzer();
  conectarWiFi();
  conectarFirebase();

  delay(30000); // estabilizar PIR
  Serial.println("Motion sensor listo.");
}

void loop() {

  currentTime = millis();

  if (currentTime - previousMotionCheckTime >= motionCheckInterval) {

    bool currentMotionState = digitalRead(motionSensor);

    if (currentMotionState != lastMotionState) {

      if (currentMotionState) {

        Serial.println("Motion detected!");
        digitalWrite(LED_BUILTIN, LOW);

        activarBuzzer();

        if (Firebase.RTDB.setBool(&fbdo, "/garage/motion", true)) {
          Serial.println("Firebase: true enviado");
        } else {
          Serial.println(fbdo.errorReason());
        }

      } else {

        Serial.println("Motion ended!");
        digitalWrite(LED_BUILTIN, HIGH);

        apagarBuzzer();

        if (Firebase.RTDB.setBool(&fbdo, "/garage/motion", false)) {
          Serial.println("Firebase: false enviado");
        } else {
          Serial.println(fbdo.errorReason());
        }
      }

      lastMotionState = currentMotionState;
    }

    previousMotionCheckTime = currentTime;
  }
}