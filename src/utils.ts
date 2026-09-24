import { clsx, type ClassValue } from "clsx";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

// react

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

// paths

/**
 * Normalize a path, removing any leading or trailing slashes from each segment and joining them with a single slash.
 */
export function joinPath(
  path: string,
  ...additionalSegments: string[]
): string {
  const pathSegments = [path, ...additionalSegments];
  // remove existing leading and trailing slashes from each path segment
  const cleanedPaths = pathSegments.map((path) =>
    path.replace(/^\/+|\/+$/g, ""),
  );
  // join with single slash
  return cleanedPaths.join("/");
}

/**
 * Extracting the parent path from a given path.
 * If there is none, it returns "/".
 */
export function pathParent(path: string): string {
  const segments = path.split("/").filter(Boolean); // filter out empty segments
  if (segments.length <= 1) {
    return "/";
  }
  segments.pop(); // remove the last segment
  return "/" + segments.join("/");
}

/**
 * Extract the last segment from a given path.
 * If there is none, it returns an empty string.
 */
export function pathFilename(path: string): string {
  const segments = path.split("/").filter(Boolean); // filter out empty segments
  return segments.length > 0 ? segments[segments.length - 1] : "";
}
