// The eight V4.3 interactive planning workbooks (TK01–TK08), converted from the V4.3 package's
// private/toolkit-data JSON. SERVER-ONLY: a report response carries just the 1–2 workbooks its
// priorities unlock, so unassigned planners never reach the browser bundle.
// Educational prompts only: not personalised regulated advice, no product recommendations.
import type { Workbook } from '../shared/workbook.ts';

export const WORKBOOKS: readonly Workbook[] = [
  {
    "id": "TK01",
    "title": "Second Income Planner",
    "subtitle": "Find an extra income idea that fits your life.",
    "track": "both",
    "pillar": "I",
    "minutes": "25 minutes",
    "promise": "Choose one extra-income idea worth testing, with a clear target, money limit and time limit.",
    "prep": "Your monthly pay estimate, normal monthly expenses, your weekly free time, and a pen. Rough numbers are fine.",
    "check": [
      "What makes you want extra income right now?",
      "How much spare time do you really have each week?",
      "What skill, service or experience do people already value?"
    ],
    "snapshotTip": "Remember: sales or commissions are not the same as money you keep after costs.",
    "mathTitle": "What would the extra income really look like?",
    "mathIntro": "Use money you keep AFTER expenses. For variable income, choose a cautious estimate instead of the best month.",
    "mathExample": "EXAMPLE: Earn RM1,000; spend RM220 on travel, tools and fees. You keep RM780. If it takes 28 hours, that is about RM28 per hour.",
    "mathRead": "If the real hourly return is low, the work is unreliable or the upfront cost is high, test a smaller idea first.",
    "mathPause": "Do not count promised commissions as guaranteed pay. Check registration rules before doing regulated work.",
    "options": [
      [
        "Improve current job pay",
        "Ask about new skills, overtime or a raise. Lower startup cost, but may take time."
      ],
      [
        "Offer a simple service",
        "Use a skill you already have. Test with one paying customer before buying equipment."
      ],
      [
        "Explore a new earning model",
        "Part-time sales or business may fit, but check costs, licensing and unpredictable earnings."
      ]
    ],
    "compare": [
      "How fast can I test it?",
      "What money could I lose?",
      "Can I keep doing it?"
    ],
    "askBefore": [
      "What costs will I pay even with no sales?",
      "Is there a contract, registration or training requirement?",
      "Can I try this safely without resigning?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "Pick one idea",
        "Write down the customer, the problem you solve, and your spending limit."
      ],
      [
        "WEEK 2",
        "Check the numbers",
        "Ask two people what they would pay and list all likely costs."
      ],
      [
        "WEEK 3",
        "Run a small test",
        "Make one ethical offer or apply for a genuine opportunity."
      ],
      [
        "WEEK 4",
        "Review actual results",
        "Record money received, expenses, time and what you learned."
      ]
    ],
    "reflect": [
      "What was easier than expected?",
      "What cost more money or time than expected?",
      "Is this idea worth another 30 days?"
    ],
    "help": "If the income depends on commissions, borrowing, or a large upfront fee, get a clear explanation of costs and risks before committing.",
    "questions": [
      "Would earning more solve my main problem, or must I fix spending too?",
      "How much income uncertainty can my household handle?"
    ],
    "fields": [
      {
        "id": "income",
        "label": "Current monthly take-home income",
        "kind": "money"
      },
      {
        "id": "target",
        "label": "Extra money I would like each month",
        "kind": "money"
      },
      {
        "id": "hoursWeek",
        "label": "Hours I can spare each week",
        "kind": "number"
      },
      {
        "id": "budget",
        "label": "Maximum I can afford to test an idea",
        "kind": "money"
      },
      {
        "id": "revenue",
        "label": "Estimated extra money coming in each month",
        "kind": "money"
      },
      {
        "id": "costs",
        "label": "Expected costs each month",
        "kind": "money"
      },
      {
        "id": "hours",
        "label": "Hours I would spend each month",
        "kind": "number"
      }
    ]
  },
  {
    "id": "TK02",
    "title": "Insurance Review Checklist",
    "subtitle": "Know what you have before deciding what you need.",
    "track": "financial",
    "pillar": "R",
    "minutes": "25 minutes",
    "promise": "Build one clear list of your policies and the questions you need answered.",
    "prep": "Your medical card, life policy summary, employer benefits and any insurance documents you can find. Do not share policy numbers in public chats.",
    "check": [
      "Do you have medical coverage, life coverage, both or neither?",
      "Who depends on your income or care?",
      "What part of your current policy is unclear to you?"
    ],
    "snapshotTip": "A medical card does not automatically mean your family has enough life cover. Some policies include both.",
    "mathTitle": "Could your family manage if your income stopped?",
    "mathIntro": "This is a conversation starter, NOT a calculation of how much insurance you must buy. Use estimates if needed.",
    "mathExample": "EXAMPLE: If essential family costs are RM3,500 per month, 12 months would be RM42,000 in living costs before considering debts, other income, savings or policy benefits.",
    "mathRead": "Numbers alone do not prove a gap. Check what each benefit pays, to whom, for how long and under what conditions.",
    "mathPause": "Do not cancel or replace a current policy based on this worksheet. Check waiting periods, exclusions and changes in cost first.",
    "options": [
      [
        "Check my policy details",
        "Ask the insurer for the latest benefit summary, exclusions and premium information."
      ],
      [
        "Compare family responsibilities",
        "Think about dependants, debts, other family income and cash available."
      ],
      [
        "Request a full needs review",
        "Discuss confirmed benefits and possible gaps with an appropriately authorised person."
      ]
    ],
    "compare": [
      "What is covered now?",
      "What is still unclear?",
      "What will it cost?"
    ],
    "askBefore": [
      "What is my medical annual limit and what is excluded?",
      "How much life coverage is confirmed, and who receives it?",
      "Does employer cover stop if I leave my job?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "Find the documents",
        "Collect medical, life and employer benefit summaries."
      ],
      [
        "WEEK 2",
        "Fill your cover list",
        "Write what each policy actually covers; mark unknown items."
      ],
      [
        "WEEK 3",
        "Ask the insurer",
        "Clarify exclusions, renewals, premium changes and claims process."
      ],
      [
        "WEEK 4",
        "Review needs",
        "Compare your cover with family commitments; seek a proper review if needed."
      ]
    ],
    "reflect": [
      "Which coverage was different from what I assumed?",
      "What could my family still struggle to pay?",
      "What question should I ask first?"
    ],
    "help": "A professional can help assess affordability, suitability and overlapping cover. Ask for a clear explanation, not a rushed product pitch.",
    "questions": [
      "Based on my existing cover, what is already working well?",
      "What gap, if any, matters most for my family and budget?"
    ],
    "fields": [
      {
        "id": "medical",
        "label": "I have a medical card",
        "kind": "checkbox"
      },
      {
        "id": "life",
        "label": "I have life insurance",
        "kind": "checkbox"
      },
      {
        "id": "accident",
        "label": "I have personal accident insurance",
        "kind": "checkbox"
      },
      {
        "id": "critical",
        "label": "I have critical illness cover",
        "kind": "checkbox"
      },
      {
        "id": "employer",
        "label": "My employer provides some cover",
        "kind": "checkbox"
      },
      {
        "id": "dependants",
        "label": "People depending on my income",
        "kind": "text"
      },
      {
        "id": "familyCosts",
        "label": "Basic family spending each month",
        "kind": "money"
      },
      {
        "id": "debts",
        "label": "Outstanding family debts (if known)",
        "kind": "money"
      },
      {
        "id": "lifeCover",
        "label": "Life coverage amount I can confirm",
        "kind": "money"
      },
      {
        "id": "review",
        "label": "Last time I checked my policy details",
        "kind": "select",
        "options": [
          [
            "recent",
            "Over the past 12 months"
          ],
          [
            "old",
            "More than a year ago"
          ],
          [
            "unsure",
            "Not sure"
          ]
        ]
      }
    ]
  },
  {
    "id": "TK03",
    "title": "Emergency Savings Planner",
    "subtitle": "Build money you can use when life surprises you.",
    "track": "financial",
    "pillar": "R",
    "minutes": "20 minutes",
    "promise": "Work out how many months your accessible money could support you and set a realistic savings step.",
    "prep": "A recent bank balance, household bills and an estimate of essential monthly spending. No need to include account numbers.",
    "check": [
      "If your income stopped, what bills would still need paying?",
      "Which savings can you use quickly without a big loss or penalty?",
      "What makes saving difficult right now?"
    ],
    "snapshotTip": "Do not count EPF retirement savings or money tied up in property as cash you can freely use tomorrow.",
    "mathTitle": "How big is your emergency buffer?",
    "mathIntro": "Choose a goal that fits your circumstances. PIDM uses six months as a common starting point and lets users explore different targets.",
    "mathExample": "EXAMPLE: Essential costs RM3,000/month; six-month goal RM18,000; available savings RM4,000. Still to build: RM14,000. Saving RM350/month takes about 40 months.",
    "mathRead": "A target is not a judgment. Starting with RM20 or RM50 is still a step forward if that is what your budget allows.",
    "mathPause": "If you have overdue essentials, first make a plan to protect housing, food and other urgent commitments.",
    "options": [
      [
        "Automatic transfer",
        "Move a small amount after payday into an accessible account."
      ],
      [
        "Find one expense to adjust",
        "Check subscriptions, eating out or repeated small spending without skipping essentials."
      ],
      [
        "Use irregular extra money",
        "Save part of a bonus or side-income payment when it arrives."
      ]
    ],
    "compare": [
      "Easy to keep doing?",
      "Can I access it fast?",
      "Any fees or penalties?"
    ],
    "askBefore": [
      "Can I withdraw this money when I need it?",
      "Is this amount really available, or promised to another bill?",
      "What is the smallest monthly saving I can stick to?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "List must-pay costs",
        "Add housing, food, transport, utilities and loan minimums."
      ],
      [
        "WEEK 2",
        "Confirm accessible cash",
        "Separate emergency money from savings for other goals."
      ],
      [
        "WEEK 3",
        "Start an automatic habit",
        "Choose an achievable transfer on payday."
      ],
      [
        "WEEK 4",
        "Check one month",
        "Review what worked; adjust the next transfer if needed."
      ]
    ],
    "reflect": [
      "What unexpected expense could happen next month?",
      "What gets in the way of saving?",
      "What small change will I keep?"
    ],
    "help": "If you are unsure what money is truly accessible or your debts block saving, a budget review can help you choose a safe first step.",
    "questions": [
      "What is a suitable emergency goal for my household?",
      "How do I balance building savings and paying down debt?"
    ],
    "fields": [
      {
        "id": "essentials",
        "label": "Essential household spending each month",
        "kind": "money"
      },
      {
        "id": "available",
        "label": "Savings I could use quickly",
        "kind": "money"
      },
      {
        "id": "earmarked",
        "label": "Savings already set aside for other goals",
        "kind": "money"
      },
      {
        "id": "months",
        "label": "How many months of backup would I like?",
        "kind": "select",
        "options": [
          [
            "3",
            "3 months"
          ],
          [
            "6",
            "6 months"
          ],
          [
            "9",
            "9 months"
          ],
          [
            "12",
            "12 months"
          ]
        ]
      },
      {
        "id": "monthly",
        "label": "How much could I save per month?",
        "kind": "money"
      },
      {
        "id": "barrier",
        "label": "What makes saving hard today?",
        "kind": "select",
        "options": [
          [
            "expenses",
            "Living costs"
          ],
          [
            "debt",
            "Debt repayments"
          ],
          [
            "variable",
            "Income changes"
          ],
          [
            "family",
            "Family needs"
          ],
          [
            "other",
            "Another reason"
          ]
        ]
      }
    ]
  },
  {
    "id": "TK04",
    "title": "Debt & Cash Flow Reset",
    "subtitle": "See where your money goes. Plan your next month.",
    "track": "financial",
    "pillar": "R",
    "minutes": "30 minutes",
    "promise": "See whether your monthly money covers essentials, and pick one debt or spending step you can manage.",
    "prep": "Recent pay, main monthly bills, loan minimum amounts and due dates. Estimates are fine to start.",
    "check": [
      "Is money usually left before your next payday?",
      "Are any bills or loan payments already overdue?",
      "What payment causes the most worry?"
    ],
    "snapshotTip": "If you are already behind on essential payments, contact the lender or AKPK early. This workbook is not a debt restructuring service.",
    "mathTitle": "Is there room in your monthly budget?",
    "mathIntro": "Count each cost once. Include irregular expenses by setting aside a monthly amount when possible.",
    "mathExample": "EXAMPLE: Pay RM5,200 - essential costs RM3,200 - debt minimums RM1,400 - other spending RM450 = RM150 left. This is before unexpected costs.",
    "mathRead": "If the amount is negative or near zero, focus first on essential bills, realistic costs and getting support rather than new commitments.",
    "mathPause": "Do not stop minimum payments just to follow a payoff strategy. If you cannot pay minimums, seek help rather than guessing.",
    "options": [
      [
        "Pay high-cost debt first",
        "After minimums, put extra money toward the highest rate. May reduce total interest."
      ],
      [
        "Pay a small debt first",
        "After minimums, put extra money toward the smallest balance. May create early wins."
      ],
      [
        "Talk to lender / AKPK",
        "If payments are overdue or unaffordable, ask about workable help before debts grow."
      ]
    ],
    "compare": [
      "Can I afford the minimums?",
      "Will this lower costs?",
      "Can I stick to it?"
    ],
    "askBefore": [
      "Which payments are essential or already overdue?",
      "What interest or profit rate applies to each debt?",
      "Have I listed BNPL, credit cards and informal loans too?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "List the facts",
        "Write down balances, minimums, due dates and late payments."
      ],
      [
        "WEEK 2",
        "Protect essentials",
        "Plan housing, food, utilities and debt minimums; ask for help if short."
      ],
      [
        "WEEK 3",
        "Choose one adjustment",
        "Reduce one flexible expense or clarify options with a lender."
      ],
      [
        "WEEK 4",
        "Check results",
        "Compare actual spending with your plan and adjust carefully."
      ]
    ],
    "reflect": [
      "Which payment is most urgent?",
      "What spending change is realistic for me?",
      "Do I need support to make this manageable?"
    ],
    "help": "If you are missing repayments or cannot cover basic needs, seek guidance promptly. AKPK offers financial counselling in Malaysia.",
    "questions": [
      "Is there a safer way to manage my debt repayments?",
      "Can we make a budget that still covers my family needs?"
    ],
    "fields": [
      {
        "id": "income",
        "label": "Total monthly take-home income",
        "kind": "money"
      },
      {
        "id": "essentials",
        "label": "Essential spending (excluding debt payments)",
        "kind": "money"
      },
      {
        "id": "debt",
        "label": "Minimum loan and card payments",
        "kind": "money"
      },
      {
        "id": "other",
        "label": "Other monthly spending",
        "kind": "money"
      },
      {
        "id": "late",
        "label": "Are any essential bills overdue?",
        "kind": "select",
        "options": [
          [
            "no",
            "No"
          ],
          [
            "yes",
            "Yes"
          ],
          [
            "unsure",
            "Not sure"
          ]
        ]
      }
    ]
  },
  {
    "id": "TK05",
    "title": "Investment Risk Checklist",
    "subtitle": "Understand the risk before putting in more money.",
    "track": "financial",
    "pillar": "S",
    "minutes": "25 minutes",
    "promise": "Identify what your investments are for, what you may need soon, and what you still need to check.",
    "prep": "Rough investment values, cash available, when you may need the money, and the fee details if you have them.",
    "check": [
      "What is this money meant to achieve?",
      "When might you need to use it?",
      "How much of your investment is tied to one thing?"
    ],
    "snapshotTip": "Keep short-term spending needs separate from money you can leave invested for longer.",
    "mathTitle": "Are you relying too much on one thing?",
    "mathIntro": "Concentration means a large share of your money depends on one investment or type of asset. There is no one perfect percentage for everyone.",
    "mathExample": "EXAMPLE: RM70,000 in one investment out of RM100,000 invested = 70%. Ask what could happen if that holding loses value or cannot be sold quickly.",
    "mathRead": "High concentration is a reason to examine risk, not proof that an investment is unsuitable. Consider fees, time horizon and available cash too.",
    "mathPause": "Never invest emergency money based on promises of quick or guaranteed returns. Check the person or firm with the regulator.",
    "options": [
      [
        "Keep and review",
        "Understand what you own, costs and whether it still suits your goal."
      ],
      [
        "Build flexibility",
        "Plan how to keep near-term needs accessible without rushed selling."
      ],
      [
        "Ask for a regulated review",
        "Discuss risk tolerance and the whole portfolio with an appropriately authorised adviser."
      ]
    ],
    "compare": [
      "When can I use the money?",
      "What can go wrong?",
      "What are all the fees?"
    ],
    "askBefore": [
      "Could I lose money, and how much?",
      "How long to withdraw or sell?",
      "Is the seller authorised, and what fees apply?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "List investments",
        "Add values, account types and what each is for."
      ],
      [
        "WEEK 2",
        "Check access and fees",
        "Find exit rules, charges and how fast money can be withdrawn."
      ],
      [
        "WEEK 3",
        "Read the risks",
        "Check concentration and the impact of a possible fall in value."
      ],
      [
        "WEEK 4",
        "Decide next step",
        "Keep questions for an authorised adviser; avoid rushed product changes."
      ]
    ],
    "reflect": [
      "What surprised me about my investments?",
      "What money might I need sooner than planned?",
      "What am I still unsure about?"
    ],
    "help": "If you are considering an investment, check whether the seller is authorised by the Securities Commission Malaysia. Use FIMM checks for unit trust and PRS consultants.",
    "questions": [
      "Does my investment mix match my goals and time frame?",
      "What are the main fees, risks and alternatives?"
    ],
    "fields": [
      {
        "id": "largest",
        "label": "Value of my largest investment",
        "kind": "money"
      },
      {
        "id": "total",
        "label": "Total value of investments",
        "kind": "money"
      },
      {
        "id": "shortNeed",
        "label": "Money I will need within 12 months",
        "kind": "money"
      },
      {
        "id": "liquid",
        "label": "Money I can access without major delay",
        "kind": "money"
      },
      {
        "id": "goal",
        "label": "What is my main investment goal?",
        "kind": "text"
      },
      {
        "id": "horizon",
        "label": "When will I need the invested money?",
        "kind": "select",
        "options": [
          [
            "under1",
            "Within 1 year"
          ],
          [
            "one5",
            "1 to 5 years"
          ],
          [
            "five",
            "After 5 years"
          ],
          [
            "unsure",
            "Not sure"
          ]
        ]
      },
      {
        "id": "risk",
        "label": "If my investment value fell, I would feel...",
        "kind": "select",
        "options": [
          [
            "ok",
            "Able to wait"
          ],
          [
            "worried",
            "Worried"
          ],
          [
            "cannot",
            "I may need to sell"
          ],
          [
            "unsure",
            "Not sure"
          ]
        ]
      }
    ]
  },
  {
    "id": "TK06",
    "title": "Career Transition Planner",
    "subtitle": "Explore a new career without guessing the cost.",
    "track": "career",
    "pillar": "I",
    "minutes": "25 minutes",
    "promise": "Compare a career move with your current job and plan a safe first experiment.",
    "prep": "Current take-home pay, minimum monthly costs, current savings, role ideas and any training requirements.",
    "check": [
      "What is the main reason you want a change?",
      "What do you enjoy doing and do well?",
      "What would you need to earn to support your household?"
    ],
    "snapshotTip": "Commission-only income may start slowly and vary each month. Ask about costs, lead support and registration requirements.",
    "mathTitle": "How long could you manage during a change?",
    "mathIntro": "A financial runway is simply how many months your available money could cover essentials if your pay stopped.",
    "mathExample": "EXAMPLE: RM12,600 of available savings / RM4,200 of monthly essentials = 3 months of backup. This is only an estimate.",
    "mathRead": "A short runway means it may be safer to learn, interview or test an opportunity while still employed.",
    "mathPause": "Do not resign based on one income story. Check written terms, real costs, benefits, licensing, and what happens in a slow month.",
    "options": [
      [
        "Grow in my current company",
        "Ask about training, promotion or a different role with less disruption."
      ],
      [
        "Move to another employer",
        "Compare written pay, benefits, role expectations and career development."
      ],
      [
        "Explore variable-income work",
        "Test suitability, registrations, real take-home earnings and cash reserves first."
      ]
    ],
    "compare": [
      "Reliable take-home pay?",
      "Skills I need?",
      "Impact on my family?"
    ],
    "askBefore": [
      "Is pay fixed, variable or both?",
      "What benefits, hours and expenses change?",
      "Are qualifications or authorisations required?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "Choose two realistic paths",
        "List what each pays and the skills it needs."
      ],
      [
        "WEEK 2",
        "Speak to people in the role",
        "Ask about typical hours, slow months and real costs."
      ],
      [
        "WEEK 3",
        "Check your runway",
        "Compare savings, family costs and training requirements."
      ],
      [
        "WEEK 4",
        "Take one safe step",
        "Apply, interview, take a short course or request a role shadow."
      ]
    ],
    "reflect": [
      "Do I want to leave my job, or change what I do in it?",
      "Which opportunity fits both my strengths and my bills?",
      "What evidence do I need before a big decision?"
    ],
    "help": "A career mentor or adviser can help compare opportunities. For regulated financial roles, independently verify eligibility and registration first.",
    "questions": [
      "What would I need to learn before switching?",
      "What is a realistic first-year income range, including slow months?"
    ],
    "fields": [
      {
        "id": "pay",
        "label": "My current take-home pay each month",
        "kind": "money"
      },
      {
        "id": "essentials",
        "label": "Essential expenses each month",
        "kind": "money"
      },
      {
        "id": "reserve",
        "label": "Savings I could use during a job change",
        "kind": "money"
      },
      {
        "id": "setup",
        "label": "Possible training or travel costs",
        "kind": "money"
      },
      {
        "id": "newpay",
        "label": "Conservative starting income estimate",
        "kind": "money"
      },
      {
        "id": "path",
        "label": "Which career move am I exploring?",
        "kind": "text"
      }
    ]
  },
  {
    "id": "TK07",
    "title": "Business Readiness Checklist",
    "subtitle": "Check the numbers before you commit your money.",
    "track": "both",
    "pillar": "S",
    "minutes": "30 minutes",
    "promise": "Create a basic cost picture, work out break-even sales and list what needs checking before an investment.",
    "prep": "A business idea, estimated monthly costs, a rough selling price, and any written documents from the seller or partner.",
    "check": [
      "Who will pay for this product or service?",
      "What will it cost before the first sale?",
      "How much could you lose if sales are slow?"
    ],
    "snapshotTip": "A preschool, franchise or centre has its own permits, staffing, premises and operating checks. Do not assume approval or enrolment.",
    "mathTitle": "How many customers to cover the costs?",
    "mathIntro": "Break-even means income covers estimated operating costs, before financing, taxes and other items you may still need to include.",
    "mathExample": "EXAMPLE: Fee RM250; direct cost RM90/customer; RM160 left per customer. Fixed costs RM8,000/month: 8,000 / 160 = 50 paying customers just to break even.",
    "mathRead": "If expected slow-month sales are below break-even, work out how long your cash can cover the shortfall. If price does not exceed direct cost, the model needs rethinking.",
    "mathPause": "These are simple estimates, not a feasibility study. Check tax, wages, financing, licences, occupancy, repairs and working cash.",
    "options": [
      [
        "Test a small version",
        "Speak to customers and test demand before paying for a full setup."
      ],
      [
        "Review written numbers",
        "Ask for actual cost details, occupancy and historical data, not only optimistic forecasts."
      ],
      [
        "Get independent checks",
        "Confirm licences, contracts and obligations with qualified specialists."
      ]
    ],
    "compare": [
      "What proof of demand?",
      "Cash needed in slow months?",
      "What rules or permits apply?"
    ],
    "askBefore": [
      "Who owns the premises, brand and customer contracts?",
      "What do fixed costs look like with fewer customers?",
      "Are there any licences, fees, deposits or exit penalties?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "Test the customer need",
        "Speak to five potential customers without making promises."
      ],
      [
        "WEEK 2",
        "List every cost",
        "Separate setup, fixed monthly and per-customer costs."
      ],
      [
        "WEEK 3",
        "Check the slow-month case",
        "Model low sales, delays and extra operating expenses."
      ],
      [
        "WEEK 4",
        "Verify before paying",
        "Review licences, contracts and numbers with independent professionals."
      ]
    ],
    "reflect": [
      "Which assumption is most uncertain?",
      "What would happen if sales took 6 months to grow?",
      "What must be confirmed before I pay anything?"
    ],
    "help": "For a preschool or franchise, seek independent accounting, legal and regulatory checks before signing or investing.",
    "questions": [
      "Do these numbers make sense in a slow month?",
      "What is the total capital at risk, including hidden costs?"
    ],
    "fields": [
      {
        "id": "idea",
        "label": "My business idea / customer",
        "kind": "text"
      },
      {
        "id": "capital",
        "label": "Money I can afford to put at risk",
        "kind": "money"
      },
      {
        "id": "setup",
        "label": "One-time startup costs",
        "kind": "money"
      },
      {
        "id": "buffer",
        "label": "Money set aside for slow months",
        "kind": "money"
      },
      {
        "id": "price",
        "label": "Selling price per customer / sale",
        "kind": "money"
      },
      {
        "id": "variable",
        "label": "Direct cost per customer / sale",
        "kind": "money"
      },
      {
        "id": "fixed",
        "label": "Monthly fixed costs (rent, salaries, utilities)",
        "kind": "money"
      },
      {
        "id": "slow",
        "label": "Expected customers in a slow month",
        "kind": "number"
      }
    ]
  },
  {
    "id": "TK08",
    "title": "Leadership Systems Planner",
    "subtitle": "Build a team that does not depend on you for everything.",
    "track": "career",
    "pillar": "E",
    "minutes": "25 minutes",
    "promise": "Choose one repeatable team process, give it a clear owner and test it over 30 days.",
    "prep": "Your team list, common weekly work, one problem that keeps repeating, and recent activity numbers if available.",
    "check": [
      "What breaks down when you are away?",
      "What does your team keep asking you to decide?",
      "Which one process causes the most stress?"
    ],
    "snapshotTip": "Do not delegate confidential financial advice or regulated decisions to someone who is not authorised to perform them.",
    "mathTitle": "Where is the team depending too much on you?",
    "mathIntro": "Count how many important repeating tasks only you can complete. Use this as a discussion tool, not a performance grade.",
    "mathExample": "EXAMPLE: Of 10 routine tasks, the leader alone handles 8. That is 80% leader-owned. Start by teaching one suitable task, not dumping everything at once.",
    "mathRead": "A high percentage shows where to document and train. Some tasks should remain with a qualified leader or licensed person.",
    "mathPause": "Do not delegate regulated advice, private customer data or safety-critical decisions without suitable authority and controls.",
    "options": [
      [
        "Write a one-page process",
        "List the steps, quality check and who to ask when stuck."
      ],
      [
        "Train one clear owner",
        "Show the task, let them try, review results and offer support."
      ],
      [
        "Review one useful measure",
        "Track an outcome people can influence, not just activity for its own sake."
      ]
    ],
    "compare": [
      "Is the owner clear?",
      "Is training realistic?",
      "How do we check quality?"
    ],
    "askBefore": [
      "What does good work look like?",
      "Who decides when an exception happens?",
      "How will the person get feedback and help?"
    ],
    "weeks": [
      [
        "WEEK 1",
        "Pick a repeat problem",
        "Choose a recurring task that slows the team down."
      ],
      [
        "WEEK 2",
        "Document the steps",
        "Make a one-page guide with the desired outcome."
      ],
      [
        "WEEK 3",
        "Train and observe",
        "Let a teammate practise with support and clear limits."
      ],
      [
        "WEEK 4",
        "Review and improve",
        "Ask what worked, check quality and simplify the process."
      ]
    ],
    "reflect": [
      "Which decision can the team make without me now?",
      "What needs clearer training or approval?",
      "What one measure would help, not just pressure, people?"
    ],
    "help": "A leadership review can help align roles, measures and coaching. Keep regulated work with appropriately qualified people.",
    "questions": [
      "Which processes must work even when I am absent?",
      "How can I train people without losing quality or compliance?"
    ],
    "fields": [
      {
        "id": "team",
        "label": "People in my team",
        "kind": "number"
      },
      {
        "id": "hours",
        "label": "Hours each week spent on repeat tasks",
        "kind": "number"
      },
      {
        "id": "total",
        "label": "Number of important repeated tasks",
        "kind": "number"
      },
      {
        "id": "owner",
        "label": "Tasks only I know how to do",
        "kind": "number"
      },
      {
        "id": "freed",
        "label": "Hours I hope to free each week",
        "kind": "number"
      },
      {
        "id": "train",
        "label": "Tasks I could train someone else to handle",
        "kind": "number"
      },
      {
        "id": "task",
        "label": "One task I want to delegate first",
        "kind": "text"
      }
    ]
  },
];

/** Original fillable PDFs shipped with V4.3 (reference/v4.3/pdfs). Admins publish them through the review workflow. */
export const WORKBOOK_PDF_FILES: Readonly<Record<string, string>> = {
  "TK01": "TK01_Second_Income_Planner.pdf",
  "TK02": "TK02_Insurance_Review_Checklist.pdf",
  "TK03": "TK03_Emergency_Savings_Planner.pdf",
  "TK04": "TK04_Debt_and_Cash_Flow_Reset.pdf",
  "TK05": "TK05_Investment_Risk_Checklist.pdf",
  "TK06": "TK06_Career_Transition_Planner.pdf",
  "TK07": "TK07_Business_Readiness_Checklist.pdf",
  "TK08": "TK08_Leadership_Systems_Planner.pdf"
};
