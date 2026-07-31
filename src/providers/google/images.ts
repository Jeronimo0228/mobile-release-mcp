import { createReadStream } from "node:fs";
import type { GooglePlayClient } from "./client.js";

export type ImageType =
  | "featureGraphic"
  | "icon"
  | "phoneScreenshots"
  | "sevenInchScreenshots"
  | "tenInchScreenshots"
  | "tvBanner"
  | "tvScreenshots"
  | "wearScreenshots";

export async function uploadImage(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  language: string,
  imageType: ImageType,
  imagePath: string,
) {
  const res = await client.api.edits.images.upload({
    packageName,
    editId,
    language,
    imageType,
    media: {
      mimeType: "image/png",
      body: createReadStream(imagePath),
    },
  });
  return res.data;
}

export async function listImages(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  language: string,
  imageType: ImageType,
) {
  const res = await client.api.edits.images.list({
    packageName,
    editId,
    language,
    imageType,
  });
  return res.data.images || [];
}

export async function deleteImage(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  language: string,
  imageType: ImageType,
  imageId: string,
) {
  await client.api.edits.images.delete({
    packageName,
    editId,
    language,
    imageType,
    imageId,
  });
}

export async function deleteAllImages(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  language: string,
  imageType: ImageType,
) {
  await client.api.edits.images.deleteall({
    packageName,
    editId,
    language,
    imageType,
  });
}
