# Production hard lock — character sheets

**Producer instruction (absolute):** Every character other than the bull must match its approved production character sheet. No generic reinterpretation, generic olive demon, generic cleric, generic woman in a black chador, or face/clothing drift is acceptable.

## Required visual references

| On-screen role | Mandatory reference file | Non-negotiable identifiers |
|---|---|---|
| All eight bull-group basijis; the guitarist; the kicker; all turbine guards; any other basiji | `basiji-pro.jpg` | horned demon-basiji head; olive uniform construction, bare/hoof-like feet, chest webbing, coiled rope, AK-47 silhouette, sheet-specific face language and palette |
| Fused turbine-priest / آخوندتوربین | `turbine-akhund-pro.jpg` | black horned turban, long grey beard, forehead prayer stone, tattered green robe, black smoke/tendrils, integrated fan/turbine body and legs; a single fused creature, never a separate cleric alongside a turbine |
| Queen minister / زن وزیر | `zan-vazir-pro.jpg` | crowned multi-armed minister; black hair and black chador/cape, bronze armour, royal gold/black palette, flame-like hem and sheet-specific face; never a generic black silhouette |
| Little blackout demon, when used | `divche-pro.jpg` | charcoal imp body, red eyes, small horns, scissors, bell, smoke curls and candle belt |
| Narrator / candle punk, when used | `raavi-punk-pro.jpg` | must be supplied as reference when present |
| Robot angel, Saddam, golden calf, when used | matching `*-pro.jpg` in repository | must be supplied as reference when present |
| Bull | `golden-calf-pro.jpg` is available, but the producer has explicitly exempted the bull from this hard sheet requirement. |

## Generation rule

1. Every `generate_image` call with a character includes that character's approved sheet image in `images`, alongside the previous accepted motion frame and, if needed, a world-layout frame.
2. Prompt text names the sheet-specific identifiers above and says **"match the supplied character sheet exactly; preserve face, silhouette, costume, palette, and props."**
3. For frames containing multiple character types, all applicable sheet references are supplied. The absence of a sheet reference is a failing preflight check.
4. Character-count QA is separate from styling QA. A frame fails if a required figure is missing, duplicated, transformed into a generic substitute, or no longer has its required prop.
5. The fixed videogame UI bezel/HUD remains a separate pixel-locked overlay. It is not a character sheet and is never redesigned by a camera move.

## Effect on previous 01C work

All previous 01C frames were generated before this hard lock. They are **not eligible for final use** until a sheet-reference visual QA verifies every non-bull character. No more 01C generation will use a prior frame as the sole reference.
