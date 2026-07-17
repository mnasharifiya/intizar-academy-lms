import { supabase } from './supabase';

export type CbtExamStatus = "draft" | "published" | "closed";

export type CbtQuestionInput = {
  questionText: string;
  questionType: "mcq" | "true_false";
  points: number;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
};

export type CbtExamInput = {
  title: string;
  description?: string;
  courseId: string;
  groupId: string;
  durationMinutes: number;
  attemptsAllowed: number;
  startAt?: string | null;
  endAt?: string | null;
  status: CbtExamStatus;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  questions: CbtQuestionInput[];
};

export async function loadCbtExams() {
  const [examsRes, questionsRes, optionsRes, attemptsRes] = await Promise.all([
    supabase.from("cbt_exams").select("*").order("created_at", { ascending: false }),
    supabase.from("cbt_questions").select("*").order("sort_order", { ascending: true }),
    supabase.from("cbt_options").select("*").order("sort_order", { ascending: true }),
    supabase.from("cbt_attempts").select("*").order("created_at", { ascending: false }),
  ]);

  if (examsRes.error) throw examsRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (optionsRes.error) throw optionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  return {
    exams: examsRes.data ?? [],
    questions: questionsRes.data ?? [],
    options: optionsRes.data ?? [],
    attempts: attemptsRes.data ?? [],
  };
}

export async function saveCbtExam(input: CbtExamInput) {
  if (!input.title.trim()) throw new Error("Exam title is required.");
  if (!input.groupId) throw new Error("Group is required.");
  if (!input.courseId) throw new Error("Course is required.");
  if (!input.durationMinutes || input.durationMinutes < 1) throw new Error("Duration must be at least 1 minute.");
  if (!input.questions.length) throw new Error("Add at least one question.");

  input.questions.forEach((question, index) => {
    if (!question.questionText.trim()) {
      throw new Error("Question " + (index + 1) + " text is required.");
    }

    if (!question.points || question.points <= 0) {
      throw new Error("Question " + (index + 1) + " points must be greater than 0.");
    }

    if (question.questionType === "mcq" && question.options.length < 2) {
      throw new Error("Question " + (index + 1) + " needs at least two options.");
    }

    if (question.questionType === "true_false" && question.options.length !== 2) {
      throw new Error("True/False question " + (index + 1) + " must have True and False options.");
    }

    const correctCount = question.options.filter(option => option.isCorrect).length;

    if (correctCount !== 1) {
      throw new Error("Question " + (index + 1) + " must have exactly one correct answer.");
    }
  });

  const totalPoints = input.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);

  const { data: exam, error: examError } = await supabase
    .from("cbt_exams")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      course_id: input.courseId,
      group_id: input.groupId,
      duration_minutes: input.durationMinutes,
      attempts_allowed: input.attemptsAllowed,
      start_at: input.startAt || null,
      end_at: input.endAt || null,
      status: input.status,
      shuffle_questions: input.shuffleQuestions,
      show_result_immediately: input.showResultImmediately,
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (examError) throw examError;

  for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
    const question = input.questions[qIndex];

    const { data: savedQuestion, error: questionError } = await supabase
      .from("cbt_questions")
      .insert({
        exam_id: (exam as any).id,
        question_text: question.questionText.trim(),
        question_type: question.questionType,
        points: question.points,
        sort_order: qIndex + 1,
      })
      .select("*")
      .single();

    if (questionError) throw questionError;

    const optionRows = question.options.map((option, optionIndex) => ({
      question_id: (savedQuestion as any).id,
      option_text: option.optionText.trim(),
      is_correct: option.isCorrect,
      sort_order: optionIndex + 1,
    }));

    const { error: optionsError } = await supabase.from("cbt_options").insert(optionRows);

    if (optionsError) throw optionsError;
  }

  return exam;
}

export async function deleteCbtExam(examId: string) {
  const { error } = await supabase
    .from("cbt_exams")
    .delete()
    .eq("id", examId);

  if (error) throw error;

  return true;
}

export async function updateCbtExamStatus(examId: string, status: CbtExamStatus) {
  const { error } = await supabase
    .from("cbt_exams")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", examId);

  if (error) throw error;

  return true;
}
