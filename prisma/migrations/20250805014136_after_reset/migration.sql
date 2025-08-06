BEGIN;

-- Створюємо новий enum одразу з потрібними значеннями
CREATE TYPE "public"."UserRole" AS ENUM ('viewer', 'admin', 'doctor');

-- Створюємо таблицю users
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'viewer',
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_2fa" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT NOT NULL,
    "ua" TEXT NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Створюємо таблицю security_logs
CREATE TABLE "public"."security_logs" (
    "logID" SERIAL NOT NULL,
    "personID" INTEGER NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "ipAddress" VARCHAR(50) NOT NULL,
    "userAgent" TEXT NOT NULL,
    "eventTime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL,
    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("logID")
);

-- Створюємо унікальний індекс на email
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- Додаємо зовнішній ключ з security_logs до users
ALTER TABLE "public"."security_logs"
ADD CONSTRAINT "security_logs_personID_fkey"
FOREIGN KEY ("personID") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
