import type { AppleClient } from "./client.js";

export async function requestAnalyticsReport(
  client: AppleClient,
  appId: string,
  reportType: string,
) {
  return client.post("/v1/analyticsReportRequests", {
    data: {
      type: "analyticsReportRequests",
      attributes: {
        accessType: "ONGOING",
      },
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  });
}

export async function listAnalyticsReportRequests(
  client: AppleClient,
  appId: string,
) {
  return client.get(`/v1/apps/${appId}/analyticsReportRequests`, {
    "fields[analyticsReportRequests]": "accessType,stoppedDueToInactivity",
  });
}

export async function getAnalyticsReports(
  client: AppleClient,
  reportRequestId: string,
  category?: string,
) {
  const params: Record<string, string> = {
    "fields[analyticsReports]": "category,name",
  };
  if (category) params["filter[category]"] = category;

  return client.get(
    `/v1/analyticsReportRequests/${reportRequestId}/reports`,
    params,
  );
}

export async function getAnalyticsReportInstances(
  client: AppleClient,
  reportId: string,
) {
  return client.get(`/v1/analyticsReports/${reportId}/instances`, {
    "fields[analyticsReportInstances]": "granularity,processingDate",
  });
}

export async function getAnalyticsReportSegments(
  client: AppleClient,
  instanceId: string,
) {
  return client.get(
    `/v1/analyticsReportInstances/${instanceId}/segments`,
    {
      "fields[analyticsReportSegments]": "checksum,sizeInBytes,url",
    },
  );
}
