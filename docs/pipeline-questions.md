# Questions for the pipeline side

Nothing is open. Everything the site raised has been answered in section 7 of
`docs/frontend_contract.md` in the pipeline repo (items 1 to 18), and the site follows the
answers:

- The density is integrated as exported; signs come from `drivers[].sign`; sections are matched
  on `coverage.sections[].key`; the missing range shows `rangeNote`; the samples come from
  `evaluation.samples`; revisions come from `trackRecord[].latest`, `revision` and `sameBase`;
  live runs are grouped by `role` and named by `name`.
- `stressInterval90` is written only when there is a range, and the site hides it otherwise.
- Prices stay unsigned on the site: they are background, and a price's `sign` describes
  co-movement with growth, not a causal claim.
- `method.version` is the number 2. Two quarters (Oct-Dec 2025 and Jan-Mar 2026) are on the
  same base as their first print, and the site reads that from `sameBase`.

If the site needs something the export does not carry, add it here as a question.
