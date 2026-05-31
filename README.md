# FitCore IoT — Sistema de Seguridad

Detección de intrusos en tiempo real con NodeMCU ESP8266, sensor PIR HC-SR501, Firebase RTDB y app Android.

## Stack

| Capa | Tech |
|------|------|
| Firmware | C++ / Arduino IDE 2.x |
| Sensor | HC-SR501 (PIR, movimiento infrarrojo) |
| Actuador | Buzzer activo |
| Backend | Firebase RTDB + Cloud Functions |
| App | React Native / Expo (Android) |
| Simulados | HTML/JS — Smartwatch, Smart TV, IFTTT Voz |

## Estructura del repo

```
fitcore-security/
├── firmware/
│   └── fitcore_security/
│       ├── fitcore_security.ino
│       ├── secrets.h.example     ← copiar a secrets.h
│       └── secrets.h             ← NO subir (en .gitignore)
├── app/                          ← React Native / Expo
├── simulados/                    ← Smartwatch, Smart TV (HTML/JS)
├── docs/
│   ├── firebase_schema.json
│   ├── firebase_rules_dev.json
│   ├── firebase_rules_prod.json
│   └── calibracion.md
└── README.md
```

## Setup rápido

### 1. Clonar y configurar secretos

```bash
git clone https://github.com/tu-usuario/fitcore-security.git
cd fitcore-security/firmware/fitcore_security
cp secrets.h.example secrets.h
# Editar secrets.h con WiFi + Firebase credentials
```

### 2. Arduino IDE — dependencias

- Board manager URL: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
- Board: **NodeMCU 1.0 (ESP-12E Module)**
- Librería: **ArduinoJson** ≥ 6.x vía Library Manager

### 3. Firebase — Realtime Database

1. [console.firebase.google.com](https://console.firebase.google.com) → Nuevo proyecto
2. Build → Realtime Database → Modo test
3. Copiar URL y Web API Key a `secrets.h`
4. Pegar `docs/firebase_rules_dev.json` en la pestaña Rules

### 4. App Android

```bash
cd app
npx create-expo-app .
npm install firebase
npx expo start
# Escanear QR con Expo Go
```

## Circuito

| Componente | Pin NodeMCU | Notas |
|------------|------------|-------|
| HC-SR501 VCC | VIN (5V) | El PIR necesita 5 V para funcionar bien |
| HC-SR501 OUT | D2 | Directo, sin divisor de voltaje |
| HC-SR501 GND | GND | — |
| Buzzer + | D5 | Buzzer activo |
| Buzzer − | GND | — |

> ⚠️ Importante: el HC-SR501 trabaja a 5–12 V pero su pin OUT entrega 3.3 V,
> compatible directo con el ESP8266. No se necesita divisor de voltaje.

## Máquina de estados

```
WARMUP (30 s)
    │
    ▼
ARMED ──movimiento detectado──► ALERT ──3 s sostenido──► ALARM ──5 s sin movimiento──► ARMED
  ▲                                └──movimiento breve──►  ▲
  │                                                         │
  └────────────────── armar remotamente desde app ──────────┘
  
DISARMED ◄── desarmar remotamente desde app (cualquier estado)
```

## Schema RTDB

```
/sensor/movimiento    ← bool, actualizado cada 1 s por el ESP
/sensor/estado        ← "calentando"|"desarmado"|"armado"|"alerta"|"alarma"
/sensor/alerta        ← bool
/config/armado        ← bool  ← la app escribe aquí para armar/desarmar
/alertas/{pushId}     ← historial: tipo ("alerta"|"alarma"|"despejado") + timestamp
```

## Roles

| Miembro | Responsabilidad |
|---------|----------------|
| M1 | `firmware/` — C++, Arduino IDE, hardware |
| M2 | Firebase Console, Cloud Functions, FCM |
| M3 | `app/` + `simulados/` — React Native, HTML/JS |
