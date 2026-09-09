import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

// Part 3 will inject this script using scripting.executeScript after a user click.
// It is bundled separately and never registered to run automatically on websites.
export default defineUnlistedScript(() => {
  // Recipe extraction will run in the tab's isolated world.
});
