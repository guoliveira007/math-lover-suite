import { mathRaw } from "./lessons";
import { bioRaw, fisicaRaw, quimicaRaw } from "./naturezas";
import type { Lesson, RawLesson, Subject } from "./types";

const monthNames: Record<string, string> = {
  jan: "Janeiro",
  fev: "Fevereiro",
  mar: "Março",
  abr: "Abril",
  mai: "Maio",
  jun: "Junho",
  jul: "Julho",
  ago: "Agosto",
  set: "Setembro",
  out: "Outubro",
  nov: "Novembro",
  dez: "Dezembro",
};

const monthOrder = Object.keys(monthNames);

function build(
  id: string,
  label: string,
  tagline: string,
  raw: RawLesson[],
): Subject {
  const lessons: Lesson[] = raw
    .map(([date, professor, frente, title, url], i) => ({
      id: `${id}-${i}`,
      date,
      month: monthNames[date.split("/")[1] ?? ""] ?? date,
      professor: professor || "Convidado",
      frente,
      title,
      url,
      subject: id,
    }))
    .sort((a, b) => {
      const [da, ma] = a.date.split("/");
      const [db, mb] = b.date.split("/");
      const mi = monthOrder.indexOf(ma ?? "") - monthOrder.indexOf(mb ?? "");
      return mi !== 0 ? mi : Number(da) - Number(db);
    });

  return {
    id,
    label,
    tagline,
    lessons,
    professors: Array.from(new Set(lessons.map((l) => l.professor))),
    months: Array.from(new Set(lessons.map((l) => l.month))),
  };
}

export const subjects: Subject[] = [
  build(
    "matematica",
    "Matemática",
    "Frentes 1, 3 e M2 — funções, geometria e álgebra",
    mathRaw,
  ),
  build("biologia", "Biologia", "Frentes 1 a 4 — citologia, ecologia e zoologia", bioRaw),
  build("fisica", "Física", "Frentes 1 a 4 — mecânica, termologia e ondas", fisicaRaw),
  build(
    "quimica",
    "Química",
    "Frentes 1 a 4 — atomística, físico-química e orgânica",
    quimicaRaw,
  ),
];

export const allLessons = subjects.flatMap((s) => s.lessons);

export const accentVars = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"];

export function professorColor(subject: Subject, professor: string) {
  const i = subject.professors.indexOf(professor);
  return `var(${accentVars[i % accentVars.length]})`;
}
