import type { AppleClient } from "./client.js";

export async function listDevices(
  client: AppleClient,
  filters?: {
    platform?: string;
    status?: string;
    name?: string;
    udid?: string;
  },
) {
  const params: Record<string, string> = {
    "fields[devices]": "name,udid,platform,status,deviceClass,model,addedDate",
    sort: "-addedDate",
  };
  if (filters?.platform) params["filter[platform]"] = filters.platform;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.udid) params["filter[udid]"] = filters.udid;

  return client.get("/v1/devices", params);
}

export async function getDevice(client: AppleClient, deviceId: string) {
  return client.get(`/v1/devices/${deviceId}`, {
    "fields[devices]": "name,udid,platform,status,deviceClass,model,addedDate",
  });
}

export async function registerDevice(
  client: AppleClient,
  name: string,
  udid: string,
  platform: "IOS" | "MAC_OS",
) {
  return client.post("/v1/devices", {
    data: {
      type: "devices",
      attributes: { name, udid, platform },
    },
  });
}

export async function updateDeviceName(
  client: AppleClient,
  deviceId: string,
  name: string,
) {
  return client.patch(`/v1/devices/${deviceId}`, {
    data: {
      type: "devices",
      id: deviceId,
      attributes: { name },
    },
  });
}

export async function updateDeviceStatus(
  client: AppleClient,
  deviceId: string,
  status: "ENABLED" | "DISABLED",
) {
  return client.patch(`/v1/devices/${deviceId}`, {
    data: {
      type: "devices",
      id: deviceId,
      attributes: { status },
    },
  });
}
