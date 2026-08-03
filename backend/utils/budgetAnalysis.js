const utilizationPercent = (actual, allocated) => {
  if (!allocated || allocated <= 0) return 0;
  return round2((Number(actual) / Number(allocated)) * 100);
};

const variance = (actual, allocated) => round2(Number(actual) - Number(allocated));

const variancePercent = (actual, allocated) => {
  if (!allocated || allocated <= 0) return 0;
  return round2((variance(actual, allocated) / Number(allocated)) * 100);
};


const CATEGORY_WEIGHTS = {
  'Venue': 1.3, 'Food and Catering': 1.3, 'Jewellery': 1.2,
  'Bride and Groom Attire': 1.1, 'Reception': 1.1,
  'Photography and Videography': 1.0, 'Decoration': 1.0, 'Priest and Rituals': 1.0,
  'Makeup and Mehendi': 0.9, 'Entertainment': 0.9, 'Transportation': 0.9, 'Accommodation': 0.9,
  'Invitations': 0.8, 'Gifts and Souvenirs': 0.8, 'Miscellaneous': 0.7,
};
const getCategoryWeight = (categoryName) => CATEGORY_WEIGHTS[categoryName] ?? 1.0;


const priorityScore = (utilization, allocatedBudget, totalBudget, categoryName) => {
  let severity = 0;
  if (utilization >= 100) severity = Math.min((utilization - 100) / 100, 1);
  else if (utilization < 50) severity = Math.min((50 - utilization) / 50, 1);

  const impact = totalBudget > 0 ? Number(allocatedBudget) / Number(totalBudget) : 0;
  const weight = getCategoryWeight(categoryName);

  return {
    severity: round2(severity),
    impact: round2(impact),
    weight,
    score: round2(severity * impact * weight * 100),
  };
};

const priorityLabel = (score) => {
  if (score >= 15) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
};
const costPerGuest = (totalEstimated, guestCount) => {
  if (!guestCount || guestCount <= 0) return 0;
  return round2(Number(totalEstimated) / Number(guestCount));
};

const budgetHealthScore = (totalBudget, totalPaid, totalEstimated) => {
  if (!totalBudget || totalBudget <= 0) return 0;
  const spendRatio = Number(totalPaid) / Number(totalBudget);
  const commitRatio = Number(totalEstimated) / Number(totalBudget);
  let score = 100;
  if (commitRatio > 1) score -= Math.min((commitRatio - 1) * 100, 60);
  if (spendRatio > 1) score -= Math.min((spendRatio - 1) * 100, 40);
  return round2(Math.max(0, Math.min(100, score)));
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;



const buildCategoryAnalysis = (categoryTotals, allocations, totalBudget = 0) => {
  const allocMap = new Map(allocations.map(a => [a.category_id, Number(a.allocated_amount)]));
  return categoryTotals.map(c => {
    const allocated = allocMap.get(c.category_id) || 0;
    const estimated = Number(c.total_estimated);
    const actual = Number(c.total_paid); 
    const util = utilizationPercent(actual, allocated);
    const pScore = priorityScore(util, allocated, totalBudget, c.category_name);
    return {
      category_id: c.category_id,
      category_name: c.category_name,
      allocated_budget: allocated,
      estimated_expenses: estimated,
      paid_amount: actual,
      pending_amount: Number(c.total_pending),
      remaining_budget: round2(allocated - actual),
      utilization_percent: util,
      variance: variance(actual, allocated),
      variance_percent: variancePercent(actual, allocated),
      priority_score: pScore.score,
      priority_label: priorityLabel(pScore.score),
      severity: pScore.severity,
      impact: pScore.impact,
      category_weight: pScore.weight,
    };
  });
};
 
 
const generateRecommendations = (categoryAnalysis, eventTotals, totalBudget) => {
  const recommendations = [];

  categoryAnalysis.forEach((cat) => {
    if (cat.allocated_budget <= 0) return; 
    const priorityNote = `Priority Score = Severity(${cat.severity}) × Impact(${cat.impact}) × Weight(${cat.category_weight}) = ${cat.priority_score} → ${cat.priority_label}`;

    if (cat.utilization_percent >= 100) {
      const overBy = round2(cat.utilization_percent - 100);
      recommendations.push({
        category: cat.category_name,
        recommendation: `${cat.category_name} expenses are ${overBy}% above the allocated budget (Variance: Rs ${cat.variance}). Consider reducing spending here or reallocating funds from an under-used category.`,
        triggered_rule: 'R1: utilization_percent >= 100',
        formula_used: 'Utilization % = (Actual Expense / Allocated) × 100; Variance = Actual Expense − Allocated',
        decision_process: `Actual (Rs ${cat.paid_amount}) / Allocated (Rs ${cat.allocated_budget}) × 100 = ${cat.utilization_percent}%, which is >= 100%. ${priorityNote}`,
        priority: cat.priority_label,
      });
    } else if (cat.utilization_percent >= 90) {
      recommendations.push({
        category: cat.category_name,
        recommendation: `${cat.category_name} expenses have reached ${cat.utilization_percent}% of the allocated budget. Monitor future spending carefully.`,
        triggered_rule: 'R2: 90 <= utilization_percent < 100',
        formula_used: 'Utilization % = (Actual Expense / Allocated) × 100',
        decision_process: `Actual (Rs ${cat.paid_amount}) / Allocated (Rs ${cat.allocated_budget}) × 100 = ${cat.utilization_percent}%, within the 90-100% warning band. ${priorityNote}`,
        priority: cat.priority_label,
      });
    } else if (cat.utilization_percent < 50) {
      recommendations.push({
        category: cat.category_name,
        recommendation: `${cat.category_name} is well below budget (${cat.utilization_percent}% used, Rs ${round2(cat.allocated_budget - cat.paid_amount)} unused). You may safely reallocate part of this budget to a category that is over-utilized.`,
        triggered_rule: 'R3: utilization_percent < 50',
        formula_used: 'Utilization % = (Actual Expense / Allocated) × 100',
        decision_process: `Actual (Rs ${cat.paid_amount}) / Allocated (Rs ${cat.allocated_budget}) × 100 = ${cat.utilization_percent}%, below the 50% threshold. ${priorityNote}`,
        priority: cat.priority_label,
      });
    } else {
      recommendations.push({
        category: cat.category_name,
        recommendation: `${cat.category_name} expenses are currently within the allocated budget.`,
        triggered_rule: 'R4: 50 <= utilization_percent < 90',
        formula_used: 'Utilization % = (Actual Expense / Allocated) × 100',
        decision_process: `Utilization is ${cat.utilization_percent}%, a healthy range. ${priorityNote}`,
        priority: cat.priority_label,
      });
    }
  });

  const health = budgetHealthScore(totalBudget, eventTotals.total_paid, eventTotals.total_estimated);
  if (health < 50) {
    recommendations.push({
      category: 'Overall',
      recommendation: `Overall budget health is low (score ${health}/100). Estimated or paid expenses are significantly outpacing the total event budget — review committed expenses across all categories.`,
      triggered_rule: 'R5: overall_health_score < 50',
      formula_used: 'Health Score = 100 - overspend penalties on commit ratio and spend ratio',
      decision_process: `Total Budget = Rs ${totalBudget}, Total Paid = Rs ${eventTotals.total_paid}, Total Estimated = Rs ${eventTotals.total_estimated} → Health Score = ${health}.`,
      priority: 'High',
    });
  } else {
    recommendations.push({
      category: 'Overall',
      recommendation: `Overall spending is healthy and within budget (health score ${health}/100).`,
      triggered_rule: 'R5: overall_health_score >= 50',
      formula_used: 'Health Score = 100 - overspend penalties on commit ratio and spend ratio',
      decision_process: `Health Score computed as ${health} from total budget, paid, and estimated figures.`,
      priority: 'Low',
    });
  }

  return recommendations;
};

    
const generateReallocationSuggestions = (categoryAnalysis) => {
  const giversPool = categoryAnalysis
    .filter(c => c.allocated_budget > 0 && c.utilization_percent < 50)
    .map(c => ({ ...c, unused: round2(c.allocated_budget - c.paid_amount) }))
    .sort((a, b) => a.priority_score - b.priority_score || b.unused - a.unused);

  const receiversPool = categoryAnalysis
    .filter(c => c.allocated_budget > 0 && c.utilization_percent >= 100)
    .map(c => ({ ...c, overspend: round2(c.paid_amount - c.allocated_budget) }))
    .sort((a, b) => b.priority_score - a.priority_score || b.overspend - a.overspend);

  const suggestions = [];
  const receivers = [...receiversPool];

  giversPool.forEach((giver) => {
    let remaining = giver.unused;

    // Keep offering this giver's surplus to receivers, one at a time,
    // until either the surplus runs out or every over-budget category
    // has been covered — instead of stopping after a single match.
    while (remaining > 0 && receivers.length > 0) {
      const receiver = receivers[0];
      const transferAmount = round2(Math.min(remaining, receiver.overspend));
      if (transferAmount <= 0) break;

      suggestions.push({
        give_from: giver.category_name,
        receive_to: receiver.category_name,
        suggested_transfer_amount: transferAmount,
        reason: `${giver.category_name} has Rs ${giver.unused} of unused allocated budget (only ${giver.utilization_percent}% utilized), while ${receiver.category_name} is over budget by Rs ${receiver.overspend} (${receiver.utilization_percent}% utilized). Transferring Rs ${transferAmount} balances both categories.`,
      });

      remaining = round2(remaining - transferAmount);
      receiver.overspend = round2(receiver.overspend - transferAmount);
      if (receiver.overspend <= 0) receivers.shift();
    }
  });

  return suggestions;
};

const mergeCategoryAnalysis = (categoryTotals, allocations, totalBudget = 0) => {
  const analysis = buildCategoryAnalysis(categoryTotals, allocations, totalBudget);
  const covered = new Set(analysis.map(a => a.category_id));

  allocations.forEach((a) => {
    if (!covered.has(a.category_id)) {
      const allocated = Number(a.allocated_amount);
      const pScore = priorityScore(0, allocated, totalBudget, a.category_name);
      analysis.push({
        category_id: a.category_id,
        category_name: a.category_name,
        allocated_budget: allocated,
        estimated_expenses: 0,
        paid_amount: 0,
        pending_amount: 0,
        remaining_budget: allocated,
        utilization_percent: 0,
        variance: variance(0, allocated),
        variance_percent: variancePercent(0, allocated),
        priority_score: pScore.score,
        priority_label: priorityLabel(pScore.score),
        severity: pScore.severity,
        impact: pScore.impact,
        category_weight: pScore.weight,
      });
    }
  });

  return analysis;
};

module.exports = {
  utilizationPercent,
  variance,
  variancePercent,
  costPerGuest,
  budgetHealthScore,
  priorityScore,
  priorityLabel,
  buildCategoryAnalysis,
  mergeCategoryAnalysis,
  generateRecommendations,
  generateReallocationSuggestions,
  round2,
};
