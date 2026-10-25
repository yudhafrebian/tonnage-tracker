"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useChangePasswordMutation, useMeQuery } from "@/features/auth";
import { useHydrated } from "@/shared/hooks/use-hydrated";
import { apiErrorMessage, fieldErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { makeChangePasswordSchema, type ChangePasswordFormValues } from "../schemas";

// "Budi Santoso" -> "BS"
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const AccountCard = () => {
  const { dict } = useI18n();
  const t = dict.settings.profile;
  const { data } = useMeQuery();
  // Selama hydration tampil skeleton seperti HTML server, walau data user sudah ter-cache.
  const me = useHydrated() ? data : undefined;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {me ? (
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-14">
              <AvatarFallback className="text-lg">{initials(me.name)}</AvatarFallback>
            </Avatar>
            <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t.name}</dt>
                <dd className="font-medium">{me.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.username}</dt>
                <dd className="font-medium">{me.username}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.role}</dt>
                <dd>
                  <Badge variant="secondary">{dict.roles[me.role]}</Badge>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <Skeleton className="h-14" />
        )}
      </CardContent>
    </Card>
  );
};

const ChangePasswordCard = () => {
  const { dict } = useI18n();
  const t = dict.settings.password;
  const schema = useMemo(() => makeChangePasswordSchema(dict.settings.password), [dict]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { mutate, isPending } = useChangePasswordMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    setServerError(null);
    mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => reset(),
        onError: (err) => {
          const body = isAxiosError(err) ? err.response?.data?.error : undefined;
          // Password lama salah: backend 400 "wrong_password", tampilkan di kolom password saat ini.
          if (body?.code === "wrong_password") {
            setError("currentPassword", { message: dict.errors.wrong_password });
            return;
          }
          const fields = body?.fields as Record<string, string[]> | undefined;
          if (fields && Object.keys(fields).length > 0) {
            for (const [path, codes] of Object.entries(fields)) {
              setError(path as Path<ChangePasswordFormValues>, {
                message: fieldErrorMessage(dict, codes[0] ?? ""),
              });
            }
          } else {
            setServerError(apiErrorMessage(dict, err));
          }
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
          {serverError && <FieldError>{serverError}</FieldError>}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="current-password">{t.current}</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              <FieldError>{errors.currentPassword?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">{t.new}</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              <FieldError>{errors.newPassword?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">{t.confirm}</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              <FieldError>{errors.confirmPassword?.message}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-fit" disabled={isPending}>
            {isPending && <Spinner />}
            {isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const ProfileSection = () => (
  <div className="flex flex-col gap-4">
    <AccountCard />
    <ChangePasswordCard />
  </div>
);

export default ProfileSection;
