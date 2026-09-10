-- Real role enforcement (USER/ADMIN) plus the first admin-only action: an
-- independent freeze kill switch on Listing, separate from titleStatus, so
-- an already-verified property can still be pulled from sale (disputed
-- evidence, fraud report, legal hold) without touching its verification
-- record.

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "listings" ADD COLUMN "frozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN "frozenReason" TEXT;
