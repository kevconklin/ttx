// API types — mirror the backend Pydantic schemas.

export type SystemType =
  | "server"
  | "database"
  | "network_device"
  | "endpoint"
  | "cloud"
  | "other";

export type Criticality = "critical" | "high" | "medium" | "low";

export type ExerciseType =
  | "backup_recovery"
  | "incident_response"
  | "ransomware"
  | "data_breach"
  | "business_continuity"
  | "custom";

export type ExerciseStatus =
  | "scoping"
  | "scenarios_generated"
  | "sent_for_review"
  | "in_progress"
  | "completed";

export type ScenarioStatus = "draft" | "approved" | "rejected";

export type ExercisePlanStatus = "draft" | "sent" | "approved";

export type OverallRating =
  | "excellent"
  | "satisfactory"
  | "needs_improvement"
  | "unsatisfactory";

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientSystem {
  id: string;
  client_id: string;
  system_type: SystemType;
  name: string;
  ip_address: string | null;
  hostname: string | null;
  description: string | null;
  criticality: Criticality;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  exercise_type: ExerciseType;
  status: ExerciseStatus;
  scope_notes: string | null;
  has_client_systems: boolean;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InjectStep {
  time_offset: string;
  inject: string;
  facilitator_note?: string;
}

export interface Scenario {
  id: string;
  exercise_id: string;
  title: string;
  description: string | null;
  inject_sequence: InjectStep[] | null;
  discussion_questions: string[] | null;
  expected_actions: string[] | null;
  common_pitfalls: string[] | null;
  status: ScenarioStatus;
  client_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  time: string;
  duration_min: number;
  item: string;
  owner?: string;
}

export interface RoleDef {
  role: string;
  responsibilities: string;
}

export interface ExercisePlan {
  id: string;
  exercise_id: string;
  agenda: AgendaItem[] | null;
  objectives: string[] | null;
  participants: Record<string, unknown>[] | null;
  ground_rules: string[] | null;
  roles: RoleDef[] | null;
  materials_needed: string[] | null;
  debrief_structure: Record<string, unknown> | null;
  logistics_notes: string | null;
  status: ExercisePlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Gap {
  gap: string;
  severity?: "low" | "medium" | "high" | "critical";
  evidence?: string;
}

export interface Recommendation {
  recommendation: string;
  priority?: "low" | "medium" | "high";
  rationale?: string;
}

export interface ActionItem {
  item: string;
  owner?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
}

export interface AAR {
  id: string;
  exercise_id: string;
  executive_summary: string | null;
  strengths: string[] | null;
  gaps_identified: Gap[] | null;
  recommendations: Recommendation[] | null;
  action_items: ActionItem[] | null;
  overall_rating: OverallRating | null;
  raw_notes: string | null;
  facilitator_notes: string | null;
  participant_feedback: string | null;
  created_at: string;
  updated_at: string;
}
