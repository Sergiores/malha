-- CreateTable
CREATE TABLE "conta" (
    "id" SERIAL NOT NULL,
    "auth_user_id" UUID,
    "email" TEXT,
    "nome" TEXT,
    "telefone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "trocar_senha" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conta_auth_user_id_key" ON "conta"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conta_email_key" ON "conta"("email");
