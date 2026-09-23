import type {
  MediaType,
  ParticipantRow,
  Preferences,
  RatingRow,
  Role,
  SessionRow,
  SwipeDirection,
  SwipeRow,
  TitlesPoolRow,
  PooledTitle,
} from "@/lib/types";

export interface DataStore {
  ensureCouple(coupleId: string): Promise<void>;

  createSession(code: string): Promise<SessionRow>;
  getSessionByCode(code: string): Promise<SessionRow | null>;
  getSessionById(id: string): Promise<SessionRow | null>;
  updateSession(id: string, patch: Partial<SessionRow>): Promise<SessionRow>;
  /** Conditional update: only applies patch if current status === expectedStatus. Returns whether it applied. */
  claimTransition(id: string, expectedStatus: SessionRow["status"], patch: Partial<SessionRow>): Promise<boolean>;

  upsertParticipant(
    sessionId: string,
    role: Role,
    deviceId: string,
    preferences: Preferences
  ): Promise<ParticipantRow>;
  getParticipants(sessionId: string): Promise<ParticipantRow[]>;
  getParticipant(sessionId: string, role: Role): Promise<ParticipantRow | null>;
  getParticipantById(id: string): Promise<ParticipantRow | null>;
  setParticipantFinishedRound(participantId: string, round: number): Promise<void>;

  insertTitlesPool(sessionId: string, round: number, titles: PooledTitle[]): Promise<void>;
  getTitlesPool(sessionId: string, round: number): Promise<TitlesPoolRow[]>;
  getAllTitlesPool(sessionId: string): Promise<TitlesPoolRow[]>;

  insertSwipe(
    sessionId: string,
    participantId: string,
    round: number,
    tmdbId: number,
    mediaType: MediaType,
    direction: SwipeDirection
  ): Promise<void>;
  getSwipes(sessionId: string, round?: number): Promise<SwipeRow[]>;

  insertRating(
    sessionId: string,
    coupleId: string | null,
    tmdbId: number,
    mediaType: MediaType,
    title: string,
    stars: number
  ): Promise<void>;

  findParticipantsByDevice(deviceId: string): Promise<ParticipantRow[]>;
  getSessionsByIds(ids: string[]): Promise<SessionRow[]>;
  getSessionsByCoupleIds(coupleIds: string[]): Promise<SessionRow[]>;
  getRatingsForCoupleIds(coupleIds: string[]): Promise<RatingRow[]>;
}
