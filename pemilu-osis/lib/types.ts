export interface Status {
  school_name: string;
  election_name: string;
  academic_year: string;
  start_at: string | null;
  end_at: string | null;
  is_open: boolean;
  show_results: boolean;
}

export interface Candidate {
  id: string;
  number: number;
  name: string;
  class_name: string;
  wakil_name: string | null;
  wakil_class_name: string | null;
  photo_url: string | null;
  /**
   * Foto khusus untuk kartu di bilik suara. Kalau kosong, halaman /vote
   * memakai photo_url supaya panitia tidak wajib mengunggah dua kali.
   */
  vote_photo_url: string | null;
  video_url: string | null;
  slogan: string | null;
  vision: string;
  mission: string;
  is_active: boolean;
}

export interface VoterInfo {
  name: string;
  class_name: string;
  has_voted: boolean;
  /** "siswa" atau "guru". opsional selama check_voter belum mengembalikan role. */
  role?: string;
}

export interface VoterSession {
  NISN: string;
  name: string;
  class_name: string;
  has_voted: boolean;
  /** Disalin dari VoterInfo.role; menentukan label NISN atau NIP. */
  role?: string;
}

export interface VoterRow {
  NISN: string;
  name: string;
  class_name: string;
  has_voted: boolean;
  role: string;
  NIP: string;
}

export interface ResultRow {
  candidate_id: string;
  candidate_number: number;
  candidate_name: string;
  total: number;
}

export interface Tally {
  total_voters: number;
  total_votes: number;
}

export interface AdminStats {
  total_voters: number;
  total_votes: number;
  voted: number;
  candidates: number;
}

export interface SettingsPatch {
  school_name?: string;
  election_name?: string;
  academic_year?: string;
  start_at?: string | null; // ISO string, null = tidak diubah, "CLEAR" = kosongkan
  end_at?: string | null;
  is_open?: boolean;
  show_results?: boolean;
}

export interface CandidateInput {
  id?: string;
  number: number;
  name: string;
  class_name: string;
  wakil_name: string;
  wakil_class_name: string;
  photo_url: string;
  /** Dikosongkan berarti pakai photo_url; "CLEAR" menghapus foto khusus. */
  vote_photo_url: string;
  video_url: string;
  slogan: string;
  vision: string;
  mission: string;
  is_active: boolean;
}

export interface NewVoter {
  NISN: string;
  name: string;
  class_name: string;
  password: string;
  role: string;
  NIP: string;
}

