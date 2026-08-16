import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseArgv } from "./detect.js";
import { useProjects } from "./project-context.js";
import {
  ADAPTER_OPTIONS,
  type AdapterId,
  projectApiError,
  projectOverviewPath,
  projectSetupError,
  RULE_PACKS,
  rulePackLabel,
  TARGET_PROFILES,
  targetProfileLabel,
} from "./projects.js";

const STEPS = ["Project Setup", "Rules", "Target Profiles", "Review"] as const;

type StepIndex = 0 | 1 | 2 | 3;

export function ProjectWizard() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const [step, setStep] = useState<StepIndex>(0);
  const [name, setName] = useState("");
  const [root, setRoot] = useState("");
  const [adapterId, setAdapterId] = useState<AdapterId>("unknown");
  const [startText, setStartText] = useState("");
  const [rulePackIds, setRulePackIds] = useState<string[]>([
    "web-performance",
  ]);
  const [targetProfileId, setTargetProfileId] = useState("local-machine");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);

  const validateCurrent = (): string | undefined => {
    if (step === 0) {
      return projectSetupError(name, root);
    }
    if (step === 1 && rulePackIds.length === 0) {
      return "Choose at least one rule pack.";
    }
    if (step === 2 && targetProfileId.length === 0) {
      return "Choose a target profile.";
    }
    return undefined;
  };

  const next = (): void => {
    const validation = validateCurrent();
    if (validation !== undefined) {
      setMessage(validation);
      return;
    }
    setMessage(undefined);
    if (step < 3) {
      setStep((step + 1) as StepIndex);
    }
  };

  const back = (): void => {
    setMessage(undefined);
    if (step > 0) {
      setStep((step - 1) as StepIndex);
    }
  };

  const toggleRule = (ruleId: string): void => {
    setRulePackIds((current) =>
      current.includes(ruleId)
        ? current.filter((id) => id !== ruleId)
        : [...current, ruleId],
    );
    setMessage(undefined);
  };

  const submit = async (): Promise<void> => {
    if (creating.current) {
      return;
    }
    const setupError = projectSetupError(name, root);
    if (setupError !== undefined || rulePackIds.length === 0) {
      setMessage(setupError ?? "Choose at least one rule pack.");
      return;
    }
    creating.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      const project = await createProject({
        name: name.trim(),
        root: root.trim(),
        adapterId,
        start: parseArgv(startText),
        rulePackIds,
        targetProfileId,
      });
      navigate(projectOverviewPath(project.id));
    } catch (error) {
      creating.current = false;
      setBusy(false);
      setMessage(projectApiError(error));
    }
  };

  return (
    <section className="narrow-page wizard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">New local workspace</p>
          <h2>Create project</h2>
          <p className="muted">
            Configure the measurement context once. You can change every test
            setup choice later.
          </p>
        </div>
        <Link className="button-link" to="/projects">
          Cancel
        </Link>
      </header>

      <ol className="wizard-steps" aria-label="Project creation progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={index === step ? "is-current" : index < step ? "is-done" : ""}
            aria-current={index === step ? "step" : undefined}
          >
            <span className="wizard-step-number" aria-hidden="true">
              {index < step ? "✓" : String(index + 1)}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="panel wizard-panel">
        {step === 0 ? (
          <fieldset className="wizard-fieldset">
            <legend>Project Setup</legend>
            <p className="muted">
              Tell Potato Boost which local workspace this project represents.
            </p>
            <div className="field">
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage(undefined);
                }}
                placeholder="My Three.js Game"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="project-root">Project path</label>
              <input
                id="project-root"
                className="mono"
                value={root}
                onChange={(event) => {
                  setRoot(event.target.value);
                  setMessage(undefined);
                }}
                placeholder="/Users/me/dev/my-project"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="muted">
                The Local API validates and canonicalizes this directory when
                you create the project.
              </p>
            </div>
            <div className="field">
              <label htmlFor="project-adapter">Project type</label>
              <select
                id="project-adapter"
                value={adapterId}
                onChange={(event) => {
                  setAdapterId(event.target.value as AdapterId);
                }}
              >
                {ADAPTER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="muted">
                {ADAPTER_OPTIONS.find((option) => option.id === adapterId)?.detail}
              </p>
            </div>
            <div className="field">
              <label htmlFor="project-start">Start argv</label>
              <input
                id="project-start"
                className="mono"
                value={startText}
                onChange={(event) => {
                  setStartText(event.target.value);
                }}
                placeholder="pnpm dev"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="muted">
                Stored as argv, not a shell command. Preview:{" "}
                <code>{JSON.stringify(parseArgv(startText))}</code>
              </p>
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className="wizard-fieldset">
            <legend>Rules</legend>
            <p className="muted">
              Choose the rule packs that should define useful findings for this
              project.
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
        ) : null}

        {step === 2 ? (
          <fieldset className="wizard-fieldset">
            <legend>Target Profiles</legend>
            <p className="muted">
              Define the performance environment this project should be judged
              against by default.
            </p>
            <div className="choice-list">
              {TARGET_PROFILES.map((profile) => (
                <label className="choice-card" key={profile.id}>
                  <input
                    type="radio"
                    name="target-profile"
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
        ) : null}

        {step === 3 ? (
          <div className="wizard-review">
            <p className="eyebrow">Review</p>
            <h3>Ready to create this project</h3>
            <p className="muted">
              No project has been written yet. Create project will save this
              setup to the local registry once.
            </p>
            <dl className="review-list">
              <div>
                <dt>Project</dt>
                <dd>{name.trim()}</dd>
              </div>
              <div>
                <dt>Path</dt>
                <dd className="mono">{root.trim()}</dd>
              </div>
              <div>
                <dt>Project type</dt>
                <dd>{ADAPTER_OPTIONS.find((option) => option.id === adapterId)?.label}</dd>
              </div>
              <div>
                <dt>Start argv</dt>
                <dd className="mono">{JSON.stringify(parseArgv(startText))}</dd>
              </div>
              <div>
                <dt>Rules</dt>
                <dd>{rulePackIds.map(rulePackLabel).join(", ")}</dd>
              </div>
              <div>
                <dt>Target profile</dt>
                <dd>{targetProfileLabel(targetProfileId)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {message !== undefined ? (
          <p className="wizard-message" role="alert">
            {message}
          </p>
        ) : null}

        <div className="wizard-actions">
          <button type="button" onClick={back} disabled={step === 0 || busy}>
            Back
          </button>
          {step < 3 ? (
            <button
              className="wizard-primary"
              type="button"
              onClick={next}
              disabled={busy}
            >
              Continue
            </button>
          ) : (
            <button
              className="wizard-primary"
              type="button"
              onClick={() => void submit()}
              disabled={busy}
            >
              {busy ? "Creating project…" : "Create project"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
