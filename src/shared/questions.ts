// GENERATED ONCE from the verified R.I.S.E.™ v2.0 engine (reference/QUESTION_BANK.csv is the audit copy).
// Do not change scoring data without a new SCORECARD_VERSION and regression review.
import type { ModuleKey, Question, Track } from './types.ts';

export const SCORECARD_VERSION = '2.0';

export const QUESTIONS: Record<Track, Question[]> = {
  financial: [
    {
      id: "f_r1", pillar: "R", weight: 1.5, na: false,
      text: "How easily can you meet essential household expenses each month?",
      tip: "Think about housing, food, utilities and essential transport.",
      options: [
      { key: "comfortable", label: "Comfortably, with room to spare", score: 100 },
      { key: "usually", label: "Usually, with occasional tight months", score: 75 },
      { key: "sometimes", label: "Sometimes struggle", score: 40 },
      { key: "often", label: "Frequently struggle", score: 15 },
      { key: "overdue", label: "Essential payments are overdue", score: 0 },
      ],
    },
    {
      id: "f_r2", pillar: "R", weight: 1.5, na: false,
      text: "How many months of essential expenses could you cover with accessible emergency funds?",
      tip: "Do not count property that cannot readily be sold.",
      options: [
      { key: "six_plus", label: "6 months or more", score: 100 },
      { key: "three_five", label: "3 to under 6 months", score: 80 },
      { key: "one_two", label: "1 to under 3 months", score: 45 },
      { key: "under_one", label: "Less than 1 month", score: 15 },
      { key: "none", label: "No accessible buffer", score: 0 },
      ],
    },
    {
      id: "f_r3", pillar: "R", weight: 1.5, na: false,
      text: "How manageable are your current debt repayments?",
      tip: "Having a mortgage does not automatically mean poor financial health.",
      options: [
      { key: "none", label: "No debt payments", score: 100 },
      { key: "easy", label: "On time and manageable", score: 85 },
      { key: "tight", label: "On time but often difficult", score: 45 },
      { key: "missed", label: "Missed repayments or in arrears", score: 0 },
      ],
    },
    {
      id: "f_r4", pillar: "R", weight: 1, na: false,
      text: "How recently have you checked that insurance or takaful matches your actual needs?",
      tip: "Coverage needs differ by circumstances; the scorecard cannot determine appropriate products.",
      options: [
      { key: "reviewed", label: "Reviewed and appears appropriate", score: 100 },
      { key: "some", label: "Some coverage but no recent review", score: 65 },
      { key: "unsure", label: "Not sure what is covered", score: 35 },
      { key: "gap", label: "I know there are important gaps", score: 15 },
      { key: "none", label: "No cover / not considered yet", score: 15 },
      ],
    },
    {
      id: "f_i1", pillar: "I", weight: 1.4, na: false,
      text: "How predictable is your household income over the coming months?",
      tip: "Pension or sustainable retirement drawdown can be reliable income.",
      options: [
      { key: "stable_diverse", label: "Reliable income from more than one source", score: 100 },
      { key: "stable_one", label: "Reliable income from one main source", score: 75 },
      { key: "variable", label: "Variable but generally sufficient", score: 55 },
      { key: "irregular", label: "Uncertain with occasional income gaps", score: 20 },
      { key: "none", label: "No reliable current income", score: 0 },
      ],
    },
    {
      id: "f_i2", pillar: "I", weight: 1.6, na: false,
      text: "What normally happens to your cash flow after essential spending and debt repayments?",
      tip: "",
      options: [
      { key: "large_surplus", label: "Save or retain a meaningful surplus most months", score: 100 },
      { key: "modest_surplus", label: "Usually some surplus", score: 75 },
      { key: "small_surplus", label: "Rarely much left over", score: 40 },
      { key: "break_even", label: "Break even", score: 15 },
      { key: "negative", label: "Often spend more than income", score: 0 },
      ],
    },
    {
      id: "f_i3", pillar: "I", weight: 1, na: false,
      text: "How resilient would your income be if your main source stopped?",
      tip: "",
      options: [
      { key: "resilient", label: "Several dependable sources or a workable backup", score: 100 },
      { key: "some", label: "A partial backup or practical alternative", score: 70 },
      { key: "limited", label: "One source and an uncertain backup", score: 35 },
      { key: "none", label: "No realistic backup identified", score: 10 },
      ],
    },
    {
      id: "f_i4", pillar: "I", weight: 1, na: true,
      text: "How clear is your plan to improve or maintain long-term earning power?",
      tip: "Retirees may mark not applicable.",
      options: [
      { key: "clear", label: "Specific plan supported by skills or investments", score: 100 },
      { key: "some", label: "Some realistic options", score: 70 },
      { key: "unclear", label: "Interested but unsure how", score: 40 },
      { key: "none", label: "No plan or options identified", score: 15 },
      { key: "na", label: "Not relevant to my current life stage", score: null },
      ],
    },
    {
      id: "f_s1", pillar: "S", weight: 1.2, na: false,
      text: "How consistently do you set money aside for long-term goals?",
      tip: "",
      options: [
      { key: "consistent", label: "Consistently with an appropriate plan", score: 100 },
      { key: "mostly", label: "Most months", score: 75 },
      { key: "sometimes", label: "Occasionally or irregularly", score: 45 },
      { key: "none", label: "Not currently saving or investing for goals", score: 10 },
      ],
    },
    {
      id: "f_s2", pillar: "S", weight: 1.3, na: false,
      text: "How diversified are your savings and investments?",
      tip: "Diversification depends on goals; no specific asset is automatically suitable.",
      options: [
      { key: "diverse", label: "Spread across suitable assets and accessible savings", score: 100 },
      { key: "some", label: "Reasonable mix with some concentration", score: 75 },
      { key: "mostly_one", label: "Mostly concentrated in one asset or business", score: 30 },
      { key: "no_assets", label: "No savings or investments yet", score: 15 },
      ],
    },
    {
      id: "f_s3", pillar: "S", weight: 1.2, na: false,
      text: "How well are your near-term goals matched with money you can access when needed?",
      tip: "",
      options: [
      { key: "matched", label: "Near-term funds are readily accessible", score: 100 },
      { key: "mostly", label: "Mostly accessible", score: 75 },
      { key: "limited", label: "Some important goals rely on selling long-term assets", score: 40 },
      { key: "illiquid", label: "Most money is locked into illiquid assets", score: 15 },
      { key: "no_plan", label: "I have not assessed this", score: 25 },
      ],
    },
    {
      id: "f_s4", pillar: "S", weight: 1.1, na: false,
      text: "How do you decide whether an investment risk is suitable for you?",
      tip: "",
      options: [
      { key: "process", label: "Use a clear risk, time-horizon and cost review", score: 100 },
      { key: "basic", label: "Understand some major risks and fees", score: 70 },
      { key: "informal", label: "Mostly rely on recommendations or past returns", score: 35 },
      { key: "no_knowledge", label: "Do not understand the main risks and fees", score: 10 },
      ],
    },
    {
      id: "f_e1", pillar: "E", weight: 1.3, na: false,
      text: "How well prepared are you for later-life income or financial independence?",
      tip: "",
      options: [
      { key: "plan", label: "A quantified plan reviewed periodically", score: 100 },
      { key: "partial", label: "Some savings and a broad target", score: 70 },
      { key: "vague", label: "A general idea, no practical calculation", score: 35 },
      { key: "none", label: "No plan yet", score: 10 },
      ],
    },
    {
      id: "f_e2", pillar: "E", weight: 1, na: true,
      text: "Are beneficiaries, estate instructions and key documents reviewed for your circumstances?",
      tip: "Estate considerations vary by personal and legal circumstances.",
      options: [
      { key: "complete", label: "Relevant arrangements documented and reviewed", score: 100 },
      { key: "partial", label: "Some arrangements exist", score: 65 },
      { key: "notdone", label: "Important arrangements not completed", score: 20 },
      { key: "unsure", label: "I am unsure what is needed", score: 30 },
      { key: "na", label: "No material assets / relevant estate arrangements at present", score: null },
      ],
    },
    {
      id: "f_e3", pillar: "E", weight: 1, na: false,
      text: "Could a trusted person locate essential financial information in an emergency?",
      tip: "",
      options: [
      { key: "ready", label: "Yes, with a safe access and contingency process", score: 100 },
      { key: "some", label: "Some information is organised", score: 70 },
      { key: "limited", label: "They would struggle to find information", score: 30 },
      { key: "none", label: "No arrangement exists", score: 10 },
      ],
    },
  ],
  career: [
    {
      id: "c_r1", pillar: "R", weight: 1.5, na: false,
      text: "How much personal financial runway do you have if your income falls during a career or business transition?",
      tip: "",
      options: [
      { key: "six_plus", label: "6 months or more", score: 100 },
      { key: "three_five", label: "3 to under 6 months", score: 75 },
      { key: "one_two", label: "1 to under 3 months", score: 40 },
      { key: "under_one", label: "Less than 1 month", score: 15 },
      { key: "none", label: "No accessible runway", score: 0 },
      ],
    },
    {
      id: "c_r2", pillar: "R", weight: 1.5, na: false,
      text: "How manageable are your current essential commitments and repayments?",
      tip: "",
      options: [
      { key: "comfortable", label: "Comfortable and up to date", score: 100 },
      { key: "manageable", label: "Manageable but requires care", score: 75 },
      { key: "strained", label: "Frequently strained", score: 35 },
      { key: "overdue", label: "Essential commitments are overdue", score: 0 },
      ],
    },
    {
      id: "c_r3", pillar: "R", weight: 1.3, na: false,
      text: "How reliable is your current income or business cash flow?",
      tip: "",
      options: [
      { key: "reliable", label: "Reliable and reasonably predictable", score: 100 },
      { key: "mostly", label: "Mostly reliable", score: 75 },
      { key: "volatile", label: "Frequently fluctuates", score: 35 },
      { key: "unreliable", label: "No dependable current income", score: 5 },
      ],
    },
    {
      id: "c_r4", pillar: "R", weight: 1.2, na: false,
      text: "How prepared are you for the financial downside of a major career move?",
      tip: "",
      options: [
      { key: "stress", label: "I have modelled costs, delays, and a backup plan", score: 100 },
      { key: "partial", label: "I have a reasonable partial backup", score: 70 },
      { key: "informal", label: "I have considered it informally", score: 35 },
      { key: "none", label: "I have no fallback plan yet", score: 10 },
      ],
    },
    {
      id: "c_i1", pillar: "I", weight: 1.3, na: false,
      text: "How clearly can you demonstrate marketable skills that can improve earnings?",
      tip: "",
      options: [
      { key: "proven", label: "Skills with a clear track record", score: 100 },
      { key: "strong", label: "Useful skills with evidence", score: 75 },
      { key: "developing", label: "Still developing relevant skills", score: 45 },
      { key: "unclear", label: "Not yet clear", score: 15 },
      ],
    },
    {
      id: "c_i2", pillar: "I", weight: 1.2, na: false,
      text: "How satisfied are you with your realistic income growth over the next 12–24 months?",
      tip: "",
      options: [
      { key: "strong", label: "Strong, realistic progression path", score: 100 },
      { key: "moderate", label: "Some credible growth opportunity", score: 75 },
      { key: "limited", label: "Limited growth without a change", score: 35 },
      { key: "stalled", label: "Stalled with no clear options", score: 10 },
      ],
    },
    {
      id: "c_i3", pillar: "I", weight: 1.2, na: false,
      text: "How clear is your preferred income or business model?",
      tip: "",
      options: [
      { key: "evaluated", label: "Compared time, costs, risks and fit", score: 100 },
      { key: "options", label: "Shortlisted and researched options", score: 75 },
      { key: "broad", label: "Some ideas without evidence yet", score: 40 },
      { key: "unclear", label: "No clear direction yet", score: 15 },
      ],
    },
    {
      id: "c_i4", pillar: "I", weight: 1.1, na: false,
      text: "How ready are you to invest time in learning, compliance and consistent execution?",
      tip: "",
      options: [
      { key: "ready", label: "Time, learning plan and expectations are realistic", score: 100 },
      { key: "mostly", label: "Mostly prepared", score: 75 },
      { key: "unsure", label: "Unsure about demands and qualifications", score: 40 },
      { key: "notready", label: "Not currently ready", score: 15 },
      ],
    },
    {
      id: "c_s1", pillar: "S", weight: 1.4, na: false,
      text: "How repeatable is your current process for producing valuable work or finding opportunities?",
      tip: "",
      options: [
      { key: "documented", label: "Documented and reliably repeatable", score: 100 },
      { key: "regular", label: "Usually consistent", score: 75 },
      { key: "ad_hoc", label: "Mostly ad hoc", score: 35 },
      { key: "none", label: "No clear process", score: 10 },
      ],
    },
    {
      id: "c_s2", pillar: "S", weight: 1.2, na: false,
      text: "How well do you track the activities and outcomes that drive your income or career progress?",
      tip: "",
      options: [
      { key: "review", label: "Track, review and improve routinely", score: 100 },
      { key: "some", label: "Track a few indicators", score: 70 },
      { key: "rare", label: "Occasionally check outcomes only", score: 35 },
      { key: "none", label: "No routine measurement", score: 10 },
      ],
    },
    {
      id: "c_s3", pillar: "S", weight: 1.2, na: false,
      text: "How consistently do you build professional relationships and future opportunities?",
      tip: "",
      options: [
      { key: "steady", label: "Deliberately and consistently", score: 100 },
      { key: "usually", label: "Most months", score: 75 },
      { key: "rarely", label: "Only when there is an immediate need", score: 40 },
      { key: "none", label: "Not currently building any", score: 15 },
      ],
    },
    {
      id: "c_s4", pillar: "S", weight: 1.2, na: false,
      text: "How well can your current way of working cope with a short break or disruption?",
      tip: "",
      options: [
      { key: "resilient", label: "Well documented with a workable backup", score: 100 },
      { key: "some", label: "Some processes or support exist", score: 70 },
      { key: "fragile", label: "Most tasks stop when I am unavailable", score: 30 },
      { key: "none", label: "No continuity arrangements", score: 10 },
      ],
    },
    {
      id: "c_e1", pillar: "E", weight: 1.2, na: false,
      text: "How confident are you in setting goals and coordinating work with others?",
      tip: "",
      options: [
      { key: "proven", label: "Consistently effective with evidence", score: 100 },
      { key: "some", label: "Some experience and results", score: 75 },
      { key: "learning", label: "Still learning the basics", score: 45 },
      { key: "none", label: "Very limited experience", score: 20 },
      ],
    },
    {
      id: "c_e2", pillar: "E", weight: 1.2, na: false,
      text: "How systematically do you document, automate or delegate repeatable tasks?",
      tip: "",
      options: [
      { key: "system", label: "Regularly with clear responsibilities", score: 100 },
      { key: "partial", label: "Some tasks have systems", score: 70 },
      { key: "manual", label: "Mostly handled manually by me", score: 35 },
      { key: "none", label: "No systems yet", score: 15 },
      ],
    },
    {
      id: "c_e3", pillar: "E", weight: 1, na: false,
      text: "How regularly do you develop others or share practical knowledge?",
      tip: "",
      options: [
      { key: "coaching", label: "Structured coaching or knowledge sharing", score: 100 },
      { key: "informal", label: "Occasional mentoring and sharing", score: 70 },
      { key: "rare", label: "Only when asked", score: 35 },
      { key: "none", label: "Not currently", score: 20 },
      ],
    },
  ],
};

export const MODULES: Record<ModuleKey, Question[]> = {
  financial_investing: [
    {
      id: "f_m_property", pillar: "S", weight: 1, na: false,
      text: "How concentrated is your investable wealth in one property, private business or investment?",
      tip: "",
      options: [
      { key: "diversified", label: "No single holding dominates", score: 100 },
      { key: "significant", label: "One holding is significant but manageable", score: 65 },
      { key: "dominates", label: "One illiquid holding dominates", score: 20 },
      { key: "unsure", label: "Not sure", score: null },
      ],
    },
    {
      id: "f_m_investliquidity", pillar: "S", weight: 1, na: false,
      text: "If you invest more money now, what happens to your accessible household reserve?",
      tip: "",
      options: [
      { key: "protected", label: "Reserve and near-term obligations remain covered", score: 100 },
      { key: "reduced", label: "Reduced but still reasonably covered", score: 65 },
      { key: "strained", label: "Would strain important commitments", score: 20 },
      { key: "essential", label: "Would require using essential funds or borrowing", score: 0 },
      ],
    },
  ],
  financial_business: [
    {
      id: "f_b_capital", pillar: "I", weight: 1, na: false,
      text: "Where would the money for a business or preschool investment come from?",
      tip: "",
      options: [
      { key: "surplus", label: "Separately available risk capital after protecting essential needs", score: 100 },
      { key: "mixed", label: "Some surplus capital plus other savings", score: 65 },
      { key: "essential", label: "Emergency or essential household money", score: 0 },
      { key: "borrow", label: "Borrowing without tested repayment capacity", score: 0 },
      { key: "unsure", label: "Not sure yet", score: null },
      ],
    },
    {
      id: "f_b_feasibility", pillar: "S", weight: 1, na: false,
      text: "How far have you assessed demand, costs, occupancy or sales, and downside scenarios?",
      tip: "",
      options: [
      { key: "tested", label: "Documented assumptions and downside tests", score: 100 },
      { key: "some", label: "Early estimates and checks", score: 65 },
      { key: "idea", label: "Idea stage only", score: 25 },
      { key: "none", label: "Not started", score: 10 },
      ],
    },
    {
      id: "f_b_operator", pillar: "E", weight: 1, na: false,
      text: "Who would handle daily operations, quality controls and reporting?",
      tip: "",
      options: [
      { key: "verified", label: "Identified experienced operator with review controls", score: 100 },
      { key: "likely", label: "Potential operator identified", score: 65 },
      { key: "self", label: "Would depend heavily on my own time", score: 30 },
      { key: "unknown", label: "Not yet considered", score: 10 },
      ],
    },
  ],
  career_industry: [
    {
      id: "c_m_authorisation", pillar: "I", weight: 1, na: false,
      text: "For unit trust / PRS activities, what is your current registration status?",
      tip: "FIMM registration and distributor authorisation need independent confirmation.",
      options: [
      { key: "registered", label: "Appropriately registered for the activity", score: 100 },
      { key: "preparing", label: "Not yet registered; researching requirements", score: 45 },
      { key: "unknown", label: "Not sure what is required", score: null },
      { key: "none", label: "Not registered", score: 15 },
      ],
    },
    {
      id: "c_m_clientfit", pillar: "S", weight: 1, na: false,
      text: "How prepared are you to assess client needs and product suitability within your permissions?",
      tip: "",
      options: [
      { key: "trained", label: "Training and compliant processes are in place", score: 100 },
      { key: "learning", label: "In training or arranging support", score: 65 },
      { key: "none", label: "No process or training yet", score: 15 },
      ],
    },
  ],
  career_switch: [
    {
      id: "c_m_switch", pillar: "R", weight: 1, na: false,
      text: "Which transition approach are you considering?",
      tip: "",
      options: [
      { key: "gradual", label: "A staged transition while protecting current income", score: 100 },
      { key: "researched", label: "A planned switch after testing the opportunity", score: 75 },
      { key: "immediate", label: "An immediate move to uncertain income", score: 15 },
      { key: "undecided", label: "Not decided", score: null },
      ],
    },
    {
      id: "c_m_offer", pillar: "I", weight: 1, na: false,
      text: "How well have you independently assessed any promised earning opportunity?",
      tip: "",
      options: [
      { key: "verified", label: "Checked actual costs, typical outcomes and obligations", score: 100 },
      { key: "some", label: "Checked some evidence", score: 60 },
      { key: "claims", label: "Mainly relying on earnings claims or testimonials", score: 15 },
      { key: "none", label: "Not assessed", score: 10 },
      ],
    },
  ],
  career_business: [
    {
      id: "c_m_unit", pillar: "S", weight: 1, na: false,
      text: "How well do you understand your business model’s unit economics (profit per client, student or sale)?",
      tip: "",
      options: [
      { key: "measured", label: "Measured including overhead and capacity", score: 100 },
      { key: "estimates", label: "Reasonable estimates", score: 65 },
      { key: "unclear", label: "Not yet clear", score: 20 },
      ],
    },
    {
      id: "c_m_team", pillar: "E", weight: 1, na: false,
      text: "What happens to delivery when you take two weeks away?",
      tip: "",
      options: [
      { key: "continues", label: "Systems and people can maintain standards", score: 100 },
      { key: "partial", label: "Some work continues", score: 60 },
      { key: "stops", label: "Most activity stops", score: 15 },
      ],
    },
  ],
};
