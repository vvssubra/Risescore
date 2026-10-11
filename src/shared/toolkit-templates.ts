// The 14 original educational worksheet templates (verbatim from the v3 prototype).
// Educational prompts only: not personalised regulated advice, no product recommendations.
// These are the built-in interactive worksheets; admins may attach reviewed PDFs to each.
import type { PillarKey, Track } from './types.ts';

export type WorksheetSection = [step: string, prompt: string];

export interface ToolkitTemplate {
  id: string;
  title: string;
  sub: string;
  track: Track | 'both';
  pillar: PillarKey;
  minutes: string;
  sections: WorksheetSection[];
}

/** Safe default shown when nothing else can be matched. Must never be removed from the built-ins. */
export const FALLBACK_TOOLKIT_ID = 'complete-your-snapshot';

export const TOOLKIT_TEMPLATES: ToolkitTemplate[] = [
  {
    id: "complete-your-snapshot", title: "Complete Your R.I.S.E.™ Snapshot",
    sub: "A short checklist for questions you could not answer yet.",
    track: "both", pillar: "R", minutes: "10 min",
    sections: [
      ["Understand", "Which questions were difficult to answer, and why?"],
      ["Define", "Choose the most important missing piece of information to clarify."],
      ["Consider", "Identify where you can find reliable statements, records or advice."],
      ["Act", "Gather the missing information without disclosing confidential data in the worksheet."],
      ["Review", "Retake your assessment when enough information is available for a meaningful comparison."],
    ],
  },
  {
    id: "financial-reset", title: "30-Day Financial Reset",
    sub: "Make essential spending, debt commitments and emergency reserves visible.",
    track: "financial", pillar: "R", minutes: "15–20 min",
    sections: [
      ["Understand", "Write down monthly take-home income, essential costs, debt minimums and accessible savings."],
      ["Define", "Choose one priority: catch up on essentials, understand debts, or strengthen a small emergency buffer."],
      ["Consider", "Which commitments have deadlines? Where can you contact a creditor early rather than miss a payment?"],
      ["Act", "Write one achievable action and the date you will complete it."],
      ["Review", "Check the change after 30 days; update your numbers without judging yourself."],
    ],
  },
  {
    id: "family-protection", title: "Family Protection Review Checklist",
    sub: "Prepare an informed discussion about family protection, not a product recommendation.",
    track: "financial", pillar: "R", minutes: "12 min",
    sections: [
      ["Understand", "List dependants, essential household obligations, present cover and documents."],
      ["Define", "Identify what would need to continue financially after illness, disability or death."],
      ["Consider", "Review policy exclusions, affordability, coverage gaps, beneficiaries and existing employer benefits."],
      ["Act", "List three questions for an appropriately licensed or authorised professional."],
      ["Review", "Set a date to revisit when family, income or obligations change."],
    ],
  },
  {
    id: "second-income", title: "Second-Income Readiness Planner",
    sub: "Explore another earning stream without treating income claims as guarantees.",
    track: "financial", pillar: "I", minutes: "15 min",
    sections: [
      ["Understand", "Describe your current income stability, available time, skills and cash reserves."],
      ["Define", "Choose a realistic objective, such as learning a skill or researching two business models."],
      ["Consider", "Compare capital at risk, typical outcomes, work hours, licensing and the worst case."],
      ["Act", "Choose a low-cost way to test an idea before making a major commitment."],
      ["Review", "Check actual earnings after all costs and time invested."],
    ],
  },
  {
    id: "asset-liquidity", title: "Asset & Liquidity Mapping Worksheet",
    sub: "Compare what you own with what you may need to access soon.",
    track: "financial", pillar: "S", minutes: "20 min",
    sections: [
      ["Understand", "List assets, loans, emergency reserves, due dates and near-term goals."],
      ["Define", "Separate short-term needs from longer-term goals."],
      ["Consider", "Check concentration, fees, volatility, exit restrictions, tax and liquidity risks."],
      ["Act", "Prepare questions for a suitability discussion; no product is selected by this tool."],
      ["Review", "Update the map whenever investment, property or life circumstances change."],
    ],
  },
  {
    id: "preschool-due-diligence", title: "Preschool Investment Due Diligence",
    sub: "A decision worksheet for capital, demand, occupancy and operating risk.",
    track: "financial", pillar: "S", minutes: "25 min",
    sections: [
      ["Understand", "Identify proposed capital, source of funds, operator, location and licence assumptions."],
      ["Define", "Clarify what success and acceptable downside mean before committing."],
      ["Consider", "Stress-test enrolment, fee collection, staffing, rent, compliance, capex and working capital."],
      ["Act", "Request evidence, a cash-flow model, operator checks and professional reviews."],
      ["Review", "Recalculate base, optimistic and downside cases before each decision gate."],
    ],
  },
  {
    id: "family-continuity", title: "Family Continuity & Legacy Checklist",
    sub: "Organise responsibilities and documents for unforeseen events.",
    track: "financial", pillar: "E", minutes: "15 min",
    sections: [
      ["Understand", "List essential accounts, loans, contacts, estate documents and dependants."],
      ["Define", "Choose who should know where to find information in an emergency."],
      ["Consider", "Verify legal, beneficiary, tax, guardianship and estate matters with relevant professionals."],
      ["Act", "Store document-location instructions securely; never put passwords in this worksheet."],
      ["Review", "Review annually and after a major life event."],
    ],
  },
  {
    id: "career-runway", title: "Career Transition Runway Planner",
    sub: "Protect your essentials while examining a new career or commission model.",
    track: "career", pillar: "R", minutes: "15 min",
    sections: [
      ["Understand", "Calculate necessary monthly spending and how many months accessible savings cover."],
      ["Define", "Define a staged transition condition, not only a target earnings figure."],
      ["Consider", "Check ramp-up time, fixed costs, training, contracts and realistic low-income scenarios."],
      ["Act", "Run a small skills or market test without risking household essentials."],
      ["Review", "Recalculate runway as evidence changes; do not assume commission is guaranteed."],
    ],
  },
  {
    id: "income-skills", title: "Career & Skills Opportunity Planner",
    sub: "Compare opportunities against personal strengths and real constraints.",
    track: "career", pillar: "I", minutes: "15 min",
    sections: [
      ["Understand", "List skills, work preferences, income stability, commitments and available hours."],
      ["Define", "Select one learning or career goal that matches your situation."],
      ["Consider", "Compare multiple routes for costs, licensing, ethics, average outcomes and risks."],
      ["Act", "Choose one informational interview, credential check or pilot project."],
      ["Review", "Reassess after collecting evidence, not just promotional testimonials."],
    ],
  },
  {
    id: "industry-credentials", title: "Regulated Career Readiness Checklist",
    sub: "Research eligibility and authorisation before providing financial products.",
    track: "career", pillar: "I", minutes: "12 min",
    sections: [
      ["Understand", "Record the activities you hope to perform and the jurisdictions involved."],
      ["Define", "Identify the licences, training and registration required for each activity."],
      ["Consider", "Check current FIMM/distributor and any other applicable regulator guidance directly."],
      ["Act", "Contact an authorised distributor or professional body for a documented requirements list."],
      ["Review", "Reconfirm registration and continuing education before client-facing activity."],
    ],
  },
  {
    id: "pipeline-systems", title: "Ethical Opportunity Pipeline Tracker",
    sub: "Understand the quality and sustainability of repeatable business activities.",
    track: "career", pillar: "S", minutes: "20 min",
    sections: [
      ["Understand", "Map existing referral, prospecting and client support activities without listing private client data."],
      ["Define", "Choose useful KPIs: qualified conversations, service quality and follow-up completion."],
      ["Consider", "Evaluate client value, consent, conversion, acquisition cost and cancellations."],
      ["Act", "Test a weekly operating rhythm with a small number of responsible metrics."],
      ["Review", "Use a weekly review to improve quality, not pressure tactics."],
    ],
  },
  {
    id: "unit-economics", title: "Business Unit Economics Worksheet",
    sub: "Check profit per client, sale or student before expanding.",
    track: "career", pillar: "S", minutes: "20 min",
    sections: [
      ["Understand", "Identify revenue per unit, variable costs, fixed costs, capacity and working capital."],
      ["Define", "Set a break-even question to investigate."],
      ["Consider", "Model base and downside cases; include overhead and owner time."],
      ["Act", "Validate assumptions with actual evidence and external checks where needed."],
      ["Review", "Compare forecast to actual results every month."],
    ],
  },
  {
    id: "leadership-5r", title: "5R Leadership Implementation Toolkit",
    sub: "Create systems that work beyond the founder or top salesperson.",
    track: "career", pillar: "E", minutes: "20 min",
    sections: [
      ["Understand", "Identify decisions and tasks that currently depend on one person."],
      ["Define", "Choose one role, quality standard or process to document."],
      ["Consider", "Review accountability, coaching capability, workload and client experience."],
      ["Act", "Delegate one process with a simple checklist and a named responsible person."],
      ["Review", "Review outcomes weekly and adjust rather than blame."],
    ],
  },
  {
    id: "annual-review", title: "Annual R.I.S.E.™ Progress Review",
    sub: "A short annual reflection across all four pillars.",
    track: "both", pillar: "E", minutes: "15 min",
    sections: [
      ["Understand", "Record today’s four pillars, major changes and unresolved questions."],
      ["Define", "Choose one objective that is meaningful and feasible."],
      ["Consider", "Look at trade-offs, risks and what a professional review may need."],
      ["Act", "Write a dated next step and evidence needed."],
      ["Review", "Return to your scorecard in 30–90 days and compare conditions."],
    ],
  },
];
