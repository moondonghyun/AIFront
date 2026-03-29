export interface GeneratedInterviewQuestion {
  id: string;
  question: string;
  reason: string;
  placeholder: string;
  targetFields: string[];
}

export interface InterviewFieldUpdate {
  path: string;
  value: unknown;
  confidence?: number;
  note?: string;
}

export interface InterviewHistoryEntry {
  questionId: string;
  question: string;
  reason: string;
  placeholder: string;
  targetFields: string[];
  answer: string;
  appliedUpdates: InterviewFieldUpdate[];
}
