"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { useFormatter } from "@/shared/i18n/use-formatter";

interface AmountInputProps {
  id?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
}

// Rupiah bulat dengan pemisah ribuan saat diketik: "1200000" tampil "1.200.000".
// Yang disimpan di form tetap angka; kosong = undefined (divalidasi sebagai wajib).
const AmountInput = ({ id, value, onChange, onBlur, ...props }: AmountInputProps) => {
  const fmt = useFormatter();

  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>Rp</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="tabular-nums"
        value={value === undefined || Number.isNaN(value) ? "" : fmt.amount(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
          onChange(digits ? Number(digits) : undefined);
        }}
        onBlur={onBlur}
        aria-invalid={props["aria-invalid"]}
      />
    </InputGroup>
  );
};

export default AmountInput;
