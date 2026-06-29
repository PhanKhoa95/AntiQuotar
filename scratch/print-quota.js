const { execSync } = require('child_process');
const out = execSync('npx antigravity-usage quota --all --json');
console.log(JSON.stringify(JSON.parse(out).map(a => ({
  email: a.email,
  models: a.snapshot.models.map(m => ({
    label: m.label,
    modelId: m.modelId,
    rp: m.remainingPercentage,
    ms: m.timeUntilResetMs,
    isExhausted: m.isExhausted,
    resetTime: m.resetTime
  }))
})), null, 2));
