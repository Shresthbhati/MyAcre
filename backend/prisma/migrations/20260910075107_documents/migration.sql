-- Evidence documents attached to a listing (deed scans, surveys, etc), with
-- a server-computed SHA-256 of the actual uploaded bytes for tamper
-- detection. No versioning yet — each upload is its own row.

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_listingId_idx" ON "documents"("listingId");

ALTER TABLE "documents" ADD CONSTRAINT "documents_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
