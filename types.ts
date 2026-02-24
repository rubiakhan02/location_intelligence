
export interface ScoreBreakdown {
  connectivity: number;
  healthcare: number;
  education: number;
  retail: number;
  employment: number;
}

export interface InfrastructureItem {
  name: string;
  category: 'Metro' | 'Hospital' | 'School' | 'Mall' | 'Office' | 'Park';
  distance: number;
}

export interface LocationAnalysis {
  city: string;
  sector: string;
  overallScore: number;
  label: 'Excellent' | 'High Growth' | 'Good' | 'Emerging' | 'Average' | 'Developing';
  breakdown: ScoreBreakdown;
  infrastructure: InfrastructureItem[];
  summary: string;
}

export enum AppSection {
  Home = 'home',
  Score = 'score',
  HowItWorks = 'how-it-works',
  Insights = 'insights',
  Contact = 'contact'
}
