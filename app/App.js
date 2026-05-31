import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ref, onValue } from 'firebase/database';
import { db } from './src/firebaseConfig';

const SENSOR_PATH = '/sensor/movimiento';

export default function App() {
  const [motion, setMotion] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sensorRef = ref(db, SENSOR_PATH);
    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        setMotion(snapshot.val());
        setLastUpdate(new Date().toLocaleTimeString('es-MX'));
        setConnected(true);
      },
      (error) => {
        console.error('Firebase error:', error);
        setConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const detected = Boolean(motion);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>Rob-Security</Text>
      <Text style={styles.subtitle}>Monitor de movimiento</Text>

      {!connected && motion === null ? (
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Conectando a Firebase…</Text>
        </View>
      ) : (
        <View style={[styles.card, detected ? styles.cardAlert : styles.cardClear]}>
          <Text style={styles.statusIcon}>{detected ? '🚨' : '✅'}</Text>
          <Text style={styles.statusText}>
            {detected ? 'MOVIMIENTO DETECTADO' : 'SIN MOVIMIENTO'}
          </Text>
          <Text style={styles.rawValue}>
            Valor sensor: {String(motion)}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={[styles.dot, connected ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.footerText}>
          {connected ? 'Firebase conectado' : 'Sin conexión'}
        </Text>
        {lastUpdate && (
          <Text style={styles.timestamp}>Última actualización: {lastUpdate}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e6edf3',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    marginBottom: 40,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  cardClear: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#238636',
  },
  cardAlert: {
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#da3633',
  },
  statusIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e6edf3',
    textAlign: 'center',
    marginBottom: 8,
  },
  rawValue: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 4,
  },
  loadingText: {
    color: '#8b949e',
    marginTop: 16,
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#3fb950',
  },
  dotOffline: {
    backgroundColor: '#da3633',
  },
  footerText: {
    color: '#8b949e',
    fontSize: 12,
  },
  timestamp: {
    color: '#6e7681',
    fontSize: 11,
    marginTop: 2,
  },
});
