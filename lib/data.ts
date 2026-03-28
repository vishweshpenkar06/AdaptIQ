import type { Concept, ConceptDependency, Question, UserConceptProgress, GraphNode, GraphEdge } from './types';

// Physics concepts for Force & Laws of Motion chapter
export const concepts: Concept[] = [
  {
    id: 'c1',
    name: 'Force',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'A push or pull acting on an object that can change its state of motion.',
    status: 'weak',
    accuracy: 0.65,
  },
  {
    id: 'c2',
    name: 'Mass',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'The amount of matter in an object, measured in kilograms.',
    status: 'mastered',
    accuracy: 0.92,
  },
  {
    id: 'c3',
    name: 'Acceleration',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'The rate of change of velocity with respect to time.',
    status: 'weak',
    accuracy: 0.58,
  },
  {
    id: 'c4',
    name: 'Velocity',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'The speed of an object in a given direction.',
    status: 'mastered',
    accuracy: 0.88,
  },
  {
    id: 'c5',
    name: 'Inertia',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'The tendency of an object to resist changes in its state of motion.',
    status: 'missing',
    accuracy: 0.32,
  },
  {
    id: 'c6',
    name: "Newton's First Law",
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by a force.',
    status: 'missing',
    accuracy: 0.28,
  },
  {
    id: 'c7',
    name: "Newton's Second Law",
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'Force equals mass times acceleration (F = ma).',
    status: 'weak',
    accuracy: 0.45,
  },
  {
    id: 'c8',
    name: "Newton's Third Law",
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'For every action, there is an equal and opposite reaction.',
    status: 'mastered',
    accuracy: 0.85,
  },
  {
    id: 'c9',
    name: 'Momentum',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'The product of mass and velocity of an object.',
    status: 'weak',
    accuracy: 0.55,
  },
  {
    id: 'c10',
    name: 'Friction',
    subject: 'Physics',
    chapter: 'Force & Laws of Motion',
    description: 'A force that opposes the relative motion of two surfaces in contact.',
    status: 'mastered',
    accuracy: 0.78,
  },
];

// Concept dependencies (prerequisite relationships)
export const conceptDependencies: ConceptDependency[] = [
  { id: 'd1', parentConceptId: 'c4', childConceptId: 'c3' }, // Velocity → Acceleration
  { id: 'd2', parentConceptId: 'c2', childConceptId: 'c1' }, // Mass → Force
  { id: 'd3', parentConceptId: 'c3', childConceptId: 'c1' }, // Acceleration → Force
  { id: 'd4', parentConceptId: 'c2', childConceptId: 'c5' }, // Mass → Inertia
  { id: 'd5', parentConceptId: 'c5', childConceptId: 'c6' }, // Inertia → Newton's First Law
  { id: 'd6', parentConceptId: 'c1', childConceptId: 'c6' }, // Force → Newton's First Law
  { id: 'd7', parentConceptId: 'c1', childConceptId: 'c7' }, // Force → Newton's Second Law
  { id: 'd8', parentConceptId: 'c2', childConceptId: 'c7' }, // Mass → Newton's Second Law
  { id: 'd9', parentConceptId: 'c3', childConceptId: 'c7' }, // Acceleration → Newton's Second Law
  { id: 'd10', parentConceptId: 'c1', childConceptId: 'c8' }, // Force → Newton's Third Law
  { id: 'd11', parentConceptId: 'c2', childConceptId: 'c9' }, // Mass → Momentum
  { id: 'd12', parentConceptId: 'c4', childConceptId: 'c9' }, // Velocity → Momentum
  { id: 'd13', parentConceptId: 'c1', childConceptId: 'c10' }, // Force → Friction
];

// Questions for practice
export const questions: Question[] = [
  {
    id: 'q1',
    questionText: 'What is the SI unit of force?',
    options: ['Joule', 'Newton', 'Pascal', 'Watt'],
    correctAnswer: 'Newton',
    difficulty: 'easy',
    explanation: 'The SI unit of force is Newton (N), named after Sir Isaac Newton. 1 Newton is the force required to accelerate a 1 kg mass by 1 m/s².',
    conceptIds: ['c1'],
  },
  {
    id: 'q2',
    questionText: 'According to Newton\'s Second Law, what happens to acceleration if the force is doubled while mass remains constant?',
    options: ['Acceleration halves', 'Acceleration doubles', 'Acceleration remains same', 'Acceleration quadruples'],
    correctAnswer: 'Acceleration doubles',
    difficulty: 'medium',
    explanation: 'F = ma means a = F/m. If F doubles and m stays constant, acceleration also doubles.',
    conceptIds: ['c7', 'c1', 'c3'],
  },
  {
    id: 'q3',
    questionText: 'A body of mass 5 kg is acted upon by a force of 10 N. What is its acceleration?',
    options: ['0.5 m/s²', '2 m/s²', '15 m/s²', '50 m/s²'],
    correctAnswer: '2 m/s²',
    difficulty: 'medium',
    explanation: 'Using F = ma, we get a = F/m = 10/5 = 2 m/s².',
    conceptIds: ['c7', 'c1', 'c2', 'c3'],
  },
  {
    id: 'q4',
    questionText: 'What is inertia?',
    options: [
      'The tendency of an object to resist changes in motion',
      'The force that causes motion',
      'The speed of an object',
      'The energy stored in an object'
    ],
    correctAnswer: 'The tendency of an object to resist changes in motion',
    difficulty: 'easy',
    explanation: 'Inertia is the tendency of an object to resist any change in its state of motion (rest or uniform motion).',
    conceptIds: ['c5'],
  },
  {
    id: 'q5',
    questionText: 'When a bus suddenly stops, passengers fall forward. This is due to:',
    options: ['Friction', 'Inertia of motion', 'Gravity', 'Momentum conservation'],
    correctAnswer: 'Inertia of motion',
    difficulty: 'medium',
    explanation: 'When the bus stops suddenly, the passengers\' bodies tend to continue moving forward due to inertia of motion.',
    conceptIds: ['c5', 'c6'],
  },
  {
    id: 'q6',
    questionText: 'Calculate the momentum of a 2 kg object moving at 5 m/s.',
    options: ['2.5 kg·m/s', '7 kg·m/s', '10 kg·m/s', '0.4 kg·m/s'],
    correctAnswer: '10 kg·m/s',
    difficulty: 'easy',
    explanation: 'Momentum = mass × velocity = 2 kg × 5 m/s = 10 kg·m/s.',
    conceptIds: ['c9', 'c2', 'c4'],
  },
  {
    id: 'q7',
    questionText: 'Which Newton\'s law explains why rockets work in space?',
    options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'],
    correctAnswer: 'Third Law',
    difficulty: 'medium',
    explanation: 'Rockets expel gases backward (action), and the gases push the rocket forward (reaction) - Newton\'s Third Law.',
    conceptIds: ['c8'],
  },
  {
    id: 'q8',
    questionText: 'What is the relationship between acceleration and velocity?',
    options: [
      'Acceleration is the rate of change of velocity',
      'Velocity is the rate of change of acceleration',
      'They are the same thing',
      'They are inversely proportional'
    ],
    correctAnswer: 'Acceleration is the rate of change of velocity',
    difficulty: 'easy',
    explanation: 'Acceleration is defined as the rate at which velocity changes with respect to time (a = dv/dt).',
    conceptIds: ['c3', 'c4'],
  },
];

// User concept progress
export const userProgress: UserConceptProgress[] = concepts.map((c) => ({
  id: `p${c.id}`,
  userId: 'user1',
  conceptId: c.id,
  accuracy: c.accuracy || 0,
  confidenceLevel: (c.accuracy || 0) > 0.7 ? 'high' : (c.accuracy || 0) > 0.4 ? 'medium' : 'low',
  lastUpdated: new Date(),
}));

// Convert concepts to graph nodes
export function getGraphNodes(): GraphNode[] {
  const nodePositions: Record<string, { x: number; y: number }> = {
    c4: { x: 100, y: 100 },   // Velocity
    c2: { x: 300, y: 100 },   // Mass
    c3: { x: 100, y: 250 },   // Acceleration
    c1: { x: 300, y: 250 },   // Force
    c5: { x: 500, y: 100 },   // Inertia
    c9: { x: 100, y: 400 },   // Momentum
    c6: { x: 300, y: 400 },   // Newton's First Law
    c7: { x: 500, y: 400 },   // Newton's Second Law
    c8: { x: 500, y: 250 },   // Newton's Third Law
    c10: { x: 700, y: 250 },  // Friction
  };

  return concepts.map((concept) => ({
    id: concept.id,
    position: nodePositions[concept.id] || { x: 0, y: 0 },
    data: {
      label: concept.name,
      status: concept.status || 'missing',
      accuracy: concept.accuracy,
      concept,
    },
  }));
}

// Convert dependencies to graph edges
export function getGraphEdges(): GraphEdge[] {
  return conceptDependencies.map((dep) => ({
    id: dep.id,
    source: dep.parentConceptId,
    target: dep.childConceptId,
  }));
}

// Get weak concepts for dashboard
export function getWeakConcepts(): Concept[] {
  return concepts.filter((c) => c.status === 'weak' || c.status === 'missing');
}

// Get suggested next concept based on dependencies and progress
export function getSuggestedConcept(): Concept | null {
  const weak = getWeakConcepts();
  if (weak.length === 0) return null;
  
  // Find the concept with the weakest prerequisite coverage
  const sorted = weak.sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0));
  return sorted[0];
}

// Diagnose why a question was answered incorrectly
export function diagnoseError(questionId: string): { missingConcept: Concept; chain: Concept[]; suggestion: string } | null {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;

  const relatedConcepts = question.conceptIds
    .map((cid) => concepts.find((c) => c.id === cid))
    .filter((c): c is Concept => c !== undefined);

  const weakest = relatedConcepts.find((c) => c.status === 'missing' || c.status === 'weak');
  if (!weakest) return null;

  // Find prerequisite chain
  const chain: Concept[] = [];
  const deps = conceptDependencies.filter((d) => d.childConceptId === weakest.id);
  deps.forEach((dep) => {
    const parent = concepts.find((c) => c.id === dep.parentConceptId);
    if (parent) chain.push(parent);
  });

  return {
    missingConcept: weakest,
    chain,
    suggestion: `Focus on strengthening "${weakest.name}" by first reviewing ${chain.map((c) => `"${c.name}"`).join(' and ')}.`,
  };
}

// Calculate overall progress stats
export function getProgressStats() {
  const total = concepts.length;
  const mastered = concepts.filter((c) => c.status === 'mastered').length;
  const weak = concepts.filter((c) => c.status === 'weak').length;
  const missing = concepts.filter((c) => c.status === 'missing').length;
  const avgAccuracy = concepts.reduce((sum, c) => sum + (c.accuracy || 0), 0) / total;

  return {
    total,
    mastered,
    weak,
    missing,
    avgAccuracy,
    masteredPercent: Math.round((mastered / total) * 100),
    weakPercent: Math.round((weak / total) * 100),
    missingPercent: Math.round((missing / total) * 100),
  };
}
