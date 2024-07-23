import express from 'express';
import { authMiddleware } from '../middleware';
import prisma from '../prisma'; 
import zod from 'zod'


export const courseRouter = express.Router();


const creationBody = zod.object({
    title: zod.string().min(3),
    description: zod.string().min(3),
    content:zod.string().min(3)
  });

courseRouter.post('/create', authMiddleware, async (req:any,res:any) => {

    const { success } = creationBody.safeParse(req.body);

    if (!success) {
      return res.status(401).json({
        message: "Incorrect Inputs",
      });
    }
  

  const title=req.body.title;
  const description=req.body.description;
  const content=req.body.content;

  const teacherId = req.user.id; 

  try {
    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        content,
        teacherId,
      },
    });

    res.status(200).json({
        title:newCourse.title,
        description:newCourse.description,
        content:newCourse.content,
        teacherId:teacherId
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error,creation failed', error });
  }
});

courseRouter.get('/courses',authMiddleware,async(req:any,res:any)=>{
  try {
    const userId=req.user.id;

    const courses=await prisma.course.findMany({
      select:{
        id:true,
        title:true,
        description:true,
        content:true,
        teacher:{
        select:{
          name:true,
          role:true
        }
        },
        createdAt:true,
        updatedAt:true,
        feedbacks:{
          select:{
            comment:true,
          }
        },
        likes:{
          select:{
            liked:true,
            userId:true
          }
        },
        comments:{
          select:{
            user:{
              select:{
                name:true,
              },
              },
              createdAt:true,
              updatedAt:true
          }
        },
        ratings:{
          select:{
            rating:true
          }
        }
      }
    });

    const formatedCourses=courses.map(course=>{
      const totalLikes=course.likes.length;
      const totalRatings=course.ratings.length;
      const averageRating=totalRatings>0?
      course.ratings.reduce((sum,r)=>sum+(r.rating||0),0)/totalRatings:0;

      const userHasLiked=course.likes.some(like=>like.userId===userId)

      return{
        id:course.id,
        title:course.title,
        description:course.description,
        content:course.content,
        teacher:{
          name:course.teacher.name,
          role:course.teacher.role,
        },
        createdAt:{
          date:course.createdAt.toLocaleDateString(),
          time:course.createdAt.toLocaleTimeString()
        },
        updatedAt:{
          date:course.updatedAt.toLocaleDateString(),
          time:course.updatedAt.toLocaleTimeString()
        },
        likes:{
          total:totalLikes,
          liked:userHasLiked
        },
        comments:course.comments.map(comment=>({
          name:comment.user.name,
          createdAt:{
            date:comment.createdAt.toLocaleDateString(),
            time:comment.createdAt.toLocaleTimeString()
          },
          updatedAt:{
            date:comment.updatedAt.toLocaleDateString(),
            time:comment.updatedAt.toLocaleTimeString()
          }
        })),
        ratings:{
          total:totalRatings,
          average:averageRating,
        }
      };
    });

    return res.status(200).json({
     courses:formatedCourses,
    })
  } catch (error) {
    return res.status(500).json({
      message:"Internal Server Error",
      error:error
    })
  }
})


courseRouter.get('/:id',authMiddleware,async(req:any,res)=>{
  const {id}=req.params;
 const userId=req.user.id;

  try {
    const course=await prisma.course.findUnique({
      where:{id:Number(id)},
      select:{
        id:true,
        title:true,
        description:true,
        content:true,
        createdAt:true,
        updatedAt:true,
        teacher:true,
        teacherId:true,
        likes:{
          select:{
            userId:true
          }
        },
        comments:{
          select:{
            comment:true,
            createdAt:true,
            user:{
              select:{
                name:true,
              }
            }
          }
        },
        feedbacks:{
          select:{
            comment:true,
            createdAt:true,
            user:{
              select:{
                name:true
              }
            }
          }
        },
        ratings:{
          select:{
            rating:true
        }
      },
    }
  });

    if(!course){
      return res.status(404).json({
        message:"Course not found"
      })
    }

    const totalLikes = course.likes.length;
    const totalRatings = course.ratings.length;
    const totalComments=course.comments.length;
    const totalFeedbacks=course.feedbacks.length;
    const averageRating = totalRatings > 0
      ? course.ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
      : 0;
      const userHasLiked = course.likes.some(like => like.userId === userId);

    return res.status(200).json({
      id:id,
      title:course.title,
      description:course.description,
      content:course.content,
      createdAt:{
        date:course.createdAt.toLocaleDateString(),
        time:course.createdAt.toLocaleTimeString()
      },
      updatedAt:{
        date:course.updatedAt.toLocaleDateString(),
        time:course.updatedAt.toLocaleTimeString()
      },
      teacher:{
        id:course.teacherId,
        name:course.teacher.name,
        role:course.teacher.role
      },
      totalLikes:totalLikes.toString(),
      totalRatings:totalRatings.toString(),
      averageRating:averageRating.toFixed(2).toString(),
      totalComments:totalComments.toString(),
      totalFeedbacks:totalFeedbacks.toString(),
      liked:userHasLiked,
      comments:course.comments

    });
  } catch (error) {
    return res.status(500).json({
      message:"Internal Server Error,or course dosen't exist",
      error:error
    })
  }
})

courseRouter.put("/:id/update",authMiddleware,async(req:any,res)=>{
    const {id}=req.params;

    const updateCourseSchema=zod.object({
      title:zod.string().min(1).optional(),
      description:zod.string().min(3).optional(),
      content:zod.string().min(3).optional()
    })

    try {
      const success=updateCourseSchema.safeParse(req.body);

      if(!success){
        return res.status(400).json({
          message:"Incorrect Inputs"
        })
      }

      const course=await prisma.course.findUnique({
        where:{
          id:Number(id)
        },
        select:{
          teacherId:true
        }
      })

      if(!course){
        return res.status(404).json({
          message:"This course dosen't exists"
        })
      }

      if(course.teacherId!==req.user.id){
        return res.status(403).json({
          message:"You dont have permission to update the course"
        })
      }
      
      const title=req.body.title;
      const description=req.body.description;
      const content=req.body.content;


      const updateData:any={};

      if(title)updateData.title=title;
      if(description)updateData.description=description;
      if(content)updateData.content=content;

      const updatedCourse=await prisma.course.update({
        where:{id:Number(id)},
        data:updateData
      })

      return res.status(200).json({
        message:"Course Updated Successfully",
        id:id,
       title:updatedCourse.title,
       description:updatedCourse.description,
       content:updatedCourse.content
      })
    } catch (error) {
      return res.status(500).json({
        message:"Internal Server Error",
        error:error
      })
    }
})

courseRouter.post("/:id/delete",authMiddleware,async(req:any,res)=>{
  const {id}=req.params;
  try{
const course=await prisma.course.findUnique({
  where:{
    id:Number(id)
  },
  select:{
    teacherId:true
  }
});

if(!course){
  return res.status(404).json({
    message:"Course dosen't exists"
  })
}

if(course.teacherId!==req.user.id){
return res.status(401).json({
  message:"You dont have permission to delete the course"
})
}

await prisma.course.delete({
  where:{
    id:Number(id),
  },
});
return res.status(200).json({
  message:"Successfully deleted the course"
})
  }
  catch(error){
    return res.status(500).json({
      message:"Internal Server Error",
      error:error
    })
  }

})
