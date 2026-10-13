# Financial-planning methodology and synthetic cohort assessment

## Educational planning framework

The design follows the **sequence** used in professional financial planning: understand current circumstances, identify goals, assess existing choices and possible alternatives, offer actionable education, and revisit progress. It is adapted to a short digital self-assessment, not represented as a completed CFP financial-planning engagement or validated psychometric instrument.

Financial coaching design adds: a low-judgment tone, achievable 30-day action, transparent calculations, and a choice to seek professional help rather than a forced sales path.

- Restore: essential bills, accessible emergency money, debt, *existing* insurance, and family responsibilities.
- Income: reliability, money left after essentials, second-income options and realistic earning plans.
- Sustain: saving for goals, investment understanding, concentration **only if applicable**, and short-term liquidity.
- Empire: future/retirement needs, basic document organisation, family continuity **where relevant**; leadership measures only for people leading a team or business.

Score weights remain Financial `R 30% / I 25% / S 25% / E 20%`, Career `R 20% / I 30% / S 25% / E 25%`. Questions are weighted as in `engine.js`. Not applicable and unknown answers **do not score zero**; where fewer pillars are eligible, the available weighted pillar scores are normalised. Scores are internal educational indicators and have not been empirically calibrated.

## Cohorts covered by automated journey simulations

These are **synthetic simulated users**, NOT a study of actual 18 participants. See `app/COHORT_TEST_RESULTS.csv` for concrete inputs, question counts, first/second recommendations and alerts.

| Age band | Financial behaviours and life situations | Career contexts and behaviour |
|---|---|---|
| 18–20 | Starting work, little savings, no family dependants | Exploring first financial-services career |
| 21–24 | Regular saver, learning about investing | Employee exploring additional earnings |
| 25–34 | Financial pressure and small cash buffer | Considering job transition with little runway |
| 35–44 | Working parents with and without insurance; arrears | Licensed-industry career exploration; property agent income development |
| 45–54 | Property concentration; existing business owner who wants to grow income | Agency/team leader designing a better system |
| 55–64 | Approaching retirement and reorganising goals | Business-owner leadership and handover |
| 65+ | Pension/retirement drawdown, not necessarily actively saving | Retiree considering mentoring work |

Financial styles tested: disciplined saver, irregular earner, stretched spender, primary-income-dependent family, protection reviewer, over-indebted household, concentrated investor, owner/entrepreneur, retirement planner. Career styles tested: employee, exploring recruit, career switcher, insurance professional, property agent, leader, owner and retiree.

## Essential test rules

1. Young person with no dependants and no insurance: **no dependent-cover critical alert**.
2. Parent with medical+life+employer benefits and a stated income goal: **Income first**, optional insurance *review* second; no falsely inferred absence of coverage.
3. Parent who reports no insurance and financial dependants: context-aware protection concern; do not claim a specific amount/product is needed.
4. Arrears on essential payments: Restore risk first, regardless of higher earnings/investment scores.
5. Investing with essential household funds: risk check first; no product recommendation.
6. Property concentration requires evidence and liquidity strain before reporting a concentration alert.
7. Employee not planning a career change: no questions about transition runway or running a team; no low Empire score for "not leading".
8. Entry-level financial services candidate: no assumption that lacking unit trust registration makes them a bad recruit or that young age disqualifies them.
9. Business goal, including a `business_owner` occupation: zero preschool-specific questions and zero direct business-capital deep dives.
10. Retiree using savings: "not saving every month" must not automatically be scored as a financial failure.
11. High-scoring response: acknowledge strengths and use maintenance/growth guidance; don't invent a crisis to drive a consultation.
12. Unknown answers should reduce confidence or yield insufficient information, not a zero score.

## Real-prospect validation still required

Ask at least 5 participants in each major life/career segment (including Malaysia English-language respondents), targeting a varied pilot of approximately 30–50 people. Observe where they hesitate, whether any valid answer is missing, if the reported top two priorities sound right, and whether they can explain their next step in their own words. Recalculate and verify ambiguous reports manually with appropriately qualified reviewers. The synthetic suite cannot establish score validity, consumer comprehension, qualified-lead conversion or regulatory compliance.
