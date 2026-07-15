"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";

const SECTIONS_ALL = [
  {
    title: "Vista general del dashboard",
    content: `Al entrar en un equipo, grupo o atleta individual verás el panel principal con las pestañas superiores. Cada pestaña da acceso a una área diferente de seguimiento. En la barra superior tienes los botones de Ayuda, Exportar y Salir.`,
  },
  {
    title: "Datos de Carga",
    content: `Muestra el estado general del equipo o grupo en base a los registros de RPE y wellness.\n\n• Datos medios del equipo/grupo: gráficas y medias de carga, fatiga y bienestar del conjunto. Puedes filtrar por fecha.\n• Estado individual: tabla con el estado de cada jugador/a hoy. Pulsa sobre un jugador/a para ver su detalle completo con gráficas de evolución.\n• Control de carga: vista de la carga acumulada y ACWR (ratio carga aguda/crónica) para detectar riesgo de lesión.`,
  },
  {
    title: "Calendario",
    content: `Planificación semanal y mensual del equipo.\n\n• Vista semana / mes: navega entre semanas o meses con las flechas.\n• Añadir sesión: pulsa el botón + de un día para crear una sesión. Puedes elegir tipo, intensidad, duración y contenido por bloques.\n• Día de descanso: activa el toggle para marcar un día como descanso.\n• Sesiones individuales: dentro del editor de sesión, la pestaña "Sesión individual" permite asignar sesiones específicas a jugadores/as concretos.\n• Repetir en microciclos: si tienes mesociclos activos, puedes aplicar la misma sesión en semanas equivalentes de otros microciclos.\n• Exportar PDF: genera un informe del calendario en PDF desde el apartado de Ajustes.`,
  },
  {
    title: "Avisos",
    content: `Muestra las alertas automáticas generadas por el sistema cuando un jugador/a tiene valores fuera de rango.\n\n• Alertas de wellness: se generan cuando el marcador de bienestar es muy bajo (< 2 en alguna dimensión).\n• Alertas de carga: se generan cuando la carga aguda o el ACWR superan los umbrales configurados.\n• Las alertas se marcan como leídas al abrirlas. Puedes descartarlas individualmente.`,
  },
  {
    title: "Datos Físicos",
    content: `Registro de datos físicos y médicos de los jugadores/as del equipo.\n\n• Cuadrante físico: visualización de los jugadores/as en un gráfico según dos métricas físicas seleccionables.\n• Datos individuales: al pulsar sobre un jugador/a, accedes a su ficha con datos antropométricos, tests físicos, historial lesivo y modalidad deportiva.\n• Añadir test: puedes registrar resultados de tests físicos con fecha. El historial queda guardado y es visible en gráficas de evolución.`,
  },
  {
    title: "Ajustes",
    content: `Configuración del equipo, grupo o atleta.\n\n• Tipo de equipo: cambia entre equipo, grupo o atleta individual.\n• Gestión de plantilla: ve los jugadores/as del roster, márcalos como lesionados o expúlsalos del equipo. Un jugador/a expulsado/a deberá unirse a un nuevo equipo con código.\n• Mover jugador/a: transfiere un jugador/a a otro equipo o grupo tuyo, llevando todos sus datos históricos.\n• Editar convocatoria: gestiona qué jugadores/as están convocados/as para cada partido.\n• Minutos de partido: define los minutos predeterminados para el formulario RPE en días de competición.\n• Hora límite de formularios: establece a qué hora se cierran los formularios de wellness y RPE.\n• Exportar PDF: genera informes en PDF del calendario o datos del equipo.\n• Notificaciones: configura alertas automáticas de wellness y RPE.\n• Zona de peligro: elimina el equipo, grupo o atleta de forma permanente.`,
  },
  {
    title: "Estado individual de un jugador/a",
    content: `Al pulsar sobre un jugador/a en la pestaña "Estado individual" accedes a su panel detallado.\n\n• Resumen: check-ins completados, sesiones totales y estado de hoy.\n• Gráfica de carga: evolución del RPE × duración a lo largo del tiempo por tipo de sesión.\n• Wellness: evolución de cada dimensión del bienestar (sueño, fatiga, dolor muscular, humor, estrés).\n• Comentarios: mensajes que el/la jugador/a ha dejado en sus registros RPE.\n• Datos físicos: acceso directo a la ficha física del jugador/a.`,
  },
  {
    title: "Perfil de entrenador/a lector/a",
    content: `El entrenador/a lector/a tiene acceso de solo lectura al dashboard. No puede editar sesiones, ajustes ni datos. Solo puede consultar el calendario, los datos de carga, el estado individual y los datos físicos del equipo. Aparece un banner naranja en la parte superior indicando que está en modo lectura.`,
  },
];

function AccordionItem({ title, content, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text, flex: 1 }}>{title}</span>
        <span style={{ color: COLORS.lime, fontSize: 12, marginLeft: 8, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {isOpen && (
        <div style={{ paddingBottom: 14 }}>
          {content.split("\n\n").map((para, i) => (
            <p key={i} style={{ fontSize: 13, color: COLORS.text, margin: "0 0 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{para}</p>
          ))}
        </div>
      )}
    </div>
  );
}

const SECTIONS_PLAYER = [
  {
    title: "Hoy",
    content: `Es la pantalla principal que ves al entrar. Muestra lo que tienes pendiente para el día de hoy.\n\n• Wellness: formulario diario de bienestar. Responde preguntas sobre tu sueño, fatiga, dolor muscular, humor y estrés. Es importante rellenarlo cada mañana.\n• RPE (Esfuerzo Percibido): formulario que rellenas después del entreno. Indica cuánto esfuerzo te ha supuesto la sesión del día en una escala del 0 al 10. También puedes añadir un comentario para tu preparador/a.\n• Avisos: si tu preparador/a te ha enviado algún mensaje o alerta, aparecerá aquí.`,
  },
  {
    title: "Calendario",
    content: `Muestra la planificación de tu equipo o grupo en formato semana o mes.\n\n• Pulsa sobre un día para ver el detalle de la sesión: tipo, intensidad, duración y contenidos.\n• Si tu preparador/a ha habilitado la opción de nota del atleta, podrás añadir un texto sobre la sesión directamente desde el detalle.\n• Los colores indican la intensidad planificada de cada sesión.\n• Si perteneces a un mesociclo menstrual, verás las fases del ciclo reflejadas en el calendario.`,
  },
  {
    title: "Mis datos",
    content: `Acceso a tu perfil personal y tu historial.\n\n• Datos personales: puedes editar tu información como modalidad deportiva, posición, fecha de nacimiento y foto de perfil.\n• Historial de wellness: gráfica con la evolución de tus valores de bienestar a lo largo del tiempo.\n• Historial de RPE: evolución de tu carga de entrenamiento sesión a sesión.\n• Datos físicos: tests físicos registrados por tu preparador/a y tu historial lesivo.`,
  },
  {
    title: "Notificaciones",
    content: `Configura a qué hora quieres recibir recordatorios para rellenar los formularios.\n\n• Recordatorio de Wellness: actívalo y elige la hora a la que quieres que te avise para rellenar el wellness diario.\n• Recordatorio de RPE: actívalo y elige la hora del recordatorio para el formulario de esfuerzo post-entreno.\n\nNota: las notificaciones funcionan mientras tienes la app abierta o en segundo plano.`,
  },
];

const READONLY_EXCLUDED = ["Avisos", "Ajustes"];

export default function HelpPanel({ onClose, readOnly = false, mode = "coach" }) {
  const SECTIONS = mode === "player"
    ? SECTIONS_PLAYER
    : readOnly
      ? SECTIONS_ALL.filter((s) => !READONLY_EXCLUDED.includes(s.title))
      : SECTIONS_ALL;
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1.5rem" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "player" ? (
              <svg width="20" height="20" viewBox="0 0 512 512" fill="none" stroke={COLORS.lime} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="256" cy="256" r="220" />
                <circle cx="256" cy="160" r="18" fill={COLORS.lime} stroke="none" />
                <line x1="256" y1="220" x2="256" y2="360" strokeWidth="40" />
                <line x1="210" y1="360" x2="302" y2="360" strokeWidth="36" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 512 512" fill="none" stroke={COLORS.lime} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="256" cy="256" r="220" />
                <path d="M190 186c0-36 29-66 66-66s66 30 66 66c0 44-66 66-66 88" />
                <circle cx="256" cy="370" r="18" fill={COLORS.lime} stroke="none" />
              </svg>
            )}
            <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.text }}>{mode === "player" ? "Info" : "Ayuda"}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 20px 24px", flex: 1 }}>
          <p style={{ fontSize: 13, color: COLORS.text, margin: "14px 0 6px", lineHeight: 1.5 }}>
            Guía de uso de la app. Despliega cada sección para ver cómo funciona.
          </p>
          {SECTIONS.map((s, i) => (
            <AccordionItem
              key={i}
              title={s.title}
              content={s.content}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
