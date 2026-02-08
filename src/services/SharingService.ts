import { AppError } from "../middleware/errorHandler";
import { EventService } from "./EventService";
import { ShareMeta } from "../types";
import { config } from "../config/env";

export class SharingService {
  /**
   * Generates a shareable URL and Open Graph metadata for an event.
   *
   * The returned `shareUrl` is the canonical public URL that can be pasted
   * into any social platform.  The `ogMeta` object contains the fields that
   * social crawlers use to generate link previews.
   *
   * In a production setup you would also:
   *   - Generate a short URL via a URL-shortening service
   *   - Serve an HTML page at the shareUrl that includes <meta og:...> tags
   *     so crawlers can read them
   */
  static async getShareMeta(eventId: string): Promise<ShareMeta> {
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);

    const shareUrl = `${config.APP_BASE_URL}/events/${event.id}`;

    // Format the event date nicely for the description
    const formattedDate = event.date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const description =
      `Join us for "${event.title}" on ${formattedDate} at ${event.venue}. ` +
      `${event.description} Tickets available now!`;

    return {
      shareUrl,
      ogMeta: {
        title: `${event.title} — Eventful`,
        description,
        url: shareUrl,
        type: "event",
      },
    };
  }
}