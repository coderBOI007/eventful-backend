// Reminder job disabled (no Redis/Bull for now)
// This would normally poll for pending reminders and send emails

export function startReminderPoller(): void {
  console.log("[Reminder Poller] Disabled (no Redis configured)");
  
  // In production with Redis, this would:
  // - Poll every 30 seconds
  // - Check for reminders where remindAt <= now
  // - Send emails via Nodemailer
  // - Mark reminders as sent
}

export const reminderQueue = null;
