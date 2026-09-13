import {
  MAYOR_CANDIDATES,
  getCandidatePolicy,
} from "./candidatePool";
import type {
  MayorCandidate,
  MayorElectionResult,
  MayorPolicyCategory,
  MayorPolicyId,
} from "./electionTypes";

export const MAYOR_ELECTION_INTERVAL_TURNS = 10;
export const MAYOR_CANDIDATE_COUNT = 3;

export function isScheduledMayorElectionTurn(turnNumber: number): boolean {
  const safeTurn = Math.max(1, Math.trunc(turnNumber));
  return safeTurn % MAYOR_ELECTION_INTERVAL_TURNS === 0;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

export function createMayorElectionCandidates(
  previousWinningPolicyId: MayorPolicyId | null,
  random: () => number = Math.random,
): MayorCandidate[] {
  const eligibleCandidates = MAYOR_CANDIDATES.filter(
    (candidate) => candidate.policyId !== previousWinningPolicyId,
  );
  const candidatesByCategory = new Map<MayorPolicyCategory, MayorCandidate[]>();

  for (const candidate of eligibleCandidates) {
    const category = getCandidatePolicy(candidate).category;
    const categoryCandidates = candidatesByCategory.get(category) ?? [];
    categoryCandidates.push(candidate);
    candidatesByCategory.set(category, categoryCandidates);
  }

  const selected: MayorCandidate[] = [];
  const categories = shuffle([...candidatesByCategory.keys()], random);

  for (const category of categories) {
    const categoryCandidates = candidatesByCategory.get(category) ?? [];
    if (categoryCandidates.length === 0) continue;

    const candidate =
      categoryCandidates[Math.floor(random() * categoryCandidates.length)];
    selected.push(candidate);

    if (selected.length >= MAYOR_CANDIDATE_COUNT) break;
  }

  if (selected.length < MAYOR_CANDIDATE_COUNT) {
    for (const candidate of shuffle(eligibleCandidates, random)) {
      if (selected.some((selectedCandidate) => selectedCandidate.id === candidate.id)) {
        continue;
      }
      selected.push(candidate);
      if (selected.length >= MAYOR_CANDIDATE_COUNT) break;
    }
  }

  return selected;
}

export function resolveMayorElection(
  candidates: MayorCandidate[],
  votes: Record<string, string>,
  random: () => number = Math.random,
): MayorElectionResult {
  const voteCounts = Object.fromEntries(
    candidates.map((candidate) => [candidate.id, 0]),
  );

  for (const candidateId of Object.values(votes)) {
    if (candidateId in voteCounts) {
      voteCounts[candidateId] += 1;
    }
  }

  const highestVoteCount = Math.max(...Object.values(voteCounts), 0);
  const tiedCandidateIds = candidates
    .filter((candidate) => voteCounts[candidate.id] === highestVoteCount)
    .map((candidate) => candidate.id);
  const winnerCandidateId =
    tiedCandidateIds[Math.floor(random() * tiedCandidateIds.length)] ??
    candidates[0]?.id ??
    "";

  return {
    winnerCandidateId,
    voteCounts,
    tiedCandidateIds,
    wasTieBreak: tiedCandidateIds.length > 1,
  };
}
