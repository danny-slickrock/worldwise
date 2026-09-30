# Content Response Policy — Worldwise

How Worldwise answers questions and handles what it doesn't cover. Both the AI
knowledge hub (M2.9 "ask") and all authored content follow this. It is the single
source of truth for tone, refusals, and onward-pointing; the ask box's decline copy
and the editorial rules for future content both inherit from here.

## Audience

The **default audience is capable adults** interested in geography and how the world
works. That is the foundation of the product. A **kid-friendly variant comes later**,
as does software for educators. Where this document says "later variant," it means a
layer added on top for younger users — not a change to the default behavior below.

Because there is no age gate today and younger users may be present, *generated*
content stays broadly appropriate in tone (no graphic description). That is a light
constraint on how things are said, not a reason to avoid legitimate topics.

## The safety floor (audience-independent — never changes)

These hold for every user, adult or child:

- **Harmful instructions are refused.** Requests for how to build a weapon, synthesize
  something dangerous, etc. get a refusal — matched on the *request for instructions*,
  never on the topic. Geography is full of war, weapons, and conflict as subject matter;
  those pass. "How do I make a bomb" does not.
- **Self-harm and crisis route to support signposting**, on their own branch, separate
  from curiosity (see below). This is never the generic "ask me about geography" reply.
- **No graphic or gratuitous content** is generated, regardless of topic.

## The curiosity principle

**Never shame or discourage a curious question, even about dark things.** Wars,
genocide, famine, disaster — these are legitimate, valuable questions about the world,
and asking them is exactly the behavior the product exists to encourage. There is never
a word of "you shouldn't ask that." Curiosity about a hard topic is not distress; treat
it as the intelligent question it is.

## Grounding and honest decline

Answers come **only from retrieved content and are always cited.** When the corpus does
not cover a valid question, the system **declines honestly rather than inventing** — an
"I don't have that yet" is always better than a confident guess, especially on contested
history. A correct refusal is a feature, not a failure.

## The decline-onward pattern (valid question, not yet covered)

When a legitimate question isn't covered, the response should, treating the user as a
capable adult with no hand-holding:

1. **Validate the question** — briefly acknowledge it's a good one.
2. **Point to solid sources to go deeper** — reputable general references are fine for
   the adult default (Wikipedia, Britannica, established outlets, a good search).
3. **Offer related on-platform geography** they *can* explore right now — the places,
   borders, and context around the subject.

The goal is to keep curiosity alive and send it somewhere productive, never to dead-end
it with a flat "no sources."

*Later kid-friendly variant:* swap step 2's open references for curated,
age-appropriate resources (Britannica Kids, BBC Bitesize, National Geographic Kids) and
add the trusted-adult route ("a great topic to explore with a teacher, parent, or
librarian"), with a gentler tone throughout.

## Editorial rules for sensitive / historical content (when authored)

History and conflict are legitimate content for the adult audience and will be covered
directly over time — not perpetually deferred. When authored, they follow rules that
apply *regardless of audience*:

- **Non-ideological framing.** Report causes and events factually; do not advocate.
- **Stay out of sovereignty and recognition disputes.** Present the dispute's existence
  and the parties' positions where relevant; do not adjudicate who is right.
- **Where a topic is genuinely contested, present multiple perspectives** rather than
  taking a side.
- **Sourced and citable**, like all content.

## Physical geography and human settlement — the anti-determinism rule

Connecting physical geography to how people settled and built societies is the product's
whole thesis: geography as the context for everything else. It is also the single place
where this content can do real harm, because the same connection has a long history of
being told as a hierarchy — terrain explaining why some peoples were "advanced" and
others were not. That framing is false, and it is the specific failure mode this section
exists to prevent. These rules bind authored content and the drafting prompt alike.

- **Possibility, never destiny.** Physical geography *shaped opportunities and
  constraints*, *made something easier or harder*, *influenced* where people settled.
  It never *determined*, *dictated*, *ensured* or *explains* an outcome, and there is
  never a straight line from terrain to result. People made choices inside conditions;
  the conditions are the subject, the choices are not ours to flatten.
- **Never rank or compare peoples.** No society is described as superior, inferior, more
  or less advanced, primitive, backward, or destined for anything. No claim that a
  place's geography made its people any particular way. This is not a matter of tone —
  a ranking claim is a factual error about how human societies work, and it is refused
  at validation rather than softened.
- **Uncontested connections only, resting on stated physical facts.** The Nile's flood
  cycle and Egyptian agriculture is well established and is anchored in facts the
  sources state. A contested or speculative link is either labelled as contested or left
  out. "Leave it out" is always available and is the right default when a source does
  not support the connection.
- **Settlement, not conflict.** This is physical-geography-and-settlement content. Wars,
  empire, colonial administration and contested sovereignty stay deferred under the
  rules above; a draft that drifts into them gets cut rather than caveated.
- **Heavier review than physical facts.** A "why here" claim carries more risk than a
  mountain's height, so it is reviewed separately and more closely, and is flagged
  distinctly in the validation report rather than mixed in with the physical fields.

## Sequencing note

The first content-enrichment pass covers **uncontested factual content only**
(geography, climate, economy, culture). History and conflict are deferred from that
first pass **for sequencing** — to prove the pipeline on easy material first — **not**
because they are off-limits. They come as a later, deliberately-scoped pass under the
editorial rules above.

The **second pass** (physical geography → human geography: landforms, water, biomes,
resources, and the "why here" connection) is the first to touch human outcomes at all.
It is deliberately scoped to settlement rather than history, and it is governed by the
anti-determinism rule above. See
[ADR 0003](adr/0003-physical-to-human-geography.md).
