'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Network, Sparkles, Target, TrendingUp, ArrowRight, CheckCircle2, ChevronRight, Users, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';

const features = [
  {
    icon: Network,
    title: 'Visual Knowledge Graph',
    description: 'See how concepts connect. Our interactive graph reveals the hidden dependencies between topics, showing exactly where learning gaps begin.',
  },
  {
    icon: Target,
    title: 'Root Cause Diagnosis',
    description: 'Go beyond "wrong answer" feedback. AdaptIQ traces back to the foundational concept you missed, so you fix the real problem.',
  },
  {
    icon: Sparkles,
    title: 'AI Study Companion',
    description: 'Get instant, context-aware explanations. Our AI understands what you&apos;re struggling with and explains it in ways that click.',
  },
  {
    icon: TrendingUp,
    title: 'Adaptive Learning Paths',
    description: 'No more guessing what to study next. Follow personalized paths that strengthen weak concepts before building on them.',
  },
];

const benefits = [
  'Identify knowledge gaps before exams',
  'Understand why you get answers wrong',
  'Master prerequisite concepts first',
  'Track progress with visual insights',
  'Learn at your own pace',
  'Get AI-powered explanations anytime',
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Class 10 Student',
    initials: 'PS',
    content: 'I finally understood why I kept failing physics problems. AdaptIQ showed me I was missing basic vector concepts. After fixing that, everything clicked!',
  },
  {
    name: 'Rahul Verma',
    role: 'Parent',
    initials: 'RV',
    content: 'As a parent, I can now see exactly where my son needs help instead of hiring expensive tutors for everything. The knowledge graph is brilliant.',
  },
  {
    name: 'Dr. Meera Patel',
    role: 'Physics Teacher',
    initials: 'MP',
    content: 'This is how education should work. Instead of rote learning, students actually understand the connections between concepts. Remarkable tool.',
  },
];

const stats = [
  { value: '94%', label: 'Accuracy Improvement' },
  { value: '2.5x', label: 'Faster Learning' },
  { value: '10K+', label: 'Students Helped' },
  { value: '500+', label: 'Concepts Mapped' },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleGetStarted = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    router.push(user ? '/' : '/auth/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
        <nav className="mx-auto flex h-16 max-w-300 items-center justify-between px-4 lg:px-8">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-lg">AdaptIQ</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" className="gap-2" onClick={handleGetStarted}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-accent via-background to-background" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-[10%] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-40 right-[15%] h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative mx-auto max-w-300 px-4 py-20 lg:px-8 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge variant="secondary" className="mb-6 gap-2 px-4 py-2">
              <Zap className="h-3.5 w-3.5" />
              Intelligent Learning System
            </Badge>
            
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Finally understand{' '}
              <span className="relative">
                <span className="relative z-10 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  why you fail
                </span>
                <svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 8 Q 50 0, 100 8 T 200 8" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/30" />
                </svg>
              </span>
              {' '}and how to fix it
            </h1>
            
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              AdaptIQ diagnoses the real reasons behind wrong answers by analyzing concept dependencies. 
              See your knowledge gaps on a visual graph and get AI-powered guidance to master any subject.
            </p>
            
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link href="/">
                <Button size="lg" className="gap-2 px-8">
                  Start Learning Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/knowledge-map">
                <Button variant="outline" size="lg" className="gap-2">
                  <Network className="h-4 w-4" />
                  Explore Knowledge Graph
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-foreground lg:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual - Knowledge Graph Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <Card className="overflow-hidden border-2 shadow-2xl">
              <div className="bg-muted/30 p-4 border-b flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <span className="text-sm text-muted-foreground">Knowledge Graph - Physics</span>
              </div>
              <CardContent className="p-0">
                <div className="relative h-100 bg-card overflow-hidden">
                  {/* Animated Knowledge Graph Visualization */}
                  <svg className="w-full h-full" viewBox="0 0 800 400">
                    {/* Connections */}
                    <g className="opacity-60">
                      <line x1="400" y1="80" x2="250" y2="180" stroke="#E2E8F0" strokeWidth="2" />
                      <line x1="400" y1="80" x2="550" y2="180" stroke="#E2E8F0" strokeWidth="2" />
                      <line x1="250" y1="180" x2="150" y2="300" stroke="#E2E8F0" strokeWidth="2" />
                      <line x1="250" y1="180" x2="350" y2="300" stroke="#E2E8F0" strokeWidth="2" />
                      <line x1="550" y1="180" x2="450" y2="300" stroke="#E2E8F0" strokeWidth="2" />
                      <line x1="550" y1="180" x2="650" y2="300" stroke="#E2E8F0" strokeWidth="2" />
                    </g>
                    
                    {/* Highlight Path */}
                    <path d="M400 80 L250 180 L150 300" fill="none" stroke="#2563EB" strokeWidth="3" strokeDasharray="8,4" className="animate-pulse" />
                    
                    {/* Nodes */}
                    <g>
                      {/* Root Node - Mastered */}
                      <circle cx="400" cy="80" r="35" fill="#22C55E" className="drop-shadow-lg" />
                      <text x="400" y="85" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Motion</text>
                      
                      {/* Level 2 - Weak */}
                      <circle cx="250" cy="180" r="30" fill="#F59E0B" className="drop-shadow-lg" />
                      <text x="250" y="185" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Velocity</text>
                      
                      {/* Level 2 - Mastered */}
                      <circle cx="550" cy="180" r="30" fill="#22C55E" className="drop-shadow-lg" />
                      <text x="550" y="185" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Distance</text>
                      
                      {/* Level 3 - Missing */}
                      <circle cx="150" cy="300" r="28" fill="#EF4444" className="drop-shadow-lg animate-pulse" />
                      <text x="150" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Vectors</text>
                      
                      {/* Level 3 - Weak */}
                      <circle cx="350" cy="300" r="28" fill="#F59E0B" className="drop-shadow-lg" />
                      <text x="350" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Speed</text>
                      
                      {/* Level 3 - Mastered */}
                      <circle cx="450" cy="300" r="28" fill="#22C55E" className="drop-shadow-lg" />
                      <text x="450" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Time</text>
                      
                      <circle cx="650" cy="300" r="28" fill="#22C55E" className="drop-shadow-lg" />
                      <text x="650" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Units</text>
                    </g>

                    {/* Legend */}
                    <g transform="translate(600, 30)">
                      <circle cx="0" cy="0" r="8" fill="#22C55E" />
                      <text x="15" y="4" fontSize="11" fill="#64748B">Mastered</text>
                      <circle cx="0" cy="25" r="8" fill="#F59E0B" />
                      <text x="15" y="29" fontSize="11" fill="#64748B">Weak</text>
                      <circle cx="0" cy="50" r="8" fill="#EF4444" />
                      <text x="15" y="54" fontSize="11" fill="#64748B">Missing</text>
                    </g>
                  </svg>

                  {/* Diagnosis Callout */}
                  <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur border rounded-lg p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <Target className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">Root Cause Found</p>
                        <p className="text-sm text-muted-foreground">
                          You&apos;re struggling with <span className="font-medium text-foreground">Velocity</span> because you missed <span className="font-medium text-destructive">Vectors</span>. Master vectors first to unlock your potential.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floating User Avatars */}
            <div className="absolute -left-4 top-20 hidden lg:block">
              <div className="flex flex-col items-center gap-2 animate-bounce" style={{ animationDuration: '3s' }}>
                <Avatar className="h-14 w-14 border-4 border-card shadow-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground">AK</AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="text-xs">Ananya</Badge>
              </div>
            </div>
            
            <div className="absolute -right-4 top-32 hidden lg:block">
              <div className="flex flex-col items-center gap-2 animate-bounce" style={{ animationDuration: '3.5s' }}>
                <Avatar className="h-12 w-12 border-4 border-card shadow-lg">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">RK</AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="text-xs">Rohan</Badge>
              </div>
            </div>

            <div className="absolute left-20 -bottom-4 hidden lg:block">
              <div className="flex flex-col items-center gap-2 animate-bounce" style={{ animationDuration: '4s' }}>
                <Avatar className="h-11 w-11 border-4 border-card shadow-lg">
                  <AvatarFallback className="bg-success text-success-foreground">SP</AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="text-xs">Sneha</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-muted/30">
        <div className="mx-auto max-w-300 px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl text-balance">
              Learning that actually adapts to you
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Traditional learning platforms tell you what&apos;s wrong. AdaptIQ shows you why and guides you to mastery.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32">
        <div className="mx-auto max-w-300 px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Three steps to smarter learning
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Practice & Diagnose',
                description: 'Answer questions in your subject. When you get something wrong, AdaptIQ analyzes which underlying concept you missed.',
                icon: BookOpen,
              },
              {
                step: '02',
                title: 'Visualize Dependencies',
                description: 'See your knowledge on an interactive graph. Color-coded nodes show mastered, weak, and missing concepts with their connections.',
                icon: Network,
              },
              {
                step: '03',
                title: 'Follow Your Path',
                description: 'Get a personalized learning path that strengthens foundations first. Our AI companion guides you every step of the way.',
                icon: Sparkles,
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%-2rem)] w-16">
                    <ChevronRight className="h-8 w-8 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 lg:py-32 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-300 px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl text-balance">
                Stop wasting time on the wrong problems
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Most students study harder, not smarter. AdaptIQ ensures every minute you spend is on the concepts that actually matter for your progress.
              </p>
              <ul className="mt-8 space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link href="/">
                <Button size="lg" variant="secondary" className="mt-8 gap-2">
                  Start Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <Card className="bg-card text-card-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                      <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">AI Study Companion</p>
                      <p className="text-xs text-muted-foreground">Always ready to help</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      I keep getting velocity problems wrong. Why?
                    </div>
                    <div className="bg-accent rounded-lg p-3 text-sm">
                      <p className="font-medium text-accent-foreground mb-1">I analyzed your recent attempts:</p>
                      <p className="text-muted-foreground">
                        You&apos;re confusing velocity (a vector) with speed (a scalar). This happens because you haven&apos;t fully grasped vector concepts. Let me explain the difference with an example...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32">
        <div className="mx-auto max-w-300 px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Loved by students and educators
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <p className="text-muted-foreground flex-1">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-muted/50">
        <div className="mx-auto max-w-300 px-4 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex -space-x-3">
              {['AS', 'PM', 'RK', 'NJ', 'SK'].map((initials, i) => (
                <Avatar key={i} className="border-4 border-background">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Join 10,000+ students already learning smarter</p>
          </div>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl text-balance">
            Ready to understand why you struggle?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your free trial today. No credit card required. See your knowledge graph and get your first diagnosis in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button size="lg" className="gap-2 px-8">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline" size="lg">
                Try a Practice Session
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto max-w-300 px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">AdaptIQ</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">About</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              2026 AdaptIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
