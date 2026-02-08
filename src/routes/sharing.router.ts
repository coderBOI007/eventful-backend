import { Router } from "express";
import { SharingController } from "../controllers/SharingController";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /events/{eventId}/share:
 *   get:
 *     summary: Get shareable metadata and URL for an event
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: |
 *           Returns shareUrl and OG metadata.
 *           The client should render share buttons using shareUrl.
 *           For native sharing, pass shareUrl to the Web Share API.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shareUrl:
 *                   type: string
 *                 ogMeta:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *       404:
 *         description: Event not found
 */
router.get("/events/:eventId/share", authMiddleware, asyncHandler(SharingController.getShareMeta));

export default router;