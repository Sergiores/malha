-- AlterTable
ALTER TABLE "organizacao" ADD COLUMN     "codigo_convite" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "organizacao_codigo_convite_key" ON "organizacao"("codigo_convite");
