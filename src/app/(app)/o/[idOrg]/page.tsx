import { CircleSlash, Lock, PackageCheck, TimerOff } from "lucide-react";
import { requireMembroOrg, parseIdOrg } from "@/lib/organizacao";
import { modulosDaOrganizacao, type SituacaoLicenca } from "@/lib/modulo";
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

export default async function OrganizacaoPage({
  params,
}: {
  params: Promise<{ idOrg: string }>;
}) {
  const { idOrg } = await params;
  const id = parseIdOrg(idOrg);
  await requireMembroOrg(id);

  const modulos = await modulosDaOrganizacao(id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Módulos</h2>
        <p className="text-sm text-muted-foreground">
          A liberação é feita pelo administrador do sistema.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => {
          const s = SITUACAO[m.situacao];
          return (
            <Card key={m.id} className={m.situacao === "vigente" ? "" : "opacity-70"}>
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
                  "Sem licença para esta organização."
                ) : (
                  <>
                    Vigência: {dataBr(m.validoDe)} até{" "}
                    {m.validoAte ? dataBr(m.validoAte) : "sem prazo"}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
