import type { MayorTerm } from "../../game/election/electionTypes";
import { getActiveMayorPolicy } from "../../game/election/policyEffects";
import "./MayorPolicyIndicator.css";

interface MayorPolicyIndicatorProps {
  mayorTerm: MayorTerm | null;
  turnNumber: number;
}

export function MayorPolicyIndicator({
  mayorTerm,
  turnNumber,
}: MayorPolicyIndicatorProps) {
  if (!mayorTerm) {
    return (
      <aside className="mayor-policy-indicator mayor-policy-indicator--vacant">
        <small>울산시장</small>
        <strong>시장 공석</strong>
        <span>10턴 종료 후 첫 선거</span>
      </aside>
    );
  }

  const activePolicy = getActiveMayorPolicy(mayorTerm, turnNumber);

  return (
    <aside className="mayor-policy-indicator">
      <div>
        <small>울산시장 · {mayorTerm.candidate.name}</small>
        <strong>{mayorTerm.policy.name}</strong>
      </div>
      <span>
        {activePolicy
          ? `${mayorTerm.activeFromTurn}~${mayorTerm.expiresAfterTurn}턴 적용`
          : `${mayorTerm.activeFromTurn}턴부터 적용`}
      </span>
    </aside>
  );
}
