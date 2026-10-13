// GENERATED from the R.I.S.E.™ V4.3 engine (tests/reference/engine.v43.cjs). reference/QUESTION_BANK_V4_3.csv is the audit copy.
// Do not change scoring data without a new SCORECARD_VERSION and regression review.
import type { ModuleKey, Question, Track } from './types.ts';

export const SCORECARD_VERSION = '4.3';

/** Questions whose answer may hold several option keys joined by "|". They carry no score. */
export const MULTI_SELECT_IDS: readonly string[] = ['f_policy_types', 'f_savings_place'];
/** Options that cannot be combined with any other choice in a multi-select question. */
export const EXCLUSIVE_KEYS: readonly string[] = ['none', 'unsure', 'unknown', 'na'];

export const QUESTIONS: Record<Track, Question[]> = {
  financial: [
    {
      id: "f_r1", pillar: "R", weight: 1.5, na: false,
      text: "After paying for food, housing and basic bills, how manageable is your month?",
      tip: "Think about housing, food, utilities and essential transport.",
      options: [
      { key: "comfortable", label: "I can pay them easily and still have money left", score: 100 },
      { key: "usually", label: "I can pay them, but some months are tight", score: 75 },
      { key: "sometimes", label: "I sometimes struggle to pay them", score: 40 },
      { key: "often", label: "I often struggle to pay them", score: 15 },
      { key: "overdue", label: "I am behind on essential bills", score: 0 },
      ],
    },
    {
      id: "f_r2", pillar: "R", weight: 1.5, na: false,
      text: "If your income stopped today, how long could your savings cover your basic bills?",
      tip: "Think about rent, food, bills and loan payments. Count money you could use quickly, not property or locked savings.",
      options: [
      { key: "six_plus", label: "6 months or more", score: 100 },
      { key: "three_five", label: "3–5 months", score: 80 },
      { key: "one_two", label: "1–2 months", score: 45 },
      { key: "under_one", label: "Less than 1 month", score: 15 },
      { key: "none", label: "No savings I can use quickly", score: 0 },
      { key: "unsure", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_r3", pillar: "R", weight: 1.5, na: false,
      text: "Are you able to pay your loans and debts every month?",
      tip: "Having a mortgage does not automatically mean poor financial health.",
      options: [
      { key: "none", label: "No debt payments", score: 100 },
      { key: "easy", label: "I pay on time without much difficulty", score: 85 },
      { key: "tight", label: "I pay on time, but it is difficult", score: 45 },
      { key: "missed", label: "I have missed or fallen behind on payments", score: 0 },
      ],
    },
    {
      id: "f_r4", pillar: "R", weight: 1, na: false,
      text: "Do you have insurance now?",
      tip: "For example, a medical card, life insurance, personal accident insurance or insurance provided by your employer.",
      options: [
      { key: "yes", label: "Yes, I have insurance", score: 80 },
      { key: "none", label: "No, I do not have insurance", score: 45 },
      { key: "unknown", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_policy_types", pillar: "R", weight: 0, na: false,
      text: "Which types of insurance do you have? Select all that apply.",
      tip: "You can select more than one. For example, you may have a medical card, life insurance and company medical coverage.",
      options: [
      { key: "medical", label: "Medical card or hospital insurance", score: null },
      { key: "life", label: "Life insurance (money paid if you pass away)", score: null },
      { key: "critical", label: "Critical illness insurance (payout for certain serious illnesses)", score: null },
      { key: "accident", label: "Personal accident insurance", score: null },
      { key: "employer", label: "Medical or other insurance from my employer", score: null },
      { key: "other", label: "Another type of insurance", score: null },
      { key: "unsure", label: "I have insurance but do not know the type", score: null },
      { key: "none", label: "Actually, I do not have insurance", score: null },
      ],
    },
    {
      id: "f_policy_review", pillar: "R", weight: 0, na: false,
      text: "Have you checked whether your insurance fits your needs?",
      tip: "Knowing you have insurance is different from knowing what it covers. You do not need to know exact amounts to answer.",
      options: [
      { key: "yes", label: "Yes, I have checked it", score: null },
      { key: "maybe", label: "I think so, but I am not sure", score: null },
      { key: "no", label: "I may need to review it", score: null },
      { key: "notyet", label: "I have not checked yet", score: null },
      { key: "unknown", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_has_savings", pillar: "R", weight: 0, na: false,
      text: "Do you currently have any money saved?",
      tip: "Savings can be in a bank account or somewhere else. This is not the same as emergency money.",
      options: [
      { key: "regular", label: "Yes, I save money regularly", score: null },
      { key: "sometimes", label: "Yes, I save when I can", score: null },
      { key: "existing", label: "I have savings but I am not adding more now", score: null },
      { key: "none", label: "No savings right now", score: null },
      { key: "unsure", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_savings_place", pillar: "R", weight: 0, na: false,
      text: "Where do you keep money you have saved? Select all that apply.",
      tip: "Choose every place that applies. EPF and some investments may not be easy to use in an emergency.",
      options: [
      { key: "bank", label: "Bank savings or current account", score: null },
      { key: "fixed", label: "Fixed deposit", score: null },
      { key: "cash", label: "Cash at home", score: null },
      { key: "asm", label: "ASB, ASM or similar funds", score: null },
      { key: "invest", label: "Unit trust, shares or other investments", score: null },
      { key: "epf", label: "EPF / KWSP (retirement savings)", score: null },
      { key: "other", label: "Another place not listed here", score: null },
      { key: "unsure", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_i1", pillar: "I", weight: 1.4, na: false,
      text: "Can you depend on your income each month?",
      tip: "Pension or sustainable retirement drawdown can be reliable income.",
      options: [
      { key: "stable_diverse", label: "Yes, from more than one source", score: 100 },
      { key: "stable_one", label: "Yes, from one main source", score: 75 },
      { key: "variable", label: "It changes but usually covers my needs", score: 55 },
      { key: "irregular", label: "It is uncertain and sometimes falls short", score: 20 },
      { key: "none", label: "I do not have a reliable income now", score: 0 },
      ],
    },
    {
      id: "f_i2", pillar: "I", weight: 1.6, na: false,
      text: "After paying your basic bills and loans, how much money is usually left?",
      tip: "",
      options: [
      { key: "large_surplus", label: "I have plenty left over most months", score: 100 },
      { key: "modest_surplus", label: "I usually have some money left", score: 75 },
      { key: "small_surplus", label: "I usually have very little left", score: 40 },
      { key: "break_even", label: "My money just covers my bills", score: 15 },
      { key: "negative", label: "I often spend more than I earn", score: 0 },
      ],
    },
    {
      id: "f_i3", pillar: "I", weight: 1, na: false,
      text: "If your main income stopped, do you have another way to earn money?",
      tip: "",
      options: [
      { key: "resilient", label: "Yes, I have reliable backup income", score: 100 },
      { key: "some", label: "I have a possible backup", score: 70 },
      { key: "limited", label: "I mainly rely on one income", score: 35 },
      { key: "none", label: "No, I have not found a backup yet", score: 10 },
      ],
    },
    {
      id: "f_i4", pillar: "I", weight: 1, na: true,
      text: "Do you have a practical plan for your income in the next year?",
      tip: "Retirees may mark not applicable.",
      options: [
      { key: "clear", label: "Yes, I have a clear plan I can follow", score: 100 },
      { key: "some", label: "I have a few realistic ideas", score: 70 },
      { key: "unclear", label: "I want to, but I do not know how yet", score: 40 },
      { key: "none", label: "I have no plan at the moment", score: 15 },
      { key: "na", label: "Not relevant to my current life stage", score: null },
      ],
    },
    {
      id: "f_s1", pillar: "S", weight: 1.2, na: true,
      text: "Are you setting aside money for future goals?",
      tip: "This is about money for future goals, not only money for emergencies.",
      options: [
      { key: "consistent", label: "Yes, every month with a plan", score: 100 },
      { key: "mostly", label: "Most months", score: 75 },
      { key: "sometimes", label: "Only when I have extra money", score: 45 },
      { key: "none", label: "Not at the moment", score: 10 },
      { key: "existing", label: "I have saved money, but cannot add more right now", score: 55 },
      { key: "na", label: "I am now using my savings (for example, in retirement)", score: null },
      ],
    },
    {
      id: "f_s2", pillar: "S", weight: 1.3, na: true,
      text: "If you invest, is most of your investment money tied to just one investment?",
      tip: "This includes property, shares and funds. Having savings in just one bank account does not automatically mean your investments are risky.",
      options: [
      { key: "diverse", label: "No, I have different investments", score: 100 },
      { key: "some", label: "I have a few investments, but one is quite large", score: 75 },
      { key: "mostly_one", label: "Yes, most is in one investment or business", score: 30 },
      { key: "no_assets", label: "I do not have investments yet", score: null },
      { key: "unsure", label: "I am not sure", score: null },
      ],
    },
    {
      id: "f_s3", pillar: "S", weight: 1.2, na: false,
      text: "If you needed money for a planned expense in the next 1–3 years, could you get it easily?",
      tip: "",
      options: [
      { key: "matched", label: "Yes, I can get the money when I need it", score: 100 },
      { key: "mostly", label: "I can get most of it", score: 75 },
      { key: "limited", label: "I may need to sell an investment to get it", score: 40 },
      { key: "illiquid", label: "Most of it is hard to access quickly", score: 15 },
      { key: "no_plan", label: "I am not sure", score: 25 },
      ],
    },
    {
      id: "f_s4", pillar: "S", weight: 1.1, na: true,
      text: "When considering an investment, do you check the risks, costs and when you can get your money back?",
      tip: "If you have not started investing, choose the last option. It will not lower this part of your score.",
      options: [
      { key: "process", label: "Yes, I check these before deciding", score: 100 },
      { key: "basic", label: "I check some of them", score: 70 },
      { key: "informal", label: "I usually rely on what other people tell me", score: 35 },
      { key: "no_knowledge", label: "I do not really understand the risks or costs", score: 10 },
      { key: "na", label: "I have not looked into investing yet", score: null },
      ],
    },
    {
      id: "f_e1", pillar: "E", weight: 1.3, na: false,
      text: "Have you planned how to support yourself when you work less or retire?",
      tip: "",
      options: [
      { key: "plan", label: "Yes, I have worked out the numbers and review them", score: 100 },
      { key: "partial", label: "I have some savings and a rough target", score: 70 },
      { key: "vague", label: "I have an idea but have not worked out the money", score: 35 },
      { key: "none", label: "No plan yet", score: 10 },
      ],
    },
    {
      id: "f_e2", pillar: "E", weight: 1, na: true,
      text: "Have you organised the money and family records you may need later?",
      tip: "For example: insurance policies, bank and loan information, EPF / KWSP details and a will or nomination if relevant. Do not upload documents here.",
      options: [
      { key: "complete", label: "Yes, I know where my records are and have checked them", score: 100 },
      { key: "partial", label: "Some records are organised, but not everything", score: 65 },
      { key: "notdone", label: "My records are not organised yet", score: 20 },
      { key: "unsure", label: "I am not sure which records are useful", score: null },
      { key: "na", label: "Not relevant to me right now", score: null },
      ],
    },
    {
      id: "f_e3", pillar: "E", weight: 1, na: false,
      text: "If you were unavailable, would someone you trust know where your insurance and money records are kept?",
      tip: "This means the location of insurance policies, bank or loan records and emergency contacts. You should never share passwords in this tool.",
      options: [
      { key: "ready", label: "Yes, they know where to find the records safely", score: 100 },
      { key: "some", label: "They could find some of the records", score: 70 },
      { key: "limited", label: "They would probably have difficulty", score: 30 },
      { key: "none", label: "No, I have not shown anyone where they are", score: 10 },
      ],
    },
  ],
  career: [
    {
      id: "c_r1", pillar: "R", weight: 1.5, na: false,
      text: "If your work income fell, how long could your savings cover your basic bills?",
      tip: "",
      options: [
      { key: "six_plus", label: "6 months or more", score: 100 },
      { key: "three_five", label: "3–5 months", score: 75 },
      { key: "one_two", label: "1–2 months", score: 40 },
      { key: "under_one", label: "Less than 1 month", score: 15 },
      { key: "none", label: "No savings I can use", score: 0 },
      ],
    },
    {
      id: "c_r2", pillar: "R", weight: 1.5, na: false,
      text: "Can you pay your basic bills and loans each month?",
      tip: "",
      options: [
      { key: "comfortable", label: "I pay everything on time easily", score: 100 },
      { key: "manageable", label: "I can pay, but must be careful", score: 75 },
      { key: "strained", label: "I often struggle with my payments", score: 35 },
      { key: "overdue", label: "I am behind on important payments", score: 0 },
      ],
    },
    {
      id: "c_r3", pillar: "R", weight: 1.3, na: false,
      text: "Does your work or business bring in money regularly?",
      tip: "",
      options: [
      { key: "reliable", label: "Yes, it is steady", score: 100 },
      { key: "mostly", label: "It is steady most months", score: 75 },
      { key: "volatile", label: "It changes a lot from month to month", score: 35 },
      { key: "unreliable", label: "No regular income at the moment", score: 5 },
      ],
    },
    {
      id: "c_r4", pillar: "R", weight: 1.2, na: false,
      text: "Have you planned how to pay your bills if a new career pays less at first?",
      tip: "",
      options: [
      { key: "stress", label: "Yes, I have worked out costs and a backup plan", score: 100 },
      { key: "partial", label: "I have some money set aside", score: 70 },
      { key: "informal", label: "I have thought about it but not made a plan", score: 35 },
      { key: "none", label: "No, I do not have a backup plan yet", score: 10 },
      ],
    },
    {
      id: "c_i1", pillar: "I", weight: 1.3, na: false,
      text: "Do you have skills that could help you earn more?",
      tip: "",
      options: [
      { key: "proven", label: "Yes, I have used them successfully", score: 100 },
      { key: "strong", label: "Yes, I have some useful skills", score: 75 },
      { key: "developing", label: "I am still learning useful skills", score: 45 },
      { key: "unclear", label: "I am not sure what skills I could use", score: 15 },
      ],
    },
    {
      id: "c_i2", pillar: "I", weight: 1.2, na: false,
      text: "Are you happy with how your income could grow in the next 1–2 years?",
      tip: "",
      options: [
      { key: "strong", label: "Yes, I have a clear way to grow", score: 100 },
      { key: "moderate", label: "I see some chances to earn more", score: 75 },
      { key: "limited", label: "Not much unless something changes", score: 35 },
      { key: "stalled", label: "I do not see a clear way to grow", score: 10 },
      ],
    },
    {
      id: "c_i3", pillar: "I", weight: 1.2, na: false,
      text: "Have you explored ways to grow your earnings in your current work or another role?",
      tip: "",
      options: [
      { key: "evaluated", label: "Yes, I have compared the options carefully", score: 100 },
      { key: "options", label: "I have looked into a few options", score: 75 },
      { key: "broad", label: "I have ideas but have not checked them", score: 40 },
      { key: "unclear", label: "I am not sure yet", score: 15 },
      ],
    },
    {
      id: "c_i4", pillar: "I", weight: 1.1, na: false,
      text: "Do you have time to learn new skills or prepare for a different role?",
      tip: "",
      options: [
      { key: "ready", label: "I have time and a realistic learning plan", score: 100 },
      { key: "mostly", label: "I am mostly ready", score: 75 },
      { key: "unsure", label: "I am not sure what is required", score: 40 },
      { key: "notready", label: "I am not ready yet", score: 15 },
      ],
    },
    {
      id: "c_s1", pillar: "S", weight: 1.4, na: false,
      text: "Do you have a reliable way to find work, customers or career opportunities?",
      tip: "",
      options: [
      { key: "documented", label: "Yes, I follow a process that works", score: 100 },
      { key: "regular", label: "I have a fairly regular way", score: 75 },
      { key: "ad_hoc", label: "I do things differently each time", score: 35 },
      { key: "none", label: "I do not have a process", score: 10 },
      ],
    },
    {
      id: "c_s2", pillar: "S", weight: 1.2, na: false,
      text: "Do you track the work that helps you earn or progress?",
      tip: "",
      options: [
      { key: "review", label: "Yes, I track and review regularly", score: 100 },
      { key: "some", label: "I track a few things", score: 70 },
      { key: "rare", label: "I check results once in a while", score: 35 },
      { key: "none", label: "I do not track my progress yet", score: 10 },
      ],
    },
    {
      id: "c_s3", pillar: "S", weight: 1.2, na: false,
      text: "Do you keep in touch with people who may help you grow your career?",
      tip: "",
      options: [
      { key: "steady", label: "I regularly keep in touch", score: 100 },
      { key: "usually", label: "Most months", score: 75 },
      { key: "rarely", label: "Only when I need something", score: 40 },
      { key: "none", label: "I am not building new connections", score: 15 },
      ],
    },
    {
      id: "c_s4", pillar: "S", weight: 1.2, na: false,
      text: "Could your team or business keep things running if you were away for two weeks?",
      tip: "",
      options: [
      { key: "resilient", label: "Yes, I have a good backup system", score: 100 },
      { key: "some", label: "Some work could continue", score: 70 },
      { key: "fragile", label: "A lot of work stops without me", score: 30 },
      { key: "none", label: "No, I have not prepared for this", score: 10 },
      ],
    },
    {
      id: "c_e1", pillar: "E", weight: 1.2, na: true,
      text: "If you lead people, are you comfortable setting goals and supporting your team?",
      tip: "",
      options: [
      { key: "proven", label: "Yes, I do this well", score: 100 },
      { key: "some", label: "I have some experience", score: 75 },
      { key: "learning", label: "I am still learning", score: 45 },
      { key: "none", label: "I have little experience", score: 20 },
      { key: "na", label: "Not part of my job right now", score: null },
      ],
    },
    {
      id: "c_e2", pillar: "E", weight: 1.2, na: true,
      text: "Does your team have simple written steps for tasks done often?",
      tip: "",
      options: [
      { key: "system", label: "Yes, our team has clear steps and responsibilities", score: 100 },
      { key: "partial", label: "Some tasks have written steps", score: 70 },
      { key: "manual", label: "I still do most things myself", score: 35 },
      { key: "none", label: "I have no written processes yet", score: 15 },
      { key: "na", label: "Not part of my job right now", score: null },
      ],
    },
    {
      id: "c_e3", pillar: "E", weight: 1, na: true,
      text: "Do you regularly help your team learn or improve at work?",
      tip: "",
      options: [
      { key: "coaching", label: "Yes, I regularly train or coach others", score: 100 },
      { key: "informal", label: "I sometimes help others learn", score: 70 },
      { key: "rare", label: "Only when someone asks me", score: 35 },
      { key: "none", label: "Not at the moment", score: 20 },
      { key: "na", label: "Not part of my job right now", score: null },
      ],
    },
  ],
};

export const MODULES: Record<ModuleKey, Question[]> = {
  financial_investing: [
    {
      id: "f_m_property", pillar: "S", weight: 1, na: false,
      text: "Is a large share of your savings and investments tied to just one property, business or investment?",
      tip: "",
      options: [
      { key: "diversified", label: "No single holding dominates", score: 100 },
      { key: "significant", label: "One holding is significant but manageable", score: 65 },
      { key: "dominates", label: "Yes, most of my invested money is in one place", score: 20 },
      { key: "unsure", label: "I am not sure", score: null },
      { key: "no_assets", label: "I do not have investments yet", score: null },
      ],
    },
    {
      id: "f_m_investliquidity", pillar: "S", weight: 1, na: false,
      text: "If you invested more money today, would you still have enough cash for your regular bills and emergencies?",
      tip: "",
      options: [
      { key: "protected", label: "Reserve and near-term obligations remain covered", score: 100 },
      { key: "reduced", label: "Reduced but still reasonably covered", score: 65 },
      { key: "strained", label: "Would strain important commitments", score: 20 },
      { key: "essential", label: "I would need money meant for bills or emergencies, or have to borrow", score: 0 },
      { key: "na", label: "I am not planning to invest more right now", score: null },
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
};
