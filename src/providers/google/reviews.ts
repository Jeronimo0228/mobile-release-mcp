import type { GooglePlayClient } from "./client.js";

export async function listReviews(
  client: GooglePlayClient,
  packageName: string,
  options?: {
    translationLanguage?: string;
    maxResults?: number;
    startIndex?: number;
    token?: string;
  },
) {
  const res = await client.api.reviews.list({
    packageName,
    translationLanguage: options?.translationLanguage,
    maxResults: options?.maxResults,
    startIndex: options?.startIndex,
    token: options?.token,
  });
  return res.data;
}

export async function getReview(
  client: GooglePlayClient,
  packageName: string,
  reviewId: string,
  translationLanguage?: string,
) {
  const res = await client.api.reviews.get({
    packageName,
    reviewId,
    translationLanguage,
  });
  return res.data;
}

export async function replyToReview(
  client: GooglePlayClient,
  packageName: string,
  reviewId: string,
  replyText: string,
) {
  const res = await client.api.reviews.reply({
    packageName,
    reviewId,
    requestBody: {
      replyText,
    },
  });
  return res.data;
}
