import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UpgradeModal({
  open,
  onOpenChange,
  used,
  limit,
  onUpgrade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  used: number;
  limit: number;
  onUpgrade: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Limite do plano atingido</AlertDialogTitle>
          <AlertDialogDescription>
            Você usou <span className="font-semibold">{used}</span> de{" "}
            <span className="font-semibold">{limit}</span> sessões HDR neste mês.
            Faça upgrade para liberar capturas ilimitadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-2xl">Agora não</AlertDialogCancel>
          <AlertDialogAction className="rounded-2xl" onClick={onUpgrade}>
            Fazer upgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
