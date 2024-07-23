import express from 'express'
import cors from 'cors'
import { Userapp } from './routes/user';
import { FRONTEND_URL } from './conf';
import { courseRouter } from './routes/course';
import cookieParser from 'cookie-parser';
import { feedbackRouter } from './routes/feedback';
import { commentRouter } from './routes/comment';
import { likesRouter } from './routes/like';
import { ratingRouter } from './routes/rating';

const PORT=3001;
const app=express();
app.use(express.json());
app.use(cookieParser());
app.options('*', cors({
    origin: FRONTEND_URL,
    credentials: true
}));

console.log(`${FRONTEND_URL}`);

app.get('/',(req,res)=>{
    return res.status(200).json({
        msg:"Hello World"
    })
})

app.use('/bh/v1/user',Userapp);
app.use('/bh/v1/course',courseRouter);
app.use('/bh/v1/feedback',feedbackRouter);
app.use("/bh/v1/comment",commentRouter);
app.use("/bh/v1/like",likesRouter);
app.use("/bh/v1/rating",ratingRouter);

app.listen(PORT,()=>{
    console.log(`Server Running on port ${PORT}`);
})