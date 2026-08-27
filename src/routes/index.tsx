import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { areas, professorColor, subjects } from "@/data/subjects";
import type { Lesson, Subject } from "@/data/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aulas de Matemática e Naturezas — Medicina 07h00" },
      {
        name: "description",
        content:
          "Todas as aulas de Matemática, Naturezas, Humanas e Linguagens organizadas por mês, professor e conteúdo, com busca e marcação de progresso.",
      },
      {
        property: "og:title",
        content: "Aulas de Matemática e Naturezas — Medicina 07h00",
      },
      {
        property: "og:description",
        content:
          "Acesse rapidamente as gravações das aulas por matéria, mês, professor e conteúdo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "aulas-vistas";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function Index() {
  const [subjectId, setSubjectId] = useState(subjects[0]!.id);
  const [query, setQuery] = useState("");
  const [prof, setProf] = useState<string | null>(null);
  const [watched, setWatched] = useState<string[]>([]);
  const [onlyPending, setOnlyPending] = useState(false);
  const [playing, setPlaying] = useState<Lesson | null>(null);


  const subject = subjects.find((s) => s.id === subjectId)!;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWatched(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleWatched = (id: string) => {
    setWatched((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return subject.lessons.filter((l) => {
      if (prof && l.professor !== prof) return false;
      if (onlyPending && watched.includes(l.id)) return false;
      if (!q) return true;
      return normalize(`${l.title} ${l.professor} ${l.frente} ${l.date} ${l.month}`).includes(
        q,
      );
    });
  }, [subject, query, prof, onlyPending, watched]);

  const grouped = subject.months
    .map((m) => ({ month: m, items: filtered.filter((l) => l.month === m) }))
    .filter((g) => g.items.length > 0);

  const subjectWatched = subject.lessons.filter((l) => watched.includes(l.id)).length;
  const progress = Math.round((subjectWatched / subject.lessons.length) * 100);
  const total = subjects.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-5 pt-16 pb-8 sm:px-8">
        <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">
          Medicina · 07h00
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold sm:text-6xl">
          Suas aulas de <span className="text-primary">{subject.label}</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-base sm:text-lg">
          {subject.tagline} — {total} gravações catalogadas de todas as áreas,
          com busca por conteúdo e controle do que você já revisou.
        </p>

        <nav className="mt-10 space-y-5">
          {areas.map((area) => {
            const items = subjects.filter((s) => s.area === area);
            if (items.length === 0) return null;
            return (
              <div key={area}>
                <p className="font-display text-muted-foreground/70 mb-3 text-[0.68rem] tracking-[0.28em] uppercase">
                  {area}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((s) => {
                    const done = s.lessons.filter((l) => watched.includes(l.id)).length;
                    const pct = Math.round((done / s.lessons.length) * 100);
                    const active = s.id === subjectId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSubjectId(s.id);
                          setProf(null);
                        }}
                        className={`card-surface rounded-2xl p-4 text-left ${
                          active ? "ring-primary ring-2" : ""
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`font-display text-sm font-semibold ${
                              active ? "text-primary" : ""
                            }`}
                          >
                            {s.label}
                          </span>
                          <span className="text-muted-foreground/70 text-[0.7rem]">
                            {s.lessons.length}
                          </span>
                        </div>
                        <div className="bg-muted mt-3 h-1 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-muted-foreground/70 mt-2 text-[0.7rem]">
                          {pct}% revisado
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>


        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card-surface rounded-2xl p-5">
            <p className="font-display text-3xl font-bold">{subject.lessons.length}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              aulas de {subject.label}
            </p>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <p className="font-display text-3xl font-bold">{subject.months.length}</p>
            <p className="text-muted-foreground mt-1 text-sm">meses de conteúdo</p>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <p className="font-display text-3xl font-bold">{progress}%</p>
            <div className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {subjectWatched} de {subject.lessons.length} revisadas
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subject.professors.map((p) => {
            const color = professorColor(subject, p);
            const items = subject.lessons.filter((l) => l.professor === p);
            const frentes = Array.from(new Set(items.map((l) => l.frente))).join(", ");
            return (
              <button
                key={p}
                onClick={() => setProf(prof === p ? null : p)}
                className={`card-surface rounded-2xl p-5 text-left ${
                  prof === p ? "ring-primary ring-2" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <p className="font-display text-lg font-semibold">{p}</p>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {frentes ? `Frente ${frentes}` : "Aula especial"}
                </p>
                <p className="text-muted-foreground/70 mt-3 text-xs">
                  {items.length} aulas
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conteúdo, ex: citologia, ondas, estequiometria…"
              className="bg-card/70 border-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/70 w-full rounded-full border px-5 py-3 text-sm outline-none focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnlyPending((v) => !v)}
              className={`chip ${onlyPending ? "chip-active" : ""}`}
            >
              Só pendentes
            </button>
            {prof && (
              <button onClick={() => setProf(null)} className="chip">
                Limpar professor
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-24 sm:px-8">
        {grouped.length === 0 && (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nenhuma aula encontrada com esses filtros.
          </p>
        )}

        {grouped.map((group) => (
          <section key={group.month} className="mb-12">
            <div className="mb-5 flex items-center gap-4">
              <h2 className="font-display text-xl font-semibold">{group.month}</h2>
              <span className="border-border h-px flex-1 border-t" />
              <span className="text-muted-foreground text-xs">
                {group.items.length} aulas
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.items.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  color={professorColor(subject, lesson.professor)}
                  watched={watched.includes(lesson.id)}
                  onToggle={() => toggleWatched(lesson.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-5 py-8 text-xs sm:px-8">
          Plataforma pessoal de estudos · gravações hospedadas no Zoom do Sistema Poliedro.
        </div>
      </footer>
    </div>
  );
}

function LessonCard({
  lesson,
  color,
  watched,
  onToggle,
}: {
  lesson: Lesson;
  color: string;
  watched: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="card-surface relative overflow-hidden rounded-2xl p-5">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span className="font-display text-foreground">{lesson.date}</span>
            <span>·</span>
            <span style={{ color }}>{lesson.professor}</span>
            {lesson.frente && (
              <span className="border-border rounded-full border px-2 py-0.5">
                Frente {lesson.frente}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base leading-snug font-semibold">{lesson.title}</h3>
        </div>
        <button
          onClick={onToggle}
          aria-label={watched ? "Marcar como não revisada" : "Marcar como revisada"}
          className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm transition-colors ${
            watched
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary"
          }`}
        >
          ✓
        </button>
      </div>
      <div className="mt-5 flex items-center gap-3 pl-2">
        <a
          href={lesson.url}
          target="_blank"
          rel="noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
        >
          Assistir aula
        </a>
        <span className="text-muted-foreground/70 text-xs">
          {watched ? "Revisada" : "Pendente"}
        </span>
      </div>
    </article>
  );
}

export type { Subject };
