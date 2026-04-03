import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeRetirementWithEvents } from './src/utils/math.js';

const testUser = {
  age: 32,
  retireAge: 60,
  monthlyIncome: 85000,
  npsContribution: 5000,
  npsCorpus: 120000,
  totalSavings: 50000,
  addSavings: true,
  npsEquity: 75,
  lifestyle: 'comfortable',
  taxRegime: 'new'
};

const base = computeRetirementWithEvents(testUser, []);

const contributionDrop = computeRetirementWithEvents(testUser, [
  { id: 'drop', type: 'contribution_drop', ageAtEvent: 33, durationMonths: 12, reducedContribution: 1000 },
]);

const stepupPause = computeRetirementWithEvents(testUser, [
  { id: 'pause', type: 'stepup_pause', ageAtEvent: 34, stepUpPauseYears: 2 },
]);

const medicalOngoing = computeRetirementWithEvents(testUser, [
  {
    id: 'med-ongoing',
    type: 'medical_expense',
    ageAtEvent: 34,
    corpusImpact: 150000,
    medicalMode: 'ongoing',
    monthlyMedicalCost: 12000,
    insuranceCoveragePct: 25,
  },
]);

assert.ok(contributionDrop.projectedValue < base.projectedValue, 'contribution drop should reduce projected value');
assert.ok(stepupPause.projectedValue <= base.projectedValue, 'step-up pause should not outperform baseline');
assert.ok(medicalOngoing.projectedValue < base.projectedValue, 'ongoing medical burden should reduce projected value');
assert.ok(base.score >= contributionDrop.score, 'baseline score should be at least contribution-drop score');

fs.writeFileSync('out.json', JSON.stringify({ base, contributionDrop, stepupPause, medicalOngoing }, null, 2));
console.log('test_math2.js passed');
