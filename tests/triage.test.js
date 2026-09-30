const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.sessionStorage = global.localStorage;
global.document = { readyState: 'complete', documentElement: { classList: { toggle() {}, contains() { return false; }, add() {} } }, querySelectorAll: () => [], addEventListener() {}, getElementById() { return null; }, body: {} };
global.window = { addEventListener() {}, location: { pathname: '/dashboard.html', search: '' }, lucide: null };
global.navigator = { onLine: true };
global.location = { protocol: 'file:' };
global.CustomEvent = function () {};

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'index.js'), 'utf8');
const mod = { exports: {} };
new Function('module', src + ';module.exports = { RC, RCAgent };')(mod);
const { RC, RCAgent } = mod.exports;

const sev = (age, vitals, extra) => RC.overallSeverity(Object.assign({ age: String(age), vitals }, extra || {}));

test('child with SpO2 90 is urgent', () => assert.strictEqual(sev(4, { spo2: '90' }), 'urgent'));
test('child heart rate 128 at age 4 is clear', () => assert.strictEqual(sev(4, { hr: '128', temp: '36.8' }), 'clear'));
test('child heart rate 152 at age 2 is review', () => assert.strictEqual(sev(2, { hr: '152' }), 'review'));
test('infant under 3 months with fever is urgent', () => assert.strictEqual(sev(2 / 12, { temp: '38.2' }), 'urgent'));
test('child fever 39.2 is review', () => assert.strictEqual(sev(4, { temp: '39.2' }), 'review'));
test('fever 39.5 is urgent', () => assert.strictEqual(sev(30, { temp: '39.5' }), 'urgent'));
test('child low systolic for age is urgent', () => assert.strictEqual(sev(4, { bpSys: '60', bpDia: '40' }), 'urgent'));
test('adult 176/108 is urgent', () => assert.strictEqual(sev(54, { bpSys: '176', bpDia: '108' }), 'urgent'));
test('adult 140/90 is review', () => assert.strictEqual(sev(40, { bpSys: '140', bpDia: '90' }), 'review'));
test('adult 118/76 is clear', () => assert.strictEqual(sev(31, { bpSys: '118', bpDia: '76' }), 'clear'));
test('adult SpO2 93 is review, 91 is urgent', () => {
  assert.strictEqual(sev(40, { spo2: '93' }), 'review');
  assert.strictEqual(sev(40, { spo2: '91' }), 'urgent');
});
test('adult heart rate 104 is review, 135 is urgent', () => {
  assert.strictEqual(sev(40, { hr: '104' }), 'review');
  assert.strictEqual(sev(40, { hr: '135' }), 'urgent');
});
test('pregnancy raises BP sensitivity', () => {
  assert.strictEqual(sev(28, { bpSys: '145', bpDia: '92' }, { pregnant: true }), 'review');
  assert.strictEqual(sev(28, { bpSys: '165', bpDia: '112' }, { pregnant: true }), 'urgent');
  assert.strictEqual(sev(28, { bpSys: '150', bpDia: '95' }, { pregnant: true }), 'review');
});
test('fast breathing for a 6 month old is flagged', () => assert.strictEqual(sev(0.5, { rr: '55' }), 'review'));
test('missing vitals produce no flags', () => assert.strictEqual(sev(30, { bpSys: '', bpDia: '', temp: '', hr: '', spo2: '' }), 'clear'));

const reply = q => RCAgent.respond(q).text;

test('assistant flags danger signs', () => assert.match(reply('child is lethargic and had convulsions'), /urgent/i));
test('assistant ignores negated danger signs', () => assert.doesNotMatch(reply('no convulsions, BP 118/76'), /Danger signs reported/));
test('assistant tolerates typos', () => assert.match(reply('presure guidelines'), /Blood Pressure Triage/));
test('assistant does not confuse doctors with ORS', () => assert.doesNotMatch(reply('doctors'), /ORS Guidelines/));
test('assistant calculates ORS from weight', () => assert.match(reply('diarrhea some dehydration 12 kg'), /900 ml/));
test('assistant refuses dosing', () => assert.match(reply('what dose of paracetamol'), /cannot diagnose or prescribe/));
test('assistant reports guidance version', () => assert.match(reply('fever protocol'), /Guidance v1\.0/));