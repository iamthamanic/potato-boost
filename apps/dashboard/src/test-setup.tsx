import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatArgv, parseArgv } from "./detect.js";
import { useProjects } from "./project-context.js";
import {
  ADAPTER_OPTIONS,
  type AdapterId,
  projectApiError,
  projectSetupError,
  RULE_PACKS,
  TARGET_PROFILES,
} from "./projects.js";

export function TestSetup() {
  const { projectId } = useParams();
  const { projects, updateProject } = useProjects();
  const project = projects.find((candidate) => candidate.id === projectId);
  const [name, setName] = useState("");
  const [root, setRoot] = useState("");
  const [adapterId, setAdapterId] = useState<AdapterId>("unknown");
  const [startText, setStartText] = useState("");
  const [rulePackIds, setRulePackIds] = useState<string[]>([]);
  const [targetProfileId, setTargetProfileId] = useState("local-machine");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project === undefined) {
      return;
    }
    setName(project.name);
    setRoot(project.root);
    setAdapterId(project.adapterId);
    setStartText(formatArgv(project.start));
    setRulePackIds([...project.rulePackIds]);
    setTargetProfileId(project.targetProfileId);
    setMessage(undefined);
  }, [project]);

  if (project === undefined) {
    return null;
  }

  const toggleRule = (ruleId: string): void => {
    setRulePackIds((current) =>
      current.includes(ruleId)
        ? current.filter((id) => id !== ruleId)
        : [...current, ruleId],
    );
    setMessage(undefined);
  };

  const save = async (): Promise<void> => {
    const setupError = projectSetupError(name, root);
    if (setupError !== undefined) {
      setMessageKind("error");
      setMessage(setupError);
      return;
    }
    if (rulePackIds.length === 0) {
      setMessageKind("error");
      setMessage("Choose at least one rule pack.");
      return;
    }

    setBusy(true);
    setMessage(undefined);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        root: root.trim(),
        adapterId,
        start: parseArgv(startText),
        rulePackIds,
        targetProfileId,
      });
      setMessageKind("success");
      setMessage("Test setup saved.");
    } catch (error) {
      setMessageKind("error");
      setMessage(projectApiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="workspace-page test-setup-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{project.name}</p>
          <h2>Test Setup</h2>
          <p className="muted">
            These settings define the default measurement context for this
            project. You can change them whenever the project or target changes.
          </p>
        </div>
      </header>

      <div className="test-setup-grid">
        <fieldset className="panel setup-section">
          <legend>Project Setup</legend>
          <p className="muted">
            Update the local workspace, project type, or start command.
          </p>
          <div className="field">
            <label htmlFor="setup-project-name">Project name</label>
            <input
              id="setup-project-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setMessage(undefined);
              }}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="setup-project-root">Project path</label>
            <input
              id="setup-project-root"
              className="mono"
              value={root}
              onChange={(event) => {
                setRoot(event.target.value);
                setMessage(undefined);
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="muted">
              If the project moved, update the path here. The Local API validates
              the new directory before saving it.
            </p>
          </div>
          <div className="field">
            <label htmlFor="setup-project-adapter">Project type</label>
            <select
              id="setup-project-adapter"
              value={adapterId}
              onChange={(event) => {
                setAdapterId(event.target.value as AdapterId);
                setMessage(undefined);
              }}
            >
              {ADAPTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="setup-project-start">Start argv</label>
            <input
              id="setup-project-start"
              className="mono"
              value={startText}
              onChange={(event) => {
                setStartText(event.target.value);
                setMessage(undefined);
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="muted">
              Stored as argv: <code>{JSON.stringify(parseArgv(startText))}</code>
            </p>
          </div>
        </fieldset>

        <fieldset className="panel setup-section">
          <legend>Rules</legend>
          <p className="muted">
            Choose which rule packs should turn measurements into findings.
          </p>
          <div className="choice-list">
            {RULE_PACKS.map((rule) => (
              <label className="choice-card" key={rule.id}>
                <input
                  type="checkbox"
                  checked={rulePackIds.includes(rule.id)}
                  onChange={() => toggleRule(rule.id)}
                />
                <span>
                  <strong>{rule.label}</strong>
                  <small>{rule.detail}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="panel setup-section">
          <legend>Target Profiles</legend>
          <p className="muted">
            Choose the default environment this project's performance should be
            evaluated against.
          </p>
          <div className="choice-list">
            {TARGET_PROFILES.map((profile) => (
              <label className="choice-card" key={profile.id}>
                <input
                  type="radio"
                  name="setup-target-profile"
                  value={profile.id}
                  checked={targetProfileId === profile.id}
                  onChange={() => {
                    setTargetProfileId(profile.id);
                    setMessage(undefined);
                  }}
                />
                <span>
                  <strong>{profile.label}</strong>
                  <small>{profile.detail}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="setup-save-bar">
        <div>
          <strong>Project-specific settings</strong>
          <p className="muted">
            Saving updates this project only. Other registered projects stay
            unchanged.
          </p>
        </div>
        <button
          className="wizard-primary"
          type="button"
          onClick={() => void save()}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      {message !== undefined ? (
        <p
          className={
            messageKind === "error"
              ? "wizard-message is-error"
              : "wizard-message is-success"
          }
          role={messageKind === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
