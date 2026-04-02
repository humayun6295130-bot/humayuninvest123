/**
 * CLI wrapper for linkExistingReferralAdmin — same flags as before.
 * Or use Admin → Platform → "Repair referral (old signups)" in the browser (no local JSON needed on Vercel).
 */
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { linkExistingReferralAdmin } from "../src/lib/link-existing-referral-admin";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const hit = process.argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

function initAdminDb() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) {
        console.error(
            "Missing FIREBASE_SERVICE_ACCOUNT_JSON. Use .env.local or run from Admin panel on the deployed site."
        );
        process.exit(1);
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!getApps().length) {
        initializeApp({ credential: cert(parsed as any) });
    }
    return getFirestore();
}

async function main() {
    const child = getArg("child")?.trim();
    const sponsor = getArg("sponsor")?.trim();
    const dryRun = hasFlag("dry-run");
    const force = hasFlag("force");

    if (!child || !sponsor) {
        console.error(
            "Usage: npx tsx scripts/link-existing-referral.ts --child=<uid> --sponsor=<uid> [--dry-run] [--force]"
        );
        process.exit(1);
    }

    const db = initAdminDb();
    const result = await linkExistingReferralAdmin(db, { child, sponsor, dryRun, force });
    if (result.ok) {
        console.log(result.message);
        process.exit(0);
    }
    console.error(result.error);
    process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
