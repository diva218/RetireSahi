# RetireSahi

RetireSahi is a retirement intelligence product for Indian NPS subscribers. The website combines guided onboarding, a live retirement readiness dashboard, a custom lifestyle planning engine, an AI co-pilot, and transparent methodology pages into one continuous experience.

This document describes what is already built and live in the product experience.

## Website Features Built Today

| Feature Area | What It Delivers |
|---|---|
| Landing Experience | Product overview, value communication, secure entry points, and direct navigation into the app flow |
| Authentication | Email/password login, Google sign-in, and protected route access for user-specific pages |
| Guided Onboarding | Multi-step profile capture for age, income, retirement mode, savings inputs, and lifestyle direction |
| Dashboard | Real-time retirement readiness score, projected corpus, required corpus, gap visualization, milestones, and decision scenarios |
| Dream Planner | Preset and custom retirement lifestyle design with category-level monthly amounts and score impact simulation |
| AI Co-Pilot | Context-aware retirement Q&A with streaming responses, markdown output, and privacy-aware data modes |
| Learn Center | Structured NPS education content across basics, tax, retirement, and rule frameworks |
| Methodology | Transparent formulas, return assumptions, tax logic, and data-source references |
| Settings and Controls | Profile editing, scheme-level assumptions, retirement preferences, AI mode controls, data export, and account deletion |
| Tax Shield Module Entry | Dedicated route and dashboard entry point for the tax workspace |

## Feature Walkthrough

### 1. Landing and Entry Flow
- The landing page introduces the product story, readiness score concept, and the main value pillars.
- Calls-to-action route users into authenticated flows or educational surfaces.
- The page is responsive and aligned with the same visual system used in the product shell.

### 2. Authentication and Session Access
- Authentication is integrated with Firebase Auth.
- Signed-in users are routed to protected pages through route guards.
- Signed-out users are redirected to public entry routes.

### 3. Guided Onboarding
- The onboarding experience captures foundational retirement inputs in a structured sequence.
- Inputs include personal profile fields, retirement strategy mode, income, contribution data, and lifestyle direction.
- On submit, the system computes retirement metrics and persists the user profile for dashboard use.

### 4. Dashboard Intelligence
- The dashboard renders a Retirement Readiness Score from current profile inputs.
- It shows projected value, required corpus, monthly gap, annuity split, and pension-oriented outputs.
- Users see quick stats for savings composition, time horizon, and contribution pulse.
- The interface includes scenario cards for decision testing and a guided tour overlay for first-use orientation.

### 5. Simulation and What-If Behavior
- A simulator panel lets users test changes such as contribution amounts, retirement age, and allocation.
- Score and corpus metrics update against the same calculation engine used in core views.
- Users can apply simulation outcomes back to their baseline profile.

### 6. Wealth Milestones
- The dashboard computes dynamic milestone ages for corpus targets across the retirement journey.
- Milestone progress is displayed in a timeline-style visual strip for quick planning context.

### 7. Dream Planner
- Dream Planner supports preset lifestyle paths and fully custom planning.
- In custom mode, users set rupee amounts per lifestyle category instead of abstract percentages.
- The system derives category mix, monthly retirement spend assumptions, and score impact from those amounts.
- Saving from this page updates the active profile used across the app.

### 8. AI Co-Pilot
- The AI Co-Pilot is integrated into the authenticated dashboard shell.
- It streams answers in real time and supports markdown-rich responses for readability.
- The chat uses profile context to answer retirement-specific questions.
- The interface provides immediate assistant feedback while waiting, then transitions into streamed output.

### 9. Learn Center
- The Learn page is a structured education surface with expandable content blocks.
- Sections cover NPS basics, tax and savings concepts, retirement rules, and contribution boundaries.
- Sticky section navigation and active-section tracking support long-form reading.

### 10. Methodology Transparency
- Methodology documents return assumptions, blended return math, corpus projection formulas, and score computation.
- Tax methodology includes slab references and deduction framework treatment used in product logic.
- Data-source references and disclaimer language are included directly in the page.

### 11. Settings and Account Controls
- Users can edit profile identity, retirement mode, income and contribution inputs, and retirement goals.
- Scheme-level contribution assumptions and advanced return assumptions are editable.
- AI data mode can be switched directly from settings.
- Account controls include JSON export and permanent account deletion.

### 12. Tax Shield Route Surface
- A dedicated Tax Shield route is available in navigation and dashboard entry surfaces.
- This keeps the tax workflow discoverable from the same app shell and user context.

## Security and Trust Model

### Identity and Access
- User identity and session handling run through Firebase Auth.
- Protected routes prevent unauthorized access to profile-driven pages.

### Data Storage Layer
- Firestore is the primary website database for user profile and planning state.
- Profile reads and writes are centralized through authenticated user document flows.

### Sensitive Data Handling
- Sensitive financial fields are encrypted via Web Crypto (AES-GCM) before Firestore persistence.
- Decryption is performed in the user context for in-app calculations and rendering.

### AI Privacy Controls
- The AI experience supports privacy-aware field sharing modes.
- Privacy mode limits model context to non-sensitive computed insights.
- Full mode allows broader profile context for more detailed AI guidance.

### User Data Control
- Users can export their data snapshot as JSON.
- Users can permanently delete their account and profile data from settings.

## Technology Powering the Website

| Layer | Technology | Role in Product |
|---|---|---|
| Frontend Runtime | React 19 + Vite 8 | Fast interactive SPA with route-level loading and modern build pipeline |
| UI System | Tailwind CSS 4 + Lucide React | Consistent design language and icon system across desktop and mobile |
| Routing | React Router | Public and protected navigation structure for all key workflows |
| Authentication | Firebase Auth | Identity, session state, and guarded user access |
| Database | Firebase Firestore | Persistent storage for user profile, calculations, and preferences |
| Encryption Layer | Web Crypto via in-app utilities | Client-side protection for sensitive financial fields |
| AI UI Stack | Streaming chat + markdown renderer | Real-time retirement assistant responses in readable format |
| Analytics | Vercel Analytics | Product usage measurement in production |
| Hosting and Delivery | Vercel | Production deployment platform for the website |

## Repository Surfaces

- `Website/`: React website experience described in this README.
- `App/`: Flutter mobile app codebase.
- `App/backend/`: Python FastAPI backend and knowledge-processing services.

The website is the primary product surface for the feature set documented above.
