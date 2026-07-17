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
      start_at: input.startAt || null,
      end_at: input.endAt || null,
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
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const { data: exam, error: examError } = await supabase
    .from("cbt_exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (examError) throw examError;

  if ((exam as any).status !== "published") {
    throw new Error("This exam is not published.");
  }

  const now = new Date();

  if ((exam as any).start_at && now < new Date((exam as any).start_at)) {
    throw new Error("This exam has not started yet.");
  }

  if ((exam as any).end_at && now > new Date((exam as any).end_at)) {
    throw new Error("This exam has ended.");
  }

  const { data: previousAttempts, error: attemptsError } = await supabase
    .from("cbt_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (attemptsError) throw attemptsError;

  const existingInProgress = (previousAttempts ?? []).find((attempt: any) => attempt.status === "in_progress");

  if (existingInProgress) return existingInProgress;

  const submittedCount = (previousAttempts ?? []).filter((attempt: any) => attempt.status === "submitted").length;

  if (submittedCount >= Number((exam as any).attempts_allowed || 1)) {
    throw new Error("You have already used your allowed attempt(s) for this exam.");
  }

  const { data: attempt, error } = await supabase
    .from("cbt_attempts")
    .insert({
      exam_id: examId,
      student_id: userId,
      total_points: Number((exam as any).total_points || 0),
      status: "in_progress",
    })
    .select("*")
    .single();

  if (error) throw error;

  return attempt;
}

export async function submitCbtAttempt(
  attemptId: string,
  answers: { questionId: string; selectedOptionId: string }[]
) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const { data: attempt, error: attemptError } = await supabase
    .from("cbt_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError) throw attemptError;

  if ((attempt as any).student_id !== userId) {
    throw new Error("This attempt does not belong to you.");
  }

  if ((attempt as any).status !== "in_progress") {
    throw new Error("This attempt is already submitted.");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("cbt_questions")
    .select("*")
    .eq("exam_id", (attempt as any).exam_id);

  if (questionsError) throw questionsError;

  const questionIds = (questions ?? []).map((question: any) => question.id);

  const { data: options, error: optionsError } = await supabase
    .from("cbt_options")
    .select("*")
    .in("question_id", questionIds);

  if (optionsError) throw optionsError;

  const answerRows = (questions ?? []).map((question: any) => {
    const selected = answers.find(answer => answer.questionId === question.id);
    const selectedOption = (options ?? []).find((option: any) => option.id === selected?.selectedOptionId);
    const isCorrect = Boolean((selectedOption as any)?.is_correct);
    const pointsAwarded = isCorrect ? Number(question.points || 0) : 0;

    return {
      attempt_id: attemptId,
      question_id: question.id,
      selected_option_id: selected?.selectedOptionId || null,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    };
  });

  if (answerRows.length) {
    const { error: answersError } = await supabase
      .from("cbt_answers")
      .upsert(answerRows, {
        onConflict: "attempt_id,question_id",
      });

    if (answersError) throw answersError;
  }

  const totalPoints = (questions ?? []).reduce((sum: number, question: any) => sum + Number(question.points || 0), 0);
  const score = answerRows.reduce((sum: number, row: any) => sum + Number(row.points_awarded || 0), 0);
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 10000) / 100 : 0;

  const { data: updatedAttempt, error: updateError } = await supabase
    .from("cbt_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score,
      total_points: totalPoints,
      percentage,
      status: "submitted",
    })
    .eq("id", attemptId)
    .select("*")
    .single();

  if (updateError) throw updateError;

  // Sync submitted CBT score into the main Student Grades system.
  // If sync fails, do not block the student submission.
  const { error: syncError } = await (supabase as any).rpc("sync_cbt_attempt_to_grade", {
    p_attempt_id: attemptId,
  });

  if (syncError) {
    console.warn("CBT grade sync failed:", syncError.message);
  }

  return updatedAttempt;
}

