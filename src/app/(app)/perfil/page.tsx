import Link from "next/link";
import { requireConta } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerfilForm } from "./perfil-form";

export default async function PerfilPage() {
  const { conta } = await requireConta();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Perfil</CardTitle>
          <CardDescription>{conta.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm
            nome={conta.nome ?? ""}
            telefone={conta.telefone ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senha</CardTitle>
          <CardDescription>
            A troca é feita pelo link enviado por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/recuperar-senha">
            <Button variant="outline">Alterar senha</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
