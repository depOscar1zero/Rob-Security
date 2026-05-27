#ifndef BUZZER_H
#define BUZZER_H

int buzzer = D2;

// ================================
// Inicializar buzzer
// ================================
void iniciarBuzzer() {

  pinMode(buzzer, OUTPUT);
  digitalWrite(buzzer, LOW);
}

// ================================
// Activar buzzer
// ================================
void activarBuzzer() {

  digitalWrite(buzzer, HIGH);
}

// ================================
// Apagar buzzer
// ================================
void apagarBuzzer() {

  digitalWrite(buzzer, LOW);
}

#endif