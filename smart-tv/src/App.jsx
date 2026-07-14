import { useEffect, useState, useRef } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebaseConfig";

// ── Rutas Firebase ────────────────────────────────────────────────────────────
const SENSOR_PATH  = "/sensor/movimiento";
const ACTIVO_PATH  = "/sistema/activo";
const AUTO_PATH    = "/sistema/automatico";

// ── Colores y estilos base (tema oscuro tipo terminal) ─────────────────────────
const C = {
  bg:        "#0d1117",
  surface:   "#161b22",
  border:    "#30363d",
  borderBlue:"#1f6feb",
  borderGreen:"#238636",
  borderRed: "#da3633",
  textPri:   "#e6edf3",
  textSec:   "#c9d1d9",
  textMuted: "#8b949e",
  green:     "#3fb950",
  red:       "#f85149",
  blue:      "#58a6ff",
  amber:     "#e3b341",
};

const S = {
  // layout
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 32,
    minHeight: "100vh",
  },
  row: { display: "flex", flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  // tipografía
  title: { fontSize: 28, fontWeight: "700", color: C.textPri, margin: 0 },
  subtitle: {
    fontSize: 12, color: C.textMuted, letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 32, marginTop: 4,
  },
  screenTitle: { fontSize: 18, fontWeight: "600", color: C.textPri, marginBottom: 4 },
  label:   { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  value:   { fontSize: 22, fontWeight: "700", color: C.textPri },
  hint:    { fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 },

  // cards
  card: {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "12px 16px",
  },
  cardGreen: {
    backgroundColor: "#0d1f0d",
    border: `1px solid ${C.borderGreen}`,
    borderRadius: 10, padding: "14px 16px",
  },
  cardRed: {
    backgroundColor: "#1a0000",
    border: `1px solid ${C.borderRed}`,
    borderRadius: 10, padding: "14px 16px",
  },
  cardBlue: {
    backgroundColor: "#0d1629",
    border: `1px solid ${C.borderBlue}`,
    borderRadius: 10, padding: "12px 16px",
  },

  // botones
  btnBase: {
    width: "100%", borderRadius: 8, padding: "14px 16px",
    cursor: "pointer", border: "1px solid", marginBottom: 8,
    fontSize: 14, fontWeight: "600", textAlign: "center",
    backgroundColor: "#21262d", transition: "opacity 0.15s",
  },
  btnBlue:  { borderColor: C.blue,  color: C.blue  },
  btnRed:   { borderColor: C.red,   color: C.red   },
  btnGreen: { borderColor: C.green, color: C.green },
  btnAmber: { borderColor: C.amber, color: C.amber },

  // nav
  navBar: {
    display: "flex", flexDirection: "row", gap: 4,
    marginBottom: 28, borderBottom: `1px solid ${C.border}`,
    paddingBottom: 0,
  },
  navItem: {
    padding: "10px 20px", fontSize: 13, fontWeight: "500",
    cursor: "pointer", borderRadius: "6px 6px 0 0",
    border: "1px solid transparent",
    borderBottom: "none", color: C.textMuted,
    backgroundColor: "transparent",
  },
  navActive: {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderBottom: `1px solid ${C.surface}`,
    color: C.textPri,
  },

  // badges
  badgeGreen: {
    backgroundColor: "#0d1f0d", border: `1px solid ${C.borderGreen}`,
    color: C.green, fontSize: 11, padding: "3px 10px",
    borderRadius: 20, display: "inline-block", fontWeight: "500",
  },
  badgeRed: {
    backgroundColor: "#1a0000", border: `1px solid ${C.borderRed}`,
    color: C.red, fontSize: 11, padding: "3px 10px",
    borderRadius: 20, display: "inline-block", fontWeight: "500",
  },
  badgeBlue: {
    backgroundColor: "#0d1629", border: `1px solid ${C.borderBlue}`,
    color: C.blue, fontSize: 11, padding: "3px 10px",
    borderRadius: 20, display: "inline-block", fontWeight: "500",
  },
  badgeAmber: {
    backgroundColor: "#1a1200", border: `1px solid #9e6a03`,
    color: C.amber, fontSize: 11, padding: "3px 10px",
    borderRadius: 20, display: "inline-block", fontWeight: "500",
  },

  // footer
  footer: {
    display: "flex", flexDirection: "row", alignItems: "center",
    gap: 8, marginTop: 32, paddingTop: 16,
    borderTop: `1px solid ${C.border}`,
  },
  dot: { width: 8, height: 8, borderRadius: "50%" },
};

// ── Componente principal ───────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("inicio");
  const [motion, setMotion]           = useState(null);
  const [sistemaActivo, setSistemaActivo] = useState(true);
  const [modoAuto, setModoAuto]       = useState(true);
  const [connected, setConnected]     = useState(false);
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [feedback, setFeedback]       = useState("");
  const [history, setHistory]         = useState([]);
  const histRef = useRef([]);

  // ── Escuchar Firebase ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubSensor = onValue(
      ref(db, SENSOR_PATH),
      (snap) => {
        const val = snap.val();
        setMotion(val);
        setConnected(true);
        const now = new Date();
        const timeStr = now.toLocaleTimeString("es-MX");
        setLastUpdate(timeStr);

        // guardar en historial local si cambia a true
        if (val === true) {
          const entry = { tipo: "Movimiento detectado", hora: timeStr, icono: "🚨" };
          const next = [entry, ...histRef.current].slice(0, 20);
          histRef.current = next;
          setHistory([...next]);
        }
      },
      () => setConnected(false)
    );

    const unsubActivo = onValue(ref(db, ACTIVO_PATH), (snap) => {
      if (snap.val() !== null) setSistemaActivo(snap.val());
    });

    const unsubAuto = onValue(ref(db, AUTO_PATH), (snap) => {
      if (snap.val() !== null) setModoAuto(snap.val());
    });

    return () => { unsubSensor(); unsubActivo(); unsubAuto(); };
  }, []);

  // ── Acciones Firebase ────────────────────────────────────────────────────────
  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  };

  const toggleSistema = async () => {
    const nuevo = !sistemaActivo;
    await set(ref(db, ACTIVO_PATH), nuevo);
    setSistemaActivo(nuevo);
    showFeedback(nuevo ? "✅ Sistema activado" : "🔴 Sistema desactivado");
    const timeStr = new Date().toLocaleTimeString("es-MX");
    const entry = {
      tipo: nuevo ? "Sistema activado" : "Sistema desactivado",
      hora: timeStr, icono: nuevo ? "✅" : "🔴",
    };
    const next = [entry, ...histRef.current].slice(0, 20);
    histRef.current = next;
    setHistory([...next]);
  };

  const toggleAuto = async () => {
    const nuevo = !modoAuto;
    await set(ref(db, AUTO_PATH), nuevo);
    setModoAuto(nuevo);
    showFeedback(nuevo ? "🤖 Modo automático ON" : "🎮 Modo manual ON");
  };

  const activarAlarma = async () => {
    await set(ref(db, SENSOR_PATH), true);
    showFeedback("🔊 Alarma activada manualmente");
    const timeStr = new Date().toLocaleTimeString("es-MX");
    const entry = { tipo: "Alarma manual", hora: timeStr, icono: "🔊" };
    const next = [entry, ...histRef.current].slice(0, 20);
    histRef.current = next;
    setHistory([...next]);
  };

  const silenciarAlarma = async () => {
    await set(ref(db, SENSOR_PATH), false);
    showFeedback("🔇 Alarma silenciada");
  };

  const detected = Boolean(motion);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.container}>

      {/* Encabezado */}
      <p style={S.title}>🔒 Rob-Security</p>
      <p style={S.subtitle}>Smart TV · Monitor IoT · Garaje</p>

      {/* Toast de feedback */}
      {feedback !== "" && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.borderBlue}`,
          borderRadius: 8, padding: "10px 16px", marginBottom: 16,
          color: C.blue, fontSize: 13, fontWeight: "500",
        }}>
          {feedback}
        </div>
      )}

      {/* Navegación */}
      <div style={S.navBar}>
        {[
          { id: "inicio",    label: "🏠 Inicio"    },
          { id: "monitoreo", label: "📡 Monitoreo" },
          { id: "control",   label: "🎮 Control"   },
          { id: "historial", label: "📋 Historial" },
          { id: "config",    label: "⚙ Config"    },
        ].map((tab) => (
          <div
            key={tab.id}
            style={{ ...S.navItem, ...(screen === tab.id ? S.navActive : {}) }}
            onClick={() => setScreen(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* ── PANTALLA 1: INICIO ── */}
      {screen === "inicio" && (
        <div>
          <p style={S.screenTitle}>Bienvenido</p>
          <p style={{ ...S.label, marginBottom: 20 }}>
            Panel de control del sistema de seguridad del garaje
          </p>

          {/* Estado general */}
          <div style={{
            ...S.row, marginBottom: 16,
            ...(detected ? S.cardRed : S.cardGreen),
          }}>
            <div style={{ fontSize: 40, marginRight: 16 }}>{detected ? "🚨" : "✅"}</div>
            <div>
              <div style={{ color: C.textPri, fontSize: 18, fontWeight: "700" }}>
                {detected ? "MOVIMIENTO DETECTADO" : "SIN MOVIMIENTO"}
              </div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                Última actualización: {lastUpdate ?? "—"}
              </div>
            </div>
          </div>

          {/* Tarjetas de estado rápido */}
          <div style={{ ...S.row, marginBottom: 24 }}>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Sistema</div>
              <span style={sistemaActivo ? S.badgeGreen : S.badgeRed}>
                {sistemaActivo ? "● ACTIVO" : "● INACTIVO"}
              </span>
            </div>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Modo</div>
              <span style={modoAuto ? S.badgeAmber : S.badgeBlue}>
                {modoAuto ? "🤖 AUTO" : "🎮 MANUAL"}
              </span>
            </div>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Firebase</div>
              <span style={connected ? S.badgeGreen : S.badgeRed}>
                {connected ? "● OK" : "● SIN CONEXIÓN"}
              </span>
            </div>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Alarma</div>
              <span style={detected ? S.badgeRed : S.badgeGreen}>
                {detected ? "● SONANDO" : "● SILENCIO"}
              </span>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div style={S.row}>
            <button style={{ ...S.btnBase, ...S.btnBlue }} onClick={() => setScreen("monitoreo")}>
              📡 Ver monitoreo en vivo
            </button>
            <button style={{ ...S.btnBase, ...S.btnAmber }} onClick={() => setScreen("control")}>
              🎮 Ir a control
            </button>
          </div>
        </div>
      )}

      {/* ── PANTALLA 2: MONITOREO ── */}
      {screen === "monitoreo" && (
        <div>
          <p style={S.screenTitle}>Monitoreo en vivo</p>
          <p style={S.label}>Estado en tiempo real desde Firebase RTDB</p>

          {/* Estado principal */}
          <div style={{
            ...(detected ? S.cardRed : S.cardGreen),
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 48 }}>{detected ? "🚨" : "✅"}</div>
            <div>
              <div style={{ color: C.textPri, fontSize: 20, fontWeight: "700" }}>
                {detected ? "MOVIMIENTO DETECTADO" : "SIN MOVIMIENTO"}
              </div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>
                Firebase: /sensor/movimiento = {String(motion)}
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div style={{ ...S.row, marginBottom: 16 }}>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Sensor PIR</div>
              <div style={{ ...S.value, color: sistemaActivo ? C.green : C.red }}>
                {sistemaActivo ? "ACTIVO" : "PAUSADO"}
              </div>
            </div>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Modo operación</div>
              <div style={{ ...S.value, fontSize: 16, color: modoAuto ? C.amber : C.blue }}>
                {modoAuto ? "Automático" : "Manual"}
              </div>
            </div>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Conexión</div>
              <div style={{ ...S.value, color: connected ? C.green : C.red }}>
                {connected ? "OK" : "ERROR"}
              </div>
            </div>
          </div>

          {/* Ruta Firebase */}
          <div style={{ ...S.cardBlue, fontFamily: "monospace", fontSize: 12 }}>
            <div style={{ color: C.textMuted, marginBottom: 6 }}>Rutas en Firebase RTDB:</div>
            <div style={{ color: C.blue }}>
              /sensor/movimiento → <span style={{ color: detected ? C.red : C.green }}>
                {String(motion)}
              </span>
            </div>
            <div style={{ color: C.blue }}>
              /sistema/activo &nbsp;&nbsp;→ <span style={{ color: sistemaActivo ? C.green : C.red }}>
                {String(sistemaActivo)}
              </span>
            </div>
            <div style={{ color: C.blue }}>
              /sistema/automatico → <span style={{ color: modoAuto ? C.amber : C.textSec }}>
                {String(modoAuto)}
              </span>
            </div>
          </div>

          <p style={S.hint}>● Actualizando en tiempo real</p>
        </div>
      )}

      {/* ── PANTALLA 3: CONTROL ── */}
      {screen === "control" && (
        <div>
          <p style={S.screenTitle}>Control del sistema</p>
          <p style={S.label}>Envía comandos directamente al ESP8266 vía Firebase</p>

          {/* Estado actual */}
          <div style={{ ...S.row, marginBottom: 20 }}>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Estado sistema</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{
                  ...S.dot,
                  backgroundColor: sistemaActivo ? C.green : C.red,
                }}/>
                <span style={{ color: sistemaActivo ? C.green : C.red, fontWeight: "600", fontSize: 14 }}>
                  {sistemaActivo ? "ENCENDIDO" : "APAGADO"}
                </span>
              </div>
            </div>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Modo actual</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 16 }}>{modoAuto ? "🤖" : "🎮"}</span>
                <span style={{ color: modoAuto ? C.amber : C.blue, fontWeight: "600", fontSize: 14 }}>
                  {modoAuto ? "AUTOMÁTICO" : "MANUAL"}
                </span>
              </div>
            </div>
            <div style={{ ...S.card, ...S.col }}>
              <div style={S.label}>Alarma</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{
                  ...S.dot,
                  backgroundColor: detected ? C.red : C.textMuted,
                }}/>
                <span style={{ color: detected ? C.red : C.textMuted, fontWeight: "600", fontSize: 14 }}>
                  {detected ? "SONANDO" : "SILENCIO"}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de control */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Control del sistema
            </div>

            {/* Activar / Desactivar sistema */}
            <button
              style={{ ...S.btnBase, ...(sistemaActivo ? S.btnRed : S.btnGreen) }}
              onClick={toggleSistema}
            >
              {sistemaActivo ? "🔴 Desactivar sensor" : "🟢 Activar sensor"}
            </button>

            {/* Modo automático / manual */}
            <button
              style={{ ...S.btnBase, ...(modoAuto ? S.btnBlue : S.btnAmber) }}
              onClick={toggleAuto}
            >
              {modoAuto ? "🎮 Cambiar a modo manual" : "🤖 Activar modo automático"}
            </button>
          </div>

          {/* Separador */}
          <div style={{
            borderTop: `1px solid ${C.border}`,
            margin: "16px 0", 
          }}/>

          <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            Control de alarma
          </div>

          {/* Activar / Silenciar alarma */}
          <button
            style={{ ...S.btnBase, ...S.btnRed }}
            onClick={activarAlarma}
          >
            🔊 Activar alarma manualmente
          </button>

          <button
            style={{ ...S.btnBase, ...S.btnGreen }}
            onClick={silenciarAlarma}
          >
            🔇 Silenciar alarma
          </button>

          <p style={S.hint}>
            Los cambios se envían a Firebase y el ESP8266 los aplica en ~1.2 segundos
          </p>
        </div>
      )}

      {/* ── PANTALLA 4: HISTORIAL ── */}
      {screen === "historial" && (
        <div>
          <p style={S.screenTitle}>Historial de eventos</p>
          <p style={S.label}>Registro de la sesión actual</p>

          {/* Stats */}
          <div style={{ ...S.row, marginBottom: 16 }}>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Alertas hoy</div>
              <div style={{ ...S.value, color: C.red }}>
                {history.filter(e => e.icono === "🚨").length}
              </div>
            </div>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Total eventos</div>
              <div style={S.value}>{history.length}</div>
            </div>
            <div style={{ ...S.card, ...S.col, textAlign: "center" }}>
              <div style={S.label}>Manuales</div>
              <div style={{ ...S.value, color: C.blue }}>
                {history.filter(e => e.icono === "🔊").length}
              </div>
            </div>
          </div>

          {/* Lista de eventos */}
          <div style={S.card}>
            {history.length === 0 ? (
              <div style={{ color: C.textMuted, textAlign: "center", padding: "24px 0", fontSize: 13 }}>
                Sin eventos registrados en esta sesión
              </div>
            ) : (
              history.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "10px 0",
                    borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      backgroundColor: ev.icono === "🚨" ? "#1a0000" : ev.icono === "✅" ? "#0d1f0d" : "#0d1629",
                      border: `1px solid ${ev.icono === "🚨" ? C.borderRed : ev.icono === "✅" ? C.borderGreen : C.borderBlue}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}>
                      {ev.icono}
                    </div>
                    <span style={{ color: C.textSec, fontSize: 13 }}>{ev.tipo}</span>
                  </div>
                  <span style={{ color: C.textMuted, fontSize: 12 }}>{ev.hora}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── PANTALLA 5: CONFIGURACIÓN ── */}
      {screen === "config" && (
        <div>
          <p style={S.screenTitle}>Configuración</p>
          <p style={S.label}>Información del sistema y conexión</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Dispositivo",         value: "ESP8266 NodeMCU",        badge: "badgeBlue"  },
              { label: "Base de datos",        value: "Firebase RTDB",          badge: "badgeBlue"  },
              { label: "Intervalo de lectura", value: "1200 ms",                badge: "badgeAmber" },
              { label: "Duración alarma",      value: "10 segundos",            badge: "badgeAmber" },
              { label: "Sensor PIR",           value: "Pin D1",                 badge: "badgeGreen" },
              { label: "Buzzer",               value: "Pin D2",                 badge: "badgeGreen" },
              { label: "Ruta movimiento",      value: "/sensor/movimiento",     badge: "badgeBlue"  },
              { label: "Ruta sistema",         value: "/sistema/activo",        badge: "badgeBlue"  },
              { label: "Ruta automático",      value: "/sistema/automatico",    badge: "badgeBlue"  },
              { label: "Estado Firebase",      value: connected ? "Conectado" : "Sin conexión",
                badge: connected ? "badgeGreen" : "badgeRed" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  ...S.card,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span style={{ color: C.textSec, fontSize: 13 }}>{item.label}</span>
                <span style={S[item.badge]}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={S.footer}>
        <div style={{ ...S.dot, backgroundColor: connected ? C.green : C.red }} />
        <span style={{ color: C.textMuted, fontSize: 12 }}>
          {connected ? "Firebase conectado" : "Sin conexión"}
        </span>
        {lastUpdate && (
          <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 8 }}>
            · Última actualización: {lastUpdate}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: C.textMuted, fontSize: 11 }}>
          SmartV · Rob-Security IoT
        </span>
      </div>

    </div>
  );
}
