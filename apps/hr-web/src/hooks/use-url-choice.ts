import { useSearchParams } from "react-router-dom";
/** Only finite, non-sensitive UI choices belong in the URL. */
export function useUrlChoice(
  key: string,
  choices: readonly string[],
  fallback: string,
) {
  const [params, setParams] = useSearchParams();
  const candidate = params.get(key) ?? fallback;
  const value = choices.includes(candidate) ? candidate : fallback;
  const setValue = (next: string) => {
    if (!choices.includes(next)) return;
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (next === fallback) n.delete(key);
      else n.set(key, next);
      n.delete("page");
      return n;
    });
  };
  return [value, setValue] as const;
}
