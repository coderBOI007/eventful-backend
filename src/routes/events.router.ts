import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { authMiddleware } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, date, venue, ticketPrice, capacity]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               venue:
 *                 type: string
 *               ticketPrice:
 *                 type: number
 *               capacity:
 *                 type: integer
 *               reminders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     unit:
 *                       type: string
 *                       enum: [hour, day, week]
 *                     value:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Event created
 *       403:
 *         description: Only creators can create events
 */
router.post("/", authMiddleware, roleGuard("creator"), asyncHandler(EventController.create));

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List events (own events for creators, published events for eventees)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Array of events
 */
router.get("/", authMiddleware, asyncHandler(EventController.list));

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get a single event by ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get("/:id", authMiddleware, asyncHandler(EventController.getOne));

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update an event (creator only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event updated
 *       403:
 *         description: Not your event
 */
router.put("/:id", authMiddleware, roleGuard("creator"), asyncHandler(EventController.update));

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Cancel an event (creator only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event cancelled
 *       403:
 *         description: Not your event
 */
router.delete("/:id", authMiddleware, roleGuard("creator"), asyncHandler(EventController.cancel));

export default router;