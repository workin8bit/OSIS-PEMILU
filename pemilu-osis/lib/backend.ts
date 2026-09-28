import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminStats,
  Candidate,
  CandidateInput,
  NewVoter,
  ResultRow,
  SettingsPatch,
  Status,
  Tally,
  VoterInfo,
  VoterRow,
} from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createClientWithFetch(): SupabaseClient {
  const isServer = typeof window === "undefined";
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: isServer
      ? {
          fetch: (input: URL | RequestInfo, init?: RequestInit) => {
            const headers = new Headers(init?.headers);
            headers.set("Prefer", "limit=100000");
            return fetch(input, { ...init, headers });
          },
        }
      : undefined,
  });
}

function sb(): SupabaseClient {
  return createClientWithFetch();
}

function friendly(e: unknown): Error {
  let msg: string;
  if (e instanceof Error) {
    msg = e.message;
  } else if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === "string") msg = obj.message;
    else if (typeof obj.details === "string") msg = obj.details;
    else if (typeof obj.hint === "string") msg = obj.hint;
    else msg = JSON.stringify(e);
  } else {
    msg = String(e);
  }
  if (/unauthorized/i.test(msg)) return new Error("Kunci admin salah.");
  if (/duplicate key/i.test(msg))
    return new Error("Data sudah ada (NIS/numur urut duplikat).");
  return new Error(msg || "Terjadi kesalahan.");
}

export const api = {
  async getStatus(): Promise<Status> {
    const { data, error } = await sb().rpc("get_status");
    if (error) throw friendly(error);
    return data as Status;
  },

  async listCandidates(): Promise<Candidate[]> {
    const { data, error } = await sb()
      .from("candidates")
      .select("*")
      .order("number");
    if (error) throw friendly(error);
    return (data ?? []) as Candidate[];
  },

  async checkVoter(nis: string, password: string): Promise<VoterInfo | null> {
    const { data, error } = await sb().rpc("check_voter", {
      p_nis: nis,
      p_password: password,
    });
    if (error) throw friendly(error);
    const rows = (data ?? []) as VoterInfo[];
    return rows.length ? rows[0] : null;
  },

  async castVote(
    nis: string,
    password: string,
    candidateId: string,
  ): Promise<string> {
    const { data, error } = await sb().rpc("cast_vote", {
      p_nis: nis,
      p_password: password,
      p_candidate_id: candidateId,
    });
    if (error) throw friendly(error);
    return data as string;
  },

  async getResults(): Promise<ResultRow[]> {
    const { data, error } = await sb().rpc("get_results");
    if (error) throw friendly(error);
    return (data ?? []) as ResultRow[];
  },

  async getTally(): Promise<Tally> {
    const { data, error } = await sb().rpc("get_tally");
    if (error) throw friendly(error);
    const rows = (data ?? []) as Tally[];
    return rows.length ? rows[0] : { total_voters: 0, total_votes: 0 };
  },

  async adminStats(username: string, key: string): Promise<AdminStats> {
    const { data, error } = await sb().rpc("admin_stats", {
      p_username: username,
      p_key: key,
    });
    if (error) throw friendly(error);
    return data as AdminStats;
  },

  async adminResults(username: string, key: string): Promise<ResultRow[]> {
    const { data, error } = await sb().rpc("admin_results", {
      p_username: username,
      p_key: key,
    });
    if (error) throw friendly(error);
    return (data ?? []) as ResultRow[];
  },

  async adminListVoters(username: string, key: string): Promise<VoterRow[]> {
    const pageSize = 1000;
    const allVoters: VoterRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await sb().rpc("admin_list_voters_paged", {
        p_username: username,
        p_key: key,
        p_limit: pageSize,
        p_offset: offset,
      });
      if (error) throw friendly(error);
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) break;
      allVoters.push(
        ...rows.map((v) => ({
          NISN: v.NISN as string,
          name: v.name as string,
          class_name: v.class_name as string,
          has_voted: v.has_voted as boolean,
          role: v.role as string,
          NIP: v.NIP as string,
        })),
      );
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    return allVoters;
  },

  async adminSetSettings(
    username: string,
    key: string,
    patch: SettingsPatch,
  ): Promise<void> {
    const args: Record<string, unknown> = {
      p_username: username,
      p_key: key,
    };
    if (patch.school_name != null) args.p_school_name = patch.school_name;
    if (patch.election_name != null) args.p_election_name = patch.election_name;
    if (patch.academic_year != null) args.p_academic_year = patch.academic_year;
    if (patch.start_at != null) args.p_start_at = patch.start_at;
    if (patch.end_at != null) args.p_end_at = patch.end_at;
    if (patch.is_open != null) args.p_is_open = patch.is_open;
    if (patch.show_results != null) args.p_show_results = patch.show_results;
    const { error } = await sb().rpc("admin_set_settings", args);
    if (error) throw friendly(error);
  },

  async adminUpsertCandidate(
    username: string,
    key: string,
    data: CandidateInput,
  ): Promise<string> {
    const { data: id, error } = await sb().rpc("admin_upsert_candidate", {
      p_username: username,
      p_key: key,
      p_id: data.id ?? null,
      p_number: data.number,
      p_name: data.name,
      p_class_name: data.class_name,
      p_wakil_name: data.wakil_name || null,
      p_wakil_class_name: data.wakil_class_name || null,
      p_photo_url: data.photo_url || null,
      // "CLEAR" berarti panitia sengaja mengosongkan foto khusus bilik suara.
      p_vote_photo_url: data.vote_photo_url === "" ? "CLEAR" : data.vote_photo_url || null,
      p_video_url: data.video_url || null,
      p_slogan: data.slogan || null,
      p_vision: data.vision,
      p_mission: data.mission,
      p_is_active: data.is_active,
    });
    if (error) throw friendly(error);
    return id as string;
  },

  async adminDeleteCandidate(
    username: string,
    key: string,
    id: string,
  ): Promise<void> {
    const { error } = await sb().rpc("admin_delete_candidate", {
      p_username: username,
      p_key: key,
      p_id: id,
    });
    if (error) throw friendly(error);
  },

  async adminAddVoters(
    username: string,
    key: string,
    rows: NewVoter[],
  ): Promise<number> {
    const { data, error } = await sb().rpc("admin_add_voters", {
      p_username: username,
      p_key: key,
      p_rows: rows.map((r) => ({
        nis: r.NISN,
        name: r.name,
        class_name: r.class_name,
        password: r.password,
        role: r.role || "siswa",
        nip: r.NIP || null,
      })),
    });
    if (error) throw friendly(error);
    return Number(data ?? 0);
  },

  async adminRemoveVoter(
    username: string,
    key: string,
    id: string,
  ): Promise<void> {
    const { error } = await sb().rpc("admin_remove_voter", {
      p_username: username,
      p_key: key,
      p_id: id,
    });
    if (error) throw friendly(error);
  },

  async adminResetVote(
    username: string,
    key: string,
    id: string,
  ): Promise<void> {
    const { error } = await sb().rpc("admin_reset_vote", {
      p_username: username,
      p_key: key,
      p_id: id,
    });
    if (error) throw friendly(error);
  },

  async adminResetVotes(username: string, key: string): Promise<void> {
    const { error } = await sb().rpc("admin_reset_votes", {
      p_username: username,
      p_key: key,
    });
    if (error) throw friendly(error);
  },

  async adminSetAdminPassword(
    username: string,
    key: string,
    newKey: string,
  ): Promise<void> {
    const { error } = await sb().rpc("admin_set_admin_password", {
      p_username: username,
      p_key: key,
      p_new: newKey,
    });
    if (error) throw friendly(error);
  },

  async resetDemo(): Promise<void> {
    throw new Error("Demo mode tidak tersedia di environment ini.");
  },
};
export const isDemoMode = false;
