import express from "express";
import { authMiddleware } from "../middleware";
import prisma from "../prisma";
import zod from "zod";

export const likesRouter = express.Router();

likesRouter.get("/likes", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const likes = await prisma.like.findMany({
      select: {
        id: true,
        userId: true,
        courseId: true,
        createdAt: true,
        liked: true,
        user: {
          select: {
            name: true,
            role: true,
          },
        },
        course: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    if (!likes || likes.length === 0) {
      return res.status(404).json({
        message: "No likes found",
      });
    }

    return res.status(200).json({
      likes: likes.map((like) => ({
        id: like.id,
        userId: like.userId,
        courseId: like.courseId,
        createdAt: {
          date: like.createdAt.toLocaleDateString(),
          time: like.createdAt.toLocaleTimeString(),
        },
        liked: like.liked,
        user: {
          name: like.user.name,
          role: like.user.role,
        },
        course: {
          title: like.course.title,
          description: like.course.description,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

const createSchema = zod.object({
  courseId: zod.number().min(1),
  liked: zod.boolean(),
});

likesRouter.post("/create", authMiddleware, async (req: any, res) => {
  const success = await createSchema.safeParse(req.body);

  if (!success) {
    return res.status(401).json({
      message: "Incorrect Inputs",
    });
  }

  try {
    const courseId = req.body.courseId;
    const liked = req.body.liked;
    const userId = req.user.id;

    const Exist = await prisma.course.findUnique({
      where: {
        id: Number(courseId),
      },
    });

    if (!Exist) {
      return res.status(404).json({
        message: "Course dosen't exist,You can't like it",
      });
    }

    const likeExist = await prisma.like.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId,
        },
      },
    });

    if (likeExist) {
      if (likeExist.liked === liked) {
        return res.status(411).json({
          message: `You can't ${liked ? "like" : "unlike"}  a course twice`,
        });
      }
      if (!liked) {
        await prisma.like.delete({
          where: {
            id: likeExist.id,
          },
        });

        return res.status(200).json({
          message: "Unliked Successfully",
          userId: userId,
          courseId: courseId,
          liked: liked,
          createdAt: {
            date: likeExist.createdAt.toLocaleDateString(),
            time: likeExist.createdAt.toLocaleTimeString(),
          },
        });
      }

      const updateLike = await prisma.like.update({
        where: {
          id: likeExist.id,
        },
        data: {
          liked: liked,
        },
        select: {
          createdAt: true,
        },
      });

      return res.status(200).json({
        message: liked ? "Liked Successfully" : "Unliked Sucessfully",
        userId: userId,
        liked: liked,
        courseId: courseId,
        createdAt: {
          date: updateLike.createdAt.toLocaleDateString(),
          time: updateLike.createdAt.toLocaleTimeString(),
        },
      });
    } else {
      if (!liked) {
        return res.status(400).json({
          message: "You can't unlike a course which you haven't liked",
        });
      }
      const createLike = await prisma.like.create({
        data: {
          userId,
          liked,
          courseId,
        },
        select: {
          createdAt: true,
        },
      });

      return res.status(200).json({
        message: "Liked Successfully",
        userId: userId,
        liked: liked,
        courseId: courseId,
        createdAt: {
          date: createLike.createdAt.toLocaleDateString(),
          time: createLike.createdAt.toLocaleTimeString(),
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});
