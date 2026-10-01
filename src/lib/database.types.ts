// Hand-written types matching supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

import type { FinalStage, KoStage, Stage } from "@/lib/competition";

export type Gender = "M" | "F";
export type Serve = "A" | "B";
export type MatchStatus = "scheduled" | "live" | "finished";
export type MatchResult = "W" | "L";

export type Player = {
  id: string;
  name: string;
  gender: Gender;
  level: string;
  region: string;
  photo_url: string | null;
  points: number;
  wins: number;
  losses: number;
  points_adjustment: number;
  active: boolean;
  created_at: string;
};

export type Session = {
  id: string;
  tag: string;
  title: string;
  venue: string;
  session_date: string; // YYYY-MM-DD
  time_range: string;
  price: string;
  slots: number | null;
  whatsapp_url: string | null;
  published: boolean;
  created_at: string;
};

export type Match = {
  id: string;
  session_id: string | null;
  session_label: string;
  venue: string;
  set_label: string;
  team_a_name: string;
  team_b_name: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  team_a_sets: number[];
  team_b_sets: number[];
  team_a_game: string;
  team_b_game: string;
  serve: Serve;
  is_live: boolean;
  stream_url: string | null;
  court_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timer_running: boolean;
  timer_start: string | null;
  timer_base_seconds: number;
  status: MatchStatus;
  winner: Serve | null;
  // competition (null / defaults for regular matches)
  event_id: string | null;
  stage: Stage | null;
  group_label: string | null;
  round_no: number | null;
  bracket_pos: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_games: number;
  team_b_games: number;
  winner_team_id: string | null;
  is_wo: boolean;
  is_bye: boolean;
  next_match_id: string | null;
  next_slot: Serve | null;
  created_at: string;
  updated_at: string;
};

export type MatchHistory = {
  id: string;
  match_id: string | null;
  player_id: string;
  session_label: string;
  opponent_label: string;
  result: MatchResult;
  points_delta: number;
  stream_url: string | null;
  created_at: string;
};

export type Venue = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type Court = {
  id: string;
  name: string;
  venue_id: string | null;
  active: boolean;
  created_at: string;
};

export type GenFormat = "americano" | "mexicano" | "fixed_americano" | "fixed_mexicano";
export type GenEventStatus = "draft" | "active" | "finished";

export type GenEvent = {
  id: string;
  title: string;
  format: GenFormat;
  points_target: number;
  court_ids: string[];
  status: GenEventStatus;
  sync_to_leaderboard: boolean;
  created_at: string;
};

export type GenParticipant = {
  id: string;
  event_id: string;
  player_id: string | null;
  display_name: string;
  team_no: number | null;
  total_points: number;
  sits_out_count: number;
  created_at: string;
};

export type GenRound = {
  id: string;
  event_id: string;
  round_no: number;
  created_at: string;
};

export type GenMatch = {
  id: string;
  round_id: string;
  court_id: string | null;
  team_a_participant_ids: string[];
  team_b_participant_ids: string[];
  team_a_points: number | null;
  team_b_points: number | null;
  created_at: string;
};

export type EventType = "mabar" | "kompetisi";
export type EventStatus = "draft" | "active" | "finished";
export type EventPoints = Record<FinalStage, number>;

/** Named CompEvent to avoid clashing with the DOM Event type. */
export type CompEvent = {
  id: string;
  slug: string;
  type: EventType;
  title: string;
  description: string;
  event_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  venue_id: string | null;
  court_ids: string[];
  price: string;
  whatsapp_url: string | null;
  num_teams: number;
  num_groups: number;
  advance_per_group: number;
  ko_start: KoStage;
  match_minutes: number;
  points: EventPoints;
  published: boolean;
  status: EventStatus;
  bracket_generated: boolean;
  bracket_stale: boolean;
  draw_seed: number;
  created_at: string;
};

export type CompTeam = {
  id: string;
  event_id: string;
  name: string;
  group_label: string | null;
  final_stage: FinalStage | null;
  created_at: string;
};

export type CompTeamPlayer = { team_id: string; event_id: string; player_id: string; slot: number };

export type PlayerAward = {
  id: string;
  event_id: string;
  player_id: string;
  team_id: string | null;
  stage: FinalStage;
  points: number;
  created_at: string;
};

export type CompScoreLog = {
  id: string;
  event_id: string | null;
  match_id: string | null;
  user_id: string | null;
  action: "finish" | "correct";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

type Insert<T, Required extends keyof T> = Pick<T, Required> & Partial<Omit<T, Required>>;

export type Database = {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Insert<Player, "name" | "gender">;
        Update: Partial<Player>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Insert<Session, "title" | "venue" | "session_date">;
        Update: Partial<Session>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Partial<Match>;
        Update: Partial<Match>;
        Relationships: [];
      };
      match_history: {
        Row: MatchHistory;
        Insert: Insert<MatchHistory, "player_id" | "result" | "points_delta">;
        Update: Partial<MatchHistory>;
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      venues: {
        Row: Venue;
        Insert: Insert<Venue, "name">;
        Update: Partial<Venue>;
        Relationships: [];
      };
      courts: {
        Row: Court;
        Insert: Insert<Court, "name">;
        Update: Partial<Court>;
        Relationships: [];
      };
      gen_events: {
        Row: GenEvent;
        Insert: Insert<GenEvent, "format">;
        Update: Partial<GenEvent>;
        Relationships: [];
      };
      gen_participants: {
        Row: GenParticipant;
        Insert: Insert<GenParticipant, "event_id" | "display_name">;
        Update: Partial<GenParticipant>;
        Relationships: [];
      };
      gen_rounds: {
        Row: GenRound;
        Insert: Insert<GenRound, "event_id" | "round_no">;
        Update: Partial<GenRound>;
        Relationships: [];
      };
      gen_matches: {
        Row: GenMatch;
        Insert: Insert<GenMatch, "round_id">;
        Update: Partial<GenMatch>;
        Relationships: [];
      };
      events: {
        Row: CompEvent;
        Insert: Insert<CompEvent, "slug" | "title">;
        Update: Partial<CompEvent>;
        Relationships: [];
      };
      comp_teams: {
        Row: CompTeam;
        Insert: Insert<CompTeam, "event_id" | "name">;
        Update: Partial<CompTeam>;
        Relationships: [];
      };
      comp_team_players: {
        Row: CompTeamPlayer;
        Insert: Insert<CompTeamPlayer, "team_id" | "event_id" | "player_id">;
        Update: Partial<CompTeamPlayer>;
        Relationships: [];
      };
      player_awards: {
        Row: PlayerAward;
        Insert: Insert<PlayerAward, "event_id" | "player_id" | "stage">;
        Update: Partial<PlayerAward>;
        Relationships: [];
      };
      comp_score_log: {
        Row: CompScoreLog;
        Insert: Insert<CompScoreLog, "action">;
        Update: Partial<CompScoreLog>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      finalize_match: {
        Args: {
          p_match_id: string;
          p_winner: Serve;
          p_win_points: number;
          p_loss_points: number;
        };
        Returns: undefined;
      };
      comp_set_result: {
        Args: { p_match_id: string; p_games_a: number; p_games_b: number; p_wo?: Serve | null };
        Returns: undefined;
      };
      comp_finish_event: {
        Args: { p_event_id: string; p_stages: { team_id: string; stage: FinalStage }[] };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
