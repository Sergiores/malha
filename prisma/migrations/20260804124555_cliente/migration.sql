-- AlterTable
ALTER TABLE "analise" ADD COLUMN     "id_cliente" INTEGER;

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "id_organizacao" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "cep" VARCHAR(8),
    "fone" TEXT,
    "email" TEXT,
    "contato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_id_organizacao_nome_idx" ON "cliente"("id_organizacao", "nome");

-- CreateIndex
CREATE INDEX "cliente_id_organizacao_cidade_idx" ON "cliente"("id_organizacao", "cidade");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_id_organizacao_cpf_cnpj_key" ON "cliente"("id_organizacao", "cpf_cnpj");

-- CreateIndex
CREATE INDEX "analise_id_cliente_idx" ON "analise"("id_cliente");

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
