import { supabase } from './supabase';

export type CbtExamStatus = "draft" | "published" | "closed";

function cbtWatDateTimeToIso(value?: string | null) {
  if (!value) return null;

  // INTIZAR CBT time is handled as Nigeria/WAT time.
  // datetime-local gives "YYYY-MM-DDTHH:mm", so we attach +01:00.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return new Date(value + ":00+01:00").toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value + "+01:00").toISOString();
  }

  return new Date(value).toISOString();
}

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
  gradeComponentType?: string;
  questions: CbtQuestionInput[];
};

export async function loadCbtExams() {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const profileRes = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error) throw profileRes.error;

  const role = (profileRes.data as any)?.role;

  let examQuery = supabase
    .from("cbt_exams")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "instructor") {
    examQuery = examQuery.eq("instructor_id", userId);
  }

  const examsRes = await examQuery;

  if (examsRes.error) throw examsRes.error;

  const exams = examsRes.data ?? [];
  const examIds = exams.map((exam: any) => exam.id);

  if (!examIds.length) {
    return {
      exams: [],
      questions: [],
      options: [],
      attempts: [],
    };
  }

  const [questionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("cbt_questions")
      .select("*")
      .in("exam_id", examIds)
      .order("sort_order", { ascending: true }),

    supabase
      .from("cbt_attempts")
      .select("*")
      .in("exam_id", examIds)
      .order("created_at", { ascending: false }),
  ]);

  if (questionsRes.error) throw questionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const questionIds = (questionsRes.data ?? []).map((question: any) => question.id);

  let optionRows: any[] = [];

  if (questionIds.length) {
    const optionsRes = await supabase
      .from("cbt_options")
      .select("*")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (optionsRes.error) throw optionsRes.error;

    optionRows = optionsRes.data ?? [];
  }

  return {
    exams,
    questions: questionsRes.data ?? [],
    options: optionRows,
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
      instructor_id: (await supabase.auth.getUser()).data.user?.id,
      description: input.description?.trim() || null,
      course_id: input.courseId,
      group_id: input.groupId,
      duration_minutes: input.durationMinutes,
      attempts_allowed: input.attemptsAllowed,
      start_at: cbtWatDateTimeToIso(input.startAt),
      end_at: cbtWatDateTimeToIso(input.endAt),
      status: input.status,
      shuffle_questions: input.shuffleQuestions,
      show_result_immediately: input.showResultImmediately,
      grade_component_type: input.gradeComponentType || "quiz",
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


export async function loadStudentCbtData(_groupIds: string[]) {
  const { data, error } = await (supabase as any).rpc("get_student_cbt_data");

  if (error) throw error;

  return {
    exams: data?.exams ?? [],
    questions: data?.questions ?? [],
    options: data?.options ?? [],
    attempts: data?.attempts ?? [],
  };
}

export async function startCbtAttempt(examId: string) {
  const { data, error } = await (supabase as any).rpc("start_cbt_attempt_secure", {
    p_exam_id: examId,
  });

  if (error) throw error;

  return data?.attempt ?? data;
}

export async function submitCbtAttempt(
  attemptId: string,
  answers:
    | Record<string, string>
    | Array<{ questionId: string; selectedOptionId: string }>
) {
  const answersByQuestionId = Array.isArray(answers)
    ? answers.reduce((acc: Record<string, string>, row: any) => {
        if (row?.questionId && row?.selectedOptionId) {
          acc[row.questionId] = row.selectedOptionId;
        }

        return acc;
      }, {})
    : answers || {};

  const { data, error } = await (supabase as any).rpc("submit_cbt_attempt_secure", {
    p_attempt_id: attemptId,
    p_answers: answersByQuestionId,
  });

  if (error) throw error;

  return data?.attempt ?? data;
}

