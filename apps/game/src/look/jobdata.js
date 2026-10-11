// The work you can do in the world for Efforts (Elvis, 11 October 2026: "introduce activities or things around the
// world that can allow users to earn more effort beyond just recycling ... report a crime or help someone fix their
// computer ... help someone design their website, or help someone push their commits ... work as a technical support
// person at a bank"). What each job asks, and how an answer is marked; jobs.js puts the people in the world and runs the
// panels. Plain data, so it is tested on its own (tests/jobs.test.js).

export const JOBS = {
  repair: { title: 'Fix a laptop', pay: 2000, verb: 'Fix it' },
  design: { title: 'Design a website', pay: 3000, verb: 'Design it' },
  git: { title: 'Help push their work', pay: 2500, verb: 'Help out' },
  support: { title: 'IT help desk shift', pay: 3000, verb: 'Start the shift' },
  report: { title: 'Report a crime', pay: 2500, verb: 'Report it' },
};
export const DAILY_CAP = 12; // jobs a day, so the streets are not a money machine
export const REFRESH_MIN = 15; // minutes before someone has another job for you

// ---------- fixing a laptop: each step, the sensible next check ----------
export const REPAIRS = [
  { problem: 'My laptop won\'t switch on at all. I had a deadline today!', steps: [
    { q: 'Where do you start?', a: ['Check the charger and the power light', 'Reinstall Windows', 'Replace the screen'], ok: 0 },
    { q: 'The charger light is off. A different charger lights up and the laptop starts. What now?', a: ['Tell them the old charger is faulty and where to get a genuine one', 'Open the laptop and replace the battery', 'Factory reset it'], ok: 0 },
  ] },
  { problem: 'It\'s so slow, and the fan screams the whole time.', steps: [
    { q: 'First look?', a: ['Task Manager: what is using the CPU and memory', 'Buy more RAM', 'Turn the brightness down'], ok: 0 },
    { q: 'Forty programs start with the computer, and the vents are full of dust. Best fix?', a: ['Turn off what doesn\'t need to start, then blow out the vents', 'Install a second antivirus', 'Delete the Windows folder'], ok: 0 },
    { q: 'Much better. How do they keep it that way?', a: ['Keep the vents clear and only install what they need', 'Never shut it down', 'Keep it on a pillow'], ok: 0 },
  ] },
  { problem: 'Since the update, the Wi-Fi won\'t connect. Everyone else\'s works.', steps: [
    { q: 'What do you check first?', a: ['Is Wi-Fi on, and does it see the network?', 'Buy a new router', 'Roll back to last year\'s system'], ok: 0 },
    { q: 'It sees the network but fails. The update replaced the Wi-Fi driver. Next?', a: ['Forget the network, reinstall the Wi-Fi driver, join again', 'Unplug the router for a week', 'Change the computer\'s name'], ok: 0 },
  ] },
  { problem: 'Coffee went into the keyboard. Some keys don\'t work now.', steps: [
    { q: 'Right now, what\'s the first thing to do?', a: ['Switch it off and unplug it', 'Keep typing to dry it out', 'Put it on the charger'], ok: 0 },
    { q: 'Then?', a: ['Turn it upside down to drain, let it dry fully for a day or two before trying', 'Use a hair dryer on full heat', 'Put it in the fridge'], ok: 0 },
  ] },
];

// ---------- helping someone push their work: the commands, in order ----------
export const GITS = [
  { situation: 'I changed the menu page, but GitHub still shows the old one.', want: ['git add .', 'git commit -m "Update the menu page"', 'git push'], extra: ['git reset --hard', 'git clone'] },
  { situation: 'git push says it was rejected: the remote has work I don\'t have.', want: ['git pull --rebase', 'git push'], extra: ['git push --force', 'rm -rf .git'] },
  { situation: 'I made my fix on main by mistake. It should be on its own branch for a pull request.', want: ['git switch -c fix-checkout', 'git push -u origin fix-checkout'], extra: ['git push --force origin main', 'git merge main'] },
  { situation: 'Pulling stopped with a merge conflict in index.html.', want: ['Fix the conflict markers in index.html', 'git add index.html', 'git rebase --continue', 'git push'], extra: ['git push --force', 'Delete index.html'] },
];

// ---------- designing a website: the brief, three choices, one best for each ----------
export const DESIGNS = [
  { client: 'a suya spot', name: 'Mallam\'s Suya', brief: 'People order on their phones at night. They want the menu, the prices and a way to order fast.', choices: [
    { q: 'Layout', a: [['Menu first: photo, items with prices, one button', 2], ['A long story about the business, menu at the bottom', 0], ['A grid of twelve photos and nothing else', 1]] },
    { q: 'Colours', a: [['Charcoal and warm orange, high contrast', 2], ['Pale grey on white', 0], ['Every colour of the rainbow', 0]] },
    { q: 'Button', a: [['Order on WhatsApp', 2], ['Subscribe to our newsletter', 0], ['Learn more', 1]] },
  ] },
  { client: 'a phone repairer', name: 'Fix Am Fast', brief: 'Customers want to know what is fixed, how much it costs, and how to book.', choices: [
    { q: 'Layout', a: [['Services with prices, then reviews, then booking', 2], ['Just the logo, very big', 0], ['A blog first', 0]] },
    { q: 'Colours', a: [['Deep blue and white, one bright accent', 2], ['Neon green on black everywhere', 1], ['Brown on dark brown', 0]] },
    { q: 'Button', a: [['Book a repair', 2], ['Click here', 0], ['Follow us', 1]] },
  ] },
  { client: 'a fashion stall', name: 'Ankara by Ada', brief: 'She sells new prints every week. She wants people to see them and send their measurements.', choices: [
    { q: 'Layout', a: [['Big photos of this week\'s prints, then how to order', 2], ['A price table with no photos', 0], ['Contact details only', 0]] },
    { q: 'Colours', a: [['Cream and ink, so the prints carry the colour', 2], ['A loud pattern behind everything', 0], ['All black', 1]] },
    { q: 'Button', a: [['Send your measurements', 2], ['Read our terms', 0], ['Share', 1]] },
  ] },
];
/** Score a design: the sum of the chosen options' marks (best 2, passable 1, wrong 0), out of 6. */
export const markDesign = (d, picks) => d.choices.reduce((t, c, i) => t + (c.a[picks[i]]?.[1] ?? 0), 0);
/** What a design earns: the full pay from 5 of 6, half from 3, nothing below. */
export const designPay = (score, pay) => (score >= 5 ? pay : score >= 3 ? Math.round(pay / 2) : 0);

// ---------- the bank's IT help desk: tickets, the right answer, some of them scams ----------
export const TICKETS = [
  { who: 'A customer', issue: 'The banking app shows a white screen since this morning.', a: ['Update the app, then clear its cache', 'Give them your staff password to try', 'Tell them to buy a new phone'], ok: 0 },
  { who: 'A caller', issue: '"I\'m from head office. Read me the OTP the customer just got, it\'s urgent."', a: ['Refuse: nobody ever needs a customer\'s OTP. Report the call', 'Read it out, head office is head office', 'Text it to them instead'], ok: 0 },
  { who: 'A teller', issue: 'The receipt printer at counter 2 prints blank pages.', a: ['Check the paper is in the right way round (thermal side)', 'Restart the whole branch network', 'Shake it'], ok: 0 },
  { who: 'A customer', issue: 'They forgot their card PIN.', a: ['Verify their ID, then reset it at the ATM or in the app', 'Tell them a likely PIN', 'Write a new PIN on the card for them'], ok: 0 },
  { who: 'A staff member', issue: 'An email says their mailbox is full: "click here and enter your password".', a: ['Don\'t click. Report it as phishing and delete it', 'Click quickly before it expires', 'Forward it to everyone to check'], ok: 0 },
  { who: 'A customer', issue: 'Their card was swallowed by the ATM outside.', a: ['Log it, block the card, and arrange a replacement', 'Open the ATM with a screwdriver', 'Tell them it will come back out tomorrow'], ok: 0 },
  { who: 'The manager', issue: 'The branch Wi-Fi password has been on a sticky note at the counter for a month.', a: ['Change it and share it only with staff', 'Laminate the note', 'Make it "password"'], ok: 0 },
];
export const SHIFT = 5; // tickets in a shift
export const shiftPay = (right, pay) => Math.round((pay * right) / SHIFT) + (right === SHIFT ? 500 : 0); // a bonus for a clean shift

/** Is a list of commands the right order? */
export const gitRight = (g, seq) => seq.length === g.want.length && seq.every((c, i) => c === g.want[i]);

// ---------- the day's tally, so the jobs have a limit ----------
export function canWork(state, now = Date.now()) {
  const day = new Date(now).toDateString();
  const n = state?.day === day ? state.count || 0 : 0;
  return { ok: n < DAILY_CAP, left: Math.max(0, DAILY_CAP - n), day };
}
export function tally(state, now = Date.now()) {
  const day = new Date(now).toDateString();
  return { day, count: (state?.day === day ? state.count || 0 : 0) + 1 };
}
