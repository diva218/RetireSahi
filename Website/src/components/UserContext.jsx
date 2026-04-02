import { createContext, useContext } from 'react';

export const UserContext = createContext();

export const INITIAL_USER_DATA = {
  firstName: '',
  age: '',
  workContext: '',
  monthlyIncome: '',
  npsUsage: '',
  npsContribution: '',
  npsCorpus: '',
  npsEquity: 50,
  retireAge: 60,
  lifestyle: '',
  addSavings: false,
  totalSavings: '',
  taxRegime: 'new',
  homeLoanInterest: 0,
  lifeInsurance_80C: 0,
  elss_ppf_80C: 0,
  medicalInsurance_80D: 0,
  educationLoanInterest_80E: 0,
  houseRentAllowance_HRA: 0,
  actualRentPaid: 0,
  leaveTravelAllowance_LTA: 0,
  isGovtEmployee: false,
  basicSalaryPct: 0.4,
  hasOptedForEmployerNPS: false,
};

export const withInitialUserData = (userData) => ({
  ...INITIAL_USER_DATA,
  ...(userData || {}),
});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a DashboardLayout');
  return context;
};
