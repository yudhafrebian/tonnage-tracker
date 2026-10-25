"use client";

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
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import React from "react";

interface LogoutAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  error?: Error | null;
}

const LogoutAlertDialog: React.FC<LogoutAlertDialogProps> = (props) => {
  const { dict } = useI18n();
  const t = dict.logout;

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={(open) => !props.isLoading && props.onOpenChange(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.title}</AlertDialogTitle>
          <AlertDialogDescription>{t.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {props.error && (
          <FieldError>{apiErrorMessage(dict, props.error)}</FieldError>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isLoading}>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={props.onSubmit}
            disabled={props.isLoading}
          >
            {props.isLoading && <Spinner />}
            {props.isLoading ? t.confirming : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutAlertDialog;
