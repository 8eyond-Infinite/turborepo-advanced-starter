import { useEffect, useState } from "react";
import { SearchInput } from "@/components";

interface AuditSearchInputProps {
  initialValue: string;
  onSearch: (value: string) => void;
}

export const AuditSearchInput = ({
  initialValue,
  onSearch,
}: AuditSearchInputProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [onSearch, value]);

  return (
    <SearchInput
      aria-label="Tìm kiếm nhật ký hoạt động"
      placeholder="Tìm hành động, email hoặc mã truy vết..."
      value={value}
      onChange={setValue}
    />
  );
};
