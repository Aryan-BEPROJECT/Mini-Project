import { useEffect, useState } from "react";
import "./App.css";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");
const LOAD_ERROR_MESSAGE = "Unable to load data. Please try again.";
let machinesRequest;
let predictionsRequest;
let healthRequest;

const emptySensorValues = {
  air_temperature: "",
  process_temperature: "",
  rotational_speed: "",
  torque: "",
  tool_wear: "",
};

function apiUrl(path) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is required outside development.");
  }

  return `${API_BASE_URL}${path}`;
}

async function loadMachines() {
  if (!machinesRequest) {
    machinesRequest = fetch(apiUrl("/api/machines"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load machines (${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The machines response was not a list");
        }

        return [...new Map(data.filter((machine) => machine?.id != null).map((machine) => [machine.id, machine])).values()];
      })
      .catch((error) => {
        machinesRequest = undefined;
        throw error;
      });
  }

  return machinesRequest;
}

async function loadPredictions() {
  if (!predictionsRequest) {
    predictionsRequest = fetch(apiUrl("/api/predictions"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load predictions (${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The predictions response was not a list");
        }

        return data;
      })
      .catch((error) => {
        predictionsRequest = undefined;
        throw error;
      });
  }

  return predictionsRequest;
}

async function loadHealth() {
  if (!healthRequest) {
    healthRequest = fetch(apiUrl("/health"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Backend health check failed (${response.status})`);
        }

        const data = await response.json();
        if (data.status !== "healthy") {
          throw new Error("Backend is not healthy");
        }

        return data;
      })
      .catch((error) => {
        healthRequest = undefined;
        throw error;
      });
  }

  return healthRequest;
}

async function submitPrediction(payload) {
  const response = await fetch(apiUrl("/api/predict"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Prediction failed (${response.status})`);
  }

  const result = await response.json();
  predictionsRequest = undefined;
  return result;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Not available";

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function PredictionResult({ prediction }) {
  const riskLevel = String(prediction.risk_level || "Unknown").toUpperCase();
  const probability = Number(prediction.failure_probability);

  return (
    <div className="prediction-card" aria-live="polite">
      <div className="prediction-header">
        <h2>Prediction Result</h2>
        <span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span>
      </div>
      <div className="prediction-grid">
        <div>
          <span>Failure Probability</span>
          <strong>{Number.isFinite(probability) ? `${(probability * 100).toFixed(2)}%` : "Not available"}</strong>
        </div>
        <div>
          <span>Anomaly</span>
          <strong>{prediction.is_anomaly ? "Anomaly Detected" : "Normal"}</strong>
        </div>
        <div>
          <span>Risk Level</span>
          <strong>{riskLevel}</strong>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError] = useState("");
  const [machinesRetry, setMachinesRetry] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState("");
  const [predictionsRetry, setPredictionsRetry] = useState(0);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendRetry, setBackendRetry] = useState(0);
  const [activeMachine, setActiveMachine] = useState(null);
  const [sensorValues, setSensorValues] = useState(emptySensorValues);
  const [modalPrediction, setModalPrediction] = useState(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    loadMachines()
      .then((data) => {
        if (isCurrent) setMachines(data);
      })
      .catch(() => {
        if (isCurrent) setMachinesError(LOAD_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isCurrent) setMachinesLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [machinesRetry]);

  useEffect(() => {
    if (!["Dashboard", "Predictions", "Alerts"].includes(activePage)) return undefined;

    loadPredictions()
      .then(setPredictions)
      .catch(() => setPredictionsError(LOAD_ERROR_MESSAGE))
      .finally(() => setPredictionsLoading(false));
  }, [activePage, predictionsRetry]);

  useEffect(() => {
    loadHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, [backendRetry]);

  const retryMachines = () => {
    setMachinesLoading(true);
    setMachinesError("");
    setMachinesRetry((attempt) => attempt + 1);
  };

  const retryBackend = () => {
    setBackendStatus("checking");
    setBackendRetry((attempt) => attempt + 1);
  };

  const refreshPredictions = () => {
    setPredictionsLoading(true);
    setPredictionsError("");
    setPredictionsRetry((attempt) => attempt + 1);
  };

  const navigateToPage = (page) => {
    if (["Dashboard", "Predictions", "Alerts"].includes(page) && !predictionsRequest) {
      setPredictionsLoading(true);
      setPredictionsError("");
    }
    setActivePage(page);
  };

  const openPredictionForm = (machine) => {
    setActiveMachine(machine);
    setSensorValues(emptySensorValues);
    setModalPrediction(null);
    setModalError("");
  };

  const closePredictionForm = () => {
    if (submitting) return;
    setActiveMachine(null);
  };

  const handlePredictionSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setModalPrediction(null);
    setModalError("");

    try {
      const result = await submitPrediction({
        machine_id: activeMachine.id,
        machine_type: activeMachine.type,
        air_temperature: Number(sensorValues.air_temperature),
        process_temperature: Number(sensorValues.process_temperature),
        rotational_speed: Number(sensorValues.rotational_speed),
        torque: Number(sensorValues.torque),
        tool_wear: Number(sensorValues.tool_wear),
      });
      setModalPrediction(result);
      refreshPredictions();
    } catch {
      setModalError("Prediction failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sensorFields = [
    ["air_temperature", "Air temperature [K]", "any"],
    ["process_temperature", "Process temperature [K]", "any"],
    ["rotational_speed", "Rotational speed [rpm]", "1"],
    ["torque", "Torque [Nm]", "any"],
    ["tool_wear", "Tool wear [min]", "1"],
  ];

  const latestPredictionByMachine = new Map();
  predictions.forEach((prediction) => {
    if (prediction.machine_id != null && !latestPredictionByMachine.has(prediction.machine_id)) {
      latestPredictionByMachine.set(prediction.machine_id, prediction);
    }
  });
  const latestMachinePredictions = [...latestPredictionByMachine.values()];
  const highRiskMachineCount = latestMachinePredictions.filter((prediction) =>
    ["HIGH", "CRITICAL"].includes(String(prediction.risk_level).toUpperCase()),
  ).length;
  const anomalyCount = latestMachinePredictions.filter((prediction) => prediction.is_anomaly).length;
  const alertPredictions = latestMachinePredictions.filter((prediction) =>
    ["HIGH", "CRITICAL"].includes(String(prediction.risk_level).toUpperCase()) || prediction.is_anomaly,
  );
  const retryPredictions = () => {
    setPredictionsLoading(true);
    setPredictionsError("");
    setPredictionsRetry((attempt) => attempt + 1);
  };

  return (
    <div className="app compact-page-active">
      <aside className="sidebar">
        <div className="logo">
          Predictive<span>AI</span>
        </div>
        <nav aria-label="Main navigation">
          {["Dashboard", "Machines", "Predictions", "Alerts", "Settings"].map((page) => (
            <button
              key={page}
              type="button"
              className={`nav-item ${activePage === page ? "active" : ""}`}
              aria-current={activePage === page ? "page" : undefined}
              onClick={() => navigateToPage(page)}
            >
              {page}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div>
            <h1>{activePage}</h1>
            <p>{activePage === "Machines" ? "Machine inventory and risk assessment" : activePage === "Predictions" ? "Prediction history and model risk assessments" : activePage === "Alerts" ? "Machines and predictions requiring attention" : activePage === "Settings" ? "Application and backend status" : "AI-powered machine monitoring"}</p>
          </div>
          <div className="system-status">
            <span className={`status-dot ${backendStatus}`}></span>
            {backendStatus === "checking" ? "Checking backend..." : backendStatus === "online" ? "System Online" : "System Offline"}
            {backendStatus === "offline" && <button type="button" className="text-retry" onClick={retryBackend}>Retry</button>}
          </div>
        </header>

        {activePage === "Dashboard" ? (
          <>
            <section className="kpi-grid">
              <div className="card">
                <p>Total Machines</p>
                <h2>{machinesLoading ? "..." : machinesError ? "Unavailable" : machines.length}</h2>
                <span>Machines loaded from backend</span>
              </div>
              <div className="card">
                <p>High Risk Machines</p>
                <h2>{predictionsLoading ? "..." : predictionsError ? "Unavailable" : highRiskMachineCount}</h2>
                <span>Machines with a latest HIGH or CRITICAL prediction</span>
              </div>
              <div className="card">
                <p>Anomalies Detected</p>
                <h2>{predictionsLoading ? "..." : predictionsError ? "Unavailable" : anomalyCount}</h2>
                <span>Machines with a latest anomaly detection</span>
              </div>
              <div className="card">
                <p>System Status</p>
                <h2>{backendStatus === "checking" ? "Checking" : backendStatus === "online" ? "Online" : "Offline"}</h2>
                <span>Backend health check</span>
              </div>
            </section>

            {predictionsError && (
              <p className="dashboard-data-error" role="alert">
                {predictionsError} <button type="button" onClick={retryPredictions}>Retry</button>
              </p>
            )}

            <section className="content-card">
              <div className="section-header">
                <div>
                  <h2>Machine Risk Overview</h2>
                  <p>Current machine health and failure probability</p>
                </div>
              </div>
              {machinesLoading ? (
                <p className="state-message">Loading...</p>
              ) : machinesError ? (
                <div className="state-message error-message" role="alert">
                  <p>{machinesError}</p>
                  <button type="button" className="text-retry" onClick={retryMachines}>Try again</button>
                </div>
              ) : machines.length === 0 ? (
                <p className="state-message">No data available.</p>
              ) : (
                <div className="machine-list">
                  {machines.map((machine) => (
                    <div className="machine-card" key={machine.id}>
                      <div>
                        <h3>{machine.name}</h3>
                        <p>Machine ID: {machine.id}</p>
                        <p>Type: {machine.type}</p>
                        <p>Location: {machine.location}</p>
                        <p>Status: {machine.status}</p>
                        {latestPredictionByMachine.has(machine.id) ? (
                          <div className="machine-risk-summary">
                            <p>
                              Failure Probability: {(Number(latestPredictionByMachine.get(machine.id).failure_probability) * 100).toFixed(2)}%
                            </p>
                            <span className={`risk-badge ${String(latestPredictionByMachine.get(machine.id).risk_level).toLowerCase()}`}>
                              {latestPredictionByMachine.get(machine.id).risk_level}
                            </span>
                            <span className={`anomaly-indicator ${latestPredictionByMachine.get(machine.id).is_anomaly ? "detected" : "normal"}`}>
                              {latestPredictionByMachine.get(machine.id).is_anomaly ? "Anomaly Detected" : "Normal"}
                            </span>
                          </div>
                        ) : (
                          <p className="state-message">No prediction available.</p>
                        )}
                      </div>
                      <button type="button" onClick={() => openPredictionForm(machine)}>
                        Predict Risk
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : activePage === "Machines" ? (
          <section className="content-card machines-page">
            <div className="section-header">
              <div>
                <h2>Machines</h2>
                <p>{machinesLoading ? "Loading inventory..." : `${machines.length} machines in inventory`}</p>
              </div>
            </div>
            {machinesLoading ? (
              <div className="empty-state" role="status"><p>Loading...</p></div>
            ) : machinesError ? (
              <div className="empty-state error-state" role="alert">
                <h3>Machines unavailable</h3>
                <p>{machinesError}</p>
                <button type="button" className="prediction-retry" onClick={retryMachines}>Try again</button>
              </div>
            ) : machines.length === 0 ? (
              <div className="empty-state"><h3>No data available.</h3></div>
            ) : (
              <div className="machine-table-wrap">
                <table className="machine-table">
                  <thead>
                    <tr>
                      <th scope="col">Machine ID</th>
                      <th scope="col">Machine name</th>
                      <th scope="col">Type</th>
                      <th scope="col">Location</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span className="visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => (
                      <tr key={machine.id}>
                        <td className="machine-id">#{machine.id}</td>
                        <td className="machine-name">{machine.name}</td>
                        <td>{machine.type}</td>
                        <td>{machine.location}</td>
                        <td><span className={`machine-status ${String(machine.status || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{machine.status}</span></td>
                        <td className="machine-action">
                          <button type="button" onClick={() => openPredictionForm(machine)}>Predict Risk</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : activePage === "Predictions" ? (
          <section className="content-card predictions-page">
            <div className="section-header">
              <div>
                <h2>Prediction history</h2>
                <p>{predictionsLoading ? "Loading prediction history..." : `${predictions.length} predictions recorded`}</p>
              </div>
            </div>

            <div className="prediction-filters" role="group" aria-label="Filter predictions by risk level">
              {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((riskLevel) => (
                <button
                  key={riskLevel}
                  type="button"
                  className={`prediction-filter ${riskFilter === riskLevel ? "active" : ""}`}
                  aria-pressed={riskFilter === riskLevel}
                  onClick={() => setRiskFilter(riskLevel)}
                >
                  {riskLevel === "ALL" ? "All" : riskLevel}
                </button>
              ))}
            </div>

            {predictionsLoading ? (
              <div className="empty-state" role="status"><p>Loading...</p></div>
            ) : predictionsError ? (
              <div className="empty-state error-state" role="alert">
                <h3>Predictions unavailable</h3>
                <p>{predictionsError}</p>
                <button
                  type="button"
                  className="prediction-retry"
                  onClick={() => {
                    setPredictionsLoading(true);
                    setPredictionsError("");
                    setPredictionsRetry((attempt) => attempt + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="empty-state"><p>No data available.</p></div>
            ) : (
              <div className="machine-table-wrap">
                <table className="machine-table prediction-table">
                  <thead>
                    <tr>
                      <th scope="col">Prediction ID</th>
                      <th scope="col">Machine ID</th>
                      <th scope="col">Failure Probability</th>
                      <th scope="col">Anomaly</th>
                      <th scope="col">Risk Level</th>
                      <th scope="col">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions
                      .filter((prediction) => riskFilter === "ALL" || String(prediction.risk_level).toUpperCase() === riskFilter)
                      .map((prediction) => {
                        const riskLevel = String(prediction.risk_level || "Unknown").toUpperCase();
                        const probability = Number(prediction.failure_probability);

                        return (
                          <tr key={prediction.id}>
                            <td className="machine-id">#{prediction.id}</td>
                            <td>#{prediction.machine_id}</td>
                            <td>{Number.isFinite(probability) ? `${(probability * 100).toFixed(2)}%` : "Not available"}</td>
                            <td>
                              <span className={`anomaly-indicator ${prediction.is_anomaly ? "detected" : "normal"}`}>
                                {prediction.is_anomaly ? "Anomaly Detected" : "Normal"}
                              </span>
                            </td>
                            <td><span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span></td>
                            <td>{formatTimestamp(prediction.created_at)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {predictions.filter((prediction) => riskFilter === "ALL" || String(prediction.risk_level).toUpperCase() === riskFilter).length === 0 && (
                  <p className="state-message">No predictions match this risk level.</p>
                )}
              </div>
            )}
          </section>
        ) : activePage === "Alerts" ? (
          <section className="content-card alerts-page">
            <div className="section-header">
              <div>
                <h2>Attention required</h2>
                <p>{predictionsLoading ? "Loading alerts..." : `${alertPredictions.length} alerts from prediction history`}</p>
              </div>
            </div>
            {predictionsLoading ? (
              <div className="empty-state" role="status"><p>Loading...</p></div>
            ) : predictionsError ? (
              <div className="empty-state error-state" role="alert">
                <h3>Alerts unavailable</h3>
                <p>{predictionsError}</p>
                <button type="button" className="prediction-retry" onClick={retryPredictions}>Try again</button>
              </div>
            ) : alertPredictions.length === 0 ? (
              <div className="empty-state"><h3>No active alerts</h3><p>No latest high-risk predictions or anomalies were found.</p></div>
            ) : (
              <div className="machine-table-wrap">
                <table className="machine-table alert-table">
                  <thead>
                    <tr>
                      <th scope="col">Prediction ID</th>
                      <th scope="col">Machine ID</th>
                      <th scope="col">Failure Probability</th>
                      <th scope="col">Anomaly</th>
                      <th scope="col">Risk Level</th>
                      <th scope="col">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertPredictions.map((prediction) => {
                      const riskLevel = String(prediction.risk_level || "Unknown").toUpperCase();
                      const probability = Number(prediction.failure_probability);

                      return (
                        <tr key={prediction.id}>
                          <td className="machine-id">#{prediction.id}</td>
                          <td className="machine-id">#{prediction.machine_id}</td>
                          <td>{Number.isFinite(probability) ? `${(probability * 100).toFixed(2)}%` : "Not available"}</td>
                          <td>
                            <span className={`anomaly-indicator ${prediction.is_anomaly ? "detected" : "normal"}`}>
                              {prediction.is_anomaly ? "Anomaly Detected" : "Normal"}
                            </span>
                          </td>
                          <td><span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span></td>
                          <td>{formatTimestamp(prediction.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : activePage === "Settings" ? (
          <section className="content-card settings-page">
            <div className="section-header">
              <div>
                <h2>Service configuration</h2>
                <p>Current application connection settings</p>
              </div>
            </div>
            <dl className="settings-list">
              <div>
                <dt>Backend API</dt>
                <dd>{API_BASE_URL || "Not configured"}</dd>
              </div>
              <div>
                <dt>Backend status</dt>
                <dd><span className={`health-label ${backendStatus}`}>{backendStatus === "checking" ? "Checking" : backendStatus === "online" ? "Online" : "Offline"}</span></dd>
              </div>
            </dl>
          </section>
        ) : null}
      </main>

      {activeMachine && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closePredictionForm()}>
          <section className="prediction-modal" role="dialog" aria-modal="true" aria-labelledby="prediction-title">
            <div className="modal-header">
              <div>
                <h2 id="prediction-title">Predict machine risk</h2>
                <p>{activeMachine.name} | Machine #{activeMachine.id}</p>
              </div>
              <button type="button" className="modal-close" onClick={closePredictionForm} aria-label="Close prediction form" disabled={submitting}>x</button>
            </div>
            <form onSubmit={handlePredictionSubmit}>
              <div className="sensor-fields">
                {sensorFields.map(([name, label, step]) => (
                  <label key={name}>
                    <span>{label}</span>
                    <input
                      type="number"
                      name={name}
                      step={step}
                      required
                      value={sensorValues[name]}
                      onChange={(event) => setSensorValues({ ...sensorValues, [name]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
              {modalError && <p className="error-message" role="alert">{modalError}</p>}
              <div className="modal-actions">
                <button type="button" className="button-secondary" onClick={closePredictionForm} disabled={submitting}>Cancel</button>
                <button type="submit" disabled={submitting}>{submitting ? "Analyzing..." : "Run prediction"}</button>
              </div>
            </form>
            {submitting && <p className="state-message" role="status">Analyzing machine data...</p>}
            {modalPrediction && <PredictionResult prediction={modalPrediction} />}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;