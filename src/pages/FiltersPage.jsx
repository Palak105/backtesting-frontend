import React, { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "../config";

/* =========================
   INDICATOR MODEL
========================= */

const emptyIndicator = () => ({
  key: "",
  source: "close",
  period: 14,
  offset: 0,
});

const createRule = () => ({
  type: "rule",
  left: emptyIndicator(), // same as right: start empty, "Select indicator"
  operator: ">",
  rightType: "value",
  rightValue: "",
  rightIndicator: emptyIndicator(),
});

const createGroup = (logic = "AND", children = []) => ({
  type: "group",
  logic,
  children,
});

/* =========================
   FLOATING PANEL (CORE UX)
========================= */

const FloatingPanel = ({ anchorRef, open, onClose, children }) => {
  const panelRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  if (!open) return null;

  const rect = anchorRef.current.getBoundingClientRect();

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        background: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        zIndex: 1000,
        width: 240,
      }}
    >
      {children}
    </div>
  );
};

/* =========================
   INDICATOR SELECTOR
========================= */

const IndicatorSelector = ({
  indicator,
  indicators,
  onChange,
  allowClearAndSelect = false,
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef();

  const meta = indicators.find((i) => i.key === indicator.key);
  const hasSelection =
    !allowClearAndSelect || (indicator.key && indicator.key.length > 0);

  const handleSelectIndicator = (key) => {
    onChange({ key, source: key, period: 14, offset: 0 });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ ...indicator, key: "" });
  };

  const fieldWrapper = {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    overflow: "hidden",
  };

  if (allowClearAndSelect && !hasSelection) {
    return (
      <div style={fieldWrapper}>
        <select
          style={{ ...styles.indicatorSelect, border: "none", minWidth: 140 }}
          value=""
          onChange={(e) => {
            const key = e.target.value;
            if (key) handleSelectIndicator(key);
          }}
        >
          <option value="">Select indicator</option>
          {indicators.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label || i.key}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <>
      <div style={fieldWrapper}>
        <button
          ref={anchorRef}
          onClick={() => setOpen(true)}
          style={{ ...styles.indicatorBtn, border: "none" }}
        >
          {meta?.label || indicator.key}
          <span style={{ opacity: 0.6, marginLeft: 4 }}>▾</span>
        </button>
        {allowClearAndSelect && (
          <button
            type="button"
            onClick={handleClear}
            style={styles.clearBtnInside}
            title="Clear indicator"
            aria-label="Clear indicator"
          >
            ✕
          </button>
        )}
      </div>

      <FloatingPanel
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div style={styles.panelTitle}>{meta?.label || indicator.key}</div>
        <div style={styles.field}>
          <label style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
            Source
          </label>
          <select
            style={styles.panelInput}
            value={indicator.source}
            onChange={(e) => onChange({ ...indicator, source: e.target.value })}
          >
            <option value="open">Open</option>
            <option value="high">High</option>
            <option value="low">Low</option>
            <option value="close">Close</option>
            <option value="volume">Volume</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
            Period
          </label>
          <input
            type="number"
            min={1}
            style={styles.panelInput}
            value={indicator.period}
            onChange={(e) =>
              onChange({ ...indicator, period: +e.target.value })
            }
          />
        </div>
        <div style={styles.field}>
          <label style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
            Offset
          </label>
          <input
            type="number"
            min={0}
            style={styles.panelInput}
            value={indicator.offset}
            onChange={(e) =>
              onChange({ ...indicator, offset: +e.target.value })
            }
          />
        </div>
      </FloatingPanel>
    </>
  );
};

/* =========================
   MAIN PAGE
========================= */

const LIMIT = 50;

/* Serialize entry/exit tree for backend: left/rightIndicator objects -> left/rightValue strings */
function serializeNode(node) {
  if (!node) return null;
  if (node.type === "rule") {
    const leftKey =
      typeof node.left === "object" && node.left != null
        ? node.left.key
        : node.left;
    const rightVal =
      node.rightType === "indicator"
        ? typeof node.rightIndicator === "object" && node.rightIndicator != null
          ? node.rightIndicator.key
          : node.rightIndicator
        : node.rightValue;
    return {
      type: "rule",
      left: leftKey || "",
      leftLookback: node.leftLookback ?? 0,
      operator: node.operator,
      rightType: node.rightType,
      rightValue: rightVal,
      rightLookback: node.rightLookback ?? 0,
    };
  }
  return {
    type: "group",
    logic: node.logic,
    children: (node.children || []).map(serializeNode).filter(Boolean),
  };
}

function hasAnyValidRule(node) {
  if (!node) return false;
  if (node.type === "rule") {
    const leftKey =
      typeof node.left === "object" && node.left != null
        ? node.left.key
        : node.left;
    return Boolean(leftKey);
  }
  return (node.children || []).some(hasAnyValidRule);
}

const FiltersPage = () => {
  const [strategyName, setStrategyName] = useState("");
  const [timeframe, setTimeframe] = useState("1D");
  const [marketCap, setMarketCap] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [targetPct, setTargetPct] = useState("");
  const [slPct, setSlPct] = useState("");

  const [indicators, setIndicators] = useState([]);

  const [entry, setEntry] = useState(createGroup("AND", [createRule()]));
  const [exit, setExit] = useState(createGroup("OR", [])); // empty: show "Add condition" first

  const [companies, setCompanies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(API_ENDPOINTS.INDICATORS)
      .then((r) => r.json())
      .then((d) => setIndicators(d.indicators || []));
  }, []);

  /* -------- Tree helpers -------- */

  const updateNode = (node, path, updater) => {
    if (!path.length) return updater(node);
    const [i, ...rest] = path;
    return {
      ...node,
      children: node.children.map((c, idx) =>
        idx === i ? updateNode(c, rest, updater) : c,
      ),
    };
  };

  const addRule = (setter, root, path) =>
    setter(
      updateNode(root, path, (g) => ({
        ...g,
        children: [...g.children, createRule()],
      })),
    );

  const addGroup = (setter, root, path) =>
    setter(
      updateNode(root, path, (g) => ({
        ...g,
        children: [...g.children, createGroup("OR", [createRule()])],
      })),
    );

  const removeNode = (setter, root, path) => {
    if (path.length === 0) return;
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setter(
      updateNode(root, parentPath, (g) => ({
        ...g,
        children: g.children.filter((_, i) => i !== idx),
      })),
    );
  };

  const applyFilters = async (reset = false) => {
    if (loading) return;
    if (!hasAnyValidRule(entry)) {
      setError("Add at least one entry condition with an indicator selected.");
      return;
    }

    const entrySerialized = serializeNode(entry);

    if (reset) {
      setCompanies([]);
      setOffset(0);
      setHasMore(true);
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(API_ENDPOINTS.APPLY_FILTERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeframe,
          marketCapCategory: marketCap === "all" ? null : marketCap,
          startDate: startDate || null,
          endDate: endDate || null,
          entry: entrySerialized,
          exit: serializeNode(exit),
          targetPct: targetPct ? parseFloat(targetPct) : null,
          slPct: slPct ? parseFloat(slPct) : null,
          limit: LIMIT,
          offset: reset ? 0 : offset,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const rows = data.companies || [];

      setCompanies((prev) => (reset ? rows : [...prev, ...rows]));
      setHasMore(rows.length >= LIMIT);
      if (rows.length >= LIMIT) setOffset((o) => o + LIMIT);
      setError("");
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const onResultsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 80 && hasMore && !loading) {
      applyFilters(false);
    }
  };

  /* -------- Rule Row -------- */

  const RuleRow = ({ rule, root, setter, path }) => {
    return (
      <div style={styles.ruleRow}>
        <span style={styles.if}>If</span>
        <IndicatorSelector
          indicator={rule.left}
          indicators={indicators}
          onChange={(v) =>
            setter(updateNode(root, path, (r) => ({ ...r, left: v })))
          }
          allowClearAndSelect
        />
        <select
          style={styles.selectSmall}
          value={rule.operator}
          onChange={(e) =>
            setter(
              updateNode(root, path, (r) => ({
                ...r,
                operator: e.target.value,
              })),
            )
          }
        >
          <option value=">">{">"}</option>
          <option value="<">{"<"}</option>
          <option value="=">{"="}</option>
        </select>
        {rule.rightType === "value" ? (
          <input
            type="number"
            style={styles.inputSmall}
            value={rule.rightValue}
            onChange={(e) =>
              setter(
                updateNode(root, path, (r) => ({
                  ...r,
                  rightValue: e.target.value,
                })),
              )
            }
          />
        ) : (
          <IndicatorSelector
            indicator={rule.rightIndicator}
            indicators={indicators}
            onChange={(v) =>
              setter(
                updateNode(root, path, (r) => ({
                  ...r,
                  rightIndicator: v,
                })),
              )
            }
            allowClearAndSelect
          />
        )}
        <select
          style={styles.selectSmall}
          value={rule.rightType}
          onChange={(e) => {
            const newType = e.target.value;
            setter(
              updateNode(root, path, (r) => ({
                ...r,
                rightType: newType,
                rightIndicator:
                  newType === "indicator" ? emptyIndicator() : r.rightIndicator,
              })),
            );
          }}
        >
          <option value="value">Value</option>
          <option value="indicator">Indicator</option>
        </select>
      </div>
    );
  };

  const renderGroup = (node, root, setter, path = []) => (
    <div style={styles.group}>
      {(node.children || []).map((c, i) =>
        c.type === "rule" ? (
          <RuleRow
            key={i}
            rule={c}
            root={root}
            setter={setter}
            path={[...path, i]}
          />
        ) : c.type === "group" ? (
          <div key={i} style={styles.nestedGroup}>
            <span style={styles.logicBadge}>{c.logic || "OR"}</span>
            {renderGroup(c, root, setter, [...path, i])}
          </div>
        ) : null,
      )}
      <div style={styles.groupActions}>
        <button
          style={styles.addBtn}
          onClick={() => addRule(setter, root, path)}
        >
          + Add condition
        </button>
        <button
          style={styles.addGroupBtn}
          onClick={() => addGroup(setter, root, path)}
        >
          + Add OR group
        </button>
        {path.length > 0 && (
          <button
            style={styles.removeGroupBtn}
            onClick={() => removeNode(setter, root, path)}
          >
            Remove group
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Page title */}
        <h1 style={styles.pageTitle}>Strategy</h1>
        <p style={styles.pageSubtitle}>
          Define entry and exit conditions for your scan or backtest.
        </p>

        {/* Filters card */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Filters</h2>
          <div style={styles.filtersGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Strategy name</label>
              <input
                style={styles.input}
                placeholder="e.g. Momentum breakout"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Timeframe</label>
              <select
                style={styles.input}
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="1D">Daily (1D)</option>
                <option value="1W">Weekly (1W)</option>
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Market cap</label>
              <select
                style={styles.input}
                value={marketCap}
                onChange={(e) => setMarketCap(e.target.value)}
              >
                <option value="all">All</option>
                <option value="SmallCap">Small Cap</option>
                <option value="MidCap">Mid Cap</option>
                <option value="LargeCap">Large Cap</option>
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Start date</label>
              <input
                type="date"
                style={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>End date</label>
              <input
                type="date"
                style={styles.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Entry conditions card */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Entry conditions</h2>
          <p style={styles.cardDescription}>
            All of these must be true for a symbol to enter.
          </p>
          {renderGroup(entry, entry, setEntry)}
        </section>

        {/* Exit conditions card */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Exit conditions</h2>
          <p style={styles.cardDescription}>
            Any of these will trigger an exit. Optionally set target and
            stop-loss.
          </p>
          <div style={styles.exitFieldsRow}>
            <div style={styles.formField}>
              <label style={styles.label}>Target %</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 5"
                style={styles.input}
                value={targetPct}
                onChange={(e) => setTargetPct(e.target.value)}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>SL %</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 2"
                style={styles.input}
                value={slPct}
                onChange={(e) => setSlPct(e.target.value)}
              />
            </div>
          </div>
          {exit.children && exit.children.length > 0 ? (
            renderGroup(exit, exit, setExit)
          ) : (
            <div style={styles.emptyConditions}>
              <button
                style={styles.addBtn}
                onClick={() => addRule(setExit, exit, [])}
              >
                + Add condition
              </button>
            </div>
          )}
        </section>

        {/* Actions */}
        <div style={styles.actionsCard}>
          <button
            style={styles.primaryBtn}
            onClick={() => applyFilters(true)}
            disabled={loading}
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
          <button style={styles.secondaryBtn}>Backtest</button>
          <button style={styles.ghostBtn}>Save strategy</button>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Results table */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Results {companies.length > 0 && `(${companies.length})`}
          </h2>
          <div style={styles.tableWrap} onScroll={onResultsScroll}>
            {companies.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Symbol</th>
                    <th style={styles.th}>Market cap</th>
                    <th style={styles.th}>Industry</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{c.symbol}</td>
                      <td style={styles.td}>{c.market_cap_category ?? "—"}</td>
                      <td style={styles.td}>{c.industry ?? "—"}</td>
                      <td style={styles.td}>
                        {c.date ? String(c.date).split(" ")[0] : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={styles.emptyResults}>
                {loading ? "Loading…" : "Run Scan to see matching stocks."}
              </div>
            )}
            {loading && companies.length > 0 && (
              <div style={styles.loadingMore}>Loading more…</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/* =========================
   STYLES (STRIPE / STREAK-LIKE)
========================= */

const styles = {
  page: {
    background: "#f8fafc",
    color: "#0f172a",
    minHeight: "100vh",
    padding: "32px 24px",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    maxWidth: 720,
    margin: "0 auto",
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
  },

  pageSubtitle: {
    fontSize: 15,
    color: "#64748b",
    margin: "0 0 32px 0",
    lineHeight: 1.5,
  },

  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 4px 0",
  },

  cardDescription: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 16px 0",
    lineHeight: 1.5,
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20,
  },

  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#475569",
  },

  input: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    color: "#0f172a",
    outline: "none",
  },

  inputSmall: {
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    color: "#0f172a",
    width: 80,
    outline: "none",
  },

  selectSmall: {
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    cursor: "pointer",
  },

  group: {
    marginTop: 8,
  },

  nestedGroup: {
    marginLeft: 16,
    paddingLeft: 16,
    borderLeft: "2px solid #e2e8f0",
    marginBottom: 12,
  },

  logicBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    color: "#059669",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  groupActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  addGroupBtn: {
    background: "transparent",
    border: "1px dashed #059669",
    color: "#059669",
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
  },

  removeGroupBtn: {
    background: "transparent",
    border: "1px dashed #dc2626",
    color: "#dc2626",
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
  },

  exitFieldsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 16,
  },

  emptyConditions: {
    marginTop: 8,
  },

  errorBanner: {
    padding: 12,
    borderRadius: 8,
    background: "#fef2f2",
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 24,
  },

  tableWrap: {
    maxHeight: 400,
    overflowY: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    background: "#fff",
  },

  td: {
    padding: "10px 12px",
    fontSize: 14,
    borderBottom: "1px solid #f1f5f9",
  },

  emptyResults: {
    padding: 32,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },

  loadingMore: {
    padding: 12,
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
  },

  ruleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "#f8fafc",
    borderRadius: 8,
    marginBottom: 8,
    border: "1px solid #f1f5f9",
  },

  if: {
    color: "#059669",
    fontWeight: 600,
    fontSize: 13,
    minWidth: 24,
  },

  indicatorBtn: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 6,
    fontWeight: 500,
  },

  indicatorSelect: {
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    color: "#64748b",
    minWidth: 140,
    cursor: "pointer",
    outline: "none",
  },

  clearBtn: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 6px",
    borderRadius: 4,
    lineHeight: 1,
  },

  clearBtnInside: {
    background: "transparent",
    border: "none",
    borderLeft: "1px solid #e2e8f0",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 12,
    padding: "8px 10px",
    lineHeight: 1,
  },

  addBtn: {
    background: "transparent",
    border: "1px dashed #cbd5e1",
    color: "#475569",
    cursor: "pointer",
    marginTop: 8,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
  },

  actionsCard: {
    display: "flex",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
  },

  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryBtn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },

  ghostBtn: {
    background: "transparent",
    color: "#64748b",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },

  panelTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  },

  panelInput: {
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    color: "#0f172a",
    outline: "none",
  },
};

export default FiltersPage;
