import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { PlayerTokenData } from "../PlayerToken";
import {
  getCandidatePolicy,
  getPolicyCategoryLabel,
} from "../../game/election/candidatePool";
import type {
  MayorCandidate,
  PendingMayorElection,
} from "../../game/election/electionTypes";
import "./MayorElectionModal.css";

interface MayorElectionModalProps {
  election: PendingMayorElection | null;
  players: PlayerTokenData[];
  canVote: boolean;
  canConfirmResult: boolean;
  onVote: (candidateId: string) => void;
  onConfirmResult: () => void;
}

interface CandidatePortraitProps {
  candidate: MayorCandidate;
  compact?: boolean;
}

function CandidatePortrait({
  candidate,
  compact = false,
}: CandidatePortraitProps) {
  return (
    <div
      className={`mayor-candidate-portrait${
        compact ? " mayor-candidate-portrait--compact" : ""
      }`}
      aria-hidden="true"
    >
      <span>{candidate.number}</span>
      <img
        src={candidate.imagePath}
        alt=""
        draggable={false}
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
    </div>
  );
}

export function MayorElectionModal({
  election,
  players,
  canVote,
  canConfirmResult,
  onVote,
  onConfirmResult,
}: MayorElectionModalProps) {
  const [stampedCandidateId, setStampedCandidateId] =
    useState<string | null>(null);
  const voteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setStampedCandidateId(null);
  }, [
    election?.currentVoterIndex,
    election?.electionTurn,
    election?.result,
  ]);

  useEffect(
    () => () => {
      if (voteTimerRef.current !== null) {
        window.clearTimeout(voteTimerRef.current);
      }
    },
    [],
  );

  if (!election) return null;

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const currentVoterId = election.eligibleVoterIds[election.currentVoterIndex];
  const currentVoter = currentVoterId
    ? playerMap.get(currentVoterId) ?? null
    : null;
  const winner = election.result
    ? election.candidates.find(
        (candidate) => candidate.id === election.result?.winnerCandidateId,
      ) ?? null
    : null;
  const winnerPolicy = winner ? getCandidatePolicy(winner) : null;
  const isStamping = stampedCandidateId !== null;

  const castVote = (candidateId: string) => {
    if (!canVote || !currentVoter || isStamping || election.result) {
      return;
    }

    setStampedCandidateId(candidateId);

    if (voteTimerRef.current !== null) {
      window.clearTimeout(voteTimerRef.current);
    }

    voteTimerRef.current = window.setTimeout(() => {
      voteTimerRef.current = null;
      onVote(candidateId);
    }, 760);
  };

  return (
    <div className="mayor-election-overlay" role="dialog" aria-modal="true">
      <section className="mayor-election-modal">
        <header className="mayor-election-modal__header">
          <div>
            <span>
              {election.mode === "DEV"
                ? "DEV 시장선거"
                : `${election.electionTurn}턴 정기선거`}
            </span>
            <h2>울산광역시장 선거</h2>
          </div>

          {!election.result && currentVoter && (
            <strong style={{ ["--voter-color" as string]: currentVoter.color }}>
              {currentVoter.name} 투표 중
            </strong>
          )}
        </header>

        {election.result && winner && winnerPolicy ? (
          <div className="mayor-election-result">
            <div className="mayor-election-result__winner">
              <CandidatePortrait candidate={winner} />

              <div>
                <small>
                  제{Math.max(1, Math.floor(election.electionTurn / 10))}대
                  울산광역시장 당선
                </small>
                <h3>{winner.name}</h3>
                <span>{winner.title}</span>
                <blockquote>“{winner.slogan}”</blockquote>
              </div>
            </div>

            <div className="mayor-election-result__policy">
              <small>{getPolicyCategoryLabel(winnerPolicy.category)}</small>
              <strong>{winnerPolicy.name}</strong>
              <p>{winnerPolicy.summary}</p>

              <div className="mayor-election-result__effects">
                {winnerPolicy.benefits.map((benefit) => (
                  <span key={benefit} className="is-benefit">
                    + {benefit}
                  </span>
                ))}
                {winnerPolicy.tradeoffs.map((tradeoff) => (
                  <span key={tradeoff} className="is-tradeoff">
                    − {tradeoff}
                  </span>
                ))}
              </div>
            </div>

            <div className="mayor-election-result__votes">
              {election.candidates
                .slice()
                .sort(
                  (first, second) =>
                    (election.result?.voteCounts[second.id] ?? 0) -
                    (election.result?.voteCounts[first.id] ?? 0),
                )
                .map((candidate) => (
                  <div
                    key={candidate.id}
                    className={candidate.id === winner.id ? "is-winner" : ""}
                  >
                    <CandidatePortrait candidate={candidate} compact />
                    <span>
                      <small>기호 {candidate.number}번</small>
                      <strong>{candidate.name}</strong>
                    </span>
                    <b>
                      {election.result?.voteCounts[candidate.id] ?? 0}표
                    </b>
                  </div>
                ))}
            </div>

            {election.result.wasTieBreak && (
              <p className="mayor-election-result__tie">
                최다 득표 동률로 추첨을 통해 당선자가 결정됐습니다.
              </p>
            )}

            <footer>
              <button
                type="button"
                disabled={!canConfirmResult}
                onClick={onConfirmResult}
              >
                당선 결과 확인
              </button>
            </footer>
          </div>
        ) : (
          <div className="mayor-ballot">
            <div className="mayor-ballot__heading">
              <div>
                <small>울산광역시 선거관리위원회</small>
                <strong>울산광역시장 선거 투표용지</strong>
              </div>
              <span>
                투표{" "}
                {Math.min(
                  election.currentVoterIndex + 1,
                  election.eligibleVoterIds.length,
                )}
                /{election.eligibleVoterIds.length}
              </span>
            </div>

            <p className="mayor-ballot__instruction">
              후보자 한 명을 선택하면 붉은 투표 도장이 찍힙니다.
            </p>

            <div className="mayor-election-candidates">
              {election.candidates.map((candidate) => {
                const policy = getCandidatePolicy(candidate);
                const stamped = stampedCandidateId === candidate.id;

                return (
                  <article
                    key={candidate.id}
                    className={`mayor-ballot-paper${
                      stamped ? " is-stamped" : ""
                    }`}
                  >
                    <div className="mayor-ballot-paper__number">
                      <span>기호</span>
                      <strong>{candidate.number}</strong>
                    </div>

                    <CandidatePortrait candidate={candidate} />

                    <div className="mayor-ballot-paper__identity">
                      <small>{candidate.title}</small>
                      <h3>{candidate.name}</h3>
                      <p>“{candidate.slogan}”</p>
                    </div>

                    <div className="mayor-ballot-paper__policy">
                      <span>{getPolicyCategoryLabel(policy.category)}</span>
                      <strong>{policy.name}</strong>
                      <p>{policy.summary}</p>

                      <div className="mayor-ballot-paper__effects">
                        <div>
                          {policy.benefits.map((benefit) => (
                            <small key={benefit} className="is-benefit">
                              + {benefit}
                            </small>
                          ))}
                        </div>
                        <div>
                          {policy.tradeoffs.map((tradeoff) => (
                            <small key={tradeoff} className="is-tradeoff">
                              − {tradeoff}
                            </small>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mayor-ballot-paper__vote"
                      disabled={!canVote || !currentVoter || isStamping}
                      onClick={() => castVote(candidate.id)}
                    >
                      <span>투표란</span>
                      <b>○</b>

                      {stamped && (
                        <i className="mayor-election-stamp" aria-label="투표">
                          <span>울산</span>
                          <strong>투표</strong>
                        </i>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mayor-election-progress" aria-hidden="true">
              <div>
                <i
                  style={{
                    width: `${
                      election.eligibleVoterIds.length > 0
                        ? ((election.currentVoterIndex + 1) /
                            election.eligibleVoterIds.length) *
                          100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
