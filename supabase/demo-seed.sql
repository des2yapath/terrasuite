-- demo-seed.sql — demo account + showcase parcels + pre-generated reports.
-- Run ONCE in the Supabase SQL editor AFTER Module 15's verify_jwt flip and
-- BEFORE the end-to-end demo checklist. Everything is idempotent except
-- the auth user (see step 0).
--
-- ── Step 0 (dashboard, not SQL): create the demo user ──
--   Authentication → Add user:
--     email: demo@terrasuite.app
--     password: terrasuite123
--     auto-confirm: ON
--   Then run this file — it reads the user's uuid by email.
--
-- Demo parcels are chosen to exercise every showcase feature:
--   1. Punjab wheat parcel       — full rural pipeline (S1 wheat, plan, rotation)
--   2. Jaén olive parcel          — Mediterranean tree crops + intercropping
--   3. Kochi coconut parcel      — tropical + the >1500mm water-access case
--   4. Iowa maize parcel         — Temperate/Corn Belt region detection
--   5. Urban courtyard parcel    — urban-mode analytics (Residential crop)
--   6. Niamey sorghum parcel     — semi-arid / drought tips path

-- ── Parcels ──
insert into public.parcels (user_id, client_id, name, crop, area_ha, location, color, parcel_group, ndvi_change, coordinates)
values
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-punjab-wheat', 'Ludhiana North Field', 'Wheat', 4.2,
    'Ludhiana, Punjab, India', '#EAB308', 'Demo — India',
    0.06,
    '[[[75.851,30.902],[75.873,30.902],[75.873,30.921],[75.851,30.921],[75.851,30.902]]]'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-jaen-olive', 'Jaén Hillside Olives', 'Olive', 11.8,
    'Jaén, Andalusia, Spain', '#7BC75B', 'Demo — Spain',
    0.04,
    '[[[-3.792,37.772],[-3.771,37.772],[-3.771,37.791],[-3.792,37.791],[-3.792,37.772]]]'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-kochi-coconut', 'Kochi Coconut Grove', 'Coconut', 2.9,
    'Kochi, Kerala, India', '#61AFEF', 'Demo — India',
    0.02,
    '[[[76.262,9.941],[76.281,9.941],[76.281,9.958],[76.262,9.958],[76.262,9.941]]]'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-iowa-maize', 'Ames Corn Plot', 'Maize', 40.5,
    'Ames, Iowa, Midwest, USA', '#C6B77E', 'Demo — USA',
    0.11,
    '[[[-93.622,42.031],[-93.601,42.031],[-93.601,42.052],[-93.622,42.052],[-93.622,42.031]]]'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-urban-courtyard', 'Campus Courtyard', 'Residential', 0.4,
    'Noida, Uttar Pradesh, India', '#D34739', 'Demo — Urban',
    null,
    '[[[77.335,28.631],[77.339,28.631],[77.339,28.634],[77.335,28.634],[77.335,28.631]]]'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-niamey-sorghum', 'Niamey Sahel Plot', 'Sorghum', 5.6,
    'Niamey, Niger, Sahel', '#d73027', 'Demo — Sahel',
    -0.03,
    '[[[2.111,13.512],[2.132,13.512],[2.132,13.532],[2.111,13.532],[2.111,13.512]]]'::jsonb
  )
on conflict (user_id, client_id) do nothing;

-- ── Pre-generated AI analysis report (so the demo shows a persisted
--    analysis without spending Gemini quota live) ──
insert into public.reports (user_id, parcel_client_id, report_type, content)
values
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-punjab-wheat', 'ai_analysis',
    '{
      "analysis": "## Vegetation Health\nThe parcel shows a mean NDVI of 0.52 (Moderate band) with a health score of 65/100 — consistent with active wheat growth in the Rabi season.\n\n## Water Status\nAnnual rainfall of ~730 mm and water access around 88/100 indicate strong rain-fed and irrigation potential for the Indo-Gangetic plain.\n\n## Soil Assessment\nLoam-textured Cambisol with pH ~7.0 and SOC ~8.5 g/kg: neutral, well-structured soil needing nitrogen top-ups for intensive cereal rotation.\n\n## Land Suitability\n**8.4 / 10** — highly suitable for wheat; also strong for mustard and chickpea in rotation.\n\n## Recommendations\n- Continue the wheat–mustard or wheat–chickpea rotation pattern typical of Punjab\n- Split nitrogen applications to match irrigation events\n- Monitor late-season humidity for yellow-rust risk\n\n## Key Risks\n- Terminal heat stress during March grain fill\n- Declining water table in the Ludhiana belt\n\n| Metric | Value |\n|---|---|\n| Mean NDVI | 0.52 |\n| Rainfall | 730 mm/yr |\n| Soil pH | 7.0 |\n| Suitability | 8.4/10 |\n\n*Demo-generated analysis — pre-seeded to avoid live quota spend during the walkthrough.*"
    }'::jsonb
  ),
  (
    (select id from auth.users where email = 'demo@terrasuite.app'),
    'demo-jaen-olive', 'ai_analysis',
    '{
      "analysis": "## Vegetation Health\nMean NDVI of 0.48 (Moderate band) with health score 60/100 — typical for a mature olive orchard with rows and exposed soil between trees.\n\n## Water Status\n~550 mm annual rainfall (64/100 water access) matches the Mediterranean olive optimum; supplemental drip is used in dry summers.\n\n## Soil Assessment\nClay loam over calcareous parent material, pH ~7.7 — ideal for olive (optimal band 6.5–8.0).\n\n## Land Suitability\n**8.1 / 10** — prime olive territory; almond and sunflower are strong companions.\n\n## Recommendations\n- Maintain the olive + chickpea intercropping pattern in the inter-rows\n- Keep cover crops on slopes to limit erosion\n- Prune for light penetration before the October rains\n\n## Key Risks\n- Olive fly pressure in humid late summer\n- Increasing summer heat spikes during flowering\n\n| Metric | Value |\n|---|---|\n| Mean NDVI | 0.48 |\n| Rainfall | 550 mm/yr |\n| Soil pH | 7.7 |\n| Suitability | 8.1/10 |\n\n*Demo-generated analysis — pre-seeded.*"
    }'::jsonb
  )
on conflict do nothing;

-- ── Verification (run after): ──
select 'demo parcels' as check, count(*) from public.parcels
where user_id = (select id from auth.users where email = 'demo@terrasuite.app');
-- expect 6
select 'demo reports' as check, count(*) from public.reports
where user_id = (select id from auth.users where email = 'demo@terrasuite.app');
-- expect 2

-- RLS sanity AFTER seeding (as the demo user in the app):
-- the seeded rows must be invisible to other accounts (rls-check.md already
-- proves the mechanism; this seed does not create service-role rows).
