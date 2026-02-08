import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Eventful API",
      version: "1.0.0",
      description:
        "Eventful — Your passport to unforgettable moments. A full-featured event ticketing platform with authentication, QR verification, Paystack payments, notifications, analytics, and social sharing.",
      contact: {
        name: "Eventful Dev Team",
      },
    },
    servers: [
      {
        url: `${config.APP_BASE_URL}/v1`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["creator", "eventee"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            creatorId: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            date: { type: "string", format: "date-time" },
            venue: { type: "string" },
            ticketPrice: { type: "number" },
            capacity: { type: "integer" },
            status: { type: "string", enum: ["draft", "published", "cancelled"] },
          },
        },
        Ticket: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            eventId: { type: "string", format: "uuid" },
            eventeeId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["pending", "paid", "scanned", "cancelled"] },
            qrToken: { type: "string" },
            purchasedAt: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            ticketId: { type: "string", format: "uuid" },
            paystackRef: { type: "string" },
            amount: { type: "number" },
            status: { type: "string", enum: ["pending", "success", "failed"] },
            paidAt: { type: "string", format: "date-time" },
          },
        },
        Reminder: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            unit: { type: "string", enum: ["hour", "day", "week"] },
            value: { type: "integer" },
            remindAt: { type: "string", format: "date-time" },
            sent: { type: "boolean" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);