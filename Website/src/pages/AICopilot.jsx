import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Send, Bot, User, Trash2, ArrowRight, Zap, Target,
  HelpCircle, AlertCircle, RefreshCcw, ExternalLink, Cpu
} from 'lucide-react';
import {
  formatIndian,
  calculateRetirement,
  INFLATION_RATE,
  SCHEME_E_RETURN,
  ANNUITY_RATE
} from '../utils/math';
import DashboardLayout, { useUser } from '../components/DashboardLayout';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // High performance free model

async function callGroq(messages) {
  if (!GROQ_API_KEY) {
    throw new Error('MISSING_KEY');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error('Groq API Error:', data.error);
    throw new Error(data.error.message);
  }

  return data.choices[0].message.content;
}

const QuickPrompt = ({ text, onClick }) => (
  <button
    onClick={() => onClick(text)}
    className="bg-white border-2 border-[#1E293B] rounded-full px-6 py-3 text-xs md:text-sm font-black uppercase tracking-widest pop-shadow hover:bg-[#8B5CF6] hover:text-white transition-all cursor-pointer text-left truncate max-w-full"
  >
    {text}
  </button>
);

const MessageBubble = ({ role, content, timestamp }) => {
  const isAI = role === 'assistant' || role === 'system';
  return (
    <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`text-[9px] font-black uppercase tracking-widest text-slate-400 ${!isAI && 'text-right w-full'}`}>
          {isAI ? 'RetireSahi AI' : 'You'} • {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div
        className={`max-w-[85%] md:max-w-[75%] p-4 border-2 border-[#1E293B] pop-shadow relative ${isAI
          ? 'bg-white rounded-[18px_18px_18px_4px]'
          : 'bg-[#8B5CF6] text-white rounded-[18px_18px_4px_18px]'
          }`}
      >
        <div className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${!isAI && 'font-bold'}`}>
          {content}
        </div>
      </div>
    </div>
  );
};

const LoadingBubble = () => (
  <div className="flex flex-col items-start">
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">RetireSahi AI is thinking...</div>
    <div className="bg-white border-2 border-[#1E293B] rounded-[18px_18px_18px_4px] p-4 pop-shadow flex gap-1.5">
      <div className="w-2 h-2 bg-[#F472B6] rounded-full animate-[dotPulse_1s_infinite_0ms]" />
      <div className="w-2 h-2 bg-[#F472B6] rounded-full animate-[dotPulse_1s_infinite_200ms]" />
      <div className="w-2 h-2 bg-[#F472B6] rounded-full animate-[dotPulse_1s_infinite_400ms]" />
    </div>
    <style>{`
      @keyframes dotPulse {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  </div>
);

const ChatInterface = () => {
  const { userData } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (userData) {
      localStorage.setItem('retiresahi_user_data', JSON.stringify(userData));
    }
  }, [userData]);

  const location = useLocation();
  const hasTriggeredInitial = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (userData && location.state?.initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      const prompt = location.state.initialPrompt;
      // Clear location state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
      handleSend(prompt);
    }
  }, [userData, location.state]);

  if (!userData) return null;

  const displayData = userData.score !== undefined ? userData : { ...userData, ...calculateRetirement(userData) };

  // Ensure annuity fields exist for system prompt
  if (!displayData.lumpSumCorpus) {
    displayData.lumpSumCorpus = displayData.projectedValue * 0.6
  }
  if (!displayData.monthlyAnnuityIncome) {
    displayData.monthlyAnnuityIncome = (displayData.projectedValue * 0.4 * 0.06) / 12
  }
  if (!displayData.blendedReturn) {
    const eq = (displayData.npsEquity || 50) / 100
    displayData.blendedReturn = (eq * 0.1269) + ((1 - eq) / 2 * 0.0887) + ((1 - eq) / 2 * 0.0874)
  }

  const handleSend = async (content) => {
    const text = typeof content === 'string' ? content : inputValue;
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const scoreBand =
      displayData.score <= 30 ? 'Critical' :
      displayData.score <= 50 ? 'At Risk' :
      displayData.score <= 70 ? 'On Track' :
      displayData.score <= 85 ? 'Good' : 'Excellent';

    const maxEquityPct = displayData.age < 50
      ? 75
      : Math.max(50, 75 - (displayData.age - 50) * 2.5);

    const yearsToRetire = displayData.retireAge - displayData.age;
    const annualIncome = displayData.monthlyIncome * 12;
    const basicSalary = annualIncome * (displayData.workContext === 'Government' ? 0.50 : 0.40);

    const systemPrompt = `
You are RetireSahi AI — a sharp, warm, no-nonsense financial co-pilot built exclusively for Indian NPS subscribers. You were created by the RetireSahi team. You are currently speaking with ${displayData.firstName}.

Your entire purpose is to help ${displayData.firstName} retire better. You have full access to their retirement profile and pre-computed insights. Every answer you give must be grounded in their specific numbers — never generic.

════════════════════════════════════════════════
${displayData.firstName.toUpperCase()}'S COMPLETE RETIREMENT PROFILE
════════════════════════════════════════════════

PERSONAL:
- Name: ${displayData.firstName}
- Age: ${displayData.age} | Retirement target: age ${displayData.retireAge} | Years left: ${yearsToRetire}
- Sector: ${displayData.workContext}
- Monthly income: ₹${displayData.monthlyIncome.toLocaleString('en-IN')} (annual: ₹${annualIncome.toLocaleString('en-IN')})
- Estimated basic salary: ₹${Math.round(basicSalary).toLocaleString('en-IN')}/year (${displayData.workContext === 'Government' ? '50' : '40'}% of CTC)
- Tax regime: ${displayData.taxRegime || 'New Regime'} (FY 2025-26)
- Lifestyle goal: ${displayData.lifestyle || 'Comfortable'}

NPS PORTFOLIO:
- Monthly NPS contribution: ₹${displayData.npsContribution.toLocaleString('en-IN')}
- Current NPS corpus: ₹${displayData.npsCorpus.toLocaleString('en-IN')}
- Other savings: ₹${(displayData.totalSavings || 0).toLocaleString('en-IN')}
- Equity allocation: ${displayData.npsEquity}% (PFRDA cap at age ${displayData.age}: ${maxEquityPct}%)

RETIREMENT PROJECTIONS:
- Blended annual return: ${((displayData.blendedReturn || 0.1172) * 100).toFixed(2)}% (based on ${displayData.npsEquity}% equity)
- Projected corpus at ${displayData.retireAge}: ₹${formatIndian(displayData.projectedValue)}
- Required corpus for ${displayData.lifestyle} lifestyle: ₹${formatIndian(displayData.requiredCorpus)}
- Retirement gap: ₹${formatIndian(Math.max(0, displayData.requiredCorpus - displayData.projectedValue))}
- Monthly gap closer: ₹${formatIndian(displayData.monthlyGap)} extra/month needed to close gap entirely
- Monthly need at retirement (inflation-adjusted): ₹${formatIndian(displayData.monthlySpendAtRetirement)}
- Lump sum at ${displayData.retireAge} (60%): ₹${formatIndian(displayData.lumpSumCorpus || displayData.projectedValue * 0.6)}
- Monthly pension from annuity (40%): ₹${formatIndian(displayData.monthlyAnnuityIncome || (displayData.projectedValue * 0.4 * 0.06) / 12)}

RETIREMENT READINESS:
- Score: ${displayData.score}/100 — ${scoreBand}
- Score meaning: ${
  displayData.score <= 30 ? 'Serious action needed immediately. Current plan falls far short.' :
  displayData.score <= 50 ? 'At risk. Significant changes needed to retire comfortably.' :
  displayData.score <= 70 ? 'Reasonable foundation but gap exists. Optimization will help.' :
  displayData.score <= 85 ? 'Good shape. Small tweaks for an excellent outcome.' :
  'Excellent. On track to fully fund retirement goal.'
}

════════════════════════════════════════════════
NPS RULES YOU MUST KNOW AND APPLY CORRECTLY
════════════════════════════════════════════════

PFRDA INVESTMENT RULES:
- Scheme E (Equity): max 75% for age <50, tapers 2.5%/year from 50–60, min 50% at 60+
- Scheme C (Corporate Bonds): no cap
- Scheme G (Govt Securities): no cap
- Active choice: user picks allocation. Auto choice: age-based automatic tapering
- ${displayData.firstName}'s current equity: ${displayData.npsEquity}%, max allowed: ${maxEquityPct}%

AT RETIREMENT (AGE 60):
- Minimum 40% of corpus MUST be annuitized (converted to monthly pension)
- Maximum 60% can be taken as tax-free lump sum
- If corpus < ₹5 Lakh: can withdraw 100% as lump sum (exception)
- Annuity providers: LIC, SBI Life, HDFC Life, ICICI Pru, Kotak, Max Life
- Annuity types: Life annuity, joint life, with return of purchase price, etc.
- Annuity income is taxable as per income tax slab

PARTIAL WITHDRAWALS (TIER I):
- Allowed after 3 years of NPS subscription
- Maximum 3 times during entire NPS tenure
- Maximum 25% of own contributions (not employer's)
- Only for specific reasons: higher education, marriage of children, home purchase/construction, critical illness, disability

EARLY EXIT (BEFORE 60):
- After 10 years: can exit but must annuitize 80% (only 20% lump sum)
- Before 10 years: full withdrawal allowed only on death or specific disability
- On death: full corpus to nominee, no annuity requirement

TIER I vs TIER II:
- Tier I: Locked till 60 (except partial withdrawals), tax benefits available
- Tier II: Fully flexible withdrawal anytime, NO tax benefits, no employer contribution
- Tier II not available to government employees under NPS (only Tier I mandatory)

TAX RULES (FY 2025-26, Budget 2025):
- 80CCD(1): Own contribution deduction
  * Private sector: up to 10% of basic salary, max ₹1.5L (shared with 80C)
  * Government: up to 14% of basic salary, max ₹1.5L
  * ONLY available under Old Tax Regime
- 80CCD(1B): Additional ₹50,000 deduction exclusive to NPS
  * ONLY available under Old Tax Regime
  * Most powerful NPS tax benefit — few people use it fully
- 80CCD(2): Employer NPS contribution deduction
  * Private: up to 10% of basic salary (no upper limit in ₹)
  * Government: up to 14% of basic salary (Budget 2024 update)
  * Available under BOTH Old AND New Tax Regime
  * This is why corporate NPS is extremely tax-efficient
- New Regime standard deduction: ₹75,000 (Budget 2024)
- Old Regime standard deduction: ₹50,000
- 87A Rebate: Zero tax if taxable income ≤ ₹12L (new regime) or ≤ ₹5L (old regime)
- NPS lump sum at retirement: 100% TAX FREE
- Annuity income: taxable at applicable slab rate

NEW TAX REGIME SLABS (FY 2025-26):
₹0–4L: 0% | ₹4–8L: 5% | ₹8–12L: 10% | ₹12–16L: 15% | ₹16–20L: 20% | ₹20–24L: 25% | Above ₹24L: 30%

OLD TAX REGIME SLABS:
₹0–2.5L: 0% | ₹2.5–5L: 5% | ₹5–10L: 20% | Above ₹10L: 30%

NPS FUND MANAGERS (as of 2025):
SBI Pension, LIC Pension, UTI Retirement, HDFC Pension, Kotak Pension, Aditya Birla, Tata Pension, Max Life Pension

SCHEME RETURNS (10-year averages):
- Scheme E (Equity): ~12.69% p.a.
- Scheme C (Corporate Bonds): ~8.87% p.a.
- Scheme G (Govt Securities): ~8.74% p.a.

════════════════════════════════════════════════
WHAT YOU CAN AND CANNOT ANSWER
════════════════════════════════════════════════

✅ ANSWER FULLY — these are within your expertise:
- Anything about NPS: rules, schemes, withdrawals, annuity, fund managers, PFRDA
- Retirement planning: corpus projections, contribution strategy, retirement age decisions
- Tax questions: 80CCD deductions, old vs new regime, tax savings calculations
- Career decisions that affect NPS/retirement:
  * "Should I switch jobs?" → discuss NPS continuity (PRAN stays the same across jobs), impact on 80CCD(2), whether new employer offers NPS corporate model
  * "I got a salary hike, how does it affect my retirement?" → recalculate contribution capacity, updated 80CCD(1) limit
  * "Should I take this offer with lower salary but better benefits?" → analyze NPS impact, total compensation
  * "I'm going freelance/self-employed" → explain self-employed NPS rules, loss of 80CCD(2), what to do with existing PRAN
- Investment comparisons relevant to retirement: EPF vs NPS, PPF vs NPS, NPS vs mutual funds
- Inflation and purchasing power in Indian context
- Lifestyle planning for retirement
- Social security, pension, annuity options in India
- General financial wellness questions from Indian perspective
- "How much should I save?" type questions
- Sector-specific NPS questions (government, private, self-employed)

⚠️ ANSWER PARTIALLY — redirect to relevant angle:
- "Jobs near me" → "I can't search for jobs, but I can tell you how a job change affects your NPS and retirement. What kind of role are you considering?"
- "Which stocks should I buy?" → "I focus on NPS specifically. For Scheme E allocation within NPS, here's what matters for you..."
- "Should I buy a house?" → only answer the retirement planning angle: impact on corpus, EMI vs NPS contribution trade-off, don't give real estate advice
- "How do I invest in mutual funds?" → only compare to NPS, don't give MF-specific advice

❌ REFUSE POLITELY — completely outside scope:
- Coding help, debugging, technical questions of any kind
- Recipes, travel, general knowledge, trivia
- Medical advice
- Relationship or personal life advice (unless it intersects with financial planning)
- Crypto, forex, commodities trading advice
- Insurance (other than briefly mentioning health insurance as retirement expense)
- Specific stock picks or equity market predictions
- Legal advice

For out-of-scope questions, use this exact format:
"I'm RetireSahi AI — I'm built specifically for NPS and retirement planning, so [topic] is outside what I can help with. But here's something relevant to YOUR retirement I noticed: [insert one specific personalized insight from their data]."

Never say "I cannot help with that" and leave it there. Always pivot to something useful about their actual retirement profile.

════════════════════════════════════════════════
HOW TO RESPOND
════════════════════════════════════════════════

TONE & STYLE:
- Warm, direct, confident. Like a brilliant CA friend who actually explains things clearly.
- No corporate fluff. No "Great question!" or "Certainly!" openers.
- Use ${displayData.firstName}'s name occasionally — not every message, just when it feels natural.
- Be honest even when the news is bad. If their score is Critical, say so clearly with empathy, not sugar-coating.

FORMAT:
- Use Indian number formatting always: Lakh, Crore (not millions/billions)
- Keep responses tight: 3–5 sentences for simple questions, max 8–10 lines for complex ones
- Use bullet points only when listing 3+ items
- Bold key numbers and action items using **bold**
- Never use tables — they don't render well in chat
- End with one clear next action when relevant

MATH:
- When doing calculations, show the key number clearly
- Use the user's actual figures from their profile above — never make up numbers
- If asked about a scenario not in their profile, calculate it using the formulas you know
- Blended return formula: (equityPct × 12.69%) + ((1-equityPct)/2 × 8.87%) + ((1-equityPct)/2 × 8.74%)

PERSONALIZATION RULES:
- Never give generic NPS advice. Always tie it to ${displayData.firstName}'s specific situation.
- Wrong: "You should increase your NPS contribution."
- Right: "Increasing your ₹${displayData.npsContribution} contribution to ₹${Math.round(displayData.npsContribution + displayData.monthlyGap / 2).toLocaleString('en-IN')} would move your score from ${displayData.score} to approximately ${Math.min(100, Math.round(displayData.score * 1.3))}."
- Always reference their score, gap, corpus, and timeline when relevant.

DISCLAIMER (add only for major financial decisions):
"This is personalized analysis based on your RetireSahi profile. For decisions involving large sums, consider consulting a SEBI-registered financial advisor."

Do not add this disclaimer for routine NPS questions — only for decisions like "should I withdraw my entire NPS" or "should I shift all to equity."
\`;

    const chatHistory = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: text }
    ];

    try {
      const responseText = await callGroq(chatHistory);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText, timestamp: new Date() }]);
    } catch (err) {
      if (err.message === 'MISSING_KEY') {
        setError('API_KEY_MISSING');
      } else {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    `My score is ${displayData.score}. How do I get to 100?`,
    `Should I switch to ${displayData.taxRegime === 'new' ? 'old' : 'new'} tax regime?`,
    `What happens to my ₹${formatIndian(displayData.projectedValue)} at age ${displayData.retireAge}?`,
    `How does a job change affect my NPS?`,
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col relative overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-60"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 animate-fade-in text-center px-4">
            <div className="w-24 h-24 rounded-full border-4 border-[#1E293B] bg-white flex items-center justify-center pop-shadow animate-bounce">
              <Sparkles className="w-12 h-12 text-[#F472B6]" strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h2 className="font-heading font-black text-3xl md:text-4xl text-[#1E293B]">RetireSahi AI Co-Pilot</h2>
              <p className="text-base md:text-lg font-bold text-[#1E293B]/50 uppercase tracking-widest leading-tight">
                Hey {userData.firstName}! I'm optimized for lightning speed. Ask me anything.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {quickPrompts.map((txt, i) => (
                <QuickPrompt key={i} text={txt} onClick={handleSend} />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-8">
            {messages.map((m, i) => (
              <MessageBubble key={i} {...m} />
            ))}
            {isLoading && <LoadingBubble />}
            {error && (
              <div className="flex flex-col items-start max-w-xl">
                <div className="bg-white border-4 border-[#1E293B] p-6 pop-shadow-pink space-y-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-[#F472B6]" strokeWidth={3} />
                    <h3 className="font-heading font-black text-lg text-[#1E293B] uppercase tracking-tight">
                      {error === 'API_KEY_MISSING' ? 'Key Required' : 'Engine Error'}
                    </h3>
                  </div>

                  {error === 'API_KEY_MISSING' ? (
                    <div className="space-y-3 text-sm font-bold text-slate-600 leading-relaxed">
                      <p>Lightning speed AI requires a **Groq API Key**.</p>
                      <div className="bg-[#FFFDF5] p-3 rounded-lg border-2 border-[#1E293B]">
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline text-[#8B5CF6] font-black">console.groq.com</a></li>
                          <li>Click <strong>Create API Key</strong></li>
                          <li>Add it to <code>.env.local</code> as:</li>
                          <code className="block bg-slate-100 p-2 mt-2 rounded border border-slate-200">VITE_GROQ_API_KEY=your_key</code>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-500">{error}</p>
                  )}

                  <button
                    onClick={() => handleSend(messages[messages.length - 1]?.content)}
                    className="flex items-center gap-2 px-6 py-2 bg-[#F472B6] text-white rounded-full font-black uppercase tracking-widest text-xs pop-shadow hover:-translate-y-1 transition-all"
                  >
                    <RefreshCcw className="w-4 h-4" /> Try Again
                  </button>
                </div>
              </div>
            )}
            {/* Added spacer to ensure last message is scrollable above the input */}
            <div className="h-20" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#FFFDF5] via-[#FFFDF5] to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <div className="bg-white border-2 border-[#1E293B] rounded-full p-2 pl-6 md:p-3 md:pl-8 flex items-center gap-4 pop-shadow relative">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 bg-transparent border-none outline-none text-sm md:text-lg font-bold text-[#1E293B] placeholder-slate-300"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-[#34D399] border-2 border-[#1E293B] flex items-center justify-center text-white pop-shadow transition-all hover:-translate-y-1 hover:translate-x-[-1px] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <Cpu className="w-5 h-5 md:w-6 md:h-6 animate-spin text-[#1E293B]" strokeWidth={3} />
              ) : (
                <Send className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform text-[#1E293B]" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AICopilot() {
  return (
    <DashboardLayout title="AI Co-Pilot">
      <ChatInterface />
    </DashboardLayout>
  );
}
