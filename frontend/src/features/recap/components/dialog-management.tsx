import React from "react";
import { DialogState } from "../types/types";
import CreateRecapDialog from "./create-recap-dialog";
import DeleteRecapDialog from "./delete-recap-dialog";
import EditRecapDialog from "./edit-recap-dialog";
import ImportRecapDialog from "./import-recap-dialog";

interface DialogManagementProps {
  dialog: DialogState;
  onClose: () => void;
  month: string; // bulan aktif di halaman, tujuan import
}

// Satu tempat untuk semua dialog rekap. Dialog hanya dirender saat terbuka,
// jadi form otomatis kembali ke nilai awal setiap kali dibuka.
const DialogManagement: React.FC<DialogManagementProps> = ({ dialog, onClose, month }) => {
  return (
    <>
      {dialog.type === "create" && (
        <CreateRecapDialog
          open
          defaultDate={dialog.date}
          onOpenChange={(open) => !open && onClose()}
        />
      )}
      {dialog.type === "delete" && dialog.date && (
        <DeleteRecapDialog date={dialog.date} onClose={onClose} />
      )}
      {dialog.type === "edit" && dialog.date && (
        <EditRecapDialog date={dialog.date} onClose={onClose} />
      )}
      {dialog.type === "import" && <ImportRecapDialog month={month} onClose={onClose} />}
    </>
  );
};

export default DialogManagement;
