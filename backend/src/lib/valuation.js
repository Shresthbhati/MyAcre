// A simple linear-regression trend model over historical price-per-sqft
// data — not a trained ML model, just ordinary least squares over a
// small time series. Good enough to show "here's how prices in this area
// have moved" and project the next period, which is the honest scope for
// a hackathon demo (a real system would swap this for registry data).
function linearRegression(points) {
  const n = points.length
  if (n === 0) return { slope: 0, intercept: 0 }
  if (n === 1) return { slope: 0, intercept: points[0].y }

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)

  const denominator = n * sumXX - sumX * sumX
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

function buildValuation(history) {
  const points = history.map((h) => ({ x: h.periodIndex, y: Number(h.pricePerSqFt) }))
  const { slope, intercept } = linearRegression(points)

  const lastIndex = points.length ? points[points.length - 1].x : 0
  const firstPrice = points.length ? points[0].y : 0
  const lastPrice = points.length ? points[points.length - 1].y : 0
  const periodsElapsed = points.length > 1 ? lastIndex - points[0].x : 1

  const projectedNextPrice = slope * (lastIndex + 1) + intercept
  const cagrPercent =
    firstPrice > 0 && periodsElapsed > 0
      ? (Math.pow(lastPrice / firstPrice, 1 / periodsElapsed) - 1) * 100
      : 0

  return {
    history: history.map((h) => ({ period: h.period, pricePerSqFt: Number(h.pricePerSqFt) })),
    trendSlope: slope,
    projectedNextPrice: Math.round(projectedNextPrice),
    cagrPercent: Number(cagrPercent.toFixed(2)),
    currentAreaAvg: lastPrice,
  }
}

module.exports = { linearRegression, buildValuation }
