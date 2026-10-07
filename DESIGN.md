# PALIMPSEST: Design Document

> *palimpsest (n.): a page of vellum that has been scraped clean and written over. The old words never fully leave.*

---

## 0. At a glance

| | |
|---|---|
| **Title** | *Palimpsest* |
| **Genre** | Story-driven, turn-based RPG with puzzle-like, hand-placed fights |
| **Length** | 45–60 minutes, five chapters plus prologue and epilogue |
| **Platform** | Desktop browser. Static build (Vite + TypeScript + Three.js), hosted on GitHub Pages |
| **Visual language** | A Gothic illuminated manuscript (English/French, c. 1300–1350) |
| **Assets** | None. Every image, letter, shader and sound is generated at runtime |

**Pitch.** In the realm of Hollin, every soul is written in the Book of Names, and for ten years no one has died. People call it the Mercy. Isot, a young scribe sentenced to be scraped out of the Book, escapes with an anchoress who has not left her walled cell in a decade and a knight who has forgotten his own name. Along the way she learns that the Mercy was a crime. The thing the world has been missing since is its ending, and the knight walking beside her is that ending.

**Design pillars**

1. **The world is a manuscript.** The art style is also how the world works. Hollin is the text, and the wild places are the margin. Monsters are marginal doodles, and a person who is forgotten is scraped vellum. Every visual, sound and rule belongs to the book.
2. **Plan, don't grind.** Every enemy shows what it will do next. Every fight is hand-placed and visible, and works as a small puzzle with an exact answer. There is no XP and no random encounters, and the party is fully restored after each battle. New abilities come from story beats.
3. **Endings matter.** The story is about letting things finish, so the game itself has to end well and on time. Anything that doesn't serve story, feel or atmosphere gets cut.

---

## 1. World and theme

### 1.1 Hollin

Hollin is a small, cold, Christian-flavoured realm of fens, villages and one great abbey. The name comes from the holly, which stays green all winter. The abbey of **Saint Ebb's** stands on a tidal island, joined to the mainland by a causeway that the sea covers twice a day. In its church, on a lectern chained to the floor, lies the **Book of Names**.

### 1.2 The laws of the Book

These are the rules the player needs. They are taught through play, never as a lecture.

1. **What is written is held.** (This is the Abbey's motto, carved on the lectern: *Quod scriptum est, tenetur.*) Every soul born in Hollin is written in the Book. Being written means being remembered by the world.
2. **The last word of the Book is FINIS.** It was written before the first name, because every name ends. FINIS is also the name of the **Reader**, the gentle walker the old songs call Death. When your time comes, the Reader reads your name aloud and you go with him.
3. **A scraped name is forgotten.** Scrape a name off the vellum with a penknife and pumice, and the world forgets that person at once. Only one exception exists: *the hand that scrapes remembers.*
4. **The forgotten go to the Margin.** Within days a scraped person fades out of the text and into the wild ornamental border of the world. There they become *marginalia*: drolleries, grotesques, hybrids. Monsters, in other words.
5. **Without an ending, things fray.** Ten years ago Abbot Aumery scraped FINIS from the Book. Since then no one has died, and they don't heal either. The sick and the very old *fray*. Their colours drain and their outlines break, a little like a painting being un-painted, until they slip into the Margin anyway. The Mercy did not end death. It turned death into forgetting.

### 1.3 Theme

> *"A sentence without a full stop can't be read."* (Isot)

The game is about mercy that refuses endings, about the difference between being forgotten and being finished, and about people who decide for others what those others can bear. Each of the four main characters has made such a decision: Isot, Hild, Aumery and, in his own way, Whit.

**Tone.** The story is tender, eerie and wry. Medieval marginalia are funny (knights fight snails, hares hunt hunters, a head walks around on legs), and the game uses that comedy against the grief instead of to undercut it.

### 1.4 Frame

The whole game is Isot's chronicle. She writes it after the events, over the scraped pages of the Abbey's official *Chronicle of the Mercy*. The interludes between chapters are pages of her chronicle, in her voice and past tense. The game is literally a palimpsest.

---

## 2. Characters

No archetypes: the party is a **copyist**, a **walled-in recluse** and **Death with amnesia**. Each one has a flaw, a secret and an arc, and each secret has a job in the plot.

### 2.1 ISOT, the Scribe (19). *Role: Editor (control)*

**Who.** A foundling given to Saint Ebb's at five and raised in the scriptorium by old Brother Wystan, the librarian. She has the best hand in the Abbey and knows it. Every morning she brings bread to the anchoress in the church wall, and they argue through the squint.

**Personality.** Precise, quick and wry. She has no patience for sloppiness in letters or in people. She notices everything except her own feelings. Underneath she is tender, and she hides it under corrections.

**Voice.** Short declaratives and corrections, full of words from her trade (quire, descender, gloss, rubric). Dry humour. She never says "I feel".
- *"That's not a monster. That's a gryllus. A head with legs. Lazy illuminators put them anywhere there's space."*
- *"I don't lie. I emend."*
- *"You need a name or you'll fade. I'm writing 'Whit' on my wrist. There's not a whit of you left, and your shield is white. It's efficient."*

**Flaw.** Pride and control. She believes the written word is truer than the lived one, and that a careful enough hand can fix anything. She would rather be right than be known.

**Secret.** **She scraped Brother Wystan out of the Book herself,** the night before the game begins. He was ninety and fraying, losing his words and his outlines, and he begged her to do it. Everything she says in Chapter I about "whoever did this" is a lie.

**Why it matters.**
- Her crime is the hook. She is sentenced to be scraped for it, and the player believes she's innocent.
- The clues are fair. Vellum dust on her knife. Hild's line, "the hand that scrapes remembers", and Isot is the only one who remembers Wystan. A note from Wystan hidden in the underwriting of his psalter.
- Her confession in the Margin is the emotional peak of Chapter IV.
- In the ending she writes Wystan back in so that he can be properly *finished*: emendation instead of erasure.

**Arc.** From scraping to emending, and from hiding mistakes to leaving them visible. She ends as Keeper of the Book.

**Combat role.** She doesn't win fights; she rewrites them. She is fragile and works best from the Rear, spending **Ink** to cancel, redirect and strengthen.

**Look.** Slight, with cropped dark hair under a linen coif. Azurite-blue habit, fingers stained vermilion and black, a penknife on a cord and an inkhorn at her belt.

### 2.2 HILD, the Anchoress (late 50s). *Role: Warden (protection and positioning)*

**Who.** Ten years ago Sister Hild nursed the village of Lychford through the Grey Sweat, caught it, and lay dying in the Abbey infirmary on the last night anyone in Hollin died. She lived. A month later she had herself walled into an anchorhold, a cell built into the church wall with one small window called the squint, and she hasn't come out since. She is the Abbot's elder sister. She raised him.

**Personality.** Blunt, odd, unsentimental, darkly funny and practical. She looks at people as if she were reading what's underneath them. Ten years alone have made her both very wise and slightly feral.

**Voice.** Short, compressed sentences in plain words with the rhythm of scripture. She never explains herself and answers questions with questions.
- *"Ten years I've watched the world through a hole the size of my hand. It looked smaller then. It was."*
- *"Don't thank me. I've done nothing yet but leave."*
- *"Pain's a bell. After long enough you stop hearing it. That's not the same as it stopping."*

**Flaw.** Self-punishment and withholding. She decides what other people can bear to know. It is her brother's sin, though she would never see it that way.

**Secret.** **She recognises the knight the moment she sees him on the causeway.** He is the Reader. He stood at her bedside ten years ago and vanished mid-reach when her brother scraped his name. She has been dying ever since, slowly and without end. She broke out of her wall to save Isot, but also because she has a plan: get the knight his name back, so that she can finally die.

**Why it matters.** Her silence is the betrayal at the midpoint. Her brother's love for her is the root of the whole Mercy. Her death, which she chooses and which is gentle and remembered, is the ending.

**Arc.** From walls to an open door. She goes from enduring to letting go, and from deciding for others to asking.

**Combat role.** High HP. Her abilities cost her own HP (*Penance*). She moves enemies, walls units in, and heals others with her own strength.

**Look.** Tall and gaunt, in undyed grey wool and a lead-white wimple. Grey plague-marks on her cheek and hands. She carries a huge psalter on an iron chain and swings it as a weapon.

### 2.3 WHIT, the Blank Knight (ageless). *Role: Reckoner (timing and damage)*

**Who.** A knight in plain white with an unpainted shield, found standing in the tidal shallows below Saint Ebb's. He has stood there longer than anyone can remember, because nobody can remember him at all. He has no name, no arms and no past. Isot names him.

**Personality.** Courteous, gentle, earnest and literal. Small things delight him like a child: bread, hands, being called by name. He is sad in a way he can't explain. Animals and the dying go quiet around him.

**Voice.** Old-fashioned courtesy. He apologises often and takes idioms literally, and now and then says something terribly profound without noticing.
- *"Forgive me, lady. I don't believe I've ever been introduced to myself."*
- *"I'll stand in front. It seems to be the thing I'm for."*
- *"Whit. Whit. I like it. It's small. I can carry it."*

**Flaw.** He has no will of his own. He does whatever he's asked, protects whoever is nearest, and is terrified of choosing.

**Secret (unknown even to him).** **He is the Reader, Death.** His name, FINIS, the last word of the Book, was scraped by Abbot Aumery ten years ago.

**Why it matters.** He is the midpoint twist. He raises the moral question of the second half: should the Mercy end? His choice to remember is the climax, and his reading of Hild's name is the ending.

**Arc.** From a nobody to someone who chooses to be what he is, and to do it gently.

**Combat role.** He hits hard from the Front, sets countdowns that go off later, and keeps vigil so he can strike first. After the twist he can end things outright.

**Look.** Tall, in plain mail and plate with a white surcoat and a great helm he never removes until the last scene. He carries a lance with a blank pennon and a blank argent shield. After the midpoint, the word FINIS shows faintly on the shield in gold underwriting.

### 2.4 Key supporting cast

| Character | Who | Voice sample |
|---|---|---|
| **Abbot Aumery** | Keeper of the Book, Hild's younger brother, called "the Saint of the Mercy". Warm, eloquent and fatherly. He genuinely believes he gave the world a gift. Ten years ago, when the Reader came for Hild, he scraped FINIS. He remembers Death, and he recognises Whit at once. | *"Child, no one in Hollin has wept at a graveside in ten years. Would you give them back their weeping?"* |
| **Brother Wystan** | The old librarian who taught Isot. Scraped by her before the game starts, he now lives in the Margin as an ape-scribe drollery. Kind, wry and tired. | *"You did a kind thing badly. That's most kindness."* |
| **Prior Gaudry** | Leads the Pumice Brothers, the Abbey's lay enforcers, who carry pumice stones and scraping knives. A true believer. | *"Nothing is lost that is properly scraped."* |
| **Dunstan** | Sexton of Lychford, with ten years of no graves to dig. | *"A sexton with no graves is a man with no sentences. I've started polishing the verbs."* |
| **Goodwife Amabel and Hob** | An old Lychford couple. Amabel should have died in the Grey Sweat and is fraying. | *"I'd like to be finished, love. I'm not asking to be forgotten. Just finished."* |
| **The Mummers** | Lychford's Midwinter players, who have performed the same play every night for ten years. | *"Here comes I, Saint George, the valiant man!"* |

---

## 3. Story

### 3.1 Structure

| Part | Location | Est. time | Function |
|---|---|---|---|
| Prologue | Title, then an illuminated page | 2 min | Hook: the Book, the Mercy, a knife on vellum |
| **I. The Scraping** | Saint Ebb's by night, and the causeway | 12 min | Inciting incident; the party forms |
| **II. The Village Without Graves** | Lychford, Midwinter | 12 min | The cost of the Mercy; first memory |
| **III. The Blanchwood** | The fading wood and Knell Chapel | 10 min | **Midpoint twist:** Whit is Death |
| **IV. The Margin** | The ornamental border of the world | 11 min | Isot's confession; the ink of FINIS |
| **V. The Writing** | Saint Ebb's at dawn | 11 min | Hild and Aumery; FINIS rewritten; the ending |

Total is about 58 minutes for a first playthrough, and about 45 for a quick one.

### 3.2 Prologue

*Title screen:* a closed book bound in tooled leather. **Press any key to open the book.** This first key press also unlocks audio. The cover swings open onto an illuminated page:

> **I**n Hollin every soul is written, and the writing is kept at Saint Ebb's, where the sea comes twice a day. *What is written is held.*
> Ten winters ago the Grey Sweat came, and on the worst night of it, it stopped. No one in Hollin has died since. We call it the Mercy.
> I was nine. I gave thanks for it every morning of my life.
> This is the true account of how the Mercy ended, set down in my hand over the old one. *(Isot, scribe of Saint Ebb's)*

Then a close-up: a line of text on vellum and a penknife scraping it away, with the rasp of pumice. We see only a hand with ink-stained fingers. Those fingers are Isot's, and that is the first clue.

### 3.3 Chapter I: The Scraping (Saint Ebb's, night)

**Maps:** Scriptorium, Penitent's Cell, Cloister, Sea Gate, Causeway.

1. **Scriptorium.** Isot copies by candlelight. The desk opposite hers is empty, its stool pushed in. She talks to it anyway: *"You'd say my descenders are lazy. They are. I'm tired."* A sleepy brother asks who she's talking to. *"No one."*
   - **Raking light tutorial** (the core exploration verb, §8.3). Tilting the candle reveals underwriting. On the Book's latest page, the player finds a freshly scraped line with the ghost of *Brother Wystan, librarian* beneath it.
   - **Secret:** Wystan's psalter, still on his desk, holds a note in underwriting: *"Isot. Thank you for the knife. Don't keep my name; keep your hand steady. W."* An alert player can start to suspect Isot here.
2. **Fight 1 (Isot alone).** The Book's margins stir. Two grylli, heads on legs, climb off the page, drawn by the fresh wound in the vellum. This fight teaches intents, the Penknife, Gloss and Strike Through.
3. **The sentence.** Abbot Aumery arrives with two Pumice Brothers. He finds the scraped line, and the brothers find Isot's penknife with vellum dust on its blade. *"Who scrapes shall be scraped. At the dawn bell."* He is gentle about it, which is terrifying: *"It won't hurt, child. No one will grieve. That is the mercy of it."*
   - **Choice:** *"I didn't do it."* or *(say nothing)*.
4. **Penitent's Cell.** Isot is locked in. Through the squint in the wall, Hild speaks (sample scene in §3.10). Raking light shows the cell wall was once a doorway into the anchorhold. Hild breaks through with her chained psalter, steps out of her cell for the first time in ten years, and joins the party.
5. **Cloister. Fight 2 (Isot and Hild)** against two Pumice Brothers. This fight teaches places, Step, Shove and Shrive. Raking light reveals a door painted over on the cloister wall, the old way down to the Sea Gate.
6. **The Causeway.** Fog, and the tide coming in. A knight in white stands motionless in the shallows. *"He's been there since… always, I think. The fishermen row around him."* He says he was waiting for something. *"Is it you?"* **Hild drops her psalter.** She says nothing.
7. **Boss I: the Great Snail** rises out of the tide (§4.13). Whit fights beside them, and the party is complete.
8. **Aftermath.** Aumery reaches the gate with torches. He sees the knight and goes white: *"Not him. Not* him*."* The tide closes the causeway between them. On the far shore, Isot names the knight and writes WHIT on her wrist so that he won't fade.

> *Interlude I. Of the Village Without Graves.*
> **W**e crossed with the tide at our heels: a scribe, an anchoress who had not walked in ten years, and a knight who did not know his name. I wrote WHIT on my wrist so that he would not fade, and he thanked me for it every hour until I asked him to stop, and then he thanked me for that.
> I did not tell them what I had done. I am telling it now.

### 3.4 Chapter II: The Village Without Graves (Lychford, Midwinter)

**Maps:** Lychford Lane, the Village, Churchyard and Lych-gate, Bell Tower, Village Green at night.

1. **Lane.** Walking, Isot remembers Wystan's lesson: *"Never scrape, Isot. Emend. A small mark above, the true word between. The mistake stays visible. That's the honesty of it."* She unlocks **Emend**. The irony lands later. Then **Fight 3**: three marginal hares, who shoot at the Rear.
2. **The Village.** The story here is told mostly by the environment:
   - Roses still bloom on the lych-gate in the snow. Nothing has died, not even them.
   - The churchyard has no grave newer than ten years.
   - Dunstan the sexton polishes a spade that shines like a mirror.
   - Children play "Mercy", a chasing game in which nobody is ever out. Their skipping rhyme is a puzzle clue.
   - The mummers rehearse the play they have performed every night for ten years. *"Every night?" "The Doctor won't let it end."*
   - Some villagers are fraying: pale, their outlines broken.
   - **Goodwife Amabel** is fraying badly. She asks Isot to scrape her. **Choice** (§3.9).
3. **Churchyard.** On the path is an open grave, dug ten years ago and never filled, with its headstone scraped blank. Hild stops beside it: *"They dug me a hole and I built myself a wall instead. I'm good at walls."* Hild unlocks **Immure**.
   - **Secret:** raking light on the stone reveals *HILD OF SAINT EBB'S, WHO NURSED US THROUGH THE GREY SWEAT.*
   - **Fight 4:** two babewyns perched on the lych-gate.
4. **Bell Tower. Puzzle: the passing bell** (§5.2). The passing bell hasn't rung in ten years. Whit is drawn to it. When it finally tolls, the whole village comes out into the snow to listen. Whit staggers and remembers a fragment: *"A bed. A woman with grey on her face. She was afraid. Then she wasn't. I reached for… and then nothing."* Hild turns away. Whit unlocks **Vigil**: *"I kept watch. I remember keeping watch."*
5. **The Green, night. Boss II: the Mummers' Play** (§4.13). The bell has given the play an audience. *"A champion! Step into the ring!"* Isot answers: *"If the play needs an ending, we'll give it one."*
6. **Aftermath.** The paper masks fall away. Under them are fraying villagers, who weep with relief that something, anything, has ended. Hild steers the party onward: *"There's a chapel in the Blanchwood where they used to pray to the Reader. If your knight wants his name, he might find it there."* Isot: *"Why are you helping him?"* Hild: *"Because he's lost. I know lost."*

> *Interlude II. Of the Blanchwood.*
> **I**n Lychford the roses on the lych-gate had bloomed for ten winters, and the sexton had polished his spade until it shone like a mirror. When the passing bell spoke, the whole village came out into the snow to listen, the way you listen for a name on the tip of your tongue.

### 3.5 Chapter III: The Blanchwood (midpoint)

**Maps:** Wood's Edge, the Faded Path, Hermit's Ruin, Knell Chapel, the Ossuary.

1. **The wood blanches as you go deeper.** Trees are half-drawn, birds are bare outlines, and the music loses notes (§7). **Fight 5:** a wodewose, a wild man of the woods, frayed white.
2. **Puzzle: the Faded Path** (§5.3). The road has faded to blank vellum. Raking light shows the ghost of the old path.
3. **Hermit's Ruin.** Prior Gaudry and the Pumice Brothers are waiting: *"The Abbot bids his* sister *come home. And bids the knight be put back where he was."* Isot: *"Sister?"* Hild, shaken: *"I've spent ten years not looking at things. Let me look."* Hild unlocks **Squint**. Then **Fight 6**.
   - After the fight: *"Aumery's my brother. I raised him on bread and psalms. He was a kind boy. Kindness is a dangerous thing in a powerful man."* Isot: *"Anything else you'd like to mention?"* Hild: *"Not yet."*
4. **Knell Chapel. Puzzle: the Danse Macabre mural** (§5.3). In the mural, each living figure is led by a Death. Restoring the mural opens the ossuary and teaches Isot that a correction can point anywhere, which upgrades **Emend**. One painted Death has no face, only a blank shield. *"That one's not finished."* *"Let's go down."*
5. **Ossuary. Boss III: the Danse Macabre** (§4.13). Four skeletons dance in a ring because the one who should lead them never came.
6. **The twist.** The dancers stop, turn to Whit and **bow**. The smallest, a child, takes his hand. Hild uses Squint on his shield. In gold underwriting it reads: **F I N I S.**
   - **Isot:** *"Finis. It's the last word of every book I've ever copied."* **Whit:** *"What does it mean?"* **Isot:** *"The end."* **Whit:** *"…Oh."*
   - **Hild confesses.** She knew him on the causeway; he stood at her bedside ten years ago. Aumery scraped FINIS that night to keep her. *"No one has died since because Death forgot his name. He's been standing in the sea for ten years, waiting for a word."*
   - **Isot:** *"You knew. From the causeway. You let him wonder."* **Choice:** forgive her or don't (§3.9).
   - Without meaning to, Whit says the child's name. Her bones lie down, at peace: the first ending in Hollin in ten years. *"…She was so tired."* Whit unlocks **Read Aloud**.
   - **Whit:** *"If I remember, people will die. Amabel. Dunstan. One day, you."* **Isot:** *"Yes."* **Whit:** *"Then I don't want to remember."* **Hild:** *"You haven't seen where the forgotten go."*

> *Interlude III. Of the Margin.*
> **E**very book I ever copied ended with the same word. I wrote it ten thousand times and never once looked at it. He had been walking beside us for four days, and he had said thank you for every one of them.

### 3.6 Chapter IV: The Margin

**Maps:** the Edge, the Ivy Road, the Drollery Fair, Wystan's Vine, the Ink-Well.

1. **Leaving the page.** The party walks off the edge of the wood until the world runs out. The camera pulls back, and the ornamental border that has framed the screen all game *becomes the world.* The party steps out of the text block into the margin, tiny among giant acanthus leaves and gold bars. This is the game's biggest visual moment.
2. **Fight 7** at the Ivy Gate: a caladrius and two hares. This fight teaches Read Aloud.
3. **Puzzle: catchwords** (§5.4). The Margin is made of the borders of thousands of pages, and the exits are labelled with scribes' catchwords.
4. **The Drollery Fair.** The forgotten act out "the world upside down": a hare hunts a hunter, a knight flees a snail, a fox preaches to geese. Most of them are gentle and confused, half-remembering their names. They ask Whit: *"Are you the Reader? Is it time?"* If Isot scraped Amabel, she is here as a small hen and remembers Isot. **Fight 8 (optional)** guards a Lost Name.
5. **Wystan's Vine.** An ape in a monk's habit sits at a tiny desk on a vine, copying nonsense (ape-scribes are a classic drollery). *"Isot. Little Isot. Have you brought the knife?"* **Choice:** confess or stay silent (§3.9). Either way, the truth comes out.
   - **Isot:** *"I'll write you back. I have ink. I'll write you back and you'll be—"* **Wystan:** *"Old, Isot. In pain. Frayed. No. Write* him *back."* He nods at Whit. *"Then write me after, and let him read me. I'd like to be finished. I was a good long sentence."*
   - Wystan teaches Isot **Rubric**: *"Red is for the words that must be read first."* He tells them that every scraped name drains down to the Ink-Well, and that the first word ever scraped still lies at the bottom.
   - **Whit:** *"Then I'll go and get my name."* This is the first thing he has chosen.
6. **Boss IV: the Blot** (§4.13). Afterwards, one bright word lies in the drained well. Isot fills her inkhorn with it. Whit holds out his shield: *"When you write it, write it plainly."*
7. Every margin borders the Book. The party climbs the gold bar of the border, up and through the Book's own margin.

> *Interlude IV. Of the Writing.*
> **T**he forgotten did not want to come home. They wanted to be finished. I had scraped a man out of the world and called it kindness; now I carried his ending in my inkhorn, and the Abbey was waking up.

### 3.7 Chapter V: The Writing (Saint Ebb's, dawn)

**Maps:** Scriptorium, Abbot's Lodging, Cloister, Abbey Church.

1. **Emergence.** The party climbs out of the Book's margins into the scriptorium, the way the grylli did in Chapter I. The lectern is empty, because Aumery has carried the Book into the church.
2. **Abbot's Lodging. Secret:** Aumery's private Book of Hours, its margins filled with *Hild* written hundreds of times. Raking light reveals the last entry: *"Forgive me. I could not be the one left."*
3. **Fight 9** in the cloister: three Pumice Brothers. One of them hesitates: *"Is it true? Did he scrape the Reader?"* Afterwards they step aside.
4. **The Church.** Aumery stands at the Book on the high altar, holding a pumice stone.
   - **Aumery:** *"Ten years and no mother has buried a child. Not one. You want to give them back their graves."*
   - **Isot:** *"You didn't stop death. You turned it into forgetting. I've seen where they go."*
   - **Hild:** *"You didn't save me, Aumery. You kept me. Like a flower pressed in a book."* **Aumery:** *"I couldn't be the one left."* **Hild:** *"Yes. That's what it costs to love something that ends."*
   - Hild stops punishing herself and gives freely. She unlocks **Benison**.
   - Aumery refuses: *"Then I'll scrape it all. Every name. No one will remember enough to grieve."*
5. **Final battle: the Writing of FINIS** (§4.13). Isot writes five letters while the others protect her. Each letter tolls a bell and gives Whit back a memory:
   - **F**: *"A man under an apple tree. He asked me to wait until the apples fell. I waited."*
   - **I**: *"A queen, frightened of the dark. I held the candle."*
   - **N**: *"A child who wanted to know if I was cold. I said yes. I was."*
   - **I**: *"Ten thousand beds. Ten thousand hands. None of them were heavy."*
   - **S**: *"A woman with grey on her face. Hild. She was not afraid. Then he scraped my name, and I forgot it."*

### 3.8 Ending

1. Aumery lunges to scrape the word again. Whit catches his wrist, gently: *"No more, Aumery."*
2. **Colour returns.** The blanching lifts across the screen, and the border fills with gold. For the first time in the game, every pigment appears at once.
3. **Whit, the Reader:** *"Ten years of names. They're all waiting."* **Hild:** *"Read mine first. I've been at the front of the line a long time."*
   - To Aumery: *"Live. Remember me. That's your penance, and it's a kind one."*
   - To Isot (varies with the Chapter III choice): *"Write it all down. The true way. Over the old one."*
   - To Whit: *"Gently, now."*
4. Whit reads aloud: *"Hild of Saint Ebb's, who nursed Lychford through the Grey Sweat."* Across the water, Lychford's passing bell rings, an echo of Chapter II. Hild's figure does not blank out. **It turns to gold, line by line,** and she is gone. Being finished looks different from being forgotten.
5. Isot writes Wystan's name back into the Book in a plain hand. Whit reads it. In the border, a small ape-scribe sets down his pen and becomes a line of gold. Amabel gets her ending too, as described in §3.9.
6. Whit removes his helm. We never see his face, only Isot's reaction. *"Oh. You're…"* *"Plain?"* *"Kind."* He asks her to keep the Book: *"Write them, so I can read them."* *"I'll read yours too, one day. Not soon. And slowly."* He walks out along the causeway at low tide.
7. In the epilogue, Aumery asks to be walled into Hild's empty anchorhold.

> *Epilogue. Explicit.*
> **H**ere ends the Book of the Mercy.
> I keep the Book of Names now. I write every name in a plain hand, and I leave room at the end of each line.
> My brothers ask why I have drawn three small figures in the margin of this last page: a scribe, an anchoress, and a knight with a white shield. I tell them the margin is where we keep what matters and does not fit.
> Some evenings, when the tide is out, a white figure walks the causeway with a long road of beds before him. He waves. I wave back. He is in no hurry for mine, and I have asked him to read it slowly.
> **FINIS**

The final page's margin lists every **Lost Name** the player found, written in red (§3.11). Then the credits.

### 3.9 Light branching

| When | Choice | What it changes |
|---|---|---|
| Ch I, the sentence | Deny it, or stay silent | Aumery's reply. Hild's remark after the confession in Ch IV: *"You lied to an abbot with a straight face. I was impressed."* or *"You didn't even lie. That's how I knew."* |
| Ch II, Amabel | **Scrape her**, refuse, or promise to come back | **If scraped:** she vanishes; Hob lays the table for one and can't say why; Hild says quietly, *"You've done that before."* (foreshadowing); Amabel appears as a hen in the Margin and is written back and read in the ending. **If refused or promised:** she keeps fraying, and in the ending she is read at home with Hob's hand in hers. If Isot promised, Isot is there too. |
| Ch III, after the twist | Forgive Hild, or don't (*"You decided for him. Like your brother."*) | Hild's last words to Isot. |
| Ch IV, Wystan | Confess, or let Wystan say it | Who tells the party, and Whit's line in the ending (*"You told them yourself. That's the harder kind of writing."*). |

### 3.10 Sample scene: the squint (Ch I)

> **HILD:** You're late. And you didn't bring bread.
> **ISOT:** I've been sentenced to be scraped at dawn.
> **HILD:** That's no excuse for no bread.
> **HILD:** Did you do it?
> **ISOT:** No.
> **HILD:** Hm. The hand that scrapes remembers, they say. Who do you remember, Isot?
> **ISOT:** …Brother Wystan. The librarian. Seventy years at that desk.
> **HILD:** Never heard of him.
> **ISOT:** No one has. That's the point.
> **HILD:** You read scraped pages by tilting the candle. Read the wall.
> *(Raking light: a bricked-up doorway shows beneath the plaster.)*
> **HILD:** Stand back. Ten years I've looked at the world through a hole the size of my hand.
> *(The wall comes down.)*
> **HILD:** It looked smaller then. It was.

### 3.11 Lost Names (optional collectible)

Ten names are hidden in underwriting across the five locations, two in each. Each one is a single line. In the ending, Whit reads the ones the player found, and the margin of the final page lists them in red.

1. *Edda Thatcher, who mended every roof in Lychford and was afraid of ladders.*
2. *Brother Osric, who sang a quarter-tone flat for forty years and was loved anyway.*
3. *Wat the ferryman, who never once charged a widow.*
4. *Little Joan, who gave a name to every hen in Hollin.*
5. *Maud of the mill, whose laugh sounded like a door that wants oil.*
6. *Gervase, a pedlar of ribbons, who walked every road twice.*
7. *Old Cutha, who kept bees and told them everything.*
8. *Nell and Tom Fisher, married sixty years, who argued about the same boat for all of them.*
9. *Hamo the bellringer, who rang the passing bell for the last time on the night of the Mercy.*
10. *A girl of Lychford, born in the Grey Year, who was never written in time.* (Isot gives her a name in the margin.)

---

## 4. Combat

### 4.1 The field

A battle is a **framed miniature**: a gothic arcade over a patterned (diapered) background, with a strip of ground underneath.

- **Party.** The party stands on the left in three places: **Front**, **Middle** and **Rear**. The default order is Whit in the Front, Hild in the Middle and Isot in the Rear.
- **Enemies.** Enemies stand on the right in up to four places, numbered from the front (**1st–4th**). Large bosses may take up two.
- **Intents.** Above each enemy floats a **banderole**, the speech scroll of medieval art. Its intent for the round is written on it in red ink: what it will do, to which place or person, and how hard. Each banderole is numbered with its order of action. Small pips show which party places it will hit, and hovering draws a dotted red line to the target.

### 4.2 The round

1. **Omen.** Every enemy writes its intent on its banderole.
2. **Party phase.** Each standing character acts once, in any order.
   - Actions resolve immediately, so you see the result before choosing the next one.
   - Once per round, a free **Step** swaps two neighbouring allies.
   - **Undo** works freely within this phase. It is a planning game, not a dexterity test.
3. **Enemy phase.** Intents resolve in their numbered order, against whoever stands where they point at that moment.
4. **Round's end.** Countdowns tick (Tally, wind-ups, the tide), Ink refills by 1, and the next Omen begins.

### 4.3 Reading intents

- **Aimed at a place** ("the Front"): hits whoever stands there when it resolves. If you move, someone else takes it.
- **Aimed at a person** ("Isot"): follows her wherever she stands.
- **Close intents** need the enemy to stand in the 1st or 2nd place, and can strike only the Front or Middle. Push the enemy further back and the intent fizzles ("cannot reach").
- **Empty or fallen target:** if the target place holds a fallen ally or nobody, the blow carries back to the next standing ally behind it, or forward if there is none.
- **Immured units** can't be aimed at. Intents against them fizzle.
- **Wind-ups** show a countdown ("in 2").
- **Hidden intents** show **?** until they are Glossed or Squinted.

### 4.4 Resources

- **HP.** Numbers are small so the arithmetic stays in your head: Isot 12, Hild 22, Whit 18.
- **Ink (Isot).** Starts at 2, refills 1 per round, maximum 3.
- **Penance (Hild).** Some of her abilities cost her own HP. She can't pay with her last point.
- **Whit** has no resource. His power is in timing.

### 4.5 Statuses (the complete list)

| Status | Effect |
|---|---|
| **Ward *n*** | Absorbs *n* damage. It fades when its owner's side next begins to act, so the party's Ward lasts through the enemy phase and an enemy's Ward lasts through your phase. |
| **Glossed** | Intent revealed for the rest of the battle. The next damage it takes is +3. |
| **Tally *n*** | Goes down by 1 each time the unit is damaged and at each round's end. At 0: **Reckoning**, 7 damage. |
| **Immured** | Can't act or be targeted until the round ends. An immured enemy's intent waits and is performed next round instead. |
| **Smudged** | Isot's next Ink ability costs +1. |
| **Shelled** | Each hit deals at most 1, including a Reckoning. |
| **Rubricated** | This unit's next ability this round is doubled. |
| **Forgotten** | Removed from the field for 2 rounds. Final battle only. |
| **Fallen** | At 0 HP. Can be raised by Shrive. |

### 4.6 Abilities

Each character ends the game with 4–5 abilities. They unlock at story beats, never through XP.

**Isot, the Editor**

| Ability | Unlock | Cost | Effect | Rubricated by an ally? |
|---|---|---|---|---|
| **Penknife** | I | — | 2 damage to any enemy. (She throws it. It's on a cord. Wystan's idea.) | — |
| **Gloss** | I | — | Annotate an enemy: reveal its intent; the next damage it takes is +3. | — |
| **Strike Through** | I | 2 Ink | Cancel one enemy intent this round. A red line crosses out the banderole. | — |
| **Emend** | II (upgraded in III) | 1 Ink (2 to name an enemy) | Change the target of a single-target intent, whether it is aimed at a place or a person, to another ally. After the upgrade, it can aim the blow at another enemy instead. | — |
| **Rubric** | IV | 1 Ink | Rubricate an ally: their next ability this round is doubled. | — |
| **Inscribe** | Final battle | — | Write the next letter of FINIS. | — |

**Hild, the Warden**

| Ability | Unlock | Cost | Effect | If Rubricated |
|---|---|---|---|---|
| **Shove** | I | — | From the Front or Middle: 2 damage to the 1st enemy, then push it to the back of the enemy line. | 4 damage |
| **Shrive** | I | 3 HP | An ally regains 6 HP, or a fallen ally rises with 6. | Heals 12 |
| **Immure** | II | 2 HP | Wall in any unit, ally or enemy, until round's end (§4.5). | Lasts through next round |
| **Squint** | III | — | Reveal all hidden intents, and show every enemy's intent for the *next* round as well. | Two rounds ahead |
| **Benison** | V | once per battle | All allies regain 5 HP and gain Ward 3. | 10 HP and Ward 6 |

**Whit, the Reckoner**

| Ability | Unlock | Cost | Effect | If Rubricated |
|---|---|---|---|---|
| **Lance** | I | — | From the Front or Middle: 4 damage to the 1st or 2nd enemy. | 8 damage |
| **Tally** | I | — | Set Tally 3 on any enemy (§4.5). | Reckoning deals 14 |
| **Vigil** | II | — | From the Front or Middle. This round, the first enemy whose intent would strike an ally is struck first, for 4. If it falls, its intent is lost. | Strikes for 8 |
| **Read Aloud** | III | — | End any enemy with 6 HP or fewer. Some bosses must be finished this way. | Threshold 12 |

### 4.7 Positioning, timing and synergy

- **Positioning.** Place-aimed blows can be dodged with Step. Close attacks fizzle if Shove pushes the attacker back. Lance and Shove need the right places on both sides. Some bosses move your party around.
- **Timing.** Tally counts down to a Reckoning that you can aim at a moment of vulnerability. Immure delays an intent rather than cancelling it. Wind-ups give you a deadline. The order of actions within your phase matters: *act first, then Immure* protects an ally who has already used their turn.
- **Synergies, by design:**
  - Gloss followed by any hit: +3 damage.
  - Isot's cheap Penknife hits wind down Whit's Tally.
  - Shove brings an enemy into Lance range, or pushes a Close attacker out of reach.
  - Emend sends a blow onto a Warded Hild, or, after the upgrade, into another enemy.
  - Rubric doubles a partner's key move, most dramatically Rubric with Read Aloud (Boss IV).
  - Vigil plus Emend: redirect an attack onto Whit's watch.

### 4.8 Winning, losing, retrying

- **Victory:** every enemy has fallen, or the fight's objective is met (Boss V). Defeated marginalia aren't killed, because nothing in Hollin dies. They scatter back into the border as sketches.
- **Defeat:** every ally has fallen, or the objective has failed. *"The ink runs."* You can **Try again**, which restarts the same fight instantly, or **Return to the page**, which goes back to the map.
- **No attrition.** The party is fully restored after every battle, so each fight is a self-contained puzzle.
- **Gentle Hand** (a setting): the party has +50% HP and Ink refills by 2 per round. It is offered after two defeats in a row, never forced.

### 4.9 Determinism

There are **no hidden rolls**: no misses, no critical hits and no damage ranges. Enemy behaviour is scripted as patterns and conditions. If an enemy has to choose between equal options, it uses a random generator seeded per encounter, and the choice is shown on its banderole before you act. Retrying a fight gives you the same puzzle.

### 4.10 Enemy roster

These are baseline numbers, to be tuned in playtests.

| Enemy | Seen in | HP | Behaviour |
|---|---|---|---|
| **Gryllus**, a head on legs | I, III | 4 | *Butts the Front · 2* (Close) |
| **Pumice Brother** | I, III, V | 9 | *Scours the Front · 3 and strips Ward* (Close), then *Rasps at the Rear: Smudge* (Far), repeating. Sometimes *Holds the line: an ally gains Ward 3*. |
| **Snail** | IV | 6 | *Creeps: Front · 2*, then *Withdraws (Shelled)*, alternating |
| **Marginal Hare** | II, IV | 5 | *Looses an arrow at the Rear · 3* (Far), or *Bounds to the back* (swaps to the rearmost place) |
| **Babewyn**, a two-headed hybrid | II, IV | 10 | **Two banderoles every round:** *Bites the Front · 3* and *Spits at the Middle · 2* |
| **Wodewose** | III | 16 | *Gathers (in 2)…*, then *Clubs the Front · 9*, then *Roars: the party's Ward is stripped* |
| **Prior Gaudry** | III | 18 | *Edict: the Front shall kneel* (the Front ally can't act next round), and *Scours* |
| **Caladrius**, a bestiary bird | IV | 6 | *Looks away from [ally]: that ally takes double damage this round* (the bird of the bestiary looks away from those about to die), or *Flutters: Ward 2* |
| **Bishop-fish** | IV | 8 | *Blesses an ally: heals 4 and gives Ward 2* |
| **Blotlet** | IV boss | 4 | See Boss IV |

### 4.11 Encounters

There are 14 fights in all, each placed by hand and visible on the map. Touching the enemies starts the fight.

| # | Ch | Where | Enemies | Teaches |
|---|---|---|---|---|
| F1 | I | Scriptorium | 2 Grylli | Intents, Penknife, Gloss, Strike Through (Isot alone) |
| F2 | I | Cloister | 2 Pumice Brothers | Places, Step, Shove, Shrive (Isot and Hild) |
| **B1** | I | Causeway | **The Great Snail and the Tide** | Tally timing, cancelling (full party) |
| F3 | II | Lychford Lane | 3 Hares | Protecting the Rear, Emend |
| F4 | II | Lych-gate | 2 Babewyns | Several intents per enemy, Immure |
| **B2** | II | Village Green | **The Mummers' Play** | Shove rotation, reach, kill order, Vigil |
| F5 | III | Blanchwood | Wodewose and Gryllus | Wind-ups |
| F6 | III | Hermit's Ruin | Prior Gaudry and 2 Brothers | Edicts, Squint |
| **B3** | III | Knell Ossuary | **The Danse Macabre** | Hidden information, Emend onto enemies, tracking |
| F7 | IV | Ivy Gate | Caladrius and 2 Hares | Read Aloud, dodging marked doom |
| F8 | IV | Drollery Fair (optional) | Bishop-fish, Babewyn and Snail | Priorities, Rubric |
| **B4** | IV | The Ink-Well | **The Blot** | Rubric with Read Aloud, Ink economy, restraint |
| F9 | V | Cloister at dawn | 3 Pumice Brothers | The full kit |
| **B5** | V | Abbey Church | **Abbot Aumery: the Writing of FINIS** | Protection, action order, everything |

### 4.12 Boss design principle

Every boss is a puzzle with **more than one solution**, and each one leans on a *different* pair of abilities:

| Boss | Main test | Key pairing |
|---|---|---|
| Great Snail | Timing | Whit's Tally with Isot's Strike Through |
| Mummers | Positioning and kill order | Hild's Shove with Whit's Lance and Tally |
| Danse Macabre | Hidden information and redirection | Hild's Squint with Isot's Emend |
| The Blot | Restraint and resources | Isot's Rubric with Whit's Read Aloud |
| Aumery | Protection and action order | All three: Immure after Inscribe, Emend, Benison |

### 4.13 Bosses

#### Boss I: The Great Snail of the Causeway
*In English and French marginalia, knights fighting snails is the oldest joke there is. Here the joke has teeth.*

- **HP 24**, in the 1st place, drawn large. It repeats a three-round cycle:
  1. **Horns out:** *Lashes the Front · 5*. It is vulnerable this round.
  2. **Withdraws:** becomes **Shelled**. *Gathers the tide… (next: everyone · 3)*.
  3. **Slime tide:** *Drenches everyone · 3*. It is still Shelled.
- **The Tide** is an environment banderole at the edge of the field: *a wave breaks over the Front · 2 every third round.*
- **Solutions.**
  - Time Whit's Tally so it reaches 0 during a *Horns out* round. For example, set it in round 3; the round's end takes it to 2, and two hits in round 4 trigger a full 7-damage Reckoning.
  - Strike Through the slime tide.
  - Step Hild into the Front before the lash.
- **Teaches** that intents are promises and that countdowns can be aimed.

#### Boss II: The Mummers' Play
*Lychford's players have performed the same Midwinter play every night for ten years. In the play the Doctor raises the slain, and in a world without death, he really can.*

Each intent is shown as a rhyming couplet with the rule written underneath.

| Mummer | Place | HP | Behaviour |
|---|---|---|---|
| **Saint George** | 1st | 12 | *"Here comes I, Saint George, the valiant man; I'll smite the foremost if I can!"* (**Front · 4**), alternating with *Stands guard over the Doctor* (the Doctor can't be targeted this round) |
| **Bold Slasher** | 2nd | 10 | *Slashes the Middle · 3* (Close), alternating with *Hurls his blade at the Rear · 3* (Far) |
| **Doctor Ball** | 3rd | 8 | If a mummer has fallen: *"I've a little bottle by my side; the fellow's up who should have died!"* (**raises one at full HP, once per round**). Otherwise: *Doses George: heals 4* |

- **Solutions.**
  - Shove rotates the line. One Shove brings the Doctor within Lance range, but only on rounds when George isn't guarding him.
  - Set Tally on the Doctor. The count ignores guard and reach.
  - Strike Through a revival.
  - Fell George and the Slasher in the same round. The Doctor can raise only one.
  - Use Vigil to punish George's smite.
- **Ending.** The paper masks fall, and frayed villagers weep with relief that something has ended.

#### Boss III: The Danse Macabre
*Four skeletons in the rags of their stations (a Pope, a King, a Ploughman and a Child) dance in a ring, because the one who should lead them never came.*

- **Hidden intents.** Every banderole shows **?** until it is Glossed (one) or Squinted (all, plus the next round).
- **Only the Leader can be harmed** by party attacks. The others are *Hollow*, and blows pass through them. The Leader is the Child, and nothing reveals it except a Gloss or a Squint.
- **The dance turns.** At every round's end the dancers rotate one place. A banderole at the top shows which way.
- **Followers' intents:**
  - *Takes the hand of the Front:* Front · 3, then swaps the Front ally with the Middle ally. The dance pulls your formation apart.
  - *Whirls:* Middle and Rear · 2.
- **The Leader's intent:** *Calls the tune: every dancer acts twice next round.* Strike Through it, or Immure the Leader.
- **Dancers can hurt each other.** An upgraded Emend can turn a follower's blow onto the Leader. The Leader has **24 HP**.
- **Solution.** Find the Leader, then track it through the rotation. Tally follows it wherever it goes, Emend turns the dance against itself, and Immure stops a dancer from scrambling your places.
- **Ending.** The dancers bow to Whit, which leads into the midpoint twist (§3.5).

#### Boss IV: The Blot
*Every scraped name has drained down to the Ink-Well for ten years, and the pool has woken up. Somewhere inside it is the first word ever scraped.*

- **The Blot:** **30 HP**, in the 2nd place. Any *single hit of 4 or more* splits off a **Blotlet** (4 HP) into the nearest empty enemy place.
- **Blotlets:**
  - *Seeps back into the Blot: heals it 5* (only when next to it).
  - Otherwise, *Spatters the Rear · 2*.
  - Hitting one with Isot's Penknife **fills her pen: +1 Ink**.
- **The Blot's intents:**
  - *Engulfs the Front · 5 and Smudges.*
  - *Swallows a name: heals 6.*
  - *Wells up: a Blotlet rises.*
- **Ink does not die.** Damage can't bring the Blot below 1 HP. It must be **Read**.
- **Solution.**
  - Big hits are a trap, because they make Blotlets.
  - Use small hits, harvest Blotlets for Ink, Read them, and Immure any that are about to seep back.
  - Once the Blot is at 12 HP or less, **Rubric then Read Aloud** (threshold doubled to 12) ends it.
- **Ending.** In the drained well lies one bright word, FINIS. Isot fills her inkhorn with it.

#### Boss V: Abbot Aumery and the Writing of FINIS
*Saint Ebb's at dawn. The Book lies open on the altar. The lectern stands at the party's Rear. Aumery has the Abbey behind him and pumice in his hand.*

- **Objective.** Isot, at the lectern in the Rear, uses **Inscribe** to write **F‑I‑N‑I‑S**, one letter per action.
  - If Isot takes any damage in a round in which she inscribed, that letter smudges and is lost.
  - If Isot falls, the battle is lost.
- **Aumery: 40 HP.** He can't be defeated by damage, but every 10 damage makes him **Falter**, which cancels his next intent. This keeps the party's attacks meaningful.
- **Aumery's intents:**
  - *EDICT: let none stand before me:* at round's end, Front · 6.
  - *Scrapes WHIT from the page:* Whit is **Forgotten** for 2 rounds.
  - *Pumices the page:* **Isot** · 4. This is aimed at her by name, so Step won't save her.
  - *Sermon:* Ward 6.
  - *Calls a Brother:* a Pumice Brother enters an empty place.
  - After the 4th letter: *Gathers the pumice… (next round: every letter scraped).* Strike Through it, Immure him, or make him Falter.
- **Support:** two Pumice Brothers, in the 1st and 3rd places, 9 HP each.
- **Tools.**
  - **Inscribe first, then Immure Isot.** She can't be targeted, and her letter stands.
  - Emend can move *Pumices the page* onto Hild.
  - Benison's Ward soaks a spatter.
  - Tally plus Lance makes Aumery Falter at the right moment.
- **Sound.** Each letter tolls a bell. The fifth toll merges with the passing bell of Lychford.

---

## 5. Locations

Each location has its own palette (hex values from the pigment set in §6.3), a mood for its music, and at least one puzzle or secret. The puzzles all build on one exploration verb, **raking light** (§8.3), so each new puzzle deepens a single idea instead of adding a new mechanic.

### 5.1 Saint Ebb's by night (Ch I)

- **Place.** A tidal island abbey: a scriptorium lined with chained books, a cloister, the church with Hild's anchorhold built into its wall, a sea gate and the long causeway into fog.
- **Palette.** Lapis-deep `#172A5C`, lapis `#24418F`, azurite `#4A73B5`, slate `#5E6572`, lead-white `#F8F2E4`, gold `#C9A23C`. Vermilion `#C63D2A` appears only in rubrics. The grade is cool, with warm pools of candlelight. The diaper pattern is lapis and gold lozenges.
- **Music.** D Dorian. Generative plainchant in organum (a second voice a fifth below), the tide breathing underneath, and a distant bell every forty seconds or so.
- **Environment.** Wystan's empty desk. A brother who insists that desk has always been empty. The lectern motto. The causeway knight whom the fishermen row around.
- **Puzzles and secrets.**
  - The raking light tutorial: the bricked-up doorway, then the painted-over door in the cloister.
  - **Secret:** Wystan's note in his psalter.
  - Lost Names 1–2.

### 5.2 Lychford, Midwinter (Ch II)

- **Place.** A fen village in snow: cottages, the green, the church and churchyard, a bell tower, and the lych-gate covered in roses.
- **Palette.** Minium `#DA6A32`, madder `#A63A4C`, brazil-rose `#D58193`, ochre `#BC8D42`, umber `#6C4B2D`, verdigris `#2E8B74`. Snow is bare vellum shaded with azurite hatching. The grade is a low warm sun with long blue shadows. The diaper is a red and gold checker.
- **Music.** G Mixolydian in a lilting 6/8, on hurdy-gurdy drone and lute. The carol tune **never reaches its final note**; it loops just short of the cadence. After the bell puzzle, it finally resolves.
- **Environment.**
  - Ten-year-old roses.
  - No new graves.
  - The mirror-polished spade.
  - Fraying elders.
  - The children's game of "Mercy".
  - The rehearsal of a play that can't end.
- **Puzzle: the passing bell.** The tower has four bells, and their names are rusted away until raking light shows them: *Morning*, *Weeper*, *Singer*, *Tenor*. The children's skipping rhyme gives the order:
  > *Weeper weeps and Morning calls,*
  > *Singer sings in empty halls;*
  > *wake the Tenor last of all,*
  > *and someone's name will heed the call.*

  The answer needs both sources, the rhyme heard in the village and the names read in the tower. Ringing in the wrong order just makes a clangour, with no penalty.
- **Secrets.**
  - Hild's empty grave (raking light on the headstone).
  - Lost Names 3–4.

### 5.3 The Blanchwood and Knell Chapel (Ch III)

- **Place.** A forest that loses its colour and outline the deeper you go. The game's colour grade here moves towards **grisaille**, the grey monochrome painting of Jean Pucelle, and then to bare vellum. At the centre stands a small chapel to the Reader, with an ossuary below.
- **Palette.** Sap green `#627F35`, terre-verte `#93A77F`, folium `#6B3C70`, umber `#6C4B2D`, bone `#E9DDC2`. Saturation drains with depth. The chapel uses bone, lamp-black `#18140F`, folium, silver `#B9BDC2` and a single vermilion. The diaper is green foliage scrolls that fade, then black with silver stars in the ossuary.
- **Music.** E Phrygian, sparse, on solo recorder and psaltery. The generator **drops notes** more often the deeper you go, so the music frays too. At the chapel there is almost silence: wind and a very slow drum.
- **Puzzle: the Faded Path.** The road has blanked out. Raking light shows the ghost of the old path, which you walk across visible nothing. A wrong step folds the wood back to the start of that stretch, with no damage.
- **Puzzle: the Danse Macabre mural.** Six panels, each a living figure led by a Death, have slid out of order. The inscription *"From the highest to the least the dance goes down"* gives the order: Pope, King, Knight, Merchant, Ploughman, Child. You restore it by swapping panels. The Knight's Death has no face, only a blank shield.
- **Secret.** A hermit's ruin with Lost Names 5–6.

### 5.4 The Margin (Ch IV)

- **Place.** The ornamental border of the world: giant acanthus and ivy scrolls, bars of burnished gold, drolleries everywhere, the Drollery Fair, Wystan's vine and, at the bottom, the Ink-Well.
- **Palette.** Gold dominates (base `#C9A23C`, light `#F4DE8E`, dark `#85661E`), with vermilion `#C63D2A`, lapis `#24418F`, malachite `#4CAA6C`, brazil-rose `#D58193` and orpiment `#E2B73F`. The grade is saturated and glowing, and the ground itself is burnished gold. This is the most colourful place in the game, and the saddest.
- **Music.** F Lydian, bright and bouncy. Psaltery and recorder trade notes in **hocket** (a medieval technique where two instruments alternate single notes of one melody), over tabor and plucked vielle, slightly detuned so it feels comic and dreamlike. A low minor drone runs underneath. At Wystan's vine everything falls away to a solo psaltery playing the Book motif.
- **Puzzle: catchwords.** The Margin is made of the borders of thousands of pages. Each exit carries a scribe's catchword, the word written at the foot of a page that tells the binder which page comes next. The right sequence spells the Abbey motto Isot knows by heart: **WHAT · IS · WRITTEN · IS · HELD**. A wrong exit loops back to the start of that section.
- **Secrets.** Side branches hold Lost Names 7–8 and the optional fight. If Isot scraped Amabel, she can be found here.

### 5.5 Saint Ebb's at dawn (Ch V)

- **Place.** The same abbey as Chapter I, in new light: scriptorium, Abbot's lodging, cloister and church.
- **Palette.** Brazil-rose `#D58193`, gold-light `#F4DE8E`, azurite paling, lead-white. The Book itself is lamp-black and gold. **When FINIS is written, the full pigment set appears together for the first time.**
- **Music.** The Chapter I chant returns with a second and third voice and morning birds, and a held tension note in the church. The ending is described in §7.
- **Secrets.**
  - Aumery's Book of Hours.
  - Lost Names 9–10.

---

## 6. Art direction

### 6.1 Medium and why

The medium is **a Gothic illuminated manuscript**: English and French work from about 1300 to 1350, such as the Luttrell, Gorleston, Macclesfield and Queen Mary Psalters, and Jean Pucelle's Hours of Jeanne d'Evreux. These manuscripts are famous for their **marginalia**: drolleries, grotesques, snail-fighting knights, and hares with crossbows.

It's the right choice for three reasons:

1. **The story is about a book,** so the art style and the world's rules are the same thing.
2. **It gives the enemies a voice no other game has:** absurd, hybrid, funny and sad.
3. **Its conventions suit procedural generation and an orthographic camera.** Flat colour, ink outlines, gold leaf, patterned backgrounds, no linear perspective, and figures arranged like a frieze.

### 6.2 Rendering rules

- **Everything sits on vellum.** It is a warm off-white with noise-based grain, hair-follicle specks and slight cockling (uneven light). Faint ruling lines, the scribe's guide lines, run across every screen.
- **Iron-gall ink outlines.** Dark brown-black lines of slightly varying width, drawn with Bezier curves and a simulated broad nib held at a fixed angle, so strokes get thick and thin the way a real pen's do.
- **Flat gouache fills** from a limited palette. Modelling comes from a darker band along one edge and **lead-white highlight strokes** on folds, never from gradients.
- **Gold leaf** is used sparingly: halos, initials, the Book, key UI and the Margin. It is drawn as flat ochre with an animated glint as light moves across it.
- **Diaper backgrounds** (repeating lozenge, checker and foliage-scroll patterns) sit behind every battle miniature, as in real miniatures.
- **No linear perspective.** Maps are drawn the way medieval maps are: a flat painted ground with buildings, trees and figures standing up in elevation, sorted by depth. This suits an orthographic camera and layered planes exactly.

### 6.3 Pigments (the master palette)

Every colour in the game comes from this list of historically plausible pigments. Each location uses a subset, given in §5.

| Pigment | Hex | | Pigment | Hex |
|---|---|---|---|---|
| vellum | `#EFE4CC` | | lapis (ultramarine) | `#24418F` |
| vellum-shade | `#E2D2B0` | | lapis-deep | `#172A5C` |
| vellum-deep | `#CDB68C` | | azurite | `#4A73B5` |
| iron-gall ink | `#2A1C14` | | verdigris | `#2E8B74` |
| lamp-black | `#18140F` | | malachite | `#4CAA6C` |
| lead-white | `#F8F2E4` | | sap green | `#627F35` |
| vermilion | `#C63D2A` | | terre-verte | `#93A77F` |
| minium (red lead) | `#DA6A32` | | orpiment | `#E2B73F` |
| madder | `#A63A4C` | | ochre | `#BC8D42` |
| brazil-rose | `#D58193` | | umber | `#6C4B2D` |
| folium | `#6B3C70` | | slate | `#5E6572` |
| bone | `#E9DDC2` | | silver | `#B9BDC2` |
| gold (base / light / dark) | `#C9A23C` / `#F4DE8E` / `#85661E` | | | |

### 6.4 Shape language

| What | Shapes |
|---|---|
| **People** | Tall, slender figures with the Gothic S-curve sway. Small heads, long hands, almond eyes, rosy cheek spots, and deep V-shaped drapery folds. Drawn in profile or three-quarter view. |
| **Marginalia (enemies)** | Round, absurd and hybrid. Bulbous bodies, tails that curl into vines, silly faces. Comic-grotesque, never gory. |
| **The Abbey and Aumery** | Verticals, pointed arches, strict symmetry and ruled straight lines: order and control. |
| **Lychford** | Low, round and lumpy. Thatch, snow drifts and crooked timber. |
| **The Margin** | Spirals, acanthus and ivy leaves, endless curling scrollwork: wild growth. |
| **Death and Whit** | Blank argent: an absence. Clean, unadorned and calm. |

**Fraying is the illuminator's process run backwards.** Full gouache thins to a *tinted drawing* (outline plus light wash, the Queen Mary Psalter look), then to a bare *underdrawing* in lead point, then to blank vellum. A single `fray` value from 0 to 1 drives this on any sprite or area.

**Painting is the same process run forwards.** Every battle opens with the miniature being made: ruling, underdrawing, gilding, paint, then ink. Defeated enemies fray back into sketches and scurry off into the border.

### 6.5 Characters, creatures and places

- **Party, NPCs and portraits** are built from data-driven *figure specs* (silhouette control points, garment layers, props, palette) through one shared figure drawer. Poses are idle, walk, act, hurt and fallen.
- **Portraits** are drawn in quatrefoil frames, with expression variants (neutral, wry, grieved, alarmed) made by changing brows, eyes and mouth.
- **Drolleries** each get their own generator, so the silhouettes stay distinct: gryllus, snail, hare, babewyn, wodewose, caladrius, bishop-fish, skeleton dancers, the Blot, and the ape-scribe.
- **The Blot** is drawn by a GLSL shader (metaball-style shapes with feathered ink edges), not a canvas sprite.
- **Architecture** is drawn in elevation with stacked towers, crenellations, pointed arches, rose windows and patterned tiled roofs.
- **Nature** uses manuscript conventions: lollipop trees with clustered leaves, rows of grass tufts, water as parallel wavy lines with white crests, and roads as ochre bands with pebble dots.

### 6.6 Typography and UI

- **Body text** uses system serif fonts only: `"Palatino Linotype", "Book Antiqua", Palatino, "URW Palladio L", Georgia, "Times New Roman", serif`. It is drawn to canvas textures so it receives the same parchment treatment as everything else.
- **Display capitals** for the title, chapter openings and the FINIS letters are Lombardic capitals defined as Bezier skeletons and drawn with the simulated broad nib, then filled with colour or gold and surrounded by red and blue pen-flourishing. *Fallback, if the result is mediocre:* system serif glyphs with procedural filigree.
- **Rubrication.** Speaker names, key terms and enemy intents are in vermilion.
- **Dialogue box.** A ruled panel at the foot of the page, with a portrait in a quatrefoil, the name in red and text that inks in quickly with a slight bleed. A blinking **manicule** (☞, the pointing hand drawn in real manuscript margins) means "continue". Choices are numbered lines marked with a ¶ (pilcrow).
- **Interaction prompt.** A small red manicule appears beside anything you can use. The mouse cursor is a procedurally drawn quill.
- **Battle commands.** A ruled text block under the miniature with one column per character. Abilities are listed with ¶ marks. HP is a row of small vermilion lozenges plus a number, and Ink is three small inkpots. Tooltips are slips of parchment.
- **Interludes.** A full illuminated page: a large decorated initial containing a scene, a red title, three to five lines of Isot's prose and a vine border. It ends with a page turn.
- **Title screen.** The closed Book in tooled leather with metal bosses and clasps, all drawn procedurally. It opens onto a title page reading PALIMPSEST in gold.

### 6.7 Animation

Figures move like **paper puppets**: pose swaps plus tweened slides, tilts, bobs and squashes, never frame-by-frame animation. This is cheap to build and true to the style.

- **Walking:** a bob and sway.
- **Attacking:** a lunge, with an ink-splash where the hit lands and red-ink damage numbers that dry on the page.
- **Falling:** the figure tips over flat.

Ambient life comes from the border. Its drolleries react to what happens: a hare peeks in, a snail crawls along the edge, and in the Margin they watch you.

### 6.8 Rendering pipeline

**The page.** The game renders a 16:9 page at a logical size of 1280×720. The text block, the area inside the margins, holds the map or battle. The ornamental border around it is live. Any extra screen space is letterboxed with a dark desk tone.

**Layers.** Planes are drawn in this order, back to front:

1. Vellum page
2. Ground painting
3. Underwriting (masked)
4. Props and actors, sorted by depth
5. Foreground
6. Particles
7. Border and margin
8. UI
9. Post-processing

**Material model.** Every generated sprite has a colour texture (the paint) and a mask texture that separates out ink coverage, gold coverage and white highlights. One sprite shader combines them. This lets the post-processing treat ink, paint and gold differently, and it powers the fray and paint-in effects.

**Post-processing (custom GLSL passes):**

1. **Ink bleed:** feathers and capillary-spreads ink edges by displacing them with noise.
2. **Pigment granulation:** paint texture where there is colour.
3. **Vellum composite:** multiplies the scene over the page, with grain, cockling and foxing (brown age spots).
4. **Gold shimmer:** an animated glint inside gold areas.
5. **Colour grade:** lift, gamma, gain, tint and saturation for each location.
6. **Blanch:** desaturates and breaks lines by area, from a blanch map.
7. **Raking-light lens:** reveals the underwriting layer in a soft circle.
8. **Vignette:** a warm darkening at the page edges.

Each pass can be switched off from the debug menu, which makes art feedback easier.

**Generators** are reusable modules that share one drawing API (§10.2), for example:

- `drawVellum(seed)`
- `drawFigure(spec, pose, palette)`
- `drawSnail(seed, palette)`
- `drawAbbey(seed, palette)`
- `drawBorder(seed, palette, density)`
- `drawDiaper(kind, palette)`
- `drawInitial(letter, scene, palette)`
- `drawBanderole(text, palette)`
- `drawPortrait(character, expression)`

---

## 7. Audio direction

Everything is synthesised at runtime with the Web Audio API. There are no samples.

### 7.1 Instruments

| Instrument | How it's made |
|---|---|
| Psaltery, lute, harp | Plucked strings (Karplus–Strong) |
| Vielle, hurdy-gurdy | Bowed saw waves through a low-pass filter, with vibrato. The hurdy-gurdy adds a "buzz" from waveshaping. |
| Chant voice | Formant-filtered saw waves, layered in organum (parallel fifths and fourths) |
| Recorder | Sine plus breath noise |
| Tabor | A pitched membrane plus noise |
| Bells | FM synthesis with inharmonic partials. Bells are central: the Abbey bells, the passing bell, and the FINIS tolls. |
| Organ drone | Additive sine waves |

### 7.2 Composition

Music is written in the **medieval church modes**. Every location has a short composed motif stored in data, which the generator develops with chant-like melodic contours, cadences on the mode's home note, and small variations, so it sounds alive without being random noise.

**Leitmotifs**

| Motif | Description | Where it returns |
|---|---|---|
| **The Book** | D Dorian chant: D F G A G F E D | The battle theme and the final boss |
| **Hild's lullaby** | A short falling phrase, first heard faintly through the squint | The ending |
| **The Knell** | A low bell, a fifth and a falling fourth | Whit's memories, the bell puzzle and the FINIS tolls |
| **Isot's flourish** | A quick rising figure, like a pen stroke | Dialogue openings and victories |

### 7.3 Music by location

| Location | Mode / tempo | Instruments | Notes |
|---|---|---|---|
| Saint Ebb's, night | D Dorian, free rhythm | Chant voice in organum, tide noise, distant bell | Hushed, cold and holy. The causeway adds gulls and a fog drone. |
| Lychford | G Mixolydian, 6/8 at about 92 bpm | Hurdy-gurdy, lute | The tune **can't cadence** until the bell rings, and then it resolves. |
| Blanchwood | E Phrygian, about 60 bpm | Recorder, psaltery | **Notes drop out** with depth. Near silence at the chapel; low organ and bone clicks in the ossuary. |
| The Margin | F Lydian, about 112 bpm | Psaltery and recorder in hocket, tabor, plucked vielle | Comic, detuned and dreamlike over a low minor drone. |
| Saint Ebb's, dawn | D Hypodorian | Chant in three voices, birds | Tension in the church. |
| Interludes | — | Solo psaltery and a quiet chant voice | Turning pages. |

**Battle theme: "Estampie".** D Dorian in 6/8 at about 138 bpm, in the shape of a medieval dance. A tabor ostinato and a drone carry a vielle melody built from the Book motif in shorter note values. Layers build as the fight goes on.

- **Boss variant:** heavier, at about 126 bpm, with low bells on the downbeats and the melody doubled a fifth below.
- **Final boss:** the Book motif in long notes over the estampie. Each Inscribed letter adds a bell, and after S the music cuts to silence, followed by the Lychford passing bell.

**Ending.** Hild's lullaby on psaltery, then the full consort. The last cadence is the only **major chord** in the whole score (a "Picardy third"), saved for the moment the world can finally end.

### 7.4 Sound effects

| Event | Sound |
|---|---|
| Dialogue text | Quill scratch: band-passed noise grains |
| Scene transitions | Page turn: a noise swoosh with a paper flap |
| Hits | Ink splat: a low thump plus wet noise |
| Lance | Metallic FM clang |
| Hild's walls | Stone crack and grind |
| Scraping (the villain's signature) | Pumice rasp |
| Bells | FM bells |
| Grylli | Squeak |
| Snail | Squelch |
| Dancers | Bone clatter (wooden FM clicks) |
| The Blot | Gurgle (low noise through a moving filter) |
| Gold | Shimmer (high sine glints) |
| UI | Small bell ticks |
| Footsteps | Stone, snow, grass, gold and bone each sound different |

### 7.5 Mixing

- Separate buses for music, ambience, effects and UI feed a master compressor.
- Reverb uses convolution with **impulse responses generated at runtime**: a long one for the church, a medium one for the cloister, a dry one outdoors, and a shimmering one in the Margin.
- Audio starts only after the first key press ("open the book") to satisfy browser autoplay rules.

---

## 8. Exploration and interface

### 8.1 Movement

- Isot leads, and the others follow in a short line.
- Movement is free and smooth, with collision against a tile grid.
- The camera follows softly inside the text block and is bounded by the map.
- You can also click to walk.

### 8.2 Interaction

- A manicule marks anything interactive: people, objects, doors, lecterns and encounters.
- Enemies on the map are drawn in place, idling, with a small red banderole showing their name. Touching them starts the fight.

### 8.3 Raking light (the exploration verb)

Hold a key (R, the right mouse button, or Y on a gamepad) and Isot tilts her candle. A soft circle around her reveals the **underwriting**: the scraped text and lines left in the vellum of the world. It reveals:

- hidden doors and paths,
- scraped inscriptions,
- puzzle clues,
- Lost Names.

It is taught in the first minute and it drives every puzzle, which keeps the systems small and on-theme.

### 8.4 Saving and menus

- **Save points** are lecterns with an open book. Autosaves also happen on their own (§9).
- **Pause menu:**
  - **Resume**
  - **The Party:** a page for each character with their portrait, description and unlocked abilities.
  - **The Chronicle:** the current objective in Isot's words, plus Lost Names found.
  - **Settings:** music and effects volume, text speed, Gentle Hand, reduced motion (turns off shimmer and wobble), and stronger ink contrast.
  - **Quit to title**

### 8.5 Controls

Keyboard and mouse come first. Gamepad support uses the Gamepad API, which is cheap to add because all input goes through one action layer. Movement and debug keys are read by **physical position**, so WASD lands on ZQSD on an AZERTY keyboard. Letter shortcuts (R, E, J, S, Z) are read by the letter printed on the key. Arrow keys always work.

**Exploration**

| Action | Keyboard | Mouse | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | Click to walk | Stick / d-pad |
| Interact or confirm | E / Space / Enter | Left click | A |
| Raking light | Hold R | Hold right button | Hold Y |
| Menu or cancel | Esc | — | Start / B |
| Chronicle | J | — | Back |

**Battle**

| Action | Keyboard | Mouse | Gamepad |
|---|---|---|---|
| Choose ally | Tab | Click portrait | LB / RB |
| Choose ability | 1–5 | Click | D-pad, then A |
| Choose target | Arrows | Click | Stick |
| Step | S, then pick a neighbour | Drag an ally onto a neighbour | X |
| Undo | Z / Backspace | Undo button | Y |
| End round | Enter (when nothing is pending) | "End the round" button | Start |

**Debug**

| Action | Key |
|---|---|
| Debug overlay | `` ` `` (the ² key on AZERTY) |
| Debug menu | Shift + `` ` `` |

---

## 9. Saving and loading

- **Storage:** `localStorage`, under the key `palimpsest:save:v1`. Each save has a version number, with migration functions when the format changes.
- **Slots:** one autosave and one manual save. **Continue** on the title screen loads whichever is more recent.
- **Autosave checkpoints:** entering any map, after every battle, at every chapter start, and after key story beats.
- **Contents:**
  - version and timestamp
  - chapter, map, position and facing
  - story flags
  - choices made
  - unlocked abilities
  - cleared encounters
  - Lost Names found
  - settings
- **Robustness:** a corrupt or unknown save is ignored with a notice, never a crash. A chapter-select debug option can create a valid save state for any point in the game.

---

## 10. Technical architecture

### 10.1 Stack

- Vite, strict TypeScript and Three.js with an `OrthographicCamera` and a single `WebGLRenderer`.
- Vitest for unit tests.
- No runtime dependencies besides Three.js.
- A static build in `dist/`.

### 10.2 Layout

```
src/
  main.ts              boot, main loop, scene stack
  engine/              renderer and letterbox, layers, post/ (GLSL passes), input (keys/mouse/gamepad → actions),
                       save, scenes, rng (seeded)
  art/                 illuminator.ts (shared drawing API: paint/ink/gild/highlight → textures), pen.ts (nib strokes),
                       palettes.ts, vellum.ts, figures.ts, drolleries.ts, architecture.ts, nature.ts,
                       ornament.ts (borders, diapers, arcades, banderoles), initials.ts, portraits.ts
  audio/               context and buses, reverb (generated IRs), instruments, music engine (scheduler, modes, motifs), sfx
  battle/core/         PURE TypeScript, no Three.js: types, state, rules, abilities, statuses, intents, enemy scripts
  battle/view/         battle scene, miniature framing, banderoles, command panel, animations driven by events
  world/               map loading, tiles and collision, movement, followers, triggers, raking light
  story/               script runner, flags, dialogue UI, choices, interludes
  ui/                  canvas text layout, panels, menus
  debug/               overlay (DOM), debug menu
  data/                characters, abilities, enemies, encounters, maps/*, scripts/*, interludes, music, palettes
tests/                 battle/*, story/*, save/*
```

### 10.3 Content as typed data

All content lives in `src/data` as typed TypeScript, so it is checked at compile time and easy to tweak. The examples below show the shape only; they are not final content.

```ts
// data/enemies.ts
export const gryllus: EnemyDef = {
  id: 'gryllus', name: 'Gryllus', hp: 4, art: 'gryllus',
  script: { kind: 'cycle', intents: [{ id: 'butt', text: 'Butts the Front', reach: 'close', target: { place: 'front' }, damage: 2 }] },
};

// data/scripts/ch1.ts
export const sentence: Script = [
  { say: 'aumery', text: 'Someone has put a knife to the Book.' },
  { choice: [
    { text: "I didn't do it.", set: { deniedToAumery: true } },
    { text: '(Say nothing.)' },
  ]},
  { say: 'aumery', text: 'Who scrapes shall be scraped. At the dawn bell.' },
  { goto: 'map:penitents-cell' },
];

// data/maps/scriptorium.ts: an ASCII tile layout plus a legend and entities (props, NPCs, encounters, exits,
// underwriting objects, lecterns), each with optional conditions on story flags.
```

### 10.4 Battle engine API

The battle engine is pure and deterministic, and fully unit-testable.

```ts
createBattle(encounter: EncounterDef, party: PartySetup, seed: number): BattleState
legalActions(state, actorId): ActionOption[]
applyAction(state, action): { state; events: BattleEvent[] }  // one party action, resolved immediately
endPartyPhase(state): { state; events: BattleEvent[] }        // enemy phase, round's end, next omen
```

- `BattleState` is plain data, so undo is just a stack of previous states.
- `BattleEvent`s (damage, intent cancelled, moved, status added, fell, Reckoning, letter inscribed, victory and so on) drive the view's animations. The view never changes the state itself.

**Tests** cover:

- every ability and status, and how they interact (Ward expiry, Tally to Reckoning, Immure delay, Shelled caps, Emend retargeting, carry-over rules for empty or fallen places, reach and fizzles);
- every boss script and its intended solutions;
- the victory and defeat conditions;
- determinism under a seed;
- the story script runner (flags, branching);
- save serialisation and migration.

### 10.5 Performance

- Textures are generated at load time per location, behind a short "preparing the vellum" screen, cached by generator, seed and palette, and disposed of when you leave.
- The target is 60 fps on integrated GPUs, with device pixel ratio capped at 2.

### 10.6 Debug tools

These ship in every build, including the GitHub Pages one, because you'll be testing there.

- **Overlay** (`` ` ``):
  - fps and frame time
  - scene, location and map position
  - chapter
  - all story flags
  - battle state: round, phase, Ink, each unit's HP, statuses and intent
  - the random seed
- **Menu** (Shift + `` ` ``):
  - jump to the start of any chapter, or into any of the 14 fights, with the correct unlocks for that point
  - set and clear flags
  - unlock all abilities
  - win the current battle
  - god mode
  - always-on raking light
  - toggle each post-processing pass
  - audio mute
  - clear save
- **URL parameters:** `?debug`, `?chapter=3`, `?fight=B3`. These make quick test links.

### 10.7 CI/CD

`.github/workflows/deploy.yml` runs on every push to `main`: install, run the tests, run `vite build`, and deploy `dist/` to GitHub Pages using `actions/upload-pages-artifact` and `actions/deploy-pages`. Vite's `base` is set to `/rpg-claude/`. The repo's Pages source will need to be set to **GitHub Actions** once, in Settings → Pages.

---

## 11. Milestones

Each milestone is playable and arrives as its own PR, with build and tests green.

| | Milestone | Deliverables | You can check |
|---|---|---|---|
| **a** | Rendering pipeline and art style | Vite/TS/Three setup, Pages deploy workflow, page and layer system, shared drawing API, vellum, nib pen, post-processing chain, border, plus a test scene with Isot and the Abbey. A first ambient drone. Debug overlay with fps and post-processing toggles. | Does it *look* like a manuscript? |
| **b** | Exploration, dialogue, saving | Maps from data, movement and followers, collision, raking light, dialogue with procedural portraits and choices, script runner and flags, save/load (autosave and lectern), Saint Ebb's night ambience. | Walk the scriptorium and cell, talk to Hild, save and reload. |
| **c** | Combat | Pure battle core with unit tests, battle view (miniature, banderoles, command panel, paint-in intro), the estampie, combat sound effects, and one test fight (F2-like). | Does planning feel good? Are intents readable? |
| **d** | Chapter I complete | All of Ch I: prologue, scenes, F1, F2, the Great Snail, Interlude I, debug jump menu. | 12 minutes of the real game. |
| **e** | Chapters II–V | All maps, scripts, fights and bosses, puzzles, Lost Names, every location's music and palette. | The full story, end to end. |
| **f** | Ending and polish | Ending and epilogue, title screen and Book cover, interludes and Lombardic initials, settings, Gentle Hand, gamepad, audio mix, transitions, a tuning pass. | The finished game. |

---

## 12. Scope guardrails

**Out of scope by design:**

- XP and levels
- random encounters
- gold, shops, equipment and inventory (key items are story flags)
- crafting
- voice acting
- mobile and touch controls
- localisation (English only)

**Cut first if quality slips, in this order:**

1. The optional fight F8.
2. The Tide in Boss I.
3. The mural puzzle, which would become a simple reveal.
4. The catchword puzzle, which would become a single riddle gate.
5. Procedural Lombardic capitals, replaced by system serif with filigree.
6. Gamepad support.

The story beats, the five bosses, raking light and the paint-in and fray effects are the core and won't be cut.

---

## 13. Questions for review

1. **Title.** Is *Palimpsest* fine, or would you like a plainer name?
2. **Darkness.** The story touches on mercy-killing. Isot scrapes her suffering teacher at his request, and Amabel asks the same of her. It is handled with restraint, with no gore and with consequences. Is that tone OK?
3. **Final battle.** Boss V is an objective fight (protect the scribe for five letters) rather than a race to empty an HP bar. Do you agree?
4. **Undo.** Unlimited undo within your own phase makes fights pure puzzles. Keep it, or limit it to one per battle for more tension?
