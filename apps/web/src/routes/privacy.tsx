import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <main id="main-content" className="page-width help-page">
      <div className="page-heading">
        <div>
          <h1>
            Privacy<span className="title-dot">.</span>
          </h1>
          <p>How Prep Sheet handles your recipes and account.</p>
        </div>
      </div>
      <section className="help-section">
        <h2>Signing in with Discord</h2>
        <p>
          Discord handles sign-in. Prep Sheet stores your account identifier,
          name, email and profile image, along with session information needed
          to keep you signed in. Session records can include your IP address and
          browser information.
        </p>
        <p>
          Prep Sheet does not manage your Discord password. Change your
          password, email and Discord security settings in Discord.
        </p>
      </section>
      <section className="help-section">
        <h2>Recipe capture and AI</h2>
        <p>
          When you ask Prep Sheet to import or generate a recipe, recipe text or
          your description is sent to OpenAI for processing. Your tag names and
          descriptions are included to help organise the result. Avoid putting
          private information in recipe input or tags.
        </p>
        <p>
          For a pasted link, our server fetches the page and extracts recipe
          content. The browser extension reads recipe content from the page you
          choose to capture and sends that content and its source URL to Prep
          Sheet. It does not send your browsing history or browser cookies.
          Check the capture preview before sending.
        </p>
        <p>
          Extension imports are stored with their input, source URL, processing
          status and result so you can return to them. Saved recipes retain
          their content and source link. Manually entering or editing a recipe
          does not require AI processing.
        </p>
        <p>
          AI can make mistakes. Check ingredients, quantities and instructions
          before using a recipe.
        </p>
      </section>
      <section className="help-section">
        <h2>Personal and shared information</h2>
        <p>
          Personal recipes are available to your account. Recipes saved to a
          group are available to its members. Group members can see member
          names. Tags, favourites, ratings, cooking notes, shopping lists and
          meal plans belong to your account, including when you use a shared
          recipe.
        </p>
        <p>
          Prep Sheet uses browser storage for preferences, recipe drafts and
          cooking progress. These can remain on a device after you sign out.
          Clear this site's browser data on a shared device. Support reports
          contain the text you submit and are linked to your account so the
          operator can investigate.
        </p>
      </section>
      <section className="help-section">
        <h2>Leaving Prep Sheet</h2>
        <p>
          You can request deletion from account settings. The request is
          reviewed manually and can be cancelled while pending. It does not
          delete your Discord account.
        </p>
        <p>
          Before deletion can be completed, transfer any groups you own to
          another member or explicitly delete those groups. Deleting a group
          removes its shared recipes for everyone. We do not automatically
          choose a new owner or delete a group for you.
        </p>
        <p>
          Account deletion removes your personal recipes, preferences, private
          activity, imports, support reports, memberships, sessions and
          extension connections from the live database. Recipes you contributed
          to surviving groups stay in those groups with the account link
          removed. Copies saved by other people remain. Names or personal
          details written inside shared recipe text are not automatically
          removed, so review those before requesting deletion.
        </p>
        <p>
          Deleting an account does not clear browser storage on your devices or
          recall content already sent to an AI provider. Ask support about any
          specific retention or removal concern.
        </p>
        <div className="help-actions">
          <Link to="/settings" className="button button-outline">
            Account settings
          </Link>
          <Link to="/support" className="text-button">
            Support and report a problem
          </Link>
        </div>
      </section>
    </main>
  );
}
