import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window { JitsiMeetExternalAPI: any; }
}

export default function SwachMeetRoom() {
  const params = useParams<{ roomId?: string; roomCode?: string }>();
  const roomId = params.roomId || params.roomCode || "default";
  const jitsiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "connected" | "ended">("loading");
  const [participants, setParticipants] = useState(0);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => initJitsi();
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch { /* already removed */ }
      if (jitsiRef.current) { try { jitsiRef.current.dispose(); } catch { /* disposed */ } }
    };
  }, [roomId]);

  async function initJitsi() {
    try {
      const res = await apiRequest("POST", `/api/swachmeet/rooms/${roomId}/token`, {
        user: { name: "SwachERP User", email: "user@swacherp.com" },
      });
      const data = await res.json();
      setRoomInfo(data);

      if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

      const api = new window.JitsiMeetExternalAPI(data.jitsiDomain || "meet.jit.si", {
        roomName: `SwachERP-${roomId}`,
        jwt: data.token,
        width: "100%",
        height: "100%",
        parentNode: containerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ["microphone", "camera", "closedcaptions", "desktop", "fullscreen",
            "fodeviceselection", "hangup", "chat", "recording", "settings", "videoquality", "tileview"],
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
        },
      });
      jitsiRef.current = api;

      api.addEventListeners({
        videoConferenceJoined: () => setStatus("connected"),
        videoConferenceLeft: () => setStatus("ended"),
        participantJoined: () => setParticipants(p => p + 1),
        participantLeft: () => setParticipants(p => Math.max(0, p - 1)),
        recordingStatusChanged: (e: any) => setRecording(e.on),
      });
    } catch (err) {
      console.error("Jitsi init error:", err);
    }
  }

  async function toggleRecording() {
    const action = recording ? "stop" : "start";
    try {
      await apiRequest("POST", `/api/swachmeet/rooms/${roomId}/recording/${action}`, {});
      setRecording(!recording);
    } catch (err) {
      console.error("Recording toggle error:", err);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#111", color: "#fff", fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>SwachMeet · Room: {roomId}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>
          {status === "connected"
            ? `● Live · ${participants} participant${participants !== 1 ? "s" : ""}`
            : status === "loading" ? "Connecting…" : "Call ended"}
        </span>
        {status === "connected" && (
          <button
            onClick={toggleRecording}
            style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: recording ? "#e34948" : "#378ADD", color: "#fff", cursor: "pointer", fontSize: 12 }}
          >
            {recording ? "⏹ Stop Recording" : "⏺ Record"}
          </button>
        )}
        <a href="/swachmeet" style={{ padding: "4px 10px", borderRadius: 4, background: "#444", color: "#fff", textDecoration: "none", fontSize: 12 }}>
          ← Back
        </a>
      </div>

      {/* Jitsi video container */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {status === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>
            Loading video call…
          </div>
        )}
        {status === "ended" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12 }}>
            <div style={{ fontSize: 18 }}>Call ended</div>
            <a href="/swachmeet" style={{ padding: "8px 16px", background: "#378ADD", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
              Back to meetings
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
