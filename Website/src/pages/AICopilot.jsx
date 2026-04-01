import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles, Send, AlertCircle, RefreshCcw, ExternalLink, Cpu
} from 'lucide-react';
import {
  formatIndian,
  calculateRetirement,
  getScoreBand
} from '../utils/math';
import DashboardLayout from '../components/DashboardLayout';
import { useUser } from '../components/UserContext';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AIPrivacyChoice from '../components/AIPrivacyChoice';
import { GROQ_PRIVACY_MODE_FIELDS, GROQ_FULL_MODE_FIELDS } from '../utils/encryption';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b"; // Updated to high-capacity model

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
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to call AI');
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
  const { userData, setUserData } = useUser();
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

  const displayData = useMemo(() => {
    if (!userData) return null;
    const merged = { ...userData, ...calculateRetirement(userData) };
    if (!merged.lumpSumCorpus) merged.lumpSumCorpus = merged.projectedValue * 0.6;
    if (!merged.monthlyAnnuityIncome) merged.monthlyAnnuityIncome = (merged.projectedValue * 0.4 * 0.06) / 12;
    if (!merged.blendedReturn) {
      const eq = (merged.npsEquity || 50) / 100;
      merged.blendedReturn = (eq * 0.1269) + ((1 - eq) / 2 * 0.0887) + ((1 - eq) / 2 * 0.0874);
    }
    return merged;
  }, [userData]);

  const handlePrivacySelect = useCallback(async (mode) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    await setDoc(
      doc(db, 'users', currentUser.uid),
      { aiPrivacyMode: mode, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    setUserData((prev) => ({ ...(prev || {}), aiPrivacyMode: mode }));
  }, [setUserData]);

  const privacyMode = userData?.aiPrivacyMode || 'privacy';
  const isFullMode = privacyMode === 'full';

  const quickPrompts = displayData
    ? [
      `My score is ${displayData.score}. How do I get to 100?`,
      `Should I switch to ${displayData.taxRegime === 'new' ? 'old' : 'new'} tax regime?`,
      `What happens to my \u20B9${formatIndian(displayData.projectedValue)} at age ${displayData.retireAge}?`,
      `How does a job change affect my NPS?`,
    ]
    : [
      "How do I improve my retirement score?",
      "Should I switch tax regimes?",
      "What happens to my NPS at 60?",
      "How does a job change affect my NPS?",
    ];

  const handleSend = useCallback(async (content) => {
    if (!displayData) return;
    const text = typeof content === 'string' ? content : inputValue;
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const scoreBandInfo = getScoreBand(displayData.score);
    const scoreBand = scoreBandInfo.label;

    const maxEquityPct = displayData.age < 50
      ? 75
      : Math.max(50, 75 - (displayData.age - 50) * 2.5);

    const yearsToRetire = displayData.retireAge - displayData.age;
    const annualIncome = (Number(displayData.monthlyIncome) || 0) * 12;
    const basicSalary = annualIncome * (displayData.workContext === 'Government' ? 0.50 : 0.40);

    const selectedFields = isFullMode ? GROQ_FULL_MODE_FIELDS : GROQ_PRIVACY_MODE_FIELDS;
    const selectedProfile = Object.fromEntries(
      selectedFields.map((field) => [field, displayData[field]])
    );

    const computedContext = `
RETIREMENT INSIGHTS (computed from encrypted data):
- Score: ${displayData.score}/100 (${scoreBand})
- Monthly gap to close: ${formatIndian(displayData.monthlyGap)}/month
- Projected corpus at ${displayData.retireAge}: ${formatIndian(displayData.projectedValue)}
- Required corpus: ${formatIndian(displayData.requiredCorpus)}
- Retirement gap: ${formatIndian(displayData.gap)}
- Monthly need at retirement: ${formatIndian(displayData.monthlySpendAtRetirement)}
- Lump sum at ${displayData.retireAge}: ${formatIndian(displayData.lumpSumCorpus)}
- Monthly annuity pension: ${formatIndian(displayData.monthlyAnnuityIncome)}
- Blended return: ${((displayData.blendedReturn || 0) * 100).toFixed(2)}%
`;

    const rawContext = isFullMode
      ? `
RAW FINANCIAL PROFILE (user consented to share):
- Monthly income: ₹${Number(displayData.monthlyIncome || 0).toLocaleString('en-IN')}
- Monthly NPS contribution: ₹${Number(displayData.npsContribution || 0).toLocaleString('en-IN')}
- Current NPS corpus: ₹${Number(displayData.npsCorpus || 0).toLocaleString('en-IN')}
- Other savings: ₹${Number(displayData.totalSavings || 0).toLocaleString('en-IN')}
`
      : `
NOTE: User is in Privacy Mode. Do NOT ask for or reference specific
income/corpus/contribution amounts. Use only the computed insights above.
When giving contribution advice, say amounts like "increase by Rs18K/month"
not "increase from RsX to RsY" since you do not know the base amount.
`;

    const systemPrompt = `
You are RetireSahi AI — a financial co-pilot for Indian NPS subscribers.
You are speaking with ${displayData.firstName}.
Privacy mode: ${privacyMode.toUpperCase()}

PROFILE:
- Age: ${displayData.age} | Retiring at: ${displayData.retireAge}
- Years to retire: ${yearsToRetire}
- Sector: ${displayData.workContext}
- Lifestyle: ${displayData.lifestyle}
- Tax regime: ${displayData.taxRegime || 'New Regime'}
- Equity allocation: ${displayData.npsEquity}%
- Max equity cap by age: ${maxEquityPct}%
${isFullMode ? `- Estimated annual income: ₹${annualIncome.toLocaleString('en-IN')}` : ''}
${isFullMode ? `- Estimated basic salary: ₹${basicSalary.toLocaleString('en-IN')}` : ''}

SELECTED PROFILE FIELDS:
${JSON.stringify(selectedProfile)}

${computedContext}
${rawContext}

NPS RULES: equity cap max 75% under 50 tapering 2.5%/year to 50% at 60.
At 60: 40% annuitized minimum 60% lump sum tax-free.
80CCD(1) old regime only 10% basic private 14% govt max 1.5L.
80CCD(1B) old regime only extra 50000. 80CCD(2) both regimes.
New regime 87A rebate zero tax if income under 12L.

SCOPE: Answer NPS retirement tax career-affecting-NPS questions only.
For off-topic questions pivot to one insight from their profile.
Never answer coding recipes stocks crypto medical legal questions.

STYLE: Warm direct concise. Use Indian formatting Lakh Crore.
Always use ${displayData.firstName}'s actual computed numbers.
3-5 sentences for simple questions max 8-10 lines for complex.
`;

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
  }, [displayData, inputValue, messages, privacyMode, isFullMode]);

  useEffect(() => {
    if (userData && location.state?.initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      const prompt = location.state.initialPrompt;
      // Clear location state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
      handleSend(prompt);
    }
  }, [userData, location.state, handleSend]);

  if (!userData) return null;

  if (userData.aiPrivacyMode === undefined || userData.aiPrivacyMode === null) {
    return <AIPrivacyChoice onSelect={handlePrivacySelect} firstName={userData.firstName} />;
  }

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
                    <p className="text-sm font-bold text-[#1E293B] uppercase tracking-widest">Houston, we have a problem</p>
                  </div>

                  {error === 'API_KEY_MISSING' ? (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-[#1E293B]/70 leading-relaxed">
                        The Groq API key is missing. Please add <code className="bg-slate-100 px-1 rounded">VITE_GROQ_API_KEY</code> to your environment variables.
                      </p>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8B5CF6] hover:underline"
                      >
                        Get a free key here <ExternalLink className="w-3 h-3" />
                      </a>
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
