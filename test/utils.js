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

function keywordScore(job) {
  const t = ((job.title || '') + (job.summary || '') + (job.companyName || '')).toLowerCase();
  let s = 4;
  if (/senior|staff|lead|principal/.test(t)) s++;
  if (/quality engineer|qa engineer|\bqe\b|sdet|test engineer|software developer in test/.test(t)) s += 2;
  if (/automation|pytest|python|api test/.test(t)) s++;
  if (/remote/.test(t) || job.isRemote) s++;
  if (/clearance|secret|top secret|dod|military|defense|homeland/.test(t)) s = Math.max(1, s - 2);
  if (/manufacturing|medical device|iso 9001|fda/.test(t)) s = Math.min(s, 3);
  if (/junior|associate|entry.level/.test(t)) s = Math.max(1, s - 2);
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
 * @param {string[]} fallback — default searches if no searchTerms configured
 */
function getEffectiveDiceSearches(settings, fallback = []) {
  const base = settings.searchTerms && settings.searchTerms.length
    ? settings.searchTerms.map(t => t + ' remote')
    : fallback;
  const extra = settings.diceSearchTerms && settings.diceSearchTerms.length
    ? settings.diceSearchTerms
    : [];
  return [...new Set([...base, ...extra])];
}

/**
 * getEffectiveIndeedSearches — parameterized version.
 * @param {Object} settings — the settings object
 * @param {Array<{q,loc}>} fallback — default searches if no searchTerms configured
 */
function getEffectiveIndeedSearches(settings, fallback = []) {
  const base = settings.searchTerms && settings.searchTerms.length
    ? settings.searchTerms.map(t => ({ q: t, loc: 'remote' }))
    : fallback;
  const extra = settings.indeedSearchTerms && settings.indeedSearchTerms.length
    ? settings.indeedSearchTerms.map(line => {
        const [q, loc] = line.split('|').map(x => x.trim());
        return { q: q || line.trim(), loc: loc || 'remote' };
      })
    : [];
  const seen = new Set(base.map(x => x.q));
  return [...base, ...extra.filter(x => !seen.has(x.q))];
}

/**
 * getEffectiveZrSearches — parameterized version.
 * @param {Object} settings — the settings object
 * @param {string[]} fallback — default searches if no searchTerms configured
 */
function getEffectiveZrSearches(settings, fallback = []) {
  const base = settings.searchTerms && settings.searchTerms.length
    ? settings.searchTerms
    : fallback;
  const extra = settings.zrSearchTerms && settings.zrSearchTerms.length
    ? settings.zrSearchTerms
    : [];
  return [...new Set([...base, ...extra])];
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
  keywordScore,
  getAppliedJobKeys,
  getDismissedJobKeys,
  getEffectiveDiceSearches,
  getEffectiveIndeedSearches,
  getEffectiveZrSearches,
  getEffectiveLocalAreaRe,
  parseIndeedResults,
};
