import type { GooglePlayClient } from "./client.js";

export async function getTesters(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  track: string,
) {
  const res = await client.api.edits.testers.get({
    packageName,
    editId,
    track,
  });
  return res.data;
}

export async function updateTesters(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  track: string,
  googleGroups?: string[],
) {
  const res = await client.api.edits.testers.update({
    packageName,
    editId,
    track,
    requestBody: {
      googleGroups,
    },
  });
  return res.data;
}

export async function getCountryAvailability(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  track: string,
) {
  const res = await client.api.edits.countryavailability.get({
    packageName,
    editId,
    track,
  });
  return res.data;
}
