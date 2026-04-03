import assert from 'node:assert/strict';
import { calculateRetirement, computeRetirementWithEvents } from './src/utils/math.js';

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
  taxRegime: 'new',
};

const base = computeRetirementWithEvents(testUser, []);
const legacyBase = calculateRetirement(testUser);

assert.ok(base.projectedValue > 0, 'baseline projected value should be positive');
assert.ok(base.requiredCorpus > 0, 'baseline required corpus should be positive');
assert.ok(base.score >= 0 && base.score <= 100, 'baseline score should stay in range');
assert.ok(legacyBase.projectedValue > 0, 'legacy calculator should still work');

const careerBreak = computeRetirementWithEvents(testUser, [
  { id: 'career', type: 'career_break', ageAtEvent: 34, durationMonths: 6 },
]);

const jobSwitch = computeRetirementWithEvents(testUser, [
  { id: 'switch', type: 'job_switch', ageAtEvent: 35, durationMonths: 3, newSalaryPct: 80, probationMonths: 3, probationContributionPct: 70 },
]);

const medical = computeRetirementWithEvents(testUser, [
  { id: 'med', type: 'medical_expense', ageAtEvent: 36, corpusImpact: 250000, medicalMode: 'one_time', insuranceCoveragePct: 0 },
]);

const windfall = computeRetirementWithEvents(testUser, [
  { id: 'bonus', type: 'windfall', ageAtEvent: 36, corpusImpact: 250000, windfallType: 'bonus' },
]);

assert.ok(careerBreak.score <= base.score, 'career break should not improve score');
assert.ok(jobSwitch.score <= base.score, 'job switch with salary drop should not improve score');
assert.ok(medical.projectedValue < base.projectedValue, 'medical expense should lower projected value');
assert.ok(windfall.projectedValue > base.projectedValue, 'windfall should increase projected value');

console.log('test_math.js passed');
