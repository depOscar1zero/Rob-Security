# FitCore IoT — Sistema de Seguridad

Detección de intrusos en tiempo real con NodeMCU ESP8266, Firebase RTDB y app Android.

## Stack

| Capa | Tech |
|------|------|
| Firmware | C++ / Arduino IDE 2.x |
| Sensor | HC-SR04 (ultrasónico) |
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
│   └── calibracion.md            ← documentar umbral medido
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

- Board: ESP8266 Community  
  URL: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
- Board seleccionada: **NodeMCU 1.0 (ESP-12E Module)**
- Librería: **ArduinoJson** ≥ 6.x (Benoit Blanchon) vía Library Manager

### 3. Firebase — Realtime Database

1. [console.firebase.google.com](https://console.firebase.google.com) → Nuevo proyecto
2. Build → Realtime Database → Crear base de datos → Modo test
3. Copiar URL (formato `xxx-default-rtdb.firebaseio.com`) y Web API Key a `secrets.h`
4. Pegar el contenido de `docs/firebase_rules_dev.json` en la pestaña **Rules**

### 4. App Android — Expo

```bash
cd app
npm install
npx expo start
# Escanear QR con Expo Go (Android)
```

Instalar Firebase SDK:
```bash
npm install firebase
```

### 5. Schema RTDB

Ver `docs/firebase_schema.json`. Estructura principal:

```
/sensor/distancia_cm   ← float, actualizado por ESP8266 cada ~1 s
/sensor/estado         ← "desarmado" | "armado" | "alerta" | "alarma"
/sensor/alerta         ← bool
/config/armado         ← bool  ← la app escribe aquí para armar/desarmar
/config/umbral         ← número en cm
/alertas/{pushId}      ← historial de eventos
```

## Circuito

| Componente | Pin ESP8266 | Nota |
|------------|-------------|------|
| HC-SR04 TRIG | D1 | Directo |
| HC-SR04 ECHO | D2 | Divisor de voltaje 1 kΩ + 2 kΩ (5 V → 3.3 V) |
| Buzzer + | D5 | Buzzer activo |
| Buzzer − | GND | — |

## Estado de la máquina

```
DISARMED ──armar──► ARMED ──detección──► ALERT ──3 s continuo──► ALARM
   ▲                  ▲       ◄──sin objeto──┘          ◄──sin objeto──┘
   └──desarmar─────────┴──────────────────────────────────────────────┘
```

## Contribuir

Branches: `main` (producción) · `develop` (trabajo diario)  
Cada miembro trabaja en su carpeta asignada:
- `M1` → `firmware/`
- `M2` → `docs/` + Firebase Console  
- `M3` → `app/` + `simulados/`
