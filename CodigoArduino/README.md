# Librerías utilizadas

Este proyecto utiliza las siguientes librerías para el funcionamiento del sistema IoT con ESP8266 y Firebase.

## Librerías principales

### WiFi ESP8266
Permite conectar el NodeMCU ESP8266 a una red WiFi.

```cpp
#include <ESP8266WiFi.h>
```

Instalación:
- Incluida automáticamente al instalar soporte ESP8266 en Arduino IDE.

---

### Firebase ESP Client
Permite conectar el ESP8266 con Firebase Realtime Database.

```cpp
#include <Firebase_ESP_Client.h>
```

Autor:
- Mobizt

Instalación:
1. Abrir Arduino IDE
2. Ir a:
   Programa -> Incluir librería -> Administrar bibliotecas
3. Buscar:
   Firebase ESP Client
4. Instalar la librería de Mobizt

---

## Soporte de placas ESP8266

También es necesario instalar el soporte para placas ESP8266 en Arduino IDE.

### URL del Gestor de Tarjetas

Agregar en:

Archivo -> Preferencias -> URLs adicionales de tarjetas

```text
http://arduino.esp8266.com/stable/package_esp8266com_index.json
```

Luego instalar:
- ESP8266 by ESP8266 Community

---

## Hardware utilizado

- ESP8266 NodeMCU
- Sensor PIR HC-SR501
- Buzzer
- Firebase Realtime Database
- WiFi

---

## Configuración utilizada

Placa seleccionada:

```text
NodeMCU 1.0 (ESP-12E Module)
```

Velocidad Monitor Serie:

```text
115200 baudios
```