import { useEffect, useState } from "react";
import { SearchInput } from "@/components";

interface UserSearchInputProps {
  initialValue: string;
  onSearch: (value: string) => void;
}

export const UserSearchInput = ({
  initialValue,
  onSearch,
}: UserSearchInputProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(value.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [onSearch, value]);

  return (
    <SearchInput
      placeholder="Tìm kiếm tài khoản..."
      value={value}
      onChange={setValue}
      className="max-w-xs"
      aria-label="Tìm kiếm tài khoản"
    />
  );
};
