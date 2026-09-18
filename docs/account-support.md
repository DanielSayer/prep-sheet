# Account and support operations

Before production launch:

- Set `SUPPORT_EMAIL` in `apps/web/src/lib/support.ts` to a monitored mailbox. The empty placeholder deliberately does not create a broken email link.
- Apply the database schema using the existing `db:push` workflow. This adds `support_request` and `account_deletion_request`.
- Assign someone to review the queue. There are no automated notifications, email delivery, response-time promises or admin web UI. Reports and deletion requests are stored in PostgreSQL, not sent by email.
- Verify provider retention and backup retention for the production deployment before publishing any time-bound erasure promises. The privacy page describes live-database removal only.

From the repository root, list requests and the account email to use for a reply:

```sh
node --env-file=apps/web/.env --import tsx packages/api/src/support-admin.ts list
```

Treat this output as private. Reports are limited to five per account per hour. The user sees their most recent 20 reports. Delete resolved report rows through the database after applying your support retention policy; there is no automated retention job.

## Completing a deletion request

1. Review the pending request and contact the user when necessary. Do not ask for a Discord password. The request is already tied to their signed-in account.
2. The owner must transfer every owned group to an existing member or explicitly delete the group through Groups. Never select a replacement owner or remove a group on their behalf without instructions.
3. Explain that shared recipes and other people's copies remain. Text inside shared recipes may still identify them; resolve any specific content-removal request first.
4. Complete the exact pending request using its reference:

```sh
node --env-file=apps/web/.env --import tsx packages/api/src/support-admin.ts complete-deletion <request-id> --confirm
```

The command runs a transaction, locks the pending request, refuses accounts that still own groups, deletes personal recipes including those in Recently deleted, and removes the account. Foreign keys remove sessions, provider tokens, extension credentials, imports, private tags and activity, shopping/planner data, memberships and support requests. Shared contributions keep their content but lose their user link. Group-owned data and independent copies remain. A cancelled or completed request cannot be processed again.

Deletion does not delete the Discord account or erase browser storage on the user's devices. It does not recall prior AI processing or erase database backups. Signing in again with Discord creates a new Prep Sheet account. Follow the production backup and provider retention arrangements separately.

## Verification

The account-support PostgreSQL suite passes all four tests. Web type checking and the production build pass. Browser checks covered settings disclosure and group notices, support submission and history, and privacy/support layouts at 390px and 1440px. The temporary UI report was removed after verification. Actual Discord sign-in and production support delivery were not tested.

Broader checks found existing failures outside this change: two recipe integration assertions expect favourites and ratings to be removed by soft deletion, and API package type checking reports a UUID type mismatch in `shopping.integration.test.ts:213`.
