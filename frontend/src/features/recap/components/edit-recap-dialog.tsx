"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useRecapByDateQuery } from "../api/recap.query";
import CreateRecapDialog from "./create-recap-dialog";

interface EditRecapDialogProps {
  date: string; // "2026-10-05"
  onClose: () => void;
}

// Ambil rekap dulu, baru render form: defaultValues useForm hanya dibaca sekali saat form dibuat.
// Biasanya data langsung ada dari cache bulanan, jadi spinner jarang terlihat.
const EditRecapDialog = ({ date, onClose }: EditRecapDialogProps) => {
  const { dict } = useI18n();
  const { data, isPending, error } = useRecapByDateQuery(date);

  if (data) {
    return (
      <CreateRecapDialog open recap={data} onOpenChange={(open) => !open && onClose()} />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.recap.form.editTitle}</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : (
          // Mis. rekap sudah dihapus di tab lain: backend 404 -> "Data tidak ditemukan".
          error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditRecapDialog;
