// The company runs on India time (no daylight saving) whatever the server clock is set to
export const istNow = () => new Date(Date.now() + 5.5 * 3600000).toISOString().replace('T', ' ').slice(0, 19);
