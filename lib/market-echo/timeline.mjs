const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function timestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveTrackingWindow(result, recognizedAt, now = Date.now()) {
  const observedAsOf = timestamp(result?.asOf);
  if (observedAsOf === null) throw new Error("Market Echo result is missing a valid asOf");

  const recognized = timestamp(recognizedAt);
  const usesRecognitionAnchor = recognized !== null;
  const t0 = recognized ?? observedAsOf;
  const horizon = result?.decisionHorizon ?? {};
  let tH = null;
  let endpointPolicy = "unresolved";

  if (horizon.unit === "hour" && Number.isFinite(horizon.value)) {
    tH = t0 + Number(horizon.value) * HOUR;
    endpointPolicy = "elapsed_time";
  } else if (horizon.unit === "calendar_day" && Number.isFinite(horizon.value)) {
    tH = t0 + Number(horizon.value) * DAY;
    endpointPolicy = "elapsed_time";
  } else if (!usesRecognitionAnchor && horizon.unit === "trading_day") {
    const legacyForecastEnd = timestamp(result?.forecastEnd);
    if (legacyForecastEnd !== null) {
      tH = legacyForecastEnd;
      endpointPolicy = "provider_session_proxy";
    }
  }

  const query = Array.isArray(result?.query) ? result.query : [];
  const firstBar = query[0];
  const lastBar = query.at(-1);
  const tData = timestamp(lastBar?.end) ?? observedAsOf;
  const domainStart = timestamp(firstBar?.t) ?? Math.min(observedAsOf, t0);
  const fallbackEnd = t0 + Math.max(DAY, Number(horizon.value || 1) * DAY);
  const domainEnd = Math.max(tData, now, tH ?? fallbackEnd);
  const elapsed = Math.max(0, now - t0);
  const remaining = tH === null ? null : Math.max(0, tH - now);
  const progress = tH === null ? null : Math.max(0, Math.min(1, elapsed / Math.max(1, tH - t0)));

  let status = "tracking";
  if (tH === null) status = "endpoint_unresolved";
  else if (now >= tH && tData < tH) status = "awaiting_market_data";
  else if (tData >= tH) status = "completed";

  return {
    observedAsOf,
    recognizedAt: recognized,
    anchorPolicy: usesRecognitionAnchor ? "recognition_completed" : "observed_market_boundary",
    t0,
    tNow: now,
    tData,
    tH,
    endpointPolicy,
    domainStart,
    domainEnd,
    elapsed,
    remaining,
    progress,
    status,
  };
}

export function timeX(timestampValue, domainStart, pixelsPerHour, leftPadding = 28) {
  return leftPadding + (timestampValue - domainStart) / HOUR * pixelsPerHour;
}

export function compactDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`;
  if (hours > 0) return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分` : `${hours} 小时`;
  return `${remainingMinutes} 分`;
}

