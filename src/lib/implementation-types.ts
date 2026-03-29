export interface PriorityItem {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface FrontendUnit {
  title: string;
  description: string;
  deliverables: string[];
  related_screens: string[];
}

export interface BackendApiUnit {
  title: string;
  description: string;
  endpoints: string[];
  dependencies: string[];
}

export interface DataRequirement {
  entity: string;
  description: string;
  fields: string[];
  storage: string;
}

export interface AuthRequirement {
  area: string;
  required: boolean;
  description: string;
  roles: string[];
}

export interface DeploymentChecklistItem {
  title: string;
  detail: string;
}

export interface ExpansionPoint {
  title: string;
  description: string;
  next_step: string;
}

export interface ImplementationPlan {
  project_name: string;
  summary: string;
  mvp_priorities: PriorityItem[];
  frontend_units: FrontendUnit[];
  backend_api_units: BackendApiUnit[];
  data_requirements: DataRequirement[];
  auth_requirements: AuthRequirement[];
  deployment_checklist: DeploymentChecklistItem[];
  expansion_points: ExpansionPoint[];
}
