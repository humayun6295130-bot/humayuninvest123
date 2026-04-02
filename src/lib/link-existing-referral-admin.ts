/**
 * Server-side (Firebase Admin): link an existing user to a sponsor — same behavior as scripts/link-existing-referral.ts
 */
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

type ReferralLevelRow = { level: number; minTeamSize: number; minTeamInvestment: number };

const DEFAULT_REFERRAL_LEVELS: ReferralLevelRow[] = [
    { level: 1, minTeamSize: 0, minTeamInvestment: 0 },
    { level: 2, minTeamSize: 3, minTeamInvestment: 100 },
    { level: 3, minTeamSize: 10, minTeamInvestment: 500 },
    { level: 4, minTeamSize: 25, minTeamInvestment: 2000 },
    { level: 5, minTeamSize: 50, minTeamInvestment: 5000 },
];

function calculateTeamLevel(totalMembers: number, totalInvestment: number): number {
    for (let i = DEFAULT_REFERRAL_LEVELS.length - 1; i >= 0; i--) {
        const row = DEFAULT_REFERRAL_LEVELS[i]!;
        if (totalMembers >= row.minTeamSize && totalInvestment >= row.minTeamInvestment) {
            return row.level;
        }
    }
    return 1;
}

export type LinkExistingReferralResult =
    | { ok: true; message: string }
    | { ok: false; error: string };

export async function linkExistingReferralAdmin(
    db: Firestore,
    opts: { child: string; sponsor: string; force?: boolean; dryRun?: boolean }
): Promise<LinkExistingReferralResult> {
    const child = opts.child?.trim();
    const sponsor = opts.sponsor?.trim();
    const dryRun = !!opts.dryRun;
    const force = !!opts.force;

    if (!child || !sponsor) {
        return { ok: false, error: 'child and sponsor UIDs are required' };
    }
    if (child === sponsor) {
        return { ok: false, error: 'child and sponsor must be different' };
    }

    const childRef = db.collection('users').doc(child);
    const sponsorRef = db.collection('users').doc(sponsor);
    const [childSnap, sponsorSnap] = await Promise.all([childRef.get(), sponsorRef.get()]);

    if (!childSnap.exists) {
        return { ok: false, error: `No users document for child uid: ${child}` };
    }
    if (!sponsorSnap.exists) {
        return { ok: false, error: `No users document for sponsor uid: ${sponsor}` };
    }

    const childData = childSnap.data()!;
    const sponsorData = sponsorSnap.data()!;

    const refSnap = await db.collection('referrals').where('referred_user_id', '==', child).get();
    const l1Docs = refSnap.docs.filter((d) => Number(d.data().level) === 1);

    if (l1Docs.length > 1) {
        return { ok: false, error: 'Multiple level-1 referral rows for this child — fix manually in Firestore.' };
    }

    if (l1Docs.length === 1) {
        const existingSponsor = String(l1Docs[0]!.data().referrer_id || '');
        if (existingSponsor !== sponsor) {
            return {
                ok: false,
                error: `Child already has a direct sponsor in referrals: ${existingSponsor}.`,
            };
        }
        const current = typeof childData.referrer_id === 'string' ? childData.referrer_id.trim() : '';
        if (current === sponsor) {
            return { ok: true, message: 'Already linked: referrals L1 and users.referrer_id match this sponsor.' };
        }
        if (current && current !== sponsor && !force) {
            return {
                ok: false,
                error: `users.referrer_id is "${current}". Use force to set to sponsor ${sponsor}.`,
            };
        }
        if (dryRun) {
            return { ok: true, message: `[dry-run] Would set users.referrer_id to ${sponsor}` };
        }
        await childRef.update({
            referrer_id: sponsor,
            updated_at: new Date().toISOString(),
        });
        return { ok: true, message: `Updated users.referrer_id for ${child} → ${sponsor} (referral row already existed).` };
    }

    const currentRef =
        typeof childData.referrer_id === 'string' && childData.referrer_id.trim().length > 0
            ? childData.referrer_id.trim()
            : '';
    if (currentRef && currentRef !== sponsor && !force) {
        return {
            ok: false,
            error: `users.referrer_id is already "${currentRef}". Use force to replace with sponsor ${sponsor}.`,
        };
    }

    const settingsSnap = await db.collection('referral_settings').doc('default').get();
    const s = settingsSnap.exists ? settingsSnap.data()! : {};
    const level1DepositPercent = Number(s.level1_percent ?? 5);
    const level2DepositPercent = Number(s.level2_percent ?? 3);
    const level3DepositPercent = Number(s.level3_percent ?? 2);

    const teamCommissionEnabled = sponsorData.team_commission_enabled !== false;
    const referredEmail = String(childData.email || '');
    const referredUsername = String(childData.username || '');
    const referredName = String(childData.display_name || '').trim() || referredUsername || '';
    const investmentAmount = 0;
    const timestamp = new Date().toISOString();

    if (dryRun) {
        return {
            ok: true,
            message: '[dry-run] Would set referrer_id, create referrals L1–L3 (if chain exists), bump user_teams.',
        };
    }

    const batch = db.batch();

    const l1Ref = db.collection('referrals').doc();
    batch.set(l1Ref, {
        referrer_id: sponsor,
        referred_user_id: child,
        referred_email: referredEmail,
        referred_username: referredUsername,
        referred_name: referredName,
        level: 1,
        commission_percent: level1DepositPercent,
        total_commission: 0,
        status: teamCommissionEnabled ? 'active' : 'inactive',
        investment_amount: investmentAmount,
        created_at: timestamp,
    });

    const teamRef = db.collection('user_teams').doc(sponsor);
    const teamDoc = await teamRef.get();
    if (teamDoc.exists) {
        const td = teamDoc.data()!;
        const level1Count = (td.level1_count || 0) + 1;
        const totalMembers = (td.total_members || 0) + 1;
        const totalInvestment = (td.total_team_investment || 0) + investmentAmount;
        const newLevel = calculateTeamLevel(totalMembers, totalInvestment);
        batch.update(teamRef, {
            level1_count: level1Count,
            total_members: totalMembers,
            total_team_investment: totalInvestment,
            current_level: newLevel,
            updated_at: timestamp,
        });
    } else {
        batch.set(teamRef, {
            user_id: sponsor,
            total_members: 1,
            level1_count: 1,
            level2_count: 0,
            level3_count: 0,
            level4_count: 0,
            level5_count: 0,
            total_team_investment: investmentAmount,
            total_commission_earned: 0,
            current_level: 1,
            updated_at: timestamp,
        });
    }

    const grandparentRaw = sponsorData.referrer_id;
    const grandparentId =
        typeof grandparentRaw === 'string' && grandparentRaw.trim().length > 0 ? grandparentRaw.trim() : undefined;

    if (grandparentId) {
        const l2Ref = db.collection('referrals').doc();
        batch.set(l2Ref, {
            referrer_id: grandparentId,
            referred_user_id: child,
            referred_email: referredEmail,
            referred_username: referredUsername,
            referred_name: referredName,
            parent_referrer_id: sponsor,
            level: 2,
            commission_percent: level2DepositPercent,
            total_commission: 0,
            status: 'active',
            investment_amount: investmentAmount,
            created_at: timestamp,
        });

        const level2TeamRef = db.collection('user_teams').doc(grandparentId);
        batch.set(
            level2TeamRef,
            {
                user_id: grandparentId,
                level2_count: FieldValue.increment(1),
                total_members: FieldValue.increment(1),
                updated_at: timestamp,
            },
            { merge: true }
        );

        const gpSnap = await db.collection('users').doc(grandparentId).get();
        const greatGrandparentRaw = gpSnap.exists ? gpSnap.data()!.referrer_id : undefined;
        const greatGrandparentId =
            typeof greatGrandparentRaw === 'string' && greatGrandparentRaw.trim().length > 0
                ? greatGrandparentRaw.trim()
                : undefined;

        if (greatGrandparentId) {
            const l3Ref = db.collection('referrals').doc();
            batch.set(l3Ref, {
                referrer_id: greatGrandparentId,
                referred_user_id: child,
                referred_email: referredEmail,
                referred_username: referredUsername,
                referred_name: referredName,
                parent_referrer_id: sponsor,
                intermediate_referrer_id: grandparentId,
                level: 3,
                commission_percent: level3DepositPercent,
                total_commission: 0,
                status: 'active',
                investment_amount: investmentAmount,
                created_at: timestamp,
            });

            const level3TeamRef = db.collection('user_teams').doc(greatGrandparentId);
            batch.set(
                level3TeamRef,
                {
                    user_id: greatGrandparentId,
                    level3_count: FieldValue.increment(1),
                    total_members: FieldValue.increment(1),
                    updated_at: timestamp,
                },
                { merge: true }
            );
        }
    }

    batch.update(childRef, {
        referrer_id: sponsor,
        updated_at: timestamp,
    });

    await batch.commit();
    return {
        ok: true,
        message: `Linked ${child} → ${sponsor}: referrer_id, referrals, user_teams updated (L2/L3 if sponsor chain exists).`,
    };
}
