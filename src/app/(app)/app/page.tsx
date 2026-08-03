import { Building2 } from "lucide-react";
import { requireConta } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AppHome() {
  // Repetido de propósito: o layout já chama, mas guard não se delega.
  // O `cache()` faz as duas chamadas virarem uma consulta só.
  const { conta } = await requireConta();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {conta.nome ?? "engenheiro"}
        </h1>
        <p className="text-muted-foreground">
          Suas organizações e módulos aparecem aqui.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Nenhuma organização ainda
          </CardTitle>
          <CardDescription>
            Organizações, módulos e licenças entram nas Fases 3 e 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Autenticação concluída — sua conta está ativa.
        </CardContent>
      </Card>
    </div>
  );
}
