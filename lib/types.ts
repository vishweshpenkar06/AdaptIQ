// Core domain types for Smart Learning Graph

export type ConceptStatus = 'mastered' | 'weak' | 'missing';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Concept {
  id: string;
  name: string;
  subject: string;
  chapter: string;
  description: string;
  status?: ConceptStatus;
  accuracy?: number;
}

export interface ConceptDependency {
  id: string;
  parentConceptId: string;
  childConceptId: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: DifficultyLevel;
  explanation: string;
  conceptIds: string[];
}

export interface Attempt {
  id: string;
  userId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  createdAt: Date;
}

export interface UserConceptProgress {
  id: string;
  userId: string;
  conceptId: string;
  accuracy: number;
  confidenceLevel: ConfidenceLevel;
  lastUpdated: Date;
}

export interface DiagnosisResult {
  missingConcept: Concept;
  dependencyChain: Concept[];
  rootCause: string;
  suggestedPath: Concept[];
}

export interface UserProfile {
  id: string;
  name: string;
  classLevel: 9 | 10;
  createdAt: Date;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    status: ConceptStatus;
    accuracy?: number;
    concept: Concept;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LearningInsight {
  type: 'improvement' | 'focus' | 'achievement';
  title: string;
  description: string;
  conceptId?: string;
}
