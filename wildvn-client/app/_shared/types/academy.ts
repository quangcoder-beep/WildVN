/** User-specific progress persisted by the Spring Boot Academy API. */
export interface AcademyProgress {
  rpPoints?: number;
  streakDays?: number;
  unlockedSpecies: string[];
  completedExpeditions: string[];
}
