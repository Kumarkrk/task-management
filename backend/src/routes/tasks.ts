// src/routes/tasks.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

import { authMiddleware } from "../middleware/auth";
const router = Router();
router.use(authMiddleware);




// apply auth middleware to all routes here
router.use(authMiddleware);

// GET /tasks?search=&status=&page=&limit=
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { search = "", status, page = "1", limit = "10" } =
      req.query as Record<string, string>;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userId,
      title: {
        contains: search,  // FIXED
      },
    };

    if (status === "completed") where.completed = true;
    if (status === "pending") where.completed = false;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.task.count({ where }),
    ]);

    return res.json({
      data: tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("TASK GET ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// POST /tasks
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { title } = req.body as { title?: string };

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        userId,
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /tasks/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    const task = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /tasks/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);
    const { title, completed } = req.body as {
      title?: string;
      completed?: boolean;
    };

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        completed: typeof completed === "boolean" ? completed : existing.completed,
      },
    });

    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /tasks/:id/toggle
router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { completed: !existing.completed },
    });

    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /tasks/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    await prisma.task.delete({ where: { id } });

    return res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
