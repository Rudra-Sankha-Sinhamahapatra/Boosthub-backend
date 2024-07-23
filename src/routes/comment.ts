import express from "express";
import { authMiddleware } from "../middleware";
import prisma from "../prisma";
import zod from "zod";

export const commentRouter = express.Router();

commentRouter.get("/comments", authMiddleware, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      select: {
        userId: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
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

    if (!comments || comments.length === 0) {
      return res.status(404).json({
        message: "No comments found",
      });
    }

    return res.status(200).json({
      comments: comments.map((comment) => ({
        userId: comment.userId,
        courseId: comment.courseId,
        createdAt: {
          date: comment.createdAt.toLocaleDateString(),
          time: comment.createdAt.toLocaleTimeString(),
        },
        updatedAt: {
          date: comment.updatedAt.toLocaleDateString(),
          time: comment.updatedAt.toLocaleTimeString(),
        },
        user: {
          name: comment.user.name,
          role: comment.user.role,
        },
        course: {
          title: comment.course.title,
          description: comment.course.description,
        },
      })),

    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

const createSchema=zod.object({
    courseId:zod.number().min(1),
    comment:zod.string().min(1)
})

commentRouter.post("/create",authMiddleware,async(req:any,res)=>{

    const success=createSchema.safeParse(req.body);
    if(!success){
        return res.status(403).json({
            message:"Incorrect Inputs"
        })
    }

    const courseId=req.body.courseId;
    const userId=req.user.id;
    const comment=req.body.comment;

    try {
        const newComment=await prisma.comment.create({
            select:{
           id:true,
           courseId:true,
           comment:true,
           userId:true,
           createdAt:true,
           updatedAt:true
            },
            data:{
                courseId:courseId,
                comment:comment,
                userId:userId,
            }
        });

        return res.status(200).json({
            message:"Comment created  Successfully",
            courseId:newComment.courseId,
            id:newComment.id,
            userId:newComment.userId,
            comment:newComment.comment,
            createdAt:{
            date:newComment.createdAt.toLocaleDateString(),
            time:newComment.createdAt.toLocaleTimeString()
            },
            updatedAt:{
                date:newComment.updatedAt.toLocaleDateString(),
                time:newComment.updatedAt.toLocaleTimeString()
            }
        })
        
    } catch (error) {
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
});

const updateSchema=zod.object({
    comment:zod.string().min(1,"Minimum one letter required"),
})

commentRouter.put("/:id/update",authMiddleware,async(req:any,res)=>{

    const success=updateSchema.safeParse(req.body);

    if(!success){
        return res.status(403).json({
            message:"Incorrect Inputs"
        })
    }

    const commentId=parseInt(req.params.id);
    const Updatedcomment=req.body.comment;
    const userId=req.user.id;

    try {
        const comment=await prisma.comment.findUnique({
            where:{id:Number(commentId)},
        });

        if(!comment){
            return res.status(404).json({
                message:"This comment dosent exists"
            })
        }

        if(comment.userId!==userId){
            return res.status(403).json({
                message:"User unauthorized"
            })
        }

        const updatedComment=await prisma.comment.update({
            where:{
                id:Number(commentId),
            },
            data:{
                comment:Updatedcomment
            }
        });

        return res.status(200).json({
            message:"Comment updated Successfully",
            updatedComment:updatedComment
        })

    } catch (error) {
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
})

commentRouter.get("/:id/comments",authMiddleware,async(req:any,res)=>{
    const courseId=parseInt(req.params.id);

    try{

        const courseExists=await prisma.course.findUnique({
            where:{
                id:courseId
            }
        })

  if(!courseExists){
    return res.status(404).json({
        message:"This course dosen't exists"
    })
  }

    const comments=await prisma.comment.findMany({
        where:{
            courseId:courseId
        },
        include:{
            user:{
                select:{
                    name:true,
                    role:true
                },
            },
        },
        orderBy:{
            createdAt:'asc'
        }
    });
return res.status(200).json({
    comments:comments
})
}
catch(error){
    res.status(500).json({
        message:"Internal Server Error",
        error:error
    })
}
})

commentRouter.delete("/:id/delete",authMiddleware,async(req,res)=>{
    const commentId=parseInt(req.params.id);

    try {
        const comment=await prisma.comment.findUnique({
            where:{
                id:Number(commentId)
            }
        });

        if(!comment){
            return res.status(404).json({
                message:"Comment not found"
            })
        }

        const deletedComment=await prisma.comment.delete({
            where:{
                id:Number(commentId)
            }
        });

        return res.status(200).json({
            message:"Comment deleted Successfully",
            deletedComment:deletedComment
        })
    } catch (error) {
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
})
