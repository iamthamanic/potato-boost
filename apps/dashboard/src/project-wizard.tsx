import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatArgv, parseArgv } from "./detect.js";
import { IconButton } from "./icon-button.js";
import { useProjects } from "./project-context.js";
import { ProjectPathField } from "./project-path-field.js";
import {
  ADAPTER_OPTIONS,
  type AdapterId,
  inspectProjectRoot,
  nameFromProjectRoot,
  projectApiError,
  projectOverviewPath,
  projectSetupError,
  RULE_PACKS,
  rulePackLabel,
  TARGET_PROFILES,
  targetProfileLabel,
} from "./projects.js";
import { UiIcon } from "./ui-icon.js";

const STEPS = ["Setup", "Rules", "Profiles", "Review"] as const;

type StepIndex = 0 | 1 | 2 | 3;

export function ProjectWizard() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const [step, setStep] = useState<StepIndex>(0);
  const [name, setName] = useState("");
  const [root, setRoot] = useState("");
  const [adapterId, setAdapterId] = useState<AdapterId>("unknown");
  const [startText, setStartText] = useState("");
  const [rulePackIds, setRulePackIds] = useState<string[]>(["web-performance"]);
  const [targetProfileId, setTargetProfileId] = useState("local-machine");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const creating = useRef(false);
  const lastDerivedName = useRef("");
  const adapterLocked = useRef(false);
  const startLocked = useRef(false);

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

  useEffect(() => {
    const path = root.trim();
    const derived = nameFromProjectRoot(path);
    setName((current) => {
      if (current.trim() === "" || current === lastDerivedName.current) {
        lastDerivedName.current = derived;
        return derived;
      }
      return current;
    });
    if (path.length === 0) {
      setDetecting(false);
      return undefined;
    }
    const generation = { cancelled: false };
    const timer = window.setTimeout(() => {
      setDetecting(true);
      void inspectProjectRoot(path)
        .then((preview) => {
          if (generation.cancelled) {
            return;
          }
          setRoot((current) =>
            current.trim() === path ? preview.root : current,
          );
          setName((current) => {
            if (current.trim() === "" || current === lastDerivedName.current) {
              lastDerivedName.current = preview.name;
              return preview.name;
            }
            return current;
          });
          if (!adapterLocked.current) {
            setAdapterId(preview.adapterId);
          }
          if (!startLocked.current) {
            setStartText(formatArgv(preview.start));
          }
        })
        .catch(() => {
          // Incomplete or unknown paths stay editable; Continue still validates.
        })
        .finally(() => {
          if (!generation.cancelled) {
            setDetecting(false);
          }
        });
    }, 350);
    return () => {
      generation.cancelled = true;
      window.clearTimeout(timer);
    };
  }, [root]);

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
          <h2>Create project</h2>
        </div>
        <IconButton label="Cancel" icon="close" to="/projects" />
      </header>

      <ol className="wizard-steps" aria-label="Project creation progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step ? "is-current" : index < step ? "is-done" : ""
            }
            aria-label={label}
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
            <legend className="visually-hidden">Project Setup</legend>
            <div className="wizard-fields">
              <div className="field field-wide">
                <label htmlFor="project-root">Project path</label>
                <ProjectPathField
                  id="project-root"
                  value={root}
                  onChange={(value) => {
                    setRoot(value);
                    setMessage(undefined);
                  }}
                  onError={setMessage}
                  disabled={busy}
                  placeholder="/Users/me/dev/my-project"
                />
              </div>
              <div className="field">
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  name="project-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setMessage(undefined);
                  }}
                  placeholder="Filled from the folder name"
                  autoComplete="off"
                />
                <p className="muted">
                  Filled from the folder. You can rename it.
                </p>
              </div>
              <div className="field">
                <label htmlFor="project-adapter">Project type</label>
                <select
                  id="project-adapter"
                  name="project-adapter"
                  value={adapterId}
                  onChange={(event) => {
                    adapterLocked.current = true;
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
                  {
                    ADAPTER_OPTIONS.find((option) => option.id === adapterId)
                      ?.detail
                  }
                </p>
              </div>
              <div className="field field-wide">
                <label htmlFor="project-start">Start argv</label>
                <input
                  id="project-start"
                  name="project-start"
                  className="mono"
                  value={startText}
                  onChange={(event) => {
                    startLocked.current = true;
                    setStartText(event.target.value);
                  }}
                  placeholder="Detected from the project"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="muted">
                  {detecting
                    ? "Reading start command from the project…"
                    : "Filled from potato.config or package.json scripts."}{" "}
                  <code>{JSON.stringify(parseArgv(startText))}</code>
                </p>
              </div>
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
                    name="rule-pack"
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
            <h3>Ready to create this project</h3>
            <p className="muted">
              Nothing is written yet. Create project saves this setup once.
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
                <dd>
                  {
                    ADAPTER_OPTIONS.find((option) => option.id === adapterId)
                      ?.label
                  }
                </dd>
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
          <button
            className="icon-label"
            type="button"
            onClick={back}
            disabled={step === 0 || busy}
          >
            <UiIcon name="back" />
            Back
          </button>
          {step < 3 ? (
            <button
              className="wizard-primary icon-label"
              type="button"
              onClick={next}
              disabled={busy}
            >
              Continue
              <UiIcon name="forward" />
            </button>
          ) : (
            <button
              className="wizard-primary icon-label"
              type="button"
              onClick={() => void submit()}
              disabled={busy}
            >
              <UiIcon name="plus" />
              {busy ? "Creating project…" : "Create project"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
