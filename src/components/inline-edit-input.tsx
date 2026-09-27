import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// AI-generated

interface InlineEditInputProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

export function InlineEditInput({
  value,
  onSave,
  placeholder = "Click to edit...",
}: InlineEditInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input automatically when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Optional: pre-select text for easy overwriting
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (inputValue.trim() !== value.trim()) {
      onSave(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(value); // Reset to original value
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-9" // Matches standard shadcn button heights
        placeholder={placeholder}
      />
    );
  }

  return (
    <Button variant="outline" onClick={() => setIsEditing(true)} className="">
      <span className="truncate">{value || placeholder}</span>
    </Button>
  );
}
