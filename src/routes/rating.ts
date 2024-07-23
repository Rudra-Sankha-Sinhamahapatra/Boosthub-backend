import express from "express"
import zod from "zod"
import prisma from "../prisma"
import { authMiddleware } from "../middleware"

export const ratingRouter=express.Router();

ratingRouter.get("/ratings",authMiddleware,async(req,res)=>{
  
    try{
    const ratings=await prisma.rating.findMany({
        select:{
            id:true,
            userId:true,
            courseId:true,
            rating:true,
            createdAt:true,
            updatedAt:true,
            course:{
                select:{
                    title:true,
                    description:true,
                    content:true,
                    teacherId:true,
                    teacher:{
                        select:{
                            name:true,
                            role:true
                        }
                    }
                }
            }
        }
    });

    if(!ratings || ratings.length===0){
        return res.status(404).json({
            message:"No Ratings found"
        })
    }

    ratings.map(rating=>{
        return res.status(200).json({
         id:rating.id,
         userId:rating.userId,
         courseId:rating.courseId,
         rating:rating.rating,
         createdAt:{
            date: rating.createdAt.toLocaleDateString(),
            time:rating.createdAt.toLocaleTimeString()
         },
         updatedAt:{
            date:rating.updatedAt.toLocaleDateString(),
            time:rating.updatedAt.toLocaleTimeString()
         },
         course:{
            title:rating.course.title,
            description:rating.course.description,
            content:rating.course.content,
            teacherId:rating.course.teacherId,
            teacher:{
                name:rating.course.teacher.name,
                role:rating.course.teacher.role
            }
         }
        })
    })
}

catch(error){
    return res.status(500).json({
        message:"Internal Server Error",
        error:error
    })
}
})

const creationSchema=zod.object({
    courseId:zod.number().min(1),
    rating:zod.number().min(1,"Rating should be minimum 1").max(5,"Rating should be maximum 5")
})

ratingRouter.post("/create",authMiddleware,async(req:any,res)=>{

    const success=creationSchema.safeParse(req.body);

    if(!success){
     return res.status(401).json({
        message:"Incorrect Inputs"
     })
    }

    try {
        const rating=parseInt(req.body.rating);
        const courseId=parseInt(req.body.courseId);
        const userId=parseInt(req.user.id);

        const courseExist=await prisma.course.findUnique({
            where:{
                id:courseId
            }
        });

        if(!courseExist){
            return res.status(404).json({
                message:"This course dosen't exists"
            })
        }

        const ratingExist = await prisma.rating.findUnique({
            where: {
                userId_courseId: {
                    userId: userId,
                    courseId: courseId
                },
            }
        });

        if(ratingExist){
             let updatedRating=await prisma.rating.update({
                where:{
                    userId_courseId:{
                        userId:userId,
                        courseId:courseId
                    }
                },
                data:{
                    rating,
                    updatedAt:new Date()
                },
                select:{
                    id:true,
                    createdAt:true,
                    updatedAt:true,
                    userId:true,
                    courseId:true,
                    course:{
                        select:{
                            title:true,
                            description:true,
                            content:true,
                            teacher:{
                                select:{
                                    name:true,
                                    role:true
                                }
                            },
                            teacherId:true
                        }
                    }
                  }
             });

             return res.status(200).json({
                message:"Rating updated Successfully",
                id:updatedRating.id,
                userId:updatedRating.userId,
                courseId:updatedRating.courseId,
                updatedRating:rating,
                updatedAt:{
                    date:updatedRating.updatedAt.toLocaleDateString(),
                    time:updatedRating.updatedAt.toLocaleTimeString()
                },
                createdAt:{
                    date:updatedRating.createdAt.toLocaleDateString(),
                    time:updatedRating.createdAt.toLocaleTimeString()
                },
                course:{
                    title:updatedRating.course.title,
                    description:updatedRating.course.description,
                    content:updatedRating.course.content,
                    teacherId:updatedRating.course.teacherId,
                    teacher:{
                    name:updatedRating.course.teacher.name,
                    role:updatedRating.course.teacher.role
                    }
                }
             })
        }

        else{
        const createRating=await prisma.rating.create({
          data:{
            userId,
            courseId,
            rating,
            createdAt:new Date(),
            updatedAt:new Date()
          },
          select:{
            id:true,
            createdAt:true,
            updatedAt:true,
            course:{
                select:{
                    title:true,
                    description:true,
                    content:true,
                    teacher:{
                        select:{
                            name:true,
                            role:true
                        }
                    },
                    teacherId:true
                }
            }
          }
        })

        return res.status(200).json({
            message:"Rated Successfully",
            id:createRating.id,
            userId:userId,
            courseId:courseId,
            rating:rating,
            createdAt:{
                date:createRating.createdAt.toLocaleDateString(),
                time:createRating.createdAt.toLocaleTimeString()
            },
            updatedAt:{
                date:createRating.updatedAt.toLocaleDateString(),
                time:createRating.updatedAt.toLocaleTimeString()
            },
            course:{
                title:createRating.course.title,
                description:createRating.course.description,
                content:createRating.course.content,
                teacherId:createRating.course.teacherId,
                teacher:{
                name:createRating.course.teacher.name,
                role:createRating.course.teacher.role
                }
            }
        })
    }
        
    } catch (error) {
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
})

const deleteSchema=zod.object({
    courseId:zod.number().min(1)
})

ratingRouter.get("/:id/ratings", authMiddleware, async (req, res) => {
    const courseId = parseInt(req.params.id);

    try {
        const ratings = await prisma.rating.findMany({
            where: { courseId: courseId },
            select: {
                id: true,
                userId: true,
                rating: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return res.status(200).json(ratings);
    } catch (error) {
        console.error(error); 
        return res.status(500).json({ message: "Internal Server Error", error });
    }
});

ratingRouter.delete("/delete",authMiddleware,async(req:any,res)=>{

    const success=deleteSchema.safeParse(req.body);

    if(!success){
        return res.status(403).json({
            message:'Incorrect Inputs'
        })
    }

    try {
        const courseId=req.body.courseId;
        const userId=req.user.id;


const courseExists=await prisma.course.findUnique({
    where:{
        id:Number(courseId)
    }
})

if(!courseExists){
    return res.status(404).json({
        message:"This course dosen't exists"
    })
}

        const ratingExists=await prisma.rating.findUnique({
            where:{
               userId_courseId:{
                userId:userId,
                courseId:courseId
               }
            }
        })

       if(!ratingExists){
        return res.status(404).json({
            message:"This rating dosen't exists"
        })
       }

       if(ratingExists.userId!==userId){
        return res.status(401).json({
            message:"You can't delete other's ratings"
        })
       }

        const deletedRating=await prisma.rating.delete({
            where:{id:Number(ratingExists.id)}
        })

        return res.status(200).json({
            message:"Rating deleted successfully",
            id:deletedRating.id,
            userId:deletedRating.userId,
            courseId:deletedRating.courseId
        })

    } catch (error) {
        return res.status(500).json({
            message:"Internal Server Error",
            error:error
        })
    }
})