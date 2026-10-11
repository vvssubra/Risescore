/* R.I.S.E.™ educational toolkit library: original educational worksheets, not personalised regulated advice. */
(function(root){
'use strict';
const kit=(id,title,sub,track,pillar,minutes,sections,PDF='')=>({id,title,sub,track,pillar,minutes,sections,pdfUrl:PDF});
const CATALOG=[
kit('complete-your-snapshot','Complete Your R.I.S.E.™ Snapshot','A short checklist for questions you could not answer yet.','both','R','10 min',[['Understand','Which questions were difficult to answer, and why?'],['Define','Choose the most important missing piece of information to clarify.'],['Consider','Identify where you can find reliable statements, records or advice.'],['Act','Gather the missing information without disclosing confidential data in the worksheet.'],['Review','Retake your assessment when enough information is available for a meaningful comparison.']]),
kit('financial-reset','30-Day Financial Reset','Make essential spending, debt commitments and emergency reserves visible.','financial','R','15–20 min',[
 ['Understand','Write down monthly take-home income, essential costs, debt minimums and accessible savings.'],
 ['Define','Choose one priority: catch up on essentials, understand debts, or strengthen a small emergency buffer.'],
 ['Consider','Which commitments have deadlines? Where can you contact a creditor early rather than miss a payment?'],
 ['Act','Write one achievable action and the date you will complete it.'],['Review','Check the change after 30 days; update your numbers without judging yourself.']]),
kit('family-protection','Family Protection Review Checklist','Prepare an informed discussion about family protection, not a product recommendation.','financial','R','12 min',[
 ['Understand','List dependants, essential household obligations, present cover and documents.'],['Define','Identify what would need to continue financially after illness, disability or death.'],['Consider','Review policy exclusions, affordability, coverage gaps, beneficiaries and existing employer benefits.'],['Act','List three questions for an appropriately licensed or authorised professional.'],['Review','Set a date to revisit when family, income or obligations change.']]),
kit('second-income','Second-Income Readiness Planner','Explore another earning stream without treating income claims as guarantees.','financial','I','15 min',[
 ['Understand','Describe your current income stability, available time, skills and cash reserves.'],['Define','Choose a realistic objective, such as learning a skill or researching two business models.'],['Consider','Compare capital at risk, typical outcomes, work hours, licensing and the worst case.'],['Act','Choose a low-cost way to test an idea before making a major commitment.'],['Review','Check actual earnings after all costs and time invested.']]),
kit('asset-liquidity','Asset & Liquidity Mapping Worksheet','Compare what you own with what you may need to access soon.','financial','S','20 min',[
 ['Understand','List assets, loans, emergency reserves, due dates and near-term goals.'],['Define','Separate short-term needs from longer-term goals.'],['Consider','Check concentration, fees, volatility, exit restrictions, tax and liquidity risks.'],['Act','Prepare questions for a suitability discussion; no product is selected by this tool.'],['Review','Update the map whenever investment, property or life circumstances change.']]),
kit('preschool-due-diligence','Preschool Investment Due Diligence','A decision worksheet for capital, demand, occupancy and operating risk.','financial','S','25 min',[
 ['Understand','Identify proposed capital, source of funds, operator, location and licence assumptions.'],['Define','Clarify what success and acceptable downside mean before committing.'],['Consider','Stress-test enrolment, fee collection, staffing, rent, compliance, capex and working capital.'],['Act','Request evidence, a cash-flow model, operator checks and professional reviews.'],['Review','Recalculate base, optimistic and downside cases before each decision gate.']]),
kit('family-continuity','Family Continuity & Legacy Checklist','Organise responsibilities and documents for unforeseen events.','financial','E','15 min',[
 ['Understand','List essential accounts, loans, contacts, estate documents and dependants.'],['Define','Choose who should know where to find information in an emergency.'],['Consider','Verify legal, beneficiary, tax, guardianship and estate matters with relevant professionals.'],['Act','Store document-location instructions securely; never put passwords in this worksheet.'],['Review','Review annually and after a major life event.']]),
kit('career-runway','Career Transition Runway Planner','Protect your essentials while examining a new career or commission model.','career','R','15 min',[
 ['Understand','Calculate necessary monthly spending and how many months accessible savings cover.'],['Define','Define a staged transition condition, not only a target earnings figure.'],['Consider','Check ramp-up time, fixed costs, training, contracts and realistic low-income scenarios.'],['Act','Run a small skills or market test without risking household essentials.'],['Review','Recalculate runway as evidence changes; do not assume commission is guaranteed.']]),
kit('income-skills','Career & Skills Opportunity Planner','Compare opportunities against personal strengths and real constraints.','career','I','15 min',[
 ['Understand','List skills, work preferences, income stability, commitments and available hours.'],['Define','Select one learning or career goal that matches your situation.'],['Consider','Compare multiple routes for costs, licensing, ethics, average outcomes and risks.'],['Act','Choose one informational interview, credential check or pilot project.'],['Review','Reassess after collecting evidence, not just promotional testimonials.']]),
kit('industry-credentials','Regulated Career Readiness Checklist','Research eligibility and authorisation before providing financial products.','career','I','12 min',[
 ['Understand','Record the activities you hope to perform and the jurisdictions involved.'],['Define','Identify the licences, training and registration required for each activity.'],['Consider','Check current FIMM/distributor and any other applicable regulator guidance directly.'],['Act','Contact an authorised distributor or professional body for a documented requirements list.'],['Review','Reconfirm registration and continuing education before client-facing activity.']]),
kit('pipeline-systems','Ethical Opportunity Pipeline Tracker','Understand the quality and sustainability of repeatable business activities.','career','S','20 min',[
 ['Understand','Map existing referral, prospecting and client support activities without listing private client data.'],['Define','Choose useful KPIs: qualified conversations, service quality and follow-up completion.'],['Consider','Evaluate client value, consent, conversion, acquisition cost and cancellations.'],['Act','Test a weekly operating rhythm with a small number of responsible metrics.'],['Review','Use a weekly review to improve quality, not pressure tactics.']]),
kit('unit-economics','Business Unit Economics Worksheet','Check profit per client, sale or student before expanding.','career','S','20 min',[
 ['Understand','Identify revenue per unit, variable costs, fixed costs, capacity and working capital.'],['Define','Set a break-even question to investigate.'],['Consider','Model base and downside cases; include overhead and owner time.'],['Act','Validate assumptions with actual evidence and external checks where needed.'],['Review','Compare forecast to actual results every month.']]),
kit('leadership-5r','5R Leadership Implementation Toolkit','Create systems that work beyond the founder or top salesperson.','career','E','20 min',[
 ['Understand','Identify decisions and tasks that currently depend on one person.'],['Define','Choose one role, quality standard or process to document.'],['Consider','Review accountability, coaching capability, workload and client experience.'],['Act','Delegate one process with a simple checklist and a named responsible person.'],['Review','Review outcomes weekly and adjust rather than blame.']]),
kit('annual-review','Annual R.I.S.E.™ Progress Review','A short annual reflection across all four pillars.','both','E','15 min',[
 ['Understand','Record today’s four pillars, major changes and unresolved questions.'],['Define','Choose one objective that is meaningful and feasible.'],['Consider','Look at trade-offs, risks and what a professional review may need.'],['Act','Write a dated next step and evidence needed.'],['Review','Return to your scorecard in 30–90 days and compare conditions.']])
];
const FLAG_KITS={cash_crisis:'financial-reset',debt_arrears:'financial-reset',fragile_buffer:'financial-reset',dependent_cover:'family-protection',investing_essential:'asset-liquidity',concentration:'asset-liquidity',business_feasibility:'preschool-due-diligence',career_arrears:'career-runway',switch_runway:'career-runway',sales_authorisation:'industry-credentials',unit_trust_age:'industry-credentials',weak_business_model:'unit-economics'};
const PRIMARY={financial:{R:'financial-reset',I:'second-income',S:'asset-liquidity',E:'family-continuity'},career:{R:'career-runway',I:'income-skills',S:'pipeline-systems',E:'leadership-5r'}};
function match(report,profile,extra=[]){
  if(!report.complete && !report.alerts.length && Object.values(report.byPillar).every(x=>x.score===null))return [CATALOG.find(x=>x.id==='complete-your-snapshot')];
  const ids=[];const add=id=>{if(id&&!ids.includes(id))ids.push(id)};
  for(const a of report.alerts.slice(0,3)) add(FLAG_KITS[a.id]);
  add(report.complete&&Object.values(report.byPillar).every(x=>x.score>=80)&&!report.alerts.length?'annual-review':PRIMARY[report.track][report.priority]);
  if(report.track==='financial'){
    if(['business','preschool'].includes(profile.goal))add('preschool-due-diligence');
    if(profile.dependants==='yes'&&report.priority==='R')add('family-protection');
  } else {
    if(profile.goal==='unit_trust')add('industry-credentials');
    if(profile.role==='business_owner')add('unit-economics');
  }
  extra.forEach(add);
  return ids.map(id=>CATALOG.find(x=>x.id===id)).filter(Boolean).slice(0,3);
}
root.RISE_TOOLKITS={CATALOG,PRIMARY,FLAG_KITS,match};
})(typeof globalThis!=='undefined'?globalThis:this);
