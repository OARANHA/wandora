import { createHash } from 'node:crypto';
import { tryMaskMessagingRecipient } from '../messaging/channel-address.js';

export const CONTACT_DESTINATION_KINDS = ['telephone', 'mobile'] as const;
export type ContactDestinationKind = typeof CONTACT_DESTINATION_KINDS[number];

export const CONTACT_MESSAGING_CHANNELS = ['whatsapp'] as const;
export type ContactMessagingChannel = typeof CONTACT_MESSAGING_CHANNELS[number];

export type ContactChannelQualificationEvidence = {
  authority: 'messaging-provider';
  candidateKind: ContactDestinationKind;
  candidateDigest: string;
  channel: ContactMessagingChannel;
  qualified: boolean;
};

export type ContactDestinationCandidate = {
  kind: ContactDestinationKind;
  maskedAddress: string;
  channelQualification:
    | {
        state: 'qualified';
        channel: ContactMessagingChannel;
        authority: 'messaging-provider';
      }
    | {
        state: 'unqualified';
        channel: ContactMessagingChannel | null;
        reason: 'provider-evidence-required' | 'provider-rejected';
      };
};

export type ContactDestinationQualification = {
  candidates: ContactDestinationCandidate[];
  selectedDestination: null;
  requiresHumanDecision: boolean;
  requiresProviderEvidence: boolean;
  status: 'no-candidate' | 'channel-unqualified' | 'qualified-candidate-available';
};

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;

function canonicalCandidateValue(value: string): { compact: string; maskedAddress: string } {
  const compact = value.replace(/[\s()-]/g, '');
  const maskedAddress = tryMaskMessagingRecipient(value);
  if (!maskedAddress) throw new Error('contact_destination_invalid_candidate');
  return { compact, maskedAddress };
}

export function contactDestinationCandidateDigest(
  kind: ContactDestinationKind,
  value: string,
): string {
  const { compact } = canonicalCandidateValue(value);
  const digest = createHash('sha256')
    .update(JSON.stringify(['wandora-contact-destination-v1', kind, compact]), 'utf8')
    .digest('hex');
  return `sha256:${digest}`;
}

function assertEvidence(
  evidence: readonly ContactChannelQualificationEvidence[],
): void {
  const seen = new Set<string>();
  for (const item of evidence) {
    if (
      item.authority !== 'messaging-provider'
      || !CONTACT_DESTINATION_KINDS.includes(item.candidateKind)
      || !CONTACT_MESSAGING_CHANNELS.includes(item.channel)
      || !DIGEST_RE.test(item.candidateDigest)
      || typeof item.qualified !== 'boolean'
    ) {
      throw new Error('contact_destination_invalid_channel_evidence');
    }
    const key = `${item.candidateKind}:${item.channel}`;
    if (seen.has(key)) throw new Error('contact_destination_ambiguous_channel_evidence');
    seen.add(key);
  }
}

export function qualifyContactDestinations(input: {
  telephone?: string;
  mobilePhone?: string;
  evidence?: readonly ContactChannelQualificationEvidence[];
}): ContactDestinationQualification {
  const evidence = input.evidence ?? [];
  assertEvidence(evidence);

  const rawCandidates = [
    ...(input.telephone ? [{ kind: 'telephone' as const, value: input.telephone }] : []),
    ...(input.mobilePhone ? [{ kind: 'mobile' as const, value: input.mobilePhone }] : []),
  ];

  const candidateKeys = new Set(
    rawCandidates.map(({ kind, value }) => `${kind}:${contactDestinationCandidateDigest(kind, value)}`),
  );
  for (const item of evidence) {
    if (!candidateKeys.has(`${item.candidateKind}:${item.candidateDigest}`)) {
      throw new Error('contact_destination_evidence_mismatch');
    }
  }

  const candidates = rawCandidates.map(({ kind, value }): ContactDestinationCandidate => {
    const { maskedAddress } = canonicalCandidateValue(value);
    const digest = contactDestinationCandidateDigest(kind, value);
    const matching = evidence.find(
      (item) => item.candidateKind === kind
        && item.candidateDigest === digest
        && item.channel === 'whatsapp',
    );
    if (matching?.qualified === true) {
      return {
        kind,
        maskedAddress,
        channelQualification: {
          state: 'qualified',
          channel: 'whatsapp',
          authority: 'messaging-provider',
        },
      };
    }
    if (matching?.qualified === false) {
      return {
        kind,
        maskedAddress,
        channelQualification: {
          state: 'unqualified',
          channel: 'whatsapp',
          reason: 'provider-rejected',
        },
      };
    }
    return {
      kind,
      maskedAddress,
      channelQualification: {
        state: 'unqualified',
        channel: null,
        reason: 'provider-evidence-required',
      },
    };
  });

  const hasQualified = candidates.some(
    (candidate) => candidate.channelQualification.state === 'qualified',
  );
  return {
    candidates,
    selectedDestination: null,
    requiresHumanDecision: candidates.length > 0,
    requiresProviderEvidence: candidates.some(
      (candidate) => candidate.channelQualification.state === 'unqualified'
        && candidate.channelQualification.reason === 'provider-evidence-required',
    ),
    status: candidates.length === 0
      ? 'no-candidate'
      : hasQualified
        ? 'qualified-candidate-available'
        : 'channel-unqualified',
  };
}

function candidateLabel(kind: ContactDestinationKind): string {
  return kind === 'telephone' ? 'Telefone' : 'Celular';
}

export function contactDestinationQualificationFacts(
  qualification: ContactDestinationQualification,
): Array<{ label: string; value: string }> {
  if (qualification.candidates.length === 0) {
    return [
      { label: 'Destino candidato', value: 'Nenhum telefone/celular utilizável foi comprovado.' },
      { label: 'Canal qualificado', value: 'Não' },
      { label: 'Destino escolhido', value: 'Não' },
      { label: 'Envio autorizado', value: 'Não — qualificação não é autorização de envio.' },
    ];
  }

  const facts = qualification.candidates.flatMap((candidate) => {
    const label = candidateLabel(candidate.kind);
    const channelValue = candidate.channelQualification.state === 'qualified'
      ? `Sim — ${candidate.channelQualification.channel === 'whatsapp' ? 'WhatsApp' : candidate.channelQualification.channel} por evidência explícita do provider de mensageria.`
      : candidate.channelQualification.reason === 'provider-rejected'
        ? `Não — ${candidate.channelQualification.channel === 'whatsapp' ? 'WhatsApp' : candidate.channelQualification.channel} não foi qualificado pelo provider de mensageria.`
        : 'Não — exige evidência explícita do provider de mensageria.';

    return [
      { label: `Destino candidato — ${label}`, value: candidate.maskedAddress },
      { label: `Canal qualificado — ${label}`, value: channelValue },
    ];
  });

  return [
    ...facts,
    { label: 'Destino escolhido', value: 'Não — nenhuma seleção automática foi feita.' },
    { label: 'Envio autorizado', value: 'Não — qualificação não é autorização de envio.' },
  ];
}
