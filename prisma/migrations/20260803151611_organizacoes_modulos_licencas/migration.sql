-- CreateEnum
CREATE TYPE "PapelOrganizacao" AS ENUM ('ADMIN', 'MEMBRO');

-- CreateTable
CREATE TABLE "organizacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizacao_membro" (
    "id" SERIAL NOT NULL,
    "id_organizacao" INTEGER NOT NULL,
    "id_conta" INTEGER NOT NULL,
    "papel" "PapelOrganizacao" NOT NULL DEFAULT 'MEMBRO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacao_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulo" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculadora" (
    "id" SERIAL NOT NULL,
    "id_modulo" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizacao_modulo" (
    "id" SERIAL NOT NULL,
    "id_organizacao" INTEGER NOT NULL,
    "id_modulo" INTEGER NOT NULL,
    "valido_de" DATE NOT NULL,
    "valido_ate" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacao_modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" SERIAL NOT NULL,
    "id_conta" INTEGER,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" INTEGER,
    "detalhes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacao_cnpj_key" ON "organizacao"("cnpj");

-- CreateIndex
CREATE INDEX "organizacao_membro_id_organizacao_idx" ON "organizacao_membro"("id_organizacao");

-- CreateIndex
CREATE INDEX "organizacao_membro_id_conta_idx" ON "organizacao_membro"("id_conta");

-- CreateIndex
CREATE UNIQUE INDEX "organizacao_membro_id_organizacao_id_conta_key" ON "organizacao_membro"("id_organizacao", "id_conta");

-- CreateIndex
CREATE UNIQUE INDEX "modulo_slug_key" ON "modulo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "calculadora_slug_key" ON "calculadora"("slug");

-- CreateIndex
CREATE INDEX "calculadora_id_modulo_idx" ON "calculadora"("id_modulo");

-- CreateIndex
CREATE INDEX "organizacao_modulo_id_organizacao_idx" ON "organizacao_modulo"("id_organizacao");

-- CreateIndex
CREATE INDEX "organizacao_modulo_id_modulo_idx" ON "organizacao_modulo"("id_modulo");

-- CreateIndex
CREATE UNIQUE INDEX "organizacao_modulo_id_organizacao_id_modulo_key" ON "organizacao_modulo"("id_organizacao", "id_modulo");

-- CreateIndex
CREATE INDEX "log_auditoria_id_conta_idx" ON "log_auditoria"("id_conta");

-- CreateIndex
CREATE INDEX "log_auditoria_entidade_entidade_id_idx" ON "log_auditoria"("entidade", "entidade_id");

-- AddForeignKey
ALTER TABLE "organizacao_membro" ADD CONSTRAINT "organizacao_membro_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacao_membro" ADD CONSTRAINT "organizacao_membro_id_conta_fkey" FOREIGN KEY ("id_conta") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculadora" ADD CONSTRAINT "calculadora_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacao_modulo" ADD CONSTRAINT "organizacao_modulo_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacao_modulo" ADD CONSTRAINT "organizacao_modulo_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_id_conta_fkey" FOREIGN KEY ("id_conta") REFERENCES "conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
