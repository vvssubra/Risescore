// Educational content for plans and critical-condition alerts (verbatim from v2.0 engine).
// Wording changes need compliance review: no product recommendations, no promised outcomes.
import type { AlertId, PillarKey, Track } from './types.ts';

export interface Plan { title: string; toolkit: string; steps: string[] }
export interface GuardText { severity: number; pillar: PillarKey; title: string; reason: string; steps: string[] }

export const PLANS: Record<Track, Record<PillarKey, Plan>> = {
  "financial": {
    "R": {
      "title": "Strengthen your safety net",
      "toolkit": "30-Day Financial Reset & Family Safety Checklist",
      "steps": [
        "List essential expenses, repayment deadlines and available reserves.",
        "Choose one manageable action to stabilise cash flow or your emergency buffer.",
        "Review existing protection needs and gaps with an appropriately qualified professional, if relevant."
      ]
    },
    "I": {
      "title": "Build a healthier income foundation",
      "toolkit": "Second-Income Readiness Planner",
      "steps": [
        "Review earnings reliability, spending commitments and monthly surplus.",
        "Choose one realistic skill or income pathway to research.",
        "Compare start-up costs, earnings uncertainty and time commitments before taking action."
      ]
    },
    "S": {
      "title": "Make your wealth plan more resilient",
      "toolkit": "Property, Unit Trust & Liquidity Comparison Worksheet",
      "steps": [
        "Map major assets, liabilities, and money needed in the next 1–3 years.",
        "Check asset concentration, liquidity, costs and downside exposure.",
        "Seek a suitability review before choosing any investment product."
      ]
    },
    "E": {
      "title": "Build a financial continuity plan",
      "toolkit": "Family Continuity & Legacy Checklist",
      "steps": [
        "Organise key financial records and emergency contacts securely.",
        "Review future income needs, beneficiaries and estate-document status.",
        "Discuss legal, tax or succession needs with relevant licensed professionals."
      ]
    }
  },
  "career": {
    "R": {
      "title": "Secure your career transition",
      "toolkit": "Career Transition Runway Planner",
      "steps": [
        "Calculate how long essential expenses remain covered if income drops.",
        "Assess the true costs, uncertainty and commitments of the proposed move.",
        "Prefer a staged, evidence-led transition until your financial safety net is adequate."
      ]
    },
    "I": {
      "title": "Develop a realistic income strategy",
      "toolkit": "Income Opportunity & Skills Planner",
      "steps": [
        "Identify your strongest marketable skills and income-growth barriers.",
        "Compare several career or business models, including costs and realistic outcomes.",
        "Confirm training and licensing requirements before providing regulated services."
      ]
    },
    "S": {
      "title": "Build repeatable income systems",
      "toolkit": "Opportunity Pipeline & KPI Tracker",
      "steps": [
        "Write down a repeatable weekly prospecting or opportunity-building routine.",
        "Select a small number of useful, ethical activity and outcome measures.",
        "Review conversion, costs and client or employer value before scaling effort."
      ]
    },
    "E": {
      "title": "Grow beyond personal effort",
      "toolkit": "5R Leadership Implementation Toolkit",
      "steps": [
        "Map the work that depends on you alone.",
        "Document one process and assign clear ownership or cross-training.",
        "Create a simple weekly coaching and business-review rhythm."
      ]
    }
  }
};

export const GUARD_TEXT: Record<AlertId, GuardText> = {
  "cash_crisis": {
    "severity": 3,
    "pillar": "R",
    "title": "Essential payments need attention",
    "reason": "You reported overdue essential household payments.",
    "steps": [
      "Prioritise essentials and speak to your providers or creditors about available support.",
      "Avoid additional financial commitments until the immediate shortfall is understood.",
      "Consider independent debt counselling or qualified assistance where appropriate."
    ]
  },
  "debt_arrears": {
    "severity": 3,
    "pillar": "R",
    "title": "Debt arrears need attention",
    "reason": "You reported missed repayments or arrears.",
    "steps": [
      "List overdue payments and terms to understand immediate obligations.",
      "Contact lenders early to discuss available repayment options.",
      "Avoid taking on new high-risk investments or income promises as a quick fix."
    ]
  },
  "fragile_buffer": {
    "severity": 2,
    "pillar": "R",
    "title": "Income interruption risk",
    "reason": "Limited emergency reserves are combined with uncertain income.",
    "steps": [
      "Estimate your essential monthly expenses and accessible buffer.",
      "Prioritise a manageable reserve-building plan and stabilising income.",
      "Delay additional illiquid or speculative commitments."
    ]
  },
  "dependent_cover": {
    "severity": 2,
    "pillar": "R",
    "title": "Review your household protection",
    "reason": "You have dependants and reported important uncertainty or gaps in your coverage.",
    "steps": [
      "List the people and obligations that rely on your income.",
      "Review your existing policy details and exclusions.",
      "Discuss any protection gaps with an appropriately authorised professional."
    ]
  },
  "investing_essential": {
    "severity": 3,
    "pillar": "R",
    "title": "Protect essential money first",
    "reason": "Your proposed investment may use essential funds or untested borrowing.",
    "steps": [
      "Separate necessary household reserves from genuinely affordable risk capital.",
      "Assess downside exposure, debt obligations and exit constraints.",
      "Do not treat this assessment as approval of a particular opportunity."
    ]
  },
  "concentration": {
    "severity": 2,
    "pillar": "S",
    "title": "Review concentration and liquidity",
    "reason": "Your answers suggest meaningful exposure to a single illiquid asset.",
    "steps": [
      "Estimate the share of net worth held in one asset or business.",
      "Identify near-term expenses that depend on selling that asset.",
      "Compare practical diversification options and their risks with a qualified adviser."
    ]
  },
  "business_feasibility": {
    "severity": 2,
    "pillar": "S",
    "title": "Validate business economics first",
    "reason": "Your proposed business has not yet had enough demand or downside testing.",
    "steps": [
      "Stress-test occupancy, pricing, staffing, compliance and working capital.",
      "Prepare realistic base, downside and break-even scenarios.",
      "Request documented due diligence before considering any investment."
    ]
  },
  "career_arrears": {
    "severity": 3,
    "pillar": "R",
    "title": "Stabilise commitments before switching",
    "reason": "Your essential commitments are overdue.",
    "steps": [
      "Review overdue commitments and repayment options.",
      "Build a transition budget based on conservative income assumptions.",
      "Avoid treating commission earnings as guaranteed."
    ]
  },
  "switch_runway": {
    "severity": 3,
    "pillar": "R",
    "title": "Avoid an unsupported income leap",
    "reason": "You are considering an uncertain-income career move with less than three months of accessible runway.",
    "steps": [
      "Plan how essential bills would be covered under a low-earning scenario.",
      "Test the opportunity part-time or in a staged transition where possible.",
      "Verify earnings evidence, entry costs and contractual obligations."
    ]
  },
  "sales_authorisation": {
    "severity": 2,
    "pillar": "I",
    "title": "Verify professional authorisation",
    "reason": "You expressed interest in unit trust or PRS-related activities without confirmed registration.",
    "steps": [
      "Check current FIMM and distributor requirements before offering regulated services.",
      "Confirm whether you meet the required eligibility and examinations.",
      "Separate education and career exploration from marketing products to clients."
    ]
  },
  "unit_trust_age": {
    "severity": 2,
    "pillar": "I",
    "title": "Check unit trust / PRS age eligibility",
    "reason": "FIMM currently lists a minimum age of 21 for UTS/PRS consultant registration, while your selected age band is 18–20.",
    "steps": [
      "Explore the relevant qualifications and distributor requirements before making career commitments.",
      "Build relevant skills or work experience while confirming your future eligibility.",
      "Do not market or distribute UTS/PRS products without the necessary authorisation."
    ]
  },
  "weak_business_model": {
    "severity": 2,
    "pillar": "S",
    "title": "Check the business model before expanding",
    "reason": "Business profitability per client, sale or student is not yet clear.",
    "steps": [
      "Calculate contribution margin after direct costs.",
      "Account for overhead, staffing, capacity and working capital.",
      "Test a downside case before making major commitments."
    ]
  }
};
