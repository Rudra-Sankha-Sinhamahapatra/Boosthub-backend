import express from 'express'
import { authMiddleware } from '../middleware'
import prisma from '../prisma'
import zod from 'zod'


export const feedbackRouter=express.Router();

feedbackRouter.get('/feedbacks',authMiddleware,async(req:any,res:any)=>{
    try{
    const userId=req.user.id;

    const feedbacks=await prisma.feedback.findMany({
        select:{
            userId:true,
            courseId:true,
            comment:true,
            createdAt:true,
            updatedAt:true,
            user:{
                select:{
                    name:true,
                    role:true
                },
            },
            course:{
                select:{
                    title:true,
                    description:true
                }
            }
        }

    })

    
    if(!feedbacks  || feedbacks.length===0){
        return res.status(404).json({
            message:"No feedbacks found"
        })
    }

    return res.staus(200).json({
        feedbacks:feedbacks.map(feeback=>({
        userId:feeback.userId,
        courseId:feeback.courseId,
        comment:feeback.comment,
        createdAt:{
            date:feeback.createdAt.toLocaleDateString(),
            time:feeback.createdAt.toLocaleTimeString()
        },
        updatedAt:{
            date:feeback.updatedAt.toLocaleDateString(),
            time:feeback.updatedAt.toLocaleTimeString()
        },
        user:{
            name:feeback.user.name,
            role:feeback.user.role
        },
        course:{
            title:feeback.course.title,
            description:feeback.course.description
        }
        })),
    });

    }
    catch(error){
   res.status(500).json({
    message:"Interval Server Error",
    error:error
   })
    }
})

feedbackRouter.get('/:id/feedbacks',authMiddleware,async(req:any,res:any)=>{
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

    const feedbacks=await prisma.feedback.findMany({
      where:{
        courseId:courseId
      },
      include :{
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
    })

    return res.status(200).json({
    feedbacks:feedbacks
    });

    }
    catch(error){
   res.status(500).json({
    message:"Interval Server Error",
    error:error
   })
    }
})

const createSchema=zod.object({
    courseId:zod.number().min(1),
    comment:zod.string().min(1)
})

feedbackRouter.post('/create',authMiddleware,async(req:any,res)=>{
const success=createSchema.safeParse(req.body);
if(!success){
    return res.status(401).json({
        message:"Incorrect Inputs"
    })
}
const courseId=req.body.courseId;
const comment=req.body.comment;
const userId=req.user.id;


try {
    const newFeedback=await prisma.feedback.create({
     data:{
        courseId:courseId,
        comment:comment,
        userId:userId
     }
    });

    return res.status(200).json({
        message:"feedback created sucessfully",
        feedback:newFeedback
    })
} catch (error) {
    return res.status(500).json({
        message:"Internal server error"
    })
}
})

const updateSchema=zod.object({
    comment:zod.string().min(1,"Minimum one letter needed")
})

feedbackRouter.put("/:id/update",authMiddleware,async(req:any,res:any)=>{

 const success=updateSchema.safeParse(req.body);
 if(!success){
    return res.status(401).json({
        message:"Incorrect Inputs"
    });
 }

 const feedbackId=parseInt(req.params.id);
 const comment=req.body.comment;
 const userId=req.user.id;

try {

    const feedback=await prisma.feedback.findUnique({
        where:{id:Number(feedbackId)},
    })

    if(!feedback){
        return res.status(404).json({
            message:"No feedbacks found!"
        })
    }

    if(feedback.userId!==userId){
        return res.status(411).json({
            message:"You are not authorized to update it"
        })
    }

    const updatedFeedback=await prisma.feedback.update({
        where:{
        id:Number(feedbackId)
        },
        data:{
            comment:comment,
        }
    })

    return res.status(200).json({
        message:"Feedback updated successfully",
       updatedFeedback:updatedFeedback
    })
} catch (error) {
    return res.status(500).json({
        message:"Internal server error",
        error:error
    })
}
})

feedbackRouter.delete("/:id/delete",authMiddleware,async(req:any,res)=>{
    const feedbackId=parseInt(req.params.id);
    const userId=req.user.id;

    try {
        const feedback=await prisma.feedback.findUnique({
            where:{id:Number(feedbackId)},
        });


        if(!feedback){
            return res.status(404).json({
                message:"No feedback found"
            })
        }

        if(feedback.userId!==userId){
            return res.status(411).json({
                message:"You are not authorized to delete the feedback"
            })
        }

        const deletedFeedback=await prisma.feedback.delete({
            where:{
                id:feedbackId,
            }
        })

        return res.status(200).json({
            message:"Feedback deleted successfully",
            deletedFeedback:deletedFeedback
        })

    }  catch(error){
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
})
