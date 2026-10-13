/* R.I.S.E.™ Diagnostic Engine v4.3 — transparent educational rules, no product recommendations. */
(function(root,factory){const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; root.RISE=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const O=(key,label,score)=>({key,label,score});
const Q=(id,pillar,text,options,weight=1,tip='',na=false)=>({id,pillar,text,options,weight,tip,na});
const QUESTIONS={
 financial:[
 Q('f_r1','R','After paying for food, housing and basic bills, how manageable is your month?',[O('comfortable','I can pay them easily and still have money left',100),O('usually','I can pay them, but some months are tight',75),O('sometimes','I sometimes struggle to pay them',40),O('often','I often struggle to pay them',15),O('overdue','I am behind on essential bills',0)],1.5,'Think about housing, food, utilities and essential transport.'),
 Q('f_r2','R','If your income stopped today, how long could your savings cover your basic bills?',[O('six_plus','6 months or more',100),O('three_five','3–5 months',80),O('one_two','1–2 months',45),O('under_one','Less than 1 month',15),O('none','No savings I can use quickly',0),O('unsure','I am not sure',null)],1.5,'Think about rent, food, bills and loan payments. Count money you could use quickly, not property or locked savings.'),
 Q('f_r3','R','Are you able to pay your loans and debts every month?',[O('none','No debt payments',100),O('easy','I pay on time without much difficulty',85),O('tight','I pay on time, but it is difficult',45),O('missed','I have missed or fallen behind on payments',0)],1.5,'Having a mortgage does not automatically mean poor financial health.'),
 Q('f_r4','R','Do you have insurance now?',[O('yes','Yes, I have insurance',80),O('none','No, I do not have insurance',45),O('unknown','I am not sure',null)],1,'For example, a medical card, life insurance, personal accident insurance or insurance provided by your employer.'),
 Q('f_policy_types','R','Which types of insurance do you have? Select all that apply.',[O('medical','Medical card or hospital insurance',null),O('life','Life insurance (money paid if you pass away)',null),O('critical','Critical illness insurance (payout for certain serious illnesses)',null),O('accident','Personal accident insurance',null),O('employer','Medical or other insurance from my employer',null),O('other','Another type of insurance',null),O('unsure','I have insurance but do not know the type',null),O('none','Actually, I do not have insurance',null)],0,'You can select more than one. For example, you may have a medical card, life insurance and company medical coverage.'),
 Q('f_policy_review','R','Have you checked whether your insurance fits your needs?',[O('yes','Yes, I have checked it',null),O('maybe','I think so, but I am not sure',null),O('no','I may need to review it',null),O('notyet','I have not checked yet',null),O('unknown','I am not sure',null)],0,'Knowing you have insurance is different from knowing what it covers. You do not need to know exact amounts to answer.'),
 Q('f_has_savings','R','Do you currently have any money saved?',[O('regular','Yes, I save money regularly',null),O('sometimes','Yes, I save when I can',null),O('existing','I have savings but I am not adding more now',null),O('none','No savings right now',null),O('unsure','I am not sure',null)],0,'Savings can be in a bank account or somewhere else. This is not the same as emergency money.'),
 Q('f_savings_place','R','Where do you keep money you have saved? Select all that apply.',[O('bank','Bank savings or current account',null),O('fixed','Fixed deposit',null),O('cash','Cash at home',null),O('asm','ASB, ASM or similar funds',null),O('invest','Unit trust, shares or other investments',null),O('epf','EPF / KWSP (retirement savings)',null),O('other','Another place not listed here',null),O('unsure','I am not sure',null)],0,'Choose every place that applies. EPF and some investments may not be easy to use in an emergency.'),
 Q('f_i1','I','Can you depend on your income each month?',[O('stable_diverse','Yes, from more than one source',100),O('stable_one','Yes, from one main source',75),O('variable','It changes but usually covers my needs',55),O('irregular','It is uncertain and sometimes falls short',20),O('none','I do not have a reliable income now',0)],1.4,'Pension or sustainable retirement drawdown can be reliable income.'),
 Q('f_i2','I','After paying your basic bills and loans, how much money is usually left?',[O('large_surplus','I have plenty left over most months',100),O('modest_surplus','I usually have some money left',75),O('small_surplus','I usually have very little left',40),O('break_even','My money just covers my bills',15),O('negative','I often spend more than I earn',0)],1.6),
 Q('f_i3','I','If your main income stopped, do you have another way to earn money?',[O('resilient','Yes, I have reliable backup income',100),O('some','I have a possible backup',70),O('limited','I mainly rely on one income',35),O('none','No, I have not found a backup yet',10)],1),
 Q('f_i4','I','Do you have a practical plan for your income in the next year?',[O('clear','Yes, I have a clear plan I can follow',100),O('some','I have a few realistic ideas',70),O('unclear','I want to, but I do not know how yet',40),O('none','I have no plan at the moment',15),O('na','Not relevant to my current life stage',null)],1,'Retirees may mark not applicable.',true),
 Q('f_s1','S','Are you setting aside money for future goals?',[O('consistent','Yes, every month with a plan',100),O('mostly','Most months',75),O('sometimes','Only when I have extra money',45),O('none','Not at the moment',10),O('existing','I have saved money, but cannot add more right now',55),O('na','I am now using my savings (for example, in retirement)',null)],1.2,'This is about money for future goals, not only money for emergencies.',true),
 Q('f_s2','S','If you invest, is most of your investment money tied to just one investment?',[O('diverse','No, I have different investments',100),O('some','I have a few investments, but one is quite large',75),O('mostly_one','Yes, most is in one investment or business',30),O('no_assets','I do not have investments yet',null),O('unsure','I am not sure',null)],1.3,'This includes property, shares and funds. Having savings in just one bank account does not automatically mean your investments are risky.',true),
 Q('f_s3','S','If you needed money for a planned expense in the next 1–3 years, could you get it easily?',[O('matched','Yes, I can get the money when I need it',100),O('mostly','I can get most of it',75),O('limited','I may need to sell an investment to get it',40),O('illiquid','Most of it is hard to access quickly',15),O('no_plan','I am not sure',25)],1.2),
 Q('f_s4','S','When considering an investment, do you check the risks, costs and when you can get your money back?',[O('process','Yes, I check these before deciding',100),O('basic','I check some of them',70),O('informal','I usually rely on what other people tell me',35),O('no_knowledge','I do not really understand the risks or costs',10),O('na','I have not looked into investing yet',null)],1.1,'If you have not started investing, choose the last option. It will not lower this part of your score.',true),
 Q('f_e1','E','Have you planned how to support yourself when you work less or retire?',[O('plan','Yes, I have worked out the numbers and review them',100),O('partial','I have some savings and a rough target',70),O('vague','I have an idea but have not worked out the money',35),O('none','No plan yet',10)],1.3),
 Q('f_e2','E','Have you organised the money and family records you may need later?',[O('complete','Yes, I know where my records are and have checked them',100),O('partial','Some records are organised, but not everything',65),O('notdone','My records are not organised yet',20),O('unsure','I am not sure which records are useful',null),O('na','Not relevant to me right now',null)],1,'For example: insurance policies, bank and loan information, EPF / KWSP details and a will or nomination if relevant. Do not upload documents here.',true),
 Q('f_e3','E','If you were unavailable, would someone you trust know where your insurance and money records are kept?',[O('ready','Yes, they know where to find the records safely',100),O('some','They could find some of the records',70),O('limited','They would probably have difficulty',30),O('none','No, I have not shown anyone where they are',10)],1,'This means the location of insurance policies, bank or loan records and emergency contacts. You should never share passwords in this tool.')
 ],
 career:[
 Q('c_r1','R','If your work income fell, how long could your savings cover your basic bills?',[O('six_plus','6 months or more',100),O('three_five','3–5 months',75),O('one_two','1–2 months',40),O('under_one','Less than 1 month',15),O('none','No savings I can use',0)],1.5),
 Q('c_r2','R','Can you pay your basic bills and loans each month?',[O('comfortable','I pay everything on time easily',100),O('manageable','I can pay, but must be careful',75),O('strained','I often struggle with my payments',35),O('overdue','I am behind on important payments',0)],1.5),
 Q('c_r3','R','Does your work or business bring in money regularly?',[O('reliable','Yes, it is steady',100),O('mostly','It is steady most months',75),O('volatile','It changes a lot from month to month',35),O('unreliable','No regular income at the moment',5)],1.3),
 Q('c_r4','R','Have you planned how to pay your bills if a new career pays less at first?',[O('stress','Yes, I have worked out costs and a backup plan',100),O('partial','I have some money set aside',70),O('informal','I have thought about it but not made a plan',35),O('none','No, I do not have a backup plan yet',10)],1.2),
 Q('c_i1','I','Do you have skills that could help you earn more?',[O('proven','Yes, I have used them successfully',100),O('strong','Yes, I have some useful skills',75),O('developing','I am still learning useful skills',45),O('unclear','I am not sure what skills I could use',15)],1.3),
 Q('c_i2','I','Are you happy with how your income could grow in the next 1–2 years?',[O('strong','Yes, I have a clear way to grow',100),O('moderate','I see some chances to earn more',75),O('limited','Not much unless something changes',35),O('stalled','I do not see a clear way to grow',10)],1.2),
 Q('c_i3','I','Have you explored ways to grow your earnings in your current work or another role?',[O('evaluated','Yes, I have compared the options carefully',100),O('options','I have looked into a few options',75),O('broad','I have ideas but have not checked them',40),O('unclear','I am not sure yet',15)],1.2),
 Q('c_i4','I','Do you have time to learn new skills or prepare for a different role?',[O('ready','I have time and a realistic learning plan',100),O('mostly','I am mostly ready',75),O('unsure','I am not sure what is required',40),O('notready','I am not ready yet',15)],1.1),
 Q('c_s1','S','Do you have a reliable way to find work, customers or career opportunities?',[O('documented','Yes, I follow a process that works',100),O('regular','I have a fairly regular way',75),O('ad_hoc','I do things differently each time',35),O('none','I do not have a process',10)],1.4),
 Q('c_s2','S','Do you track the work that helps you earn or progress?',[O('review','Yes, I track and review regularly',100),O('some','I track a few things',70),O('rare','I check results once in a while',35),O('none','I do not track my progress yet',10)],1.2),
 Q('c_s3','S','Do you keep in touch with people who may help you grow your career?',[O('steady','I regularly keep in touch',100),O('usually','Most months',75),O('rarely','Only when I need something',40),O('none','I am not building new connections',15)],1.2),
 Q('c_s4','S','Could your team or business keep things running if you were away for two weeks?',[O('resilient','Yes, I have a good backup system',100),O('some','Some work could continue',70),O('fragile','A lot of work stops without me',30),O('none','No, I have not prepared for this',10)],1.2),
 Q('c_e1','E','If you lead people, are you comfortable setting goals and supporting your team?',[O('proven','Yes, I do this well',100),O('some','I have some experience',75),O('learning','I am still learning',45),O('none','I have little experience',20),O('na','Not part of my job right now',null)],1.2,'',true),
 Q('c_e2','E','Does your team have simple written steps for tasks done often?',[O('system','Yes, our team has clear steps and responsibilities',100),O('partial','Some tasks have written steps',70),O('manual','I still do most things myself',35),O('none','I have no written processes yet',15),O('na','Not part of my job right now',null)],1.2,'',true),
 Q('c_e3','E','Do you regularly help your team learn or improve at work?',[O('coaching','Yes, I regularly train or coach others',100),O('informal','I sometimes help others learn',70),O('rare','Only when someone asks me',35),O('none','Not at the moment',20),O('na','Not part of my job right now',null)],1,'',true)
 ]
};
const MODULES={
 financial_investing:[
 Q('f_m_property','S','Is a large share of your savings and investments tied to just one property, business or investment?',[O('diversified','No single holding dominates',100),O('significant','One holding is significant but manageable',65),O('dominates','Yes, most of my invested money is in one place',20),O('unsure','I am not sure',null),O('no_assets','I do not have investments yet',null)]),
 Q('f_m_investliquidity','S','If you invested more money today, would you still have enough cash for your regular bills and emergencies?',[O('protected','Reserve and near-term obligations remain covered',100),O('reduced','Reduced but still reasonably covered',65),O('strained','Would strain important commitments',20),O('essential','I would need money meant for bills or emergencies, or have to borrow',0),O('na','I am not planning to invest more right now',null)])
 ],
 career_industry:[
 Q('c_m_authorisation','I','For unit trust / PRS activities, what is your current registration status?',[O('registered','Appropriately registered for the activity',100),O('preparing','Not yet registered; researching requirements',45),O('unknown','Not sure what is required',null),O('none','Not registered',15)],1,'FIMM registration and distributor authorisation need independent confirmation.'),
 Q('c_m_clientfit','S','How prepared are you to assess client needs and product suitability within your permissions?',[O('trained','Training and compliant processes are in place',100),O('learning','In training or arranging support',65),O('none','No process or training yet',15)])
 ],
 career_switch:[
 Q('c_m_switch','R','Which transition approach are you considering?',[O('gradual','A staged transition while protecting current income',100),O('researched','A planned switch after testing the opportunity',75),O('immediate','An immediate move to uncertain income',15),O('undecided','Not decided',null)]),
 Q('c_m_offer','I','How well have you independently assessed any promised earning opportunity?',[O('verified','Checked actual costs, typical outcomes and obligations',100),O('some','Checked some evidence',60),O('claims','Mainly relying on earnings claims or testimonials',15),O('none','Not assessed',10)])
 ]

};
const PILLARS={R:'Restore',I:'Income',S:'Sustain',E:'Empire'};
const WEIGHTS={financial:{R:.30,I:.25,S:.25,E:.20},career:{R:.20,I:.30,S:.25,E:.25}};
const LABELS={attention:'Needs attention',developing:'Developing',strong:'Strong'};
function tier(score){return score<40?'Needs immediate strengthening':score<60?'Needs attention':score<80?'Developing':'Strong foundation';}
function showLeadership(profile){return profile.track==='career'&&(profile.role==='business_owner'||profile.goal==='leadership');}
function activeCore(profile){return QUESTIONS[profile.track].filter(q=>{
 if(profile.track!=='career')return true;
 if(q.id==='c_r4' && !(profile.goal==='career_change'||profile.switchIntent==='yes'||profile.switchIntent==='maybe'))return false;
 if(q.id==='c_s4' && !showLeadership(profile))return false;
 if(q.pillar==='E'&&!showLeadership(profile))return false;
 return true;
});}
function modulesFor(profile){const result=[];if(profile.track==='financial'){
 if(['investing','property'].includes(profile.goal))result.push('financial_investing');
}else if(profile.track==='career'){
 if(profile.goal==='unit_trust')result.push('career_industry');
 if(profile.goal==='career_change'||profile.switchIntent==='yes'||profile.switchIntent==='maybe')result.push('career_switch');
}return result;}
function questionsFor(profile){if(!profile||!QUESTIONS[profile.track])throw Error('Select a valid scorecard.');return [...activeCore(profile),...modulesFor(profile).flatMap(m=>MODULES[m])];}
function getAnswer(q,value){
 if(value===undefined||value===null||value==='__skip__'||value==='')return{state:'unknown',score:null};
 const keys=String(value).split('|');
 if(keys.length>1){
  if(!['f_policy_types','f_savings_place'].includes(q.id))throw Error('Multiple answers not allowed for '+q.id);
  if(keys.some(k=>!q.options.some(o=>o.key===k))||keys.some(k=>['none','unsure','unknown'].includes(k)))throw Error('Invalid multi-select '+q.id);
  return{state:'unknown',score:null,option:{key:value,label:keys.map(k=>q.options.find(o=>o.key===k).label).join(', ')}};
 }
 const found=q.options.find(x=>x.key===value);if(!found)throw Error('Invalid answer '+q.id+': '+value);
 return{state:found.key==='na'?'na':(found.score===null?'unknown':'scored'),score:found.score,option:found};} 
const plans={
 financial:{
 R:{title:'Strengthen your safety net',toolkit:'30-Day Financial Reset & Family Safety Checklist',steps:['List essential expenses, repayment deadlines and available reserves.','Choose one manageable action to stabilise cash flow or your emergency buffer.','Review existing protection needs and gaps with an appropriately qualified professional, if relevant.']},
 I:{title:'Build a healthier income foundation',toolkit:'Second-Income Readiness Planner',steps:['Review earnings reliability, spending commitments and monthly surplus.','Choose one realistic skill or income pathway to research.','Compare start-up costs, earnings uncertainty and time commitments before taking action.']},
 S:{title:'Make your wealth plan more resilient',toolkit:'Property, Unit Trust & Liquidity Comparison Worksheet',steps:['Map major assets, liabilities, and money needed in the next 1–3 years.','Check asset concentration, liquidity, costs and downside exposure.','Seek a suitability review before choosing any investment product.']},
 E:{title:'Build a financial continuity plan',toolkit:'Family Continuity & Legacy Checklist',steps:['Organise key financial records and emergency contacts securely.','Review future income needs, beneficiaries and estate-document status.','Discuss legal, tax or succession needs with relevant licensed professionals.']}
 },
 career:{
 R:{title:'Secure your career transition',toolkit:'Career Transition Runway Planner',steps:['Calculate how long essential expenses remain covered if income drops.','Assess the true costs, uncertainty and commitments of the proposed move.','Prefer a staged, evidence-led transition until your financial safety net is adequate.']},
 I:{title:'Develop a realistic income strategy',toolkit:'Income Opportunity & Skills Planner',steps:['Identify your strongest marketable skills and income-growth barriers.','Compare several career or business models, including costs and realistic outcomes.','Confirm training and licensing requirements before providing regulated services.']},
 S:{title:'Build repeatable income systems',toolkit:'Opportunity Pipeline & KPI Tracker',steps:['Write down a repeatable weekly prospecting or opportunity-building routine.','Select a small number of useful, ethical activity and outcome measures.','Review conversion, costs and client or employer value before scaling effort.']},
 E:{title:'Grow beyond personal effort',toolkit:'5R Leadership Implementation Toolkit',steps:['Map the work that depends on you alone.','Document one process and assign clear ownership or cross-training.','Create a simple weekly coaching and business-review rhythm.']}
 }};
const GUARD_TEXT={
 cash_crisis:{severity:3,pillar:'R',title:'Essential payments need attention',reason:'You reported overdue essential household payments.',steps:['Prioritise essentials and speak to your providers or creditors about available support.','Avoid additional financial commitments until the immediate shortfall is understood.','Consider independent debt counselling or qualified assistance where appropriate.']},
 debt_arrears:{severity:3,pillar:'R',title:'Debt arrears need attention',reason:'You reported missed repayments or arrears.',steps:['List overdue payments and terms to understand immediate obligations.','Contact lenders early to discuss available repayment options.','Avoid taking on new high-risk investments or income promises as a quick fix.']},
 fragile_buffer:{severity:2,pillar:'R',title:'Income interruption risk',reason:'Limited emergency reserves are combined with uncertain income.',steps:['Estimate your essential monthly expenses and accessible buffer.','Prioritise a manageable reserve-building plan and stabilising income.','Delay additional illiquid or speculative commitments.']},
 dependent_cover:{severity:2,pillar:'R',title:'Review your household protection',reason:'You said you have no insurance and someone depends on your income. This may be worth reviewing.',steps:['List the people and obligations that rely on your income.','Review your existing policy details and exclusions.','Discuss any protection gaps with an appropriately authorised professional.']},
 investing_essential:{severity:3,pillar:'R',title:'Protect essential money first',reason:'Your proposed investment may use essential funds or untested borrowing.',steps:['Separate necessary household reserves from genuinely affordable risk capital.','Assess downside exposure, debt obligations and exit constraints.','Do not treat this assessment as approval of a particular opportunity.']},
 concentration:{severity:2,pillar:'S',title:'Review concentration and liquidity',reason:'Your answers suggest meaningful exposure to a single illiquid asset.',steps:['Estimate the share of net worth held in one asset or business.','Identify near-term expenses that depend on selling that asset.','Compare practical diversification options and their risks with a qualified adviser.']},
 career_arrears:{severity:3,pillar:'R',title:'Stabilise commitments before switching',reason:'Your essential commitments are overdue.',steps:['Review overdue commitments and repayment options.','Build a transition budget based on conservative income assumptions.','Avoid treating commission earnings as guaranteed.']},
 switch_runway:{severity:3,pillar:'R',title:'Avoid an unsupported income leap',reason:'You are considering an uncertain-income career move with less than three months of accessible runway.',steps:['Plan how essential bills would be covered under a low-earning scenario.','Test the opportunity part-time or in a staged transition where possible.','Verify earnings evidence, entry costs and contractual obligations.']},
};
const is=(a,k)=>a===k;const oneOf=(a,arr)=>arr.includes(a);
function alertsFor(p,a){const alerts=[];const add=(cond,id)=>{if(cond)alerts.push({id,...GUARD_TEXT[id]})};if(p.track==='financial'){
 add(is(a.f_r1,'overdue'),'cash_crisis');add(is(a.f_r3,'missed'),'debt_arrears');
 add(oneOf(a.f_r2,['none','under_one'])&&oneOf(a.f_i1,['irregular','none']),'fragile_buffer');
 add(p.dependants==='yes'&&is(a.f_r4,'none'),'dependent_cover');

 add(is(a.f_m_investliquidity,'essential'),'investing_essential');
 add(is(a.f_m_property,'dominates')&&(oneOf(a.f_s3,['limited','illiquid'])||oneOf(a.f_m_investliquidity,['reduced','strained'])),'concentration');

 }else{
 add(is(a.c_r2,'overdue'),'career_arrears');
 add((p.switchIntent==='yes'||p.goal==='career_change')&&oneOf(a.c_r1,['one_two','under_one','none'])&&(a.c_m_switch!=='gradual'),'switch_runway');



 }
 return alerts.sort((a,b)=>b.severity-a.severity || 'RISE'.indexOf(a.pillar)-'RISE'.indexOf(b.pillar) || a.id.localeCompare(b.id));}
function assess(profile,answers){if(!profile||!WEIGHTS[profile.track])throw Error('Invalid track');const a=answers||{},base=activeCore(profile);const stats={};let scoreTotal=0, totalWeight=0;let fullEligible=0,fullAnswered=0;const unknown=[];
 for(const pillar of Object.keys(PILLARS)){
  const group=base.filter(q=>q.pillar===pillar);let eligible=0,scoredWeight=0,sum=0,count=0,answeredCount=0;
  for(const q of group){const val=getAnswer(q,a[q.id]);if(val.state==='na')continue;eligible+=q.weight;fullEligible+=q.weight;if(val.state==='scored'){sum+=val.score*q.weight;scoredWeight+=q.weight;fullAnswered+=q.weight;count++;answeredCount++;} else unknown.push(q.id);}
  const coverage=eligible?scoredWeight/eligible:0;const sc=(count>=2&&coverage>=.6)?Math.round(sum/scoredWeight):null;
  stats[pillar]={name:PILLARS[pillar],score:sc,coverage:Math.round(coverage*100),answered:count,eligible:group.length,level:sc===null?'Insufficient information':tier(sc)};
  if(sc!==null){scoreTotal+=sc*WEIGHTS[profile.track][pillar];totalWeight+=WEIGHTS[profile.track][pillar]};
 }
 const confidence=fullEligible?Math.round(fullAnswered/fullEligible*100):0;
 const complete=totalWeight>=.70&&confidence>=70&&Object.values(stats).filter(x=>x.score!==null).length>=3;
 const overall=complete?Math.round(scoreTotal/totalWeight):null;
 const alerts=alertsFor(profile,a);const scored=Object.entries(stats).filter(([k,v])=>v.score!==null);
 const weak=scored.sort((a,b)=>a[1].score-b[1].score || 'RISE'.indexOf(a[0])-'RISE'.indexOf(b[0]));
 const concern=alerts.find(x=>x.severity>=2);const allStrong=complete&&!concern&&Object.values(stats).every(v=>v.score>=80);const matchedGoal=({investing:'S',property:'S',income:'I',unit_trust:'I',career_change:'I',business:'I',leadership:'E',legacy:'E',security:'R'})[profile.goal];const priority=concern?concern.pillar:(allStrong?(matchedGoal||'E'):(weak[0]?weak[0][0]:'R'));const basePlan=plans[profile.track][priority];const emptySnapshot=!concern&&scored.length===0;const plan=allStrong?{...basePlan,toolkit:'Annual R.I.S.E.™ Progress Review Checklist'}:basePlan;
 const reasons=base.filter(q=>q.pillar===priority).map(q=>({q,val:getAnswer(q,a[q.id])})).filter(x=>x.val.score!==null).sort((x,y)=>x.val.score-y.val.score).slice(0,2).map(x=>({question:x.q.text,response:x.val.option.label,score:x.val.score}));
 const moduleResults=modulesFor(profile).map(module=>{const questions=MODULES[module];const values=questions.map(q=>({question:q.text,answer:getAnswer(q,a[q.id])}));return{module,answered:values.filter(x=>x.answer.state==='scored').length,total:questions.length}});
 return {version:'4.3 pilot',track:profile.track,overall,complete,confidence,byPillar:stats,priority,priorityName:PILLARS[priority],headline:concern?concern.title:(emptySnapshot?'More information is needed for a diagnostic':(allStrong?'Keep building on your strengths':plan.title)),priorityReason:concern?concern.reason:(emptySnapshot?'Too few core responses were provided to identify a meaningful weakest pillar.':(allStrong?'All measured pillars currently appear strong; periodic review still matters.':'This pillar currently has the lowest available score.')),severity:concern?concern.severity:0,alerts,plan,steps:concern?concern.steps:(emptySnapshot?['Return to the questionnaire and answer additional core questions where possible.','Review any questions you marked as unknown or not applicable.','Recheck your snapshot once at least two meaningful answers are available in every pillar.']:(allStrong?['Maintain the habits and safeguards that support your strongest pillars.','Recheck your goals and insurance, bank and family records at least once a year.','Choose one development priority that fits your present needs.']:plan.steps)),reasons,modules:moduleResults,unknown,disclaimer:'Educational self-assessment only, not a validated clinical, credit or regulated financial-advice instrument. No recommendation of a specific product or financial opportunity.'};
}
function templateAnswers(profile,key){const all={};for(const q of questionsFor(profile)){const opts=q.options.filter(o=>typeof o.score==='number');if(!opts.length)all[q.id]='__skip__';else if(key==='high')all[q.id]=opts.slice().sort((a,b)=>b.score-a.score)[0].key;else if(key==='low')all[q.id]=opts.slice().sort((a,b)=>a.score-b.score)[0].key;else all[q.id]='__skip__'}return all;}
return {PILLARS,QUESTIONS,MODULES,WEIGHTS,modulesFor,questionsFor,activeCore,showLeadership,assess,alertsFor,templateAnswers,tier,plans};
});
