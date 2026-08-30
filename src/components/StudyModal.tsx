import { useEffect, useMemo, useState } from "react";
import { addMaterials, getMaterials, removeMaterial, type Material } from "@/lib/materials";
import { getRecordings, sourceUrl, type Cam, type LessonRecordings } from "@/lib/recordings";
import type { Lesson } from "@/data/types";

const CAMS: { key: Cam; label: string }[] = [
  { key: "cam1", label: "Câmera 1" },
  { key: "cam2", label: "Câmera 2" },
];

export function StudyModal({
  lesson,
  onClose,
  onChanged,
}: {
  lesson: Lesson;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recs, setRecs] = useState<LessonRecordings>({});
  const [loading, setLoading] = useState(true);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    void Promise.all([getMaterials(lesson.id), getRecordings(lesson.id)]).then(([m, r]) => {
      setMaterials(m);
      setActiveId(m[0]?.id ?? null);
      setRecs(r);
      setLoading(false);
    });
  }, [lesson.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = materials.find((m) => m.id === activeId) ?? null;

  const pdfUrl = useMemo(() => (active ? URL.createObjectURL(active.blob) : null), [active]);
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const videoUrls = useMemo(() => {
    const out: { label: string; url: string }[] = [];
    for (const { key, label } of CAMS) {
      const src = recs[key];
      if (src) out.push({ label, url: sourceUrl(src) });
    }
    return out;
  }, [recs]);

  const upload = async (files: FileList) => {
    const list = Array.from(files).filter((f) => f.type === "application/pdf");
    if (list.length === 0) return;
    const next = await addMaterials(lesson.id, list);
    setMaterials(next);
    setActiveId(next[next.length - 1]?.id ?? null);
    onChanged?.();
  };

  const drop = async (id: string) => {
    const next = await removeMaterial(lesson.id, id);
    setMaterials(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    onChanged?.();
  };

  const openSideWindow = () => {
    const w = Math.floor(window.screen.availWidth / 2);
    window.open(
      lesson.url,
      "aula-zoom",
      `popup=yes,width=${w},height=${window.screen.availHeight},left=${w},top=0`,
    );
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-5 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs">
            {lesson.date} · {lesson.professor}
            {lesson.frente ? ` · Frente ${lesson.frente}` : ""}
          </p>
          <h2 className="font-display truncate text-base font-semibold">{lesson.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setWide((v) => !v)} className="chip">
            {wide ? "Mostrar aula" : "Só o PDF"}
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="border-border text-muted-foreground hover:border-primary grid size-8 place-items-center rounded-full border"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          className={`border-border flex min-h-0 flex-col lg:border-r ${
            wide ? "flex-1" : "lg:w-3/5"
          }`}
        >
          <div className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2">
            <label className="border-border hover:border-primary cursor-pointer rounded-full border border-dashed px-3 py-1.5 text-xs">
              ＋ Enviar PDF
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {materials.map((m) => (
              <span
                key={m.id}
                className={`chip flex items-center gap-2 ${m.id === activeId ? "chip-active" : ""}`}
              >
                <button onClick={() => setActiveId(m.id)} className="max-w-[14rem] truncate">
                  {m.name}
                </button>
                <button
                  onClick={() => drop(m.id)}
                  aria-label={`Remover ${m.name}`}
                  className="opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {loading ? (
              <p className="text-muted-foreground p-10 text-center text-sm">Carregando…</p>
            ) : pdfUrl ? (
              <iframe src={pdfUrl} title={active?.name} className="h-full min-h-[60vh] w-full" />
            ) : (
              <div className="text-muted-foreground grid h-full min-h-[40vh] place-items-center p-8 text-center text-sm">
                Envie o PDF da aula para lê-lo aqui ao lado da gravação.
              </div>
            )}
          </div>
        </section>

        {!wide && (
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 lg:w-2/5">
            {videoUrls.length > 0 ? (
              videoUrls.map((v) => (
                <div key={v.label}>
                  <p className="text-muted-foreground mb-1 text-xs">{v.label}</p>
                  <video src={v.url} controls playsInline className="bg-muted w-full rounded-2xl" />
                </div>
              ))
            ) : (
              <div className="card-surface rounded-2xl p-5">
                <p className="font-display text-sm font-semibold">Assistir a aula</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Zoom e Teams bloqueiam a exibição dentro de outros sites, então a aula abre
                  numa janela ao lado — deixe o PDF nesta metade da tela e a aula na outra.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={openSideWindow}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-medium"
                  >
                    ▶ Abrir aula em janela lateral
                  </button>
                  <a
                    href="https://teams.microsoft.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="border-border hover:border-primary text-muted-foreground rounded-full border px-4 py-2 text-sm"
                  >
                    Abrir Teams
                  </a>
                </div>
                <p className="text-muted-foreground/70 mt-3 text-xs">
                  Dica: baixe a gravação no Zoom e adicione em “Adicionar gravações” para tocar o
                  vídeo aqui dentro, sincronizado com o PDF.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
