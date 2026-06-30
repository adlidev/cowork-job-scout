/**
 * utils.js — Pure utility functions extracted from dashboard.html for testing.
 *
 * Functions here are either fully pure or have had their localStorage/global
 * dependencies turned into explicit parameters so they can be exercised in Node
 * without mocking browser APIs.
 *
 * These functions must stay in sync with dashboard.html. When you change logic
 * in dashboard.html, update the corresponding function here and add/update tests.
 */

// ─── String / display utilities ───────────────────────────────────────────────

function normalizeForMatch(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreClass(s) {
  if (s >= 9) return 's9';
  if (s >= 8) return 's8';
  if (s >= 7) return 's7';
  if (s >= 6) return 's6';
  return 's5';
}

function sourceBadgeClass(src) {
  if (!src) return 'b-other';
  const s = src.toLowerCase();
  if (s === 'dice')         return 'b-dice';
  if (s === 'indeed')       return 'b-indeed';
  if (s === 'ziprecruiter') return 'b-ziprecruiter';
  if (s === 'linkedin')     return 'b-linkedin';
  if (s === 'glassdoor')    return 'b-glassdoor';
  if (s === 'jsearch')      return 'b-jsearch';
  return 'b-other';
}

function typeInfo(types, isRemote) {
  const t = (types || []).join('').toLowerCase();
  if (isRemote || t.includes('remote')) return { label: 'Remote', cls: 't-remote' };
  if (t.includes('hybrid'))             return { label: 'Hybrid', cls: 't-hybrid' };
  return { label: 'On-Site', cls: 't-onsite' };
}

/**
 * formatDate — relative date from a date string.
 * Accepts optional `now` (ms timestamp) for deterministic testing.
 */
function formatDate(str, now = Date.now()) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str.replace(/^\w+ /, '').replace(/, \d{4}$/, '');
  const diff = Math.floor((now - d) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : diff + 'd ago';
}

function fmtShortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * getWeekBounds — start/end of the week at a given offset from current week.
 * Accepts optional `now` Date for deterministic testing.
 */
function getWeekBounds(offset, now = new Date()) {
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day + offset * 7);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return { start: sunday, end: saturday };
}

// ─── Job classification ───────────────────────────────────────────────────────

function isDefenseRole(job) {
  const t = [job.title, job.summary, job.companyName].filter(Boolean).join(' ').toLowerCase();
  return /clearance|secret|top secret|\bdod\b|military|defense contractor|homeland security/.test(t);
}

function getJobArrangement(job) {
  const types = (job.workplaceTypes || []).join(' ').toLowerCase();
  if (job.isRemote || types.includes('remote')) return 'remote';
  if (types.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function meetsWorkArrangement(job, cfg) {
  const arr = cfg.workArrangements || ['remote'];
  if (!arr.length) return true;
  return arr.includes(getJobArrangement(job));
}

function meetsMinSalary(job, min, hideNoSalary) {
  const nums = (job.salary || '').match(/\d[\d,]*/g);
  if (!nums) return !hideNoSalary;
  if (!min || min <= 0) return true;
  const maxVal = Math.max(...nums.map(n => parseInt(n.replace(/,/g, ''))));
  return (maxVal < 1000 ? maxVal * 1000 : maxVal) >= min;
}

function isNonSalaried(job) {
  const salary  = (job.salary || '').toLowerCase();
  const empType = (job.employmentType || '').toLowerCase();
  const summary = (job.summary || '').toLowerCase();
  if (/\/hr\b|per hour|\/hour/.test(salary)) return true;
  if (/\bcontract\b|\btemp\b|temporary|part.?time/.test(empType)) return true;
  if (/\b(c2c|1099|w-?2 contract|contract-to-hire|temp-to-perm|contract position|month contract)\b/.test(summary)) return true;
  return false;
}

/**
 * isHybridOutsideLocalArea — parameterized version.
 * In dashboard.html this calls getEffectiveLocalAreaRe(); here we take it directly.
 */
function isHybridOutsideLocalArea(job, localAreaRe) {
  if (job.isRemote) return false;
  const types = (job.workplaceTypes || []).join(' ').toLowerCase();
  if (types.includes('remote')) return false;
  const loc = (job.jobLocation?.displayName || '').toLowerCase();
  if (localAreaRe.test(loc)) return false;
  return true;
}

// Return true if any significant word in skillName appears in text (word-boundary aware).
function skillMatchesText(skillName, text) {
  const parts = skillName.toLowerCase().split(/[\/,\s\-]+/).filter(p => p.length > 2);
  return parts.some(p => new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text));
}

function keywordScore(job, penaltyTerms, skillsItems) {
  const terms = penaltyTerms || [];
  const t = [job.title, job.summary, job.companyName].filter(Boolean).join(' ').toLowerCase();
  let s = 4;
  if (/senior|staff|lead|principal/.test(t)) s++;
  if (/quality engineer|qa engineer|\bqe\b|sdet|test engineer|software developer in test/.test(t)) s += 2;
  if (/automation|pytest|python|api test/.test(t)) s++;
  if (/remote/.test(t) || job.isRemote) s++;
  if (/clearance|secret|top secret|dod|military|defense|homeland/.test(t)) s = Math.max(1, s - 2);
  if (/junior|associate|entry.level/.test(t)) s = Math.max(1, s - 2);
  if (terms.length) {
    const penaltyRe = new RegExp(
      terms.map(term => (/^\w/.test(term) ? '\\b' : '') + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/\w$/.test(term) ? '\\b' : '')).join('|')
    );
    if (penaltyRe.test(t)) s = Math.max(1, s - 1);
  }
  // Skills boost: confident skills (4-5) that appear in the job text add up to +2 total.
  const skills = Array.isArray(skillsItems) ? skillsItems : [];
  if (skills.length) {
    let skillBoost = 0;
    for (const sk of skills) {
      if (!sk.name || sk.confidence < 4) continue;
      if (!skillMatchesText(sk.name, t)) continue;
      // If job text mentions "X+ years" of this skill, check candidate's years.
      const skParts = sk.name.toLowerCase().split(/[\/,\s\-]+/).filter(p => p.length > 2);
      const yrsPattern = skParts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const yrsRe = new RegExp('(\\d+)\\+?\\s*(?:years?|yrs?)[^.]*(?:' + yrsPattern + ')', 'i');
      const yrsMatch = t.match(yrsRe);
      if (yrsMatch && parseInt(yrsMatch[1]) > (sk.years || 0)) continue; // underqualified in years
      skillBoost = Math.min(2, skillBoost + 1);
    }
    s = Math.min(10, s + skillBoost);
  }
  return Math.min(10, s);
}

// ─── Activity / dismissal key helpers ────────────────────────────────────────

/**
 * getAppliedJobKeys — parameterized version.
 * In dashboard.html this calls getActs(); here we take the activities object directly.
 * @param {Object} acts — the raw activities object from localStorage
 */
function getAppliedJobKeys(acts) {
  const keys = new Set();
  for (const a of Object.values(acts || {})) {
    if (a.type === 'Job Application' && a.employer && a.role) {
      keys.add(normalizeForMatch(a.employer) + '|' + normalizeForMatch(a.role));
    }
  }
  return keys;
}

/**
 * getDismissedJobKeys — parameterized version.
 * In dashboard.html this calls getDismissedMap(); here we take the map directly.
 * @param {Object} dismissedMap — { [guid]: { companyName, title, ... } }
 */
function getDismissedJobKeys(dismissedMap) {
  const keys = new Set();
  for (const entry of Object.values(dismissedMap || {})) {
    if (entry.companyName && entry.title) {
      keys.add(normalizeForMatch(entry.companyName) + '|' + normalizeForMatch(entry.title));
    }
  }
  return keys;
}

// ─── Search term helpers ──────────────────────────────────────────────────────

/**
 * getEffectiveDiceSearches — parameterized version.
 * @param {Object} settings — the settings object
 * @param {string[]} fallback — default searches if no diceSearchTerms or searchTerms configured
 */
function getEffectiveDiceSearches(settings, fallback = []) {
  const terms = settings.diceSearchTerms && settings.diceSearchTerms.length ? settings.diceSearchTerms
    : settings.searchTerms && settings.searchTerms.length ? settings.searchTerms
    : fallback;
  const wantsRemote = !settings.workArrangements || settings.workArrangements.includes('remote');
  return [...new Set(terms.map(t => t.trim()).filter(Boolean).map(t => {
    if (!wantsRemote || /\bremote\b/i.test(t)) return t;
    return t + ' remote';
  }))];
}

/**
 * getEffectiveIndeedSearches — parameterized version.
 * @param {Object} settings — the settings object
 * @param {string[]} fallback — q strings to use if no per-board or legacy terms configured
 */
function getEffectiveIndeedSearches(settings, fallback = []) {
  const lines = settings.indeedSearchTerms && settings.indeedSearchTerms.length ? settings.indeedSearchTerms
    : settings.searchTerms && settings.searchTerms.length ? settings.searchTerms
    : fallback;
  const seen = new Set();
  return lines.map(line => {
    const [q, loc] = line.split('|').map(x => x.trim());
    return { q: q || line.trim(), loc: loc || 'remote' };
  }).filter(x => { if (!x.q || seen.has(x.q)) return false; seen.add(x.q); return true; });
}

/**
 * getEffectiveZrSearches — parameterized version.
 * @param {Object} settings — the settings object
 * @param {string[]} fallback — default searches if no per-board or legacy terms configured
 */
function getEffectiveZrSearches(settings, fallback = []) {
  const terms = settings.zrSearchTerms && settings.zrSearchTerms.length ? settings.zrSearchTerms
    : settings.searchTerms && settings.searchTerms.length ? settings.searchTerms
    : fallback;
  return [...new Set(terms.map(t => t.trim()).filter(Boolean))];
}

/**
 * getEffectiveLocalAreaRe — parameterized version.
 * @param {Object} settings — the settings object
 * @param {RegExp} fallback — default regex if no localMetroCities configured
 */
function getEffectiveLocalAreaRe(settings, fallback = /remote/i) {
  if (!settings.localMetroCities || !settings.localMetroCities.length) return fallback;
  const cities = ['remote', ...settings.localMetroCities]
    .map(c => c.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('\\b(' + cities.join('|') + ')\\b', 'i');
}

// ─── Indeed result parser ─────────────────────────────────────────────────────

function parseIndeedResults(text) {
  const jobs = [];
  if (!text) return jobs;
  for (const block of text.split(/\n(?=\*\*Job Title:\*\*)/).filter(b => b.includes('**Job Title:**'))) {
    const get = f => {
      const m = block.match(new RegExp(`\\*\\*${f}:\\*\\*\\s*([^\n]+)`));
      return m ? m[1].trim() : '';
    };
    const loc = get('Location');
    const isRemote = loc.toLowerCase().includes('remote');
    const comp = get('Compensation');
    jobs.push({
      guid: 'indeed_' + get('Job Id'),
      title: get('Job Title').replace(/^\(Remote\)\s*/i, '').trim(),
      companyName: get('Company'),
      jobLocation: { displayName: loc },
      postedDate: get('Posted on'),
      salary: comp === 'N/A' ? null : comp,
      employmentType: get('Job Type'),
      detailsPageUrl: get('View Job URL'),
      workplaceTypes: isRemote ? ['Remote'] : ['On-Site'],
      isRemote,
      source: 'Indeed',
      summary: '',
    });
  }
  return jobs;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  normalizeForMatch,
  esc,
  scoreClass,
  sourceBadgeClass,
  typeInfo,
  formatDate,
  fmtShortDate,
  getWeekBounds,
  isDefenseRole,
  getJobArrangement,
  meetsWorkArrangement,
  meetsMinSalary,
  isNonSalaried,
  isHybridOutsideLocalArea,
  skillMatchesText,
  keywordScore,
  getAppliedJobKeys,
  getDismissedJobKeys,
  getEffectiveDiceSearches,
  getEffectiveIndeedSearches,
  getEffectiveZrSearches,
  getEffectiveLocalAreaRe,
  parseIndeedResults,
};
