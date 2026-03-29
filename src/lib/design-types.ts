export interface TargetUser {
  persona: string;
  description: string;
  needs: string[];
}

export interface CoreFeature {
  name: string;
  description: string;
  priority: "high" | "medium" | "low";
  related_paths: string[];
}

export interface DataEntity {
  name: string;
  description: string;
  fields: string[];
  notes: string;
}

export interface FlowStep {
  step: number;
  action: string;
  screen: string;
  note: string;
}

export interface UserFlow {
  name: string;
  description: string;
  steps: FlowStep[];
}

export interface ScreenSpec {
  name: string;
  type: string;
  description: string;
  key_elements: string[];
  interactions: string[];
}

export interface OpenQuestion {
  topic: string;
  detail: string;
  impact: string;
}

export interface DesignDocument {
  service_name: string;
  service_summary: string;
  core_value: string;
  target_users: TargetUser[];
  core_features: CoreFeature[];
  data_entities: DataEntity[];
  user_flows: UserFlow[];
  screens: ScreenSpec[];
  open_questions: OpenQuestion[];
}
