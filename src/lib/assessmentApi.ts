import { supabase } from "./supabase";

export type AssessmentComponent = {
  id?: string;
  schemeId?: string;
  componentType: string;
  label: string;
  requiredCount: number;
  weight: number;
  sortOrder: number;
};

export type AssessmentScheme = {
  id: string;
  courseId: string;
  durationMonths: number;
  passMark: number;
  attendanceRequired: number;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  components: AssessmentComponent[];
};

export const DEFAULT_COMPONENTS: AssessmentComponent[] = [
  {
    componentType: "quiz",
    label: "Quiz",
    requiredCount: 4,
    weight: 10,
    sortOrder: 1,
  },
  {
    componentType: "assignment",
    label: "Assignment",
    requiredCount: 4,
    weight: 20,
    sortOrder: 2,
  },
  {
    componentType: "discussion",
    label: "Discussion",
    requiredCount: 3,
    weight: 10,
    sortOrder: 3,
  },
  {
    componentType: "participation",
    label: "Participation",
    requiredCount: 1,
    weight: 10,
    sortOrder: 4,
  },
  {
    componentType: "attendance",
    label: "Attendance",
    requiredCount: 12,
    weight: 10,
    sortOrder: 5,
  },
  {
    componentType: "exam",
    label: "Final Exam",
    requiredCount: 1,
    weight: 40,
    sortOrder: 6,
  },
];

function mapComponent(row: any): AssessmentComponent {
  return {
    id: row.id,
    schemeId: row.scheme_id,
    componentType: row.component_type,
    label: row.label,
    requiredCount: Number(row.required_count || 0),
    weight: Number(row.weight || 0),
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapScheme(row: any, components: AssessmentComponent[]): AssessmentScheme {
  return {
    id: row.id,
    courseId: row.course_id,
    durationMonths: Number(row.duration_months || 3),
    passMark: Number(row.pass_mark || 70),
    attendanceRequired: Number(row.attendance_required || 70),
    isActive: row.is_active !== false,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    components: components.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function componentTotal(components: AssessmentComponent[]) {
  return components.reduce((sum, c) => sum + Number(c.weight || 0), 0);
}

export function defaultSchemeForCourse(courseId: string): Omit<AssessmentScheme, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> {
  return {
    courseId,
    durationMonths: 3,
    passMark: 70,
    attendanceRequired: 70,
    isActive: true,
    components: DEFAULT_COMPONENTS.map(c => ({ ...c })),
  };
}

export async function loadAssessmentSchemes(): Promise<AssessmentScheme[]> {
  const [schemeRes, componentRes] = await Promise.all([
    supabase
      .from("course_assessment_schemes")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("course_assessment_components")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (schemeRes.error) throw schemeRes.error;
  if (componentRes.error) throw componentRes.error;

  const components = (componentRes.data ?? []).map(mapComponent);

  return (schemeRes.data ?? []).map((scheme: any) =>
    mapScheme(
      scheme,
      components.filter(c => c.schemeId === scheme.id)
    )
  );
}

export async function saveAssessmentScheme(input: {
  courseId: string;
  durationMonths: number;
  passMark: number;
  attendanceRequired: number;
  components: AssessmentComponent[];
  userId: string;
}): Promise<AssessmentScheme> {
  const total = componentTotal(input.components);

  if (total !== 100) {
    throw new Error(`Assessment component total must be 100%. Current total is ${total}%.`);
  }

  if (input.durationMonths <= 0) {
    throw new Error("Duration months must be greater than zero.");
  }

  if (input.passMark <= 0 || input.passMark > 100) {
    throw new Error("Pass mark must be between 1 and 100.");
  }

  if (input.attendanceRequired <= 0 || input.attendanceRequired > 100) {
    throw new Error("Attendance required must be between 1 and 100.");
  }

  const now = new Date().toISOString();

  const { data: existing, error: existingErr } = await supabase
    .from("course_assessment_schemes")
    .select("*")
    .eq("course_id", input.courseId)
    .maybeSingle();

  if (existingErr) throw existingErr;

  let schemeId = (existing as any)?.id;

  if (schemeId) {
    const { error } = await supabase
      .from("course_assessment_schemes")
      .update({
        duration_months: input.durationMonths,
        pass_mark: input.passMark,
        attendance_required: input.attendanceRequired,
        is_active: true,
        updated_by: input.userId,
        updated_at: now,
      })
      .eq("id", schemeId);

    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("course_assessment_schemes")
      .insert({
        course_id: input.courseId,
        duration_months: input.durationMonths,
        pass_mark: input.passMark,
        attendance_required: input.attendanceRequired,
        is_active: true,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select()
      .single();

    if (error) throw error;

    schemeId = (data as any).id;
  }

  for (const component of input.components) {
    const payload = {
      scheme_id: schemeId,
      component_type: component.componentType,
      label: component.label,
      required_count: component.requiredCount,
      weight: component.weight,
      sort_order: component.sortOrder,
    };

    const existingComponent = component.id;

    if (existingComponent) {
      const { error } = await supabase
        .from("course_assessment_components")
        .update(payload)
        .eq("id", existingComponent);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("course_assessment_components")
        .upsert(payload, {
          onConflict: "scheme_id,component_type",
        });

      if (error) throw error;
    }
  }

  const schemes = await loadAssessmentSchemes();
  const saved = schemes.find(s => s.courseId === input.courseId);

  if (!saved) {
    throw new Error("Assessment scheme was saved but could not be reloaded.");
  }

  return saved;
}

