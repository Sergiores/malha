import Link from "next/link";
import { CircleSlash, Lock, PackageCheck, TimerOff } from "lucide-react";
import { requireConta } from "@/lib/auth";
import { meusModulos, type SituacaoLicenca } from "@/lib/modulo";
import { dataBr } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SITUACAO = {
  vigente: {
    rotulo: "Liberado",
    classe: "bg-primary/10 text-primary",
    Icone: PackageCheck,
  },
  vencida: {
    rotulo: "Vencido",
    classe: "bg-destructive/10 text-destructive",
    Icone: TimerOff,
  },
  revogada: {
    rotulo: "Revogado",
    classe: "bg-destructive/10 text-destructive",
    Icone: CircleSlash,
  },
  sem_licenca: {
    rotulo: "Não contratado",
    classe: "bg-muted text-muted-foreground",
    Icone: Lock,
  },
} satisfies Record<
  SituacaoLicenca,
  { rotulo: string; classe: string; Icone: typeof Lock }
>;

export default async function AppHome() {
  const { conta } = await requireConta();
  const modulos = await meusModulos();

  return (
    <div className="space-y-6">
      <div className="surgir">
        <p className="mb-1 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="h-px w-6 bg-primary" />
          Painel
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {conta.nome ?? "engenheiro"}
        </h1>
        <p className="text-muted-foreground">
          Escolha um módulo no menu ao lado ou nos cartões abaixo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m, i) => {
          const s = SITUACAO[m.situacao];
          const liberado = m.situacao === "vigente";

          const cartao = (
            <Card
              style={{ animationDelay: `${i * 60}ms` }}
              className={
                liberado
                  ? "card-tec canto-tecnico varredura surgir h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5"
                  : "card-tec surgir h-full opacity-60 transition-opacity hover:opacity-80"
              }
            >
              <CardHeader>
                <div className="mb-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${s.classe}`}
                  >
                    <s.Icone className="h-3 w-3" />
                    {s.rotulo}
                  </span>
                </div>
                <CardTitle className="text-base">{m.nome}</CardTitle>
                <CardDescription>{m.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {m.situacao === "sem_licenca" ? (
                  "Fale com o administrador para contratar."
                ) : (
                  <>
                    Vigência: {dataBr(m.validoDe)} até{" "}
                    {m.validoAte ? dataBr(m.validoAte) : "sem prazo"}
                  </>
                )}
              </CardContent>
            </Card>
          );

          // Bloqueado também é clicável: leva à página que explica o motivo.
          // requireModulo() barra de qualquer forma quem digitar a URL.
          return (
            <Link
              key={m.id}
              href={
                liberado
                  ? `/m/${m.slug}`
                  : `/sem-acesso?modulo=${m.slug}&motivo=${m.situacao}`
              }
            >
              {cartao}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
