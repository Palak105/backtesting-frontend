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
  const [draft, setDraft] = useState(indicator);
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

  const openPanel = () => {
    // Work on a draft so user can change multiple fields then save once.
    setDraft(indicator);
    setOpen(true);
  };

  const cancelPanel = () => {
    setDraft(indicator);
    setOpen(false);
  };

  const savePanel = () => {
    onChange(draft);
    setOpen(false);
  };

  if (allowClearAndSelect && !hasSelection) {
    return (
      <select
        style={{
          ...styles.input,
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: "36px",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
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
    );
  }

  return (
    <>
      <div
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <button
          ref={anchorRef}
          onClick={openPanel}
          style={{
            ...styles.input,
            textAlign: "left",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            // Keep dropdown icon at far right. Clear (✕) sits before it.
            backgroundPosition: "right 12px center",
            paddingRight: allowClearAndSelect ? "72px" : "36px",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {meta?.label || indicator.key}
          </span>
        </button>
        {allowClearAndSelect && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              // place ✕ left of the dropdown chevron
              right: 40,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px 6px",
              lineHeight: 1,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
            title="Clear indicator"
            aria-label="Clear indicator"
          >
            ✕
          </button>
        )}
      </div>

      <FloatingPanel anchorRef={anchorRef} open={open} onClose={cancelPanel}>
        <div style={styles.panelTitle}>{meta?.label || indicator.key}</div>
        <div style={styles.field}>
          <label style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
            Source
          </label>
          <select
            style={styles.panelInput}
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
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
            value={draft.period}
            onChange={(e) => setDraft({ ...draft, period: +e.target.value })}
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
            value={draft.offset}
            onChange={(e) => setDraft({ ...draft, offset: +e.target.value })}
          />
        </div>

        <div style={styles.panelActions}>
          <button
            type="button"
            style={styles.panelSecondaryBtn}
            onClick={cancelPanel}
          >
            Cancel
          </button>
          <button
            type="button"
            style={styles.panelPrimaryBtn}
            onClick={savePanel}
          >
            Save
          </button>
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
      <div style={styles.ruleRow} className="rule-row">
        <span style={styles.if}>If</span>
        <div style={{ minWidth: 0 }}>
          <IndicatorSelector
            indicator={rule.left}
            indicators={indicators}
            onChange={(v) =>
              setter(updateNode(root, path, (r) => ({ ...r, left: v })))
            }
            allowClearAndSelect
          />
        </div>
        <select
          style={{
            ...styles.input,
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            paddingRight: "28px",
            width: "60px",
            minWidth: "60px",
            maxWidth: "60px",
          }}
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
        <select
          style={{
            ...styles.choiceInput,
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "36px",
          }}
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
        {rule.rightType === "value" ? (
          <input
            type="number"
            style={styles.input}
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
          <div style={{ minWidth: 0 }}>
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
          </div>
        )}
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
    <div style={styles.page} className="page">
      <div style={styles.container}>
        {/* Page title */}
        <h1 style={styles.pageTitle} className="page-title">
          Strategy
        </h1>
        <p style={styles.pageSubtitle}>
          Define entry and exit conditions for your scan or backtest.
        </p>

        {/* Filters card */}
        <section style={styles.card} className="card">
          <h2 style={styles.cardTitle} className="card-title">
            Filters
          </h2>
          <div style={styles.filtersGrid} className="filters-grid">
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
                style={{
                  ...styles.input,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "36px",
                }}
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
                style={{
                  ...styles.input,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "36px",
                }}
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
        <section style={styles.card} className="card">
          <h2 style={styles.cardTitle} className="card-title">
            Entry conditions
          </h2>
          <p style={styles.cardDescription}>
            All of these must be true for a symbol to enter.
          </p>
          {renderGroup(entry, entry, setEntry)}
        </section>

        {/* Exit conditions card */}
        <section style={styles.card} className="card">
          <h2 style={styles.cardTitle} className="card-title">
            Exit conditions
          </h2>
          <p style={styles.cardDescription}>
            Any of these will trigger an exit. Optionally set target and
            stop-loss.
          </p>
          <div style={styles.exitFieldsRow} className="exit-fields-row">
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
        <section style={styles.card} className="card">
          <h2 style={styles.cardTitle} className="card-title">
            Results {companies.length > 0 && `(${companies.length})`}
          </h2>
          <div
            style={styles.tableWrap}
            onScroll={onResultsScroll}
            className="table-wrap"
          >
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
      <style>{`
        .rule-row > * {
          min-width: 0;
        }
        .rule-row button,
        .rule-row select,
        .rule-row input {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }
          .exit-fields-row {
            grid-template-columns: 1fr !important;
          }
          .rule-row {
            grid-template-columns: max-content minmax(0, 2fr) 60px minmax(0, 1fr) minmax(0, 2fr) !important;
            gap: 8px !important;
          }
          .rule-row select,
          .rule-row input,
          .rule-row > div {
            min-width: 0 !important;
            width: 100% !important;
          }
          .page {
            padding: 12px !important;
          }
          .card {
            padding: 12px !important;
          }
          .page-title {
            font-size: 24px !important;
          }
        }
        @media (max-width: 640px) {
          .rule-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .rule-row > span {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .page-title {
            font-size: 20px !important;
          }
          .card-title {
            font-size: 14px !important;
          }
          .input, select, input {
            font-size: 16px !important;
          }
          .table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .table-wrap table {
            min-width: 600px;
          }
        }
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        select::-ms-expand {
          display: none;
        }
      `}</style>
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
    padding: "16px",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    maxWidth: 720,
    margin: "0 auto",
    width: "100%",
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
    padding: "16px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
    width: "100%",
    boxSizing: "border-box",
  },
  choiceInput: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
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
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
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
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
    display: "grid",
    gridTemplateColumns:
      "max-content minmax(0, 2fr) 60px minmax(0, 1fr) minmax(0, 2fr)",
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
    whiteSpace: "nowrap",
  },

  indicatorBtn: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 14,
    padding: "10px 12px",
    borderRadius: 8,
    fontWeight: 500,
  },

  indicatorSelect: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    color: "#0f172a",
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
    flexWrap: "wrap",
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

  panelActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },

  panelPrimaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  panelSecondaryBtn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default FiltersPage;
