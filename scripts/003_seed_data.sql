-- Seed data for AdaptIQ
-- Sample subjects, concepts, and questions for Mathematics

-- Insert subjects
INSERT INTO public.subjects (id, name, description, icon, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'Class 9-10 Mathematics curriculum covering algebra, geometry, and more', 'Calculator', '#2563EB'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Science', 'Physics, Chemistry, and Biology fundamentals', 'Flask', '#22C55E'),
  ('550e8400-e29b-41d4-a716-446655440003', 'English', 'Grammar, comprehension, and writing skills', 'BookOpen', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- Insert concepts for Mathematics (building a knowledge graph)
INSERT INTO public.concepts (id, subject_id, name, description, difficulty) VALUES
  -- Foundation concepts
  ('c0000001-0001-0001-0001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Number Systems', 'Understanding integers, rationals, and real numbers', 1),
  ('c0000001-0001-0001-0001-000000000002', '550e8400-e29b-41d4-a716-446655440001', 'Basic Arithmetic', 'Addition, subtraction, multiplication, division', 1),
  ('c0000001-0001-0001-0001-000000000003', '550e8400-e29b-41d4-a716-446655440001', 'Order of Operations', 'BODMAS/PEMDAS rules', 1),
  
  -- Intermediate concepts
  ('c0000001-0001-0001-0001-000000000004', '550e8400-e29b-41d4-a716-446655440001', 'Variables & Expressions', 'Understanding algebraic expressions', 2),
  ('c0000001-0001-0001-0001-000000000005', '550e8400-e29b-41d4-a716-446655440001', 'Linear Equations', 'Solving equations in one variable', 2),
  ('c0000001-0001-0001-0001-000000000006', '550e8400-e29b-41d4-a716-446655440001', 'Fractions & Decimals', 'Operations with fractions and decimals', 2),
  
  -- Advanced concepts
  ('c0000001-0001-0001-0001-000000000007', '550e8400-e29b-41d4-a716-446655440001', 'Quadratic Equations', 'Solving ax² + bx + c = 0', 3),
  ('c0000001-0001-0001-0001-000000000008', '550e8400-e29b-41d4-a716-446655440001', 'Factorization', 'Factoring algebraic expressions', 3),
  ('c0000001-0001-0001-0001-000000000009', '550e8400-e29b-41d4-a716-446655440001', 'Coordinate Geometry', 'Points, lines, and distance in 2D plane', 3),
  ('c0000001-0001-0001-0001-000000000010', '550e8400-e29b-41d4-a716-446655440001', 'Polynomials', 'Working with polynomial expressions', 3),
  
  -- Expert concepts
  ('c0000001-0001-0001-0001-000000000011', '550e8400-e29b-41d4-a716-446655440001', 'Trigonometry Basics', 'Sin, Cos, Tan and basic identities', 4),
  ('c0000001-0001-0001-0001-000000000012', '550e8400-e29b-41d4-a716-446655440001', 'Probability', 'Basic probability concepts', 4),
  ('c0000001-0001-0001-0001-000000000013', '550e8400-e29b-41d4-a716-446655440001', 'Statistics', 'Mean, median, mode, and standard deviation', 4)
ON CONFLICT DO NOTHING;

-- Insert concept dependencies (prerequisite relationships)
INSERT INTO public.concept_dependencies (concept_id, prerequisite_id, strength) VALUES
  -- Variables & Expressions depends on Number Systems and Basic Arithmetic
  ('c0000001-0001-0001-0001-000000000004', 'c0000001-0001-0001-0001-000000000001', 0.9),
  ('c0000001-0001-0001-0001-000000000004', 'c0000001-0001-0001-0001-000000000002', 0.8),
  
  -- Linear Equations depends on Variables & Expressions and Order of Operations
  ('c0000001-0001-0001-0001-000000000005', 'c0000001-0001-0001-0001-000000000004', 1.0),
  ('c0000001-0001-0001-0001-000000000005', 'c0000001-0001-0001-0001-000000000003', 0.7),
  
  -- Fractions depends on Basic Arithmetic
  ('c0000001-0001-0001-0001-000000000006', 'c0000001-0001-0001-0001-000000000002', 1.0),
  
  -- Quadratic Equations depends on Linear Equations and Factorization
  ('c0000001-0001-0001-0001-000000000007', 'c0000001-0001-0001-0001-000000000005', 1.0),
  ('c0000001-0001-0001-0001-000000000007', 'c0000001-0001-0001-0001-000000000008', 0.9),
  
  -- Factorization depends on Variables & Expressions
  ('c0000001-0001-0001-0001-000000000008', 'c0000001-0001-0001-0001-000000000004', 1.0),
  
  -- Coordinate Geometry depends on Linear Equations
  ('c0000001-0001-0001-0001-000000000009', 'c0000001-0001-0001-0001-000000000005', 0.8),
  
  -- Polynomials depends on Variables & Expressions
  ('c0000001-0001-0001-0001-000000000010', 'c0000001-0001-0001-0001-000000000004', 1.0),
  
  -- Trigonometry depends on Coordinate Geometry and Fractions
  ('c0000001-0001-0001-0001-000000000011', 'c0000001-0001-0001-0001-000000000009', 0.8),
  ('c0000001-0001-0001-0001-000000000011', 'c0000001-0001-0001-0001-000000000006', 0.6),
  
  -- Probability depends on Fractions
  ('c0000001-0001-0001-0001-000000000012', 'c0000001-0001-0001-0001-000000000006', 1.0),
  
  -- Statistics depends on Basic Arithmetic and Fractions
  ('c0000001-0001-0001-0001-000000000013', 'c0000001-0001-0001-0001-000000000002', 0.7),
  ('c0000001-0001-0001-0001-000000000013', 'c0000001-0001-0001-0001-000000000006', 0.8)
ON CONFLICT DO NOTHING;

-- Insert sample questions
INSERT INTO public.questions (id, concept_id, question_text, question_type, options, correct_answer, explanation, difficulty) VALUES
  -- Number Systems questions
  ('q0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', 
   'Which of the following is an irrational number?', 'mcq',
   '["3/4", "√2", "0.5", "-7"]'::jsonb, '√2',
   '√2 cannot be expressed as a ratio of two integers, making it irrational. All other options can be written as fractions.', 1),
  
  ('q0000001-0001-0001-0001-000000000002', 'c0000001-0001-0001-0001-000000000001',
   'The decimal expansion of a rational number is always:', 'mcq',
   '["Terminating", "Non-terminating repeating", "Either terminating or non-terminating repeating", "Non-terminating non-repeating"]'::jsonb, 
   'Either terminating or non-terminating repeating',
   'Rational numbers either terminate (like 0.5) or repeat (like 0.333...). Irrational numbers have non-terminating, non-repeating decimals.', 2),
  
  -- Linear Equations questions
  ('q0000001-0001-0001-0001-000000000003', 'c0000001-0001-0001-0001-000000000005',
   'Solve for x: 3x + 7 = 22', 'mcq',
   '["x = 3", "x = 5", "x = 7", "x = 15"]'::jsonb, 'x = 5',
   'Subtract 7 from both sides: 3x = 15. Then divide by 3: x = 5.', 1),
  
  ('q0000001-0001-0001-0001-000000000004', 'c0000001-0001-0001-0001-000000000005',
   'If 2(x - 3) = 4x + 2, find the value of x', 'mcq',
   '["x = -4", "x = -2", "x = 2", "x = 4"]'::jsonb, 'x = -4',
   'Expand: 2x - 6 = 4x + 2. Rearrange: -6 - 2 = 4x - 2x, so -8 = 2x, therefore x = -4.', 2),
  
  -- Quadratic Equations questions
  ('q0000001-0001-0001-0001-000000000005', 'c0000001-0001-0001-0001-000000000007',
   'What are the roots of x² - 5x + 6 = 0?', 'mcq',
   '["x = 2, 3", "x = -2, -3", "x = 1, 6", "x = -1, -6"]'::jsonb, 'x = 2, 3',
   'Factor: (x-2)(x-3) = 0. Setting each factor to zero gives x = 2 or x = 3.', 2),
  
  ('q0000001-0001-0001-0001-000000000006', 'c0000001-0001-0001-0001-000000000007',
   'The discriminant of 2x² + 3x - 5 = 0 is:', 'mcq',
   '["49", "41", "-31", "9"]'::jsonb, '49',
   'Discriminant = b² - 4ac = 3² - 4(2)(-5) = 9 + 40 = 49', 3),
  
  -- Factorization questions
  ('q0000001-0001-0001-0001-000000000007', 'c0000001-0001-0001-0001-000000000008',
   'Factorize: x² - 9', 'mcq',
   '["(x+3)(x+3)", "(x-3)(x-3)", "(x+3)(x-3)", "(x+9)(x-1)"]'::jsonb, '(x+3)(x-3)',
   'This is a difference of squares: a² - b² = (a+b)(a-b). Here a=x, b=3.', 1),
  
  ('q0000001-0001-0001-0001-000000000008', 'c0000001-0001-0001-0001-000000000008',
   'Factorize completely: 2x² + 5x + 2', 'mcq',
   '["(2x+1)(x+2)", "(2x+2)(x+1)", "(x+1)(2x+2)", "Cannot be factored"]'::jsonb, '(2x+1)(x+2)',
   'Find two numbers that multiply to 2×2=4 and add to 5. Those are 4 and 1. Split middle term and factor.', 2),
  
  -- Trigonometry questions
  ('q0000001-0001-0001-0001-000000000009', 'c0000001-0001-0001-0001-000000000011',
   'What is the value of sin(30°)?', 'mcq',
   '["1/2", "√3/2", "1", "0"]'::jsonb, '1/2',
   'sin(30°) = 1/2 is a standard trigonometric value that should be memorized.', 1),
  
  ('q0000001-0001-0001-0001-000000000010', 'c0000001-0001-0001-0001-000000000011',
   'If tan(θ) = 3/4, find sin(θ) (assuming θ is in the first quadrant)', 'mcq',
   '["3/5", "4/5", "3/4", "5/3"]'::jsonb, '3/5',
   'If tan(θ) = 3/4, opposite = 3, adjacent = 4. Hypotenuse = √(9+16) = 5. So sin(θ) = opposite/hypotenuse = 3/5.', 3),
  
  -- Variables & Expressions questions
  ('q0000001-0001-0001-0001-000000000011', 'c0000001-0001-0001-0001-000000000004',
   'Simplify: 3x + 2y - x + 4y', 'mcq',
   '["2x + 6y", "4x + 6y", "2x + 2y", "3x + 6y"]'::jsonb, '2x + 6y',
   'Combine like terms: (3x - x) + (2y + 4y) = 2x + 6y', 1),
  
  ('q0000001-0001-0001-0001-000000000012', 'c0000001-0001-0001-0001-000000000004',
   'If a = 3 and b = -2, find the value of 2a² - 3ab + b²', 'mcq',
   '["36", "40", "22", "32"]'::jsonb, '40',
   '2(3)² - 3(3)(-2) + (-2)² = 2(9) + 18 + 4 = 18 + 18 + 4 = 40', 2)
ON CONFLICT DO NOTHING;
