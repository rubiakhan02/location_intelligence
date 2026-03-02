export interface LocateSection {
  title: string;
  body: string;
}

export interface LocateCategory {
  code: "L" | "O" | "C" | "A" | "T" | "E";
  name: string;
  maxScore: number;
  score: number;
  sections: LocateSection[];
}

export interface LocateSummary {
  totalScore: number;
  maxTotalScore: 1000;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  gradeLabel: "Excellent" | "Very Strong" | "Strong" | "Stable" | "Moderate" | "Weak";
  headlineVerdict: string;
}

export interface InfrastructureItem {
  name: string;
  category: "Metro" | "Hospital" | "School" | "Mall" | "Office" | "Park";
  distance: number;
}

export interface NearbyLandmark {
  name: string;
  category:
    | "Mall"
    | "University"
    | "Metro Station"
    | "Hospital"
    | "Airport"
    | "School"
    | "Park"
    | "Railway Station"
    | "IT Park";
  distanceKm: number;
}

export interface LocationAnalysis {
  id: number;
  cityId: string;
  cityName: string;
  altName: string;
  localityName: string;
  state: string;
  focus: string;
  evaluationDate: string;
  categories: LocateCategory[];
  summary: LocateSummary;
  nearbyLandmarks: NearbyLandmark[];
  interpretation: {
    strengths: string[];
    watchOuts: string[];
  };
  recommendations: {
    microMarketStrategy: string[];
    developerAndInfra: string[];
    assetType: string[];
    holdingHorizon: string;
  };
  verdictText: string;
}

export enum AppSection {
  Home = "home",
  Score = "score",
  HowItWorks = "how-it-works",
  Insights = "insights",
  Contact = "contact",
}
