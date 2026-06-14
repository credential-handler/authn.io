/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 * All rights reserved.
 */

/* Minimal Playwright reporter that prints an explicit totals line at the end
of a run. The built-in `list` reporter only reports outcome counts (e.g.
"190 passed, 25 failed"), never the total, so a reader has to scroll up and
add them. Surfacing "N/M passed" makes the total test count immediately
visible — handy for spotting when the suite has grown or shrunk between runs.

Counts are tallied from each test's final status in `onTestEnd`; the
`onEnd` argument is a `FullResult` (overall status only) and carries no
per-outcome totals, so we accumulate them ourselves. */
export default class TotalsReporter {
  constructor() {
    this.counts = {passed: 0, failed: 0, skipped: 0};
  }

  onTestEnd(test) {
    // `test.outcome()` collapses retries into the effective result
    // ('expected' | 'unexpected' | 'flaky' | 'skipped')
    const outcome = test.outcome();
    if(outcome === 'skipped') {
      this.counts.skipped++;
    } else if(outcome === 'unexpected') {
      this.counts.failed++;
    } else {
      // 'expected' or 'flaky' both ultimately passed
      this.counts.passed++;
    }
  }

  onEnd() {
    const {passed, failed, skipped} = this.counts;
    const total = passed + failed + skipped;
    const parts = [`${passed}/${total} passed`];
    if(failed > 0) {
      parts.push(`${failed} failed`);
    }
    if(skipped > 0) {
      parts.push(`${skipped} skipped`);
    }
    console.log(`\n  Totals: ${parts.join(' · ')}\n`);
  }
}
