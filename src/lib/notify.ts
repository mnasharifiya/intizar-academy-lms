import { createNotification } from "./api";

export async function notifyUsers(
  userIds: string[],
  type: string,
  title: string,
  body: string
) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

  for (const userId of uniqueIds) {
    await createNotification({
      userId,
      type: type as any,
      title,
      body,
    });
  }
}
