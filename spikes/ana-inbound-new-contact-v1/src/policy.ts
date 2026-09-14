import type { EmployeeProposal } from './contracts.js';

export type PolicyDecision =
  | { decision: 'allow' }
  | { decision: 'require-approval'; reason: string };

const approvalReasons: Record<Exclude<EmployeeProposal['commitment'], 'none'>, string> = {
  discount: 'Descontos exigem aprovação humana.',
  'special-price': 'Preço especial exige aprovação humana.',
  'delivery-deadline': 'Promessa de prazo exige aprovação humana.',
  'payment-terms': 'Condição de pagamento exige aprovação humana.',
  contractual: 'Compromisso contratual exige aprovação humana.',
};

export function evaluateProposal(proposal: EmployeeProposal): PolicyDecision {
  if (proposal.commitment === 'none') {
    return { decision: 'allow' };
  }

  return {
    decision: 'require-approval',
    reason: approvalReasons[proposal.commitment],
  };
}
