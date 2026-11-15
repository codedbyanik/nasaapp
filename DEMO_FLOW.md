# Ares Trail — scientific demo flow

1. **Location:** show the NASA-published Perseverance landing coordinate and your selected delta-area destination.
2. **Real data:** toggle local MRO CTX imagery, CTX elevation/slope, and the separate MGS MOLA regional layer. Show source resolutions: 6 m, 20 m, and ~463 m respectively.
3. **Mission story:** a future crew wants to inspect terrain near the ancient delta. This is a fictional expedition using actual NASA observations. The question is: what evidence supports this crossing, and what still needs a closer survey?
4. **Look before walking:** click numbered checkpoints. Show the local CTX crop, a covering August 2026 HiRISE observation, capture and product dates, and the corresponding CTX terrain measurements. Open the landing-site rover panorama; at other checkpoints, explain why the delta panorama is regional context rather than a photo from that exact point.
5. **Human reasoning:** use the slope checkpoint prompt, record an observation and uncertainty, and explain source versus preview resolution. Compare an older observation where available. Newest means newest in this curated snapshot, not the entire archive.
6. **Analysis:** explain native DEM slope → conservative ~100 m route cells → A* with shared exclusions. Compare distance and mean slope, and show the evaluation CSV/plots. A lower normalized cost is not a proven reduction in operational EVA risk.
7. **Science:** show nearby DEM-derived terrain-inspection candidates. They are hypotheses to investigate, not confirmed mineral detections; detour accessibility is not verified.
8. **Handoff:** export waypoints with source hashes, checkpoint reasoning, and observation dates. Run the explicitly illustrative rover simulation. Its obstacle is synthetic, and hardware following is future work.

Pitch: “Ares Trail integrates actual Jezero CTX imagery and stereo topography with Mars Global Surveyor MOLA context. We derive slope and relief, compare routes under a shared terrain policy, and expose candidate terrain transitions for investigation. Every route export preserves its source products and assumptions.”

Show `docs/SCIENCE_METHOD.md` and `data/processed/nasa/manifest.json` if judges ask how the data were prepared. Explain 20 m source and 100 m grid limitations, selected corridor bias, and unvalidated EVA estimates.
