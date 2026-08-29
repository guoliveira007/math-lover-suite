import { useEffect, useRef, useState } from "react";
import {
  getRecordings,
  setRecording,
  sourceUrl,
  type Cam,
  type LessonRecordings,
} from "@/lib/recordings";
import type { Lesson } from "@/data/types";

const CAMS: { key: Cam; label: string }[] = [
  { key: "cam1", label: "Câmera 1" },
  { key: "cam2", label: "Câmera 2" },
];

export function RecordingsModal({
  lesson,
  onClose,
  onChanged,
}: {
  lesson: Lesson;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [recs, setRecs] = useState<LessonRecordings>({});
  const [urls, setUrls] = useState<Partial<Record<Cam, string>>>({});
  const [drafts, setDrafts] = useState<Record<Cam, string>>({ cam1: "", cam2: "" });
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef<Partial<Record<Cam, HTMLVideoElement | null>>>({});
  const syncing = useRef(false);

  useEffect(() => {
    let revoke: string[] = [];
    getRecordings(lesson.id).then((r) => {
      setRecs(r);
      const next: Partial<Record<Cam, string>> = {};
      for (const { key } of CAMS) {
        const src = r[key];
        if (src) {
          const u = sourceUrl(src);
          next[key] = u;
          if (src.kind === "file") revoke.push(u);
        }
      }
      setUrls(next);
      setLoading(false);
    });
    return () => revoke.forEach((u) => URL.revokeObjectURL(u));
  }, [lesson.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refresh = async () => {
    const r = await getRecordings(lesson.id);
    setRecs(r);
    const next: Partial<Record<Cam, string>> = {};
    for (const { key } of CAMS) {
      const src = r[key];
      if (src) next[key] = sourceUrl(src);
    }
    setUrls(next);
    onChanged?.();
  };

  const attachFile = async (cam: Cam, file: File) => {
    await setRecording(lesson.id, cam, { kind: "file", blob: file, name: file.name });
    await refresh();
  };

  const attachUrl = async (cam: Cam) => {
    const url = drafts[cam].trim();
    if (!url) return;
    await setRecording(lesson.id, cam, { kind: "url", url });
    setDrafts((d) => ({ ...d, [cam]: "" }));
    await refresh();
  };

  const remove = async (cam: Cam) => {
    await setRecording(lesson.id, cam, null);
    await refresh();
  };

  // Sincroniza as duas câmeras (play/pause/seek)
  const mirror = (from: Cam, action: "play" | "pause" | "seek") => {
    if (syncing.current) return;
    const a = videoRefs.current[from];
    const other = from === "cam1" ? "cam2" : "cam1";
    const b = videoRefs.current[other];
    if (!a || !b) return;
    syncing.current = true;
    if (action === "play") {
      b.currentTime = a.currentTime;
      void b.play();
    } else if (action === "pause") {
      b.pause();
      b.currentTime = a.currentTime;
    } else if (Math.abs(b.currentTime - a.currentTime) > 0.4) {
      b.currentTime = a.currentTime;
    }
    setTimeout(() => (syncing.current = false), 80);
  };

  const hasAny = CAMS.some(({ key }) => urls[key]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-surface my-8 w-full max-w-5xl rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs">
              {lesson.date} · {lesson.professor}
              {lesson.frente ? ` · Frente ${lesson.frente}` : ""}
            </p>
            <h2 className="font-display mt-1 text-xl font-semibold">{lesson.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="border-border text-muted-foreground hover:border-primary grid size-8 shrink-0 place-items-center rounded-full border"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-10 text-center text-sm">Carregando…</p>
        ) : (
          <>
            {hasAny && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {CAMS.map(({ key, label }) =>
                  urls[key] ? (
                    <div key={key}>
                      <p className="text-muted-foreground mb-2 text-xs">{label}</p>
                      <video
                        ref={(el) => {
                          videoRefs.current[key] = el;
                        }}
                        src={urls[key]}
                        controls
                        playsInline
                        onPlay={() => mirror(key, "play")}
                        onPause={() => mirror(key, "pause")}
                        onSeeked={() => mirror(key, "seek")}
                        className="bg-muted aspect-video w-full rounded-2xl"
                      />
                    </div>
                  ) : null,
                )}
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {CAMS.map(({ key, label }) => {
                const src = recs[key];
                return (
                  <div key={key} className="border-border rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-sm font-semibold">{label}</p>
                      {src && (
                        <button
                          onClick={() => remove(key)}
                          className="text-muted-foreground hover:text-primary text-xs"
                        >
                          remover
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground/70 mt-1 text-xs">
                      {src
                        ? src.kind === "file"
                          ? src.name
                          : src.url
                        : "Nenhuma gravação adicionada"}
                    </p>

                    <label className="border-border hover:border-primary mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-3 text-xs transition-colors">
                      Escolher arquivo de vídeo
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void attachFile(key, f);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <div className="mt-2 flex gap-2">
                      <input
                        value={drafts[key]}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                        placeholder="ou cole um link direto (.mp4)"
                        className="bg-card/70 border-border focus:border-primary text-foreground placeholder:text-muted-foreground/70 w-full rounded-full border px-3 py-2 text-xs outline-none"
                      />
                      <button
                        onClick={() => attachUrl(key)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-2 text-xs font-medium"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-muted-foreground/70 mt-4 text-xs">
              Os vídeos ficam guardados só neste navegador. Baixe a gravação de cada câmera no
              Zoom e adicione aqui — as duas tocam sincronizadas.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
