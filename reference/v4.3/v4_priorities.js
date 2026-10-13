/* V4.3: 2 evidence-based priorities, matched to eight PDFs. Advisory educational logic only. */
(function(root){'use strict';
const P={R:'Restore',I:'Income',S:'Sustain',E:'Empire'};
const mapAlert={cash_crisis:'TK04',debt_arrears:'TK04',career_arrears:'TK06',switch_runway:'TK06',fragile_buffer:'TK03',dependent_cover:'TK02',investing_essential:'TK05',concentration:'TK05',};
const actionByToolkit={
 TK01:['Work out how much extra money you want each month.','Compare one or two income ideas based on your skills, time and costs.','Test one small opportunity and check what you really keep after costs.'],
 TK02:['Gather your medical and life insurance policy details.','Write down the coverage amounts, key limits and who relies on your income.','Discuss any unclear areas with an appropriately qualified person before changing policies.'],
 TK03:['Add up your basic monthly bills and the savings you can access.','Choose a realistic savings target and a small amount to set aside.','Check your progress next month and adjust if needed.'],
 TK04:['Write down income, basic bills and minimum debt payments.','Contact providers early if essential payments are overdue.','Pick one manageable change and check your numbers next month.'],
 TK05:['List your investments and when you might need the money.','Check how much is tied to one investment and how much cash you can access.','Compare risks and questions before committing more money.'],
 TK06:['Calculate how long your available savings can cover basic bills.','Compare career options and check training costs and realistic earnings.','Run a small test before making a big financial commitment.'],
 TK07:['Estimate startup costs, monthly costs and possible income.','Calculate how many customers or sales are needed to cover running costs.','Test your assumptions and a slow-month scenario before investing.'],
 TK08:['List the repeat tasks that depend on you.','Choose one task to document and teach to someone else.','Review quality, time saved and team feedback after 30 days.']
};
const goalPillar={income:'I',career_change:'I',unit_trust:'I',security:'R',investing:'S',property:'S',business:'I',financial_career:'I',leadership:'E',legacy:'E'};
function pillarCard(profile,answers,report,pillar){const sc=report.byPillar[pillar]?.score;
 const c={pillar,score:sc,kind:'score',severity:0,rank:sc==null?0:100-sc,topic:'',reason:'',toolkit:null};
 if(sc==null)return null;
 if(profile.track==='financial'){
  if(pillar==='R'){
   if(answers.f_r4==='yes'&&profile.dependants==='yes'&&['maybe','no','notyet','unknown'].includes(answers.f_policy_review)){
    c.topic='Check what your insurance covers';c.reason='You said you already have some insurance, and people depend on you. It may help to check what is covered before deciding whether anything needs to change.';c.toolkit='TK02';c.rank+=22;
   } else if(['none','under_one','one_two'].includes(answers.f_r2)){
    c.topic='Build your emergency savings';c.reason='You said your savings may not cover many months of basic bills. Start with a small, realistic cash backup.';c.toolkit='TK03';
   }else{c.topic='Keep your day-to-day money steady';c.reason='Your answers suggest it may be worth checking bills, savings and financial commitments.';c.toolkit='TK04'}
  }else if(pillar==='I'){
   c.topic='Explore ways to grow your income';c.reason=profile.goal==='income'?'You said you want to earn more. Your Income answers suggest this is worth looking at with a realistic plan.':'Your income answers suggest room to build a steadier or stronger earning plan.';c.toolkit='TK01';
  }else if(pillar==='S'){
   c.topic='Review your savings and investment choices';c.reason='It may help to review when you need money, how quickly you can access it and what risks you are taking.';c.toolkit='TK05';
  }else{c.topic='Plan your longer-term financial goals';c.reason='You may benefit from setting a clearer plan for later-life needs and family responsibilities.';c.toolkit='TK05';}
 }else{
  if(pillar==='R'){c.topic='Plan a safer career move';c.reason='Your answers suggest checking how long you can pay basic bills if your income changes.';c.toolkit='TK06';}
  if(pillar==='I'){c.topic='Build a practical career and income plan';c.reason='You may have room to grow your skills, compare opportunities and plan earnings realistically.';c.toolkit=profile.goal==='income'?'TK01':'TK06';}
  if(pillar==='S'){c.topic='Check how your work or business can improve';c.reason='Your answers suggest it could help to review repeatable work, customers and business costs.';c.toolkit='TK08';}
  if(pillar==='E'){c.topic='Build better team systems';c.reason='You may benefit from clear team roles and processes that keep work running without you doing everything.';c.toolkit='TK08';}
 }
 if(goalPillar[profile.goal]===pillar)c.rank+=20;
 return c;
}
function enrich(report,profile,answers){const r={...report,version:'4.3 pilot'};
 const flags=(r.alerts||[]).filter(a=>!(a.id==='dependent_cover'&&answers.f_r4!=='none'));
 r.alerts=flags;
 const cards=Object.keys(P).map(k=>pillarCard(profile,answers,r,k)).filter(Boolean);
 const allStrong=r.complete&&flags.length===0&&cards.length>=3&&cards.every(c=>c.score>=80);
 if(allStrong){
  const goal=goalPillar[profile.goal]||'R';const choices={
   R:{title:'Keep your money foundation strong',toolkit:'TK03',reason:'Your answers suggest a strong foundation. Keep checking your savings, bills and protection as life changes.',steps:['Check your available emergency savings once a year.','Review your major bills and family needs after big life changes.','Keep doing the money habits that are already working for you.']},
   I:{title:'Plan your next income goal',toolkit:'TK01',reason:'Your income picture looks strong. You can explore your next earning goal at a comfortable pace.',steps:['Decide whether growing your income is still a personal goal.','Compare ideas for time, cost and what you keep after expenses.','Only test opportunities that fit your existing commitments.']},
   S:{title:'Keep your savings and investments on track',toolkit:'TK05',reason:'You appear to be doing well in this area. Periodic checks can help you stay on track.',steps:['Review what you own and when you may need the money.','Check fees, access to cash and any concentration risk.','Seek qualified guidance before making major changes.']},
   E:{title:'Keep your long-term plan up to date',toolkit:profile.track==='career'?'TK08':'TK05',reason:'Your results look strong. Revisit longer-term goals as family, work and responsibilities change.',steps:['Write down one longer-term goal for the next year.','Check your insurance, bank and loan records, or team responsibilities.','Set a date to review the plan again.']}
  };
  const item=choices[goal];r.priorities=[{number:1,pillar:goal,pillarName:P[goal],title:item.title,reason:item.reason,toolkit:item.toolkit,kind:'maintain',actions:item.steps}];
  r.priority=goal;r.priorityName=P[goal];r.headline=item.title;r.priorityReason='No urgent concerns stood out from your answers. '+item.reason;r.steps=item.steps;r.reasons=[];return r;
 }
 // Severe known conditions have precedence; light coverage review never becomes a critical override.
 const urgent=flags.filter(a=>a.severity>=3);
 const important=flags.filter(a=>a.severity===2&&['dependent_cover','fragile_buffer','concentration'].includes(a.id));
 const priority=[];
 const add=(c)=>{if(!c||priority.length===2||priority.some(p=>p.pillar===c.pillar||p.toolkit===c.toolkit))return;priority.push(c)};
 for(const f of [...urgent,...important]){
  if(priority.length===2)break;
  let c={pillar:f.pillar,topic:f.title,reason:f.reason,toolkit:mapAlert[f.id],severity:f.severity,kind:'flag'};
  if(f.id==='dependent_cover'){c.topic='Check your family insurance needs';c.reason='You said you do not currently have insurance and someone depends on your income. Consider reviewing your situation with an appropriately qualified person.';}
  add(c);
 }
 const ordered=cards.sort((a,b)=>b.rank-a.rank);
 for(const c of ordered){if(priority.length>=2)break;if(c.rank>=20||profile.goal&&goalPillar[profile.goal]===c.pillar)add(c);}
 if(!priority.length&&ordered.length)add(ordered[0]);
 // One priority is better than an invented second one. We need at least a meaningful gap or supported review.
 r.priorities=priority.map((c,i)=>({number:i+1,pillar:c.pillar,pillarName:P[c.pillar],title:c.topic,reason:c.reason,toolkit:c.toolkit,kind:c.kind}));
 if(priority[0]){
  const primary=priority[0];
  r.priority=primary.pillar;r.priorityName=P[primary.pillar];r.headline=primary.topic;r.priorityReason=primary.reason;
  const matchingFlag=flags.find(f=>f.title===primary.topic);
  r.steps=matchingFlag?.steps||actionByToolkit[primary.toolkit]||r.steps;
  r.reasons=(root.RISE?.QUESTIONS?.[profile.track]||[]).filter(q=>q.pillar===primary.pillar).map(q=>({q,opt:q.options.find(o=>o.key===answers[q.id])})).filter(x=>x.opt&&typeof x.opt.score==='number').sort((a,b)=>a.opt.score-b.opt.score).slice(0,2).map(x=>({question:x.q.text,response:x.opt.label,score:x.opt.score}));
 }
 return r;
}
root.RISE_V4={enrich,pillarCard,actionsForToolkit:(id)=>actionByToolkit[id]||[]};
})(globalThis);
