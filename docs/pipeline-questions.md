# Questions for the pipeline side

The first thirteen were answered in section 7 of `docs/frontend_contract.md` (pipeline repo,
2026-10-29), and the site now follows those answers: the density is integrated as it is; signs
come from `drivers[].sign`; sections are matched on `coverage.sections[].key`; the missing range
shows `rangeNote`; the samples come from `evaluation.samples`; revisions come from
`trackRecord[].latest`, `revision` and `sameBase`; live runs are grouped by `role`.

What is left is below. Each is something the site noticed in the new set, not something it
changed.

1. **`stressInterval90` when there is no range.** If `rangeAvailable` is `false`, is
   `stressInterval90` still written? It widens the ordinary range, so on its own, under "too
   early to call", it reads oddly. The site hides it when `rangeAvailable` is `false`. If it is
   meant to show then, say so.
2. **A name for each live run.** `liveRecord` rows carry `modelId` and `role` but no name. The
   members are named from `model.members`, and the two benchmarks (`ar1_benchmark`,
   `mean4_benchmark`) are matched to `headline.benchmarks` by their value, which works only
   while the two values differ. Could each row carry a `name`?
3. **The contract disagrees with itself on the method version.** The header says "Version 1
   (`method.version`)", section 3 says "version 2 from this contract", and the file has
   `method.version: 2` (a number; earlier samples had a string). The site accepts either and
   prints what the file says.
4. **Section 7.3 and the file differ by one quarter.** It says the three most recent quarters
   are on the same base and differ by 0.02 to 0.16; the file has two (`sameBase: true` for
   Oct-Dec 2025 and Jan-Mar 2026), differing by 0.03 and 0.16, and Jul-Sep 2025 is
   `sameBase: false` with a revision of 0.15. The site reads `sameBase` and the revisions from
   the file, so it shows two quarters and "0.03 to 0.16 pp". Which is meant?
5. **Prices are left unsigned on purpose.** The site treats prices as background and does not
   sign them, so it ignores `drivers[].sign` for the Prices sector (CPI, WPI, Brent, gold and
   so on). Brent's `sign` is -1 ("economic") while its correlation with GDP growth is +0.43;
   that is stated in the file, but a reader who sees both may ask. No change needed; flagging it.
