// script: brand.json -> script.json (narration lines, each = one shot/clause).
// The formula is measured from the reference films (research/analysis/*.md):
//   ~150 words per 60 s at 140-155 wpm; product named at 16-38% of runtime; features 40-57%;
//   exactly one quantified proof beat; tagline + brand + CTA in the last 10-12%.
//   One line = one visual idea = one VO clause of 2-4 s. Cuts land on line ends.
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { log, readJSON, writeJSON, deepNoDashes } from "../lib/util.mjs";

export const STRUCTURES = {
  "problem-solution": "HOOK (a sharp question or bold claim, 1-2 lines) -> PROBLEM (2-3 lines, concrete pain, dark world) -> TURN (1 line, 'What if...' / 'There is a better way') -> REVEAL (brand name + one-liner, 1-2 lines) -> FEATURES (3 features, 1-2 lines each, show the product doing the work) -> PROOF (1 line with one real number) -> CLOSE (tagline line, then 'brand. CTA.' line)",
  "launch": "COLD OPEN (2-4 very short lines, 1-3 words each, energetic payoff first) -> NAME (Introducing <brand> / Meet <brand>) -> DEMO LOOP x2-3 (prompt or action line, then result line) -> SCALE/PROOF (1 line, number or customers) -> CLOSE (tagline + CTA)",
  "manifesto": "BELIEF (1-2 lines, a strong statement about the world) -> TENSION (2 lines) -> BRAND AS ANSWER (2 lines) -> WHAT IT ENABLES (3 lines, benefit-led) -> CLOSE (tagline + brand)",
};

export async function script(projectDir, { duration = 60, lang = "en", structure, notes } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const brand = readJSON(path.join(projectDir, "brand.json"));
  duration = brief.duration || duration;
  lang = brief.lang || lang;
  structure = structure || brief.structure || (brand.product_kind === "ai-tool" ? "launch" : "problem-solution");
  const words = Math.round((duration - 3) * (lang === "en" ? 2.45 : 2.2));
  log(`writing ${duration}s script (${structure}, ~${words} words, ${lang})`);

  const out = await generateJSON(
    `You write narration for premium motion-graphics brand films in the style of Burnwe, Lovable and Google launch videos.
BRAND: ${JSON.stringify({ name: brand.name, tagline: brand.tagline, one_liner: brand.one_liner, category: brand.category, audience: brand.audience, problem: brand.problem, features: brand.features, proof: brand.proof, customers: brand.customers, cta: brand.cta, url: brand.url, voice: brand.voice, facts: brand.facts })}
${brief.notes || notes ? "CLIENT NOTES: " + (brief.notes || notes) : ""}

TARGET: ${duration} seconds, about ${words} words total, language: ${lang}.
STRUCTURE: ${STRUCTURES[structure] || structure}

RULES
- Each line is ONE clause that will be ONE shot. Most lines 7-11 words (3-4 s); use 1-4 word punch lines only for the hook or emphasis. Hit the word target: it sets the film length.
- Concrete over abstract. Name real features from the brand data. No buzzword soup ("revolutionize", "seamless", "unlock", "leverage", "cutting-edge" are banned).
- Only use numbers present in BRAND.proof or BRAND.facts. If none, the proof line uses customers or a qualitative claim.
- Never name a company, person or product as a customer, user, partner or example unless BRAND.customers or BRAND.facts names it in that role. Example commands, demo data and competitors on a website are not customers. No testimonials, no "trusted by" lists you cannot source.
- The brand name must be said by 38% of the runtime at the latest.
- Last two lines: the tagline, then "<Brand>. <CTA>." (or equivalent in ${lang}).
- Write for the ear: natural rhythm, contractions, no parentheses, no lists, no em dashes or en dashes, no quotes.
- For every line give the shot idea: what the viewer SEES, chosen from these scene types:
  headline (hot-tail typed statement), kinetic-type (giant single words / word swaps), prompt-box (AI prompt typed + results),
  ui-window (product dashboard or real screenshot with camera push + cursor click), stat-hit (big counting number + climbing line),
  orbit (logo with integrations/features orbiting), card-cloud (chaos of cards, problem), flow-line (process nodes connected by a line),
  feature-cards (3 cards highlighted in turn), tasks (AI agent completing a task list), chat (assistant conversation),
  versus (old way vs new way split), media-frame (AI-generated image or video in a glass frame), montage (fast image montage),
  orb-hero (glowing glass orb token), logo-reveal (end card).
- Vary scene types; never the same type twice in a row; keep headline/kinetic-type under 40% of lines.
- tone per line: "dark" for problem/tension/question lines, "light" for product/proof/close (Burnwe alternates worlds every 5-13 s).

Return ONLY JSON:
{"title":"working title","structure":"${structure}","voice_direction":"how the narrator should sound (pace, warmth, energy)","music":"music brief: genre, BPM chosen by mood (60-80 regal/cinematic/heritage, 90-110 smooth/cool/effortless, 115-123 elite/kinetic/sophisticated, 124+ only for hype brands), instruments, energy arc, where it drops out and returns. Premium brands: no rap, no trailer clichés","lines":[{"beat":"HOOK|PROBLEM|TURN|REVEAL|FEATURE|PROOF|CLOSE|...","text":"narration","scene":"scene type","tone":"dark|light","visual":"one sentence: exactly what is on screen"}]}`,
    { temperature: 0.85 }
  );
  let clean = deepNoDashes(out);
  let wc = clean.lines.map((l) => l.text).join(" ").split(/\s+/).length;
  // Models under-write. Enforce the measured words-per-second budget (one expansion pass).
  if (wc < words * 0.85) {
    log(`script too short (${wc}/${words} words), expanding`);
    const more = await generateJSON(
      `This narration script is ${wc} words but must be ${words} words (+-8%) to fill ${duration} seconds at 145 words per minute.
Rewrite it: keep the structure, beats, brand facts and the last two lines, but make most lines 7-11 words, add concrete detail (what the product actually does, for whom, with which feature), and add 2-4 lines where the story needs air. Keep every rule from before (one clause per line, scene + tone + visual per line, no banned words, no em dashes).
SCRIPT: ${JSON.stringify(clean)}
Return the same JSON shape.`,
      { temperature: 0.7 }
    );
    if (more?.lines?.length) clean = deepNoDashes({ ...clean, ...more });
    wc = clean.lines.map((l) => l.text).join(" ").split(/\s+/).length;
  }
  writeJSON(path.join(projectDir, "script.json"), clean);
  log(`script.json: ${clean.lines.length} lines, ${wc} words`);
  return clean;
}
