-- CreateTable
CREATE TABLE "mail_queue" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "projects" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "user_id" BIGINT,
    "project_id" BIGINT,
    "name" TEXT NOT NULL,
    "contact_info" TEXT NOT NULL,
    "query_key" TEXT,
    "is_contact_query_allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_projects_2" ON "projects"("name");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_projects_is_enabled" ON "projects"("is_enabled");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_registrations_2" ON "registrations"("query_key");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_registrations_project_id" ON "registrations"("project_id");

-- CreateIndex
CREATE INDEX "idx_registrations_user_id" ON "registrations"("user_id");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_users_2" ON "users"("username");
Pragma writable_schema=0;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_users_3" ON "users"("email");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");
