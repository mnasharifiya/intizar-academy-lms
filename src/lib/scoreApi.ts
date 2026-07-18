import { supabase } from "./supabase";
import type { AssessmentScheme } from "./assessmentApi";

export type AssessmentScore = {
  id: string;
  studentId: string;
  courseId: string;
  groupId: string | null;
  componentType: string;
  title: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  assessmentDate: string;
  enteredBy: string | null;
  createdAt: string;
};

export type StudentCourseResult = {
  id: string;
  studentId: string;
  courseId: string;
  groupId: string | null;
  finalGrade: number;
  passMark: number;
  assessmentComplete: boolean;
  status: string;
  componentBreakdown: any[];
  calculatedBy: string | null;
  calculatedAt: string;
  createdAt: string;
};

function mapScore(row: any): AssessmentScore {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    groupId: row.group_id ?? null,
    componentType: row.component_type,
    title: row.title,
    score: Number(row.score || 0),
    maxScore: Number(row.max_score || 100),
    scorePercent: Number(row.score_percent || 0),
    assessmentDate: row.assessment_date,
    enteredBy: row.entered_by ?? null,
    createdAt: row.created_at,
  };
}

function mapResult(row: any): StudentCourseResult {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    groupId: row.group_id ?? null,
    finalGrade: Number(row.final_grade || 0),
    passMark: Number(row.pass_mark || 70),
    assessmentComplete: row.assessment_complete === true,
    status: row.status,
    componentBreakdown: Array.isArray(row.component_breakdown) ? row.component_breakdown : [],
    calculatedBy: row.calculated_by ?? null,
    calculatedAt: row.calculated_at,
    createdAt: row.created_at,
  };
}

export async function loadAssessmentScores(): Promise<AssessmentScore[]> {
  const { data, error } = await supabase
    .from("student_assessment_scores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapScore);
}

export async function loadCourseResults(): Promise<StudentCourseResult[]> {
  const { data, error } = await supabase
    .from("student_course_results")
    .select("*")
    .order("calculated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapResult);
}

export async function saveAssessmentScore(input: {
  studentId: string;
  courseId: string;
  groupId: string | null;
  componentType: string;
  title: string;
  score: number;
  maxScore: number;
  assessmentDate: string;
  enteredBy: string;
}): Promise<AssessmentScore> {
  if (!input.studentId || !input.courseId || !input.componentType || !input.title) {
    throw new Error("Student, course, component, and title are required.");
  }

  if (input.maxScore <= 0) {
    throw new Error("Max score must be greater than zero.");
  }

  if (input.score < 0 || input.score > input.maxScore) {
    throw new Error("Score cannot be less than 0 or greater than max score.");
  }

  const percent = Math.round((Number(input.score) / Number(input.maxScore)) * 100);

  const { data, error } = await supabase
    .from("student_assessment_scores")
    .insert({
      student_id: input.studentId,
      course_id: input.courseId,
      group_id: input.groupId,
      component_type: input.componentType,
      title: input.title,
      score: input.score,
      max_score: input.maxScore,
      score_percent: percent,
      assessment_date: input.assessmentDate,
      entered_by: input.enteredBy,
    })
    .select()
    .single();

  if (error) throw error;

  return mapScore(data as any);
}

export async function deleteAssessmentScore(scoreId: string): Promise<void> {
  const { error } = await supabase
    .from("student_assessment_scores")
    .delete()
    .eq("id", scoreId);

  if (error) throw error;
}

export function calculateCourseResult(input: {
  studentId: string;
  courseId: string;
  groupId: string | null;
  scheme: AssessmentScheme;
  scores: AssessmentScore[];
}) {
  const relevantScores = input.scores.filter(score =>
    score.studentId === input.studentId &&
    score.courseId === input.courseId &&
    (!input.groupId || score.groupId === input.groupId)
  );

  const breakdown = input.scheme.components.map(component => {
    const componentScores = relevantScores.filter(score =>
      score.componentType === component.componentType
    );

    const submittedCount = componentScores.length;

    const average =
      submittedCount === 0
        ? 0
        : Math.round(
            componentScores.reduce((sum, score) => sum + Number(score.scorePercent || 0), 0) /
              submittedCount
          );

    const complete = submittedCount >= Number(component.requiredCount || 0);
    const weightedScore = Math.round((average * Number(component.weight || 0)) / 100);

    return {
      componentType: component.componentType,
      label: component.label,
      requiredCount: component.requiredCount,
      submittedCount,
      weight: component.weight,
      average,
      weightedScore,
      complete,
    };
  });

  const finalGrade = breakdown.reduce((sum, item) => sum + Number(item.weightedScore || 0), 0);
  const assessmentComplete = breakdown.every(item => item.complete);
  const status = !assessmentComplete
    ? "incomplete"
    : finalGrade >= input.scheme.passMark
      ? "passed"
      : "failed";

  return {
    finalGrade,
    passMark: input.scheme.passMark,
    assessmentComplete,
    status,
    componentBreakdown: breakdown,
  };
}

export async function calculateAndSaveCourseResult(input: {
  studentId: string;
  courseId: string;
  groupId: string | null;
  scheme: AssessmentScheme;
  calculatedBy: string;
}): Promise<StudentCourseResult> {
  const scores = await loadAssessmentScores();

  const result = calculateCourseResult({
    studentId: input.studentId,
    courseId: input.courseId,
    groupId: input.groupId,
    scheme: input.scheme,
    scores,
  });

  const now = new Date().toISOString();

  const payload = {
    student_id: input.studentId,
    course_id: input.courseId,
    group_id: input.groupId,
    final_grade: result.finalGrade,
    pass_mark: result.passMark,
    assessment_complete: result.assessmentComplete,
    status: result.status,
    component_breakdown: result.componentBreakdown,
    calculated_by: input.calculatedBy,
    calculated_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("student_course_results")
    .upsert(payload, {
      onConflict: "student_id,course_id,group_id",
    })
    .select()
    .single();

  if (error) throw error;

  return mapResult(data as any);
}


export async function saveFinalCourseResult(input: {
  studentId: string;
  courseId: string;
  groupId: string | null;
  finalGrade: number;
  passMark: number;
  assessmentComplete: boolean;
  calculatedBy: string;
}): Promise<StudentCourseResult> {
  const now = new Date().toISOString();

  const finalGrade = Math.max(0, Math.min(100, Number(input.finalGrade || 0)));
  const passMark = Number(input.passMark || 70);
  const assessmentComplete = input.assessmentComplete === true;

  const status = !assessmentComplete
    ? "incomplete"
    : finalGrade >= passMark
      ? "passed"
      : "failed";

  const payload = {
    student_id: input.studentId,
    course_id: input.courseId,
    group_id: input.groupId,
    final_grade: finalGrade,
    pass_mark: passMark,
    assessment_complete: assessmentComplete,
    status,
    component_breakdown: [
      {
        componentType: "final_result",
        label: "Final Result Entry",
        weight: 100,
        score: finalGrade,
        maxScore: 100,
        scorePercent: finalGrade,
        weightedScore: finalGrade,
        complete: assessmentComplete,
        manualSummary: true,
      },
    ],
    calculated_by: input.calculatedBy,
    calculated_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("student_course_results")
    .upsert(payload, {
      onConflict: "student_id,course_id,group_id",
    })
    .select()
    .single();

  if (error) throw error;

  return mapResult(data as any);
}
