-- CreateTable
CREATE TABLE "image_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_generation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_generation_id" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "admin_note" VARCHAR(2000),
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_likes_image_generation_id_idx" ON "image_likes"("image_generation_id");

-- CreateIndex
CREATE UNIQUE INDEX "image_likes_user_id_image_generation_id_key" ON "image_likes"("user_id", "image_generation_id");

-- CreateIndex
CREATE INDEX "image_reports_image_generation_id_idx" ON "image_reports"("image_generation_id");

-- CreateIndex
CREATE INDEX "image_reports_user_id_idx" ON "image_reports"("user_id");

-- AddForeignKey
ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_image_generation_id_fkey" FOREIGN KEY ("image_generation_id") REFERENCES "image_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_reports" ADD CONSTRAINT "image_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_reports" ADD CONSTRAINT "image_reports_image_generation_id_fkey" FOREIGN KEY ("image_generation_id") REFERENCES "image_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
