"use client";

import { LineItemPicker, type LineItemPickerSelection } from "@/components/estimates/line-item-picker";

export type EquipmentPickerSelection = LineItemPickerSelection;

type EquipmentPickerProps = {
  value: string;
  onChange: (selection: EquipmentPickerSelection) => void;
  className?: string;
  placeholder?: string;
};

/** @deprecated Use LineItemPicker with category="equipment" */
export function EquipmentPicker({
  value,
  onChange,
  className,
  placeholder,
}: EquipmentPickerProps) {
  return (
    <LineItemPicker
      category="equipment"
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
    />
  );
}
