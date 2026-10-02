import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contactDestinationCandidateDigest,
  contactDestinationQualificationFacts,
  qualifyContactDestinations,
} from '../src/semantic-routing/contact-destination-qualification.js';

test('registered telephone/mobile remain separate candidates and no candidate or channel is selected automatically', () => {
  const result = qualifyContactDestinations({
    telephone: '5133333333',
    mobilePhone: '51999999999',
  });
  assert.equal(result.status, 'channel-unqualified');
  assert.equal(result.selectedDestination, null);
  assert.equal(result.requiresHumanDecision, true);
  assert.equal(result.requiresProviderEvidence, true);
  assert.deepEqual(
    result.candidates.map((candidate) => ({
      kind: candidate.kind,
      state: candidate.channelQualification.state,
      channel: candidate.channelQualification.channel,
    })),
    [
      { kind: 'telephone', state: 'unqualified', channel: null },
      { kind: 'mobile', state: 'unqualified', channel: null },
    ],
  );
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('5133333333'), false);
  assert.equal(serialized.includes('51999999999'), false);
  assert.equal(serialized.toLowerCase().includes('whatsapp'), false);
});

test('mobile alone still does not imply WhatsApp and remains provider-evidence-required', () => {
  const result = qualifyContactDestinations({ mobilePhone: '+55 (51) 99999-9999' });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.kind, 'mobile');
  assert.deepEqual(result.candidates[0]?.channelQualification, {
    state: 'unqualified',
    channel: null,
    reason: 'provider-evidence-required',
  });
  assert.equal(result.selectedDestination, null);
});

test('an explicitly qualified channel requires exact messaging-provider evidence bound to that candidate', () => {
  const mobilePhone = '+55 (51) 99999-9999';
  const result = qualifyContactDestinations({
    mobilePhone,
    evidence: [{
      authority: 'messaging-provider',
      candidateKind: 'mobile',
      candidateDigest: contactDestinationCandidateDigest('mobile', mobilePhone),
      channel: 'whatsapp',
      qualified: true,
    }],
  });
  assert.equal(result.status, 'qualified-candidate-available');
  assert.deepEqual(result.candidates[0]?.channelQualification, {
    state: 'qualified',
    channel: 'whatsapp',
    authority: 'messaging-provider',
  });
  assert.equal(result.selectedDestination, null);
  assert.equal(result.requiresHumanDecision, true);
  assert.equal(result.requiresProviderEvidence, false);
});

test('provider rejection and evidence mismatch remain fail-closed', () => {
  const telephone = '5133333333';
  const rejected = qualifyContactDestinations({
    telephone,
    evidence: [{
      authority: 'messaging-provider',
      candidateKind: 'telephone',
      candidateDigest: contactDestinationCandidateDigest('telephone', telephone),
      channel: 'whatsapp',
      qualified: false,
    }],
  });
  assert.deepEqual(rejected.candidates[0]?.channelQualification, {
    state: 'unqualified',
    channel: 'whatsapp',
    reason: 'provider-rejected',
  });
  assert.equal(rejected.selectedDestination, null);

  assert.throws(() => qualifyContactDestinations({
    telephone,
    evidence: [{
      authority: 'messaging-provider',
      candidateKind: 'telephone',
      candidateDigest: contactDestinationCandidateDigest('telephone', '51988888888'),
      channel: 'whatsapp',
      qualified: true,
    }],
  }), /contact_destination_evidence_mismatch/);
});

test('qualification facts reuse masked destination presentation and explicitly deny selection/send authorization', () => {
  const result = qualifyContactDestinations({
    telephone: '5133333333',
    mobilePhone: '51999999999',
  });
  const facts = contactDestinationQualificationFacts(result);
  const serialized = JSON.stringify(facts);
  assert.equal(facts.some((fact) => fact.label === 'Destino candidato — Telefone'), true);
  assert.equal(facts.some((fact) => fact.label === 'Destino candidato — Celular'), true);
  assert.equal(
    facts.find((fact) => fact.label === 'Destino escolhido')?.value,
    'Não — nenhuma seleção automática foi feita.',
  );
  assert.equal(
    facts.find((fact) => fact.label === 'Envio autorizado')?.value,
    'Não — qualificação não é autorização de envio.',
  );
  assert.equal(serialized.includes('5133333333'), false);
  assert.equal(serialized.includes('51999999999'), false);
});

test('no registered contacts yields no candidate, no qualified channel, and no send authorization', () => {
  const result = qualifyContactDestinations({});
  assert.deepEqual(result, {
    candidates: [],
    selectedDestination: null,
    requiresHumanDecision: false,
    requiresProviderEvidence: false,
    status: 'no-candidate',
  });
  const facts = contactDestinationQualificationFacts(result);
  assert.equal(facts.find((fact) => fact.label === 'Canal qualificado')?.value, 'Não');
  assert.equal(facts.find((fact) => fact.label === 'Destino escolhido')?.value, 'Não');
  assert.match(facts.find((fact) => fact.label === 'Envio autorizado')?.value ?? '', /^Não/);
});

test('malformed contact values cannot become destination candidates', () => {
  assert.throws(
    () => qualifyContactDestinations({ mobilePhone: 'whatsapp-do-cliente' }),
    /contact_destination_invalid_candidate/,
  );
});
