/**
 * ProjectPathField — path input plus Browse, which asks the Local API
 * to open a native folder dialog. Used by Create project and Test Setup.
 */
import { useState } from "react";
import { browseProjectRoot, projectApiError } from "./projects.js";

type ProjectPathFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ProjectPathField({
  id,
  value,
  onChange,
  onError,
  disabled,
  placeholder,
}: ProjectPathFieldProps) {
  const [browsing, setBrowsing] = useState(false);
  const locked = disabled === true || browsing;

  const browse = async (): Promise<void> => {
    setBrowsing(true);
    try {
      const result = await browseProjectRoot();
      if ("path" in result) {
        onChange(result.path);
      }
    } catch (error) {
      onError(projectApiError(error));
    } finally {
      setBrowsing(false);
    }
  };

  return (
    <div className="path-row">
      <input
        id={id}
        name="project-root"
        className="mono"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        disabled={locked}
      />
      <button type="button" onClick={() => void browse()} disabled={locked}>
        {browsing ? "Browsing…" : "Browse…"}
      </button>
    </div>
  );
}
