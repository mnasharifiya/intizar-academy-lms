
import type { CbtQuestionInput } from "./cbtApi";

export function parseCbtQuestionsFromText(rawText: string): CbtQuestionInput[] {
  const text = rawText
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const questions: CbtQuestionInput[] = [];

  let current: {
    questionText: string;
    points: number;
    options: { label: string; optionText: string }[];
    answer: string;
  } | null = null;

  function finishCurrent() {
    if (!current) return;

    if (!current.questionText.trim()) return;

    if (current.options.length < 2) {
      throw new Error("Question has fewer than 2 options: " + current.questionText);
    }

    if (!current.answer.trim()) {
      throw new Error("Missing answer for question: " + current.questionText);
    }

    const answer = current.answer.trim().toLowerCase();

    const correctIndex = current.options.findIndex(option => {
      const label = option.label.toLowerCase();
      const text = option.optionText.trim().toLowerCase();

      return (
        label === answer ||
        text === answer ||
        answer === text.charAt(0)
      );
    });

    if (correctIndex === -1) {
      throw new Error("Could not match answer '" + current.answer + "' for question: " + current.questionText);
    }

    const isTrueFalse =
      current.options.length === 2 &&
      current.options.some(o => o.optionText.trim().toLowerCase() === "true") &&
      current.options.some(o => o.optionText.trim().toLowerCase() === "false");

    questions.push({
      questionText: current.questionText.trim(),
      questionType: isTrueFalse ? "true_false" : "mcq",
      points: current.points || 1,
      options: current.options.map((option, index) => ({
        optionText: option.optionText.trim(),
        isCorrect: index === correctIndex,
      })),
    });
  }

  for (const line of lines) {
    const questionMatch = line.match(/^(?:q(?:uestion)?\.?\s*)?\d+[\).\:\-]\s*(.+)$/i);
    const optionMatch = line.match(/^([A-Ha-h])[\).\:\-]\s*(.+)$/);
    const answerMatch = line.match(/^(?:answer|ans|correct|correct answer)\s*[\:\-]\s*(.+)$/i);
    const pointsMatch = line.match(/^(?:points|mark|marks)\s*[\:\-]\s*(\d+(?:\.\d+)?)$/i);

    if (questionMatch) {
      finishCurrent();

      current = {
        questionText: questionMatch[1].trim(),
        points: 1,
        options: [],
        answer: "",
      };

      continue;
    }

    if (!current) {
      current = {
        questionText: line,
        points: 1,
        options: [],
        answer: "",
      };
      continue;
    }

    if (optionMatch) {
      current.options.push({
        label: optionMatch[1].toUpperCase(),
        optionText: optionMatch[2].trim(),
      });
      continue;
    }

    if (answerMatch) {
      current.answer = answerMatch[1].trim();
      continue;
    }

    if (pointsMatch) {
      current.points = Number(pointsMatch[1]);
      continue;
    }

    if (current.options.length === 0 && !current.answer) {
      current.questionText += " " + line;
    }
  }

  finishCurrent();

  return questions;
}

export async function extractTextFromExamFile(file: File) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".csv")) {
    return await file.text();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await (mammoth as any).extractRawText({ arrayBuffer });
    return result.value || "";
  }

  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = await import("pdfjs-dist/build/pdf.worker.mjs?url");

    (pdfjs as any).GlobalWorkerOptions.workerSrc = (workerSrc as any).default;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: arrayBuffer }).promise;

    let output = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      output += content.items
        .map((item: any) => item.str)
        .join(" ") + "\n";
    }

    return output;
  }

  throw new Error("Unsupported file type. Please upload PDF, DOCX, TXT, or CSV.");
}
