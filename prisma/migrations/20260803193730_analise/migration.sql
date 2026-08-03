-- CreateEnum
CREATE TYPE "StatusAnalise" AS ENUM ('RASCUNHO', 'CONCLUIDA', 'APROVADA', 'ARQUIVADA');

-- CreateTable
CREATE TABLE "analise" (
    "id" SERIAL NOT NULL,
    "id_organizacao" INTEGER NOT NULL,
    "id_conta" INTEGER NOT NULL,
    "id_calculadora" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "StatusAnalise" NOT NULL DEFAULT 'RASCUNHO',
    "entradas" JSONB NOT NULL,
    "resultados" JSONB NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analise_id_organizacao_created_at_idx" ON "analise"("id_organizacao", "created_at");

-- CreateIndex
CREATE INDEX "analise_id_conta_idx" ON "analise"("id_conta");

-- CreateIndex
CREATE INDEX "analise_id_calculadora_idx" ON "analise"("id_calculadora");

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_id_conta_fkey" FOREIGN KEY ("id_conta") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_id_calculadora_fkey" FOREIGN KEY ("id_calculadora") REFERENCES "calculadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
