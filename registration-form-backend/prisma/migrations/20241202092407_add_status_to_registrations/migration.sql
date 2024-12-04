-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_registrations" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "user_id" BIGINT,
    "project_id" BIGINT,
    "name" TEXT NOT NULL,
    "contact_info" TEXT NOT NULL,
    "query_key" TEXT,
    "is_contact_query_allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "status" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_registrations" ("contact_info", "created_at", "id", "is_contact_query_allowed", "name", "project_id", "query_key", "user_id") SELECT "contact_info", "created_at", "id", "is_contact_query_allowed", "name", "project_id", "query_key", "user_id" FROM "registrations";
DROP TABLE "registrations";
ALTER TABLE "new_registrations" RENAME TO "registrations";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_registrations_2" ON "registrations"("query_key");
Pragma writable_schema=0;
CREATE INDEX "idx_registrations_project_id" ON "registrations"("project_id");
CREATE INDEX "idx_registrations_user_id" ON "registrations"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
