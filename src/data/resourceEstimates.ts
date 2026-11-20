// Mineral resource estimates held in the UnderlandEX database, as measured on 20/11/2026 by a
// read-only query of mining.resource_estimates_csv (the Western Australian MINEDEX register,
// extract of 15/09/2025). One estimate = one site and one estimate date with at least one
// Measured, Indicated or Inferred line; ore reserve lines (Proven, Probable) are not counted.
// The register's 70,515 rows are lines of these estimates (one per commodity, category and date),
// so they are not used as a count of estimates. The site does not name the jurisdiction (owner,
// 20/11/2026: coverage is expanding to all of Australia and Canada). Re-measure when the database changes.
export const resourceEstimates = {
  count: 13986,
  sites: 4715,
  jurisdiction: 'Western Australia',
  source: 'MINEDEX (Western Australian Department of Mines, Petroleum and Exploration), extract 15/09/2025',
  measured: '20/11/2026',
};
