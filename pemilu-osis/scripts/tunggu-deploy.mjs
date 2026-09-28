/**
 * Tunggu deployment Vercel sampai selesai, lalu cek isi halaman publik.
 * Dipakai setelah push ke main supaya tidak perlu menebak apakah auto-deploy
 * sudah selesai.
 *
 *   node scripts/tunggu-deploy.mjs [url-publik]
 */
const [, , argumen] = process.argv;
const PUBLIK = argumen || "https://pemilu-osis.vercel.app";
const PROYEK = "prj_9PcQeO1LZs3m6UMObjykYvQwd4GE";
const TIM = "team_MYqBhG9X49kNFoJRfTprHqTi";

const { readFileSync, existsSync } = await import("node:fs");
const { homedir } = await import("node:os");
const { join } = await import("node:path");

const kandidatToken = [
  join(homedir(), "AppData", "Roaming", "xdg.data", "com.vercel.cli", "auth.json"),
  join(homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
  join(homedir(), ".vercel", "auth.json"),
];
const berkas = kandidatToken.find((p) => existsSync(p));
if (!berkas) {
  console.error("Token Vercel tidak ditemukan; login dulu dengan npx vercel login");
  process.exit(1);
}
const token = JSON.parse(readFileSync(berkas, "utf8")).token;
const headers = { Authorization: `Bearer ${token}` };

const daftarDeploy = async () => {
  const r = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROYEK}&teamId=${TIM}&limit=1`,
    { headers },
  );
  const j = await r.json();
  return j.deployments?.[0];
};

let d = await daftarDeploy();
console.log("menunggu:", d.uid, d.meta?.githubCommitSha?.slice(0, 7), "->", d.state);

const batas = Date.now() + 5 * 60 * 1000;
while (["BUILDING", "QUEUED", "PENDING", "INITIALIZING"].includes(d.state) && Date.now() < batas) {
  await new Promise((r) => setTimeout(r, 10000));
  d = await daftarDeploy();
  console.log("  state:", d.state);
}

console.log("selesai:", d.uid, "->", d.state, "| commit", d.meta?.githubCommitSha?.slice(0, 7));
if (d.state !== "READY") {
  console.log("deploy tidak READY:", d.state);
  process.exit(1);
}

for (const hal of ["/", "/candidates", "/vote", "/admin"]) {
  const res = await fetch(PUBLIK + hal).catch(() => ({ status: "GAGAL" }));
  console.log(`  ${hal} -> ${res.status}`);
}
