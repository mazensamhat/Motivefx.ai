type Row = {symbol:string;horizonDays:number;outcome:string;notes?:string|null;snapshot:{recordedAt:Date}};
/** Coverage and chronological holdout diagnostics, not a trained forecast model. */
export function summarizeOutcomeValidation(rows:readonly Row[]) {
  const unique=new Map<string,Row>();
  for(const row of rows) {
    const at=row.snapshot.recordedAt.getTime();
    if(!Number.isFinite(at)||!Number.isInteger(row.horizonDays)||row.horizonDays<1)continue;
    if(!["CONFIRMED","PARTIAL","REJECTED"].includes(row.outcome))continue;
    const key=`${row.symbol.toUpperCase()}:${row.horizonDays}:${Math.floor(at/86_400_000)}`;
    // Several observations of the same asset/day/horizon do not become independent samples.
    const old=unique.get(key);if(!old||at<old.snapshot.recordedAt.getTime())unique.set(key,row);
  }
  const samples=[...unique.values()].sort((a,b)=>a.snapshot.recordedAt.getTime()-b.snapshot.recordedAt.getTime());
  const cutoff=samples[Math.floor(samples.length*.7)]?.snapshot.recordedAt.getTime() ?? null;
  const train=cutoff==null?[]:samples.filter(row=>row.snapshot.recordedAt.getTime()+row.horizonDays*86_400_000<cutoff);
  const holdout=cutoff==null?[]:samples.filter(row=>row.snapshot.recordedAt.getTime()>=cutoff);
  const symbols=[...new Set(samples.map(row=>row.symbol.toUpperCase()))];
  return {distinctAssetDays:samples.length,uniqueSymbols:symbols.length,symbols: symbols.slice(0,20),
    purgedTrainingSamples:train.length,holdoutSamples:holdout.length,cutoffAt:cutoff==null?null:new Date(cutoff).toISOString(),
    forecastReady:false,
    note:"Repeated asset/day/horizon observations count once. Overlapping horizons can still be correlated. Training outcomes must finish before the holdout begins. Coverage diagnostics do not establish predictive accuracy or forecast probability."};
}
