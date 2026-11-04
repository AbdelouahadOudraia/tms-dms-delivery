import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPodCorrectionInstruction } from '../src/utils/podRejection';

test('le motif du rejet fournit une correction compréhensible au chauffeur', () => {
  assert.match(getPodCorrectionInstruction('Photo incorrecte'), /nouvelle photo/i);
  assert.match(getPodCorrectionInstruction('Signature manquante'), /signer/i);
  assert.match(getPodCorrectionInstruction('Localisation incohérente'), /position GPS/i);
});

test('un motif inconnu affiche une consigne de correction générale', () => {
  assert.match(getPodCorrectionInstruction('Motif futur'), /Vérifiez la photo/i);
  assert.match(getPodCorrectionInstruction(), /Vérifiez la photo/i);
});
