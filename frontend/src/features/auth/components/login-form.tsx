"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { LoginFormValues, makeLoginSchema } from "../schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "../hooks/useAuth";
import { ILoginPayload } from "../types/type";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { AppLogo } from "./login-brand-panel";

const LoginFormPage = () => {
  const [passwordOpen, setPasswordOpen] = useState<boolean>(false);
  const { dict } = useI18n();
  const t = dict.login;

  const schema = useMemo(() => makeLoginSchema(dict), [dict]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  });

  const { handleLogin, isPending, error } = useLogin();

  const onSubmit = (payload: ILoginPayload) => {
    handleLogin(payload);
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      {/* Di HP panel brand disembunyikan, jadi logo tampil di atas form. */}
      <div className="lg:hidden">
        <AppLogo />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>

          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <Label htmlFor="username">{t.username}</Label>
                  <Input {...register("username")} id="username" autoComplete="username" autoFocus />
                  <FieldError>{errors.username?.message}</FieldError>
                </Field>
                <Field>
                  <Label htmlFor="password">{t.password}</Label>
                  <InputGroup>
                    <InputGroupInput
                      {...register("password")}
                      id="password"
                      autoComplete="current-password"
                      type={passwordOpen ? "text" : "password"}
                    />
                    <InputGroupAddon align={"inline-end"}>
                      <InputGroupButton
                        aria-label={passwordOpen ? t.hidePassword : t.showPassword}
                        onClick={() => setPasswordOpen((prev) => !prev)}
                      >
                        {passwordOpen ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError>{errors.password?.message}</FieldError>
                </Field>
              </FieldGroup>
              {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner />}
                {isPending ? t.submitting : t.submit}
              </Button>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginFormPage;
