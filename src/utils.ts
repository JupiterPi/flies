import { clsx, type ClassValue } from "clsx";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useTemporaryState<T>(initialValue: T, delay = 2000) {
  const [state, setState] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTemporaryState = (newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(newValue);

    timeoutRef.current = setTimeout(() => {
      setState(initialValue);
    }, delay);
  };

  // Clean up the timeout if the component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [state, setTemporaryState] as const;
}
