# Calibración HC-SR04

## Mediciones realizadas

| Escenario | Distancia medida | Fecha |
|-----------|-----------------|-------|
| Cuarto vacío (sin nadie) | ___ cm | |
| Persona parada al frente | ___ cm | |
| Umbral elegido | **___ cm** | |

## Observaciones

- Ángulo de detección del HC-SR04: ~15°
- Superficie detectada: ___
- Variación típica entre lecturas: ±___ cm

## Umbral configurado en Firebase

`/config/umbral` = ___

## Cómo se midió

1. Montar el sensor en posición final de instalación
2. Correr el firmware con `Serial.begin(115200)` y leer serial monitor
3. Anotar 10 lecturas sin nadie y 10 con alguien en el area
4. Umbral = promedio de las dos + margen de seguridad de 10 cm
